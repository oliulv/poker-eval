"use client";

import { getModelDisplayName } from '@/lib/types';

interface ReasoningModalProps {
  isOpen: boolean;
  onClose: () => void;
  reasoning: string | null;
  model: string;
  action: string;
  mode: 'fast' | 'smart';
}

export default function ReasoningModal({
  isOpen,
  onClose,
  reasoning,
  model,
  action,
  mode,
}: ReasoningModalProps) {
  const deriveActionLabel = () => {
    if (action) return action.toUpperCase();
    if (reasoning) {
      try {
        const parsed = JSON.parse(reasoning);
        if (parsed?.action) return String(parsed.action).toUpperCase();
      } catch {
        // ignore parse errors
      }
    }
    return 'ACTION';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="vercel-card w-full max-w-lg mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold">{getModelDisplayName(mode, model)}</h2>
              <p className="text-sm text-gray-500 uppercase tracking-wider mt-1 font-mono">
                ACTION: <span className="text-foreground">{deriveActionLabel()}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-foreground transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-bold uppercase text-gray-400 mb-2">Reasoning Trace</h3>
            {reasoning ? (
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap">
                {reasoning}
              </p>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-400 font-mono">
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-100"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-200"></span>
                <span>Extracting thoughts...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
