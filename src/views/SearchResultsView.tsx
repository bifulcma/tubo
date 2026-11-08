import React from 'react';
import { Sparkles, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import { AiProvider, AI_PROVIDERS, SearchStatus, VideoItem } from '../types';
import { SearchProgress } from '../components/SearchProgress';
import { VideoGrid } from '../components/VideoGrid';

interface SearchResultsViewProps {
  query: string;
  provider: AiProvider;
  status: SearchStatus;
  videos: VideoItem[];
  onSelectVideo: (video: VideoItem) => void;
  onSelectChannel: (channelId: string, channelTitle: string) => void;
  savedVideoIds: Set<string>;
  onToggleWatchLater: (video: VideoItem) => void;
  onRetry: () => void;
  onBackToHome: () => void;
}

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({
  query,
  provider,
  status,
  videos,
  onSelectVideo,
  onSelectChannel,
  savedVideoIds,
  onToggleWatchLater,
  onRetry,
  onBackToHome,
}) => {
  const currentProvider = AI_PROVIDERS[provider];
  const isFinished = status.step === 'done';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 light:border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            aria-label="Torna alla Home"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer light:bg-white light:border-slate-200 light:text-slate-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 light:text-indigo-600">
                Risultati Ricerca AI
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs font-medium text-slate-400">
                Curata da {currentProvider.name}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white light:text-slate-900 line-clamp-1 mt-0.5">
              «{query}»
            </h1>
          </div>
        </div>

        {isFinished && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 flex items-center gap-1.5 light:bg-indigo-50 light:border-indigo-200 light:text-indigo-700">
              <Sparkles className="w-3.5 h-3.5" />
              {videos.length} video selezionati e ordinati
            </span>
          </div>
        )}
      </div>

      {/* Progress Stepper & Details */}
      <SearchProgress status={status} onRetry={onRetry} />

      {/* Results Video Grid */}
      {isFinished && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <h2 className="text-base font-bold text-slate-200 light:text-slate-800">
                Video ordinati per punteggio qualitativo dell'AI
              </h2>
            </div>
          </div>

          <VideoGrid
            videos={videos}
            onSelectVideo={onSelectVideo}
            onSelectChannel={onSelectChannel}
            savedVideoIds={savedVideoIds}
            onToggleWatchLater={onToggleWatchLater}
            emptyMessage="Nessun video trovato per questa ricerca."
            showAiReason={true}
          />
        </section>
      )}
    </div>
  );
};
