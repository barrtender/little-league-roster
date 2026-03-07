
import { Position } from './types';

export const INFIELD_POSITIONS: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS'];
export const OUTFIELD_POSITIONS: Position[] = ['LF', 'LC', 'RC', 'RF'];
export const ALL_PLAYING_POSITIONS: Position[] = [...INFIELD_POSITIONS, ...OUTFIELD_POSITIONS];

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
  Bench: 'Bench'
};
