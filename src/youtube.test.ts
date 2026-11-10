import { describe, it, expect, vi } from 'vitest';
import {
  parseIsoDuration,
  formatViews,
  formatDate,
  searchYouTubeVideos,
  fetchYouTubeVideoDetails,
} from './youtube';

describe('youtube.ts', () => {
  it('converte correttamente le durate ISO 8601', () => {
    expect(parseIsoDuration('PT1H23M45S')).toEqual({ seconds: 5025, formatted: '1:23:45' });
    expect(parseIsoDuration('PT48M12S')).toEqual({ seconds: 2892, formatted: '48:12' });
    expect(parseIsoDuration('PT5M')).toEqual({ seconds: 300, formatted: '5:00' });
    expect(parseIsoDuration('PT42S')).toEqual({ seconds: 42, formatted: '0:42' });
    expect(parseIsoDuration('P1DT2H3M4S')).toEqual({ seconds: 93784, formatted: '26:03:04' });
    expect(parseIsoDuration('')).toEqual({ seconds: 0, formatted: '00:00' });
  });

  it('formatta le visualizzazioni in italiano', () => {
    expect(formatViews(420)).toBe('420 visualizzazioni');
    expect(formatViews(14200)).toBe('14.200 visualizzazioni');
    expect(formatViews(1500000)).toBe('1,5 Mln visualizzazioni');
  });

  it('formatta le date ISO in italiano', () => {
    const formatted = formatDate('2024-03-15T10:00:00Z');
    expect(formatted).toMatch(/15.*2024/);
  });

  it('estrae gli ID video da searchYouTubeVideos', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        items: [
          { id: { videoId: 'abc12345678' } },
          { id: { videoId: 'def98765432' } },
        ],
      }),
    });

    const ids = await searchYouTubeVideos({
      query: 'carl schmitt',
      apiKey: 'test-key',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(ids).toEqual(['abc12345678', 'def98765432']);
  });

  it('recupera e struttura i dettagli video da fetchYouTubeVideoDetails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        items: [
          {
            id: 'abc12345678',
            snippet: {
              title: 'Lezione Filosofia',
              channelTitle: 'Ateneo',
              channelId: 'UC123',
              description: 'Descrizione breve',
              publishedAt: '2024-01-01T00:00:00Z',
              thumbnails: { high: { url: 'https://img.test/thumb.jpg' } },
            },
            contentDetails: { duration: 'PT45M10S' },
            statistics: { viewCount: '12500' },
          },
        ],
      }),
    });

    const videos = await fetchYouTubeVideoDetails({
      videoIds: ['abc12345678'],
      apiKey: 'test-key',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(videos).toHaveLength(1);
    expect(videos[0]).toEqual({
      id: 'abc12345678',
      title: 'Lezione Filosofia',
      channelTitle: 'Ateneo',
      channelId: 'UC123',
      description: 'Descrizione breve',
      duration: '45:10',
      durationSec: 2710,
      viewCount: 12500,
      publishedAt: '2024-01-01T00:00:00Z',
      thumbnailUrl: 'https://img.test/thumb.jpg',
    });
  });
});

