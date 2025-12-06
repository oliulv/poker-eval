'use client';

interface GameControlsProps {
  mode: 'fast' | 'smart';
  onModeChange: (mode: 'fast' | 'smart') => void;
  onStart: () => void;
  isPlaying: boolean;
  actionTimeoutMs: number;
  onActionTimeoutChange: (value: number) => void;
  winThreshold: number;
  onWinThresholdChange: (value: number) => void;
  selectedModels: string[];
  onToggleModel: (model: string) => void;
}

export default function GameControls({
  mode,
  onModeChange,
  onStart,
  isPlaying,
  actionTimeoutMs,
  onActionTimeoutChange,
  winThreshold,
  onWinThresholdChange,
  selectedModels,
  onToggleModel,
}: GameControlsProps) {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md">
      {/* Mode Toggle */}
      <div className="w-full">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-200 dark:border-gray-800 p-1 bg-gray-50 dark:bg-gray-900">
          {[
            { key: 'fast', title: 'Fast Mode', subtitle: 'Small models' },
            { key: 'smart', title: 'Smart Mode', subtitle: 'Large models' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => onModeChange(opt.key as 'fast' | 'smart')}
              disabled={isPlaying}
              className={`flex flex-col items-center justify-center py-3 px-2 rounded-lg border transition-all ${
                mode === opt.key
                  ? 'bg-white dark:bg-black border-gray-300 dark:border-gray-700 shadow-sm text-foreground'
                  : 'border-transparent text-gray-500 hover:text-foreground'
              }`}
            >
              <span className="text-sm font-semibold">{opt.title}</span>
              <span className="text-[11px] opacity-70">{opt.subtitle}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="w-full grid gap-4 rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white/70 dark:bg-black/60">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Think Time (ms)</div>
            <div className="text-xs text-gray-500">Per action timeout (min 200ms)</div>
          </div>
          <input
            type="number"
            min={200}
            step={100}
            value={actionTimeoutMs}
            onChange={e => {
              const val = Number(e.target.value);
              if (Number.isNaN(val)) return;
              const clamped = Math.max(200, val);
              onActionTimeoutChange(clamped);
            }}
            className="w-32 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/30"
            disabled={isPlaying}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Win Threshold</div>
            <div className="text-xs text-gray-500">Percent of total chips to win</div>
          </div>
          <div className="flex items-center gap-3 w-full">
            <input
              type="range"
              min={0.3}
              max={1}
              step={0.01}
              value={winThreshold}
              onChange={e => onWinThresholdChange(Number(e.target.value))}
              className="flex-1 accent-foreground"
              disabled={isPlaying}
            />
            <span className="text-sm font-mono w-12 text-right">{Math.round(winThreshold * 100)}%</span>
          </div>
        </div>

        {mode === 'smart' && (
          <div className="space-y-2">
            <div className="text-sm font-semibold">Select Models</div>
            <div className="text-xs text-gray-500">Choose at least two</div>
            <div className="grid grid-cols-2 gap-2">
              {['openai','anthropic','google','grok','meta'].map(model => {
                const checked = selectedModels.includes(model);
                return (
                  <label
                    key={model}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      checked ? 'border-foreground text-foreground' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                    } ${isPlaying ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="accent-foreground"
                      checked={checked}
                      disabled={isPlaying}
                      onChange={() => onToggleModel(model)}
                    />
                    <span className="capitalize truncate">{model}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
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
