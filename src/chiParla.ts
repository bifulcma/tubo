import { AiProvider, AppSettings, ChannelDetails, ChiParla, LivelloAutorita, VideoItem, nomeLingua, normalizzaLivello } from './types';
import { askBridge } from './ponte';
import { extractAndParseJson, isAnnullata } from './searchOrchestrator';
import { cacheGet, cacheSet, CACHE_CHI_PARLA, CACHE_CHI_E_CANALE, UN_GIORNO } from './storage';

/** Giudizio sul solo canale (pagina canale, e parte «canale» di «Chi parla»). */
export interface ChiECanale {
  canale: string;
  orientamento: string;
  fonti: { titolo: string; url: string }[];
  certezza: 'verificato' | 'dedotto';
  webUsato: boolean;
  at: number;
  demo?: boolean;
}

const DURATA_CACHE = 30 * UN_GIORNO;
const NON_RISULTA = 'non risulta';

function testo(x: unknown, riserva = NON_RISULTA): string {
  if (x === null || x === undefined) return riserva;
  const s = (Array.isArray(x) ? x.join('; ') : String(x)).trim();
  return s ? s : riserva;
}

function fontiValide(x: unknown): { titolo: string; url: string }[] {
  if (!Array.isArray(x)) return [];
  const out: { titolo: string; url: string }[] = [];
  for (const f of x) {
    const url = typeof f === 'string' ? f : f?.url;
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) continue;
    const titolo = typeof f === 'object' && f?.titolo ? String(f.titolo) : url.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0];
    if (!out.some((o) => o.url === url.trim())) out.push({ titolo: titolo.trim(), url: url.trim() });
  }
  return out.slice(0, 8);
}

/**
 * Legge la risposta dell'AI per «Chi parla» (anche dentro ```json e con campi mancanti).
 * Senza ricerca in rete il risultato è sempre «dedotto».
 */
export function parseChiParla(raw: string, webUsato: boolean, now = Date.now()): ChiParla {
  const d: any = extractAndParseJson<any>(raw);
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error("L'AI non ha risposto nel formato atteso.");
  const fonti = fontiValide(d.fonti);
  const verificato = webUsato && String(d.certezza || '').toLowerCase().startsWith('verific') && fonti.length > 0;
  return {
    canale: testo(d.canale),
    autore: testo(d.autore),
    ruolo_affiliazione: testo(d.ruolo_affiliazione ?? d.ruolo ?? d.affiliazione),
    legittimazione: testo(d.legittimazione),
    livello: (normalizzaLivello(d.livello) ?? 'sconosciuta') as LivelloAutorita,
    orientamento: testo(d.orientamento),
    fonti,
    certezza: verificato ? 'verificato' : 'dedotto',
    webUsato,
    at: now,
  };
}

export function parseChiECanale(raw: string, webUsato: boolean, now = Date.now()): ChiECanale {
  const d: any = extractAndParseJson<any>(raw);
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error("L'AI non ha risposto nel formato atteso.");
  const fonti = fontiValide(d.fonti);
  return {
    canale: testo(d.canale),
    orientamento: testo(d.orientamento),
    fonti,
    certezza: webUsato && String(d.certezza || '').toLowerCase().startsWith('verific') && fonti.length > 0 ? 'verificato' : 'dedotto',
    webUsato,
    at: now,
  };
}

function datiCanale(c?: ChannelDetails) {
  if (!c) return undefined;
  return {
    nome: c.title,
    indirizzo: c.customUrl,
    paese: c.country,
    creato_il: c.publishedAt ? c.publishedAt.slice(0, 10) : undefined,
    iscritti: c.subscriberCount ?? 'nascosti',
    video_pubblicati: c.videoCount,
    visualizzazioni_totali: c.viewCount,
    argomenti_youtube: c.topics,
    descrizione: (c.description || '').slice(0, 1500),
  };
}

const REGOLE = `Regole ferree:
- NON inventare titoli accademici, cariche, affiliazioni od opere. Se un dato non si sa, scrivi "non risulta".
- Distingui ciò che hai verificato in rete da ciò che deduci da titolo, descrizione e dati del canale (scrivilo nel testo, es. «dalla descrizione:…», «secondo il sito dell'università…»).
- "certezza" è "verificato" solo se l'identità del relatore o del canale è confermata da almeno una fonte in rete che elenchi in "fonti"; altrimenti "dedotto".`;

function istruzioniRete(web: boolean): string {
  return web
    ? 'Puoi cercare in rete: verifica canale e relatore su fonti affidabili (siti di università, istituti, ordini religiosi, editori, cataloghi di biblioteche, enciclopedie) e indica le fonti usate con titolo e indirizzo. Non cercare nei file locali.'
    : 'NON puoi cercare in rete e non devi usare strumenti né cercare file: basati solo sui dati qui sotto. Lascia "fonti" vuoto (salvo indirizzi presenti nella descrizione) e metti "certezza": "dedotto".';
}

