import { describe, it, expect, vi } from 'vitest';
import { applicaPeriodo, etichettaData, inizioPeriodo, nelPeriodo, normalizzaData, ordinaRisultati } from './periodo';
import { executeAiSearch, normalizePlan } from './searchOrchestrator';
import { parseHash, buildHash } from './router';
import { AppSettings, SearchPlan, VideoItem } from './types';

/** Risposta finta del ponte (stream SSE con un solo pezzo di testo). */
function rispostaPonte(testo: string) {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(enc.encode(`event: text\ndata: ${JSON.stringify({ t: testo })}\n\nevent: done\ndata: {}\n\n`));
      c.close();
    },
  });
  return { ok: true, status: 200, body };
}

const OGGI = new Date('2026-11-13T12:00:00');
const base: SearchPlan = { ricerche: ['x'], lingue: ['it'], durata_minima_min: 20, escludi: [] };
const v = (id: string, publishedAt: string, aiScore = 5) => ({ id, publishedAt, aiScore }) as VideoItem;

describe('periodo di pubblicazione', () => {
  it('normalizza le date dell\'AI', () => {
    expect(normalizzaData('2020')).toBe('2020-01-01');
    expect(normalizzaData('2022-2-24')).toBe('2022-02-24');
    expect(normalizzaData('2024-05-01T10:00:00Z')).toBe('2024-05-01');
    expect(normalizzaData(null)).toBeUndefined();
    expect(normalizzaData('ieri')).toBeUndefined();
  });

  it('il periodo scelto dall\'utente vince e accende l\'attualità fino a un anno', () => {
    expect(inizioPeriodo('auto', OGGI)).toBeUndefined();
    const p = applicaPeriodo({ ...base, pubblicato_dopo: '2015-01-01' }, '30g', OGGI);
    expect(p.pubblicato_dopo).toBe('2026-10-14');
    expect(p.attualita).toBe(true);
    const q = applicaPeriodo(base, '5a', OGGI);
    expect(q.pubblicato_dopo).toBe('2021-11-14');
    expect(q.attualita).toBe(false);
  });

  it('attualità senza date → ultimo anno; date impossibili o future ignorate', () => {
    expect(applicaPeriodo({ ...base, attualita: true }, 'auto', OGGI).pubblicato_dopo).toBe('2025-11-13');
    expect(applicaPeriodo(base, 'auto', OGGI).pubblicato_dopo).toBeUndefined();
    const r = applicaPeriodo({ ...base, pubblicato_dopo: '2022-01-01', pubblicato_prima: '2020-01-01' }, 'auto', OGGI);
    expect(r).toMatchObject({ pubblicato_dopo: '2022-01-01' });
    expect(r.pubblicato_prima).toBeUndefined();
    expect(applicaPeriodo({ ...base, pubblicato_dopo: '2030-01-01' }, 'auto', OGGI).pubblicato_dopo).toBeUndefined();
  });

  it('filtro per data e ordine con l\'attualità', () => {
    const p = { ...base, pubblicato_dopo: '2025-01-01', pubblicato_prima: '2026-01-01' };
    expect(nelPeriodo(v('a', '2025-06-01T00:00:00Z'), p)).toBe(true);
    expect(nelPeriodo(v('b', '2024-12-31T00:00:00Z'), p)).toBe(false);
    expect(nelPeriodo(v('c', '2026-02-01T00:00:00Z'), p)).toBe(false);
    expect(nelPeriodo(v('d', ''), p)).toBe(true);
    const lista = [v('vecchio', '2019-01-01', 8), v('nuovo', '2026-11-01', 8), v('top', '2010-01-01', 9)];
    expect(ordinaRisultati(lista, true).map((x) => x.id)).toEqual(['top', 'nuovo', 'vecchio']);
    expect(ordinaRisultati(lista, false).map((x) => x.id)).toEqual(['top', 'vecchio', 'nuovo']);
  });

  it('etichetta della data: sempre con l\'anno, «giorni fa» per i recentissimi', () => {
    expect(etichettaData('2019-03-10T10:00:00Z', OGGI)).toBe('mar 2019');
    expect(etichettaData('2026-11-10T10:00:00', OGGI)).toBe('3 giorni fa');
    expect(etichettaData('', OGGI)).toBeUndefined();
  });

  it('normalizePlan tiene attualità e date', () => {
    const p = normalizePlan({ ricerche: ['a'], attualita: true, pubblicato_dopo: '2026-10', pubblicato_prima: null }, 'q');
    expect(p).toMatchObject({ attualita: true, pubblicato_dopo: '2026-10-01' });
    expect(p.pubblicato_prima).toBeUndefined();
  });

  it('il periodo va nell\'indirizzo solo se scelto', () => {
    expect(buildHash({ page: 'search', q: 'guerra', ai: 'claude', periodo: '30g' })).toBe('#/cerca?q=guerra&ai=claude&periodo=30g');
    expect(parseHash('#/cerca?q=guerra&ai=claude&periodo=30g')).toEqual({ page: 'search', q: 'guerra', ai: 'claude', periodo: '30g' });
    expect(parseHash('#/cerca?q=guerra&periodo=boh')).toEqual({ page: 'search', q: 'guerra' });
    expect(buildHash({ page: 'search', q: 'guerra', periodo: 'auto' })).toBe('#/cerca?q=guerra');
  });
});

