import React from 'react';
import { UserRound, RefreshCw, ExternalLink, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { ChiParla, LivelloAutorita } from '../types';
import type { ChiECanale } from '../chiParla';

export const COLORE_LIVELLO: Record<LivelloAutorita, string> = {
  alta: 'text-emerald-300 light:text-emerald-700',
  media: 'text-amber-200 light:text-amber-700',
  bassa: 'text-rose-300 light:text-rose-700',
  sconosciuta: 'text-slate-300 light:text-slate-600',
};

const SFONDO_LIVELLO: Record<LivelloAutorita, string> = {
  alta: 'bg-emerald-950/60 border-emerald-500/40 light:bg-emerald-50 light:border-emerald-300',
  media: 'bg-amber-950/50 border-amber-500/40 light:bg-amber-50 light:border-amber-300',
  bassa: 'bg-rose-950/50 border-rose-500/40 light:bg-rose-50 light:border-rose-300',
  sconosciuta: 'bg-slate-800/70 border-slate-600 light:bg-slate-100 light:border-slate-300',
};

/** Riga piccola sulle schede dei risultati: «👤 autore · autorità: livello». */
export const RigaAutorita: React.FC<{ autore?: string; livello?: LivelloAutorita }> = ({ autore, livello }) => {
  if (!autore && !livello) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-300 light:text-slate-600" title={`${autore ?? 'non indicato'} · autorità: ${livello ?? 'sconosciuta'}`}>
      <span className="truncate min-w-0">👤 {autore || 'non indicato'}</span>
      <span className="shrink-0">
        · autorità: <span className={`font-semibold ${COLORE_LIVELLO[livello ?? 'sconosciuta']}`}>{livello ?? 'sconosciuta'}</span>
      </span>
    </p>
  );
};

/** Badge su quanto è sicura l'informazione. */
export const BadgeCertezza: React.FC<{ certezza: 'verificato' | 'dedotto'; webUsato: boolean; demo?: boolean }> = ({ certezza, webUsato, demo }) => {
  if (demo) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-900/70 text-indigo-200 border border-indigo-500/40 light:bg-indigo-100 light:text-indigo-800">dimostrazione · dati inventati</span>;
  }
  if (certezza === 'verificato') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-900/60 text-emerald-200 border border-emerald-500/40 light:bg-emerald-100 light:text-emerald-800">
        <ShieldCheck className="w-3 h-3" /> verificato in rete
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-900/50 text-amber-100 border border-amber-500/40 light:bg-amber-100 light:text-amber-900">
      <ShieldQuestion className="w-3 h-3" /> {webUsato ? 'dedotto da titolo e descrizione' : 'dedotto, non verificato in rete'}
    </span>
  );
};