export function promptChiParla(video: VideoItem, channel: ChannelDetails | undefined, settings: AppSettings, web: boolean) {
  const argomento = video.aiQuery?.trim() || video.title;
  const system = `Sei un documentalista scrupoloso. Devi dire CHI parla in un video di YouTube e con quale autorità parla dell'argomento cercato dall'utente: «${argomento}».
${istruzioniRete(web)}
${REGOLE}
Campi da compilare:
- "canale": chi è il canale (persona, università, istituto, editore, divulgatore, canale di ripubblicazione o aggregatore…), da quando esiste, iscritti, quanti video, paese.
- "autore": nome di chi parla (relatore/autore) o "non risulta".
- "ruolo_affiliazione": ruolo, affiliazione (università, ordine religioso, istituto), opere principali se note.
- "legittimazione": perché è o non è qualificato su QUESTO argomento («${argomento}»).
- "livello": "alta" | "media" | "bassa" | "sconosciuta".
- "orientamento": eventuale orientamento o parzialità dichiarata (scuola di pensiero, confessione, partito, fini commerciali) o "non risulta".
Scrivi i testi in ${nomeLingua(settings.aiLanguage)}, in modo semplice e breve (1-3 frasi per campo).
Rispondi SOLO con JSON, senza altro testo: {"canale": "...", "autore": "...", "ruolo_affiliazione": "...", "legittimazione": "...", "livello": "alta|media|bassa|sconosciuta", "orientamento": "...", "fonti": [{"titolo": "...", "url": "..."}], "certezza": "verificato|dedotto"}`;
  const prompt = JSON.stringify(
    {
      argomento_della_ricerca: argomento,
      video: {
        titolo: video.title,
        canale: video.channelTitle,
        pubblicato: video.publishedAt?.slice(0, 10),
        durata: video.duration,
        descrizione: (video.description || '').slice(0, 3000),
        autore_indicato_dal_passo_3: video.aiAutore,
      },
      dati_canale_youtube: datiCanale(channel),
    },
    null,
    2
  );
  return { system, prompt };
}

export function promptChiECanale(channel: ChannelDetails, settings: AppSettings, web: boolean) {
  const system = `Sei un documentalista scrupoloso. Devi dire CHI è un canale YouTube e quale orientamento ha.
${istruzioniRete(web)}
${REGOLE}
Campi: "canale" = chi è (persona, università, istituto, editore, divulgatore, canale di ripubblicazione o aggregatore…), chi c'è dietro, da quando esiste, iscritti, quanti video, paese, di che cosa si occupa (3-5 frasi); "orientamento" = eventuale orientamento o parzialità dichiarata (scuola di pensiero, confessione, partito, fini commerciali) o "non risulta".
Scrivi in ${nomeLingua(settings.aiLanguage)}, in modo semplice.
Rispondi SOLO con JSON: {"canale": "...", "orientamento": "...", "fonti": [{"titolo": "...", "url": "..."}], "certezza": "verificato|dedotto"}`;
  return { system, prompt: JSON.stringify({ dati_canale_youtube: datiCanale(channel) }, null, 2) };
}

/**
 * Chiede all'AI prima CON ricerca in rete; se il ponte non la supporta o fallisce,
 * riprova una volta senza rete (il risultato sarà «dedotto, non verificato in rete»).
 */
async function chiediConRete<T>(opts: {
  settings: AppSettings;
  provider: AiProvider;
  costruisci: (web: boolean) => { system: string; prompt: string };
  leggi: (raw: string, webUsato: boolean) => T;
  signal?: AbortSignal;
  fetchFn?: typeof fetch;
}): Promise<T> {
  const { settings, provider, costruisci, leggi, signal, fetchFn } = opts;
  const chiedi = async (web: boolean) => {
    const { system, prompt } = costruisci(web);
    const raw = await askBridge({
      bridgeUrl: settings.bridgeUrl,
      token: settings.bridgeToken,
      provider,
      system,
      prompt,
      web,
      signal,
      fetchFn,
    });
    return leggi(raw, web);
  };
  try {
    return await chiedi(true);
  } catch (e) {
    if (isAnnullata(e, signal)) throw e;
    return await chiedi(false);
  }
}

export async function analizzaChiParla(opts: {
  video: VideoItem;
  channel?: ChannelDetails;
  provider: AiProvider;
  settings: AppSettings;
  signal?: AbortSignal;
  fetchFn?: typeof fetch;
}): Promise<ChiParla> {
  const { video, channel, settings } = opts;
  const r = await chiediConRete({
    ...opts,
    costruisci: (web) => promptChiParla(video, channel, settings, web),
    leggi: (raw, web) => parseChiParla(raw, web),
  });
  saveChiParla(video.id, r);
  // la parte «canale» vale per tutti i video dello stesso canale
  if (video.channelId) {
    saveChiECanale(video.channelId, { canale: r.canale, orientamento: r.orientamento, fonti: r.fonti, certezza: r.certezza, webUsato: r.webUsato, at: r.at });
  }
  return r;
}

export async function analizzaCanale(opts: {
  channel: ChannelDetails;
  provider: AiProvider;
  settings: AppSettings;
  signal?: AbortSignal;
  fetchFn?: typeof fetch;
}): Promise<ChiECanale> {
  const { channel, settings } = opts;
  const r = await chiediConRete({
    ...opts,
    costruisci: (web) => promptChiECanale(channel, settings, web),
    leggi: (raw, web) => parseChiECanale(raw, web),
  });
  saveChiECanale(channel.id, r);
  return r;
}

// --- memoria sul dispositivo ---
export function loadChiParla(videoId: string): ChiParla | null {
  return cacheGet<ChiParla>(CACHE_CHI_PARLA, videoId, DURATA_CACHE);
}
export function saveChiParla(videoId: string, r: ChiParla): void {
  cacheSet(CACHE_CHI_PARLA, videoId, r, 300);
}
export function loadChiECanale(channelId: string): ChiECanale | null {
  return cacheGet<ChiECanale>(CACHE_CHI_E_CANALE, channelId, DURATA_CACHE);
}
export function saveChiECanale(channelId: string, r: ChiECanale): void {
  cacheSet(CACHE_CHI_E_CANALE, channelId, r, 300);
}
