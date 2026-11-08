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
      provider: 'qwen',
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
      provider: 'qwen',
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
