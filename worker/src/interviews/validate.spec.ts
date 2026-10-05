import { describe, expect, it } from 'vitest';
import { CIPHERTEXT_MAX_LENGTH } from './contract';
import { isValidId, parseBearer, parsePutBody } from './validate';

const ID = 'A'.repeat(32);
const KEY = 'B'.repeat(87);
const IV = 'C'.repeat(16);
const TOKEN = 'D'.repeat(43);

const valid = { v: 1, rev: 1, candidateId: ID, publicRaw: KEY, iv: IV, ciphertext: 'abc' };
const without = (key: string) => Object.fromEntries(Object.entries(valid).filter(([k]) => k !== key));

describe('parsePutBody', () => {
  const cases: Array<[string, unknown, boolean]> = [
    ['valid', valid, true],
    ['missing key', without('iv'), false],
    ['extra key', { ...valid, extra: 1 }, false],
    ['v not 1', { ...valid, v: 2 }, false],
    ['rev 0', { ...valid, rev: 0 }, false],
    ['rev -1', { ...valid, rev: -1 }, false],
    ['rev 1.5', { ...valid, rev: 1.5 }, false],
    ['rev beyond safe range', { ...valid, rev: Number.MAX_SAFE_INTEGER + 1 }, false],
    ['candidateId too short', { ...valid, candidateId: 'A'.repeat(31) }, false],
    ['candidateId bad character', { ...valid, candidateId: `${'A'.repeat(31)}+` }, false],
    ['publicRaw too long', { ...valid, publicRaw: 'B'.repeat(88) }, false],
    ['publicRaw bad character', { ...valid, publicRaw: `${'B'.repeat(86)}=` }, false],
    ['iv 15 characters', { ...valid, iv: 'C'.repeat(15) }, false],
    ['iv 17 characters', { ...valid, iv: 'C'.repeat(17) }, false],
    ['ciphertext empty', { ...valid, ciphertext: '' }, false],
    ['ciphertext at the cap', { ...valid, ciphertext: 'E'.repeat(CIPHERTEXT_MAX_LENGTH) }, true],
    ['ciphertext one over the cap', { ...valid, ciphertext: 'E'.repeat(CIPHERTEXT_MAX_LENGTH + 1) }, false],
    ['ciphertext bad character', { ...valid, ciphertext: 'ab c' }, false],
    ['not JSON (a string)', 'not json', false],
    ['null', null, false],
    ['array', [valid], false],
  ];
  it.each(cases)('%s', (_name, input, isAccepted) => {
    expect(parsePutBody(input) !== null).toBe(isAccepted);
  });
});

describe('parseBearer', () => {
  const cases: Array<[string, string | null, string | null]> = [
    ['valid', `Bearer ${TOKEN}`, TOKEN],
    ['missing header', null, null],
    ['wrong scheme', `Basic ${TOKEN}`, null],
    ['42 characters', `Bearer ${'D'.repeat(42)}`, null],
    ['44 characters', `Bearer ${'D'.repeat(44)}`, null],
    ['two spaces', `Bearer  ${TOKEN}`, null],
    ['bad character', `Bearer ${'D'.repeat(42)}+`, null],
  ];
  it.each(cases)('%s', (_name, header, expected) => {
    expect(parseBearer(header)).toBe(expected);
  });
});

describe('isValidId', () => {
  const cases: Array<[string, string, boolean]> = [
    ['valid', ID, true],
    ['31 characters', 'A'.repeat(31), false],
    ['33 characters', 'A'.repeat(33), false],
    ['bad character', `${'A'.repeat(31)}.`, false],
    ['empty', '', false],
  ];
  it.each(cases)('%s', (_name, id, expected) => {
    expect(isValidId(id)).toBe(expected);
  });
});
