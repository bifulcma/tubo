import React from 'react';
import { Bookmark, Sparkles, Clock, Check, Play } from 'lucide-react';
import { VideoItem } from '../types';
import { formatViews, formatDate } from '../youtube';
import { RigaAutorita } from './ChiParlaBox';

interface VideoCardProps {
  video: VideoItem;
  onSelectVideo: (video: VideoItem) => void;
  onSelectChannel?: (channelId: string, channelTitle: string) => void;
  isSavedInWatchLater?: boolean;
  onToggleWatchLater?: (video: VideoItem) => void;
  showAiReason?: boolean;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  onSelectVideo,
  onSelectChannel,
  isSavedInWatchLater = false,
  onToggleWatchLater,
  showAiReason = true,
}) => {
  const score = video.aiScore;

  // Stile del badge del punteggio AI
  let scoreBadgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
  if (typeof score === 'number') {
    if (score >= 8.5) {
      scoreBadgeStyle = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-500/30';
    } else if (score >= 7.0) {
      scoreBadgeStyle = 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40';
    } else if (score >= 5.0) {
      scoreBadgeStyle = 'bg-amber-950/80 text-amber-300 border-amber-500/40';
    } else {
      scoreBadgeStyle = 'bg-rose-950/80 text-rose-300 border-rose-500/40';
    }
  }

  const isDiscarded = typeof score === 'number' && score < 4.0;

  return (
    <div
      className={`group flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden bg-slate-900/60 border-slate-800/80 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5 light:bg-white light:border-slate-200 light:hover:border-indigo-300 ${
        isDiscarded ? 'opacity-65 hover:opacity-100' : ''
      }`}
    >
      {/* 16:9 Thumbnail Area */}
      <div
        onClick={() => onSelectVideo(video)}
        className="relative w-full aspect-video bg-slate-950 overflow-hidden cursor-pointer select-none"
      >
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
        />

        {/* Hover play icon */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition">
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </div>
        </div>

        {/* Duration badge */}
        {video.duration && (
          <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/85 backdrop-blur-sm text-white text-[11px] font-semibold tracking-wide flex items-center gap-1 shadow">
            <Clock className="w-3 h-3 text-slate-300" />
            {video.duration}
          </div>
        )}

        {/* Quick Watch Later Button */}
        {onToggleWatchLater && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchLater(video);
            }}
            title={isSavedInWatchLater ? 'Rimuovi da Guarda più tardi' : 'Salva in Guarda più tardi'}
            aria-label="Salva in Guarda più tardi"
            className={`absolute top-2.5 right-2.5 p-2 rounded-xl backdrop-blur-md transition cursor-pointer shadow ${
              isSavedInWatchLater
                ? 'bg-indigo-600 text-white shadow-indigo-500/30'
                : 'bg-black/60 text-slate-200 hover:text-white hover:bg-black/80'
            }`}
          >
            {isSavedInWatchLater ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        )}

        {/* AI Score Pill on Thumbnail */}
        {typeof score === 'number' && (
          <div
            className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-xl text-xs font-bold border backdrop-blur-md flex items-center gap-1.5 shadow ${scoreBadgeStyle}`}
          >
            <Sparkles className="w-3 h-3" />
            <span>{score.toFixed(1)} / 10</span>
          </div>
        )}
      </div>

      {/* Video Content & Metadata */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Title */}
          <h3
            onClick={() => onSelectVideo(video)}
            title={video.title}
            className="font-bold text-sm sm:text-base leading-snug line-clamp-2 text-slate-100 hover:text-indigo-400 light:text-slate-900 light:hover:text-indigo-600 cursor-pointer transition"
          >
            {video.title}
          </h3>

          {/* Channel and statistics */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 light:text-slate-500">
            {/* Channel Avatar icon */}
            <div
              onClick={() => onSelectChannel?.(video.channelId, video.channelTitle)}
              className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 cursor-pointer hover:ring-2 hover:ring-indigo-400 transition"
            >
              {video.channelTitle.charAt(0).toUpperCase()}
            </div>
            <span
              onClick={() => onSelectChannel?.(video.channelId, video.channelTitle)}
              className="font-medium truncate max-w-full min-w-[4rem] hover:text-indigo-300 light:hover:text-indigo-700 cursor-pointer transition"
            >
              {video.channelTitle}
            </span>
            <span>•</span>
            <span className="shrink-0">{formatViews(video.viewCount)}</span>
            {video.publishedAt && (
              <>
                <span>•</span>
                <span className="shrink-0">{formatDate(video.publishedAt)}</span>
              </>
            )}
          </div>
          <RigaAutorita autore={video.aiAutore} livello={video.aiAutorita} />
        </div>

        {/* AI Reason ("Il perché dell'AI") */}
        {showAiReason && video.aiReason && (
          <div className="mt-3.5 pt-3 border-t border-slate-800/80 light:border-slate-100">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs light:bg-slate-50 light:border-slate-200">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400 light:text-indigo-600 mb-1">
                <Sparkles className="w-3 h-3" />
                <span>Perché l'AI lo raccomanda:</span>
              </div>
              <p className="text-slate-300 light:text-slate-600 italic line-clamp-2 leading-relaxed">
                «{video.aiReason}»
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
