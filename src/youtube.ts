import { ChannelDetails, VideoItem } from './types';
import { cacheGet, cacheSet, CACHE_RICERCHE_YT, CACHE_CANALI_YT, UN_GIORNO } from './storage';

/**
 * Converte la durata ISO 8601 di YouTube (es. PT1H23M45S, PT15M, PT40S)
 * in secondi e in una stringa leggibile (es. "1:23:45" o "15:00").
 */
export function parseIsoDuration(durationStr: string): { seconds: number; formatted: string } {
  if (!durationStr) {
    return { seconds: 0, formatted: '00:00' };
  }

  const match = durationStr.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) {
    return { seconds: 0, formatted: '00:00' };
  }

  const days = parseInt(match[1] || '0', 10);
  const hours = parseInt(match[2] || '0', 10) + days * 24;
  const minutes = parseInt(match[3] || '0', 10);
  const seconds = parseInt(match[4] || '0', 10);

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  let formatted = '';
  if (hours > 0) {
    const hh = hours.toString();
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    formatted = `${hh}:${mm}:${ss}`;
  } else {
    const mm = minutes.toString();
    const ss = seconds.toString().padStart(2, '0');
    formatted = `${mm}:${ss}`;
  }

  return { seconds: totalSeconds, formatted };
}

/**
 * Formatta il numero di visualizzazioni in italiano leggibile (es. 1.250 o 1,4 Mln).
 */
export function formatViews(views: number): string {
  if (views >= 1_000_000) {
    const formatted = (views / 1_000_000).toFixed(1).replace('.', ',');
    return `${formatted} Mln visualizzazioni`;
  }
  if (views >= 1_000) {
    return `${views.toLocaleString('it-IT')} visualizzazioni`;
  }
  return `${views} visualizzazioni`;
}

/**
 * Formatta una data ISO in formato leggibile italiano.
 */
export function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;
    return new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return isoDate;
  }
}

export interface YouTubeSearchParams {
  query: string;
  apiKey: string;
  maxResults?: number;
  fetchFn?: typeof fetch;
  relevanceLanguage?: string;
  videoDuration?: 'any' | 'short' | 'medium' | 'long';
  signal?: AbortSignal;
  /** Riusa i risultati delle ultime 24 ore (default true): search.list costa 100 unità. */
  useCache?: boolean;
}

/** Durata minima in minuti → parametro videoDuration di YouTube. */
export function durataPerYouTube(minuti: number): 'long' | undefined {
  // Tubo è pensato per video lunghi: a YouTube chiediamo solo «long» (>= 20 min).
  // Sotto i 20 minuti nessun filtro di durata a YouTube (il filtro sui minuti dopo videos.list resta).
  if (minuti >= 20) return 'long';
  return undefined;
}

async function erroreYouTube(res: Response, nome: string): Promise<Error> {
  let errBody = '';
  try {
    const json = await res.json();
    errBody = json.error?.message || JSON.stringify(json);
  } catch {
    errBody = res.statusText;
  }
  return new Error(`Errore YouTube ${nome} (${res.status}): ${errBody}`);
}

/**
 * Esegue la ricerca tramite search.list di YouTube Data API v3.
 */
