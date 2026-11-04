/** A JSON-schema object node: only the parts a field comparison reads. */
export interface SchemaObjectNode {
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly required?: readonly string[];
  readonly additionalProperties?: unknown;
}

/** One field of a TS interface, as written (`name?: …` gives `optional: true`). */
export interface TsField {
  readonly name: string;
  readonly optional: boolean;
}

export type DriftKind = 'missing-in-ts' | 'missing-in-schema' | 'required-mismatch';

export interface DriftEntry {
  readonly field: string;
  readonly kind: DriftKind;
  /** True for a TS-only field under a schema that allows additional properties: reported, not failed. */
  readonly isWarning: boolean;
}

/** Compares one schema object node with the fields of the TS interface that mirrors it. */
export function schemaFieldDrift(
  schemaObject: SchemaObjectNode,
  tsFields: readonly TsField[],
): readonly DriftEntry[] {
  const schemaNames = Object.keys(schemaObject.properties ?? {});
  const required = new Set(schemaObject.required ?? []);
  const tsByName = new Map(tsFields.map((field) => [field.name, field]));
  const isClosed = schemaObject.additionalProperties === false;

  const missingInTs = schemaNames
    .filter((name) => !tsByName.has(name))
    .map((field): DriftEntry => ({ field, kind: 'missing-in-ts', isWarning: false }));

  const schemaNameSet = new Set(schemaNames);
  const missingInSchema = tsFields
    .filter((field) => !schemaNameSet.has(field.name))
    .map((field): DriftEntry => ({ field: field.name, kind: 'missing-in-schema', isWarning: !isClosed }));

  const requiredMismatch = tsFields
    .filter((field) => schemaNameSet.has(field.name) && required.has(field.name) === field.optional)
    .map((field): DriftEntry => ({ field: field.name, kind: 'required-mismatch', isWarning: false }));

  return [...missingInTs, ...missingInSchema, ...requiredMismatch];
}
