import { describe, it, expect, vi } from 'vitest';
import {
  extractAndParseJson,
  isDemoMode,
  executeAiSearch,
} from './searchOrchestrator';
import { AppSettings, SearchStatus } from './types';

describe('searchOrchestrator.ts', () => {
  describe('extractAndParseJson', () => {
    it('parsifica JSON standard', () => {
      const parsed = extractAndParseJson<{ foo: string }>('{"foo": "bar"}');
      expect(parsed).toEqual({ foo: 'bar' });
    });

    it('rimuove blocchi markdown con ```json', () => {
      const input = '```json\n{"ricerche": ["test"], "lingue": ["it"]}\n```';
      const parsed = extractAndParseJson<{ ricerche: string[] }>(input);
      expect(parsed.ricerche).toEqual(['test']);
    });

    it('ignora testo introduttivo prima del JSON', () => {
      const input = 'Ecco il risultato:\n[{"id": "v1", "punteggio": 9, "motivo": "ottimo"}]';
      const parsed = extractAndParseJson<any[]>(input);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('v1');
    });
  });

  describe('isDemoMode', () => {
    it('restituisce true se esplicitamente impostato in settings', () => {
      const s: AppSettings = {
        youtubeApiKey: 'key',
        bridgeUrl: 'url',
        bridgeToken: 'token',
        defaultProvider: 'nemotron',
        demoMode: true,
        theme: 'dark', aiLanguage: 'it', videoLanguages: [],
      };
      expect(isDemoMode(s)).toBe(true);
    });

    it('restituisce true se manca la chiave YouTube o il token del ponte', () => {
      const s: AppSettings = {
        youtubeApiKey: '',
        bridgeUrl: 'https://test',
        bridgeToken: '',
        defaultProvider: 'nemotron',
        demoMode: false,
        theme: 'dark', aiLanguage: 'it', videoLanguages: [],
      };
      expect(isDemoMode(s)).toBe(true);
    });

    it('restituisce false se entrambi sono configurati e demoMode è false', () => {
      const s: AppSettings = {
        youtubeApiKey: 'AIzaSy12345',
        bridgeUrl: 'https://test',
        bridgeToken: 'mytoken',
        defaultProvider: 'nemotron',
        demoMode: false,
        theme: 'dark', aiLanguage: 'it', videoLanguages: [],
      };
      expect(isDemoMode(s)).toBe(false);
    });
  });

  describe('executeAiSearch (Modalità dimostrazione)', () => {
    it('completa i tre passi e ordina i video per punteggio decrescente con motivazione', async () => {
      const statuses: SearchStatus[] = [];
      const settings: AppSettings = {
        youtubeApiKey: '',
        bridgeUrl: '',
        bridgeToken: '',
        defaultProvider: 'nemotron',
        demoMode: true,
        theme: 'dark', aiLanguage: 'it', videoLanguages: [],
      };

      const videos = await executeAiSearch({
        query: 'lezioni serie su Carl Schmitt e il katechon, non divulgative, in italiano o tedesco',
        provider: 'nemotron',
        settings,
        onStatusUpdate: (st) => statuses.push(st),
      });

      expect(videos.length).toBeGreaterThan(0);
      expect(statuses.some((s) => s.step === 'planning')).toBe(true);
      expect(statuses.some((s) => s.step === 'fetching')).toBe(true);
      expect(statuses.some((s) => s.step === 'evaluating')).toBe(true);
      expect(statuses.some((s) => s.step === 'done')).toBe(true);

      // Verifica che ogni video abbia un punteggio AI e un motivo
      for (const v of videos) {
        expect(v.aiScore).toBeDefined();
        expect(typeof v.aiScore).toBe('number');
        expect(v.aiReason).toBeDefined();
        expect(typeof v.aiReason).toBe('string');
      }

      // Verifica ordinamento decrescente
      for (let i = 0; i < videos.length - 1; i++) {
        expect(videos[i].aiScore!).toBeGreaterThanOrEqual(videos[i + 1].aiScore!);
      }

      // Il video clickbait deve essere in fondo con punteggio basso
      const clickbait = videos.find((v) => v.id.includes('CLICKBAIT'));
      if (clickbait) {
        expect(clickbait.aiScore).toBeLessThan(4.0);
        expect(clickbait.aiReason?.toLowerCase()).toContain('scartato');
      }
    });
  });
});

describe('lingua', () => {
  it('nomeLingua traduce i codici e torna all\'italiano se sconosciuto', async () => {
    const { nomeLingua } = await import('./types');
    expect(nomeLingua('de')).toBe('tedesco');
    expect(nomeLingua('xx')).toBe('italiano');
  });

  it('il riassunto usa la lingua scelta nelle istruzioni', async () => {
    const { reviewVideo } = await import('./searchOrchestrator');
    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(enc.encode('event: text\ndata: {"t": "{\\"riassunto\\": \\"a\\", \\"commento\\": \\"b\\"}"}\n\nevent: done\ndata: {}\n\n')); c.close(); } });
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200, body });
    const video: any = { id: 'abc12345678', title: 't', channelTitle: 'c', description: '', duration: '1:00', aiScore: 5 };
    await reviewVideo({ video, provider: 'nemotron', settings: { youtubeApiKey: 'k', bridgeUrl: 'https://p', bridgeToken: 'x', defaultProvider: 'nemotron', demoMode: false, theme: 'dark', aiLanguage: 'de', videoLanguages: [] }, fetchFn: fetchFn as any });
    expect(JSON.parse(fetchFn.mock.calls[0][1].body).system).toContain('Scrivi in tedesco');
  });
});
