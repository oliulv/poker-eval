'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GameState, ActionLog as ActionLogType } from '@/lib/types';
import PokerTable from '@/components/PokerTable';
import GameControls from '@/components/GameControls';
import Leaderboard from '@/components/Leaderboard';
import ActionLog from '@/components/ActionLog';
import ReplayControls from '@/components/ReplayControls';
import ReasoningModal from '@/components/ReasoningModal';

export default function Home() {
  const [mode, setMode] = useState<'fast' | 'smart' | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [replayActionIndex, setReplayActionIndex] = useState(0);
  const [selectedAction, setSelectedAction] = useState<{ index: number; model: string; action: string } | null>(null);
  const [reasoning, setReasoning] = useState<string | null>(null);

  const startGame = async () => {
    if (!mode) return;
    
    setIsPlaying(true);
    try {
      const response = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      
      const data = await response.json();
      setGameState(data.state);
      
      // Start processing actions
      processNextAction(data.gameId);
    } catch (error) {
      console.error('Error starting game:', error);
      setIsPlaying(false);
    }
  };

  const processNextAction = async (gameId: string) => {
    try {
      const response = await fetch('/api/game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
      
      const data = await response.json();
      setGameState(data.state);
      
      // If game is finished, stop processing
      if (data.state.phase === 'finished') {
        setIsPlaying(false);
        return;
      }
      
      // Continue to next action after a short delay
      setTimeout(() => {
        processNextAction(gameId);
      }, 500);
    } catch (error) {
      console.error('Error processing action:', error);
      setIsPlaying(false);
    }
  };

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
    } catch (error) {
      console.error('Error fetching reasoning:', error);
      setReasoning('Failed to load reasoning');
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

  // Load demo game on first visit
  useEffect(() => {
    // TODO: Load pre-recorded demo game
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          AI Poker Model Evaluation
        </h1>
        
        {!gameState && (
          <div className="flex flex-col items-center gap-8">
            <GameControls
              mode={mode}
              onModeChange={setMode}
              onStart={startGame}
              isPlaying={isPlaying}
            />
          </div>
        )}

        {gameState && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main game area */}
            <div className="lg:col-span-2 space-y-6">
              <PokerTable gameState={gameState} />
              
              {gameState.phase === 'finished' && (
                <div className="text-center">
                  <button
                    onClick={() => {
                      setGameState(null);
                      setIsReplaying(false);
                      setReplayActionIndex(0);
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                  >
                    New Game
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Leaderboard gameState={gameState} />
              <ActionLog 
                actions={gameState.actionHistory} 
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

        {selectedAction && (
          <ReasoningModal
            isOpen={true}
            onClose={() => setSelectedAction(null)}
            reasoning={reasoning}
            model={selectedAction.model}
            action={selectedAction.action}
          />
        )}
      </div>
    </div>
  );
}
