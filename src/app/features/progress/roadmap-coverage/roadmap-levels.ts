import { Technique, TechniqueTier } from '../../../core/models/progress.model';

export type RoadmapLevelKey = 'core' | 'intermediate' | 'advanced';

export interface RoadmapTile {
  name: string;
  started: boolean;
}

export interface RoadmapLevelRow {
  key: RoadmapLevelKey;
  label: string;
  started: number;
  total: number;
  /** One tile per technique in the level: started first, original order kept within each group. */
  tiles: RoadmapTile[];
}

/** Display order of the three rows, top to bottom. */
const LEVELS: readonly { key: RoadmapLevelKey; label: string }[] = [
  { key: 'core', label: 'Core' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
];

const LEVEL_BY_TIER: Record<TechniqueTier, RoadmapLevelKey> = {
  core: 'core',
  dp: 'intermediate',
  tier1: 'intermediate',
  tier2: 'advanced',
  tier3: 'advanced',
};

/** One row per level (always all three, fixed order): its techniques as tiles (started first),
 *  how many are started, out of its total. `[]` for an empty list. */
export function groupRoadmapLevels(techniques: Technique[]): RoadmapLevelRow[] {
  if (!techniques.length) return [];
  return LEVELS.map(({ key, label }) => {
    const inLevel = techniques
      .filter((t) => LEVEL_BY_TIER[t.tier] === key)
      .map((t) => ({ name: t.name, started: t.started }));
    const started = inLevel.filter((t) => t.started);
    const notStarted = inLevel.filter((t) => !t.started);
    return { key, label, started: started.length, total: inLevel.length, tiles: [...started, ...notStarted] };
  });
}
