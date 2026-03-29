
import { describe, it, expect } from 'vitest';
import { compressLineup, decompressLineup } from './sharing';
import { Player, GameLineup } from '../types';

describe('sharing utils', () => {
  const players: Player[] = [
    { id: '1', name: 'Alice', canPitch: true, canCatch: false, isAbsent: false },
    { id: '2', name: 'Bob', canPitch: false, canCatch: true, isAbsent: false },
    { id: '3', name: 'Charlie', canPitch: true, canCatch: true, isAbsent: true },
  ];

  const lineup: GameLineup = [
    {
      inning: 1,
      assignments: {
        P: '1', C: '2', '1B': '3', '2B': null, '3B': null, SS: null,
        LF: null, LC: null, RC: null, RF: null, CF: null, Bench: null
      },
      lockedPositions: ['P'],
      lockedBenchPlayerIds: ['3']
    }
  ];

  it('compresses and decompresses correctly', () => {
    const outfieldCount = 4;
    const compressed = compressLineup(players, lineup, outfieldCount);
    const decompressed = decompressLineup(compressed);

    expect(decompressed).not.toBeNull();
    if (decompressed) {
      expect(decompressed.outfieldCount).toBe(outfieldCount);
      expect(decompressed.players).toHaveLength(players.length);
      expect(decompressed.players[0].name).toBe(players[0].name);
      expect(decompressed.players[0].canPitch).toBe(players[0].canPitch);
      expect(decompressed.players[0].canCatch).toBe(players[0].canCatch);
      expect(decompressed.players[2].isAbsent).toBe(players[2].isAbsent);

      expect(decompressed.lineup).toHaveLength(lineup.length);
      expect(decompressed.lineup[0].assignments.P).toBe(decompressed.players[0].id);
      expect(decompressed.lineup[0].assignments.C).toBe(decompressed.players[1].id);
      expect(decompressed.lineup[0].assignments['1B']).toBe(decompressed.players[2].id);
      
      // Roster lock status should NOT be preserved in this version
      expect(decompressed.lineup[0].lockedPositions).toHaveLength(0);
      expect(decompressed.lineup[0].lockedBenchPlayerIds).toHaveLength(0);
    }
  });

  it('generates much shorter strings than raw JSON', () => {
    const outfieldCount = 4;
    const rawJson = JSON.stringify({ players, lineup, outfieldCount });
    const rawBase64 = btoa(unescape(encodeURIComponent(rawJson)));
    const compressed = compressLineup(players, lineup, outfieldCount);

    console.log('Raw Base64 length:', rawBase64.length);
    console.log('Compressed length:', compressed.length);
    
    expect(compressed.length).toBeLessThan(rawBase64.length);
  });
});
