'use client';

import type { Player } from '@/lib/types';
import { getModelDisplayName } from '@/lib/types';

interface PlayerCardProps {
  player: Player;
  isCurrentPlayer: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  mode: 'fast' | 'smart';
}

const MODEL_LOGOS: Record<string, string> = {
  openai: 'bg-green-500',
  anthropic: 'bg-purple-500',
  google: 'bg-blue-500',
  grok: 'bg-white dark:bg-black border border-gray-200 dark:border-white',
  meta: 'bg-blue-600',
};

export default function PlayerCard({
  player,
  isCurrentPlayer,
  isDealer,
  isSmallBlind,
  isBigBlind,
  mode,
}: PlayerCardProps) {
  const displayName = getModelDisplayName(mode, player.model);
  const modelColor = MODEL_LOGOS[player.model] || 'bg-gray-500';
  const showCards = player.holeCards && (player.isAllIn || !player.isActive); // Only show cards if all-in or folded? Actually usually only at showdown or own cards. 
  // For observer mode, maybe we want to see cards? Let's show back of cards if active, front if showdown.
  // The original code showed cards if holeCards present. Let's stick to that but style it better.

  const isActive = player.isActive;
  const isFolded = !player.isActive;
  const isAllIn = player.isAllIn;

  return (
    <div className={`relative group ${isFolded ? 'opacity-50 grayscale' : ''}`}>
      {/* Card Container */}
      <div
        className={`
          relative w-40 p-3 rounded-xl border bg-white dark:bg-black transition-all duration-300
          ${isCurrentPlayer 
            ? 'border-black dark:border-white shadow-lg scale-105 ring-1 ring-black/5 dark:ring-white/20' 
            : 'border-gray-200 dark:border-gray-800 shadow-sm'}
        `}
      >
        {/* Header: Avatar + Name */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-inner ${modelColor}`}>
            <span className="text-[10px] font-bold text-white mix-blend-difference">
              {player.model[0].toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-bold truncate">
              {displayName}
            </span>
            <span className="text-[10px] text-gray-500 font-mono truncate">
              ${player.chips}
            </span>
          </div>
        </div>

        {/* Cards Area */}
        <div className="flex justify-center gap-1 h-12 mb-2">
          {player.holeCards ? (
            player.holeCards.map((card, idx) => (
              <div
                key={idx}
                className={`
                  w-8 h-11 bg-white rounded border border-gray-200 shadow-sm flex flex-col items-center justify-center
                  ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : 'text-black'}
                `}
              >
                <span className="text-xs font-bold leading-none">{card.rank}</span>
                <span className="text-[10px] leading-none">
                  {card.suit === 'hearts' && '♥'}
                  {card.suit === 'diamonds' && '♦'}
                  {card.suit === 'clubs' && '♣'}
                  {card.suit === 'spades' && '♠'}
                </span>
              </div>
            ))
          ) : (
            <>
              <div className="w-8 h-11 bg-blue-900/10 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:4px_4px]"></div>
              <div className="w-8 h-11 bg-blue-900/10 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:4px_4px]"></div>
            </>
          )}
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-1 justify-center">
          {isDealer && (
            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-medium rounded-full border border-yellow-200">D</span>
          )}
          {isSmallBlind && (
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-medium rounded-full border border-blue-200">SB</span>
          )}
          {isBigBlind && (
            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-medium rounded-full border border-indigo-200">BB</span>
          )}
          {isAllIn && (
            <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded-full border border-red-200 animate-pulse">ALL IN</span>
          )}
        </div>

        {/* Current Action/Bet */}
        {player.currentBet > 0 && (
          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 px-2 py-0.5 bg-gray-900 text-white text-[10px] font-mono rounded-full shadow-md whitespace-nowrap">
            Bet: ${player.currentBet}
          </div>
        )}

        {/* Thinking Indicator */}
        {isCurrentPlayer && isActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </div>
        )}
      </div>
    </div>
  );
}
