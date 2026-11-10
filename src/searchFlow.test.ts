import { describe, it, expect, vi } from 'vitest';
import { normalizePlan, linguaRicerca, executeAiSearch } from './searchOrchestrator';
import { AppSettings, SearchStatus } from './types';

const demo: AppSettings = { youtubeApiKey: '', bridgeUrl: '', bridgeToken: '', defaultProvider: 'nemotron', demoMode: true, theme: 'dark', aiLanguage: 'it', videoLanguages: [] };
const reale: AppSettings = { ...demo, youtubeApiKey: 'k', bridgeUrl: 'https://ponte.test', bridgeToken: 't', demoMode: false };

/** Risposta finta del ponte (stream SSE con un solo pezzo di testo). */
export function rispostaPonte(testo: string) {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(enc.encode(`event: text\ndata: ${JSON.stringify({ t: testo })}\n\nevent: done\ndata: {}\n\n`));
      c.close();
    },
  });
  return { ok: true, status: 200, body };
}

describe('piano della ricerca', () => {
  it('accetta il vecchio formato a stringhe', () => {
    const p = normalizePlan({ ricerche: ['a', 'b'], lingue: ['de', 'it'], durata_minima_min: 20, escludi: ['x'] }, 'q');
    expect(p.ricerche).toEqual(['a', 'b']);
    expect(linguaRicerca(p.ricerche[0], p)).toBe('de');   // prima lingua per tutte
  });

  it('accetta il nuovo formato con la lingua per ricerca', () => {
    const p = normalizePlan({ ricerche: [{ q: 'Katechon Vorlesung', lingua: 'de' }, { q: 'katechon lezione', lingua: 'IT' }, { q: 'senza' }], lingue: ['it'] }, 'q');
    expect(linguaRicerca(p.ricerche[0], p)).toBe('de');
    expect(linguaRicerca(p.ricerche[1], p)).toBe('it');
    expect(linguaRicerca(p.ricerche[2], p)).toBe('it');
  });

  it('ripara un piano vuoto o storto', () => {
    const p = normalizePlan({ ricerche: [], lingue: 'it', durata_minima_min: 'boh' }, 'domanda');
    expect(p).toEqual({ ricerche: ['domanda'], lingue: ['it'], durata_minima_min: 0, escludi: [] });
  });
});

describe('annullare una ricerca', () => {
  it('una ricerca annullata si ferma senza errori rossi e senza risultati', async () => {
    const ctrl = new AbortController();
    const stati: SearchStatus[] = [];
    const p = executeAiSearch({ query: 'katechon', provider: 'nemotron', settings: demo, signal: ctrl.signal, onStatusUpdate: (s) => stati.push(s) });
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
    expect(stati.some((s) => s.step === 'error')).toBe(false);
    expect(stati.some((s) => s.step === 'done')).toBe(false);
  });
});

describe('ricerca reale con fetch finto (nessuna chiamata vera)', () => {
  it('lingua per ricerca, durata, canali in un\'unica chiamata, descrizione 800 caratteri al passo 3', async () => {
    const lunga = 'd'.repeat(1000);
    const chiamatePonte: any[] = [];
    const urlYouTube: URL[] = [];
    const fetchFn = vi.fn().mockImplementation(async (u: string, init?: any) => {
      if (u.startsWith('https://ponte.test')) {
        const body = JSON.parse(init.body);
        chiamatePonte.push(body);
        if (chiamatePonte.length === 1) {
          return rispostaPonte(JSON.stringify({ ricerche: [{ q: 'Katechon Vorlesung flusso', lingua: 'de' }, { q: 'katechon lezione flusso', lingua: 'it' }], lingue: ['it', 'de'], durata_minima_min: 30, escludi: [] }));
        }
        return rispostaPonte('```json\n[{"id":"v1","punteggio":9,"motivo":"ottimo","autore":"Prof. X","autorita":"alta"},{"id":"v2","punteggio":4,"motivo":"debole"}]\n```');
      }
      const url = new URL(u);
      urlYouTube.push(url);
      if (url.pathname.endsWith('/search')) {
        return { ok: true, json: async () => ({ items: [{ id: { videoId: url.searchParams.get('relevanceLanguage') === 'de' ? 'v1' : 'v2' } }] }) };
      }
      if (url.pathname.endsWith('/videos')) {
        return {
          ok: true,
          json: async () => ({
            items: ['v1', 'v2'].map((id) => ({ id, snippet: { title: 'T ' + id, channelId: 'UC' + id, channelTitle: 'C', description: lunga }, contentDetails: { duration: 'PT45M' } })),
          }),
        };
      }
      if (url.pathname.endsWith('/channels')) {
        return { ok: true, json: async () => ({ items: [{ id: 'UCv1', snippet: { title: 'C', description: 'Istituto di filosofia' }, statistics: { subscriberCount: '5000' } }] }) };
      }
      throw new Error('inatteso ' + u);
    });

    const videos = await executeAiSearch({ query: 'katechon flusso', provider: 'nemotron', settings: reale, onStatusUpdate: () => {}, fetchFn });

    const ricerche = urlYouTube.filter((u) => u.pathname.endsWith('/search'));
    expect(ricerche.map((u) => u.searchParams.get('relevanceLanguage'))).toEqual(['de', 'it']);
    expect(ricerche.every((u) => u.searchParams.get('videoDuration') === 'long')).toBe(true);
    const canali = urlYouTube.filter((u) => u.pathname.endsWith('/channels'));
    expect(canali).toHaveLength(1);
    expect(canali[0].searchParams.get('id')).toBe('UCv1,UCv2');

    const elenco = JSON.parse(chiamatePonte[1].messages[0].content.split('\n').slice(1).join('\n'));
    expect(elenco[0].descrizione).toHaveLength(800);
    expect(elenco[0].dati_canale.iscritti).toBe(5000);

    expect(videos[0].id).toBe('v1');
  });
});
