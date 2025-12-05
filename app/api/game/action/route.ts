import { NextRequest, NextResponse } from 'next/server';
import { getGame, saveGame, updateActionReasoning } from '@/lib/game-storage';
import { applyAction, getMajorityWinner, startNewHand } from '@/lib/poker/game-state';
import { generateText } from 'ai';
import { getProvider, getModelName } from '@/lib/ai/providers';
import { createActionPrompt, createReasoningPrompt } from '@/lib/ai/prompt';
import { parseActionResponse } from '@/lib/ai/parse-action';
import { validateAction } from '@/lib/poker/actions';

const ACTION_TIMEOUT = 5000; // Faster fallback so hands keep moving

export async function POST(request: NextRequest) {
  try {
    const { gameId } = await request.json();
    console.log(`[API] Processing action for game ${gameId}`);
    
    const gameState = getGame(gameId);
    if (!gameState) {
      console.error(`[API] Game not found: ${gameId}`);
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const majorityWinner = getMajorityWinner(gameState.players, gameState.pot);
    const activePlayers = gameState.players.filter(p => p.chips > 0);
    console.log(`[API] Active players: ${activePlayers.length}, Phase: ${gameState.phase}`);

    if (majorityWinner) {
      console.log(`[API] Game truly finished. Winner: ${majorityWinner.model}`);
      return NextResponse.json({ error: 'Game finished', winner: majorityWinner.model }, { status: 400 });
    }

    // If phase is 'finished' but multiple players remain, it means a hand just ended
    // We should start a new hand automatically
    if (gameState.phase === 'finished') {
      console.log(`[API] Hand finished, starting new hand...`);
      const newHandState = startNewHand(gameState);
      saveGame(newHandState);
      
      // Return the new hand state so the client can continue
      return NextResponse.json({
        state: newHandState,
        action: null,
        message: 'New hand started',
      });
    }

    const player = gameState.players[gameState.currentPlayerIndex];
    console.log(`[API] Current player: ${player.model} (index ${gameState.currentPlayerIndex})`);
    console.log(`[API] Player chips: ${player.chips}, Current bet: ${gameState.currentBet}, To call: ${gameState.currentBet - player.currentBet}`);
    
    const providerKey = player.model as 'openai' | 'anthropic' | 'google' | 'grok' | 'meta';
    
    // Skip Meta for now if not configured
    if (providerKey === 'meta') {
      console.log(`[API] Meta provider not configured, auto-folding`);
      const action = { type: 'fold' };
      const startTime = Date.now();
      const { newState, actionLog } = applyAction(gameState, action, player.model, Date.now() - startTime);
      saveGame(newState);
      console.log(`[API] Action applied: fold. New phase: ${newState.phase}`);
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
    console.log(`[API] Applying action: ${action.type}${action.amount ? ` (${action.amount})` : ''}`);
    const { newState, actionLog } = applyAction(gameState, action, player.model, responseTime);
    saveGame(newState);
    
    console.log(`[API] Action applied. New phase: ${newState.phase}, Hand: ${newState.handNumber}`);
    console.log(`[API] Next player index: ${newState.currentPlayerIndex}`);
    console.log(`[API] Pot: ${newState.pot}, Current bet: ${newState.currentBet}`);
    
    // Check if hand ended and we need to start a new one
    if (newState.phase === 'finished') {
      const winner = getMajorityWinner(newState.players, newState.pot);
      if (winner) {
        console.log(`[API] Majority winner detected after action: ${winner.model}`);
        return NextResponse.json({
          state: newState,
          action: actionLog,
          message: 'Game finished',
        });
      }

      const remainingPlayers = newState.players.filter(p => p.chips > 0);
      console.log(`[API] Phase is 'finished'. Remaining players: ${remainingPlayers.length}`);
      
      if (remainingPlayers.length > 1) {
        console.log(`[API] Multiple players remain, starting new hand...`);
        const nextHandState = startNewHand(newState);
        saveGame(nextHandState);
        console.log(`[API] New hand started. Phase: ${nextHandState.phase}, Hand: ${nextHandState.handNumber}`);
        
        return NextResponse.json({
          state: nextHandState,
          action: actionLog,
          message: 'Hand ended, new hand started',
        });
      }
    }

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
