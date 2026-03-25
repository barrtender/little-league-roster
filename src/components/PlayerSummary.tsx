
import React from 'react';
import { GameLineup, Player } from '../types';
import { INFIELD_POSITIONS } from '../constants';
import { motion } from 'motion/react';

interface PlayerSummaryProps {
  lineup: GameLineup;
  players: Player[];
}

export const PlayerSummary: React.FC<PlayerSummaryProps> = ({ lineup, players }) => {
  const stats = [...players]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(player => {
      let pitcher = 0;
      let catcher = 0;
      let infield = 0;
      let outfield = 0;
      let bench = 0;

      lineup.forEach(inning => {
        let assigned = false;
        Object.entries(inning.assignments).forEach(([pos, playerId]) => {
          if (playerId === player.id) {
            assigned = true;
            if (pos === 'P') pitcher++;
            if (pos === 'C') catcher++;
            if (INFIELD_POSITIONS.includes(pos as any)) {
              infield++;
            } else if (pos !== 'Bench') {
              outfield++;
            }
          }
        });
        if (!assigned) bench++;
      });

      return {
        id: player.id,
        name: player.name,
        pitcher,
        catcher,
        infield,
        outfield,
        bench,
        isAbsent: !!player.isAbsent
      };
    });

  return (
    <div className="mt-12 bg-white rounded-2xl shadow-sm border border-black/5 p-6">
      <h2 className="text-2xl font-semibold mb-6 text-zinc-900">Player Participation Summary</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-zinc-200">
              <th className="text-left py-4 px-4 font-serif italic text-zinc-500 text-sm uppercase tracking-widest">Player</th>
              <th className="py-4 px-4 text-center font-serif italic text-zinc-500 text-sm uppercase tracking-widest">P</th>
              <th className="py-4 px-4 text-center font-serif italic text-zinc-500 text-sm uppercase tracking-widest">C</th>
              <th className="py-4 px-4 text-center font-serif italic text-zinc-500 text-sm uppercase tracking-widest">Infield</th>
              <th className="py-4 px-4 text-center font-serif italic text-zinc-500 text-sm uppercase tracking-widest">Outfield</th>
              <th className="py-4 px-4 text-center font-serif italic text-zinc-500 text-sm uppercase tracking-widest">Bench</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat, idx) => (
              <motion.tr 
                key={stat.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
              >
                <td className="py-3 px-4 font-medium text-zinc-900">
                  {stat.name}
                  {stat.isAbsent && (
                    <span className="ml-2 text-[10px] text-amber-600 font-bold uppercase tracking-tighter">
                      Absent
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${stat.pitcher > 0 ? 'bg-amber-100 text-amber-700' : 'text-zinc-300'}`}>
                    {stat.pitcher}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${stat.catcher > 0 ? 'bg-blue-100 text-blue-700' : 'text-zinc-300'}`}>
                    {stat.catcher}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${stat.infield > 0 ? 'bg-emerald-100 text-emerald-700' : 'text-zinc-300'}`}>
                    {stat.infield}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${stat.outfield > 0 ? 'bg-indigo-100 text-indigo-700' : 'text-zinc-300'}`}>
                    {stat.outfield}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${stat.bench > 0 ? 'bg-zinc-100 text-zinc-500' : 'text-zinc-200'}`}>
                    {stat.bench}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 text-[10px] text-zinc-400 uppercase tracking-widest text-center">
        Note: P and C are also counted as Infield positions.
      </div>
    </div>
  );
};
