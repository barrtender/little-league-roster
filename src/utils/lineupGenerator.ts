
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
    const anyPitchers = shuffledPlayers.some(p => p.canPitch);
    const anyCatchers = shuffledPlayers.some(p => p.canCatch);

    for (let i = 1; i <= numInnings; i++) {
      const inningAssignment: InningAssignment = {
        inning: i,
        assignments: {
          P: null, C: null, '1B': null, '2B': null, '3B': null, SS: null,
          LF: null, LC: null, RC: null, RF: null, Bench: null
        }
      };

      const assignedThisInning = new Set<string>();

      const fairInfield = Math.ceil((numInnings * 6) / shuffledPlayers.length);
      const fairOutfield = Math.ceil((numInnings * 4) / shuffledPlayers.length);

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
      const activePositionsCount = (anyPitchers ? 1 : 0) + (anyCatchers ? 1 : 0) + 8;
      if (shuffledPlayers.length > activePositionsCount) {
        const numBench = shuffledPlayers.length - activePositionsCount;
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
          // Primary: least catching innings
          if (sA.catching !== sB.catching) return sA.catching - sB.catching;
          // Secondary: Balance - prefer those who have played more OUTFIELD relative to INFIELD
          const balanceA = sA.outfield - sA.infield;
          const balanceB = sB.outfield - sB.infield;
          if (balanceA !== balanceB) return balanceB - balanceA;
          // Tertiary: least total infield innings
          if (sA.infield !== sB.infield) return sA.infield - sB.infield;
          // Quaternary: least total played
          return sA.totalPlayed - sB.totalPlayed;
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
      } else if (anyCatchers && !isLastAttempt) {
        // Only fail if there are catchers on the roster but we couldn't assign one
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
          // Primary: least pitching innings
          if (sA.pitching !== sB.pitching) return sA.pitching - sB.pitching;
          // Secondary: Balance - prefer those who have played more OUTFIELD relative to INFIELD
          const balanceA = sA.outfield - sA.infield;
          const balanceB = sB.outfield - sB.infield;
          if (balanceA !== balanceB) return balanceB - balanceA;
          // Tertiary: least total infield innings
          if (sA.infield !== sB.infield) return sA.infield - sB.infield;
          // Quaternary: least total played
          return sA.totalPlayed - sB.totalPlayed;
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
      } else if (anyPitchers && !isLastAttempt) {
        // Only fail if there are pitchers on the roster but we couldn't assign one
        isValid = false;
        break;
      }

      // 4. Assign remaining positions
      const remainingPositions = shuffle(
        [...INFIELD_POSITIONS.filter(p => p !== 'P' && p !== 'C'), ...OUTFIELD_POSITIONS],
        createRandom(effectiveSeed + i + attempt)
      );
      
      for (const pos of remainingPositions) {
        const isInfield = INFIELD_POSITIONS.includes(pos);
        const candidate = [...shuffledPlayers]
          .filter(p => !assignedThisInning.has(p.id) && canPlayPosition(p.id, pos))
          .sort((a, b) => {
            const sA = getStat(a.id);
            const sB = getStat(b.id);

            // Rule E/D: Balance Infield/Outfield
            // Priority 1: Balance - prefer those who have played more of the OTHER type
            const balanceA = isInfield ? (sA.outfield - sA.infield) : (sA.infield - sA.outfield);
            const balanceB = isInfield ? (sB.outfield - sB.infield) : (sB.infield - sB.outfield);
            
            if (balanceA !== balanceB) return balanceB - balanceA;

            // Priority 2: Least of THIS type
            if (isInfield) {
              if (sA.infield !== sB.infield) return sA.infield - sB.infield;
            } else {
              if (sA.outfield !== sB.outfield) return sA.outfield - sB.outfield;
            }
            
            // Priority 3: Least total played
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

  // Fallback if no valid lineup found after retries (should be rare)
  return []; 
}
