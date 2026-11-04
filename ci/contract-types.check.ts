import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { DriftEntry, DriftKind, schemaFieldDrift, SchemaObjectNode, TsField } from './schema-field-drift';

// Compares each cse-progress contract schema's object definitions with the hand-written TS
// interfaces that mirror them, field by field (name and required/optional). Only
// `schemaVersion` is checked at runtime, so a renamed schema field would otherwise read as
// `undefined` on the site and nothing would fail.

const MODELS_DIR = fileURLToPath(new URL('../src/app/core/models', import.meta.url));
const TOP_LEVEL_POINTER = '#';
const REF_KEY = '$ref';
const DEFINITIONS_PREFIX = '#/definitions/';

interface ContractMirror {
  readonly schemaEnvVar: string;
  readonly pointer: string;
  readonly modelFile: string;
  readonly interfaceName: string;
}

/** Schema definition (env var + JSON pointer) to the TS interface that mirrors it. */
const MIRRORS: readonly ContractMirror[] = [
  { schemaEnvVar: 'PROGRESS_SCHEMA_JSON', pointer: '#', modelFile: 'progress.model.ts', interfaceName: 'ProgressData' },
  { schemaEnvVar: 'PROGRESS_SCHEMA_JSON', pointer: '#/definitions/summary', modelFile: 'progress.model.ts', interfaceName: 'ProgressSummary' },
  { schemaEnvVar: 'PROGRESS_SCHEMA_JSON', pointer: '#/definitions/problem', modelFile: 'progress.model.ts', interfaceName: 'ProblemProgress' },
  { schemaEnvVar: 'PROGRESS_SCHEMA_JSON', pointer: '#/definitions/technique', modelFile: 'progress.model.ts', interfaceName: 'Technique' },
  { schemaEnvVar: 'PROGRESS_SCHEMA_JSON', pointer: '#/definitions/probe', modelFile: 'progress.model.ts', interfaceName: 'Probe' },
  { schemaEnvVar: 'PROGRESS_SCHEMA_JSON', pointer: '#/definitions/workloadDay', modelFile: 'progress.model.ts', interfaceName: 'WorkloadDay' },
  { schemaEnvVar: 'PROGRESS_SCHEMA_JSON', pointer: '#/definitions/scheduleWeek', modelFile: 'progress.model.ts', interfaceName: 'Schedule' },
  { schemaEnvVar: 'PROGRESS_SCHEMA_JSON', pointer: '#/definitions/scheduleDay', modelFile: 'progress.model.ts', interfaceName: 'ScheduleDay' },
  { schemaEnvVar: 'PROGRESS_SCHEMA_JSON', pointer: '#/definitions/scheduleItem', modelFile: 'progress.model.ts', interfaceName: 'ScheduleItem' },
  { schemaEnvVar: 'PRACTICE_SCHEMA_JSON', pointer: '#', modelFile: 'practice.model.ts', interfaceName: 'PracticeData' },
  { schemaEnvVar: 'PRACTICE_SCHEMA_JSON', pointer: '#/definitions/problem', modelFile: 'practice.model.ts', interfaceName: 'PracticeProblem' },
  { schemaEnvVar: 'PRACTICE_SCHEMA_JSON', pointer: '#/definitions/types', modelFile: 'practice.model.ts', interfaceName: 'TypeSpec' },
  { schemaEnvVar: 'PRACTICE_SCHEMA_JSON', pointer: '#/definitions/case', modelFile: 'practice.model.ts', interfaceName: 'PracticeCase' },
  { schemaEnvVar: 'BIG_O_SCHEMA_JSON', pointer: '#', modelFile: 'big-o.model.ts', interfaceName: 'BigOData' },
  { schemaEnvVar: 'BIG_O_SCHEMA_JSON', pointer: '#/definitions/entry', modelFile: 'big-o.model.ts', interfaceName: 'BigOEntry' },
  { schemaEnvVar: 'BIG_O_SCHEMA_JSON', pointer: '#/definitions/segment', modelFile: 'showcase.model.ts', interfaceName: 'ShowcaseSegment' },
  { schemaEnvVar: 'CHEAT_SHEETS_SCHEMA_JSON', pointer: '#', modelFile: 'cheat-sheet.model.ts', interfaceName: 'CheatSheetsData' },
  { schemaEnvVar: 'CHEAT_SHEETS_SCHEMA_JSON', pointer: '#/definitions/signal', modelFile: 'cheat-sheet.model.ts', interfaceName: 'SignalRow' },
  { schemaEnvVar: 'CHEAT_SHEETS_SCHEMA_JSON', pointer: '#/definitions/technique', modelFile: 'cheat-sheet.model.ts', interfaceName: 'Technique' },
  { schemaEnvVar: 'CHEAT_SHEETS_SCHEMA_JSON', pointer: '#/definitions/notWhenEntry', modelFile: 'cheat-sheet.model.ts', interfaceName: 'NotWhen' },
  { schemaEnvVar: 'CHEAT_SHEETS_SCHEMA_JSON', pointer: '#/definitions/variant', modelFile: 'cheat-sheet.model.ts', interfaceName: 'Variant' },
  { schemaEnvVar: 'CHEAT_SHEETS_SCHEMA_JSON', pointer: '#/definitions/keyProblem', modelFile: 'cheat-sheet.model.ts', interfaceName: 'KeyProblem' },
  { schemaEnvVar: 'SHOWCASE_SCHEMA_JSON', pointer: '#', modelFile: 'showcase.model.ts', interfaceName: 'ShowcaseData' },
  { schemaEnvVar: 'SHOWCASE_SCHEMA_JSON', pointer: '#/definitions/entry', modelFile: 'showcase.model.ts', interfaceName: 'ShowcaseEntry' },
  { schemaEnvVar: 'SHOWCASE_SCHEMA_JSON', pointer: '#/definitions/segment', modelFile: 'showcase.model.ts', interfaceName: 'ShowcaseSegment' },
  { schemaEnvVar: 'PATTERN_SENSE_SCHEMA_JSON', pointer: '#', modelFile: 'pattern-sense.model.ts', interfaceName: 'PatternSenseData' },
  { schemaEnvVar: 'PATTERN_SENSE_SCHEMA_JSON', pointer: '#/properties/families/items', modelFile: 'pattern-sense.model.ts', interfaceName: 'PatternSenseFamily' },
  { schemaEnvVar: 'PATTERN_SENSE_SCHEMA_JSON', pointer: '#/properties/problems/items', modelFile: 'pattern-sense.model.ts', interfaceName: 'PatternSenseProblem' },
];