const Fonti: React.FC<{ fonti: { titolo: string; url: string }[] }> = ({ fonti }) =>
  fonti.length === 0 ? null : (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 light:text-indigo-700 mb-1">Fonti</h4>
      <ul className="space-y-1">
        {fonti.map((f, i) => (
          <li key={i}>
            <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 text-indigo-300 hover:text-indigo-200 underline underline-offset-2 light:text-indigo-700 break-all">
              <ExternalLink className="w-3 h-3 mt-1 shrink-0" />
              {f.titolo || f.url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );

const Voce: React.FC<{ titolo: string; children: React.ReactNode }> = ({ titolo, children }) => (
  <div>
    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 light:text-indigo-700 mb-1">{titolo}</h4>
    <div className="text-slate-200 light:text-slate-700">{children}</div>
  </div>
);

interface ChiParlaBoxProps {
  data: ChiParla | null;
  stato: 'idle' | 'loading' | 'error';
  errore?: string;
  argomento?: string;
  nomeAi: string;
  onAggiorna: () => void;
}

/** Riquadro «Chi parla e con quale autorità» nella pagina del video. */
export const ChiParlaBox: React.FC<ChiParlaBoxProps> = ({ data, stato, errore, argomento, nomeAi, onAggiorna }) => (
  <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-700 light:bg-white light:border-slate-200 space-y-4 text-sm leading-relaxed">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-sm font-bold text-white light:text-slate-900">
        <UserRound className="w-4 h-4 text-indigo-300 light:text-indigo-600" />
        Chi parla e con quale autorità
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {data && <BadgeCertezza certezza={data.certezza} webUsato={data.webUsato} demo={data.demo} />}
        <button
          onClick={onAggiorna}
          disabled={stato === 'loading'}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 disabled:opacity-60 cursor-pointer light:bg-slate-100 light:border-slate-300 light:text-slate-800"
        >
          <RefreshCw className={`w-3 h-3 ${stato === 'loading' ? 'animate-spin' : ''}`} /> Aggiorna
        </button>
      </div>
    </div>

    {stato === 'loading' && (
      <p className="text-slate-300 animate-pulse">{nomeAi} cerca chi è il canale e chi parla (anche in rete)…</p>
    )}
    {stato === 'error' && <p className="text-rose-300 light:text-rose-700">Analisi non disponibile: {errore}</p>}

    {data && (
      <>
        <Voce titolo="Il canale">{data.canale}</Voce>
        <Voce titolo="L'autore / relatore">
          <p className="font-semibold">{data.autore}</p>
          {data.ruolo_affiliazione && data.ruolo_affiliazione !== 'non risulta' && <p>{data.ruolo_affiliazione}</p>}
        </Voce>
        <Voce titolo={argomento ? `Legittimazione su «${argomento}»` : "Legittimazione sull'argomento"}>
          <p>
            <span className={`inline-block mr-2 px-2 py-0.5 rounded-md border text-xs font-bold ${SFONDO_LIVELLO[data.livello]} ${COLORE_LIVELLO[data.livello]}`}>
              autorità: {data.livello}
            </span>
            {data.legittimazione}
          </p>
        </Voce>
        {data.orientamento && data.orientamento !== 'non risulta' && <Voce titolo="Orientamento o parzialità">{data.orientamento}</Voce>}
        <Fonti fonti={data.fonti} />
        <p className="text-[11px] text-slate-400 light:text-slate-500">
          {data.demo
            ? 'Modalità dimostrazione: persone, enti e numeri sono inventati.'
            : data.certezza === 'verificato'
              ? "L'AI ha controllato in rete: apri le fonti per verificare tu stesso."
              : "Ricavato da titolo, descrizione e dati del canale: da prendere con prudenza."}
        </p>
      </>
    )}
  </div>
);

/** Giudizio sul canale (pagina canale). */
export const ChiECanaleBox: React.FC<{
  data: ChiECanale | null;
  stato: 'idle' | 'loading' | 'error';
  errore?: string;
  nomeAi: string;
  onChiedi: () => void;
}> = ({ data, stato, errore, nomeAi, onChiedi }) => (
  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-700 light:bg-white/80 light:border-slate-200 space-y-3 text-sm leading-relaxed">
    {!data ? (
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onChiedi}
          disabled={stato === 'loading'}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-60 cursor-pointer"
        >
          <UserRound className="w-4 h-4" />
          {stato === 'loading' ? `${nomeAi} sta cercando…` : 'Chi è questo canale?'}
        </button>
        {stato === 'error' && <p className="text-rose-300 light:text-rose-700">Non disponibile: {errore}</p>}
      </div>
    ) : (
      <>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white light:text-slate-900">
            <UserRound className="w-4 h-4 text-indigo-300 light:text-indigo-600" /> Chi è questo canale
          </h3>
          <div className="flex items-center gap-2">
            <BadgeCertezza certezza={data.certezza} webUsato={data.webUsato} demo={data.demo} />
            <button onClick={onChiedi} disabled={stato === 'loading'} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 disabled:opacity-60 cursor-pointer light:bg-slate-100 light:border-slate-300 light:text-slate-800">
              <RefreshCw className={`w-3 h-3 ${stato === 'loading' ? 'animate-spin' : ''}`} /> Aggiorna
            </button>
          </div>
        </div>
        <p className="text-slate-200 light:text-slate-700">{data.canale}</p>
        {data.orientamento && data.orientamento !== 'non risulta' && (
          <p className="text-slate-200 light:text-slate-700"><span className="font-semibold">Orientamento: </span>{data.orientamento}</p>
        )}
        <Fonti fonti={data.fonti} />
      </>
    )}
  </div>
);
