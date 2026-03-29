import { useState, useEffect } from 'react';
import { Player, GameLineup, Position } from './types';
import { PlayerInput } from './components/PlayerInput';
import { LineupTable } from './components/LineupTable';
import { generateLineup } from './utils/lineupGenerator';
import { getSampleRoster } from './utils/sampleData';
import { decompressLineup } from './utils/sharing';
import { ClipboardList, Users, RefreshCw, ChevronLeft, Beaker, Github } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [lineup, setLineup] = useState<GameLineup | null>(null);
  const [view, setView] = useState<'input' | 'output'>('input');
  const [outfieldCount, setOutfieldCount] = useState<3 | 4>(4);

  // Load from local storage or URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('data');

    if (sharedData) {
      const decoded = decompressLineup(sharedData);
      if (decoded) {
        setPlayers(decoded.players);
        setOutfieldCount(decoded.outfieldCount as 3 | 4);
        setLineup(decoded.lineup);
        setView('output');
        // Clear the URL parameter after loading to avoid re-loading on refresh
        window.history.replaceState({}, '', window.location.pathname);
      }
    } else {
      const saved = localStorage.getItem('baseball-roster');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setPlayers(parsed.players || []);
          setOutfieldCount(parsed.outfieldCount || 4);
        } catch (e) {
          console.error('Failed to load roster', e);
        }
      }
    }
  }, []);

  // Save to local storage when players or config change
  useEffect(() => {
    localStorage.setItem('baseball-roster', JSON.stringify({ players, outfieldCount }));
  }, [players, outfieldCount]);

  const handleAddPlayer = (player: Player) => {
    setPlayers([...players, player]);
  };

  const handleRemovePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const handleUpdatePlayer = (updated: Player) => {
    setPlayers(players.map(p => p.id === updated.id ? updated : p));
  };

  const activePlayers = players.filter(p => !p.isAbsent);
  const minPlayersNeeded = 6 + outfieldCount + 1;

  const handleGenerate = () => {
    if (activePlayers.length < minPlayersNeeded) {
      alert(`You need at least ${minPlayersNeeded} active players to generate a full lineup. You currently have ${activePlayers.length} active.`);
      return;
    }
    const newLineup = generateLineup(players, undefined, undefined, outfieldCount);
    setLineup(newLineup);
    setView('output');
  };

  const handleRegenerate = () => {
    if (!lineup) return;
    if (activePlayers.length < minPlayersNeeded) {
      alert(`You need at least ${minPlayersNeeded} active players to generate a full lineup. You currently have ${activePlayers.length} active.`);
      return;
    }
    const newLineup = generateLineup(players, undefined, lineup, outfieldCount);
    setLineup(newLineup);
  };

  const handleUpdateLineup = (newLineup: GameLineup) => {
    setLineup(newLineup);
  };

  const handleOutfieldCountChange = (newCount: 3 | 4) => {
    setOutfieldCount(newCount);
    
    if (lineup) {
      const newLineup = lineup.map(inning => {
        const newAssignments = { ...inning.assignments };
        let newLockedPositions = inning.lockedPositions ? [...inning.lockedPositions] : [];
        
        const positionsToClear: Position[] = newCount === 3 ? ['LC', 'RC'] : ['CF'];
        
        positionsToClear.forEach(pos => {
          newAssignments[pos] = null;
          newLockedPositions = newLockedPositions.filter(p => p !== pos);
        });
        
        return {
          ...inning,
          assignments: newAssignments,
          lockedPositions: newLockedPositions
        };
      });
      setLineup(newLineup);
    }
  };

  const handleLoadSample = () => {
    if (players.length > 0 && !confirm('This will replace your current roster. Continue?')) {
      return;
    }
    setPlayers(getSampleRoster());
  };

  return (
    <div className="min-h-screen bg-[#F5F5F4] text-zinc-900 font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <ClipboardList size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Lineup Pro</h1>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Little League Edition</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {view === 'input' && (
              <button
                onClick={handleLoadSample}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all border border-transparent hover:border-emerald-100"
              >
                <Beaker size={18} />
                <span className="hidden sm:inline">Sample Roster</span>
              </button>
            )}
            {view === 'output' && (
              <button
                onClick={() => setView('input')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all"
              >
                <ChevronLeft size={18} />
                Back to Roster
              </button>
            )}
            {players.length >= 10 && (
              <button
                onClick={view === 'input' ? handleGenerate : handleRegenerate}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-md shadow-emerald-100 transition-all active:scale-95"
              >
                {view === 'input' ? <Users size={18} /> : <RefreshCw size={18} />}
                {view === 'input' ? 'Generate Lineup' : 'Regenerate'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">
          {view === 'input' ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-8 text-center">
                <h2 className="text-4xl font-serif italic text-zinc-900 mb-2">Build Your Roster</h2>
                <p className="text-zinc-500 max-w-md mx-auto">
                  Add your players and specify who can pitch or catch. We'll handle the rotation logic.
                </p>
              </div>

              <div className="mb-8 flex flex-col items-center gap-3">
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Outfield Configuration</span>
                <div className="flex items-center bg-zinc-100 rounded-xl p-1 border border-zinc-200 shadow-sm">
                  <button
                    onClick={() => handleOutfieldCountChange(3)}
                    className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                      outfieldCount === 3 
                        ? 'bg-white text-emerald-700 shadow-md' 
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    3 Outfielders
                  </button>
                  <button
                    onClick={() => handleOutfieldCountChange(4)}
                    className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                      outfieldCount === 4 
                        ? 'bg-white text-emerald-700 shadow-md' 
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    4 Outfielders
                  </button>
                </div>
              </div>

              <PlayerInput
                players={players}
                onAddPlayer={handleAddPlayer}
                onRemovePlayer={handleRemovePlayer}
                onUpdatePlayer={handleUpdatePlayer}
              />
            </motion.div>
          ) : (
            <motion.div
              key="output"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {lineup && (
                <div className="mb-8 flex flex-col items-center gap-3 no-print">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Outfield Configuration</span>
                  <div className="flex items-center bg-zinc-100 rounded-xl p-1 border border-zinc-200 shadow-sm">
                    <button
                      onClick={() => handleOutfieldCountChange(3)}
                      className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                        outfieldCount === 3 
                          ? 'bg-white text-emerald-700 shadow-md' 
                          : 'text-zinc-500 hover:text-zinc-700'
                      }`}
                    >
                      3 Outfielders
                    </button>
                    <button
                      onClick={() => handleOutfieldCountChange(4)}
                      className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                        outfieldCount === 4 
                          ? 'bg-white text-emerald-700 shadow-md' 
                          : 'text-zinc-500 hover:text-zinc-700'
                      }`}
                    >
                      4 Outfielders
                    </button>
                  </div>
                </div>
              )}
              {lineup && (
                <LineupTable 
                  lineup={lineup} 
                  players={players} 
                  onUpdateLineup={handleUpdateLineup} 
                  outfieldCount={outfieldCount}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer / Stats Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-zinc-200 py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-medium text-zinc-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Users size={14} className="text-emerald-600" />
              {activePlayers.length} Active / {players.length} Total
            </span>
            <span className="w-px h-3 bg-zinc-200" />
            <span>6 Innings</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block">
              Balanced Infield/Outfield • Pitching Limits • Fair Bench Rotation
            </div>
            <span className="hidden sm:block w-px h-3 bg-zinc-200" />
            <a 
              href="https://github.com/barrtender/little-league-roster" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors"
            >
              <Github size={14} />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
