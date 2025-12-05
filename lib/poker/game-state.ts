import type { GameState, Player, Card, ActionLog } from '../types';
import { createDeck, shuffleDeck, dealCard } from './deck';
import { evaluateHand, compareHands } from './hand-evaluator';

export function createGame(mode: 'fast' | 'smart', gameId: string): GameState {
  const models = ['openai', 'anthropic', 'google', 'grok', 'meta'];
  const players: Player[] = models.map((model, index) => ({
    id: `player-${index}`,
    model,
    chips: 1000,
    holeCards: null,
    isActive: true,
    isAllIn: false,
    currentBet: 0,
    totalBetThisRound: 0,
  }));

  return {
    id: gameId,
    mode,
    players,
    communityCards: [],
    pot: 0,
    currentBet: 0,
    dealerIndex: 0,
    smallBlindIndex: 1,
    bigBlindIndex: 2,
    currentPlayerIndex: 3,
    phase: 'preflop',
    handNumber: 0,
    smallBlind: 10,
    bigBlind: 20,
    actionHistory: [],
    startedAt: Date.now(),
  };
}

export function startNewHand(gameState: GameState): GameState {
  const activePlayers = gameState.players.filter(p => p.isActive && p.chips > 0);
  
  if (activePlayers.length < 2) {
    return { ...gameState, phase: 'finished' };
  }

  // Rotate dealer/blinds - find next active players
  const activeIndices = gameState.players
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => p.isActive && p.chips > 0)
    .map(({ idx }) => idx);
  
  // Find current dealer in active list, or start from first active
  let currentDealerIdx = activeIndices.indexOf(gameState.dealerIndex);
  if (currentDealerIdx === -1) {
    currentDealerIdx = 0;
  }
  
  const nextDealerIdx = (currentDealerIdx + 1) % activeIndices.length;
  const nextSmallBlindIdx = (nextDealerIdx + 1) % activeIndices.length;
  const nextBigBlindIdx = (nextDealerIdx + 2) % activeIndices.length;
  
  const nextDealer = activeIndices[nextDealerIdx];
  const nextSmallBlind = activeIndices[nextSmallBlindIdx];
  const nextBigBlind = activeIndices[nextBigBlindIdx];

  // Deal cards
  const deck = shuffleDeck(createDeck());
  const newPlayers = gameState.players.map(player => {
    if (!player.isActive || player.chips === 0) {
      return { ...player, holeCards: null, currentBet: 0, totalBetThisRound: 0 };
    }
    const card1 = dealCard(deck)!;
    const card2 = dealCard(deck)!;
    return {
      ...player,
      holeCards: [card1, card2] as [Card, Card],
      currentBet: 0,
      totalBetThisRound: 0,
      isAllIn: false,
    };
  });

  // Post blinds
  const smallBlindPlayer = newPlayers[nextSmallBlind];
  const bigBlindPlayer = newPlayers[nextBigBlind];
  const smallBlindAmount = Math.min(gameState.smallBlind, smallBlindPlayer.chips);
  const bigBlindAmount = Math.min(gameState.bigBlind, bigBlindPlayer.chips);

  newPlayers[nextSmallBlind] = {
    ...smallBlindPlayer,
    chips: smallBlindPlayer.chips - smallBlindAmount,
    currentBet: smallBlindAmount,
    totalBetThisRound: smallBlindAmount,
    isAllIn: smallBlindPlayer.chips <= gameState.smallBlind,
  };

  newPlayers[nextBigBlind] = {
    ...bigBlindPlayer,
    chips: bigBlindPlayer.chips - bigBlindAmount,
    currentBet: bigBlindAmount,
    totalBetThisRound: bigBlindAmount,
    isAllIn: bigBlindPlayer.chips <= gameState.bigBlind,
  };

  const pot = smallBlindAmount + bigBlindAmount;
  const currentBet = bigBlindAmount;

  // Find first active player after big blind
  let currentPlayer = (nextBigBlind + 1) % newPlayers.length;
  while (!newPlayers[currentPlayer].isActive || newPlayers[currentPlayer].chips === 0) {
    currentPlayer = (currentPlayer + 1) % newPlayers.length;
  }

  return {
    ...gameState,
    players: newPlayers,
    communityCards: [],
    pot,
    currentBet,
    dealerIndex: nextDealer,
    smallBlindIndex: nextSmallBlind,
    bigBlindIndex: nextBigBlind,
    currentPlayerIndex: currentPlayer,
    phase: 'preflop',
    handNumber: gameState.handNumber + 1,
  };
}

