'use client';

import { MODEL_NAMES, getModelDisplayName } from '@/lib/types';

interface CreditTrackerProps {
  credits: Record<string, number>;
  mode: 'fast' | 'smart';
}

export default function CreditTracker({ credits, mode }: CreditTrackerProps) {
  const providers = Object.keys(MODEL_NAMES) as (keyof typeof MODEL_NAMES)[];

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-black/80 backdrop-blur px-4 py-3 shadow-lg">
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
          API Credits Used
        </div>
        <div className="space-y-1">
          {providers.map(provider => (
            <div key={provider} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-200">
                {getModelDisplayName(mode, provider)}
              </span>
              <span className="font-mono text-gray-900 dark:text-white">
                ${(credits[provider] ?? 0).toFixed(3)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
