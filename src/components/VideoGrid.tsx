import React from 'react';
import { VideoItem } from '../types';
import { VideoCard } from './VideoCard';
import { Tv } from 'lucide-react';

interface VideoGridProps {
  videos: VideoItem[];
  onSelectVideo: (video: VideoItem) => void;
  onSelectChannel?: (channelId: string, channelTitle: string) => void;
  savedVideoIds?: Set<string>;
  onToggleWatchLater?: (video: VideoItem) => void;
  emptyMessage?: string;
  showAiReason?: boolean;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  videos,
  onSelectVideo,
  onSelectChannel,
  savedVideoIds = new Set(),
  onToggleWatchLater,
  emptyMessage = 'Nessun video disponibile.',
  showAiReason = true,
}) => {
  if (videos.length === 0) {
    return (
      <div className="py-16 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mb-4 light:bg-slate-100 light:border-slate-200">
          <Tv className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-300 light:text-slate-700">
          {emptyMessage}
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Prova a digitare una ricerca nella barra in alto per trovare nuovi contenuti analizzati dall'AI.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          onSelectVideo={onSelectVideo}
          onSelectChannel={onSelectChannel}
          isSavedInWatchLater={savedVideoIds.has(video.id)}
          onToggleWatchLater={onToggleWatchLater}
          showAiReason={showAiReason}
        />
      ))}
    </div>
  );
};
