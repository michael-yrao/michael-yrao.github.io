export const COMPLEXITY_SCHEMA_VERSION = 1;

const MODULE_NAME_PATTERN = /^complexity_\w+$/;

/** One Python module of the complexity analyzer, as `dashboard/complexity.json` carries it. */
export interface ComplexityModule {
  readonly name: string;
  readonly source: string;
}

function isComplexityModule(value: unknown): value is ComplexityModule {
  if (typeof value !== 'object' || value === null) return false;
  const { name, source } = value as { name?: unknown; source?: unknown };
  return typeof name === 'string' && MODULE_NAME_PATTERN.test(name) && typeof source === 'string';
}

/** The modules of a valid `complexity.json` payload, else null: an absent or malformed file
 *  means "no analyzer", never an error. */
export function parseComplexityModules(payload: unknown): readonly ComplexityModule[] | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const { schemaVersion, modules } = payload as { schemaVersion?: unknown; modules?: unknown };
  if (schemaVersion !== COMPLEXITY_SCHEMA_VERSION) return null;
  if (!Array.isArray(modules) || !modules.every(isComplexityModule)) return null;
  return modules;
}
