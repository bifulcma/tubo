import React, { useMemo, useState } from 'react';
import { Sparkles, SlidersHorizontal, ArrowLeft, Calendar } from 'lucide-react';
import { AiProvider, AI_PROVIDERS, Periodo, SearchStatus, VideoItem } from '../types';
import { infoPeriodo, ordinaPerData } from '../periodo';
import { SearchProgress } from '../components/SearchProgress';
import { VideoGrid } from '../components/VideoGrid';

interface SearchResultsViewProps {
  query: string;
  provider: AiProvider;
  periodo?: Periodo;
  status: SearchStatus;
  videos: VideoItem[];
  onSelectVideo: (video: VideoItem) => void;
  onSelectChannel: (channelId: string, channelTitle: string) => void;
  savedVideoIds: Set<string>;
  onToggleWatchLater: (video: VideoItem) => void;
  onRetry: () => void;
  onCancel?: () => void;
  onBackToHome: () => void;
}

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({
  query,
  provider,
  periodo = 'auto',
  status,
  videos,
  onSelectVideo,
  onSelectChannel,
  savedVideoIds,
  onToggleWatchLater,
  onRetry,
  onCancel,
  onBackToHome,
}) => {
  const currentProvider = AI_PROVIDERS[provider];
  const isFinished = status.step === 'done';
  const [ordine, setOrdine] = useState<'voto' | 'data'>('voto');
  const mostrati = useMemo(() => (ordine === 'data' ? ordinaPerData(videos) : videos), [videos, ordine]);

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
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-medium text-slate-400">
                Curata da {currentProvider.name}
              </span>
              {periodo !== 'auto' && (
                <>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-semibold text-sky-300 light:text-sky-700 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {infoPeriodo(periodo).nome}
                  </span>
                </>
              )}
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
      <SearchProgress status={status} onRetry={onRetry} onCancel={onCancel} />

      {/* Ricerca aperta da un indirizzo ma non salvata su questo dispositivo */}
      {status.step === 'idle' && (
        <div className="w-full max-w-4xl mx-auto my-6 p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 light:bg-white light:border-slate-200 space-y-3">
          <p className="text-base font-bold text-white light:text-slate-900">Questa ricerca non è salvata su questo dispositivo.</p>
          <p className="text-sm text-slate-300 light:text-slate-600">
            Per vedere i risultati bisogna rifarla: l'AI lavora di nuovo e si usa un po' della quota di YouTube.
          </p>
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
          >
            Fai la ricerca
          </button>
        </div>
      )}

      {/* Results Video Grid */}
      {isFinished && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <h2 className="text-base font-bold text-slate-200 light:text-slate-800">
                {ordine === 'voto'
                  ? `Video ordinati per punteggio dell'AI${status.plan?.attualita ? ' (conta anche quanto sono recenti)' : ''}`
                  : 'Video dal più recente al più vecchio'}
              </h2>
            </div>
            <div className="flex rounded-xl border border-slate-800 overflow-hidden text-xs font-semibold light:border-slate-200" role="group" aria-label="Ordine dei risultati">
              {([['voto', 'Voto AI'], ['data', 'Più recenti']] as const).map(([id, nome]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setOrdine(id)}
                  aria-pressed={ordine === id}
                  className={`px-3 py-1.5 cursor-pointer transition ${
                    ordine === id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 text-slate-300 hover:text-white light:bg-white light:text-slate-700'
                  }`}
                >
                  {nome}
                </button>
              ))}
            </div>
          </div>

          <VideoGrid
            videos={mostrati}
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
