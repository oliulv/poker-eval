import type { Player, Action, GameState } from '../types';

export function getValidActions(player: Player, gameState: GameState): Action[] {
  const actions: Action[] = [];
  const toCall = gameState.currentBet - player.currentBet;
  const canRaise = player.chips > toCall;
  
  // Can always fold
  actions.push({ type: 'fold' });
  
  // Can check if no bet to call
  if (toCall === 0) {
    actions.push({ type: 'check' });
  } else {
    // Can call if there's a bet
    if (player.chips >= toCall) {
      actions.push({ type: 'call', amount: toCall });
    }
  }
  
  // Can raise if have chips beyond call
  if (canRaise) {
    const minRaise = gameState.bigBlind;
    const maxRaise = player.chips;
    // For simplicity, allow raises in increments of big blind
    for (let amount = toCall + minRaise; amount <= maxRaise; amount += gameState.bigBlind) {
      actions.push({ type: 'raise', amount });
    }
  }
  
  // Can go all-in
  if (player.chips > 0) {
    actions.push({ type: 'all-in' });
  }
  
  return actions;
}

export function validateAction(action: Action, player: Player, gameState: GameState): boolean {
  const validActions = getValidActions(player, gameState);
  
  if (action.type === 'fold') {
    return true;
  }
  
  if (action.type === 'check') {
    return gameState.currentBet === player.currentBet;
  }
  
  if (action.type === 'call') {
    const toCall = gameState.currentBet - player.currentBet;
    return action.amount === toCall && player.chips >= toCall;
  }
  
  if (action.type === 'raise') {
    if (!action.amount) return false;
    const toCall = gameState.currentBet - player.currentBet;
    const minRaise = gameState.bigBlind;
    return action.amount >= toCall + minRaise && action.amount <= player.chips;
  }
  
  if (action.type === 'all-in') {
    return player.chips > 0;
  }
  
  return false;
}

