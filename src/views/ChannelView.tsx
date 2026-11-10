import React, { useEffect, useState } from 'react';
import { ArrowLeft, Tv } from 'lucide-react';
import { AiProvider, AppSettings, ChannelDetails, VideoItem } from '../types';
import { VideoGrid } from '../components/VideoGrid';
import { ChannelCard } from '../components/ChannelCard';
import { fetchChannelVideos } from '../youtube';

interface ChannelViewProps {
  channelId: string;
  channelTitle: string;
  videos: VideoItem[];          // solo in demo: catalogo finto da cui pescare
  onSelectVideo: (video: VideoItem) => void;
  savedVideoIds: Set<string>;
  onToggleWatchLater: (video: VideoItem) => void;
  onBack: () => void;
  settings: AppSettings;
  provider: AiProvider;
  demo: boolean;
}

export const ChannelView: React.FC<ChannelViewProps> = ({
  channelId,
  channelTitle,
  videos,
  onSelectVideo,
  savedVideoIds,
  onToggleWatchLater,
  onBack,
  settings,
  demo,
}) => {
  const [channel, setChannel] = useState<ChannelDetails | undefined>(undefined);
  const [veri, setVeri] = useState<VideoItem[]>([]);
  const [stato, setStato] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errore, setErrore] = useState('');

  // Fuori dalla demo: i video veri del canale (pochi punti di quota)
  useEffect(() => {
    if (demo) return;
    const ctrl = new AbortController();
    setStato('loading');
    fetchChannelVideos({ channelId, apiKey: settings.youtubeApiKey, signal: ctrl.signal })
      .then((r) => {
        setChannel(r.channel);
        setVeri(r.videos);
        setStato('idle');
      })
      .catch((e: any) => {
        if (ctrl.signal.aborted) return;
        setErrore(e?.message || 'Errore');
        setStato('error');
      });
    return () => ctrl.abort();
  }, [channelId, demo, settings.youtubeApiKey]);

  const channelVideos = demo
    ? videos.filter((v, i, arr) => (v.channelId === channelId || v.channelTitle === channelTitle) && arr.findIndex((x) => x.id === v.id) === i)
    : veri;

  return (
    <div className="space-y-8 pb-12">
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer text-xs font-medium light:bg-white light:border-slate-200 light:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna indietro
        </button>
      </div>

      <ChannelCard
        channel={channel}
        fallbackTitle={channelTitle || channel?.title || ''}
        loading={!demo && stato === 'loading' && !channel}
        error={!demo && stato === 'error' ? errore : undefined}
      />

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Tv className="w-4 h-4 text-slate-400" />
          <h2 className="text-lg font-bold text-white light:text-slate-900">
            {demo ? `Video caricati (${channelVideos.length})` : `Ultimi video caricati (${channelVideos.length})`}
          </h2>
        </div>

        {!demo && stato === 'loading' ? (
          <p className="text-sm text-slate-300 animate-pulse">Carico i video del canale…</p>
        ) : (
          <VideoGrid
            videos={channelVideos}
            onSelectVideo={onSelectVideo}
            savedVideoIds={savedVideoIds}
            onToggleWatchLater={onToggleWatchLater}
            emptyMessage={stato === 'error' ? 'Non sono riuscito a caricare i video del canale.' : 'Nessun video trovato per questo canale.'}
            showAiReason={true}
          />
        )}
      </section>
    </div>
  );
};
