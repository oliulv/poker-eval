'use client';

import type { Card } from '@/lib/types';

interface CommunityCardsProps {
  cards: Card[];
  phase: string;
}

export default function CommunityCards({ cards, phase }: CommunityCardsProps) {
  const slots = [0, 1, 2, 3, 4]; // 5 slots for community cards

  return (
    <div className="flex gap-2">
      {slots.map((_, idx) => {
        const card = cards[idx];
        return (
          <div
            key={idx}
            className={`
              w-10 h-14 sm:w-12 sm:h-16 rounded-lg flex flex-col items-center justify-center border shadow-sm transition-all duration-300
              ${card 
                ? 'bg-white border-gray-200 transform scale-100 opacity-100' 
                : 'bg-gray-100 dark:bg-gray-800 border-dashed border-gray-300 dark:border-gray-700 transform scale-95 opacity-50'}
            `}
          >
            {card && (
              <>
                <div className={`text-sm sm:text-base font-bold leading-none ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : 'text-black'}`}>
                  {card.rank}
                </div>
                <div className={`text-xs sm:text-sm leading-none ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : 'text-black'}`}>
                  {card.suit === 'hearts' && '♥'}
                  {card.suit === 'diamonds' && '♦'}
                  {card.suit === 'clubs' && '♣'}
                  {card.suit === 'spades' && '♠'}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
