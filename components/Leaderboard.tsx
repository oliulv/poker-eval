'use client';

import type { GameState } from '@/lib/types';
import { getModelDisplayName } from '@/lib/types';

interface LeaderboardProps {
  gameState: GameState;
}

export default function Leaderboard({ gameState }: LeaderboardProps) {
  const rankings = gameState.players
    .map(p => ({
      model: p.model,
      chips: p.chips,
      isActive: p.isActive,
    }))
    .sort((a, b) => b.chips - a.chips);

  return (
    <div className="vercel-card p-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Leaderboard</h3>
      <div className="space-y-2">
        {rankings.map((player, index) => (
          <div
            key={player.model}
            className={`
              flex items-center justify-between p-2 rounded transition-colors
              hover:bg-gray-50 dark:hover:bg-gray-900
              ${!player.isActive ? 'opacity-60 grayscale' : ''}
            `}
          >
            <div className="flex items-center gap-3">
              <span className={`
                flex items-center justify-center w-5 h-5 text-xs font-bold rounded
                ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                  index === 1 ? 'bg-gray-100 text-gray-700' : 
                  index === 2 ? 'bg-orange-100 text-orange-700' : 'text-gray-400'}
              `}>
                {index + 1}
              </span>
              <span className="text-sm font-medium">
                {getModelDisplayName(gameState.mode, player.model)}
              </span>
              {!player.isActive && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700">
                  Folded
                </span>
              )}
            </div>
            <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
              ${player.chips}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
