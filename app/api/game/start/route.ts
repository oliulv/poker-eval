import { NextRequest, NextResponse } from 'next/server';
import { createGame, startNewHand } from '@/lib/poker/game-state';
import { saveGame } from '@/lib/game-storage';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { mode, actionTimeoutMs, winThreshold, models } = await request.json();
    
    if (mode !== 'fast' && mode !== 'smart') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    const gameId = uuidv4();
    const gameState = createGame(mode, gameId, {
      actionTimeoutMs,
      winThreshold,
      models,
    });
    const initialHand = startNewHand(gameState);
    
    saveGame(initialHand);

    return NextResponse.json({
      gameId: initialHand.id,
      state: initialHand,
    });
  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json(
      { error: 'Failed to start game' },
      { status: 500 }
    );
  }
}
