import { NextRequest, NextResponse } from 'next/server';
import { getGame, saveGame } from '@/lib/game-storage';
import { applyAction, getMajorityWinner, startNewHand } from '@/lib/poker/game-state';
import { generateText } from 'ai';
import { getProvider, getModelName } from '@/lib/ai/providers';
import { createActionPrompt } from '@/lib/ai/prompt';
import { parseActionResponse } from '@/lib/ai/parse-action';
import { validateAction } from '@/lib/poker/actions';

const DEFAULT_TIMEOUT_FAST = 500;
const DEFAULT_TIMEOUT_SMART = 5000;

function fallbackAction(player: any, gameState: any) {
  const toCall = Math.max(0, gameState.currentBet - player.currentBet);
  if (toCall === 0) {
    const raiseAmount = Math.min(gameState.bigBlind * 2, player.chips);
    return raiseAmount > 0 ? { type: 'raise', amount: raiseAmount } : { type: 'check' };
  }
  if (toCall >= player.chips) {
    return { type: 'all-in' };
  }
  return { type: 'call', amount: toCall };
}

export async function POST(request: NextRequest) {
  try {
    const { gameId } = await request.json();
    console.log(`[API] Processing action for game ${gameId}`);

    const gameState = getGame(gameId);
    if (!gameState) {
      console.error(`[API] Game not found: ${gameId}`);
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const majorityWinner = getMajorityWinner(gameState.players, gameState.pot, gameState.winThreshold);
    const activePlayers = gameState.players.filter(p => p.chips > 0);
    console.log(`[API] Active players: ${activePlayers.length}, Phase: ${gameState.phase}`);

    if (majorityWinner || activePlayers.length <= 1) {
      const winnerModel = majorityWinner?.model || activePlayers[0]?.model || 'None';
      console.log(`[API] Game finished. Winner: ${winnerModel}`);
      return NextResponse.json({ error: 'Game finished', winner: winnerModel }, { status: 400 });
    }

    // If phase is 'finished' but multiple players remain, start a new hand
    if (gameState.phase === 'finished') {
      console.log(`[API] Hand finished, starting new hand...`);
      const newHandState = startNewHand(gameState);
      saveGame(newHandState);
      return NextResponse.json({
        state: newHandState,
        action: null,
        message: 'New hand started',
      });
    }

    const player = gameState.players[gameState.currentPlayerIndex];
    console.log(`[API] Current player: ${player.model} (index ${gameState.currentPlayerIndex})`);
    console.log(`[API] Player chips: ${player.chips}, Current bet: ${gameState.currentBet}, To call: ${gameState.currentBet - player.currentBet}`);

    const providerKey = player.model as 'openai' | 'anthropic' | 'google' | 'grok' | 'meta';
    let provider: any = null;
    let modelName: string | null = null;
    let usedFallback = false;

    if (providerKey !== 'meta') {
      provider = getProvider(providerKey as 'openai' | 'anthropic' | 'google' | 'grok');
      modelName = getModelName(gameState.mode, providerKey);
    } else {
      console.log('[API] Meta provider not configured, using fallback bot');
      usedFallback = true;
    }

    const prompt = createActionPrompt(gameState, gameState.currentPlayerIndex);
    const timeoutMs = gameState.actionTimeoutMs || (gameState.mode === 'fast' ? DEFAULT_TIMEOUT_FAST : DEFAULT_TIMEOUT_SMART);

    const startTime = Date.now();
    let action: { type: string; amount?: number } | undefined;
    let responseTime: number;

    if (usedFallback) {
      action = fallbackAction(player, gameState);
      responseTime = 50;
    } else {
      const actionPromise = generateText({
        model: provider(modelName),
        prompt,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeoutMs);
      });

      let actionText = '';
      try {
        const result = await Promise.race([actionPromise, timeoutPromise]);
        actionText = result.text;
        responseTime = Date.now() - startTime;
      } catch (error) {
        responseTime = timeoutMs;
        action = fallbackAction(player, gameState);
      }

      if (!action) {
        try {
          action = parseActionResponse(actionText);
        } catch (error) {
          action = fallbackAction(player, gameState);
        }
      }
    }

    if (!validateAction(action as any, player, gameState)) {
      action = fallbackAction(player, gameState);
    }

    console.log(`[API] Applying action: ${action.type}${action.amount ? ` (${action.amount})` : ''}`);
    const { newState, actionLog } = applyAction(gameState, action, player.model, responseTime);
    saveGame(newState);

    console.log(`[API] Action applied. New phase: ${newState.phase}, Hand: ${newState.handNumber}`);
    console.log(`[API] Next player index: ${newState.currentPlayerIndex}`);
    console.log(`[API] Pot: ${newState.pot}, Current bet: ${newState.currentBet}`);

    if (newState.phase === 'finished') {
      const winner = getMajorityWinner(newState.players, newState.pot, newState.winThreshold);
      if (winner) {
        console.log(`[API] Winner detected after action: ${winner.model}`);
        return NextResponse.json({
          state: newState,
          action: actionLog,
          message: 'Game finished',
        });
      }

      const remainingPlayers = newState.players.filter(p => p.chips > 0);
      console.log(`[API] Phase is 'finished'. Remaining players: ${remainingPlayers.length}`);

      if (remainingPlayers.length > 1) {
        console.log(`[API] Multiple players remain, starting new hand...`);
        const nextHandState = startNewHand(newState);
        saveGame(nextHandState);
        console.log(`[API] New hand started. Phase: ${nextHandState.phase}, Hand: ${nextHandState.handNumber}`);

        return NextResponse.json({
          state: nextHandState,
          action: actionLog,
          message: 'Hand ended, new hand started',
        });
      }
    }

    return NextResponse.json({
      state: newState,
      action: actionLog,
    });
  } catch (error) {
    console.error('Error processing action:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}
