'use client';

import type { Player } from '@/lib/types';
import { MODEL_NAMES } from '@/lib/types';

interface PlayerCardProps {
  player: Player;
  isCurrentPlayer: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
}

const MODEL_COLORS: Record<string, string> = {
  openai: 'bg-green-600',
  anthropic: 'bg-purple-600',
  google: 'bg-blue-600',
  grok: 'bg-orange-600',
  meta: 'bg-pink-600',
};

export default function PlayerCard({
  player,
  isCurrentPlayer,
  isDealer,
  isSmallBlind,
  isBigBlind,
}: PlayerCardProps) {
  const modelColor = MODEL_COLORS[player.model] || 'bg-gray-600';
  const showCards = player.holeCards && (player.isAllIn || !player.isActive);

  return (
    <div
      className={`relative min-w-[120px] p-3 rounded-lg border-2 transition-all ${
        isCurrentPlayer
          ? 'border-yellow-400 shadow-lg shadow-yellow-400/50 scale-110'
          : 'border-gray-600'
      } ${modelColor} text-white`}
    >
      {/* Dealer button */}
      {isDealer && (
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-black">
          D
        </div>
      )}

      {/* Blinds indicators */}
      {isSmallBlind && (
        <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-1 rounded">
          SB
        </div>
      )}
      {isBigBlind && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1 rounded">
          BB
        </div>
      )}

      {/* Model name */}
      <div className="font-bold text-sm mb-1">{MODEL_NAMES[player.model as keyof typeof MODEL_NAMES]}</div>

      {/* Chips */}
      <div className="text-lg font-bold mb-2">{player.chips}</div>

      {/* Cards */}
      {showCards && player.holeCards ? (
        <div className="flex gap-1">
          {player.holeCards.map((card, idx) => (
            <div
              key={idx}
              className="w-8 h-10 bg-white text-black rounded text-xs flex flex-col items-center justify-center border border-gray-400"
            >
              <div className={card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-black'}>
                {card.rank}
              </div>
              <div className="text-[10px]">
                {card.suit === 'hearts' && '♥'}
                {card.suit === 'diamonds' && '♦'}
                {card.suit === 'clubs' && '♣'}
                {card.suit === 'spades' && '♠'}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-1">
          <div className="w-8 h-10 bg-gray-800 rounded border-2 border-gray-600" />
          <div className="w-8 h-10 bg-gray-800 rounded border-2 border-gray-600" />
        </div>
      )}

      {/* Current bet */}
      {player.currentBet > 0 && (
        <div className="mt-1 text-xs text-yellow-300">
          Bet: {player.currentBet}
        </div>
      )}

      {/* All-in indicator */}
      {player.isAllIn && (
        <div className="mt-1 text-xs font-bold text-red-300">ALL-IN</div>
      )}

      {/* Thinking indicator */}
      {isCurrentPlayer && player.isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <div className="animate-pulse text-yellow-400 font-bold">Thinking...</div>
        </div>
      )}
    </div>
  );
}

