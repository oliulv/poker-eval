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
    <div className="bg-gray-800 p-4 rounded-lg border-2 border-gray-600">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={onStepBackward}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          disabled={currentActionIndex === 0}
        >
          ←
        </button>
        <button
          onClick={onPlayPause}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold"
        >
          {isReplaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={onStepForward}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          disabled={currentActionIndex >= totalActions - 1}
        >
          →
        </button>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-white text-sm">Speed:</span>
        {[1, 2, 5, 10].map(speed => (
          <button
            key={speed}
            onClick={() => onSpeedChange(speed)}
            className={`px-3 py-1 rounded text-sm ${
              playbackSpeed === speed
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {speed}x
          </button>
        ))}
      </div>
      
      <div className="mt-2 text-sm text-gray-400">
        Action {currentActionIndex + 1} of {totalActions}
      </div>
    </div>
  );
}