/** Schemas whose definitions are listed in the report when no MIRRORS row covers them. */
const SCHEMA_ENV_VARS = [...new Set(MIRRORS.map((mirror) => mirror.schemaEnvVar))];

interface KnownDrift {
  readonly contract: string;
  readonly field: string;
  readonly kind: DriftKind;
  readonly since: string;
}

/** Drift that exists today and is accepted until fixed. An entry that stops drifting fails the
 *  check, so delete it the moment its field is repaired. */
const KNOWN_DRIFT: readonly KnownDrift[] = [
  { contract: 'PROGRESS_SCHEMA_JSON # -> ProgressData', field: 'badges', kind: 'missing-in-ts', since: '2026-11-04' },
  { contract: 'PROGRESS_SCHEMA_JSON # -> ProgressData', field: 'coverage', kind: 'required-mismatch', since: '2026-11-04' },
  { contract: 'PROGRESS_SCHEMA_JSON #/definitions/summary -> ProgressSummary', field: 'badges', kind: 'missing-in-ts', since: '2026-11-04' },
  { contract: 'PROGRESS_SCHEMA_JSON #/definitions/summary -> ProgressSummary', field: 'coverage', kind: 'required-mismatch', since: '2026-11-04' },
  { contract: 'PROGRESS_SCHEMA_JSON #/definitions/problem -> ProblemProgress', field: 'level', kind: 'required-mismatch', since: '2026-11-04' },
  { contract: 'PROGRESS_SCHEMA_JSON #/definitions/problem -> ProblemProgress', field: 'streak', kind: 'required-mismatch', since: '2026-11-04' },
  { contract: 'PROGRESS_SCHEMA_JSON #/definitions/technique -> Technique', field: 'bestComfort', kind: 'required-mismatch', since: '2026-11-04' },
  { contract: 'PROGRESS_SCHEMA_JSON #/definitions/scheduleDay -> ScheduleDay', field: 'label', kind: 'required-mismatch', since: '2026-11-04' },
  { contract: 'PRACTICE_SCHEMA_JSON #/definitions/problem -> PracticeProblem', field: 'decodeSignature', kind: 'missing-in-ts', since: '2026-11-04' },
  { contract: 'PRACTICE_SCHEMA_JSON #/definitions/problem -> PracticeProblem', field: 'difficulty', kind: 'required-mismatch', since: '2026-11-04' },
  { contract: 'PRACTICE_SCHEMA_JSON #/definitions/types -> TypeSpec', field: 'result', kind: 'required-mismatch', since: '2026-11-04' },
  { contract: 'CHEAT_SHEETS_SCHEMA_JSON # -> CheatSheetsData', field: 'decisionTree', kind: 'required-mismatch', since: '2026-11-04' },
];

type JsonNode = Record<string, unknown>;