export async function searchYouTubeVideos(params: YouTubeSearchParams): Promise<string[]> {
  const { query, apiKey, maxResults = 12, fetchFn = fetch, relevanceLanguage, videoDuration, signal, useCache = true } = params;

  if (!apiKey) {
    throw new Error('Chiave API di YouTube non configurata.');
  }

  const cacheKey = [query.trim().toLowerCase(), relevanceLanguage || '', videoDuration || '', maxResults].join('|');
  if (useCache) {
    const salvati = cacheGet<string[]>(CACHE_RICERCHE_YT, cacheKey, UN_GIORNO);
    if (salvati) return salvati;
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', maxResults.toString());
  url.searchParams.set('q', query);
  url.searchParams.set('key', apiKey);
  if (relevanceLanguage) url.searchParams.set('relevanceLanguage', relevanceLanguage);
  if (videoDuration && videoDuration !== 'any') url.searchParams.set('videoDuration', videoDuration);

  const res = await fetchFn(url.toString(), signal ? { signal } : undefined);
  if (!res.ok) throw await erroreYouTube(res, 'search.list');

  const data = await res.json();
  const videoIds: string[] = [];
  if (Array.isArray(data.items)) {
    for (const item of data.items) {
      if (item.id && item.id.videoId) {
        videoIds.push(item.id.videoId);
      }
    }
  }

  if (useCache) cacheSet(CACHE_RICERCHE_YT, cacheKey, videoIds, 200);
  return videoIds;
}

export interface YouTubeVideoDetailsParams {
  videoIds: string[];
  apiKey: string;
  fetchFn?: typeof fetch;
  signal?: AbortSignal;
}

/**
 * Recupera i dettagli completi dei video (durata, statistiche, snippet) tramite videos.list.
 */
export async function fetchYouTubeVideoDetails(params: YouTubeVideoDetailsParams): Promise<VideoItem[]> {
  const { videoIds, apiKey, fetchFn = fetch, signal } = params;

  if (videoIds.length === 0) return [];
  if (!apiKey) {
    throw new Error('Chiave API di YouTube non configurata.');
  }

  // videos.list accetta al massimo 50 id per chiamata
  if (videoIds.length > 50) {
    const out: VideoItem[] = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      out.push(...(await fetchYouTubeVideoDetails({ ...params, videoIds: videoIds.slice(i, i + 50) })));
    }
    return out;
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'snippet,contentDetails,statistics');
  url.searchParams.set('id', videoIds.join(','));
  url.searchParams.set('key', apiKey);

  const res = await fetchFn(url.toString(), signal ? { signal } : undefined);
  if (!res.ok) throw await erroreYouTube(res, 'videos.list');

  const data = await res.json();
  const videos: VideoItem[] = [];

  if (Array.isArray(data.items)) {
    for (const item of data.items) {
      const snippet = item.snippet || {};
      const contentDetails = item.contentDetails || {};
      const statistics = item.statistics || {};

      const durationInfo = parseIsoDuration(contentDetails.duration || '');
      const viewCount = parseInt(statistics.viewCount || '0', 10);

      // Migliore thumbnail disponibile
      const thumbnails = snippet.thumbnails || {};
      const thumb =
        thumbnails.maxres?.url ||
        thumbnails.standard?.url ||
        thumbnails.high?.url ||
        thumbnails.medium?.url ||
        thumbnails.default?.url ||
        '';

      videos.push({
        id: item.id,
        title: snippet.title || 'Senza titolo',
        channelTitle: snippet.channelTitle || 'Canale sconosciuto',
        channelId: snippet.channelId || '',
        description: snippet.description || '',
        duration: durationInfo.formatted,
        durationSec: durationInfo.seconds,
        viewCount,
        publishedAt: snippet.publishedAt || '',
        thumbnailUrl: thumb,
      });
    }
  }

  return videos;
}


// --- Canali: chi sono (channels.list, 1 unità per chiamata fino a 50 canali) ---

const SETTE_GIORNI = 7 * UN_GIORNO;

function numeroOpz(x: unknown): number | undefined {
  if (x === undefined || x === null || x === '') return undefined;
  const n = Number(x);
  return isNaN(n) ? undefined : n;
}

export function channelFromApi(item: any): ChannelDetails {
  const sn = item?.snippet || {};
  const st = item?.statistics || {};
  const th = sn.thumbnails || {};
  return {
    id: String(item?.id || ''),
    title: sn.title || item?.brandingSettings?.channel?.title || 'Canale',
    description: sn.description || item?.brandingSettings?.channel?.description || '',
    country: sn.country || item?.brandingSettings?.channel?.country || undefined,
    publishedAt: sn.publishedAt || undefined,
    customUrl: sn.customUrl || undefined,
    subscriberCount: st.hiddenSubscriberCount ? undefined : numeroOpz(st.subscriberCount),
    videoCount: numeroOpz(st.videoCount),
    viewCount: numeroOpz(st.viewCount),
    thumbnailUrl: th.medium?.url || th.default?.url || th.high?.url || undefined,
    uploadsPlaylistId: item?.contentDetails?.relatedPlaylists?.uploads || undefined,
    topics: Array.isArray(item?.topicDetails?.topicCategories)
      ? item.topicDetails.topicCategories.map((u: string) => decodeURIComponent(String(u).split('/').pop() || '').replace(/_/g, ' '))
      : undefined,
  };
}

