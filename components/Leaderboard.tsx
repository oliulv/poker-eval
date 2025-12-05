'use client';

import type { GameState } from '@/lib/types';
import { MODEL_NAMES } from '@/lib/types';

interface LeaderboardProps {
  gameState: GameState;
}

export default function Leaderboard({ gameState }: LeaderboardProps) {
  const rankings = gameState.players
    .filter(p => p.isActive)
    .map(p => ({
      model: p.model,
      chips: p.chips,
    }))
    .sort((a, b) => b.chips - a.chips);

  return (
    <div className="vercel-card p-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Leaderboard</h3>
      <div className="space-y-2">
        {rankings.map((player, index) => (
          <div
            key={player.model}
            className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
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
                {MODEL_NAMES[player.model as keyof typeof MODEL_NAMES]}
              </span>
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
