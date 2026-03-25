
import React from 'react';
import { GameLineup, Player, Position } from '../types';
import { getAllPlayingPositions, POSITION_LABELS, INFIELD_POSITIONS, getOutfieldPositions } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { PlayerSummary } from './PlayerSummary';

import { Share2, Printer, Check, ArrowDownToLine, UserPlus2, Lock, Unlock, ArrowLeftRight, X as CloseIcon, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface LineupTableProps {
  lineup: GameLineup;
  players: Player[];
  onUpdateLineup: (lineup: GameLineup) => void;
  outfieldCount?: 3 | 4;
}

export const LineupTable: React.FC<LineupTableProps> = ({ lineup, players, onUpdateLineup, outfieldCount = 4 }) => {
  const [copied, setCopied] = useState(false);
  const [selectedBenchPlayer, setSelectedBenchPlayer] = useState<{ inningIndex: number, playerId: string } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ inningIndex: number, pos: Position } | null>(null);

  const playingPositions = getAllPlayingPositions(outfieldCount);
  const outfieldPositions = getOutfieldPositions(outfieldCount);

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
    setSelectedCell(null);
  };

  const moveToBench = (inningIndex: number, pos: Position) => {
    const newLineup = [...lineup];
    const inning = { ...newLineup[inningIndex] };
    
    if (inning.lockedPositions) {
      inning.lockedPositions = inning.lockedPositions.filter(p => p !== pos);
    }
    
    inning.assignments = {
      ...inning.assignments,
      [pos]: null
    };
    
    newLineup[inningIndex] = inning;
    onUpdateLineup(newLineup);
    setSelectedCell(null);
  };

  const swapOrMovePlayers = (inningIndex: number, fromPos: Position, toPos: Position) => {
    const newLineup = [...lineup];
    const inning = { ...newLineup[inningIndex] };
    const assignments = { ...inning.assignments };
    
    const temp = assignments[fromPos];
    assignments[fromPos] = assignments[toPos];
    assignments[toPos] = temp;
    
    inning.assignments = assignments;
    
    // If we move to an empty spot, we might want to move the lock too if it was locked
    if (inning.lockedPositions) {
      const fromLocked = inning.lockedPositions.includes(fromPos);
      const toLocked = inning.lockedPositions.includes(toPos);
      
      let newLocked = inning.lockedPositions.filter(p => p !== fromPos && p !== toPos);
      if (fromLocked) newLocked.push(toPos);
      if (toLocked) newLocked.push(fromPos);
      inning.lockedPositions = newLocked;
    }
    
    newLineup[inningIndex] = inning;
    onUpdateLineup(newLineup);
    setSelectedCell(null);
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
        <div className="mb-6 no-print">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-2xl font-semibold text-zinc-900">Game Lineup</h2>
            <div className="flex items-center gap-2">
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

          <div className="min-h-[40px] flex items-center">
            <AnimatePresence>
              {(selectedBenchPlayer || selectedCell) && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs sm:text-sm font-medium text-amber-700 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 animate-pulse">
                    <div className="w-2 h-2 bg-amber-400 rounded-full" />
                    <span>
                      {selectedBenchPlayer ? (
                        <>Select a position for <span className="font-bold">{players.find(p => p.id === selectedBenchPlayer.playerId)?.name}</span></>
                      ) : (
                        <>Select a position or bench player to swap/move <span className="font-bold">{players.find(p => p.id === lineup[selectedCell!.inningIndex].assignments[selectedCell!.pos])?.name}</span></>
                      )}
                    </span>
                  </div>
                  <button 
                    onClick={() => { setSelectedBenchPlayer(null); setSelectedCell(null); }} 
                    className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors shrink-0"
                  >
                    <CloseIcon size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        <div className="print:block hidden mb-6">
          <h2 className="text-2xl font-semibold text-zinc-900">Game Lineup</h2>
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
            {playingPositions.map((pos) => (
              <tr key={pos} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors group">
                <td className="py-3 px-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-zinc-900 text-sm">{pos}</span>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-tighter">{POSITION_LABELS[pos]}</span>
                  </div>
                </td>
                {lineup.map((inning, idx) => {
                  const playerId = inning.assignments[pos];
                  const player = players.find(p => p.id === playerId);
                  const playerName = player?.name || null;
                  const isAbsent = !!player?.isAbsent;
                  const isAvailableForAssignment = !playerId && (selectedBenchPlayer?.inningIndex === idx || selectedCell?.inningIndex === idx);
                  const isLocked = inning.lockedPositions?.includes(pos);
                  const isSelected = selectedCell?.inningIndex === idx && selectedCell?.pos === pos;

                  const handleCellClick = () => {
                    if (selectedBenchPlayer && selectedBenchPlayer.inningIndex === idx) {
                      // If a bench player is selected, assign them to this position (swapping if occupied)
                      assignFromBench(idx, pos);
                    } else if (selectedCell && selectedCell.inningIndex === idx) {
                      // If a field position is selected, swap/move to this position
                      if (selectedCell.pos === pos) {
                        setSelectedCell(null);
                      } else {
                        swapOrMovePlayers(idx, selectedCell.pos, pos);
                      }
                    } else if (playerId) {
                      // No selection yet, select this occupied position
                      setSelectedCell({ inningIndex: idx, pos });
                      setSelectedBenchPlayer(null);
                    }
                  };

                  return (
                    <td key={idx} className="p-0 text-center relative border-r border-zinc-100 last:border-r-0">
                      <div 
                        onClick={handleCellClick}
                        className={`w-full h-full min-h-[60px] flex flex-col items-center justify-center p-2 cursor-pointer transition-all ${
                          isSelected ? 'bg-amber-50 ring-2 ring-inset ring-amber-400 z-10' : 
                          isAbsent ? 'bg-amber-50/50 hover:bg-amber-100/50' :
                          isAvailableForAssignment ? 'bg-emerald-50 hover:bg-emerald-100' : 
                          'hover:bg-zinc-50'
                        }`}
                      >
                        {playerName ? (
                          <>
                            <div className="flex flex-col items-center justify-center gap-1 mb-1">
                              <div className="flex items-center gap-1">
                                {isLocked && <Lock size={10} className="text-amber-600" />}
                                {isAbsent && <AlertTriangle size={10} className="text-amber-600" />}
                                <motion.span 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className={`text-sm font-medium leading-tight ${
                                    isAbsent ? 'text-amber-700 line-through opacity-60' :
                                    isLocked ? 'text-amber-700' : 
                                    INFIELD_POSITIONS.includes(pos) ? 'text-emerald-700' : 'text-blue-700'
                                  }`}
                                >
                                  {playerName}
                                </motion.span>
                              </div>
                              {isAbsent && (
                                <span className="text-[8px] font-bold text-amber-600 uppercase tracking-tighter leading-none">
                                  Absent
                                </span>
                              )}
                            </div>
                            
                            {isSelected && (
                              <div className="flex items-center gap-1 no-print mt-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleLock(idx, pos); }}
                                  className={`p-1.5 rounded-md transition-all ${isLocked ? 'bg-amber-100 text-amber-700' : 'bg-white text-zinc-400 border border-zinc-200'}`}
                                  title={isLocked ? "Unlock" : "Lock"}
                                >
                                  {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); moveToBench(idx, pos); }}
                                  className="p-1.5 bg-white text-zinc-400 border border-zinc-200 rounded-md hover:text-amber-600 hover:bg-amber-50 transition-all"
                                  title="Bench"
                                >
                                  <ArrowDownToLine size={14} />
                                </button>
                              </div>
                            )}
                          </>
                        ) : isAvailableForAssignment ? (
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
                            <UserPlus2 size={14} />
                          </div>
                        ) : (
                          <span className="text-sm text-zinc-300">-</span>
                        )}
                      </div>
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
                      const isSelected = (selectedBenchPlayer?.inningIndex === idx && selectedBenchPlayer?.playerId === p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedBenchPlayer(null);
                            } else if (selectedCell && selectedCell.inningIndex === idx) {
                              // One-click swap: Move selected defensive player to bench, 
                              // and move this bench player to that position
                              const pos = selectedCell.pos;
                              const newLineup = [...lineup];
                              const inning = { ...newLineup[idx] };
                              
                              inning.assignments = {
                                ...inning.assignments,
                                [pos]: p.id
                              };
                              
                              newLineup[idx] = inning;
                              onUpdateLineup(newLineup);
                              setSelectedCell(null);
                            } else {
                              setSelectedBenchPlayer({ inningIndex: idx, playerId: p.id });
                              setSelectedCell(null);
                            }
                          }}
                          className={`no-print text-xs font-medium px-2 py-1 rounded-md transition-all border ${
                            isSelected 
                              ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm scale-105' 
                              : p.isAbsent
                                ? 'text-amber-600/60 hover:bg-amber-50 border-transparent italic line-through'
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
            <p className="text-xs text-blue-600">{outfieldPositions.join(', ')} are highlighted in blue. Every player gets a fair share of outfield play.</p>
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
