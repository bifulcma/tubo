import { describe, it, expect, vi } from 'vitest';
import { reviewVideo } from './searchOrchestrator';
import { DEFAULT_SETTINGS } from './storage';

function sse(text: string) {
  const enc = new TextEncoder();
  const chunks = [`event: meta\ndata: {}\n\n`, `event: text\ndata: ${JSON.stringify({ t: text })}\n\n`, `event: done\ndata: {}\n\n`];
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(c) { if (i < chunks.length) c.enqueue(enc.encode(chunks[i++])); else c.close(); },
  });
}

describe('reviewVideo', () => {
  const video = {
    id: 'abc12345678', title: 'Lezione su Schmitt', channelTitle: 'Uni', channelId: 'UC1',
    description: 'Una lezione sul katechon.', duration: '1:00:00', durationSec: 3600, viewCount: 10,
    publishedAt: '2024-01-01', thumbnailUrl: '', aiScore: 8, aiReason: 'rigorosa', aiQuery: 'Schmitt katechon',
  };
  const settings = { ...DEFAULT_SETTINGS, bridgeUrl: 'https://ponte.esempio.ts.net:8443', bridgeToken: 'x', demoMode: false };

  it('restituisce riassunto e commento e manda la richiesta originale', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      body: sse('Ecco: {"riassunto": "Parla del katechon.", "commento": "Voto alto perché rigorosa."}'),
    });
    const r = await reviewVideo({ video, provider: 'nemotron', settings, fetchFn: fetchFn as any });
    expect(r.riassunto).toBe('Parla del katechon.');
    expect(r.commento).toContain('rigorosa');
    const body = JSON.parse(fetchFn.mock.calls[0][1].body);
    expect(body.provider).toBe('nemotron');
    expect(body.messages[0].content).toContain('Schmitt katechon');
  });

  it('segnala una risposta senza JSON', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200, body: sse('non so') });
    await expect(reviewVideo({ video, provider: 'nemotron', settings, fetchFn: fetchFn as any })).rejects.toThrow('formato atteso');
  });
});
