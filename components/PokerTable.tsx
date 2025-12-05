'use client';

import type { GameState } from '@/lib/types';
import PlayerCard from './PlayerCard';
import CommunityCards from './CommunityCards';

interface PokerTableProps {
  gameState: GameState;
}

export default function PokerTable({ gameState }: PokerTableProps) {
  const activePlayers = gameState.players.filter(p => p.isActive);
  
  // Position players around the table (5 positions)
  const positions = [
    { top: '10%', left: '50%', transform: 'translateX(-50%)' }, // Top center
    { top: '25%', left: '10%', transform: 'translateX(-50%)' }, // Left
    { top: '75%', left: '10%', transform: 'translateX(-50%)' }, // Bottom left
    { top: '75%', left: '90%', transform: 'translateX(-50%)' }, // Bottom right
    { top: '25%', left: '90%', transform: 'translateX(-50%)' }, // Right
  ];

  return (
    <div className="relative w-full h-[600px] bg-gradient-to-b from-green-900 to-green-950 rounded-full border-8 border-amber-800 shadow-2xl">
      {/* Felt texture overlay */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.1),transparent)]" />
      
      {/* Community cards area */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
        <CommunityCards cards={gameState.communityCards} phase={gameState.phase} />
      </div>

      {/* Pot display */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-20 z-20">
        <div className="bg-black/80 text-white px-4 py-2 rounded-lg border-2 border-amber-500">
          <div className="text-sm text-amber-300">Pot</div>
          <div className="text-2xl font-bold">{gameState.pot}</div>
        </div>
      </div>

      {/* Player positions */}
      {gameState.players.map((player, index) => {
        if (!player.isActive) return null;
        const position = positions[index % positions.length];
        return (
          <div
            key={player.id}
            className="absolute z-20"
            style={position}
          >
            <PlayerCard
              player={player}
              isCurrentPlayer={index === gameState.currentPlayerIndex}
              isDealer={index === gameState.dealerIndex}
              isSmallBlind={index === gameState.smallBlindIndex}
              isBigBlind={index === gameState.bigBlindIndex}
            />
          </div>
        );
      })}
    </div>
  );
}

