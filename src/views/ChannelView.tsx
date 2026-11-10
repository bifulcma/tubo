import React, { useEffect, useState } from 'react';
import { ArrowLeft, Tv } from 'lucide-react';
import { AiProvider, AppSettings, ChannelDetails, VideoItem } from '../types';
import { VideoGrid } from '../components/VideoGrid';
import { ChannelCard } from '../components/ChannelCard';
import { fetchChannelDetails, fetchChannelVideos } from '../youtube';
import { ChiECanaleBox } from '../components/ChiParlaBox';
import { ChiECanale, analizzaCanale, loadChiECanale } from '../chiParla';
import { mockChannelDetails, mockChiParla } from '../demo/mockAi';
import { AI_PROVIDERS } from '../types';

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
  provider,
  demo,
}) => {
  const [channel, setChannel] = useState<ChannelDetails | undefined>(() =>
    demo ? mockChannelDetails(channelId, channelTitle || 'Canale dimostrativo') : undefined
  );
  const [giudizio, setGiudizio] = useState<ChiECanale | null>(() => (demo ? null : loadChiECanale(channelId)));
  const [giudizioStato, setGiudizioStato] = useState<'idle' | 'loading' | 'error'>('idle');
  const [giudizioErrore, setGiudizioErrore] = useState('');

  const chiediGiudizio = async () => {
    setGiudizioStato('loading');
    setGiudizioErrore('');
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 350));
        const m = mockChiParla({ channelId, channelTitle } as VideoItem);
        setGiudizio({ canale: m.canale, orientamento: m.orientamento, fonti: [], certezza: 'dedotto', webUsato: false, at: Date.now(), demo: true });
      } else {
        const c = channel ?? (await fetchChannelDetails({ ids: [channelId], apiKey: settings.youtubeApiKey }))[channelId];
        if (!c) throw new Error('YouTube non conosce questo canale.');
        setGiudizio(await analizzaCanale({ channel: c, provider, settings }));
      }
      setGiudizioStato('idle');
    } catch (e: any) {
      setGiudizioErrore(e?.message || 'Errore');
      setGiudizioStato('error');
    }
  };
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
      >
        <ChiECanaleBox
          data={giudizio}
          stato={giudizioStato}
          errore={giudizioErrore}
          nomeAi={AI_PROVIDERS[provider]?.name ?? provider}
          onChiedi={chiediGiudizio}
        />
      </ChannelCard>

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