describe('ricerca di attualità con fetch finto', () => {
  it('manda publishedAfter a YouTube, la data al passo 3 e ordina i pari merito per data', async () => {
    const reale: AppSettings = { youtubeApiKey: 'k', bridgeUrl: 'https://ponte.test', bridgeToken: 't', defaultProvider: 'nemotron', demoMode: false, theme: 'dark', aiLanguage: 'it', videoLanguages: [] };
    const ponte: any[] = [];
    const yt: URL[] = [];
    const fetchFn = vi.fn().mockImplementation(async (u: string, init?: any) => {
      if (u.startsWith('https://ponte.test')) {
        ponte.push(JSON.parse(init.body));
        if (ponte.length === 1) return rispostaPonte('{"ricerche":[{"q":"ucraina fronte analisi periodo","lingua":"it"}],"lingue":["it"],"durata_minima_min":20,"escludi":[],"attualita":true,"pubblicato_dopo":null}');
        return rispostaPonte('[{"id":"n1","punteggio":7,"motivo":"recente"},{"id":"n2","punteggio":7,"motivo":"più recente"}]');
      }
      const url = new URL(u);
      yt.push(url);
      if (url.pathname.endsWith('/search')) return { ok: true, json: async () => ({ items: [{ id: { videoId: 'n1' } }, { id: { videoId: 'n2' } }, { id: { videoId: 'vecchio' } }] }) };
      if (url.pathname.endsWith('/videos')) {
        const date: Record<string, string> = { n1: '2026-10-20T08:00:00Z', n2: '2026-11-05T08:00:00Z', vecchio: '2023-01-01T08:00:00Z' };
        return { ok: true, json: async () => ({ items: Object.keys(date).map((id) => ({ id, snippet: { title: id, channelId: 'UC' + id, publishedAt: date[id] }, contentDetails: { duration: 'PT40M' } })) }) };
      }
      return { ok: true, json: async () => ({ items: [] }) };
    });

    const stati: any[] = [];
    const videos = await executeAiSearch({ query: 'ucraina fronte, ultime analisi', provider: 'nemotron', settings: reale, periodo: '30g', oggi: OGGI, onStatusUpdate: (s) => stati.push(s), fetchFn });

    const ricerca = yt.find((u) => u.pathname.endsWith('/search'))!;
    expect(ricerca.searchParams.get('publishedAfter')).toBe('2026-10-14T00:00:00Z');
    expect(ponte[0].system).toContain('Oggi è il 2026-11-13');
    expect(ponte[0].system).toContain('ultimo mese');
    expect(ponte[1].system).toContain('ATTUALITÀ');
    const elenco = JSON.parse(ponte[1].messages[0].content.split('\n').slice(1).join('\n'));
    expect(elenco.map((x: any) => x.pubblicato)).toEqual(['2026-10-20', '2026-11-05']);   // il vecchio è stato filtrato
    expect(videos.map((x) => x.id)).toEqual(['n2', 'n1']);
    expect(stati.at(-1).plan).toMatchObject({ attualita: true, pubblicato_dopo: '2026-10-14' });
  });
});
