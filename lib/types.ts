export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

export interface Action {
  type: ActionType;
  amount?: number;
}

export interface Player {
  id: string;
  model: string;
  chips: number;
  holeCards: [Card, Card] | null;
  isActive: boolean;
  isAllIn: boolean;
  currentBet: number;
  totalBetThisRound: number;
}

export interface GameState {
  id: string;
  mode: 'fast' | 'smart';
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  currentPlayerIndex: number;
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';
  handNumber: number;
  smallBlind: number;
  bigBlind: number;
  actionHistory: ActionLog[];
  startedAt: number;
}

export interface ActionLog {
  handNumber: number;
  phase: string;
  model: string;
  action: ActionType;
  amount?: number;
  reasoning?: string;
  responseTimeMs: number;
  gameStateSnapshot: {
    pot: number;
    currentBet: number;
    communityCards: Card[];
    playerChips: Record<string, number>;
    playerBets: Record<string, number>;
  };
  timestamp: number;
}

export interface HandLog {
  handNumber: number;
  holeCards: Record<string, [Card, Card]>;
  communityCards: Card[];
  actions: ActionLog[];
  winners: string[];
  potSize: number;
}

export interface GameLog {
  gameId: string;
  mode: 'fast' | 'smart';
  startedAt: number;
  hands: HandLog[];
  finalRankings: { model: string; chips: number; rank: number }[];
}

export const MODEL_CONFIG = {
  fast: {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-haiku-20240307',
    google: 'gemini-1.5-flash',
    grok: 'grok-2-1212',
    meta: 'llama-3.1-8b-instruct',
  },
  smart: {
    openai: 'gpt-4o',
    anthropic: 'claude-3-5-sonnet-20241022',
    google: 'gemini-1.5-pro',
    grok: 'grok-2-1212',
    meta: 'llama-3.1-70b-instruct',
  },
} as const;

export const MODEL_NAMES = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  grok: 'Grok',
  meta: 'Meta',
} as const;

