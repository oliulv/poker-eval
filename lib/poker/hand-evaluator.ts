import type { Card, Rank } from '../types';

const RANK_VALUES: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
};

export interface HandRank {
  rank: number; // 1 = high card, 9 = royal flush
  name: string;
  value: number; // For tie-breaking
  kickers: number[]; // For tie-breaking
}

export function evaluateHand(cards: Card[]): HandRank {
  if (cards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate hand');
  }

  // Get all possible 5-card combinations
  const combinations = getCombinations(cards, 5);
  let bestHand: HandRank | null = null;

  for (const combo of combinations) {
    const hand = evaluateFiveCards(combo);
    if (!bestHand || compareHands(hand, bestHand) > 0) {
      bestHand = hand;
    }
  }

  return bestHand!;
}

function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  
  const result: T[][] = [];
  for (let i = 0; i <= arr.length - k; i++) {
    const head = arr[i];
    const tailCombos = getCombinations(arr.slice(i + 1), k - 1);
    for (const combo of tailCombos) {
      result.push([head, ...combo]);
    }
  }
  return result;
}

function evaluateFiveCards(cards: Card[]): HandRank {
  const sorted = [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
  const ranks = sorted.map(c => RANK_VALUES[c.rank]);
  const suits = sorted.map(c => c.suit);
  
  const rankCounts: Record<number, number> = {};
  for (const rank of ranks) {
    rankCounts[rank] = (rankCounts[rank] || 0) + 1;
  }
  
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = isStraightRanks(ranks);
  
  // Royal flush
  if (isFlush && isStraight && ranks[0] === 14 && ranks[4] === 10) {
    return { rank: 9, name: 'Royal Flush', value: 1, kickers: [] };
  }
  
  // Straight flush
  if (isFlush && isStraight) {
    return { rank: 8, name: 'Straight Flush', value: ranks[0], kickers: [] };
  }
  
  // Four of a kind
  if (counts[0] === 4) {
    const quad = Number(Object.keys(rankCounts).find(k => rankCounts[Number(k)] === 4));
    const kicker = Number(Object.keys(rankCounts).find(k => rankCounts[Number(k)] === 1));
    return { rank: 7, name: 'Four of a Kind', value: quad, kickers: [kicker] };
  }
  
  // Full house
  if (counts[0] === 3 && counts[1] === 2) {
    const trips = Number(Object.keys(rankCounts).find(k => rankCounts[Number(k)] === 3));
    const pair = Number(Object.keys(rankCounts).find(k => rankCounts[Number(k)] === 2));
    return { rank: 6, name: 'Full House', value: trips, kickers: [pair] };
  }
  
  // Flush
  if (isFlush) {
    return { rank: 5, name: 'Flush', value: ranks[0], kickers: ranks.slice(1) };
  }
  
  // Straight
  if (isStraight) {
    return { rank: 4, name: 'Straight', value: ranks[0], kickers: [] };
  }
  
  // Three of a kind
  if (counts[0] === 3) {
    const trips = Number(Object.keys(rankCounts).find(k => rankCounts[Number(k)] === 3));
    const kickers = Object.keys(rankCounts)
      .filter(k => rankCounts[Number(k)] !== 3)
      .map(Number)
      .sort((a, b) => b - a);
    return { rank: 3, name: 'Three of a Kind', value: trips, kickers };
  }
  
  // Two pair
  if (counts[0] === 2 && counts[1] === 2) {
    const pairs = Object.keys(rankCounts)
      .filter(k => rankCounts[Number(k)] === 2)
      .map(Number)
      .sort((a, b) => b - a);
    const kicker = Number(Object.keys(rankCounts).find(k => rankCounts[Number(k)] === 1));
    return { rank: 2, name: 'Two Pair', value: pairs[0], kickers: [pairs[1], kicker] };
  }
  
  // Pair
  if (counts[0] === 2) {
    const pair = Number(Object.keys(rankCounts).find(k => rankCounts[Number(k)] === 2));
    const kickers = Object.keys(rankCounts)
      .filter(k => rankCounts[Number(k)] !== 2)
      .map(Number)
      .sort((a, b) => b - a);
    return { rank: 1, name: 'Pair', value: pair, kickers };
  }
  
  // High card
  return { rank: 0, name: 'High Card', value: ranks[0], kickers: ranks.slice(1) };
}

function isStraightRanks(ranks: number[]): boolean {
  const sorted = [...ranks].sort((a, b) => a - b);
  // Check for regular straight
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      // Check for A-2-3-4-5 straight (wheel)
      if (sorted[0] === 2 && sorted[4] === 14) {
        return sorted[1] === 3 && sorted[2] === 4 && sorted[3] === 5;
      }
      return false;
    }
  }
  return true;
}

export function compareHands(a: HandRank, b: HandRank): number {
  if (a.rank !== b.rank) {
    return a.rank - b.rank;
  }
  if (a.value !== b.value) {
    return a.value - b.value;
  }
  for (let i = 0; i < Math.max(a.kickers.length, b.kickers.length); i++) {
    const kickerA = a.kickers[i] || 0;
    const kickerB = b.kickers[i] || 0;
    if (kickerA !== kickerB) {
      return kickerA - kickerB;
    }
  }
  return 0;
}