function readSchema(envVar: string): JsonNode {
  const path = process.env[envVar];
  if (!path) {
    throw new Error(`${envVar} is not set — point it at the schema file scripts/fetch-content.mjs fetched.`);
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as JsonNode;
  } catch (err) {
    throw new Error(`Could not read ${envVar} at "${path}": ${(err as Error).message}`);
  }
}

/** Follows a local `$ref` (`#/a/b`) from the schema root. */
function followRef(root: JsonNode, node: JsonNode): JsonNode {
  const ref = node[REF_KEY];
  return typeof ref === 'string' ? resolvePointer(root, ref) : node;
}

function resolvePointer(root: JsonNode, pointer: string): JsonNode {
  const steps = pointer.split('/').slice(1);
  let node = followRef(root, root);
  for (const step of steps) {
    const next = node[step] as JsonNode | undefined;
    if (!next) throw new Error(`Schema pointer "${pointer}" does not resolve at "${step}".`);
    node = followRef(root, next);
  }
  return node;
}

function propertyName(name: ts.PropertyName): string {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : name.getText();
}

/** The fields of a named interface in a source file, own fields plus those of same-file `extends`. */
function interfaceFields(source: ts.SourceFile, interfaceName: string): TsField[] {
  const declaration = source.statements.find(
    (statement): statement is ts.InterfaceDeclaration =>
      ts.isInterfaceDeclaration(statement) && statement.name.text === interfaceName,
  );
  if (!declaration) throw new Error(`Interface ${interfaceName} not found in ${source.fileName}.`);
  const own = declaration.members.filter(ts.isPropertySignature).map((member) => ({
    name: propertyName(member.name),
    optional: member.questionToken !== undefined,
  }));
  const inherited = (declaration.heritageClauses ?? [])
    .flatMap((clause) => clause.types)
    .flatMap((type) => interfaceFields(source, type.expression.getText()));
  return [...inherited, ...own];
}

function readModel(modelFile: string): ts.SourceFile {
  const path = resolve(MODELS_DIR, modelFile);
  return ts.createSourceFile(path, readFileSync(path, 'utf-8'), ts.ScriptTarget.Latest, true);
}

interface MirrorResult {
  readonly contract: string;
  readonly drift: readonly DriftEntry[];
}

function compareMirror(mirror: ContractMirror): MirrorResult {
  const schema = resolvePointer(readSchema(mirror.schemaEnvVar), mirror.pointer);
  const fields = interfaceFields(readModel(mirror.modelFile), mirror.interfaceName);
  return {
    contract: `${mirror.schemaEnvVar} ${mirror.pointer} -> ${mirror.interfaceName}`,
    drift: schemaFieldDrift(schema as SchemaObjectNode, fields),
  };
}

function unmirroredDefinitions(): string[] {
  const mirrored = new Set(MIRRORS.map((mirror) => `${mirror.schemaEnvVar} ${mirror.pointer}`));
  return SCHEMA_ENV_VARS.flatMap((envVar) => {
    const definitions = (readSchema(envVar)['definitions'] ?? {}) as JsonNode;
    return Object.keys(definitions)
      .map((name) => `${envVar} ${DEFINITIONS_PREFIX}${name}`)
      .filter((label) => !mirrored.has(label));
  });
}

/** A drift entry's identity as KNOWN_DRIFT writes it. */
function driftKey(contract: string, entry: { field: string; kind: DriftKind }): string {
  return `${contract}|${entry.field}|${entry.kind}`;
}

describe('contract schemas vs TS mirrors', () => {
  const results = MIRRORS.map(compareMirror);
  const knownKeys = new Set(
    KNOWN_DRIFT.map((known) => driftKey(known.contract, known)),
  );
  const failures = results.flatMap(({ contract, drift }) =>
    drift.filter((entry) => !entry.isWarning).map((entry) => ({ contract, ...entry })),
  );
  const warnings = results.flatMap(({ contract, drift }) =>
    drift.filter((entry) => entry.isWarning).map((entry) => ({ contract, ...entry })),
  );

  it('has no field drift beyond the known list', () => {
    for (const entry of warnings) {
      console.warn(`WARN  ${entry.contract}: ${entry.field} (${entry.kind}, schema is open)`);
    }
    for (const entry of unmirroredDefinitions()) {
      console.info(`NO TS MIRROR  ${entry}`);
    }
    const unexpected = failures.filter((entry) => !knownKeys.has(driftKey(entry.contract, entry)));
    for (const entry of failures) {
      console.error(`DRIFT ${entry.contract}: ${entry.field} (${entry.kind})`);
    }
    expect(unexpected).toEqual([]);
  });

  it('lists no known drift that has stopped drifting', () => {
    const currentKeys = new Set(failures.map((entry) => driftKey(entry.contract, entry)));
    const stale = [...knownKeys].filter((key) => !currentKeys.has(key));
    expect(stale).toEqual([]);
  });
});
