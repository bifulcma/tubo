import { describe, it, expect, vi } from 'vitest';
import { askBridge, parseBridgeSseStream, normalizeBridgeUrl } from './ponte';

function createMockReadableStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });
}

describe('ponte.ts', () => {
  it('normalizza gli indirizzi del ponte', () => {
    expect(normalizeBridgeUrl('https://example.com/')).toBe('https://example.com');
    expect(normalizeBridgeUrl('https://example.com///')).toBe('https://example.com');
    expect(normalizeBridgeUrl('https://example.com:8443')).toBe('https://example.com:8443');
  });

  it('parsifica lo stream SSE concatenando i frammenti di testo e ignorando thinking', async () => {
    const sseData = [
      'event: meta\ndata: {"session": "123"}\n\n',
      'event: thinking\ndata: {"thought": "sto pensando alla risposta..."}\n\n',
      'event: text\ndata: {"t": "Ciao "}\n\n',
      'event: thinking\ndata: {"thought": "ancora riflessioni..."}\n\n',
      'event: text\ndata: {"t": "mondo!"}\n\n',
      'event: done\ndata: {}\n\n',
    ];

    const stream = createMockReadableStream(sseData);
    const result = await parseBridgeSseStream(stream);

    expect(result).toBe('Ciao mondo!');
  });

  it('supporta la callback onChunk durante lo streaming', async () => {
    const sseData = [
      'event: text\ndata: {"t": "Passo 1: "}\n\n',
      'event: text\ndata: {"t": "Completato."}\n\n',
      'event: done\ndata: {}\n\n',
    ];

    const chunks: string[] = [];
    const stream = createMockReadableStream(sseData);
    const result = await parseBridgeSseStream(stream, (chunk) => chunks.push(chunk));

    expect(result).toBe('Passo 1: Completato.');
    expect(chunks).toEqual(['Passo 1: ', 'Completato.']);
  });

  it('lancia un BridgeError quando riceve un evento error nello stream', async () => {
    const sseData = [
      'event: meta\ndata: {}\n\n',
      'event: error\ndata: {"message": "Limite di token superato dal provider"}\n\n',
    ];

    const stream = createMockReadableStream(sseData);
    await expect(parseBridgeSseStream(stream)).rejects.toThrow(
      'Limite di token superato dal provider'
    );
  });

  it('effettua la chiamata POST corretta con intestazioni e corpo specificati', async () => {
    const mockResponseStream = createMockReadableStream([
      'event: text\ndata: {"t": "Risultato AI"}\n\n',
      'event: done\ndata: {}\n\n',
    ]);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: mockResponseStream,
    });

    const response = await askBridge({
      bridgeUrl: 'https://ponte.esempio.ts.net:8443',
      token: 'segreto123',
      provider: 'nemotron',
      system: 'Sei un assistente per la ricerca video',
      prompt: 'Carl Schmitt katechon',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(response).toBe('Risultato AI');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://ponte.esempio.ts.net:8443/ask');
    expect(init.method).toBe('POST');
    expect(init.headers['Authorization']).toBe('Bearer segreto123');
    expect(init.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(init.body);
    expect(body).toEqual({
      provider: 'nemotron',
      model: '',
      system: 'Sei un assistente per la ricerca video',
      messages: [{ role: 'user', content: 'Carl Schmitt katechon' }],
      web: false,
    });
  });

  it('gestisce gli errori HTTP del server ponte', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: vi.fn().mockResolvedValue({ message: 'Token non valido' }),
    });

    await expect(
      askBridge({
        bridgeUrl: 'https://test-bridge.local',
        token: 'token-errato',
        provider: 'argon',
        prompt: 'test',
        fetchFn: mockFetch as unknown as typeof fetch,
      })
    ).rejects.toThrow('Token non valido');
  });

  it('gestisce errore se manca bridgeUrl', async () => {
    await expect(
      askBridge({
        bridgeUrl: '',
        token: '',
        provider: 'claude',
        prompt: 'test',
      })
    ).rejects.toThrow('Indirizzo del ponte AI non configurato.');
  });
});

describe('trascrizione', () => {
  it('raggruppa a blocchi di 30 secondi con orario', async () => {
    const { transcriptToText } = await import('./ponte');
    const t = transcriptToText([{ t: 0, s: 'uno' }, { t: 10, s: 'due' }, { t: 31, s: 'tre' }, { t: 3700, s: 'quattro' }]);
    expect(t).toBe('[0:00] uno due tre\n[1:01:40] quattro');
  });

  it('chiama GET /trascrizione con il token e restituisce i pezzi', async () => {
    const { fetchTranscript } = await import('./ponte');
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, segmenti: [{ t: 1, s: 'ciao' }] }) });
    const segs = await fetchTranscript({ bridgeUrl: 'https://ponte.esempio.ts.net:8443/', token: ' x ', videoId: 'abc12345678', fetchFn: fetchFn as any });
    expect(segs).toEqual([{ t: 1, s: 'ciao' }]);
    expect(fetchFn.mock.calls[0][0]).toBe('https://ponte.esempio.ts.net:8443/trascrizione?v=abc12345678');
    expect(fetchFn.mock.calls[0][1].headers.Authorization).toBe('Bearer x');
  });

  it('spiega quando il video non ha sottotitoli', async () => {
    const { fetchTranscript } = await import('./ponte');
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: 'Questo video non ha sottotitoli.' }) });
    await expect(fetchTranscript({ bridgeUrl: 'https://p', token: 'x', videoId: 'abc12345678', fetchFn: fetchFn as any })).rejects.toThrow('sottotitoli');
  });
});