describe('youtube.ts — lingua, durata, cache, canali', async () => {
  const { durataPerYouTube, fetchChannelDetails, fetchChannelVideos } = await import('./youtube');

  it('durata minima → videoDuration', () => {
    expect(durataPerYouTube(0)).toBeUndefined();
    expect(durataPerYouTube(3)).toBeUndefined();
    expect(durataPerYouTube(4)).toBe('medium');
    expect(durataPerYouTube(19)).toBe('medium');
    expect(durataPerYouTube(20)).toBe('long');
  });

  it('search.list: passa lingua e durata e usa la cache 24 h', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [{ id: { videoId: 'v1' } }] }) });
    const p = { query: 'cache test unico', apiKey: 'k', relevanceLanguage: 'de', videoDuration: 'long' as const, fetchFn: mockFetch as any };
    expect(await searchYouTubeVideos(p)).toEqual(['v1']);
    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.searchParams.get('relevanceLanguage')).toBe('de');
    expect(url.searchParams.get('videoDuration')).toBe('long');
    expect(await searchYouTubeVideos(p)).toEqual(['v1']);
    expect(mockFetch).toHaveBeenCalledTimes(1);                 // seconda volta dalla cache
    await searchYouTubeVideos({ ...p, relevanceLanguage: 'it' }); // lingua diversa = chiave diversa
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('channels.list: un\'unica chiamata per più canali, iscritti nascosti, cache 7 giorni', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'UCa1',
            snippet: { title: 'Ateneo', description: 'Lezioni', country: 'IT', publishedAt: '2012-05-01T00:00:00Z', customUrl: '@ateneo' },
            statistics: { subscriberCount: '1200', videoCount: '340', viewCount: '99000', hiddenSubscriberCount: false },
            contentDetails: { relatedPlaylists: { uploads: 'UUa1' } },
            topicDetails: { topicCategories: ['https://en.wikipedia.org/wiki/Philosophy'] },
          },
          { id: 'UCb2', snippet: { title: 'Nascosto' }, statistics: { subscriberCount: '0', hiddenSubscriberCount: true, videoCount: '5' } },
        ],
      }),
    });
    const r = await fetchChannelDetails({ ids: ['UCa1', 'UCb2', 'UCa1'], apiKey: 'k', fetchFn: mockFetch as any });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.searchParams.get('id')).toBe('UCa1,UCb2');
    expect(url.searchParams.get('part')).toContain('snippet,statistics,brandingSettings,topicDetails');
    expect(r.UCa1).toMatchObject({ title: 'Ateneo', country: 'IT', subscriberCount: 1200, videoCount: 340, viewCount: 99000, customUrl: '@ateneo', uploadsPlaylistId: 'UUa1', topics: ['Philosophy'] });
    expect(r.UCb2.subscriberCount).toBeUndefined();
    // di nuovo: tutto dalla cache, nessuna chiamata
    await fetchChannelDetails({ ids: ['UCa1', 'UCb2'], apiKey: 'k', fetchFn: mockFetch as any });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('channels.list: oltre 50 canali divide in più chiamate', async () => {
    const mockFetch = vi.fn().mockImplementation(async (u: string) => {
      const ids = new URL(u).searchParams.get('id')!.split(',');
      return { ok: true, json: async () => ({ items: ids.map((id) => ({ id, snippet: { title: id } })) }) };
    });
    const ids = Array.from({ length: 60 }, (_, i) => `UCmolti${i}`);
    const r = await fetchChannelDetails({ ids, apiKey: 'k', fetchFn: mockFetch as any });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(Object.keys(r)).toHaveLength(60);
  });

  it('video del canale: playlist uploads → playlistItems → videos.list', async () => {
    const mockFetch = vi.fn().mockImplementation(async (u: string) => {
      const url = new URL(u);
      if (url.pathname.endsWith('/channels')) return { ok: true, json: async () => ({ items: [{ id: 'UCvid', snippet: { title: 'Canale' }, contentDetails: { relatedPlaylists: { uploads: 'UUvid' } } }] }) };
      if (url.pathname.endsWith('/playlistItems')) {
        expect(url.searchParams.get('playlistId')).toBe('UUvid');
        return { ok: true, json: async () => ({ items: [{ contentDetails: { videoId: 'x1' } }, { contentDetails: { videoId: 'x2' } }] }) };
      }
      return { ok: true, json: async () => ({ items: [{ id: 'x1', snippet: { title: 'A', channelId: 'UCvid' } }, { id: 'x2', snippet: { title: 'B', channelId: 'UCvid' } }] }) };
    });
    const r = await fetchChannelVideos({ channelId: 'UCvid', apiKey: 'k', fetchFn: mockFetch as any });
    expect(r.channel?.title).toBe('Canale');
    expect(r.videos.map((v) => v.id)).toEqual(['x1', 'x2']);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
