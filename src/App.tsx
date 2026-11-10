import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  AiProvider,
  AppSettings,
  HistoryEntry,
  SavedSearch,
  SearchStatus,
  VideoItem,
} from './types';
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
  loadSavedSearches,
  saveSearch,
  removeSavedSearch,
} from './storage';
import { executeAiSearch, isDemoMode, isAnnullata } from './searchOrchestrator';
import { DEMO_VIDEOS } from './demo/mockVideos';
import { fetchYouTubeVideoDetails } from './youtube';
import { Route, parseHash, buildHash, sameRoute } from './router';

import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
import { MobileSearchModal } from './components/MobileSearchModal';
import { DemoBanner } from './components/DemoBanner';

import { HomeView } from './views/HomeView';
import { SearchResultsView } from './views/SearchResultsView';
import { WatchView } from './views/WatchView';
import { ChannelView } from './views/ChannelView';
import { HistoryView } from './views/HistoryView';
import { WatchLaterView } from './views/WatchLaterView';
import { SettingsView } from './views/SettingsView';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [selectedAi, setSelectedAi] = useState<AiProvider>(() =>
    loadSelectedAi(loadSettings().defaultProvider)
  );
  const [theme, setTheme] = useState<'dark' | 'light'>(() => loadSettings().theme || 'dark');

  // --- Indirizzi per pagina (#/video/…, #/cerca?q=…): Indietro e ricarica funzionano ---
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const activePage = route.page;

  useEffect(() => {
    if (typeof window.history.state?.tuboIdx !== 'number') {
      window.history.replaceState({ tuboIdx: 0 }, '');
    }
    const onChange = () => {
      const r = parseHash(window.location.hash);
      setRoute((prev) => (sameRoute(prev, r) ? prev : r));
    };
    window.addEventListener('popstate', onChange);
    window.addEventListener('hashchange', onChange);
    return () => {
      window.removeEventListener('popstate', onChange);
      window.removeEventListener('hashchange', onChange);
    };
  }, []);

  const navigate = useCallback((r: Route, opts?: { replace?: boolean }) => {
    const hash = buildHash(r);
    const attuale = window.location.hash || '#/';
    if (hash !== attuale) {
      const idx = (window.history.state?.tuboIdx ?? 0) + (opts?.replace ? 0 : 1);
      if (opts?.replace) window.history.replaceState({ tuboIdx: idx }, '', hash);
      else window.history.pushState({ tuboIdx: idx }, '', hash);
    }
    setRoute((prev) => (sameRoute(prev, r) ? prev : r));
  }, []);

  /** Torna alla pagina precedente dentro Tubo; se non c'è, va alla pagina di riserva. */
  const goBack = useCallback((fallback: Route) => {
    if ((window.history.state?.tuboIdx ?? 0) > 0) window.history.back();
    else navigate(fallback, { replace: true });
  }, [navigate]);

  const goToPage = (page: string) => {
    if (page === 'home' || page === 'history' || page === 'watchLater' || page === 'settings') {
      navigate({ page } as Route);
    }
  };

  const [watchLater, setWatchLater] = useState<VideoItem[]>(() => loadWatchLater());
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());

  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState<SearchStatus>({
    step: 'idle',
    message: '',
  });
  const [searchResults, setSearchResults] = useState<VideoItem[]>([]);
  const [searchProvider, setSearchProvider] = useState<AiProvider>(selectedAi);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => loadSavedSearches());
  const searchQueryRef = useRef<string | null>(null);   // ricerca mostrata o in corso
  const abortRef = useRef<AbortController | null>(null);

  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [videoState, setVideoState] = useState<'ok' | 'loading' | 'missing'>('ok');
  const [channelTitles, setChannelTitles] = useState<Record<string, string>>({});

  // Sync theme to <html> tag
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    const updated = saveSettings({ theme: nextTheme });
    setSettings(updated);
  };

  const handleSelectAi = (ai: AiProvider) => {
    setSelectedAi(ai);
    saveSelectedAi(ai);
  };

  const handleSaveSettings = (newSettings: Partial<AppSettings>) => {
    const updated = saveSettings(newSettings);
    setSettings(updated);
  };

  const handleToggleWatchLater = (video: VideoItem) => {
    const { items } = toggleWatchLater(video);
    setWatchLater([...items]);
  };

  const savedVideoIds = useMemo(() => {
    return new Set(watchLater.map((v) => v.id));
  }, [watchLater]);

  const handleSelectVideo = (video: VideoItem) => {
    setActiveVideo(video);
    setVideoState('ok');
    const updatedHistory = addToHistory(video);
    setHistory([...updatedHistory]);
    navigate({ page: 'watch', id: video.id });
  };

  const handleSelectChannel = (channelId: string, channelTitle: string) => {
    if (!channelId) return;
    setChannelTitles((t) => ({ ...t, [channelId]: channelTitle }));
    navigate({ page: 'channel', id: channelId });
  };

  // Esecuzione della ricerca AI (una alla volta: la nuova annulla la precedente)
  const runSearch = useCallback(
    async (query: string, provider: AiProvider) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const attiva = () => abortRef.current === ctrl && !ctrl.signal.aborted;

      searchQueryRef.current = query;
      setSearchQuery(query);
      setSearchProvider(provider);
      setSearchResults([]);
      setSearchStatus({
        step: 'planning',
        message: "L'AI prepara le ricerche…",
      });

      try {
        let ultimo: SearchStatus | null = null;
        const results = await executeAiSearch({
          query,
          provider,
          settings,
          signal: ctrl.signal,
          onStatusUpdate: (st) => {
            if (!attiva()) return;
            ultimo = st;
            setSearchStatus(st);
          },
        });
        if (!attiva()) return;   // annullata o superata da un'altra: non tocca nulla
        setSearchResults(results);
        if (results.length > 0 && !isDemoMode(settings) && ultimo) {
          setSavedSearches(saveSearch({ query, provider, at: Date.now(), status: ultimo, results }));
        }
      } catch (err: any) {
        if (isAnnullata(err, ctrl.signal)) return;
        console.error('Errore durante la ricerca AI:', err);
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
      }
    },
    [settings]
  );

  const handleTriggerSearch = useCallback(
    (query: string) => {
      const q = query.trim();
      if (!q) return;
      searchQueryRef.current = q;
      navigate({ page: 'search', q, ai: selectedAi });
      runSearch(q, selectedAi);
    },
    [selectedAi, runSearch, navigate]
  );

  const handleCancelSearch = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSearchStatus({
      step: 'cancelled',
      message: 'Ricerca annullata.',
      details: 'Non è stato cambiato nulla. Puoi rifarla quando vuoi.',
    });
  };

  const showSavedSearch = (saved: SavedSearch) => {
    abortRef.current?.abort();
    abortRef.current = null;
    searchQueryRef.current = saved.query;
    setSearchQuery(saved.query);
    setSearchProvider(saved.provider);
    setSearchResults(saved.results);
    setSearchStatus(saved.status);
  };

  const handleOpenSavedSearch = (saved: SavedSearch) => {
    showSavedSearch(saved);
    navigate({ page: 'search', q: saved.query, ai: saved.provider });
  };

  const norm = (q: string) => q.trim().toLowerCase();

  // Cerca un video già noto (risultati, cronologia, ricerche salvate, guarda più tardi, demo)
  const trovaVideo = (id: string): VideoItem | undefined => {
    const fonti: VideoItem[][] = [
      searchResults,
      history.map((h) => h.video),
      ...savedSearches.map((s) => s.results),
      watchLater,
      isDemoMode(settings) ? DEMO_VIDEOS : [],
    ];
    for (const lista of fonti) {
      const v = lista.find((x) => x.id === id);
      if (v) return v;
    }
    return undefined;
  };

  // Quando cambia l'indirizzo (Indietro, ricarica, link condiviso) si ricostruisce la pagina
  useEffect(() => {
    if (route.page !== 'watch') window.scrollTo({ top: 0 });

    if (route.page === 'search') {
      if (searchQueryRef.current !== null && norm(searchQueryRef.current) === norm(route.q)) return;
      const ai = route.ai ?? selectedAi;
      const salvata =
        savedSearches.find((s) => norm(s.query) === norm(route.q) && s.provider === ai) ??
        savedSearches.find((s) => norm(s.query) === norm(route.q));
      if (salvata) {
        showSavedSearch(salvata);
      } else if (isDemoMode(settings)) {
        runSearch(route.q, ai);
      } else {
        // non salvata qui: non si rifà da sola (costa quota e lavoro dell'AI), si chiede
        abortRef.current?.abort();
        searchQueryRef.current = route.q;
        setSearchQuery(route.q);
        setSearchProvider(ai);
        setSearchResults([]);
        setSearchStatus({ step: 'idle', message: '' });
      }
      return;
    }

    if (route.page === 'watch') {
      if (activeVideo?.id === route.id) return;
      const noto = trovaVideo(route.id);
      if (noto) {
        setActiveVideo(noto);
        setVideoState('ok');
        return;
      }
      if (isDemoMode(settings)) {
        setActiveVideo(null);
        setVideoState('missing');
        return;
      }
      const id = route.id;
      setActiveVideo(null);
      setVideoState('loading');
      fetchYouTubeVideoDetails({ videoIds: [id], apiKey: settings.youtubeApiKey })
        .then(([v]) => {
          if (parseHash(window.location.hash).page !== 'watch') return;
          if (v) {
            setActiveVideo(v);
            setVideoState('ok');
            setHistory([...addToHistory(v)]);
          } else {
            setVideoState('missing');
          }
        })
        .catch(() => setVideoState('missing'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  const handleRemoveSavedSearch = (saved: SavedSearch) => {
    setSavedSearches(removeSavedSearch(saved.query, saved.provider));
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };

  const handleRemoveFromHistory = (videoId: string) => {
    const updated = removeFromHistory(videoId);
    setHistory([...updated]);
  };

  const handleClearWatchLater = () => {
    for (const v of watchLater) {
      toggleWatchLater(v);
    }
    setWatchLater([]);
  };

  const showDemoBanner = isDemoMode(settings);

  const channelId = route.page === 'channel' ? route.id : '';
  const channelTitle = useMemo(() => {
    if (!channelId) return '';
    if (channelTitles[channelId]) return channelTitles[channelId];
    const tutti = [...searchResults, ...history.map((h) => h.video), ...watchLater, ...DEMO_VIDEOS];
    return tutti.find((v) => v.channelId === channelId)?.channelTitle ?? '';
  }, [channelId, channelTitles, searchResults, history, watchLater]);

  // Calcola video suggeriti per la pagina video
  const currentSuggested = useMemo(() => {
    if (searchResults.length > 1 && (!activeVideo || searchResults.some((v) => v.id === activeVideo.id))) {
      return searchResults;
    }
    if (!isDemoMode(settings)) {
      // video aperto dalla cronologia: i suggeriti sono gli altri risultati della ricerca da cui veniva
      const origine = activeVideo && savedSearches.find((ss) => ss.results.some((v) => v.id === activeVideo.id));
      if (origine) return origine.results;
      return history.map((h) => h.video);
    }
    return DEMO_VIDEOS.filter((v) => !v.id.includes('CLICKBAIT'));
  }, [searchResults, settings, history, activeVideo, savedSearches]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 light:bg-slate-50 light:text-slate-900 transition-colors">
      {/* Demo Banner */}
      {showDemoBanner && (
        <DemoBanner onOpenSettings={() => navigate({ page: 'settings' })} />
      )}

      {/* Main Navbar */}
      <Navbar
        activePage={activePage}
        onNavigate={goToPage}
        selectedAi={selectedAi}
        onSelectAi={handleSelectAi}
        searchQuery={searchQuery}
        onSearch={handleTriggerSearch}
        watchLaterCount={watchLater.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenMobileSearch={() => setIsMobileSearchOpen(true)}
      />

      {/* Mobile Search Modal (pensato appositamente per iPhone/mobile) */}
      <MobileSearchModal
        isOpen={isMobileSearchOpen}
        onClose={() => setIsMobileSearchOpen(false)}
        onSearch={handleTriggerSearch}
        selectedAi={selectedAi}
        onSelectAi={handleSelectAi}
        savedSearches={savedSearches}
        onOpenSavedSearch={handleOpenSavedSearch}
        initialQuery={searchQuery}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 sm:pb-8">
        {activePage === 'home' && (
          <HomeView
            onSelectVideo={handleSelectVideo}
            onSelectChannel={handleSelectChannel}
            onTriggerSearch={handleTriggerSearch}
            savedVideoIds={savedVideoIds}
            onToggleWatchLater={handleToggleWatchLater}
            demo={showDemoBanner}
            recentVideos={history.map((h) => h.video).slice(0, 12)}
            savedSearches={savedSearches}
            onOpenSavedSearch={handleOpenSavedSearch}
            onRemoveSavedSearch={handleRemoveSavedSearch}
            onOpenSearch={() => setIsMobileSearchOpen(true)}
          />
        )}

        {activePage === 'search' && (
          <SearchResultsView
            query={searchQuery}
            provider={searchProvider}
            status={searchStatus}
            videos={searchResults}
            onSelectVideo={handleSelectVideo}
            onSelectChannel={handleSelectChannel}
            savedVideoIds={savedVideoIds}
            onToggleWatchLater={handleToggleWatchLater}
            onRetry={() => runSearch(searchQuery, searchProvider)}
            onCancel={handleCancelSearch}
            onBackToHome={() => navigate({ page: 'home' })}
          />
        )}

        {activePage === 'watch' && !activeVideo && (
          <div className="max-w-xl mx-auto mt-10 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-3 light:bg-white light:border-slate-200">
            <p className="text-base font-semibold text-white light:text-slate-900">
              {videoState === 'loading' ? 'Carico il video…' : 'Video non trovato.'}
            </p>
            {videoState !== 'loading' && (
              <p className="text-sm text-slate-300 light:text-slate-600">
                Non è nella cronologia né nelle ricerche salvate di questo dispositivo.
              </p>
            )}
            <button
              onClick={() => navigate({ page: 'home' })}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
            >
              Vai alla Home
            </button>
          </div>
        )}

        {activePage === 'watch' && activeVideo && (
          <WatchView
            video={activeVideo}
            suggestedVideos={currentSuggested}
            onSelectVideo={handleSelectVideo}
            onSelectChannel={handleSelectChannel}
            isSavedInWatchLater={savedVideoIds.has(activeVideo.id)}
            onToggleWatchLater={handleToggleWatchLater}
            settings={settings}
            provider={selectedAi}
            demo={showDemoBanner}
            onBack={() =>
              goBack(searchResults.length > 0 && searchQuery ? { page: 'search', q: searchQuery, ai: searchProvider } : { page: 'home' })
            }
          />
        )}

        {activePage === 'channel' && channelId && (
          <ChannelView
            key={channelId}
            channelId={channelId}
            channelTitle={channelTitle}
            videos={showDemoBanner ? [...searchResults, ...DEMO_VIDEOS] : []}
            onSelectVideo={handleSelectVideo}
            savedVideoIds={savedVideoIds}
            onToggleWatchLater={handleToggleWatchLater}
            onBack={() => goBack({ page: 'home' })}
            settings={settings}
            provider={selectedAi}
            demo={showDemoBanner}
          />
        )}

        {activePage === 'history' && (
          <HistoryView
            history={history}
            onSelectVideo={handleSelectVideo}
            onRemoveFromHistory={handleRemoveFromHistory}
            onClearHistory={handleClearHistory}
            savedVideoIds={savedVideoIds}
            onToggleWatchLater={handleToggleWatchLater}
            onBackToHome={() => navigate({ page: 'home' })}
          />
        )}

        {activePage === 'watchLater' && (
          <WatchLaterView
            videos={watchLater}
            onSelectVideo={handleSelectVideo}
            onSelectChannel={handleSelectChannel}
            savedVideoIds={savedVideoIds}
            onToggleWatchLater={handleToggleWatchLater}
            onBackToHome={() => navigate({ page: 'home' })}
          />
        )}

        {activePage === 'settings' && (
          <SettingsView
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onClearHistory={handleClearHistory}
            onClearWatchLater={handleClearWatchLater}
            onBackToHome={() => navigate({ page: 'home' })}
          />
        )}
      </main>

      {/* Bottom Navigation for Phones/Tablets */}
      <MobileNav
        activePage={activePage}
        onNavigate={goToPage}
        onOpenSearch={() => setIsMobileSearchOpen(true)}
        watchLaterCount={watchLater.length}
      />
    </div>
  );
}
