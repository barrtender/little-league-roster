
export type Position = 
  | 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' 
  | 'LF' | 'LC' | 'RC' | 'RF' | 'CF'
  | 'Bench';

export interface Player {
  id: string;
  name: string;
  canPitch: boolean;
  canCatch: boolean;
  isAbsent?: boolean;
}

export interface InningAssignment {
  inning: number;
  assignments: Record<Position, string | null>; // Position to Player ID
  lockedPositions?: Position[];
  lockedBenchPlayerIds?: string[];
}

export type GameLineup = InningAssignment[];

export interface PlayerStats {
  id: string;
  name: string;
  pitcher: number;
  catcher: number;
  infield: number;
  outfield: number;
  bench: number;
  isAbsent: boolean;
}
