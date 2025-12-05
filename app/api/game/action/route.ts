import { NextRequest, NextResponse } from 'next/server';
import { getGame, saveGame, updateActionReasoning } from '@/lib/game-storage';
import { applyAction } from '@/lib/poker/game-state';
import { generateText } from 'ai';
import { getProvider, getModelName } from '@/lib/ai/providers';
import { createActionPrompt, createReasoningPrompt } from '@/lib/ai/prompt';
import { parseActionResponse } from '@/lib/ai/parse-action';
import { validateAction } from '@/lib/poker/actions';

const ACTION_TIMEOUT = 15000; // 15 seconds

export async function POST(request: NextRequest) {
  try {
    const { gameId } = await request.json();
    
    const gameState = getGame(gameId);
    if (!gameState) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (gameState.phase === 'finished') {
      return NextResponse.json({ error: 'Game finished' }, { status: 400 });
    }

    const player = gameState.players[gameState.currentPlayerIndex];
    const providerKey = player.model as 'openai' | 'anthropic' | 'google' | 'grok' | 'meta';
    
    // Skip Meta for now if not configured
    if (providerKey === 'meta') {
      // Auto-fold for Meta until provider is configured
      const action = { type: 'fold' };
      const startTime = Date.now();
      const { newState, actionLog } = applyAction(gameState, action, player.model, Date.now() - startTime);
      saveGame(newState);
      return NextResponse.json({ state: newState, action: actionLog });
    }

    const provider = getProvider(providerKey as 'openai' | 'anthropic' | 'google' | 'grok');
    const modelName = getModelName(gameState.mode, providerKey);
    const prompt = createActionPrompt(gameState, gameState.currentPlayerIndex);

    const startTime = Date.now();
    
    // Get action with timeout
    const actionPromise = generateText({
      model: provider(modelName),
      prompt,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), ACTION_TIMEOUT);
    });

    let actionText: string;
    let responseTime: number;
    
    try {
      const result = await Promise.race([actionPromise, timeoutPromise]);
      actionText = result.text;
      responseTime = Date.now() - startTime;
    } catch (error) {
      // Timeout or error - auto-fold
      responseTime = ACTION_TIMEOUT;
      actionText = JSON.stringify({ action: 'fold' });
    }

    // Parse action
    let action: { type: string; amount?: number };
    try {
      action = parseActionResponse(actionText);
    } catch (error) {
      // Invalid response - auto-fold
      action = { type: 'fold' };
    }

    // Validate action
    if (!validateAction(action as any, player, gameState)) {
      // Invalid action - default to fold
      action = { type: 'fold' };
    }

    // Apply action
    const { newState, actionLog } = applyAction(gameState, action, player.model, responseTime);
    saveGame(newState);

    // Fetch reasoning asynchronously (don't wait)
    fetchReasoningAsync(gameId, gameState, gameState.currentPlayerIndex, actionLog, provider, modelName);

    return NextResponse.json({
      state: newState,
      action: actionLog,
    });
  } catch (error) {
    console.error('Error processing action:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}

async function fetchReasoningAsync(
  gameId: string,
  gameState: any,
  playerIndex: number,
  actionLog: any,
  provider: any,
  modelName: string
) {
  try {
    const reasoningPrompt = createReasoningPrompt(gameState, playerIndex);
    const result = await generateText({
      model: provider(modelName),
      prompt: reasoningPrompt,
    });
    
    const actionIndex = gameState.actionHistory.length;
    updateActionReasoning(gameId, actionIndex, result.text);
  } catch (error) {
    console.error('Error fetching reasoning:', error);
    // Silently fail - reasoning is optional
  }
}

