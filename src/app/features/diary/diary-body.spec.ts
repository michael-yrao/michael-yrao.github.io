import { DiaryBlock, DiarySpan, blocksOf } from './diary-body';

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
