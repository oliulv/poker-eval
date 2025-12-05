'use client';

import type { ActionLog as ActionLogType } from '@/lib/types';
import { MODEL_NAMES } from '@/lib/types';

interface ActionLogProps {
  actions: ActionLogType[];
  onActionClick?: (actionIndex: number) => void;
}

export default function ActionLog({ actions, onActionClick }: ActionLogProps) {
  const recentActions = actions.slice(-10).reverse();
  const startIndex = Math.max(0, actions.length - 10);

  return (
    <div className="bg-gray-900 text-white p-4 rounded-lg border-2 border-gray-700 max-h-64 overflow-y-auto">
      <h3 className="font-bold mb-2">Action Log</h3>
      <div className="space-y-1 text-sm">
        {recentActions.length === 0 ? (
          <div className="text-gray-400">No actions yet</div>
        ) : (
          recentActions.map((action, idx) => {
            const actualIndex = startIndex + (recentActions.length - 1 - idx);
            return (
              <div
                key={actualIndex}
                onClick={() => onActionClick?.(actualIndex)}
                className={`flex items-center gap-2 text-xs p-2 rounded cursor-pointer transition-colors ${
                  onActionClick ? 'hover:bg-gray-800' : ''
                }`}
              >
                <span className="text-gray-400">
                  Hand {action.handNumber} - {action.phase}:
                </span>
                <span className="font-semibold">
                  {MODEL_NAMES[action.model as keyof typeof MODEL_NAMES]}
                </span>
                <span className="text-yellow-400">{action.action}</span>
                {action.amount && <span>({action.amount})</span>}
                <span className="text-gray-500 ml-auto">
                  {action.responseTimeMs}ms
                </span>
                {action.reasoning && (
                  <span className="text-blue-400 text-[10px]">💭</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

