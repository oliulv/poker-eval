'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState } from '@/lib/types';
import { getModelDisplayName, MODEL_KEYS } from '@/lib/types';
import PokerTable from '@/components/PokerTable';
import GameControls from '@/components/GameControls';
import Leaderboard from '@/components/Leaderboard';
import ActionLog from '@/components/ActionLog';
import ReplayControls from '@/components/ReplayControls';
import ReasoningModal from '@/components/ReasoningModal';
import CreditTracker from '@/components/CreditTracker';

const COST_PER_ACTION: Record<string, number> = {
  openai: 0.002, // tweak these to match your real per-call cost
  anthropic: 0.002,
  google: 0.0015,
  grok: 0.001,
  meta: 0,
};

export default function Home() {
  const [mode, setMode] = useState<'fast' | 'smart'>('fast');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [replayActionIndex, setReplayActionIndex] = useState(0);
  const [selectedAction, setSelectedAction] = useState<{ index: number; model: string; action: string } | null>(null);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [credits, setCredits] = useState<Record<string, number>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isRunningRef = useRef(false);
  const [actionTimeoutMs, setActionTimeoutMs] = useState<number>(500);
  const [winThreshold, setWinThreshold] = useState<number>(0.5);
  const [winnerModel, setWinnerModel] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>([...MODEL_KEYS]);

  const findMajorityWinner = (state: GameState | null) => {
    if (!state || state.players.length === 0) return null;
    const totalChips = state.players.reduce((sum, p) => sum + p.chips, 0) + state.pot;
    if (totalChips === 0) return null;
    const leader = state.players.reduce((current, player) => (player.chips > current.chips ? player : current), state.players[0]);
    const isUniqueLeader = state.players.filter(p => p.chips === leader.chips).length === 1;
    const threshold = state.winThreshold ?? 0.5;
    return leader.chips >= totalChips * threshold && isUniqueLeader ? leader : null;
  };

  const handleModeChange = (newMode: 'fast' | 'smart') => {
    setMode(newMode);
    if (!isPlaying) {
      setActionTimeoutMs(newMode === 'fast' ? 500 : 4000);
    }
    if (newMode === 'fast') {
      setSelectedModels([...MODEL_KEYS]);
    }
  };

  const handleToggleModel = (model: string) => {
    setSelectedModels(prev => {
      const exists = prev.includes(model);
      if (exists) {
        const next = prev.filter(m => m !== model);
        return next.length >= 2 ? next : prev; // require at least 2
      }
      return [...prev, model];
    });
  };

  const startGame = async () => {
    setIsPlaying(true);
    setCredits({});
    setErrorMessage(null);
    setWinnerModel(null);
    isRunningRef.current = true;
    try {
      const response = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          actionTimeoutMs,
          winThreshold,
          models: mode === 'smart' ? selectedModels : undefined,
        }),
      });
      
      const data = await response.json();
      setGameState(data.state);
      
      // Start processing actions
      processNextAction(data.gameId);
    } catch (error) {
      console.error('Error starting game:', error);
      setIsPlaying(false);
      isRunningRef.current = false;
    }
  };

  const processNextAction = useCallback(async (gameId: string) => {
    if (!isRunningRef.current) return;

    try {
      console.log(`[GAME] Processing next action for game ${gameId}`);
      
      const response = await fetch('/api/game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
      
      let data: any;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('[GAME] Failed to parse response JSON:', jsonError);
        setIsPlaying(false);
        isRunningRef.current = false;
        setErrorMessage('Failed to parse server response.');
        return;
      }
      
      // Check if response has error
      if (!response.ok || data.error) {
        console.error(`[GAME] API Error:`, data.error || 'Unknown error', 'Status:', response.status);
        setErrorMessage(data.error || 'API error');
        setIsPlaying(false);
        isRunningRef.current = false;
        if (data.winner) {
          setWinnerModel(data.winner);
        }
        
        // If game finished error, check if we should continue
        if (response.status === 400 && data.error === 'Game finished') {
          console.log(`[GAME] Game finished, checking final state...`);
          // Fetch final state to see if there's a winner
          const stateResponse = await fetch(`/api/game/${gameId}`);
          const stateData = await stateResponse.json();
          
          if (stateData.state) {
            const majorityWinner = findMajorityWinner(stateData.state);
            if (majorityWinner) {
              console.log(`[GAME] Game truly finished. Winner:`, majorityWinner.model);
              setGameState(stateData.state);
              setIsPlaying(false);
              isRunningRef.current = false;
              setWinnerModel(majorityWinner.model);
              return;
            }

            console.log(`[GAME] Game marked finished without a majority winner.`);
            setIsPlaying(false);
            isRunningRef.current = false;
            return;
          }
        }
        
        setIsPlaying(false);
        isRunningRef.current = false;
        setErrorMessage('Request failed');
        return;
      }
      
      // Validate response has state
      if (!data.state) {
        console.error(`[GAME] Response missing state:`, data);
        setIsPlaying(false);
        isRunningRef.current = false;
        setErrorMessage('Missing game state');
        return;
      }
      
      console.log(`[GAME] Action processed. Phase: ${data.state.phase}, Hand: ${data.state.handNumber}, Current Player: ${data.state.currentPlayerIndex}`);
      console.log(`[GAME] Player chips:`, data.state.players.map((p: any) => `${p.model}: ${p.chips}`).join(', '));
      
      const returnedActions = data.actions || (data.action ? [data.action] : []);
      if (returnedActions.length > 0) {
        setCredits(prev => {
          const updates = { ...prev };
          returnedActions.forEach((act: any) => {
            if (!act?.model) return;
            const current = updates[act.model] || 0;
            const increment = COST_PER_ACTION[act.model] ?? 0.001;
            updates[act.model] = parseFloat((current + increment).toFixed(4));
          });
          return updates;
        });
      }

      setGameState(data.state);
      
      // Check if game is truly finished (only 1 player with chips)
      const majorityWinner = findMajorityWinner(data.state);
      if (majorityWinner) {
        console.log(`[GAME] Game finished! Winner:`, majorityWinner.model);
        setIsPlaying(false);
        isRunningRef.current = false;
        setWinnerModel(majorityWinner.model);
        return;
      }
      
      // If phase is finished but multiple players remain, it means a hand ended
      // The backend should have started a new hand, so continue
      if (data.state.phase === 'finished') {
        console.log(`[GAME] Hand finished but game continues. Starting new hand...`);
        // The backend should have already started a new hand, so continue
      }
      
      // Continue to next action after a short delay
      setTimeout(() => {
        if (isRunningRef.current) {
          processNextAction(gameId);
        }
      }, mode === 'fast' ? 200 : 400);
    } catch (error) {
      console.error('[GAME] Error processing action:', error);
      setIsPlaying(false);
      isRunningRef.current = false;
      setErrorMessage('Failed to fetch next action');
    }
  }, [findMajorityWinner, mode]);

  const fetchReasoning = async (actionIndex: number) => {
    if (!gameState) return;
    
    const action = gameState.actionHistory[actionIndex];
    if (!action) return;
    
    if (action.reasoning) {
      setReasoning(action.reasoning);
      return;
    }
    
    try {
      const response = await fetch(`/api/game/${gameState.id}/reasoning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionIndex }),
      });
      
      const data = await response.json();
      setReasoning(data.reasoning);
      // Persist reasoning locally so we don't refetch
      setGameState(prev => {
        if (!prev) return prev;
        const updated = { ...prev, actionHistory: [...prev.actionHistory] };
        if (updated.actionHistory[actionIndex]) {
          updated.actionHistory[actionIndex] = {
            ...updated.actionHistory[actionIndex],
            reasoning: data.reasoning,
          };
        }
        return updated;
      });
    } catch (error) {
      console.error('Error fetching reasoning:', error);
      setReasoning('Failed to load reasoning');
    }
  };

  const saveDemoGame = async () => {
    if (!gameState) return;
    try {
      setSaveMessage('Saving...');
      const response = await fetch('/api/game/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameState.id, name: `Demo ${new Date().toISOString()}` }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
      }
      setSaveMessage('Saved demo game');
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      console.error('Error saving demo:', error);
      setSaveMessage('Save failed');
      setTimeout(() => setSaveMessage(null), 2000);
    }
  };

  const handleActionClick = (actionIndex: number) => {
    if (!gameState) return;
    const action = gameState.actionHistory[actionIndex];
    setSelectedAction({ index: actionIndex, model: action.model, action: action.action });
    setReasoning(null);
    fetchReasoning(actionIndex);
  };

  const startReplay = () => {
    if (!gameState) return;
    setIsReplaying(true);
    setReplayActionIndex(0);
  };

  const stopReplay = () => {
    setIsReplaying(false);
  };

  const stepReplay = useCallback(() => {
    if (!gameState || !isReplaying) return;
    
    if (replayActionIndex < gameState.actionHistory.length - 1) {
      setReplayActionIndex(replayActionIndex + 1);
    } else {
      setIsReplaying(false);
    }
  }, [gameState, isReplaying, replayActionIndex]);

  useEffect(() => {
    if (isReplaying && gameState) {
      const interval = setInterval(() => {
        stepReplay();
      }, 1000 / playbackSpeed);
      
      return () => clearInterval(interval);
    }
  }, [isReplaying, playbackSpeed, stepReplay, gameState]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-foreground selection:text-background">
      <CreditTracker credits={credits} mode={mode} />
      {errorMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded shadow">
          {errorMessage}
        </div>
      )}
      <main className="max-w-6xl mx-auto px-6 py-12 sm:py-20">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-16 space-y-6">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            AI Gateway Hackathon
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 pb-2">
            Model Evaluation<br />Arena
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
            Watch top AI models compete in high-stakes Texas Hold'em poker. 
            Analyze their strategic reasoning and decision-making in real-time.
          </p>
          
          {!gameState && (
            <div className="flex flex-col items-center gap-8 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-both delay-200">
              <GameControls
                mode={mode}
                onModeChange={handleModeChange}
                onStart={startGame}
                isPlaying={isPlaying}
                actionTimeoutMs={actionTimeoutMs}
                onActionTimeoutChange={setActionTimeoutMs}
                winThreshold={winThreshold}
                onWinThresholdChange={setWinThreshold}
                selectedModels={selectedModels}
                onToggleModel={handleToggleModel}
              />
            </div>
          )}
        </div>

        {/* Game Area */}
        {gameState && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in zoom-in-95 duration-500">
            {/* Main Table */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/20">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-mono text-gray-500">LIVE_GAME_ID: {gameState.id.slice(0, 8)}</span>
          </div>
          <div className="text-sm font-mono text-gray-500">
            HAND #{gameState.handNumber}
          </div>
        </div>
        <div className="p-8">
          <PokerTable gameState={gameState} />
        </div>
      </div>
              
              {/* Game Over Controls */}
              {gameState.phase === 'finished' && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center animate-in fade-in slide-in-from-bottom-4">
                  <button
                    onClick={() => {
                      setGameState(null);
                      setIsReplaying(false);
                      setReplayActionIndex(0);
                      setWinnerModel(null);
                      setSaveMessage(null);
                    }}
                    className="vercel-btn vercel-btn-primary shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                  >
                    Start New Game
                  </button>
                  <button
                    onClick={saveDemoGame}
                    className="vercel-btn shadow-sm hover:shadow-md"
                  >
                    Save as Demo
                  </button>
                  {saveMessage && <span className="text-xs text-gray-500">{saveMessage}</span>}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <Leaderboard gameState={gameState} />
              <ActionLog 
                actions={gameState.actionHistory}
                mode={gameState.mode}
                onActionClick={handleActionClick}
              />
              
              {gameState.phase === 'finished' && (
                <ReplayControls
                  isReplaying={isReplaying}
                  playbackSpeed={playbackSpeed}
                  onPlayPause={isReplaying ? stopReplay : startReplay}
                  onSpeedChange={setPlaybackSpeed}
                  onStepForward={() => {
                    if (replayActionIndex < gameState.actionHistory.length - 1) {
                      setReplayActionIndex(replayActionIndex + 1);
                    }
                  }}
                  onStepBackward={() => {
                    if (replayActionIndex > 0) {
                      setReplayActionIndex(replayActionIndex - 1);
                    }
                  }}
                  currentActionIndex={replayActionIndex}
                  totalActions={gameState.actionHistory.length}
                />
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-500">
          <p>Built with Vercel AI SDK • Next.js • Tailwind CSS</p>
        </div>

        {selectedAction && (
          <ReasoningModal
            isOpen={true}
            onClose={() => setSelectedAction(null)}
            reasoning={reasoning}
            model={selectedAction.model}
            action={selectedAction.action}
            mode={gameState?.mode || mode}
          />
        )}

        {winnerModel && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="vercel-card max-w-md w-full text-center space-y-4">
              <h3 className="text-xl font-bold">Winner</h3>
              <p className="text-lg">
                {getModelDisplayName(gameState?.mode || mode, winnerModel)} takes the pot!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setWinnerModel(null)}
                  className="vercel-btn w-full sm:w-auto"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setWinnerModel(null);
                    setGameState(null);
                    setIsPlaying(false);
                  }}
                  className="vercel-btn vercel-btn-primary w-full sm:w-auto"
                >
                  Start New Game
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
