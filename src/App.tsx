import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AiProvider,
  AppSettings,
  HistoryEntry,
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
} from './storage';
import { executeAiSearch, isDemoMode } from './searchOrchestrator';
import { DEMO_VIDEOS } from './demo/mockVideos';

import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
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

  const [activePage, setActivePage] = useState<
    'home' | 'search' | 'watch' | 'channel' | 'history' | 'watchLater' | 'settings'
  >('home');

  const [watchLater, setWatchLater] = useState<VideoItem[]>(() => loadWatchLater());
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());

  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState<SearchStatus>({
    step: 'idle',
    message: '',
  });
  const [searchResults, setSearchResults] = useState<VideoItem[]>([]);

  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [activeChannel, setActiveChannel] = useState<{ id: string; title: string } | null>(null);

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
    const updatedHistory = addToHistory(video);
    setHistory([...updatedHistory]);
    setActivePage('watch');
  };

  const handleSelectChannel = (channelId: string, channelTitle: string) => {
    setActiveChannel({ id: channelId, title: channelTitle });
    setActivePage('channel');
  };

  // Esecuzione della ricerca AI
  const handleTriggerSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      setSearchQuery(query);
      setActivePage('search');
      setSearchResults([]);
      setSearchStatus({
        step: 'planning',
        message: "L'AI prepara le ricerche…",
      });

      try {
        const results = await executeAiSearch({
          query,
          provider: selectedAi,
          settings,
          onStatusUpdate: (st) => setSearchStatus(st),
        });
        setSearchResults(results);
      } catch (err: any) {
        console.error('Errore durante la ricerca AI:', err);
      }
    },
    [selectedAi, settings]
  );

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

  // Calcola video suggeriti per la pagina video
  const currentSuggested = useMemo(() => {
    if (searchResults.length > 1) {
      return searchResults;
    }
    return DEMO_VIDEOS.filter((v) => !v.id.includes('CLICKBAIT'));
  }, [searchResults]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 light:bg-slate-50 light:text-slate-900 transition-colors">
      {/* Demo Banner */}
      {showDemoBanner && (
        <DemoBanner onOpenSettings={() => setActivePage('settings')} />
      )}

      {/* Main Navbar */}
      <Navbar
        activePage={activePage}
        onNavigate={(page) => setActivePage(page)}
        selectedAi={selectedAi}
        onSelectAi={handleSelectAi}
        searchQuery={searchQuery}
        onSearch={handleTriggerSearch}
        watchLaterCount={watchLater.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
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
          />
        )}

        {activePage === 'search' && (
          <SearchResultsView
            query={searchQuery}
            provider={selectedAi}
            status={searchStatus}
            videos={searchResults}
            onSelectVideo={handleSelectVideo}
            onSelectChannel={handleSelectChannel}
            savedVideoIds={savedVideoIds}
            onToggleWatchLater={handleToggleWatchLater}
            onRetry={() => handleTriggerSearch(searchQuery)}
            onBackToHome={() => setActivePage('home')}
          />
        )}

        {activePage === 'watch' && activeVideo && (
          <WatchView
            video={activeVideo}
            suggestedVideos={currentSuggested}
            onSelectVideo={handleSelectVideo}
            onSelectChannel={handleSelectChannel}
            isSavedInWatchLater={savedVideoIds.has(activeVideo.id)}
            onToggleWatchLater={handleToggleWatchLater}
            onBack={() => {
              if (searchResults.length > 0) {
                setActivePage('search');
              } else {
                setActivePage('home');
              }
            }}
          />
        )}

        {activePage === 'channel' && activeChannel && (
          <ChannelView
            channelId={activeChannel.id}
            channelTitle={activeChannel.title}
            videos={[...searchResults, ...DEMO_VIDEOS]}
            onSelectVideo={handleSelectVideo}
            savedVideoIds={savedVideoIds}
            onToggleWatchLater={handleToggleWatchLater}
            onBack={() => setActivePage('home')}
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
            onBackToHome={() => setActivePage('home')}
          />
        )}

        {activePage === 'watchLater' && (
          <WatchLaterView
            videos={watchLater}
            onSelectVideo={handleSelectVideo}
            onSelectChannel={handleSelectChannel}
            savedVideoIds={savedVideoIds}
            onToggleWatchLater={handleToggleWatchLater}
            onBackToHome={() => setActivePage('home')}
          />
        )}

        {activePage === 'settings' && (
          <SettingsView
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onClearHistory={handleClearHistory}
            onClearWatchLater={handleClearWatchLater}
            onBackToHome={() => setActivePage('home')}
          />
        )}
      </main>

      {/* Bottom Navigation for Phones/Tablets */}
      <MobileNav
        activePage={activePage}
        onNavigate={(page) => setActivePage(page)}
        watchLaterCount={watchLater.length}
      />
    </div>
  );
}
