// TuboF — passa le richieste a YouTube Data API v3 aggiungendo la chiave (che resta sul server).
// Solo 4 endpoint e solo i parametri che Tubo usa. Conta le unità di quota per persona.
import { json, errore, utenteDa, consuma, cache } from './_lib.js';

const ENDPOINT = {
  search: { costo: 100, parametri: ['part', 'type', 'maxResults', 'q', 'relevanceLanguage', 'videoDuration', 'publishedAfter', 'publishedBefore', 'order', 'channelId', 'pageToken', 'regionCode', 'safeSearch'] },
  videos: { costo: 1, parametri: ['part', 'id', 'maxResults'] },
  channels: { costo: 1, parametri: ['part', 'id', 'maxResults'] },
  playlistItems: { costo: 1, parametri: ['part', 'playlistId', 'maxResults', 'pageToken'] },
};
const ORE_CACHE_RICERCA = 6;

export default {
  async fetch(req) {
    if (req.method !== 'GET') return errore('Metodo non consentito', 405);
    const io = await utenteDa(req);
    if (!io) return errore('Accesso scaduto: entra di nuovo.', 401);

    const sp = new URL(req.url).searchParams;
    const ep = sp.get('ep') || '';
    const def = ENDPOINT[ep];
    if (!def) return errore('Richiesta YouTube non consentita.', 400);

    const url = new URL(`https://www.googleapis.com/youtube/v3/${ep}`);
    for (const p of def.parametri) {
      const v = sp.get(p);
      if (v != null && v.length <= 600) url.searchParams.set(p, v);
    }
    const chiaveCache = `yt:${ep}:${url.searchParams.toString()}`;

    // le ricerche (100 unità) si riusano per tutta la famiglia per qualche ora
    if (ep === 'search') {
      const c = await cache.get(chiaveCache).catch(() => null);
      if (c) return json(c);
    }

    const chiave = process.env.YOUTUBE_API_KEY;
    if (!chiave) return errore('Server non configurato (chiave YouTube mancante).', 500);

    if (!(await consuma(io, 'unita', def.costo))) {
      return errore('Hai finito le ricerche YouTube di oggi: riprova domani.', 429);
    }
    url.searchParams.set('key', chiave);

    const r = await fetch(url, { signal: req.signal });
    let dati;
    try { dati = await r.json(); } catch { dati = { error: { message: `YouTube ${r.status}` } }; }
    if (r.ok && ep === 'search') await cache.set(chiaveCache, dati, { ttl: ORE_CACHE_RICERCA * 3600 }).catch(() => {});
    return json(dati, r.status);
  },
};
