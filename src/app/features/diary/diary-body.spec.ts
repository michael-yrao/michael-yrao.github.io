import { DiaryBlock, DiarySpan, blocksOf, neighborsOf, swipeDirection } from './diary-body';
import { DiaryEntry } from './diary-contract';

const plain = (text: string): DiarySpan => ({ text, isBold: false, isItalic: false });
const bold = (text: string): DiarySpan => ({ text, isBold: true, isItalic: false });
const italic = (text: string): DiarySpan => ({ text, isBold: false, isItalic: true });

describe('blocksOf', () => {
  it.each<{ name: string; body: string; blocks: DiaryBlock[] }>([
    { name: 'a heading', body: '## Lorem', blocks: [{ kind: 'heading', spans: [plain('Lorem')] }] },
    { name: 'a plain paragraph', body: 'Lorem\n\nIpsum', blocks: [{ kind: 'paragraph', spans: [plain('Lorem')] }, { kind: 'paragraph', spans: [plain('Ipsum')] }] },
    { name: 'an all-"- " list', body: '- one\n- two', blocks: [{ kind: 'list', items: [[plain('one')], [plain('two')]] }] },
    { name: 'mixed lines stay a paragraph', body: '- one\ntwo', blocks: [{ kind: 'paragraph', spans: [plain('- one\ntwo')] }] },
    { name: 'bold', body: 'a **b** c', blocks: [{ kind: 'paragraph', spans: [plain('a '), bold('b'), plain(' c')] }] },
    { name: 'italic', body: 'a *b* c', blocks: [{ kind: 'paragraph', spans: [plain('a '), italic('b'), plain(' c')] }] },
    { name: 'an unclosed marker stays literal', body: 'a ** b and 2 * 3', blocks: [{ kind: 'paragraph', spans: [plain('a ** b and 2 * 3')] }] },
  ])('$name', ({ body, blocks }) => {
    expect(blocksOf(body)).toEqual(blocks);
  });
});

const entryOf = (id: string): DiaryEntry => ({ id, date: '2026-01-01', title: id, body: '', updatedAt: '2026-01-01T00:00:00Z' });

describe('neighborsOf', () => {
  const newest = entryOf('c');
  const middle = entryOf('b');
  const oldest = entryOf('a');
  it.each([
    { name: 'a middle entry', list: [newest, middle, oldest], id: 'b', previous: oldest, next: newest },
    { name: 'the newest entry', list: [newest, middle, oldest], id: 'c', previous: middle, next: null },
    { name: 'the oldest entry', list: [newest, middle, oldest], id: 'a', previous: null, next: middle },
    { name: 'the only entry', list: [middle], id: 'b', previous: null, next: null },
    { name: 'an unknown id', list: [newest, middle, oldest], id: 'gone', previous: null, next: null },
  ])('$name', ({ list, id, previous, next }) => {
    expect(neighborsOf(list, id)).toEqual({ previous, next });
  });
});

describe('swipeDirection', () => {
  const WIDTH = 400;
  it.each([
    { name: 'left past the threshold', start: { x: 300, y: 100 }, end: { x: 200, y: 110 }, result: 'next' },
    { name: 'right past the threshold', start: { x: 100, y: 100 }, end: { x: 200, y: 90 }, result: 'previous' },
    { name: 'just under the threshold', start: { x: 300, y: 100 }, end: { x: 241, y: 100 }, result: null },
    { name: 'mostly vertical', start: { x: 300, y: 100 }, end: { x: 200, y: 250 }, result: null },
    { name: 'a start inside the left edge zone', start: { x: 10, y: 100 }, end: { x: 150, y: 100 }, result: null },
    { name: 'a start inside the right edge zone', start: { x: 390, y: 100 }, end: { x: 250, y: 100 }, result: null },
  ])('$name', ({ start, end, result }) => {
    expect(swipeDirection(start, end, WIDTH)).toBe(result);
  });
});