export function applyAction(
  gameState: GameState,
  action: { type: string; amount?: number },
  model: string,
  responseTimeMs: number
): { newState: GameState; actionLog: ActionLog } {
  const player = gameState.players[gameState.currentPlayerIndex];
  if (player.model !== model) {
    throw new Error('Wrong player acting');
  }

  const actionLog: ActionLog = {
    handNumber: gameState.handNumber,
    phase: gameState.phase,
    model: player.model,
    action: action.type as any,
    amount: action.amount,
    responseTimeMs,
    gameStateSnapshot: {
      pot: gameState.pot,
      currentBet: gameState.currentBet,
      communityCards: [...gameState.communityCards],
      playerChips: Object.fromEntries(gameState.players.map(p => [p.model, p.chips])),
      playerBets: Object.fromEntries(gameState.players.map(p => [p.model, p.currentBet])),
    },
    timestamp: Date.now(),
  };

  const newPlayers = [...gameState.players];
  let newPot = gameState.pot;
  let newCurrentBet = gameState.currentBet;
  let newPhase = gameState.phase;
  let newCommunityCards = [...gameState.communityCards];

  if (action.type === 'fold') {
    newPlayers[gameState.currentPlayerIndex] = {
      ...player,
      isActive: false,
      holeCards: null,
    };
  } else if (action.type === 'check') {
    // No change to player state
  } else if (action.type === 'call') {
    const amount = action.amount!;
    newPlayers[gameState.currentPlayerIndex] = {
      ...player,
      chips: player.chips - amount,
      currentBet: player.currentBet + amount,
      totalBetThisRound: player.totalBetThisRound + amount,
      isAllIn: player.chips <= amount,
    };
    newPot += amount;
  } else if (action.type === 'raise') {
    const amount = action.amount!;
    newPlayers[gameState.currentPlayerIndex] = {
      ...player,
      chips: player.chips - amount,
      currentBet: player.currentBet + amount,
      totalBetThisRound: player.totalBetThisRound + amount,
      isAllIn: player.chips <= amount,
    };
    newPot += amount;
    newCurrentBet = player.currentBet + amount;
  } else if (action.type === 'all-in') {
    const amount = player.chips;
    newPlayers[gameState.currentPlayerIndex] = {
      ...player,
      chips: 0,
      currentBet: player.currentBet + amount,
      totalBetThisRound: player.totalBetThisRound + amount,
      isAllIn: true,
    };
    newPot += amount;
    if (player.currentBet + amount > newCurrentBet) {
      newCurrentBet = player.currentBet + amount;
    }
  }

  // Move to next player
  const activePlayers = newPlayers.filter(
    (p, idx) => p.isActive && p.chips > 0 && idx !== gameState.currentPlayerIndex
  );
  
  if (activePlayers.length === 0) {
    // Game over
    return {
      newState: { ...gameState, players: newPlayers, pot: newPot, phase: 'finished' },
      actionLog,
    };
  }

  // Check if betting round is complete
  const allBetsEqual = newPlayers
    .filter(p => p.isActive && p.chips > 0)
    .every(p => p.currentBet === newCurrentBet || p.isAllIn);
  
  let nextPlayerIndex = gameState.currentPlayerIndex;
  let nextPhase = newPhase;

  if (allBetsEqual) {
    // Move to next phase
    if (newPhase === 'preflop') {
      // Deal flop
      const deck = shuffleDeck(createDeck());
      // Remove dealt cards
      const dealtCards = newPlayers.flatMap(p => p.holeCards || []);
      const remainingDeck = deck.filter(
        card => !dealtCards.some(dc => dc.suit === card.suit && dc.rank === card.rank)
      );
      newCommunityCards = [
        dealCard(remainingDeck)!,
        dealCard(remainingDeck)!,
        dealCard(remainingDeck)!,
      ];
      nextPhase = 'flop';
      // Reset bets, find first active player
      newPlayers.forEach(p => {
        p.currentBet = 0;
        p.totalBetThisRound = 0;
      });
      nextPlayerIndex = gameState.smallBlindIndex;
      while (!newPlayers[nextPlayerIndex].isActive || newPlayers[nextPlayerIndex].chips === 0) {
        nextPlayerIndex = (nextPlayerIndex + 1) % newPlayers.length;
      }
      newCurrentBet = 0;
    } else if (newPhase === 'flop') {
      const deck = shuffleDeck(createDeck());
      const dealtCards = [
        ...newPlayers.flatMap(p => p.holeCards || []),
        ...newCommunityCards,
      ];
      const remainingDeck = deck.filter(
        card => !dealtCards.some(dc => dc.suit === card.suit && dc.rank === card.rank)
      );
      newCommunityCards.push(dealCard(remainingDeck)!);
      nextPhase = 'turn';
      newPlayers.forEach(p => {
        p.currentBet = 0;
        p.totalBetThisRound = 0;
      });
      nextPlayerIndex = gameState.smallBlindIndex;
      while (!newPlayers[nextPlayerIndex].isActive || newPlayers[nextPlayerIndex].chips === 0) {
        nextPlayerIndex = (nextPlayerIndex + 1) % newPlayers.length;
      }
      newCurrentBet = 0;
    } else if (newPhase === 'turn') {
      const deck = shuffleDeck(createDeck());
      const dealtCards = [
        ...newPlayers.flatMap(p => p.holeCards || []),
        ...newCommunityCards,
      ];
      const remainingDeck = deck.filter(
        card => !dealtCards.some(dc => dc.suit === card.suit && dc.rank === card.rank)
      );
      newCommunityCards.push(dealCard(remainingDeck)!);
      nextPhase = 'river';
      newPlayers.forEach(p => {
        p.currentBet = 0;
        p.totalBetThisRound = 0;
      });
      nextPlayerIndex = gameState.smallBlindIndex;
      while (!newPlayers[nextPlayerIndex].isActive || newPlayers[nextPlayerIndex].chips === 0) {
        nextPlayerIndex = (nextPlayerIndex + 1) % newPlayers.length;
      }
      newCurrentBet = 0;
    } else if (newPhase === 'river') {
      // Showdown
      nextPhase = 'showdown';
      const winners = determineWinners(newPlayers, newCommunityCards);
      // Distribute pot (simplified - split pots not handled)
      if (winners.length > 0) {
        const chipsPerWinner = Math.floor(newPot / winners.length);
        winners.forEach(winnerModel => {
          const winnerIdx = newPlayers.findIndex(p => p.model === winnerModel);
          if (winnerIdx >= 0) {
            newPlayers[winnerIdx].chips += chipsPerWinner;
          }
        });
      }
      newPot = 0;
      // Start new hand
      return {
        newState: startNewHand({
          ...gameState,
          players: newPlayers,
          pot: newPot,
          communityCards: [],
        }),
        actionLog,
      };
    }
  } else {
    // Find next active player
    nextPlayerIndex = (gameState.currentPlayerIndex + 1) % newPlayers.length;
    while (
      !newPlayers[nextPlayerIndex].isActive ||
      newPlayers[nextPlayerIndex].chips === 0 ||
      (newPlayers[nextPlayerIndex].currentBet === newCurrentBet && !newPlayers[nextPlayerIndex].isAllIn)
    ) {
      nextPlayerIndex = (nextPlayerIndex + 1) % newPlayers.length;
    }
  }

  return {
    newState: {
      ...gameState,
      players: newPlayers,
      pot: newPot,
      currentBet: newCurrentBet,
      currentPlayerIndex: nextPlayerIndex,
      phase: nextPhase,
      communityCards: newCommunityCards,
      actionHistory: [...gameState.actionHistory, actionLog],
    },
    actionLog,
  };
}

function determineWinners(players: Player[], communityCards: Card[]): string[] {
  const activePlayers = players.filter(p => p.isActive && p.holeCards);
  if (activePlayers.length === 0) return [];

  const playerHands = activePlayers.map(player => {
    const allCards = [...(player.holeCards!), ...communityCards];
    return {
      model: player.model,
      hand: evaluateHand(allCards),
    };
  });

  playerHands.sort((a, b) => compareHands(b.hand, a.hand));
  const bestHand = playerHands[0].hand;
  const winners = playerHands
    .filter(p => compareHands(p.hand, bestHand) === 0)
    .map(p => p.model);

  return winners;
}

