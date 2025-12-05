'use client';

import type { ActionLog as ActionLogType } from '@/lib/types';
import { MODEL_NAMES } from '@/lib/types';

interface ActionLogProps {
  actions: ActionLogType[];
  onActionClick?: (actionIndex: number) => void;
}

export default function ActionLog({ actions, onActionClick }: ActionLogProps) {
  const recentActions = actions.slice(-8).reverse();
  const startIndex = Math.max(0, actions.length - 8);

  return (
    <div className="vercel-card p-4 h-80 flex flex-col">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Live Feed</h3>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs text-gray-400 font-mono">REALTIME</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
        {recentActions.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-400 font-mono text-center">
            Waiting for game start...
          </div>
        ) : (
          recentActions.map((action, idx) => {
            const actualIndex = startIndex + (recentActions.length - 1 - idx);
            const isLatest = idx === 0;
            
            return (
              <div
                key={actualIndex}
                onClick={() => onActionClick?.(actualIndex)}
                className={`
                  group flex flex-col gap-1 p-2 rounded cursor-pointer transition-all border border-transparent
                  ${isLatest ? 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-900'}
                `}
              >
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">
                      {MODEL_NAMES[action.model as keyof typeof MODEL_NAMES]}
                    </span>
                    <span className={`font-mono px-1.5 py-0.5 rounded-sm bg-gray-100 dark:bg-gray-800 text-[10px] ${isLatest ? 'text-foreground' : 'text-gray-500'}`}>
                      {action.action.toUpperCase()}
                    </span>
                    {action.amount && (
                      <span className="font-mono text-gray-500">${action.amount}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {action.responseTimeMs}ms
                  </span>
                </div>
                
                {action.reasoning && (
                  <div className="text-[10px] text-gray-500 line-clamp-1 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                    {action.reasoning}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
