'use client';

interface GameControlsProps {
  mode: 'fast' | 'smart' | null;
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
    <div className="flex flex-col gap-4 items-center">
      <div className="flex gap-4">
        <button
          onClick={() => onModeChange('fast')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            mode === 'fast'
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          disabled={isPlaying}
        >
          Fast Mode
          <div className="text-xs font-normal mt-1">Small Models</div>
        </button>
        <button
          onClick={() => onModeChange('smart')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            mode === 'smart'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          disabled={isPlaying}
        >
          Smart Mode
          <div className="text-xs font-normal mt-1">Large Models</div>
        </button>
      </div>
      
      <button
        onClick={onStart}
        disabled={!mode || isPlaying}
        className={`px-8 py-4 rounded-lg font-bold text-lg transition-all ${
          mode && !isPlaying
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
            : 'bg-gray-400 text-gray-600 cursor-not-allowed'
        }`}
      >
        {isPlaying ? 'Game in Progress...' : 'Start Game'}
      </button>
    </div>
  );
}

