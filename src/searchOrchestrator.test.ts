import { describe, it, expect } from 'vitest';
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
        defaultProvider: 'qwen',
        demoMode: true,
        theme: 'dark',
      };
      expect(isDemoMode(s)).toBe(true);
    });

    it('restituisce true se manca la chiave YouTube o il token del ponte', () => {
      const s: AppSettings = {
        youtubeApiKey: '',
        bridgeUrl: 'https://test',
        bridgeToken: '',
        defaultProvider: 'qwen',
        demoMode: false,
        theme: 'dark',
      };
      expect(isDemoMode(s)).toBe(true);
    });

    it('restituisce false se entrambi sono configurati e demoMode è false', () => {
      const s: AppSettings = {
        youtubeApiKey: 'AIzaSy12345',
        bridgeUrl: 'https://test',
        bridgeToken: 'mytoken',
        defaultProvider: 'qwen',
        demoMode: false,
        theme: 'dark',
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
        defaultProvider: 'qwen',
        demoMode: true,
        theme: 'dark',
      };

      const videos = await executeAiSearch({
        query: 'lezioni serie su Carl Schmitt e il katechon, non divulgative, in italiano o tedesco',
        provider: 'qwen',
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
