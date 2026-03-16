
import React from 'react';
import { GameLineup, Player, Position } from '../types';
import { ALL_PLAYING_POSITIONS, POSITION_LABELS, INFIELD_POSITIONS } from '../constants';
import { motion } from 'motion/react';
import { PlayerSummary } from './PlayerSummary';

import { Share2, Printer, Check, ArrowDownToLine, UserPlus2, Lock, Unlock } from 'lucide-react';
import { useState } from 'react';

interface LineupTableProps {
  lineup: GameLineup;
  players: Player[];
  onUpdateLineup: (lineup: GameLineup) => void;
}

export const LineupTable: React.FC<LineupTableProps> = ({ lineup, players, onUpdateLineup }) => {
  const [copied, setCopied] = useState(false);
  const [selectedBenchPlayer, setSelectedBenchPlayer] = useState<{ inningIndex: number, playerId: string } | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const data = btoa(unescape(encodeURIComponent(JSON.stringify({ players, lineup }))));
    const url = `${window.location.origin}${window.location.pathname}?data=${data}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleLock = (inningIndex: number, pos: Position) => {
    const newLineup = [...lineup];
    const inning = { ...newLineup[inningIndex] };
    const lockedPositions = [...(inning.lockedPositions || [])];
    
    if (lockedPositions.includes(pos)) {
      inning.lockedPositions = lockedPositions.filter(p => p !== pos);
    } else {
      inning.lockedPositions = [...lockedPositions, pos];
    }
    
    newLineup[inningIndex] = inning;
    onUpdateLineup(newLineup);
  };

  const moveToBench = (inningIndex: number, pos: Position) => {
    const newLineup = [...lineup];
    const inning = { ...newLineup[inningIndex] };
    
    // Remove from locked if it was locked
    if (inning.lockedPositions) {
      inning.lockedPositions = inning.lockedPositions.filter(p => p !== pos);
    }
    
    inning.assignments = {
      ...inning.assignments,
      [pos]: null
    };
    
    newLineup[inningIndex] = inning;
    onUpdateLineup(newLineup);
  };

  const assignFromBench = (inningIndex: number, pos: Position) => {
    if (!selectedBenchPlayer || selectedBenchPlayer.inningIndex !== inningIndex) return;
    
    const newLineup = [...lineup];
    const inning = { ...newLineup[inningIndex] };
    
    inning.assignments = {
      ...inning.assignments,
      [pos]: selectedBenchPlayer.playerId
    };
    
    newLineup[inningIndex] = inning;
    onUpdateLineup(newLineup);
    setSelectedBenchPlayer(null);
  };

  const getPlayerName = (id: string | null) => {
    if (!id) return null;
    return players.find(p => p.id === id)?.name || null;
  };

  const getBenchPlayers = (inningIndex: number) => {
    const assignedIds = new Set(Object.values(lineup[inningIndex].assignments).filter(id => id !== null));
    return players.filter(p => !assignedIds.has(p.id));
  };

  return (
    <div className="space-y-8">
      <div className="w-full overflow-x-auto bg-white rounded-2xl shadow-sm border border-black/5 p-6 relative">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-zinc-900">Game Lineup</h2>
          <div className="flex items-center gap-2 no-print">
            {selectedBenchPlayer && (
              <div className="mr-4 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-700 animate-pulse">
                Select a position for {players.find(p => p.id === selectedBenchPlayer.playerId)?.name}
              </div>
            )}
            <button
              onClick={handleShare}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                copied 
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                  : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
              }`}
            >
              {copied ? <Check size={16} /> : <Share2 size={16} />}
              {copied ? 'Copied Link' : 'Share'}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-200 rounded-lg text-sm font-medium transition-all"
            >
              <Printer size={16} />
              Print
            </button>
          </div>
        </div>
        
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-zinc-200">
              <th className="text-left py-4 px-4 font-serif italic text-zinc-500 text-sm uppercase tracking-widest">Position</th>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <th key={i} className="py-4 px-4 text-center font-serif italic text-zinc-500 text-sm uppercase tracking-widest">
                  Inning {i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_PLAYING_POSITIONS.map((pos) => (
              <tr key={pos} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors group">
                <td className="py-3 px-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-zinc-900 text-sm">{pos}</span>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-tighter">{POSITION_LABELS[pos]}</span>
                  </div>
                </td>
                {lineup.map((inning, idx) => {
                  const playerId = inning.assignments[pos];
                  const playerName = getPlayerName(playerId);
                  const isAvailableForAssignment = !playerId && selectedBenchPlayer?.inningIndex === idx;
                  const isLocked = inning.lockedPositions?.includes(pos);

                  return (
                    <td key={idx} className="py-3 px-4 text-center relative group/cell">
                      {playerName ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => toggleLock(idx, pos)}
                            className={`no-print p-1 rounded transition-all ${
                              isLocked 
                                ? 'text-amber-600 bg-amber-50 opacity-100' 
                                : 'text-zinc-300 opacity-0 group-hover/cell:opacity-100 hover:text-zinc-500 hover:bg-zinc-100'
                            }`}
                            title={isLocked ? "Unlock Position" : "Lock Position"}
                          >
                            {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                          </button>
                          <motion.span 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={`text-sm font-medium ${isLocked ? 'underline decoration-amber-200 underline-offset-4' : ''} ${INFIELD_POSITIONS.includes(pos) ? 'text-emerald-700' : 'text-blue-700'}`}
                          >
                            {playerName}
                          </motion.span>
                          <button
                            onClick={() => moveToBench(idx, pos)}
                            className="no-print opacity-0 group-hover/cell:opacity-100 p-1 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all"
                            title="Move to Bench"
                          >
                            <ArrowDownToLine size={12} />
                          </button>
                        </div>
                      ) : isAvailableForAssignment ? (
                        <button
                          onClick={() => assignFromBench(idx, pos)}
                          className="no-print mx-auto flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all border border-emerald-200 shadow-sm"
                          title={`Assign ${players.find(p => p.id === selectedBenchPlayer?.playerId)?.name}`}
                        >
                          <UserPlus2 size={14} />
                        </button>
                      ) : (
                        <span className="text-sm text-zinc-300">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-zinc-50">
              <td className="py-4 px-4 font-bold text-zinc-500 text-xs uppercase tracking-widest">Bench</td>
              {lineup.map((_, idx) => (
                <td key={idx} className="py-4 px-4 text-center align-top">
                  <div className="flex flex-col gap-1.5">
                    {getBenchPlayers(idx).map(p => {
                      const isSelected = selectedBenchPlayer?.inningIndex === idx && selectedBenchPlayer?.playerId === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setSelectedBenchPlayer(isSelected ? null : { inningIndex: idx, playerId: p.id })}
                          className={`no-print text-xs font-medium px-2 py-1 rounded-md transition-all border ${
                            isSelected 
                              ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm scale-105' 
                              : 'text-zinc-500 hover:bg-zinc-200 border-transparent'
                          }`}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                    {getBenchPlayers(idx).length === 0 && <span className="text-xs text-zinc-300">-</span>}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wider mb-2">Infield Legend</h3>
            <p className="text-xs text-emerald-600">P, C, 1B, 2B, 3B, SS are highlighted in green. The algorithm balances these with outfield time.</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-2">Outfield Legend</h3>
            <p className="text-xs text-blue-600">LF, LC, RC, RF are highlighted in blue. Every player gets a fair share of outfield play.</p>
          </div>
        </div>
      </div>

      <PlayerSummary lineup={lineup} players={players} />
      
      <div className="hidden print:block text-center text-[10px] text-zinc-400 mt-12">
        Generated by Lineup Pro • Little League Edition
      </div>
    </div>
  );
};
