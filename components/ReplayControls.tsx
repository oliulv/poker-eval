'use client';

interface ReplayControlsProps {
  isReplaying: boolean;
  playbackSpeed: number;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  currentActionIndex: number;
  totalActions: number;
}

export default function ReplayControls({
  isReplaying,
  playbackSpeed,
  onPlayPause,
  onSpeedChange,
  onStepForward,
  onStepBackward,
  currentActionIndex,
  totalActions,
}: ReplayControlsProps) {
  return (
    <div className="vercel-card p-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Replay Controls</h3>
      
      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          onClick={onStepBackward}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
          disabled={currentActionIndex === 0}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button
          onClick={onPlayPause}
          className="px-6 py-1.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity min-w-[80px]"
        >
          {isReplaying ? 'Pause' : 'Play'}
        </button>
        
        <button
          onClick={onStepForward}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
          disabled={currentActionIndex >= totalActions - 1}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-gray-500 uppercase tracking-wide">Speed</span>
        {[1, 2, 5, 10].map(speed => (
          <button
            key={speed}
            onClick={() => onSpeedChange(speed)}
            className={`
              px-2 py-0.5 rounded text-xs font-mono transition-colors
              ${playbackSpeed === speed
                ? 'bg-gray-200 dark:bg-gray-700 text-foreground font-bold'
                : 'text-gray-500 hover:text-foreground'}
            `}
          >
            {speed}x
          </button>
        ))}
      </div>
      
      <div className="mt-4 text-center">
        <div className="inline-block px-2 py-1 bg-gray-50 dark:bg-gray-900 rounded border border-gray-100 dark:border-gray-800 text-[10px] font-mono text-gray-500">
          ACTION {currentActionIndex + 1} / {totalActions}
        </div>
      </div>
    </div>
  );
}
