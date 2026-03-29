
import { Player, GameLineup, Position, InningAssignment } from '../types';

const POSITIONS_ORDER: Position[] = [
  'P', 'C', '1B', '2B', '3B', 'SS', 
  'LF', 'LC', 'RC', 'RF', 'CF', 'Bench'
];

/**
 * Compact format:
 * [
 *   version (number),
 *   outfieldCount (number),
 *   players: [
 *     [name (string), canPitch (0/1), canCatch (0/1), isAbsent (0/1)]
 *   ],
 *   lineup: [
 *     [p0_idx, p1_idx, ...] // Indices into players array for POSITIONS_ORDER
 *   ]
 * ]
 */
type CompactFormat = [
  number,
  number,
  [string, number, number, number][],
  (number | null)[][]
];

export function compressLineup(players: Player[], lineup: GameLineup, outfieldCount: number): string {
  const playerMap = new Map<string, number>();
  const pData: [string, number, number, number][] = players.map((p, i) => {
    playerMap.set(p.id, i);
    return [p.name, p.canPitch ? 1 : 0, p.canCatch ? 1 : 0, p.isAbsent ? 1 : 0];
  });

  const lData: (number | null)[][] = lineup.map(inning => {
    return POSITIONS_ORDER.map(pos => {
      const playerId = inning.assignments[pos];
      if (!playerId) return null;
      return playerMap.has(playerId) ? playerMap.get(playerId)! : null;
    });
  });

  const data: CompactFormat = [1, outfieldCount, pData, lData];
  
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

export function decompressLineup(compressed: string): { players: Player[], lineup: GameLineup, outfieldCount: number } | null {
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(compressed)))) as unknown[];
    
    // Version 1: Full assignment format
    if (data[0] === 1) {
      const [version, outfieldCount, pData, lData] = data as CompactFormat;
      const players: Player[] = pData.map((p, i) => ({
        id: `p-${i}-${Math.random().toString(36).substr(2, 9)}`,
        name: p[0],
        canPitch: p[1] === 1,
        canCatch: p[2] === 1,
        isAbsent: p[3] === 1
      }));

      const lineup: GameLineup = lData.map((inning, i) => {
        const assignments: Partial<Record<Position, string | null>> = {
          'P': null, 'C': null, '1B': null, '2B': null, '3B': null, 'SS': null,
          'LF': null, 'LC': null, 'RC': null, 'RF': null, 'CF': null, 'Bench': null
        };

        POSITIONS_ORDER.forEach((pos, posIdx) => {
          const playerIdx = inning[posIdx];
          assignments[pos] = playerIdx !== null ? players[playerIdx].id : null;
        });
        
        return {
          inning: i + 1,
          assignments: assignments as Record<Position, string | null>,
          lockedPositions: [],
          lockedBenchPlayerIds: []
        };
      });

      return { players, lineup, outfieldCount };
    }

    return null;
  } catch (e) {
    console.error('Failed to decompress lineup', e);
    return null;
  }
}
