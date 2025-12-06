import type { GameState, Player } from '../types';

export function createActionPrompt(gameState: GameState, playerIndex: number): string {
  const player = gameState.players[playerIndex];
  const holeCards = player.holeCards!;
  
  const activePlayers = gameState.players.filter(p => p.isActive && p.chips > 0);
  const otherPlayers = activePlayers
    .filter((_, idx) => idx !== playerIndex)
    .map(p => ({
      model: p.model,
      chips: p.chips,
      currentBet: p.currentBet,
      isAllIn: p.isAllIn,
    }));

  const prompt = `You are a professional poker player competing in a high-stakes texas hold'em tournament. Your goal is to win chips and eliminate opponents.

GAME STATE:
- Phase: ${gameState.phase}
- Pot: ${gameState.pot} chips
- Current bet to call: ${gameState.currentBet} chips
- Your chips: ${player.chips}
- Your current bet this round: ${player.currentBet}
- Amount needed to call: ${gameState.currentBet - player.currentBet}

YOUR CARDS:
- ${formatCard(holeCards[0])}
- ${formatCard(holeCards[1])}

COMMUNITY CARDS:
${gameState.communityCards.length > 0 
  ? gameState.communityCards.map(c => `- ${formatCard(c)}`).join('\n')
  : 'None yet'}

OTHER PLAYERS:
${otherPlayers.map(p => 
  `- ${p.model}: ${p.chips} chips, bet ${p.currentBet}${p.isAllIn ? ' (ALL-IN)' : ''}`
).join('\n')}

RECENT ACTIONS THIS HAND:
${gameState.actionHistory
  .filter(a => a.handNumber === gameState.handNumber)
  .slice(-5)
  .map(a => `${a.model}: ${a.action}${a.amount ? ` (${a.amount})` : ''}`)
  .join('\n') || 'None'}

Respond with ONLY a JSON object in this exact format (no markdown, no code blocks):
{
  "action": "fold" | "check" | "call" | "raise" | "all-in",
  "amount": <number> (required only for "raise", ignored for others)
}

Valid actions:
- "fold": Give up this hand (only if cards are weak and facing a bet)
- "check": Pass (if amount to call is 0)
- "call": Match the current bet (${gameState.currentBet - player.currentBet} chips)
- "raise": Increase the bet (minimum raise: ${gameState.bigBlind} chips above current bet)
- "all-in": Bet all your chips (${player.chips} chips)

Make your decision now:`;

  return prompt;
}

export function createReasoningPrompt(gameState: GameState, playerIndex: number): string {
  const actionPrompt = createActionPrompt(gameState, playerIndex);
  return `${actionPrompt}

Now explain your reasoning for this decision in 2-3 sentences.`;
}

function formatCard(card: { suit: string; rank: string }): string {
  const suitEmoji = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  }[card.suit] || card.suit[0].toUpperCase();
  
  return `${card.rank}${suitEmoji}`;
}

