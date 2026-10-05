import { decodeBase64Url, encodeBase64Url } from './host-key';
import { PROBLEM_JSON_MAX_LENGTH, SignedProblem } from './interview-problem';
import { isSignedProblem } from './session-message';

/**
 * A prepared problem packed into an interviewer link's fragment: `p=<codec>.<rev>.<signature>.<data>`.
 * `data` is base64url of the problem's JSON text (UTF-8), deflate-compressed when the codec is `d`.
 * The fragment is external input, so decoding checks it before it spends memory on it.
 */

export const LINK_PROBLEM_PARAM = 'p';

const DEFLATE_CODEC = 'd';
const PLAIN_CODEC = 'u';
const DEFLATE_FORMAT = 'deflate-raw';
const PART_SEPARATOR = '.';
const PART_COUNT = 4;
const REV_PATTERN = /^\d{1,16}$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
/** UTF-16 text of `PROBLEM_JSON_MAX_LENGTH` units is at most 3 bytes per unit in UTF-8; the same bound caps a decompressed stream. */
const MAX_JSON_BYTES = 3 * PROBLEM_JSON_MAX_LENGTH;
const BASE64_CHARS_PER_BYTE_GROUP = 4;
const BYTES_PER_BASE64_GROUP = 3;
const MAX_DATA_LENGTH = Math.ceil((MAX_JSON_BYTES * BASE64_CHARS_PER_BYTE_GROUP) / BYTES_PER_BASE64_GROUP);
/** The codec, revision, signature and separators around `data`, with room to spare. */
const HEADER_ALLOWANCE = 128;
const MAX_VALUE_LENGTH = MAX_DATA_LENGTH + HEADER_ALLOWANCE;

/** The value of `p=` in a URL fragment (with or without the leading `#`), or null when it has none. */
export function linkProblemValue(fragment: string | null): string | null {
  if (fragment === null) {
    return null;
  }
  const value = new URLSearchParams(fragment.replace(/^#/, '')).get(LINK_PROBLEM_PARAM);
  return value === null || value === '' ? null : value;
}

function joinChunks(chunks: readonly Uint8Array[], total: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    bytes.set(chunk, offset);
    offset += chunk.length;
  });
  return bytes;
}

/** Everything `readable` yields, or null (the stream cancelled) once it would pass `maxBytes`. */
async function readCapped(readable: ReadableStream<Uint8Array>, maxBytes: number): Promise<Uint8Array<ArrayBuffer> | null> {
  const reader = readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      return joinChunks(chunks, total);
    }
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
}

/** Runs `bytes` through `stream`; writing is not awaited, since reading is what drives it and what reports its errors. */
function throughStream(
  stream: { readonly writable: WritableStream<BufferSource>; readonly readable: ReadableStream<Uint8Array> },
  bytes: Uint8Array<ArrayBuffer>,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const writer = stream.writable.getWriter();
  void writer
    .write(bytes)
    .then(() => writer.close())
    .catch(() => undefined);
  return readCapped(stream.readable, maxBytes);
}

/** The deflated bytes, or null when this browser cannot compress or compressing failed. */
async function deflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer> | null> {
  if (typeof CompressionStream === 'undefined') {
    return null;
  }
  try {
    return await throughStream(new CompressionStream(DEFLATE_FORMAT), bytes, Infinity);
  } catch {
    return null;
  }
}

/** The inflated bytes, or null when the stream is malformed, past the cap, or this browser cannot decompress. */
async function inflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer> | null> {
  if (typeof DecompressionStream === 'undefined') {
    return null;
  }
  try {
    return await throughStream(new DecompressionStream(DEFLATE_FORMAT), bytes, MAX_JSON_BYTES);
  } catch {
    return null;
  }
}

/** `<codec>.<rev>.<signature>.<data>`: compressed when the browser can, plain otherwise. */
export async function encodeLinkProblem(signed: SignedProblem): Promise<string> {
  const plain = new TextEncoder().encode(signed.json);
  const compressed = await deflate(plain);
  const codec = compressed === null ? PLAIN_CODEC : DEFLATE_CODEC;
  return [codec, String(signed.rev), signed.signature, encodeBase64Url(compressed ?? plain)].join(PART_SEPARATOR);
}

function textOf(bytes: Uint8Array<ArrayBuffer>): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

async function dataBytes(codec: string, data: string): Promise<Uint8Array<ArrayBuffer> | null> {
  if (data.length === 0 || data.length > MAX_DATA_LENGTH || !BASE64URL_PATTERN.test(data)) {
    return null;
  }
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = decodeBase64Url(data);
  } catch {
    return null;
  }
  if (codec === DEFLATE_CODEC) {
    return inflate(bytes);
  }
  return codec === PLAIN_CODEC && bytes.length <= MAX_JSON_BYTES ? bytes : null;
}

/** The signed problem a link value carries, or null on any failure (nothing here throws). The signature is not checked here. */
export async function decodeLinkProblem(value: string): Promise<SignedProblem | null> {
  if (value.length > MAX_VALUE_LENGTH) {
    return null;
  }
  const parts = value.split(PART_SEPARATOR);
  if (parts.length !== PART_COUNT || !REV_PATTERN.test(parts[1])) {
    return null;
  }
  const [codec, revText, signature, data] = parts;
  const bytes = await dataBytes(codec, data);
  const json = bytes === null ? null : textOf(bytes);
  const candidate = { rev: Number(revText), json, signature };
  return isSignedProblem(candidate) ? candidate : null;
}