/**
 * Dati dei canali (titolo, descrizione, paese, data di nascita, iscritti, video, visualizzazioni…).
 * Una sola chiamata per ogni 50 canali; i dati restano in memoria 7 giorni.
 */
export async function fetchChannelDetails(params: {
  ids: string[];
  apiKey: string;
  fetchFn?: typeof fetch;
  signal?: AbortSignal;
}): Promise<Record<string, ChannelDetails>> {
  const { apiKey, fetchFn = fetch, signal } = params;
  const ids = Array.from(new Set(params.ids.filter(Boolean)));
  const out: Record<string, ChannelDetails> = {};
  const mancanti: string[] = [];
  for (const id of ids) {
    const c = cacheGet<ChannelDetails>(CACHE_CANALI_YT, id, SETTE_GIORNI);
    if (c) out[id] = c; else mancanti.push(id);
  }
  if (mancanti.length === 0) return out;
  if (!apiKey) throw new Error('Chiave API di YouTube non configurata.');

  for (let i = 0; i < mancanti.length; i += 50) {
    const lotto = mancanti.slice(i, i + 50);
    const url = new URL('https://www.googleapis.com/youtube/v3/channels');
    url.searchParams.set('part', 'snippet,statistics,brandingSettings,topicDetails,contentDetails');
    url.searchParams.set('id', lotto.join(','));
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('key', apiKey);
    const res = await fetchFn(url.toString(), signal ? { signal } : undefined);
    if (!res.ok) throw await erroreYouTube(res, 'channels.list');
    const data = await res.json();
    for (const item of Array.isArray(data.items) ? data.items : []) {
      const c = channelFromApi(item);
      if (!c.id) continue;
      out[c.id] = c;
      cacheSet(CACHE_CANALI_YT, c.id, c, 500);
    }
  }
  return out;
}

/**
 * Ultimi video caricati da un canale: playlist «uploads» → playlistItems.list → videos.list.
 * Costo: circa 3 unità (contro 100 di una ricerca).
 */
export async function fetchChannelVideos(params: {
  channelId: string;
  apiKey: string;
  maxResults?: number;
  fetchFn?: typeof fetch;
  signal?: AbortSignal;
}): Promise<{ channel?: ChannelDetails; videos: VideoItem[] }> {
  const { channelId, apiKey, maxResults = 24, fetchFn = fetch, signal } = params;
  const canali = await fetchChannelDetails({ ids: [channelId], apiKey, fetchFn, signal });
  const channel = canali[channelId];
  const uploads = channel?.uploadsPlaylistId || (channelId.startsWith('UC') ? 'UU' + channelId.slice(2) : '');
  if (!uploads) return { channel, videos: [] };

  const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
  url.searchParams.set('part', 'contentDetails');
  url.searchParams.set('playlistId', uploads);
  url.searchParams.set('maxResults', String(Math.min(50, maxResults)));
  url.searchParams.set('key', apiKey);
  const res = await fetchFn(url.toString(), signal ? { signal } : undefined);
  if (!res.ok) throw await erroreYouTube(res, 'playlistItems.list');
  const data = await res.json();
  const ids: string[] = (Array.isArray(data.items) ? data.items : [])
    .map((it: any) => it?.contentDetails?.videoId)
    .filter(Boolean);
  const videos = await fetchYouTubeVideoDetails({ videoIds: ids, apiKey, fetchFn, signal });
  return { channel, videos };
}
