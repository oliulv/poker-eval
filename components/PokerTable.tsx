'use client';

import type { GameState } from '@/lib/types';
import PlayerCard from './PlayerCard';
import CommunityCards from './CommunityCards';

interface PokerTableProps {
  gameState: GameState;
}

export default function PokerTable({ gameState }: PokerTableProps) {
  // Position players around the table (5 positions)
  const positions = [
    { top: '8%', left: '50%', transform: 'translate(-50%, -50%)' }, // Top center
    { top: '32%', left: '16%', transform: 'translate(-50%, -50%)' }, // Left
    { top: '82%', left: '30%', transform: 'translate(-50%, -50%)' }, // Bottom left
    { top: '82%', left: '70%', transform: 'translate(-50%, -50%)' }, // Bottom right
    { top: '32%', left: '84%', transform: 'translate(-50%, -50%)' }, // Right
  ];

  return (
    <div className="relative w-full max-w-[1100px] aspect-[16/9] max-h-[72vh] mx-auto my-8 sm:my-12 overflow-visible px-2">
      {/* Table Surface */}
      <div className="absolute inset-[10%] rounded-[120px] border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-inner">
        {/* Felt texture/pattern could go here */}
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        {/* Community Cards Area */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-4">
          <div className="bg-white dark:bg-black px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="text-xs text-gray-500 uppercase tracking-wider font-mono text-center mb-1">Pot Size</div>
            <div className="text-xl font-bold text-center font-mono">${gameState.pot}</div>
          </div>
          <CommunityCards cards={gameState.communityCards} phase={gameState.phase} />
        </div>
      </div>

      {/* Players */}
      {gameState.players.map((player, index) => {
        const position = positions[index % positions.length];
        return (
          <div
            key={player.id}
            className="absolute z-20 transition-all duration-500 ease-in-out"
            style={position}
          >
            <PlayerCard
              player={player}
              isCurrentPlayer={index === gameState.currentPlayerIndex}
              isDealer={index === gameState.dealerIndex}
              isSmallBlind={index === gameState.smallBlindIndex}
              isBigBlind={index === gameState.bigBlindIndex}
              mode={gameState.mode}
            />
          </div>
        );
      })}
    </div>
  );
}
