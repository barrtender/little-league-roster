
import { Player, GameLineup, Position, InningAssignment } from '../types';
import { INFIELD_POSITIONS, OUTFIELD_POSITIONS, ALL_PLAYING_POSITIONS } from '../constants';

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

export function generateLineup(players: Player[], seed?: number): GameLineup {
  const numInnings = 6;
  
  // Use provided seed or a random one
  let effectiveSeed = seed ?? Math.floor(Math.random() * 1000000);
  
  // Try up to 50 times to find a valid lineup (one where all positions are filled)
  for (let attempt = 0; attempt < 50; attempt++) {
    const isLastAttempt = attempt === 49;
    const random = createRandom(effectiveSeed + attempt);
    const shuffledPlayers = shuffle(players, random);
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

    for (let i = 1; i <= numInnings; i++) {
      const inningAssignment: InningAssignment = {
        inning: i,
        assignments: {
          P: null, C: null, '1B': null, '2B': null, '3B': null, SS: null,
          LF: null, LC: null, RC: null, RF: null, Bench: null
        }
      };

      const assignedThisInning = new Set<string>();

      // Helper to check if a player can play a position this inning
      const canPlayPosition = (playerId: string, pos: Position) => {
        const s = getStat(playerId);
        // Rule F: No one plays same position for 3 innings (total)
        if ((s.positionCounts[pos] || 0) >= 2) return false; 
        
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
      if (shuffledPlayers.length > 10) {
        const numBench = shuffledPlayers.length - 10;
        const benchCandidates = [...shuffledPlayers]
          .filter(p => {
            const s = getStat(p.id);
            // Rule A: No player on bench for > 2 consecutive innings
            if (s.consecutiveBench >= 2) return false;
            return true;
          })
          .sort((a, b) => {
            const sA = getStat(a.id);
            const sB = getStat(b.id);
            
            // Rule B: No player sits twice before everyone has sat once
            // Rule C: No player sits 3 times unless everyone has sat twice
            if (sA.bench !== sB.bench) return sA.bench - sB.bench;
            
            // Tie-break: Prefer sitting those who are NOT specialists if we are low on them
            const pA = shuffledPlayers.find(p => p.id === a.id)!;
            const pB = shuffledPlayers.find(p => p.id === b.id)!;
            const isSpecialistA = pA.canPitch || pA.canCatch;
            const isSpecialistB = pB.canPitch || pB.canCatch;
            if (isSpecialistA !== isSpecialistB) return isSpecialistA ? 1 : -1;

            // Tie-break with total played (prefer those who played more to sit)
            return sB.totalPlayed - sA.totalPlayed;
          });

        for (let b = 0; b < numBench; b++) {
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

      // 2. Assign Catcher first (usually the most restricted position)
      const catcherPos: Position = 'C';
      const catcher = [...shuffledPlayers]
        .filter(p => !assignedThisInning.has(p.id) && canPlayPosition(p.id, catcherPos))
        .sort((a, b) => {
          const sA = getStat(a.id);
          const sB = getStat(b.id);
          if (sA.catching !== sB.catching) return sA.catching - sB.catching;
          
          // Tie-break: prefer those who CANNOT pitch to catch, saving pitchers
          const pA = shuffledPlayers.find(p => p.id === a.id)!;
          const pB = shuffledPlayers.find(p => p.id === b.id)!;
          if (pA.canPitch !== pB.canPitch) return pA.canPitch ? 1 : -1;
          
          return 0;
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

      // 3. Assign Pitcher
      const pitcherPos: Position = 'P';
      const pitcher = [...shuffledPlayers]
        .filter(p => !assignedThisInning.has(p.id) && canPlayPosition(p.id, pitcherPos))
        .sort((a, b) => {
          const sA = getStat(a.id);
          const sB = getStat(b.id);
          if (sA.pitching !== sB.pitching) return sA.pitching - sB.pitching;

          // Tie-break: prefer those who CANNOT catch to pitch, saving catchers
          const pA = shuffledPlayers.find(p => p.id === a.id)!;
          const pB = shuffledPlayers.find(p => p.id === b.id)!;
          if (pA.canCatch !== pB.canCatch) return pA.canCatch ? 1 : -1;
          
          return 0;
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

      // 4. Assign remaining positions (Infield then Outfield)
      const remainingPositions = [...INFIELD_POSITIONS.filter(p => p !== 'P' && p !== 'C'), ...OUTFIELD_POSITIONS];
      
      for (const pos of remainingPositions) {
        const isInfield = INFIELD_POSITIONS.includes(pos);
        const candidate = [...shuffledPlayers]
          .filter(p => !assignedThisInning.has(p.id) && canPlayPosition(p.id, pos))
          .sort((a, b) => {
            const sA = getStat(a.id);
            const sB = getStat(b.id);

            // Rule E/D: Balance Infield/Outfield
            // We want to prioritize players who need more of this type (Infield or Outfield)
            if (isInfield) {
              if (sA.infield !== sB.infield) return sA.infield - sB.infield;
              return sB.outfield - sA.outfield; // Prefer those with more outfield
            } else {
              if (sA.outfield !== sB.outfield) return sA.outfield - sB.outfield;
              return sB.infield - sA.infield; // Prefer those with more infield
            }
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

  // Fallback if no valid lineup found after retries (should be rare)
  return []; 
}
