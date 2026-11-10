import { AppSettings, HistoryEntry, VideoItem, AiProvider, SavedSearch } from './types';

export const DEFAULT_BRIDGE_URL: string = '';

const SETTINGS_KEY = 'tubo_settings_v1';
const HISTORY_KEY = 'tubo_history_v1';
const WATCH_LATER_KEY = 'tubo_watch_later_v1';
const SELECTED_AI_KEY = 'tubo_selected_ai_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  youtubeApiKey: '',
  bridgeUrl: DEFAULT_BRIDGE_URL,
  bridgeToken: '',
  defaultProvider: 'nemotron',
  demoMode: false,
  theme: 'dark',
  aiLanguage: 'it',
  videoLanguages: [],
};

const memoryStore = new Map<string, string>();

function getStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage.getItem(key);
    }
  } catch {
    // fallback
  }
  return memoryStore.get(key) ?? null;
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      (globalThis as any).localStorage.setItem(key, value);
      return;
    }
  } catch {
    // fallback
  }
  memoryStore.set(key, value);
}

function removeStorageItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      (globalThis as any).localStorage.removeItem(key);
      return;
    }
  } catch {
    // fallback
  }
  memoryStore.delete(key);
}

// --- IMPOSTAZIONI ---

export function loadSettings(): AppSettings {
  try {
    const raw = getStorageItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    const def = (parsed.defaultProvider === 'qwen' || parsed.defaultProvider === 'gemma')
      ? 'nemotron'
      : (parsed.defaultProvider || 'nemotron');
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      defaultProvider: def,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const current = loadSettings();
  const updated: AppSettings = { ...current, ...settings };
  try {
    setStorageItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Errore salvataggio impostazioni', err);
  }
  return updated;
}

// --- AI PREFERITA / ATTIVA ---

export function loadSelectedAi(fallback: AiProvider = 'nemotron'): AiProvider {
  try {
    const stored = getStorageItem(SELECTED_AI_KEY) as string | null;
    if (stored === 'qwen' || stored === 'gemma') {
      return 'nemotron';
    }
    if (stored && ['nemotron', 'claude', 'argon'].includes(stored)) {
      return stored as AiProvider;
    }
  } catch {
    // fallback
  }
  return fallback;
}

export function saveSelectedAi(provider: AiProvider): void {
  try {
    setStorageItem(SELECTED_AI_KEY, provider);
  } catch (err) {
    console.error('Errore salvataggio AI selezionata', err);
  }
}

// --- CRONOLOGIA ---

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = getStorageItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addToHistory(video: VideoItem): HistoryEntry[] {
  try {
    const history = loadHistory().filter((item) => item.video.id !== video.id);
    const updated: HistoryEntry[] = [{ video, watchedAt: Date.now() }, ...history].slice(0, 100);
    setStorageItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function removeFromHistory(videoId: string): HistoryEntry[] {
  try {
    const updated = loadHistory().filter((item) => item.video.id !== videoId);
    setStorageItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  try {
    removeStorageItem(HISTORY_KEY);
  } catch (err) {
    console.error('Errore svuotamento cronologia', err);
  }
}

// --- GUARDA PIÙ TARDI ---

export function loadWatchLater(): VideoItem[] {
  try {
    const raw = getStorageItem(WATCH_LATER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toggleWatchLater(video: VideoItem): { saved: boolean; items: VideoItem[] } {
  try {
    const current = loadWatchLater();
    const exists = current.some((item) => item.id === video.id);
    let updated: VideoItem[];
    let saved: boolean;

    if (exists) {
      updated = current.filter((item) => item.id !== video.id);
      saved = false;
    } else {
      updated = [video, ...current];
      saved = true;
    }

    setStorageItem(WATCH_LATER_KEY, JSON.stringify(updated));
    return { saved, items: updated };
  } catch {
    return { saved: false, items: [] };
  }
}

export function isVideoInWatchLater(videoId: string): boolean {
  return loadWatchLater().some((item) => item.id === videoId);
}

export function removeFromWatchLater(videoId: string): VideoItem[] {
  try {
    const updated = loadWatchLater().filter((item) => item.id !== videoId);
    setStorageItem(WATCH_LATER_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

// Ultime ricerche: si riaprono subito, senza far lavorare di nuovo l'AI
const SEARCHES_KEY = 'tubo_searches_v1';
const MAX_SEARCHES = 15;

export function loadSavedSearches(): SavedSearch[] {
  try {
    const raw = getStorageItem(SEARCHES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveSearch(entry: SavedSearch): SavedSearch[] {
  const key = (e: SavedSearch) => e.query.trim().toLowerCase() + '|' + e.provider;
  const list = [entry, ...loadSavedSearches().filter((e) => key(e) !== key(entry))].slice(0, MAX_SEARCHES);
  try {
    setStorageItem(SEARCHES_KEY, JSON.stringify(list));
  } catch {
    // spazio pieno: si tiene solo la ricerca appena fatta
    try { setStorageItem(SEARCHES_KEY, JSON.stringify([entry])); } catch { /* niente */ }
  }
  return list;
}

export function removeSavedSearch(query: string, provider: AiProvider): SavedSearch[] {
  const list = loadSavedSearches().filter((e) => !(e.query === query && e.provider === provider));
  try { setStorageItem(SEARCHES_KEY, JSON.stringify(list)); } catch { /* niente */ }
  return list;
}

// Riassunti e commenti già preparati (per non rifarli a ogni apertura)
const REVIEWS_KEY = 'tubo_commenti_v1';

export function loadReview(videoId: string): { riassunto: string; commento: string } | null {
  try {
    const all = JSON.parse(getStorageItem(REVIEWS_KEY) || '{}');
    return all[videoId] ?? null;
  } catch {
    return null;
  }
}

export function saveReview(videoId: string, review: { riassunto: string; commento: string }): void {
  try {
    const all = JSON.parse(getStorageItem(REVIEWS_KEY) || '{}');
    all[videoId] = review;
    const ids = Object.keys(all);
    for (const id of ids.slice(0, Math.max(0, ids.length - 300))) delete all[id];   // ne tiene 300
    setStorageItem(REVIEWS_KEY, JSON.stringify(all));
  } catch { /* niente */ }
}

// Riassunti dalla trascrizione (con capitoli), per video
const DIGEST_KEY = 'tubo_trascrizioni_v1';

export function loadDigest(videoId: string): { riassunto: string; capitoli: { t: number; titolo: string }[] } | null {
  try { return JSON.parse(getStorageItem(DIGEST_KEY) || '{}')[videoId] ?? null; } catch { return null; }
}

export function saveDigest(videoId: string, d: { riassunto: string; capitoli: { t: number; titolo: string }[] }): void {
  try {
    const all = JSON.parse(getStorageItem(DIGEST_KEY) || '{}');
    all[videoId] = d;
    const ids = Object.keys(all);
    for (const id of ids.slice(0, Math.max(0, ids.length - 200))) delete all[id];
    setStorageItem(DIGEST_KEY, JSON.stringify(all));
  } catch { /* niente */ }
}


// --- Cache con scadenza (risultati YouTube, canali, «Chi parla») ---
interface CacheEntry<T> { at: number; v: T }

export function cacheGet<T>(bucket: string, key: string, maxAgeMs: number, now = Date.now()): T | null {
  try {
    const all = JSON.parse(getStorageItem(bucket) || '{}') as Record<string, CacheEntry<T>>;
    const e = all[key];
    if (!e || typeof e.at !== 'number' || now - e.at > maxAgeMs) return null;
    return e.v;
  } catch {
    return null;
  }
}

export function cacheSet<T>(bucket: string, key: string, value: T, maxEntries = 300, now = Date.now()): void {
  try {
    let all: Record<string, CacheEntry<T>> = {};
    try { all = JSON.parse(getStorageItem(bucket) || '{}'); } catch { all = {}; }
    delete all[key];
    all[key] = { at: now, v: value };
    const keys = Object.keys(all);
    for (const k of keys.slice(0, Math.max(0, keys.length - maxEntries))) delete all[k];
    setStorageItem(bucket, JSON.stringify(all));
  } catch { /* spazio pieno: pazienza, si rifà la chiamata */ }
}

export function cacheDelete(bucket: string, key: string): void {
  try {
    const all = JSON.parse(getStorageItem(bucket) || '{}');
    delete all[key];
    setStorageItem(bucket, JSON.stringify(all));
  } catch { /* niente */ }
}

export const CACHE_RICERCHE_YT = 'tubo_cache_ricerche_yt_v1';
export const CACHE_CANALI_YT = 'tubo_cache_canali_yt_v1';
export const CACHE_CHI_PARLA = 'tubo_chi_parla_v1';
export const CACHE_CHI_E_CANALE = 'tubo_chi_e_canale_v1';
export const UN_GIORNO = 24 * 60 * 60 * 1000;
