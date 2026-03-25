
import { Position } from './types';

export const INFIELD_POSITIONS: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS'];

export const OUTFIELD_POSITIONS_4: Position[] = ['LF', 'LC', 'RC', 'RF'];
export const OUTFIELD_POSITIONS_3: Position[] = ['LF', 'CF', 'RF'];

export const getOutfieldPositions = (count: number): Position[] => {
  return count === 3 ? OUTFIELD_POSITIONS_3 : OUTFIELD_POSITIONS_4;
};

export const getAllPlayingPositions = (outfieldCount: number): Position[] => {
  return [...INFIELD_POSITIONS, ...getOutfieldPositions(outfieldCount)];
};

export const POSITION_LABELS: Record<Position, string> = {
  P: 'Pitcher',
  C: 'Catcher',
  '1B': '1st Base',
  '2B': '2nd Base',
  '3B': '3rd Base',
  SS: 'Shortstop',
  LF: 'Left Field',
  LC: 'Left Center',
  RC: 'Right Center',
  RF: 'Right Field',
  CF: 'Center Field',
  Bench: 'Bench'
};
