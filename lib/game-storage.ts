import type { GameState, GameLog, ActionLog } from './types';
import fs from 'fs/promises';
import path from 'path';

// In-memory storage (can be replaced with database)
const games = new Map<string, GameState>();
const gameLogs = new Map<string, GameLog>();

export interface DemoGameEntry {
  name: string;
  log: GameLog;
  savedAt: number;
}

const DEMO_PATH = path.join(process.cwd(), 'data', 'demo-games.json');

export function saveGame(gameState: GameState): void {
  games.set(gameState.id, gameState);
}

export function getGame(gameId: string): GameState | undefined {
  return games.get(gameId);
}

export function saveGameLog(gameLog: GameLog): void {
  gameLogs.set(gameLog.gameId, gameLog);
}

export function getGameLog(gameId: string): GameLog | undefined {
  return gameLogs.get(gameId);
}

export function updateActionReasoning(
  gameId: string,
  actionIndex: number,
  reasoning: string
): void {
  const game = games.get(gameId);
  if (game && game.actionHistory[actionIndex]) {
    game.actionHistory[actionIndex].reasoning = reasoning;
    games.set(gameId, game);
  }
  
  const log = gameLogs.get(gameId);
  if (log) {
    // Find and update reasoning in log
    for (const hand of log.hands) {
      if (hand.actions[actionIndex]) {
        hand.actions[actionIndex].reasoning = reasoning;
      }
    }
    gameLogs.set(gameId, log);
  }
}

export function buildGameLog(gameState: GameState): GameLog {
  // Group actions by hand
  const hands = new Map<number, ActionLog[]>();
  
  for (const action of gameState.actionHistory) {
    if (!hands.has(action.handNumber)) {
      hands.set(action.handNumber, []);
    }
    hands.get(action.handNumber)!.push(action);
  }

  const handLogs = Array.from(hands.entries()).map(([handNumber, actions]) => {
    // Get hole cards and community cards from first action of hand
    const firstAction = actions[0];
    const snapshot = firstAction.gameStateSnapshot;
    
    return {
      handNumber,
      holeCards: {}, // Will be populated from game state if needed
      communityCards: snapshot.communityCards,
      actions,
      winners: [], // Will be determined from showdown
      potSize: snapshot.pot,
    };
  });

  const finalRankings = gameState.players
    .filter(p => p.isActive)
    .map((p, idx) => ({
      model: p.model,
      chips: p.chips,
      rank: idx + 1,
    }))
    .sort((a, b) => b.chips - a.chips)
    .map((p, idx) => ({ ...p, rank: idx + 1 }));

  return {
    gameId: gameState.id,
    mode: gameState.mode,
    startedAt: gameState.startedAt,
    hands: handLogs,
    finalRankings,
  };
}

async function readDemoGames(): Promise<DemoGameEntry[]> {
  try {
    const raw = await fs.readFile(DEMO_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as DemoGameEntry[];
    if (parsed && Array.isArray(parsed.demos)) return parsed.demos as DemoGameEntry[];
    return [];
  } catch (error: any) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function saveDemoGameLog(gameLog: GameLog, name: string): Promise<DemoGameEntry[]> {
  const demos = await readDemoGames();
  demos.push({ name, log: gameLog, savedAt: Date.now() });
  await fs.mkdir(path.dirname(DEMO_PATH), { recursive: true });
  await fs.writeFile(DEMO_PATH, JSON.stringify(demos, null, 2), 'utf-8');
  return demos;
}

export async function getDemoGames(): Promise<DemoGameEntry[]> {
  return readDemoGames();
}
