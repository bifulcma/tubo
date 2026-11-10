import { describe, it, expect, vi } from 'vitest';
import { parseChiParla, parseChiECanale, analizzaChiParla, loadChiParla, loadChiECanale } from './chiParla';
import { mockChiParla, mockAiEvaluateVideos } from './demo/mockAi';
import { DEMO_VIDEOS } from './demo/mockVideos';
import { AppSettings, VideoItem } from './types';

const settings: AppSettings = { youtubeApiKey: 'k', bridgeUrl: 'https://ponte.test', bridgeToken: 't', defaultProvider: 'nemotron', demoMode: false, theme: 'dark', aiLanguage: 'it', videoLanguages: [] };
const video: VideoItem = { id: 'vidChi1', title: 'Lezione sul katechon', channelTitle: 'Ateneo', channelId: 'UCchi', description: 'Prof. Rossi', duration: '50:00', durationSec: 3000, viewCount: 10, publishedAt: '2024-01-01', thumbnailUrl: '', aiQuery: 'Carl Schmitt e il katechon' };

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

describe('«Chi parla»: lettura della risposta', () => {
  it('legge il JSON dentro ```json e tiene le fonti con indirizzo valido', () => {
    const raw = '```json\n{"canale":"Canale di un ateneo","autore":"Mario Rossi","ruolo_affiliazione":"Docente","legittimazione":"Studia Schmitt","livello":"Alta","orientamento":"non risulta","fonti":[{"titolo":"Pagina docente","url":"https://uni.example/rossi"},{"titolo":"rotta","url":"ftp://x"},"https://altro.example/p"],"certezza":"verificato"}\n```';
    const r = parseChiParla(raw, true, 5);
    expect(r).toMatchObject({ autore: 'Mario Rossi', livello: 'alta', certezza: 'verificato', webUsato: true, at: 5 });
    expect(r.fonti).toEqual([{ titolo: 'Pagina docente', url: 'https://uni.example/rossi' }, { titolo: 'altro.example', url: 'https://altro.example/p' }]);
  });

  it('campi mancanti → «non risulta», livello «sconosciuta», «dedotto»', () => {
    const r = parseChiParla('Ecco: {"autore": "Anna Bianchi"}', true);
    expect(r.autore).toBe('Anna Bianchi');
    expect(r.canale).toBe('non risulta');
    expect(r.ruolo_affiliazione).toBe('non risulta');
    expect(r.livello).toBe('sconosciuta');
    expect(r.fonti).toEqual([]);
    expect(r.certezza).toBe('dedotto');
  });

  it('«verificato» senza rete o senza fonti diventa «dedotto»', () => {
    expect(parseChiParla('{"certezza":"verificato","fonti":[{"url":"https://a.example"}]}', false).certezza).toBe('dedotto');
    expect(parseChiParla('{"certezza":"verificato","fonti":[]}', true).certezza).toBe('dedotto');
  });

  it('risposta non JSON → errore chiaro', () => {
    expect(() => parseChiParla('non so', true)).toThrow();
    expect(() => parseChiParla('[1,2]', true)).toThrow("formato atteso");
  });

  it('giudizio sul canale', () => {
    const r = parseChiECanale('{"canale":"Editore","fonti":[{"titolo":"Sito","url":"https://ed.example"}],"certezza":"verificato"}', true);
    expect(r).toMatchObject({ canale: 'Editore', orientamento: 'non risulta', certezza: 'verificato' });
  });
});

describe('«Chi parla»: rete e riserva senza rete', () => {
  it('chiede con web:true; se il ponte fallisce riprova una volta con web:false', async () => {
    const corpi: any[] = [];
    const fetchFn = vi.fn().mockImplementation(async (_u: string, init: any) => {
      const b = JSON.parse(init.body);
      corpi.push(b);
      if (b.web) return { ok: false, status: 400, statusText: 'Bad Request', json: async () => ({ error: 'web non supportato' }) };
      return rispostaPonte('{"canale":"Ateneo","autore":"non risulta","livello":"media","certezza":"verificato","fonti":[{"url":"https://inventata.example"}]}');
    });
    const r = await analizzaChiParla({ video, provider: 'claude', settings, fetchFn: fetchFn as any });
    expect(corpi.map((c) => c.web)).toEqual([true, false]);
    expect(corpi[1].system).toContain('NON puoi cercare in rete');
    expect(corpi[0].system).toContain('non risulta');
    expect(corpi[0].system).toContain('Puoi cercare in rete');
    expect(r.webUsato).toBe(false);
    expect(r.certezza).toBe('dedotto');
    expect(r.livello).toBe('media');
    // salvato per il video e, la parte canale, per il canale
    expect(loadChiParla('vidChi1')?.livello).toBe('media');
    expect(loadChiECanale('UCchi')?.canale).toBe('Ateneo');
  });

  it('se la rete funziona basta una chiamata e il risultato è verificato', async () => {
    const fetchFn = vi.fn().mockResolvedValue(rispostaPonte('{"canale":"Ateneo","autore":"Mario Rossi","livello":"alta","certezza":"verificato","fonti":[{"titolo":"Sito","url":"https://uni.example"}]}'));
    const r = await analizzaChiParla({ video: { ...video, id: 'vidChi2' }, provider: 'claude', settings, fetchFn: fetchFn as any });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchFn.mock.calls[0][1].body).web).toBe(true);
    expect(r).toMatchObject({ certezza: 'verificato', webUsato: true, autore: 'Mario Rossi' });
  });

  it('se la risposta con rete non è JSON valido si riprova senza rete', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(rispostaPonte('Mi dispiace, non riesco.'))
      .mockResolvedValueOnce(rispostaPonte('{"autore":"X","livello":"bassa"}'));
    const r = await analizzaChiParla({ video: { ...video, id: 'vidChi3' }, provider: 'nemotron', settings, fetchFn: fetchFn as any });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(r).toMatchObject({ webUsato: false, livello: 'bassa' });
  });

  it('se l\'utente annulla non si riprova', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const fetchFn = vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    await expect(analizzaChiParla({ video: { ...video, id: 'vidChi4' }, provider: 'nemotron', settings, signal: ctrl.signal, fetchFn: fetchFn as any })).rejects.toBeTruthy();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe('«Chi parla»: demo', () => {
  it('dati finti coerenti e marcati come dimostrazione', () => {
    const r = mockChiParla(DEMO_VIDEOS[0]);
    expect(r.demo).toBe(true);
    expect(r.canale).toContain('associazione');
    expect(r.autore).toContain('inventato');
    expect(r.certezza).toBe('dedotto');
  });

  it('il passo 3 demo fornisce autore e autorità', () => {
    const ev = mockAiEvaluateVideos('katechon', DEMO_VIDEOS.slice(0, 4));
    expect(ev[0]).toMatchObject({ autorita: 'alta' });
    expect(ev.find((e) => e.id.includes('CLICKBAIT'))?.autorita).toBe('bassa');
  });
});
