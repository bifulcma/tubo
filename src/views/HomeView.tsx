import React, { useState } from 'react';
import { Sparkles, Compass, Flame } from 'lucide-react';
import { VideoItem } from '../types';
import { VideoGrid } from '../components/VideoGrid';
import { DEMO_VIDEOS } from '../demo/mockVideos';

interface HomeViewProps {
  onSelectVideo: (video: VideoItem) => void;
  onSelectChannel: (channelId: string, channelTitle: string) => void;
  onTriggerSearch: (query: string) => void;
  savedVideoIds: Set<string>;
  onToggleWatchLater: (video: VideoItem) => void;
  demo: boolean;
  recentVideos: VideoItem[];
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectVideo,
  onSelectChannel,
  onTriggerSearch,
  savedVideoIds,
  onToggleWatchLater,
  demo,
  recentVideos,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Tutti');

  const categories = [
    'Tutti',
    'Filosofia del Diritto',
    'Politische Theorie',
    'Fisica Quantistica',
    'Intelligenza Artificiale',
    'Musica & Analisi',
    'Architettura & Design',
  ];

  const inspirationQueries = [
    'lezioni serie su Carl Schmitt e il katechon, non divulgative, in italiano o tedesco',
    'Meccanica quantistica: paradosso EPR e teorema di Bell',
    'Architettura dei Large Language Models: Transformer e FlashAttention',
    'J.S. Bach: Die Kunst der Fuge analisi contrappuntistica',
    'Design industriale italiano: Ettore Sottsass e Achille Castiglioni',
  ];

  // Filtra video da mostrare in homepage (nascondendo i clickbait finti dalla home)
  const homeVideos = !demo ? recentVideos : DEMO_VIDEOS.filter((v) => {
    if (v.id.includes('CLICKBAIT')) return false;
    if (selectedCategory === 'Tutti') return true;
    return v.category === selectedCategory;
  }).map((v) => ({
    ...v,
    aiScore: v.aiScore ?? 9.2,
    aiReason: v.aiReason ?? 'Video consigliato per rigore concettuale e qualità dei contenuti.',
  }));

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 p-6 sm:p-10 border border-slate-800 shadow-2xl light:from-indigo-50/70 light:via-white light:to-slate-100 light:border-slate-200">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 light:text-indigo-600 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ricerca Video con Intelligenza Artificiale</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white light:text-slate-900 leading-tight">
            Guarda video di qualità, <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent light:from-indigo-600 light:via-purple-600 light:to-indigo-800">
              senza acchiappa-clic né rumore.
            </span>
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-300 light:text-slate-600 leading-relaxed">
            Descrivi quello che vuoi imparare o guardare. L'AI pianifica ricerche mirate, consulta YouTube e valuta ogni video con un punteggio e una motivazione trasparente.
          </p>

          {/* Quick inspiration tags */}
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 light:text-slate-500 mb-2.5 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              Ricerche d'esempio consigliate:
            </p>
            <div className="flex flex-wrap gap-2">
              {inspirationQueries.map((query, idx) => (
                <button
                  key={idx}
                  onClick={() => onTriggerSearch(query)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900/80 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/40 transition cursor-pointer text-left light:bg-white light:border-slate-200 light:text-slate-700 light:hover:text-indigo-600"
                >
                  «{query}»
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter Pills (solo nei dati dimostrativi) */}
      {demo && <section className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-semibold text-slate-400 light:text-slate-500 flex items-center gap-1 shrink-0 mr-1">
          <Flame className="w-4 h-4 text-amber-400" />
          Filtra per tema:
        </span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 light:bg-white light:border-slate-200 light:text-slate-600 light:hover:text-slate-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </section>}

      {/* Featured Video Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-white light:text-slate-900 flex items-center gap-2">
            <span>{demo ? 'Tendenze & Video Consigliati (dimostrazione)' : 'Visti di recente'}</span>
            <span className="text-xs font-normal text-slate-400 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 light:bg-slate-100 light:border-slate-200">
              {homeVideos.length} video
            </span>
          </h2>
        </div>

        <VideoGrid
          videos={homeVideos}
          onSelectVideo={onSelectVideo}
          onSelectChannel={onSelectChannel}
          savedVideoIds={savedVideoIds}
          onToggleWatchLater={onToggleWatchLater}
          emptyMessage={demo ? "Nessun video trovato in questa categoria." : "Fai una ricerca: i video che guardi compariranno qui."}
          showAiReason={true}
        />
      </section>
    </div>
  );
};
