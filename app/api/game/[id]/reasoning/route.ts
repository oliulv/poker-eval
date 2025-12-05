import { NextRequest, NextResponse } from 'next/server';
import { getGame, updateActionReasoning } from '@/lib/game-storage';
import { generateText } from 'ai';
import { getProvider, getModelName } from '@/lib/ai/providers';
import { createReasoningPrompt } from '@/lib/ai/prompt';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { actionIndex } = await request.json();
    const { id: gameId } = await params;
    
    const gameState = getGame(gameId);
    if (!gameState) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const action = gameState.actionHistory[actionIndex];
    if (!action) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    if (action.reasoning) {
      return NextResponse.json({ reasoning: action.reasoning });
    }

    // Find the player who made this action
    const playerIndex = gameState.players.findIndex(p => p.model === action.model);
    if (playerIndex === -1) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const providerKey = action.model as 'openai' | 'anthropic' | 'google' | 'grok' | 'meta';
    if (providerKey === 'meta') {
      return NextResponse.json({ error: 'Meta provider not configured' }, { status: 400 });
    }

    const provider = getProvider(providerKey);
    const modelName = getModelName(gameState.mode, providerKey);
    
    // Reconstruct game state at time of action
    const snapshot = action.gameStateSnapshot;
    const reasoningPrompt = createReasoningPrompt(gameState, playerIndex);

    const result = await generateText({
      model: provider(modelName),
      prompt: reasoningPrompt,
    });

    updateActionReasoning(gameId, actionIndex, result.text);

    return NextResponse.json({ reasoning: result.text });
  } catch (error) {
    console.error('Error fetching reasoning:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reasoning' },
      { status: 500 }
    );
  }
}

