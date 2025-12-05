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

  if (rankings.length === 0) return null;

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg border-2 border-amber-500">
      <h2 className="text-2xl font-bold mb-4 text-center">Leaderboard</h2>
      <div className="space-y-2">
        {rankings.map((player, index) => (
          <div
            key={player.model}
            className={`flex items-center justify-between p-3 rounded ${
              index === 0 ? 'bg-yellow-600' : index === 1 ? 'bg-gray-700' : index === 2 ? 'bg-amber-800' : 'bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold w-8">#{index + 1}</div>
              <div className="font-semibold">
                {MODEL_NAMES[player.model as keyof typeof MODEL_NAMES]}
              </div>
            </div>
            <div className="text-xl font-bold">{player.chips} chips</div>
          </div>
        ))}
      </div>
    </div>
  );
}

