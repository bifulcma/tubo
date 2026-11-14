import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  Sparkles,
  Share2,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Clock,
} from 'lucide-react';
import { VideoItem, AiProvider, AppSettings, AI_PROVIDERS, ChiParla } from '../types';
import { FAMIGLIA } from '../famiglia';
import { reviewVideo, VideoReview, digestFromTranscript, findMoment, TranscriptDigest } from '../searchOrchestrator';
import { loadReview, saveReview, loadDigest, saveDigest } from '../storage';
import { formatViews, formatDate } from '../youtube';
import { etichettaData } from '../periodo';
import { shareUrl } from '../router';
import { fetchChannelDetails } from '../youtube';
import { analizzaChiParla, loadChiParla } from '../chiParla';
import { mockChiParla } from '../demo/mockAi';
import { ChiParlaBox } from '../components/ChiParlaBox';

interface WatchViewProps {
  video: VideoItem;
  suggestedVideos: VideoItem[];
  onSelectVideo: (video: VideoItem) => void;
  onSelectChannel: (channelId: string, channelTitle: string) => void;
  isSavedInWatchLater: boolean;
  onToggleWatchLater: (video: VideoItem) => void;
  onBack: () => void;
  settings: AppSettings;
  provider: AiProvider;
  demo: boolean;
}

