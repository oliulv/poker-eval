import { NextRequest, NextResponse } from 'next/server';
import { getGame, getGameLog, buildGameLog } from '@/lib/game-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;
    const gameState = getGame(gameId);
    
    if (!gameState) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    let gameLog = getGameLog(gameId);
    if (!gameLog) {
      gameLog = buildGameLog(gameState);
    }

    return NextResponse.json({
      state: gameState,
      log: gameLog,
    });
  } catch (error) {
    console.error('Error getting game:', error);
    return NextResponse.json(
      { error: 'Failed to get game' },
      { status: 500 }
    );
  }
}

