import { describe, expect, it } from 'vitest';

import { schemaFieldDrift, SchemaObjectNode, TsField } from './schema-field-drift';

const FIELD_A: TsField = { name: 'a', optional: false };
const FIELD_B: TsField = { name: 'b', optional: true };

interface DriftCase {
  readonly name: string;
  readonly schema: SchemaObjectNode;
  readonly tsFields: readonly TsField[];
  readonly expected: ReturnType<typeof schemaFieldDrift>;
}

const CASES: readonly DriftCase[] = [
  {
    name: 'match',
    schema: { properties: { a: {}, b: {} }, required: ['a'] },
    tsFields: [FIELD_A, FIELD_B],
    expected: [],
  },
  {
    name: 'schema field missing in TS',
    schema: { properties: { a: {}, b: {} }, required: ['a'] },
    tsFields: [FIELD_A],
    expected: [{ field: 'b', kind: 'missing-in-ts', isWarning: false }],
  },
  {
    name: 'TS extra field under additionalProperties false',
    schema: { properties: { a: {} }, required: ['a'], additionalProperties: false },
    tsFields: [FIELD_A, FIELD_B],
    expected: [{ field: 'b', kind: 'missing-in-schema', isWarning: false }],
  },
  {
    name: 'required vs optional mismatch',
    schema: { properties: { a: {} }, required: ['a'] },
    tsFields: [{ name: 'a', optional: true }],
    expected: [{ field: 'a', kind: 'required-mismatch', isWarning: false }],
  },
];

describe('schemaFieldDrift', () => {
  it.each(CASES)('$name', ({ schema, tsFields, expected }) => {
    expect(schemaFieldDrift(schema, tsFields)).toEqual(expected);
  });
});
