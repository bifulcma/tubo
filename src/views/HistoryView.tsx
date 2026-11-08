import React, { useState } from 'react';
import { History, Trash2, ArrowLeft, Clock } from 'lucide-react';
import { HistoryEntry, VideoItem } from '../types';
import { VideoCard } from '../components/VideoCard';

interface HistoryViewProps {
  history: HistoryEntry[];
  onSelectVideo: (video: VideoItem) => void;
  onRemoveFromHistory: (videoId: string) => void;
  onClearHistory: () => void;
  savedVideoIds: Set<string>;
  onToggleWatchLater: (video: VideoItem) => void;
  onBackToHome: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onSelectVideo,
  onRemoveFromHistory,
  onClearHistory,
  savedVideoIds,
  onToggleWatchLater,
  onBackToHome,
}) => {
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
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
            <h1 className="text-xl sm:text-2xl font-extrabold text-white light:text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              Cronologia visualizzazioni
            </h1>
            <p className="text-xs text-slate-400 light:text-slate-500 mt-0.5">
              I video che hai guardato su Tubo, salvati localmente nel tuo browser.
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <div>
            {!showConfirmClear ? (
              <button
                onClick={() => setShowConfirmClear(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/40 border border-rose-800/50 text-rose-300 hover:bg-rose-900/40 hover:text-rose-200 transition cursor-pointer light:bg-rose-50 light:border-rose-200 light:text-rose-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Svuota cronologia
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-300 px-2">Sei sicuro?</span>
                <button
                  onClick={() => {
                    onClearHistory();
                    setShowConfirmClear(false);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition cursor-pointer"
                >
                  Sì, svuota
                </button>
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Annulla
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* History List */}
      {history.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mb-4 light:bg-slate-100 light:border-slate-200">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-300 light:text-slate-700">
            La cronologia è vuota
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            I video che guardi appariranno qui automaticamente, salvati in modo sicuro solo sul tuo dispositivo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {history.map(({ video, watchedAt }) => (
            <div key={`${video.id}-${watchedAt}`} className="relative group">
              <VideoCard
                video={video}
                onSelectVideo={onSelectVideo}
                isSavedInWatchLater={savedVideoIds.has(video.id)}
                onToggleWatchLater={onToggleWatchLater}
                showAiReason={false}
              />
              <button
                onClick={() => onRemoveFromHistory(video.id)}
                title="Rimuovi da cronologia"
                className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/75 hover:bg-rose-600 text-slate-300 hover:text-white transition cursor-pointer opacity-0 group-hover:opacity-100 shadow"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
