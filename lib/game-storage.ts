import type { GameState, GameLog, ActionLog } from './types';

// In-memory storage (can be replaced with database)
const games = new Map<string, GameState>();
const gameLogs = new Map<string, GameLog>();

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

