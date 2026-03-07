
import { Player } from '../types';

const SAMPLE_NAMES = [
    'Alice', 'Bob', 'Carol', 'David', 'Eve', 'Frank', 
    'Grace', 'Hank', 'Ivy', 'Jack', 'Karl', 'Liam', 
    'Mona', 'Noah', 'Olivia', 'Paul', 'Quinn', 'Rose', 
    'Seth', 'Tara', 'Ursula', 'Victor', 'Wendy', 'Xavier', 
    'Yosef', 'Zane'
  ];

interface SampleRosterOptions {
  playerCount?: number;
  pitcherAndCatcherCount?: number;
  pitcherCount?: number;
  catcherCount?: number;
}

/**
 * Assigns kids that can pitch and catch first, then just pitch, then just catch.
 * 
 * Defaults to 12 kids, 3 both pitch and catch, 3 just pitch.
 */
export const getSampleRoster = ({
  playerCount = 12,
  pitcherAndCatcherCount = 3,
  pitcherCount = 3,
  catcherCount = 0
}: SampleRosterOptions = {}): Player[] => {
  const names = SAMPLE_NAMES.slice(0, playerCount);

  return names.map((name, index) => {
    
    let canPitch = false;
    let canCatch = false;

    if (index < pitcherAndCatcherCount) {
      canPitch = true;
      canCatch = true;
    } else if (index < pitcherAndCatcherCount + pitcherCount) {
      canPitch = true;
    } else if (index < pitcherAndCatcherCount + pitcherCount + catcherCount) {
      canCatch = true;
    }

    return {
      id: `sample-${index}`,
      name,
      canPitch,
      canCatch
    };
  });
};
