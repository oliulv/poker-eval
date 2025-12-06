import { NextRequest, NextResponse } from 'next/server';
import { getGame, buildGameLog, saveDemoGameLog, getDemoGames } from '@/lib/game-storage';

export async function GET() {
  try {
    const demos = await getDemoGames();
    return NextResponse.json({ demos });
  } catch (error) {
    console.error('Error reading demo games:', error);
    return NextResponse.json({ error: 'Failed to load demo games' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { gameId, name } = await request.json();
    if (!gameId) {
      return NextResponse.json({ error: 'gameId required' }, { status: 400 });
    }

    const gameState = getGame(gameId);
    if (!gameState) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const log = buildGameLog(gameState);
    const demos = await saveDemoGameLog(log, name || `Demo ${new Date().toISOString()}`);

    return NextResponse.json({ saved: true, count: demos.length });
  } catch (error) {
    console.error('Error saving demo game:', error);
    return NextResponse.json({ error: 'Failed to save demo game' }, { status: 500 });
  }
}
