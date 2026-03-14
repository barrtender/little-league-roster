
import React, { useState, useRef } from 'react';
import { Player } from '../types';
import { UserPlus, Trash2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PlayerInputProps {
  players: Player[];
  onAddPlayer: (player: Player) => void;
  onRemovePlayer: (id: string) => void;
  onUpdatePlayer: (player: Player) => void;
}

export const PlayerInput: React.FC<PlayerInputProps> = ({ players, onAddPlayer, onRemovePlayer, onUpdatePlayer }) => {
  const [newName, setNewName] = useState('');
  const [newCanPitch, setNewCanPitch] = useState(false);
  const [newCanCatch, setNewCanCatch] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddPlayer({
      id: crypto.randomUUID(),
      name: newName.trim(),
      canPitch: newCanPitch,
      canCatch: newCanCatch,
    });
    setNewName('');
    setNewCanPitch(false);
    setNewCanCatch(false);
    
    // Return focus to input
    inputRef.current?.focus();
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-black/5">
      <h2 className="text-2xl font-semibold mb-6 text-zinc-900">Roster Management</h2>
      
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 mb-8 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
        <div className="flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder="Player Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            autoFocus
          />
        </div>
        <div className="flex items-center gap-4 px-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={newCanPitch}
              onChange={(e) => setNewCanPitch(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">Pitcher</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={newCanCatch}
              onChange={(e) => setNewCanCatch(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">Catcher</span>
          </label>
        </div>
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <UserPlus size={18} />
          Add
        </button>
      </form>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {[...players].sort((a, b) => a.name.localeCompare(b.name)).map((player) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-xl hover:border-emerald-200 hover:shadow-sm transition-all group"
            >
              <div className="flex-1">
                <span className="font-medium text-zinc-900">{player.name}</span>
              </div>
              <div className="flex items-center gap-6 mr-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">P</span>
                  {player.canPitch ? <Check size={16} className="text-emerald-600" /> : <X size={16} className="text-zinc-300" />}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">C</span>
                  {player.canCatch ? <Check size={16} className="text-emerald-600" /> : <X size={16} className="text-zinc-300" />}
                </div>
              </div>
              <button
                onClick={() => onRemovePlayer(player.id)}
                className="text-zinc-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all"
              >
                <Trash2 size={18} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {players.length === 0 && (
          <div className="text-center py-12 text-zinc-400 italic">
            No players added yet. Add your roster to get started.
          </div>
        )}
      </div>
    </div>
  );
};