export const WatchView: React.FC<WatchViewProps> = ({
  video,
  suggestedVideos,
  onSelectVideo,
  onSelectChannel,
  isSavedInWatchLater,
  onToggleWatchLater,
  onBack,
  settings,
  provider,
  demo,
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Scroll to top when video changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsDescriptionExpanded(false);
  }, [video.id]);


  // Riassunto e commento del voto: preparati dall'AI all'apertura, poi ricordati
  const [review, setReview] = useState<VideoReview | null>(null);
  const [reviewState, setReviewState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [reviewError, setReviewError] = useState('');
  const finto = demo || video.id.startsWith('demo-') || video.id.includes('CLICKBAIT');

  useEffect(() => {
    setReview(null);
    setReviewError('');
    if (finto) { setReviewState('idle'); return; }
    const salvato = loadReview(video.id);
    if (salvato) { setReview(salvato); setReviewState('idle'); return; }
    // se esci dalla pagina prima della risposta il lavoro non si butta: si salva e lo ritrovi
    let attivo = true;
    setReviewState('loading');
    reviewVideo({ video, provider, settings })
      .then((r) => { saveReview(video.id, r); if (attivo) { setReview(r); setReviewState('idle'); } })
      .catch((e: any) => {
        if (!attivo) return;
        setReviewError(e?.message || 'Errore');
        setReviewState('error');
      });
    return () => { attivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id]);


  // «Chi parla e con quale autorità»: preparato all'apertura, poi ricordato (per video e per canale)
  const [chi, setChi] = useState<ChiParla | null>(null);
  const [chiStato, setChiStato] = useState<'idle' | 'loading' | 'error'>('idle');
  const [chiErrore, setChiErrore] = useState('');
  const chiAttivo = React.useRef<string>('');

  const preparaChiParla = (forza: boolean) => {
    const vid = video.id;
    chiAttivo.current = vid;
    setChiErrore('');
    if (finto) {
      setChiStato('loading');
      setTimeout(() => {
        if (chiAttivo.current !== vid) return;
        setChi(mockChiParla(video));
        setChiStato('idle');
      }, 350);
      return;
    }
    if (!forza) {
      const salvato = loadChiParla(vid);
      if (salvato) { setChi(salvato); setChiStato('idle'); return; }
    }
    setChiStato('loading');
    fetchChannelDetails({ ids: [video.channelId], apiKey: settings.youtubeApiKey })
      .then((c) => c[video.channelId])
      .catch(() => undefined)
      .then((channel) => analizzaChiParla({ video, channel, provider, settings }))
      .then((r) => { if (chiAttivo.current === vid) { setChi(r); setChiStato('idle'); } })
      .catch((e: any) => {
        if (chiAttivo.current !== vid) return;
        setChiErrore(e?.message || 'Errore');
        setChiStato('error');
      });
  };

  useEffect(() => {
    setChi(null);
    preparaChiParla(false);
    return () => { chiAttivo.current = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id]);


  // Dalla trascrizione: riassunto a capitoli e «portami al punto in cui…»
  const [startAt, setStartAt] = useState(0);
  const [digest, setDigest] = useState<TranscriptDigest | null>(null);
  const [digestState, setDigestState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [digestError, setDigestError] = useState('');
  const [domanda, setDomanda] = useState('');
  const [momento, setMomento] = useState<{ stato: 'idle' | 'loading' | 'ok' | 'nessuno' | 'error'; t?: number; testo?: string }>({ stato: 'idle' });

  useEffect(() => {
    setStartAt(0);
    setDigest(loadDigest(video.id));
    setDigestState('idle');
    setDigestError('');
    setDomanda('');
    setMomento({ stato: 'idle' });
  }, [video.id]);

  const mmss = (t: number) => {
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = Math.floor(t % 60);
    return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(sec).padStart(2, '0')}`;
  };

  const vaiA = (t: number) => {
    setStartAt(t);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const riassumiTrascrizione = () => {
    const vid = video.id;
    setDigestState('loading');
    setDigestError('');
    digestFromTranscript({ video, provider, settings })
      .then((d) => { saveDigest(vid, d); if (vid === video.id) { setDigest(d); setDigestState('idle'); } })
      .catch((e: any) => { setDigestError(e?.message || 'Errore'); setDigestState('error'); });
  };

  const cercaMomento = () => {
    if (!domanda.trim()) return;
    setMomento({ stato: 'loading' });
    findMoment({ video, provider, settings, domanda })
      .then((r) => {
        if (!r) { setMomento({ stato: 'nessuno' }); return; }
        setMomento({ stato: 'ok', t: r.t, testo: r.spiegazione });
        vaiA(r.t);
      })
      .catch((e: any) => setMomento({ stato: 'error', testo: e?.message || 'Errore' }));
  };

  const handleShare = () => {
    // l'indirizzo di questa pagina di Tubo (si riapre direttamente sul video)
    const link = shareUrl({ page: 'watch', id: video.id });
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).catch(() => { /* niente */ });
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const score = video.aiScore;
  let scoreBadgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
  if (typeof score === 'number') {
    if (score >= 8.5) {
      scoreBadgeStyle = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
    } else if (score >= 7.0) {
      scoreBadgeStyle = 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40';
    } else if (score >= 5.0) {
      scoreBadgeStyle = 'bg-amber-950/80 text-amber-300 border-amber-500/40';
    } else {
      scoreBadgeStyle = 'bg-rose-950/80 text-rose-300 border-rose-500/40';
    }
  }

  // Filtra i video suggeriti escludendo quello attualmente in riproduzione
  const otherSuggested = suggestedVideos.filter((v) => v.id !== video.id);

  return (
    <div className="pb-16 max-w-7xl mx-auto">
      {/* Top Back bar */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer text-xs font-medium light:bg-white light:border-slate-200 light:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna indietro
        </button>
      </div>

      {/* Main 2-column Layout (Video column on left, suggestions on right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Player, Video Info, Description */}
        <div className="lg:col-span-8 space-y-5">
          {/* Official Embedded Video Player */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-slate-800 light:border-slate-300">
            {video.id.startsWith('demo-') || video.id.includes('CLICKBAIT') ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-center p-6 text-slate-300">
                <p className="text-base font-semibold">Video dimostrativo</p>
                <p className="text-sm text-slate-400">Questo video è inventato. Inserisci chiave YouTube e ponte nelle Impostazioni per guardare video veri.</p>
              </div>
            ) : (
            <iframe
              key={`${video.id}-${startAt}`}
              src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0${startAt ? `&start=${startAt}` : ''}`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
            )}
          </div>

          {/* Video Title */}
          <h1 className="text-xl sm:text-2xl font-extrabold text-white light:text-slate-900 tracking-tight leading-snug">
            {video.title}
          </h1>

          {/* Channel Info & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-y border-slate-800/80 light:border-slate-200">
            {/* Channel info */}
            <div
              onClick={() => onSelectChannel(video.channelId, video.channelTitle)}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center font-bold text-base shadow-md group-hover:ring-2 group-hover:ring-indigo-400 transition">
                {video.channelTitle.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-slate-100 group-hover:text-indigo-400 light:text-slate-900 light:group-hover:text-indigo-600 transition">
                  {video.channelTitle}
                </h4>
                <p data-testid="data-sotto-titolo" className="text-xs sm:text-sm text-slate-300 light:text-slate-600">
                  <span className="font-semibold">
                    {video.publishedAt ? `Pubblicato il ${formatDate(video.publishedAt)}` : 'Data non specificata'}
                  </span>
                  {video.viewCount ? <> · {formatViews(video.viewCount)}</> : null}
                  {video.duration ? <> · {video.duration}</> : null}
                </p>
              </div>
            </div>

            {/* Actions: Guarda più tardi, Condividi */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleWatchLater(video)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  isSavedInWatchLater
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                    : 'bg-slate-900 text-slate-200 border-slate-800 hover:bg-slate-800 hover:text-white light:bg-slate-100 light:border-slate-200 light:text-slate-800'
                }`}
              >
                {isSavedInWatchLater ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                <span>{isSavedInWatchLater ? 'Salvato' : 'Guarda più tardi'}</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-slate-200 border border-slate-800 hover:bg-slate-800 hover:text-white transition cursor-pointer light:bg-slate-100 light:border-slate-200 light:text-slate-800"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'Link copiato!' : 'Condividi'}</span>
              </button>
            </div>
          </div>

          {/* AI Curated Review Box */}
          {video.aiReason && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-purple-950/30 border border-indigo-500/30 shadow-lg light:from-indigo-50/60 light:via-white light:to-purple-50/30 light:border-indigo-200">
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 light:text-indigo-600">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white light:text-slate-900">
                    Valutazione dell'Intelligenza Artificiale
                  </h3>
                </div>

                {typeof score === 'number' && (
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border ${scoreBadgeStyle}`}>
                    {score.toFixed(1)} / 10
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-200 light:text-slate-700 leading-relaxed italic">
                «{video.aiReason}»
              </p>
              {!finto && (
                <div className="mt-4 space-y-3 text-sm leading-relaxed">
                  {reviewState === 'loading' && (
                    <p className="text-slate-400 animate-pulse">
                      {AI_PROVIDERS[provider]?.name ?? provider} prepara riassunto e commento…
                    </p>
                  )}
                  {reviewState === 'error' && (
                    <p className="text-red-400">Riassunto non disponibile: {reviewError}</p>
                  )}
                  {review && (
                    <>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 light:text-indigo-600 mb-1">Riassunto</h4>
                        <p className="text-slate-200 light:text-slate-700">{review.riassunto}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 light:text-indigo-600 mb-1">Perché questo voto</h4>
                        <p className="text-slate-200 light:text-slate-700">{review.commento}</p>
                      </div>
                      <p className="text-[11px] text-slate-400">Dal titolo e dalla descrizione del video: l'AI non lo ha guardato.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Chi parla e con quale autorità */}
          <ChiParlaBox
            data={chi}
            stato={chiStato}
            errore={chiErrore}
            argomento={video.aiQuery}
            nomeAi={AI_PROVIDERS[provider]?.name ?? provider}
            onAggiorna={() => preparaChiParla(true)}
          />

          {/* Dalla trascrizione (non in TuboF: YouTube blocca le trascrizioni ai server cloud) */}
          {!finto && !FAMIGLIA && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 light:bg-white light:border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-white light:text-slate-900">Dalla trascrizione del video</h3>

              {digest ? (
                <div className="space-y-3 text-sm leading-relaxed">
                  <p className="text-slate-200 light:text-slate-700">{digest.riassunto}</p>
                  {digest.capitoli.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 light:text-indigo-600 mb-1.5">Capitoli</h4>
                      <ul className="space-y-1">
                        {digest.capitoli.map((c, i) => (
                          <li key={i}>
                            <button onClick={() => vaiA(c.t)} className="text-left cursor-pointer hover:text-indigo-300 text-slate-300 light:text-slate-700">
                              <span className="font-mono text-indigo-400 mr-2">{mmss(c.t)}</span>{c.titolo}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <button
                    onClick={riassumiTrascrizione}
                    disabled={digestState === 'loading'}
                    className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-60 cursor-pointer"
                  >
                    {digestState === 'loading' ? 'Leggo la trascrizione…' : 'Riassumi dalla trascrizione (con capitoli)'}
                  </button>
                  {digestState === 'loading' && (
                    <p className="mt-2 text-xs text-slate-400 animate-pulse">{AI_PROVIDERS[provider]?.name ?? provider} legge tutto il video: per una lezione lunga può volerci un minuto o due.</p>
                  )}
                  {digestState === 'error' && <p className="mt-2 text-sm text-red-400">{digestError}</p>}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Portami al punto in cui…</label>
                <div className="flex gap-2">
                  <input
                    value={domanda}
                    onChange={(e) => setDomanda(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') cercaMomento(); }}
                    placeholder="es. parla di Peterson e del katechon"
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                  />
                  <button
                    onClick={cercaMomento}
                    disabled={momento.stato === 'loading' || !domanda.trim()}
                    className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-60 cursor-pointer"
                  >
                    {momento.stato === 'loading' ? 'Cerco…' : 'Vai'}
                  </button>
                </div>
                {momento.stato === 'ok' && (
                  <p className="mt-2 text-sm text-slate-300 light:text-slate-700">
                    <button onClick={() => vaiA(momento.t!)} className="font-mono text-indigo-400 mr-2 cursor-pointer">{mmss(momento.t!)}</button>
                    {momento.testo}
                  </p>
                )}
                {momento.stato === 'nessuno' && <p className="mt-2 text-sm text-slate-400">Nella trascrizione non se ne parla.</p>}
                {momento.stato === 'error' && <p className="mt-2 text-sm text-red-400">{momento.testo}</p>}
              </div>
            </div>
          )}

          {/* Views, Date & Expandable Description */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 light:bg-slate-50 light:border-slate-200">
            <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-300 light:text-slate-700 mb-3">
              <span>{formatViews(video.viewCount)}</span>
              <span>•</span>
              <span>{video.publishedAt ? formatDate(video.publishedAt) : 'Data non specificata'}</span>
              {video.duration && (
                <>
                  <span>•</span>
                  <span>Durata: {video.duration}</span>
                </>
              )}
            </div>

            <div
              className={`text-xs sm:text-sm text-slate-300 light:text-slate-600 whitespace-pre-line leading-relaxed ${
                !isDescriptionExpanded ? 'line-clamp-3' : ''
              }`}
            >
              {video.description || 'Nessuna descrizione disponibile per questo video.'}
            </div>

            {video.description && video.description.length > 150 && (
              <button
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="mt-3 text-xs font-bold text-indigo-400 hover:text-indigo-300 light:text-indigo-600 light:hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                {isDescriptionExpanded ? (
                  <>
                    <span>Mostra meno</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Mostra altro</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Suggested Videos from the same search */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 light:border-slate-200">
            <h3 className="font-bold text-base text-white light:text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Video suggeriti</span>
            </h3>
            <span className="text-xs text-slate-400">
              Dalla stessa ricerca
            </span>
          </div>

          {otherSuggested.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">Nessun altro video suggerito al momento.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {otherSuggested.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectVideo(item)}
                  className="group flex gap-3 p-2 rounded-xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800/60 hover:border-indigo-500/30 transition cursor-pointer light:bg-slate-50 light:border-slate-200 light:hover:bg-slate-100"
                >
                  {/* Small 16:9 thumbnail */}
                  <div className="relative w-36 aspect-video shrink-0 rounded-lg overflow-hidden bg-slate-950">
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                    {item.duration && (
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-black/80 text-white flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {item.duration}
                      </span>
                    )}
                    {typeof item.aiScore === 'number' && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-500/40">
                        {item.aiScore.toFixed(1)}
                      </span>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <h4 className="font-bold text-xs leading-snug line-clamp-2 text-slate-200 group-hover:text-indigo-400 light:text-slate-800 light:group-hover:text-indigo-600 transition">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 light:text-slate-500 truncate mt-1">
                        {item.channelTitle}
                      </p>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                      <span>{formatViews(item.viewCount)}</span>
                      {etichettaData(item.publishedAt) && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-slate-300 light:text-slate-600">{etichettaData(item.publishedAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
