
import { Player, GameLineup, Position, InningAssignment } from '../types';
import { INFIELD_POSITIONS, getOutfieldPositions } from '../constants';

// Simple seeded random generator (Mulberry32)
function createRandom(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle with seeded random
function shuffle<T>(array: T[], random: () => number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateLineup(players: Player[], seed?: number, locks?: GameLineup, outfieldCount: number = 4): GameLineup {
  const numInnings = 6;
  const outfieldPositions = getOutfieldPositions(outfieldCount);
  const activePlayers = players.filter(p => !p.isAbsent);
  
  // Use provided seed or a random one
  let effectiveSeed = seed ?? Math.floor(Math.random() * 1000000);
  
  // Try up to 50 times to find a valid lineup (one where all positions are filled)
  for (let attempt = 0; attempt < 50; attempt++) {
    const isLastAttempt = attempt === 49;
    const random = createRandom(effectiveSeed + attempt);
    const shuffledPlayers = shuffle(activePlayers, random);
    const lineup: GameLineup = [];
    let isValid = true;

    // Track stats to balance
    const stats = shuffledPlayers.map(p => ({
      id: p.id,
      infield: 0,
      outfield: 0,
      bench: 0,
      pitching: 0,
      catching: 0,
      totalPlayed: 0,
      consecutiveBench: 0,
      lastPosition: null as Position | null,
      positionCounts: {} as Record<string, number>,
      history: [] as (Position | 'Bench')[]
    }));

    const getStat = (id: string) => stats.find(s => s.id === id)!;
    const anyPitchers = shuffledPlayers.some(p => p.canPitch);
    const anyCatchers = shuffledPlayers.some(p => p.canCatch);

    for (let i = 1; i <= numInnings; i++) {
      const inningAssignment: InningAssignment = {
        inning: i,
        assignments: {
          P: null, C: null, '1B': null, '2B': null, '3B': null, SS: null,
          LF: null, LC: null, RC: null, RF: null, CF: null, Bench: null
        }
      };

      const assignedThisInning = new Set<string>();

      // 0. Apply locks for this inning first
      const inningLocks = locks?.find(l => l.inning === i);
      if (inningLocks) {
        // Only lock positions that are explicitly marked as locked
        const positionsToLock = inningLocks.lockedPositions || [];

        positionsToLock.forEach((pos) => {
          const playerId = inningLocks.assignments[pos];
          if (playerId && shuffledPlayers.some(p => p.id === playerId)) {
            const position = pos as Position;
            inningAssignment.assignments[position] = playerId;
            assignedThisInning.add(playerId);
            
            const s = getStat(playerId);
            if (position === 'Bench') {
              s.bench++;
              s.consecutiveBench++;
            } else {
              const isInfield = INFIELD_POSITIONS.includes(position);
              if (isInfield) s.infield++;
              else s.outfield++;
              
              if (position === 'P') s.pitching++;
              if (position === 'C') s.catching++;
              
              s.totalPlayed++;
              s.positionCounts[position] = (s.positionCounts[position] || 0) + 1;
            }
            s.history.push(position);
            
            // Also mark it as locked in the new assignment so it persists if we regenerate again
            if (!inningAssignment.lockedPositions) inningAssignment.lockedPositions = [];
            if (!inningAssignment.lockedPositions.includes(position)) {
              inningAssignment.lockedPositions.push(position);
            }
          }
        });
      }

      const numInfieldPositions = (anyPitchers ? 1 : 0) + (anyCatchers ? 1 : 0) + 4;
      const fairInfield = Math.ceil((numInnings * numInfieldPositions) / shuffledPlayers.length);
      const fairOutfield = Math.ceil((numInnings * outfieldCount) / shuffledPlayers.length);

      // Helper to check if a player can play a position this inning
      const canPlayPosition = (playerId: string, pos: Position) => {
        const s = getStat(playerId);
        // Rule F: No one plays same position for 3 innings (total)
        if ((s.positionCounts[pos] || 0) >= 2) return false; 
        
        const isInfield = INFIELD_POSITIONS.includes(pos);
        if (!isLastAttempt) {
          if (isInfield && s.infield >= fairInfield) return false;
          if (!isInfield && s.outfield >= fairOutfield) return false;
        }
        
        if (pos === 'P') {
          const p = shuffledPlayers.find(player => player.id === playerId)!;
          if (!p.canPitch || s.pitching >= 2) return false;
        }
        if (pos === 'C') {
          const p = shuffledPlayers.find(player => player.id === playerId)!;
          if (!p.canCatch) return false;
        }
        return true;
      };

      // 1. Assign Bench first to satisfy bench rules
      const totalActivePositions = (anyPitchers ? 1 : 0) + (anyCatchers ? 1 : 0) + 4 + outfieldCount;
      const totalBenchNeeded = Math.max(0, shuffledPlayers.length - totalActivePositions);
      
      // Count how many are already assigned to bench via locks
      const alreadyOnBenchCount = Array.from(assignedThisInning).filter(id => {
          const s = getStat(id);
          return s.history[s.history.length - 1] === 'Bench';
      }).length;
      
      const numBenchRemaining = Math.max(0, totalBenchNeeded - alreadyOnBenchCount);

      if (numBenchRemaining > 0) {
        const benchCandidates = [...shuffledPlayers]
          .filter(p => {
            if (assignedThisInning.has(p.id)) return false;
            const s = getStat(p.id);
            // Rule A: No player on bench for > 2 consecutive innings
            if (s.consecutiveBench >= 2) return false;
            return true;
          })
          .sort((a, b) => {
            const sA = getStat(a.id);
            const sB = getStat(b.id);
            
            if (sA.bench !== sB.bench) return sA.bench - sB.bench;
            
            return sB.totalPlayed - sA.totalPlayed;
          });

        for (let b = 0; b < numBenchRemaining; b++) {
          const chosen = benchCandidates.find(p => !assignedThisInning.has(p.id));
          if (chosen) {
            assignedThisInning.add(chosen.id);
            const s = getStat(chosen.id);
            s.bench++;
            s.consecutiveBench++;
            s.history.push('Bench');
          }
        }
      }

      // Update consecutive bench for those NOT on bench
      shuffledPlayers.forEach(p => {
        if (!assignedThisInning.has(p.id)) {
          getStat(p.id).consecutiveBench = 0;
        }
      });

      // 2. Assign Catcher
      if (!inningAssignment.assignments.C && anyCatchers) {
          const catcherPos: Position = 'C';
          const catcher = [...shuffledPlayers]
            .filter(p => !assignedThisInning.has(p.id) && canPlayPosition(p.id, catcherPos))
            .sort((a, b) => {
              const sA = getStat(a.id);
              const sB = getStat(b.id);
              if (sA.catching !== sB.catching) return sA.catching - sB.catching;
              const balanceA = sA.outfield - sA.infield;
              const balanceB = sB.outfield - sB.infield;
              if (balanceA !== balanceB) return balanceB - balanceA;
              if (sA.infield !== sB.infield) return sA.infield - sB.infield;
              return sB.totalPlayed - sA.totalPlayed;
            })[0];
          
          if (catcher) {
            inningAssignment.assignments.C = catcher.id;
            assignedThisInning.add(catcher.id);
            const s = getStat(catcher.id);
            s.catching++;
            s.infield++;
            s.totalPlayed++;
            s.positionCounts[catcherPos] = (s.positionCounts[catcherPos] || 0) + 1;
            s.history.push(catcherPos);
          } else if (!isLastAttempt) {
            isValid = false;
            break;
          }
      }

      // 3. Assign Pitcher
      if (!inningAssignment.assignments.P && anyPitchers) {
          const pitcherPos: Position = 'P';
          const pitcher = [...shuffledPlayers]
            .filter(p => !assignedThisInning.has(p.id) && canPlayPosition(p.id, pitcherPos))
            .sort((a, b) => {
              const sA = getStat(a.id);
              const sB = getStat(b.id);
              if (sA.pitching !== sB.pitching) return sA.pitching - sB.pitching;
              const balanceA = sA.outfield - sA.infield;
              const balanceB = sB.outfield - sB.infield;
              if (balanceA !== balanceB) return balanceB - balanceA;
              if (sA.infield !== sB.infield) return sA.infield - sB.infield;
              return sB.totalPlayed - sA.totalPlayed;
            })[0];
          
          if (pitcher) {
            inningAssignment.assignments.P = pitcher.id;
            assignedThisInning.add(pitcher.id);
            const s = getStat(pitcher.id);
            s.pitching++;
            s.infield++;
            s.totalPlayed++;
            s.positionCounts[pitcherPos] = (s.positionCounts[pitcherPos] || 0) + 1;
            s.history.push(pitcherPos);
          } else if (!isLastAttempt) {
            isValid = false;
            break;
          }
      }

      // 4. Assign remaining positions
      const remainingPositions = shuffle(
        [...INFIELD_POSITIONS.filter(p => p !== 'P' && p !== 'C'), ...outfieldPositions],
        createRandom(effectiveSeed + i + attempt)
      ).filter(pos => !inningAssignment.assignments[pos]);
      
      for (const pos of remainingPositions) {
        const isInfield = INFIELD_POSITIONS.includes(pos);
        const candidate = [...shuffledPlayers]
          .filter(p => !assignedThisInning.has(p.id) && canPlayPosition(p.id, pos))
          .sort((a, b) => {
            const sA = getStat(a.id);
            const sB = getStat(b.id);
            const balanceA = isInfield ? (sA.outfield - sA.infield) : (sA.infield - sA.outfield);
            const balanceB = isInfield ? (sB.outfield - sB.infield) : (sB.infield - sB.outfield);
            if (balanceA !== balanceB) return balanceB - balanceA;
            if (isInfield) {
              if (sA.infield !== sB.infield) return sA.infield - sB.infield;
            } else {
              if (sA.outfield !== sB.outfield) return sA.outfield - sB.outfield;
            }
            return sA.totalPlayed - sB.totalPlayed;
          })[0];

        if (candidate) {
          inningAssignment.assignments[pos] = candidate.id;
          assignedThisInning.add(candidate.id);
          const s = getStat(candidate.id);
          if (isInfield) s.infield++;
          else s.outfield++;
          s.totalPlayed++;
          s.positionCounts[pos] = (s.positionCounts[pos] || 0) + 1;
          s.history.push(pos);
        } else if (!isLastAttempt) {
          isValid = false;
          break;
        }
      }

      if (!isValid) break;
      lineup.push(inningAssignment);
    }

    if (isValid || isLastAttempt) return lineup;
  }

  return []; 
}
