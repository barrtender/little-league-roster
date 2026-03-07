
import { describe, it, expect } from 'vitest';
import { generateLineup } from './lineupGenerator';
import { getSampleRoster } from './sampleData';
import { Player, Position } from '../types';

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

  it('assigns 10 players to positions each inning', () => {
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
  });
});
