/** The smallest body ProgressService accepts as a summary — shared by the service and
 *  validation specs so the two cannot drift. */
export const MINIMAL_SUMMARY_BODY = {
  schemaVersion: 1,
  streak: { current: 1 },
  pipeline: {},
  totals: {},
  problems: [],
  badges: [],
};
