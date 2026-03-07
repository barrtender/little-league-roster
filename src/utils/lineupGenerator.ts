
import { Player, GameLineup, Position, InningAssignment } from '../types';
import { INFIELD_POSITIONS, OUTFIELD_POSITIONS, ALL_PLAYING_POSITIONS } from '../constants';

export function generateLineup(players: Player[]): GameLineup {
  const numInnings = 6;
  const lineup: GameLineup = [];
  
  // Track stats to balance
  const stats = players.map(p => ({
    id: p.id,
    infield: 0,
    outfield: 0,
    bench: 0,
    pitching: 0,
    catching: 0,
    totalPlayed: 0
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

    const availablePlayers = [...players].sort(() => Math.random() - 0.5);
    const assignedThisInning = new Set<string>();

    // 1. Assign Pitcher
    const pitcher = availablePlayers.find(p => 
      p.canPitch && 
      getStat(p.id).pitching < 2 && 
      !assignedThisInning.has(p.id)
    );
    if (pitcher) {
      inningAssignment.assignments.P = pitcher.id;
      assignedThisInning.add(pitcher.id);
      getStat(pitcher.id).pitching++;
      getStat(pitcher.id).infield++;
      getStat(pitcher.id).totalPlayed++;
    }

    // 2. Assign Catcher
    const catcher = availablePlayers.find(p => 
      p.canCatch && 
      !assignedThisInning.has(p.id)
    );
    if (catcher) {
      inningAssignment.assignments.C = catcher.id;
      assignedThisInning.add(catcher.id);
      getStat(catcher.id).catching++;
      getStat(catcher.id).infield++;
      getStat(catcher.id).totalPlayed++;
    }

    // 3. Assign Bench (if more than 10 players)
    // Constraint: No player on bench twice before everyone has sat once.
    if (players.length > 10) {
      const numBench = players.length - 10;
      for (let b = 0; b < numBench; b++) {
        // Sort players by bench count (ascending) to ensure rotation
        const benchCandidate = availablePlayers
          .filter(p => !assignedThisInning.has(p.id))
          .sort((a, b) => getStat(a.id).bench - getStat(b.id).bench)[0];
        
        if (benchCandidate) {
          assignedThisInning.add(benchCandidate.id);
          getStat(benchCandidate.id).bench++;
        }
      }
    }

    // 4. Assign remaining Infield (1B, 2B, 3B, SS)
    const remainingInfield = ['1B', '2B', '3B', 'SS'] as Position[];
    for (const pos of remainingInfield) {
      // Prioritize players who have played FEWER infield innings
      const candidate = availablePlayers
        .filter(p => !assignedThisInning.has(p.id))
        .sort((a, b) => {
          const statA = getStat(a.id);
          const statB = getStat(b.id);
          // Balance infield/outfield ratio
          return (statA.infield - statA.outfield) - (statB.infield - statB.outfield);
        })[0];

      if (candidate) {
        inningAssignment.assignments[pos] = candidate.id;
        assignedThisInning.add(candidate.id);
        getStat(candidate.id).infield++;
        getStat(candidate.id).totalPlayed++;
      }
    }

    // 5. Assign Outfield (LF, LC, RC, RF)
    for (const pos of OUTFIELD_POSITIONS) {
      const candidate = availablePlayers
        .filter(p => !assignedThisInning.has(p.id))
        .sort((a, b) => {
          const statA = getStat(a.id);
          const statB = getStat(b.id);
          // Balance infield/outfield ratio (prefer those with more infield than outfield)
          return (statA.outfield - statA.infield) - (statB.outfield - statB.infield);
        })[0];

      if (candidate) {
        inningAssignment.assignments[pos] = candidate.id;
        assignedThisInning.add(candidate.id);
        getStat(candidate.id).outfield++;
        getStat(candidate.id).totalPlayed++;
      }
    }

    lineup.push(inningAssignment);
  }

  return lineup;
}
