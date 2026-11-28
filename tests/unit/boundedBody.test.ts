import { describe, expect, it } from 'vitest';
import { readBoundedBody, readBoundedJson, asJsonObject } from '../../supabase/functions/_shared/boundedBody';

const MAX = 65536;

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

const reqOf = (body: ReadableStream<Uint8Array> | string, headers: Record<string, string> = {}) =>
  new Request('https://example.test/fn', {
    method: 'POST',
    headers,
    body: body as any,
    duplex: 'half',
  } as RequestInit);

describe('readBoundedBody — streaming byte cap', () => {
  it('reads a small body fully', async () => {
    const res = await readBoundedBody(reqOf('{"a":1}'), MAX);
    expect(res).toEqual({ ok: true, text: '{"a":1}' });
  });

  it('treats a missing body as empty text', async () => {
    const res = await readBoundedBody(new Request('https://example.test/fn', { method: 'POST' }), MAX);
    expect(res).toEqual({ ok: true, text: '' });
  });

  it.each([MAX - 1, MAX])('accepts a body at or under %d bytes', async (n) => {
    const res = await readBoundedBody(reqOf(streamOf('x'.repeat(n))), MAX);
    expect(res.ok).toBe(true);
  });

  it('rejects a single oversized chunk', async () => {
    const res = await readBoundedBody(reqOf(streamOf('x'.repeat(MAX + 1))), MAX);
    expect(res).toEqual({ ok: false, reason: 'too_large' });
  });

  it('rejects overflow accumulated across multiple chunks', async () => {
    const res = await readBoundedBody(
      reqOf(streamOf('a'.repeat(30_000), 'b'.repeat(30_000), 'c'.repeat(10_000))),
      MAX,
    );
    expect(res).toEqual({ ok: false, reason: 'too_large' });
  });

  it('counts bytes, not characters — multibyte UTF-8 cannot bypass the cap', async () => {
    // 30k '€' chars = 90k bytes: under a char-length check but over the byte cap.
    const res = await readBoundedBody(reqOf(streamOf('€'.repeat(30_000))), MAX);
    expect(res).toEqual({ ok: false, reason: 'too_large' });
  });

  it('ignores a misleading small Content-Length header', async () => {
    const res = await readBoundedBody(
      reqOf(streamOf('z'.repeat(MAX + 1)), { 'content-length': '10' }),
      MAX,
    );
    expect(res).toEqual({ ok: false, reason: 'too_large' });
  });

  it('reports read_failed when the stream errors mid-flight', async () => {
    const failing = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('partial'));
        controller.error(new Error('boom'));
      },
    });
    const res = await readBoundedBody(reqOf(failing), MAX);
    expect(res).toEqual({ ok: false, reason: 'read_failed' });
  });

  it('reports read_failed on an already-disturbed body instead of throwing', async () => {
    const req = reqOf('consumed');
    await req.text(); // locks the stream — getReader() would TypeError
    const res = await readBoundedBody(req, MAX);
    expect(res).toEqual({ ok: false, reason: 'read_failed' });
  });

  it('cancels a lazy stream on overflow without buffering the remainder', async () => {
    let pulls = 0;
    let cancelled = false;
    const lazy = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls++;
        if (pulls <= 10) controller.enqueue(new TextEncoder().encode('x'.repeat(10_000)));
        else controller.close();
      },
      cancel() {
        cancelled = true;
      },
    });
    const res = await readBoundedBody(reqOf(lazy), MAX);
    expect(res).toEqual({ ok: false, reason: 'too_large' });
    expect(cancelled).toBe(true);
    expect(pulls).toBeLessThan(10); // stopped at ~70KB, never read the tail
  });
});

describe('readBoundedJson — public-endpoint parse helper', () => {
  it('parses a valid JSON object body', async () => {
    const res = await readBoundedJson(reqOf('{"a":1}'));
    expect(res).toEqual({ ok: true, json: { a: 1 } });
  });

  it('maps overflow to too_large and garbage to malformed_json', async () => {
    expect(await readBoundedJson(reqOf(streamOf('x'.repeat(65537))))).toEqual({
      ok: false,
      reason: 'too_large',
    });
    expect(await readBoundedJson(reqOf('not json{'))).toEqual({
      ok: false,
      reason: 'malformed_json',
    });
  });

  it('returns an empty object for an empty body (legacy catch semantics)', async () => {
    const res = await readBoundedJson(new Request('https://example.test/fn', { method: 'POST' }));
    expect(res).toEqual({ ok: true, json: {} });
  });
});

describe('asJsonObject — endpoint body-shape gate', () => {
  it.each([
    ['plain object', { a: 1 }, true],
    ['empty object', {}, true],
    ['null', null, false],
    ['array', [1, 2], false],
    ['empty array', [], false],
    ['string', 'x', false],
    ['number', 5, false],
    ['boolean', true, false],
    ['undefined', undefined, false],
  ])('accepts %s only when it is a plain object', (_label, value, expected) => {
    expect(asJsonObject(value) != null).toBe(expected);
  });
});
