import React from 'react';
import { ArrowLeft, Users, Tv } from 'lucide-react';
import { VideoItem } from '../types';
import { VideoGrid } from '../components/VideoGrid';

interface ChannelViewProps {
  channelId: string;
  channelTitle: string;
  videos: VideoItem[];
  onSelectVideo: (video: VideoItem) => void;
  savedVideoIds: Set<string>;
  onToggleWatchLater: (video: VideoItem) => void;
  onBack: () => void;
}

export const ChannelView: React.FC<ChannelViewProps> = ({
  channelTitle,
  videos,
  onSelectVideo,
  savedVideoIds,
  onToggleWatchLater,
  onBack,
}) => {
  const channelVideos = videos.filter((v) => v.channelTitle === channelTitle);

  return (
    <div className="space-y-8 pb-12">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer text-xs font-medium light:bg-white light:border-slate-200 light:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna indietro
        </button>
      </div>

      {/* Channel Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border border-slate-800 p-6 sm:p-8 light:from-indigo-100 light:via-white light:to-purple-100 light:border-slate-200 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center font-extrabold text-3xl shadow-xl ring-4 ring-slate-900 light:ring-white shrink-0">
            {channelTitle.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white light:text-slate-900 tracking-tight">
              {channelTitle}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 light:text-slate-600 flex items-center justify-center sm:justify-start gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Canale con contenuti accademici e approfondimenti</span>
            </p>
            <p className="text-xs text-slate-500 max-w-xl">
              Tutti i video e le lezioni catalogate per questo canale.
            </p>
          </div>
        </div>
      </div>

      {/* Videos from this channel */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Tv className="w-4 h-4 text-slate-400" />
          <h2 className="text-lg font-bold text-white light:text-slate-900">
            Video caricati ({channelVideos.length})
          </h2>
        </div>

        <VideoGrid
          videos={channelVideos}
          onSelectVideo={onSelectVideo}
          savedVideoIds={savedVideoIds}
          onToggleWatchLater={onToggleWatchLater}
          emptyMessage="Nessun video trovato per questo canale."
          showAiReason={true}
        />
      </section>
    </div>
  );
};
