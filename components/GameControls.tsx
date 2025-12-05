'use client';

interface GameControlsProps {
  mode: 'fast' | 'smart';
  onModeChange: (mode: 'fast' | 'smart') => void;
  onStart: () => void;
  isPlaying: boolean;
}

export default function GameControls({
  mode,
  onModeChange,
  onStart,
  isPlaying,
}: GameControlsProps) {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md">
      {/* Mode Toggle */}
      <div className="relative bg-gray-100 dark:bg-gray-800 p-1 rounded-full flex w-full">
        <div
          className={`absolute inset-y-1 w-[calc(50%-4px)] bg-white dark:bg-black rounded-full shadow-sm transition-all duration-300 ease-in-out ${
            mode === 'smart' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-1'
          }`}
        ></div>
        
        <button
          onClick={() => onModeChange('fast')}
          disabled={isPlaying}
          className={`relative z-10 flex-1 py-3 text-sm font-medium transition-colors rounded-full ${
            mode === 'fast' ? 'text-foreground' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Fast Mode
          <span className="block text-[10px] font-normal opacity-60 mt-0.5">Small Models</span>
        </button>
        
        <button
          onClick={() => onModeChange('smart')}
          disabled={isPlaying}
          className={`relative z-10 flex-1 py-3 text-sm font-medium transition-colors rounded-full ${
            mode === 'smart' ? 'text-foreground' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Smart Mode
          <span className="block text-[10px] font-normal opacity-60 mt-0.5">Large Models</span>
        </button>
      </div>

      {/* Start Button */}
      <button
        onClick={onStart}
        disabled={isPlaying}
        className={`
          w-full py-4 px-8 rounded-full font-medium text-lg transition-all transform active:scale-95
          ${isPlaying 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-foreground text-background hover:bg-foreground/90 shadow-lg hover:shadow-xl'}
        `}
      >
        {isPlaying ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-current rounded-full animate-bounce"></span>
            <span className="w-2 h-2 bg-current rounded-full animate-bounce delay-100"></span>
            <span className="w-2 h-2 bg-current rounded-full animate-bounce delay-200"></span>
          </span>
        ) : (
          'Start Simulation'
        )}
      </button>
    </div>
  );
}
