import React from 'react';
import { Bookmark, ArrowLeft } from 'lucide-react';
import { VideoItem } from '../types';
import { VideoGrid } from '../components/VideoGrid';

interface WatchLaterViewProps {
  videos: VideoItem[];
  onSelectVideo: (video: VideoItem) => void;
  onSelectChannel: (channelId: string, channelTitle: string) => void;
  savedVideoIds: Set<string>;
  onToggleWatchLater: (video: VideoItem) => void;
  onBackToHome: () => void;
}

export const WatchLaterView: React.FC<WatchLaterViewProps> = ({
  videos,
  onSelectVideo,
  onSelectChannel,
  savedVideoIds,
  onToggleWatchLater,
  onBackToHome,
}) => {
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4 light:border-slate-200">
        <button
          onClick={onBackToHome}
          aria-label="Torna alla Home"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer light:bg-white light:border-slate-200 light:text-slate-600"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white light:text-slate-900 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-indigo-400" />
              Guarda più tardi
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white">
              {videos.length}
            </span>
          </div>
          <p className="text-xs text-slate-400 light:text-slate-500 mt-0.5">
            I tuoi video salvati per essere guardati con calma.
          </p>
        </div>
      </div>

      {/* Grid */}
      <VideoGrid
        videos={videos}
        onSelectVideo={onSelectVideo}
        onSelectChannel={onSelectChannel}
        savedVideoIds={savedVideoIds}
        onToggleWatchLater={onToggleWatchLater}
        emptyMessage="Nessun video salvato in «Guarda più tardi»."
        showAiReason={true}
      />
    </div>
  );
};
