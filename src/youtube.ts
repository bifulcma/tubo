import { VideoItem } from './types';

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
}

/**
 * Esegue la ricerca tramite search.list di YouTube Data API v3.
 */
export async function searchYouTubeVideos(params: YouTubeSearchParams): Promise<string[]> {
  const { query, apiKey, maxResults = 12, fetchFn = fetch } = params;

  if (!apiKey) {
    throw new Error('Chiave API di YouTube non configurata.');
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', maxResults.toString());
  url.searchParams.set('q', query);
  url.searchParams.set('key', apiKey);

  const res = await fetchFn(url.toString());
  if (!res.ok) {
    let errBody = '';
    try {
      const json = await res.json();
      errBody = json.error?.message || JSON.stringify(json);
    } catch {
      errBody = res.statusText;
    }
    throw new Error(`Errore YouTube search.list (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const videoIds: string[] = [];
  if (Array.isArray(data.items)) {
    for (const item of data.items) {
      if (item.id && item.id.videoId) {
        videoIds.push(item.id.videoId);
      }
    }
  }

  return videoIds;
}

export interface YouTubeVideoDetailsParams {
  videoIds: string[];
  apiKey: string;
  fetchFn?: typeof fetch;
}

/**
 * Recupera i dettagli completi dei video (durata, statistiche, snippet) tramite videos.list.
 */
export async function fetchYouTubeVideoDetails(params: YouTubeVideoDetailsParams): Promise<VideoItem[]> {
  const { videoIds, apiKey, fetchFn = fetch } = params;

  if (videoIds.length === 0) return [];
  if (!apiKey) {
    throw new Error('Chiave API di YouTube non configurata.');
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'snippet,contentDetails,statistics');
  url.searchParams.set('id', videoIds.join(','));
  url.searchParams.set('key', apiKey);

  const res = await fetchFn(url.toString());
  if (!res.ok) {
    let errBody = '';
    try {
      const json = await res.json();
      errBody = json.error?.message || JSON.stringify(json);
    } catch {
      errBody = res.statusText;
    }
    throw new Error(`Errore YouTube videos.list (${res.status}): ${errBody}`);
  }

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
