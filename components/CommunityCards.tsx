'use client';

import type { Card } from '@/lib/types';

interface CommunityCardsProps {
  cards: Card[];
  phase: string;
}

export default function CommunityCards({ cards, phase }: CommunityCardsProps) {
  const getPhaseLabel = () => {
    switch (phase) {
      case 'preflop':
        return '';
      case 'flop':
        return 'Flop';
      case 'turn':
        return 'Turn';
      case 'river':
        return 'River';
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {getPhaseLabel() && (
        <div className="text-white font-bold text-sm bg-black/60 px-3 py-1 rounded">
          {getPhaseLabel()}
        </div>
      )}
      <div className="flex gap-2">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="w-12 h-16 bg-white text-black rounded-lg flex flex-col items-center justify-center border-2 border-gray-400 shadow-lg"
          >
            <div className={`text-lg font-bold ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-black'}`}>
              {card.rank}
            </div>
            <div className="text-xl">
              {card.suit === 'hearts' && '♥'}
              {card.suit === 'diamonds' && '♦'}
              {card.suit === 'clubs' && '♣'}
              {card.suit === 'spades' && '♠'}
            </div>
          </div>
        ))}
        {cards.length === 0 && (
          <div className="text-white/50 text-sm">Waiting for cards...</div>
        )}
      </div>
    </div>
  );
}

