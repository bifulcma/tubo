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
