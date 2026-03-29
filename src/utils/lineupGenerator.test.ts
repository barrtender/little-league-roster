
import { describe, it, expect } from 'vitest';
import { generateLineup } from './lineupGenerator';
import { getSampleRoster } from './sampleData';
import { Player, Position, GameLineup } from '../types';

const TEST_SEED = 12345;

describe('generateLineup', () => {
  const players12 = getSampleRoster({ playerCount: 12 });
  const players10 = getSampleRoster({ playerCount: 10 });

  it('generates a lineup for 6 innings', () => {
    const lineup = generateLineup(players12, TEST_SEED);
    expect(lineup).toHaveLength(6);
  });

  it('is deterministic with the same seed', () => {
    const lineup1 = generateLineup(players12, TEST_SEED);
    const lineup2 = generateLineup(players12, TEST_SEED);
    expect(lineup1).toEqual(lineup2);
  });

  it('is different with different seeds', () => {
    const lineup1 = generateLineup(players12, 123);
    const lineup2 = generateLineup(players12, 456);
    expect(lineup1).not.toEqual(lineup2);
  });

  it('assigns 10 players to positions each inning by default', () => {
    const lineup = generateLineup(players12, TEST_SEED);
    lineup.forEach(inning => {
      const assigned = Object.values(inning.assignments).filter(id => id !== null);
      // P, C, 1B, 2B, 3B, SS, LF, LC, RC, RF = 10 positions
      expect(assigned).toHaveLength(10);
    });
  });

  describe('Rule A: No player on bench for > 2 consecutive innings', () => {
    it('satisfies Rule A', () => {
      const lineup = generateLineup(players12, TEST_SEED);
      players12.forEach(player => {
        let consecutiveBench = 0;
        lineup.forEach(inning => {
          const isAssigned = Object.values(inning.assignments).includes(player.id);
          if (!isAssigned) {
            consecutiveBench++;
            expect(consecutiveBench).toBeLessThanOrEqual(2);
          } else {
            consecutiveBench = 0;
          }
        });
      });
    });
  });

  describe('Rule B: No player sits twice before everyone has sat once', () => {
    it('satisfies Rule B', () => {
      const lineup = generateLineup(players12, TEST_SEED);
      const satOnce = new Set<string>();
      const satTwice = new Set<string>();

      lineup.forEach(inning => {
        const assignedIds = new Set(Object.values(inning.assignments).filter(id => id !== null));
        players12.forEach(player => {
          if (!assignedIds.has(player.id)) {
            if (satOnce.has(player.id)) {
              // This player is sitting for the second time.
              // Check if everyone else has sat at least once.
              players12.forEach(other => {
                if (other.id !== player.id) {
                  expect(satOnce.has(other.id)).toBe(true);
                }
              });
              satTwice.add(player.id);
            } else {
              satOnce.add(player.id);
            }
          }
        });
      });
    });
  });

  describe('Rule D: Players playing 4+ innings must play 1+ infield and 1+ outfield', () => {
    it('satisfies Rule D', () => {
      const lineup = generateLineup(players12, TEST_SEED);
      const INFIELD = ['P', 'C', '1B', '2B', '3B', 'SS'];
      const OUTFIELD = ['LF', 'LC', 'RC', 'RF'];

      players12.forEach(player => {
        let totalPlayed = 0;
        let infieldCount = 0;
        let outfieldCount = 0;

        lineup.forEach(inning => {
          Object.entries(inning.assignments).forEach(([pos, id]) => {
            if (id === player.id) {
              totalPlayed++;
              if (INFIELD.includes(pos)) infieldCount++;
              if (OUTFIELD.includes(pos)) outfieldCount++;
            }
          });
        });

        if (totalPlayed >= 4) {
          expect(infieldCount).toBeGreaterThanOrEqual(1);
          expect(outfieldCount).toBeGreaterThanOrEqual(1);
        }
      });
    });
  });

  describe('Rule C: No player shall sit out three innings unless every player has sat for at least two full innings', () => {
    it('satisfies Rule C', () => {
      const players13 = getSampleRoster({ playerCount: 13 }); // 3 sit per inning
      const lineup = generateLineup(players13, TEST_SEED);
      
      players13.forEach(player => {
        const mySatCount = lineup.filter(inning => !Object.values(inning.assignments).includes(player.id)).length;
        if (mySatCount >= 3) {
          // If I sat 3 times, everyone else must have sat at least 2 times
          players13.forEach(other => {
            if (other.id !== player.id) {
              const otherSatCount = lineup.filter(inning => !Object.values(inning.assignments).includes(other.id)).length;
              expect(otherSatCount).toBeGreaterThanOrEqual(2);
            }
          });
        }
      });
    });
  });

  describe('Rule F: No one plays the same position for 3 innings', () => {
    it('satisfies Rule F', () => {
      const lineup = generateLineup(players12, TEST_SEED);
      players12.forEach(player => {
        const positionCounts: Record<string, number> = {};
        lineup.forEach(inning => {
          Object.entries(inning.assignments).forEach(([pos, id]) => {
            if (id === player.id) {
              positionCounts[pos] = (positionCounts[pos] || 0) + 1;
              expect(positionCounts[pos]).toBeLessThan(3);
            }
          });
        });
      });
    });
  });

  describe('Rule G: Balance total innings played', () => {
    it('balances total innings played within 1 inning difference', () => {
      const lineup = generateLineup(players12, TEST_SEED);
      const playCounts = players12.map(player => {
        return lineup.filter(inning => Object.values(inning.assignments).includes(player.id)).length;
      });
      
      const max = Math.max(...playCounts);
      const min = Math.min(...playCounts);
      expect(max - min).toBeLessThanOrEqual(1);
    });
  });

  describe('Rule E: Team size specific rules', () => {
    it('12 players: everyone plays infield once, outfield once, and sits once (over 6 innings)', () => {
      const lineup = generateLineup(players12, TEST_SEED);
      const INFIELD = ['P', 'C', '1B', '2B', '3B', 'SS'];
      const OUTFIELD = ['LF', 'LC', 'RC', 'RF'];

      players12.forEach(player => {
        let infield = 0;
        let outfield = 0;
        let sat = 0;

        lineup.forEach(inning => {
          let assigned = false;
          Object.entries(inning.assignments).forEach(([pos, id]) => {
            if (id === player.id) {
              assigned = true;
              if (INFIELD.includes(pos)) infield++;
              if (OUTFIELD.includes(pos)) outfield++;
            }
          });
          if (!assigned) sat++;
        });

        expect(infield).toBeGreaterThanOrEqual(1);
        expect(outfield).toBeGreaterThanOrEqual(1);
        expect(sat).toBeGreaterThanOrEqual(1);
      });
    });

    it('11 players: everyone plays infield once and outfield once in 5 innings', () => {
      const players11 = getSampleRoster({ playerCount: 11 });
      const lineup = generateLineup(players11, TEST_SEED);
      const INFIELD = ['P', 'C', '1B', '2B', '3B', 'SS'];
      const OUTFIELD = ['LF', 'LC', 'RC', 'RF'];

      players11.forEach(player => {
        let infield = 0;
        let outfield = 0;

        lineup.slice(0, 5).forEach(inning => {
          Object.entries(inning.assignments).forEach(([pos, id]) => {
            if (id === player.id) {
              if (INFIELD.includes(pos)) infield++;
              if (OUTFIELD.includes(pos)) outfield++;
            }
          });
        });

        expect(infield).toBeGreaterThanOrEqual(1);
        expect(outfield).toBeGreaterThanOrEqual(1);
      });
    });

    it('handles roster with no designated pitchers or catchers', () => {
      const noSpecialists = getSampleRoster({ 
        playerCount: 12,
        pitcherCount: 0,
        catcherCount: 0,
        pitcherAndCatcherCount: 0
      });
      
      // Verify no one is marked as pitcher or catcher
      noSpecialists.forEach(p => {
        expect(p.canPitch).toBe(false);
        expect(p.canCatch).toBe(false);
      });

      const lineup = generateLineup(noSpecialists, TEST_SEED);
      
      // P and C should be null, but other 8 positions should be filled
      lineup.forEach(inning => {
        const assigned = Object.values(inning.assignments).filter(id => id !== null);
        expect(assigned).toHaveLength(8);
        expect(inning.assignments.P).toBeNull();
        expect(inning.assignments.C).toBeNull();
      });

      // Should still balance infield/outfield for the remaining positions
      const INFIELD = ['1B', '2B', '3B', 'SS'];
      const OUTFIELD = ['LF', 'LC', 'RC', 'RF'];

      noSpecialists.forEach(player => {
        let infield = 0;
        let outfield = 0;
        lineup.forEach(inning => {
          Object.entries(inning.assignments).forEach(([pos, id]) => {
            if (id === player.id) {
              if (INFIELD.includes(pos)) infield++;
              if (OUTFIELD.includes(pos)) outfield++;
            }
          });
        });
        // With 12 players and 8 positions, everyone plays 4 innings.
        // 4 positions are infield, 4 are outfield.
        // Everyone should play 2 infield and 2 outfield.
        expect(infield).toBe(2);
        expect(outfield).toBe(2);
      });
    });

    it('verifies each kid has equal (within 1) infield and outfield innings as every other kid', () => {
      const lineup = generateLineup(players12, TEST_SEED);
      const INFIELD = ['P', 'C', '1B', '2B', '3B', 'SS'];
      const OUTFIELD = ['LF', 'LC', 'RC', 'RF'];

      const stats = players12.map(player => {
        let infield = 0;
        let outfield = 0;
        lineup.forEach(inning => {
          Object.entries(inning.assignments).forEach(([pos, id]) => {
            if (id === player.id) {
              if (INFIELD.includes(pos)) infield++;
              if (OUTFIELD.includes(pos)) outfield++;
            }
          });
        });
        return { name: player.name, infield, outfield };
      });

      const infieldCounts = stats.map(s => s.infield);
      const outfieldCounts = stats.map(s => s.outfield);

      expect(Math.max(...infieldCounts) - Math.min(...infieldCounts)).toBeLessThanOrEqual(1);
      expect(Math.max(...outfieldCounts) - Math.min(...outfieldCounts)).toBeLessThanOrEqual(1);
    });
  });

  describe('3-Outfielder Configuration', () => {
    const players11 = getSampleRoster({ playerCount: 11 }); // 6 infield + 3 outfield = 9 positions, 2 sit per inning

    it('assigns 9 players to positions each inning', () => {
      const lineup = generateLineup(players11, TEST_SEED, undefined, 3);
      lineup.forEach(inning => {
        const assigned = Object.values(inning.assignments).filter(id => id !== null);
        // P, C, 1B, 2B, 3B, SS, LF, CF, RF = 9 positions
        expect(assigned).toHaveLength(9);
      });
    });

    it('satisfies Rule D (Infield/Outfield balance) with 3 outfielders', () => {
      const lineup = generateLineup(players11, TEST_SEED, undefined, 3);
      const INFIELD = ['P', 'C', '1B', '2B', '3B', 'SS'];
      const OUTFIELD = ['LF', 'CF', 'RF'];

      players11.forEach(player => {
        let totalPlayed = 0;
        let infieldCount = 0;
        let outfieldCount = 0;

        lineup.forEach(inning => {
          Object.entries(inning.assignments).forEach(([pos, id]) => {
            if (id === player.id) {
              totalPlayed++;
              if (INFIELD.includes(pos)) infieldCount++;
              if (OUTFIELD.includes(pos)) outfieldCount++;
            }
          });
        });

        if (totalPlayed >= 4) {
          expect(infieldCount).toBeGreaterThanOrEqual(1);
          expect(outfieldCount).toBeGreaterThanOrEqual(1);
        }
      });
    });

    it('balances total innings played within 1 inning difference with 3 outfielders', () => {
      const lineup = generateLineup(players11, TEST_SEED, undefined, 3);
      const playCounts = players11.map(player => {
        return lineup.filter(inning => Object.values(inning.assignments).includes(player.id)).length;
      });
      
      const max = Math.max(...playCounts);
      const min = Math.min(...playCounts);
      expect(max - min).toBeLessThanOrEqual(1);
    });
  });

  describe('Locking Capability', () => {
    it('preserves locked positions and generates a valid lineup around them', () => {
      const player1 = players12[0];
      const player2 = players12[1];
      
      const locks: GameLineup = [
        {
          inning: 1,
          assignments: {
            P: player1.id,
            C: player2.id,
            '1B': null, '2B': null, '3B': null, SS: null,
            LF: null, LC: null, RC: null, RF: null, CF: null, Bench: null
          },
          lockedPositions: ['P', 'C']
        },
        {
          inning: 3,
          assignments: {
            P: null, C: null, '1B': player1.id, '2B': null, '3B': null, SS: null,
            LF: null, LC: null, RC: null, RF: null, CF: null, Bench: null
          },
          lockedPositions: ['1B']
        }
      ];

      const lineup = generateLineup(players12, TEST_SEED, locks);
      
      // Inning 1 check
      expect(lineup[0].assignments.P).toBe(player1.id);
      expect(lineup[0].assignments.C).toBe(player2.id);
      
      // Inning 3 check
      expect(lineup[2].assignments['1B']).toBe(player1.id);
      
      // Verify other positions are still filled (10 positions total)
      lineup.forEach(inning => {
        const assigned = Object.values(inning.assignments).filter(id => id !== null);
        expect(assigned).toHaveLength(10);
      });

      // Verify stats for player1 (should have at least 2 infield innings from locks)
      let player1Infield = 0;
      lineup.forEach(inning => {
        const INFIELD = ['P', 'C', '1B', '2B', '3B', 'SS'];
        Object.entries(inning.assignments).forEach(([pos, id]) => {
          if (id === player1.id && INFIELD.includes(pos)) {
            player1Infield++;
          }
        });
      });
      expect(player1Infield).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Bench Locking', () => {
    it('respects locked bench players', () => {
      const players = getSampleRoster({ playerCount: 12, pitcherAndCatcherCount: 6 });
      const playerToLock = players[0];
      
      const locks: GameLineup = [
        {
          inning: 1,
          assignments: {
            P: null, C: null, '1B': null, '2B': null, '3B': null, SS: null,
            LF: null, LC: null, RC: null, RF: null, CF: null, Bench: null
          },
          lockedBenchPlayerIds: [playerToLock.id]
        }
      ];
      
      const lineup = generateLineup(players, TEST_SEED, locks);
      
      // Inning 1 should have playerToLock on the bench
      const inning1 = lineup[0];
      const assignedIds = Object.values(inning1.assignments).filter(id => id !== null);
      expect(assignedIds).not.toContain(playerToLock.id);
      expect(inning1.lockedBenchPlayerIds).toContain(playerToLock.id);
    });
  });

  describe('Absent Players', () => {
    it('excludes absent players from the lineup', () => {
      const players = getSampleRoster({ playerCount: 12, pitcherAndCatcherCount: 6 });
      players[0].isAbsent = true;
      players[1].isAbsent = true;
      
      const lineup = generateLineup(players, TEST_SEED);
      
      // With 12 players and 2 absent, we have 10 active players.
      // 10 active players should fill all 10 positions each inning.
      lineup.forEach(inning => {
        const assignedIds = Object.values(inning.assignments).filter(id => id !== null);
        expect(assignedIds).toHaveLength(10);
        expect(assignedIds).not.toContain(players[0].id);
        expect(assignedIds).not.toContain(players[1].id);
      });
      
      // Everyone should play every inning (6 innings total)
      players.slice(2).forEach(player => {
        const playCount = lineup.filter(inning => Object.values(inning.assignments).includes(player.id)).length;
        expect(playCount).toBe(6);
      });
    });

    it('ignores locks for absent players', () => {
      const players = getSampleRoster({ playerCount: 12, pitcherAndCatcherCount: 6 });
      const absentPlayer = players[0];
      absentPlayer.isAbsent = true;
      
      const locks: GameLineup = [
        {
          inning: 1,
          assignments: {
            P: absentPlayer.id,
            C: null, '1B': null, '2B': null, '3B': null, SS: null,
            LF: null, LC: null, RC: null, RF: null, CF: null, Bench: null
          },
          lockedPositions: ['P']
        }
      ];

      const lineup = generateLineup(players, TEST_SEED, locks);
      
      // Inning 1 P should NOT be the absent player
      expect(lineup[0].assignments.P).not.toBe(absentPlayer.id);
      expect(lineup[0].assignments.P).not.toBeNull();
    });
  });

  describe('Rule 3b: Pitchers cannot pitch non-consecutive innings', () => {
    it('satisfies Rule 3b', () => {
      const players = getSampleRoster({ playerCount: 12, pitcherAndCatcherCount: 6 });
      const lineup = generateLineup(players, TEST_SEED);
      
      players.forEach(player => {
        let hasPitched = false;
        let wasPitching = false;
        let donePitching = false;
        
        lineup.forEach(inning => {
          const isPitching = inning.assignments.P === player.id;
          
          if (isPitching) {
            // If they are pitching now, they shouldn't be "done pitching"
            expect(donePitching).toBe(false);
            hasPitched = true;
            wasPitching = true;
          } else {
            // If they were pitching but stopped, they are now "done pitching"
            if (wasPitching) {
              donePitching = true;
            }
            wasPitching = false;
          }
        });
      });
    });
  });
});
