import React, { useState } from 'react';
import { Users, Film, Eye, MapPin, CalendarDays, ExternalLink } from 'lucide-react';
import { ChannelDetails } from '../types';

const numero = (n?: number) => (typeof n === 'number' ? n.toLocaleString('it-IT') : undefined);

const PAESI: Record<string, string> = {
  IT: 'Italia', DE: 'Germania', AT: 'Austria', CH: 'Svizzera', FR: 'Francia', ES: 'Spagna',
  GB: 'Regno Unito', US: 'Stati Uniti', VA: 'Città del Vaticano', BE: 'Belgio', NL: 'Paesi Bassi',
  PT: 'Portogallo', IE: 'Irlanda', CA: 'Canada', AR: 'Argentina', MX: 'Messico', BR: 'Brasile', PL: 'Polonia',
};

export function nomePaese(code?: string): string | undefined {
  if (!code) return undefined;
  return PAESI[code.toUpperCase()] ?? code.toUpperCase();
}

interface ChannelCardProps {
  channel?: ChannelDetails;
  fallbackTitle: string;
  loading?: boolean;
  error?: string;
  children?: React.ReactNode;   // spazio per il giudizio dell'AI («Chi è questo canale?»)
}

/** Scheda del canale con i dati di YouTube (chi è, da quando, iscritti, video, paese). */
export const ChannelCard: React.FC<ChannelCardProps> = ({ channel, fallbackTitle, loading, error, children }) => {
  const [aperta, setAperta] = useState(false);
  const titolo = channel?.title || fallbackTitle || 'Canale';
  const dati: { icon: React.ReactNode; testo: string }[] = [];
  if (channel) {
    dati.push({
      icon: <Users className="w-3.5 h-3.5" />,
      testo: typeof channel.subscriberCount === 'number' ? `${numero(channel.subscriberCount)} iscritti` : 'iscritti nascosti',
    });
    if (typeof channel.videoCount === 'number') dati.push({ icon: <Film className="w-3.5 h-3.5" />, testo: `${numero(channel.videoCount)} video` });
    if (typeof channel.viewCount === 'number') dati.push({ icon: <Eye className="w-3.5 h-3.5" />, testo: `${numero(channel.viewCount)} visualizzazioni` });
    if (channel.publishedAt) dati.push({ icon: <CalendarDays className="w-3.5 h-3.5" />, testo: `dal ${new Date(channel.publishedAt).getFullYear()}` });
    if (channel.country) dati.push({ icon: <MapPin className="w-3.5 h-3.5" />, testo: nomePaese(channel.country)! });
  }
  const link = channel?.customUrl
    ? `https://www.youtube.com/${channel.customUrl.startsWith('@') ? channel.customUrl : '@' + channel.customUrl}`
    : channel?.id && !channel.demo ? `https://www.youtube.com/channel/${channel.id}` : undefined;

  return (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border border-slate-800 p-5 sm:p-8 light:from-indigo-100 light:via-white light:to-purple-100 light:border-slate-200 shadow-xl">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
        {channel?.thumbnailUrl ? (
          <img src={channel.thumbnailUrl} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-slate-900 light:ring-white shrink-0" />
        ) : (
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center font-extrabold text-3xl shadow-xl ring-4 ring-slate-900 light:ring-white shrink-0">
            {titolo.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="space-y-2 min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white light:text-slate-900 tracking-tight break-words">{titolo}</h1>
          {channel?.customUrl && <p className="text-xs text-slate-300 light:text-slate-600">{channel.customUrl}</p>}
          {loading && <p className="text-sm text-slate-300 animate-pulse">Carico i dati del canale da YouTube…</p>}
          {error && <p className="text-sm text-amber-300 light:text-amber-700">Dati del canale non disponibili: {error}</p>}
          {dati.length > 0 && (
            <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs sm:text-sm text-slate-200 light:text-slate-700">
              {dati.map((d, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className="text-indigo-300 light:text-indigo-600">{d.icon}</span>
                  {d.testo}
                </span>
              ))}
            </div>
          )}
          {channel?.description && (
            <div>
              <p className={`text-sm text-slate-300 light:text-slate-700 whitespace-pre-line max-w-2xl ${aperta ? '' : 'line-clamp-3'}`}>
                {channel.description}
              </p>
              {channel.description.length > 180 && (
                <button onClick={() => setAperta(!aperta)} className="mt-1 text-xs font-bold text-indigo-300 light:text-indigo-700 cursor-pointer">
                  {aperta ? 'Mostra meno' : 'Mostra tutta la descrizione'}
                </button>
              )}
            </div>
          )}
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200 light:text-indigo-700">
              <ExternalLink className="w-3 h-3" /> Apri su YouTube
            </a>
          )}
        </div>
      </div>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
};
