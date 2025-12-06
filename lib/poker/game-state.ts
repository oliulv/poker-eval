import type { GameState, Player, Card, ActionLog } from '../types';
import { createDeck, shuffleDeck, dealCard } from './deck';
import { evaluateHand, compareHands } from './hand-evaluator';

export function createGame(mode: 'fast' | 'smart', gameId: string, settings?: { actionTimeoutMs?: number; winThreshold?: number }): GameState {
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
    actionTimeoutMs: settings?.actionTimeoutMs ?? (mode === 'fast' ? 500 : 5000),
    winThreshold: settings?.winThreshold ?? 0.5,
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

export function getMajorityWinner(players: Player[], pot: number, threshold = 0.5): Player | null {
  const totalChips = players.reduce((sum, p) => sum + p.chips, 0) + pot;
  if (totalChips === 0) return null;

  const leader = players.reduce<Player | null>((current, player) => {
    if (!current) return player;
    return player.chips > current.chips ? player : current;
  }, null);

  if (
    leader &&
    leader.chips >= totalChips * threshold &&
    players.filter(p => p.chips === leader.chips).length === 1
  ) {
    return leader;
  }

  return null;
}

export function startNewHand(gameState: GameState): GameState {
  const resetPlayers = gameState.players.map(player => {
    const hasChips = player.chips > 0;
    return {
      ...player,
      holeCards: null,
      isActive: hasChips,
      isAllIn: false,
      currentBet: 0,
      totalBetThisRound: 0,
    };
  });

  const majorityWinner = getMajorityWinner(resetPlayers, gameState.pot, gameState.winThreshold);
  if (majorityWinner) {
    console.log(`[GAME-STATE] ${majorityWinner.model} controls >=50% of chips, game finished`);
    return {
      ...gameState,
      players: resetPlayers,
      pot: 0,
      currentBet: 0,
      communityCards: [],
      phase: 'finished',
    };
  }

  // Blind escalation for fast mode: double every 5 hands
  let smallBlind = gameState.smallBlind;
  let bigBlind = gameState.bigBlind;
  if (gameState.mode === 'fast') {
    const level = Math.floor((gameState.handNumber) / 5); // handNumber increments before new hand
    const baseSmall = 10;
    smallBlind = baseSmall * Math.pow(2, level);
    bigBlind = smallBlind * 2;
  }

  const activePlayers = resetPlayers.filter(p => p.isActive);
  console.log(`[GAME-STATE] Starting new hand. Active players: ${activePlayers.length}`);

  if (activePlayers.length < 2) {
    console.log(`[GAME-STATE] Not enough players (${activePlayers.length}), marking game as finished`);
    return {
      ...gameState,
      players: resetPlayers,
      pot: 0,
      currentBet: 0,
      communityCards: [],
      phase: 'finished',
    };
  }

  // Rotate dealer/blinds - find next active players
  const activeIndices = resetPlayers
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
  const newPlayers = resetPlayers.map(player => {
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
  const smallBlindAmount = Math.min(smallBlind, smallBlindPlayer.chips);
  const bigBlindAmount = Math.min(bigBlind, bigBlindPlayer.chips);

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
    smallBlind,
    bigBlind,
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

  // Bust protection: immediately mark players with zero chips as inactive for the rest of the hand
  if (newPlayers[gameState.currentPlayerIndex].chips <= 0) {
    newPlayers[gameState.currentPlayerIndex] = {
      ...newPlayers[gameState.currentPlayerIndex],
      chips: Math.max(0, newPlayers[gameState.currentPlayerIndex].chips),
      isActive: false,
      isAllIn: false,
      holeCards: null,
      currentBet: 0,
      totalBetThisRound: 0,
    };
  }

  const updatedActionHistory = [...gameState.actionHistory, actionLog];
  const activePlayers = newPlayers.filter(p => p.isActive && p.chips > 0);

  if (activePlayers.length <= 1) {
    const winnerIdx =
      activePlayers.length === 1
        ? newPlayers.findIndex(p => p.id === activePlayers[0].id)
        : newPlayers.findIndex(p => p.chips > 0);

    if (winnerIdx >= 0) {
      newPlayers[winnerIdx] = {
        ...newPlayers[winnerIdx],
        chips: newPlayers[winnerIdx].chips + newPot,
      };
    }

    newPot = 0;

    const winnerModel = winnerIdx >= 0 ? newPlayers[winnerIdx].model : 'None';
    console.log(`[GAME-STATE] Hand ended early. Winner: ${winnerModel}. Pot awarded.`);

    const postHandState: GameState = {
      ...gameState,
      players: newPlayers,
      pot: 0,
      currentBet: 0,
      communityCards: [],
      phase: 'finished',
      actionHistory: updatedActionHistory,
    };

    const nextState = startNewHand(postHandState);

    return {
      newState: nextState,
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
      console.log(`[GAME-STATE] Showdown complete. Winners: ${winners.join(', ')}. Pot distributed.`);
      
      // Start new hand
      const newState = startNewHand({
        ...gameState,
        players: newPlayers,
        pot: newPot,
        communityCards: [],
        actionHistory: updatedActionHistory,
      });
      
      console.log(`[GAME-STATE] New hand state. Phase: ${newState.phase}, Hand: ${newState.handNumber}`);
      
      // If only one player left, mark as truly finished
      const activePlayers = newState.players.filter(p => p.chips > 0);
      if (activePlayers.length < 2) {
        console.log(`[GAME-STATE] Only ${activePlayers.length} player(s) left, game finished`);
        return {
          newState,
          actionLog,
        };
      }

      console.log(`[GAME-STATE] New hand ready. ${activePlayers.length} players active.`);
      return {
        newState,
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
      actionHistory: updatedActionHistory,
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
