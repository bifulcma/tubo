import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadSettings,
  saveSettings,
  loadSelectedAi,
  saveSelectedAi,
  loadHistory,
  addToHistory,
  removeFromHistory,
  clearHistory,
  loadWatchLater,
  toggleWatchLater,
  isVideoInWatchLater,
  DEFAULT_SETTINGS,
} from './storage';
import { VideoItem } from './types';

const sampleVideo: VideoItem = {
  id: 'test-1',
  title: 'Test Video',
  channelTitle: 'Test Channel',
  channelId: 'UC_test',
  description: 'Desc',
  duration: '10:00',
  durationSec: 600,
  viewCount: 100,
  publishedAt: '2024-01-01',
  thumbnailUrl: 'data:image/svg+xml,...',
  aiScore: 9.0,
  aiReason: 'Ottimo video',
};

describe('storage.ts', () => {
  beforeEach(() => {
    clearHistory();
    saveSettings(DEFAULT_SETTINGS);
    saveSelectedAi('qwen');
    // Rimuovi video da watch later
    const wl = loadWatchLater();
    for (const item of wl) {
      toggleWatchLater(item);
    }
  });

  it('carica le impostazioni predefinite', () => {
    const s = loadSettings();
    expect(s.defaultProvider).toBe('qwen');
    expect(s.bridgeUrl).toBe(DEFAULT_SETTINGS.bridgeUrl);
  });

  it('salva e recupera le impostazioni modificate', () => {
    saveSettings({ youtubeApiKey: 'my-api-key', defaultProvider: 'claude' });
    const s = loadSettings();
    expect(s.youtubeApiKey).toBe('my-api-key');
    expect(s.defaultProvider).toBe('claude');
  });

  it('gestisce il salvataggio e recupero dell AI selezionata', () => {
    saveSelectedAi('argon');
    expect(loadSelectedAi()).toBe('argon');
  });

  it('gestisce la cronologia aggiungendo e rimuovendo elementi', () => {
    clearHistory();
    expect(loadHistory()).toHaveLength(0);
    addToHistory(sampleVideo);
    let hist = loadHistory();
    expect(hist).toHaveLength(1);
    expect(hist[0].video.id).toBe('test-1');

    removeFromHistory('test-1');
    expect(loadHistory()).toHaveLength(0);

    addToHistory(sampleVideo);
    clearHistory();
    expect(loadHistory()).toHaveLength(0);
  });

  it('gestisce la lista Guarda più tardi con toggle', () => {
    // Assicuriamoci che non sia già presente
    if (isVideoInWatchLater('test-1')) {
      toggleWatchLater(sampleVideo);
    }
    expect(isVideoInWatchLater('test-1')).toBe(false);

    const added = toggleWatchLater(sampleVideo);
    expect(added.saved).toBe(true);
    expect(isVideoInWatchLater('test-1')).toBe(true);
    expect(loadWatchLater().some((v) => v.id === 'test-1')).toBe(true);

    const removed = toggleWatchLater(sampleVideo);
    expect(removed.saved).toBe(false);
    expect(isVideoInWatchLater('test-1')).toBe(false);
  });
});

describe('ultime ricerche', () => {
  it('salva, toglie i doppioni e rimuove', async () => {
    const { saveSearch, loadSavedSearches, removeSavedSearch } = await import('./storage');
    const base = { provider: 'gemma' as const, at: 1, status: { step: 'done' as const, message: 'ok' }, results: [] };
    saveSearch({ ...base, query: 'Schmitt' });
    saveSearch({ ...base, query: 'Bach' });
    saveSearch({ ...base, query: 'schmitt ', at: 2 });
    const list = loadSavedSearches();
    expect(list.map((e) => e.query)).toEqual(['schmitt ', 'Bach']);
    expect(removeSavedSearch('Bach', 'gemma').map((e) => e.query)).toEqual(['schmitt ']);
  });
});
