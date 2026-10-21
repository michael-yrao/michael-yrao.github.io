import { ALGORITHM_INDEX, countVisualized } from './algorithms.data';
import { GAMES } from './games.data';
import { QUIZZES } from './quizzes.data';

// A literal, not a read of `assets/cheat-sheets.json`: importing the JSON here would pull the
// whole cheat-sheet asset into this chunk. Update it when a technique doc is added to
// cse-progress (the asset's `techniques` length).
const CHEAT_SHEET_COUNT = 18;

/** The headline counts the landing page and the practice list show. */
export const SITE_COUNTS = {
  totalSolved: ALGORITHM_INDEX.length,
  totalVisualized: countVisualized(ALGORITHM_INDEX),
  totalGames: GAMES.filter((g) => g.status === 'available').length,
  totalQuizzes: QUIZZES.filter((q) => q.status === 'available').length,
  cheatSheetCount: CHEAT_SHEET_COUNT,
} as const;
