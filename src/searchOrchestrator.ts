import { AiProvider, AppSettings, ChannelDetails, PlannedQuery, normalizzaLivello, SearchPlan, SearchStatus, VideoEvaluation, VideoItem, nomeLingua, testoRicerca } from './types';
import { askBridge, fetchTranscript, transcriptToText } from './ponte';
import { mockAiEvaluateVideos, mockAiFetchVideos, mockAiPlanSearch } from './demo/mockAi';
import { durataPerYouTube, fetchChannelDetails, fetchYouTubeVideoDetails, searchYouTubeVideos } from './youtube';

export interface RunSearchParams {
  query: string;
  provider: AiProvider;
  settings: AppSettings;
  onStatusUpdate: (status: SearchStatus) => void;
  signal?: AbortSignal;
  fetchFn?: typeof fetch;
}

/**
 * Estrae e parsifica una stringa JSON anche se il modello l'ha racchiusa
 * in blocchi di codice markdown (es. ```json ... ```).
 */
export function extractAndParseJson<T>(raw: string): T {
  let cleaned = raw.trim();

  // Rimuovi eventuali blocchi markdown ```json ... ``` o ``` ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
    cleaned = cleaned.trim();
  }

  // Se ci sono caratteri prima del primo { o [, cerchiamo il primo delimitatore valido
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIndex = -1;

  if (firstBrace !== -1 && firstBracket !== -1) {
    startIndex = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIndex = firstBrace;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
  }

  if (startIndex > 0) {
    cleaned = cleaned.slice(startIndex);
  }

  return JSON.parse(cleaned) as T;
}

/**
 * Determina se utilizzare la modalità dimostrazione.
 */
export function isDemoMode(settings: AppSettings): boolean {
  if (settings.demoMode) return true;
  // Se manca la chiave API di YouTube o il token del ponte, attiva automaticamente la modalità demo
  if (!settings.youtubeApiKey?.trim() || !settings.bridgeToken?.trim()) {
    return true;
  }
  return false;
}

/** Errore usato quando l'utente annulla: non va mostrato come errore rosso. */
export class RicercaAnnullata extends Error {
  constructor() {
    super('Ricerca annullata.');
    this.name = 'AbortError';
  }
}

export function isAnnullata(err: unknown, signal?: AbortSignal): boolean {
  return !!signal?.aborted || (err as any)?.name === 'AbortError';
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new RicercaAnnullata());
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(t); reject(new RicercaAnnullata()); }, { once: true });
  });

const CODICE_LINGUA = /^[a-z]{2}$/;

function codiceLingua(x: unknown): string | undefined {
  const v = String(x ?? '').trim().toLowerCase().slice(0, 2);
  return CODICE_LINGUA.test(v) ? v : undefined;
}

/**
 * Mette in ordine il piano dell'AI. Accetta sia il vecchio formato
 * ("ricerche": ["..."]) sia il nuovo ("ricerche": [{"q": "...", "lingua": "de"}]).
 */
export function normalizePlan(raw: any, query: string): SearchPlan {
  const p: any = raw && typeof raw === 'object' ? raw : {};
  const ricerche: PlannedQuery[] = (Array.isArray(p.ricerche) ? p.ricerche : [])
    .map((r: any): PlannedQuery | null => {
      if (typeof r === 'string') return r.trim() ? r.trim() : null;
      if (r && typeof r === 'object' && typeof r.q === 'string' && r.q.trim()) {
        const lingua = codiceLingua(r.lingua);
        return lingua ? { q: r.q.trim(), lingua } : { q: r.q.trim() };
      }
      return null;
    })
    .filter((r: PlannedQuery | null): r is PlannedQuery => r !== null);
  const lingue = (Array.isArray(p.lingue) ? p.lingue : []).map(codiceLingua).filter(Boolean) as string[];
  const durata = Number(p.durata_minima_min);
  return {
    ricerche: ricerche.length ? ricerche : [query],
    lingue: lingue.length ? lingue : ['it'],
    durata_minima_min: isFinite(durata) && durata > 0 ? durata : 0,
    escludi: (Array.isArray(p.escludi) ? p.escludi : []).map((e: any) => String(e)).filter((e: string) => e.trim()),
  };
}

/** Lingua con cui cercare una singola ricerca del piano (relevanceLanguage). */
export function linguaRicerca(r: PlannedQuery, plan: SearchPlan): string | undefined {
  if (typeof r !== 'string' && r.lingua) return r.lingua;
  return plan.lingue[0];
}

/** Dati del canale da dare all'AI al passo 3 (solo l'essenziale). */
export function canaleInBreve(c?: ChannelDetails): Record<string, unknown> | undefined {
  if (!c) return undefined;
  return {
    iscritti: c.subscriberCount ?? 'nascosti',
    video_pubblicati: c.videoCount,
    paese: c.country,
    dal: c.publishedAt ? c.publishedAt.slice(0, 4) : undefined,
    descrizione: (c.description || '').replace(/\s+/g, ' ').slice(0, 200),
  };
}

/**
 * Orchestratore principale della ricerca guidata dall'AI (Passo 1 -> Passo 2 -> Passo 3).
 */
export async function executeAiSearch(params: RunSearchParams): Promise<VideoItem[]> {
  const { query, provider, settings, signal, fetchFn = fetch } = params;
  const inDemo = isDemoMode(settings);
  // una ricerca annullata non deve più toccare lo schermo
  const onStatusUpdate = (st: SearchStatus) => {
    if (!signal?.aborted) params.onStatusUpdate(st);
  };
  const controlla = () => {
    if (signal?.aborted) throw new RicercaAnnullata();
  };

  // --- PASSO 1: L'AI prepara le ricerche ---
  onStatusUpdate({
    step: 'planning',
    message: "L'AI prepara le ricerche…",
    details: `Analisi della richiesta con il modello ${provider}`,
  });

  let plan: SearchPlan;

  if (inDemo) {
    await sleep(400, signal);
    plan = mockAiPlanSearch(query);
  } else {
    const systemPrompt = `Sei il motore di ricerca di Tubo. Analizza la richiesta in linguaggio naturale dell'utente e pianifica da 2 a 4 ricerche mirate per YouTube, identificando lingue, durata minima in minuti ed eventuali termini da escludere. Ogni ricerca va scritta nella lingua in cui vuoi trovare i video e porta il codice di quella lingua. Rispondi ESCLUSIVAMENTE con un oggetto JSON valido nel seguente formato: {"ricerche": [{"q": "query 1", "lingua": "it"}, {"q": "query 2", "lingua": "de"}], "lingue": ["it", "de"], "durata_minima_min": 0, "escludi": ["parola1"]}. "lingue" elenca le lingue in ordine di preferenza (la prima è la principale). Tubo è pensato soprattutto per VIDEO LUNGHI (lezioni, conferenze, seminari): se l'utente NON chiede esplicitamente video brevi, imposta "durata_minima_min" a 20; se chiede video brevi o una durata precisa, rispetta la sua richiesta (video brevi = 0, durata precisa = quel numero di minuti). Non aggiungere alcun testo, commento o spiegazione oltre al JSON.${
      settings.videoLanguages?.length
        ? ` L'utente preferisce video in: ${settings.videoLanguages.map(nomeLingua).join(', ')} (codici ${settings.videoLanguages.join(', ')}): scrivi le ricerche in quelle lingue e mettile in "lingue", salvo che la richiesta ne chieda esplicitamente altre.`
        : ''
    }`;

    let planRaw: string;
    try {
      planRaw = await askBridge({
        bridgeUrl: settings.bridgeUrl,
        token: settings.bridgeToken,
        provider,
        prompt: `Richiesta utente: "${query}"`,
        system: systemPrompt,
        signal,
        fetchFn,
      });

      try {
        plan = extractAndParseJson<SearchPlan>(planRaw);
      } catch (firstErr) {
        // Riprova una volta come da specifica: "Se il JSON dell'AI non è valido, riprova una volta e poi mostra l'errore."
        onStatusUpdate({
          step: 'planning',
          message: "L'AI prepara le ricerche… (nuovo tentativo formattazione)",
          details: 'La prima risposta non era un JSON valido, ritento con istruzioni più stringenti…',
        });

        const retryPrompt = `ERRORE: La tua risposta non era un JSON valido o conteneva testo superfluo. Rispondi ORA SOLTANTO con il JSON grezzo: {"ricerche": [{"q": "...", "lingua": "it"}], "lingue": ["..."], "durata_minima_min": 0, "escludi": ["..."]}`;

        planRaw = await askBridge({
          bridgeUrl: settings.bridgeUrl,
          token: settings.bridgeToken,
          provider,
          prompt: `${retryPrompt}\nRichiesta originale: "${query}"`,
          system: systemPrompt,
          signal,
          fetchFn,
        });

        try {
          plan = extractAndParseJson<SearchPlan>(planRaw);
        } catch {
          throw new Error(`Risposta non valida dell'AI (Passo 1): ${planRaw.slice(0, 100)}…`);
        }
      }
    } catch (err: any) {
      if (isAnnullata(err, signal)) throw new RicercaAnnullata();
      onStatusUpdate({
        step: 'error',
        message: 'Errore nel Passo 1 (Pianificazione AI)',
        error: err.message,
      });
      throw err;
    }
  }

  // Normalizza campi piano (vecchio e nuovo formato)
  plan = normalizePlan(plan, query);
  controlla();

  // --- PASSO 2: Cerco su YouTube ---
  onStatusUpdate({
    step: 'fetching',
    message: 'Cerco su YouTube…',
    details: `Esecuzione di ${plan.ricerche.length} ricerche: ${plan.ricerche.map((r) => `"${testoRicerca(r)}"`).join(', ')}`,
    plan,
  });

  let rawVideos: VideoItem[] = [];
  let canali: Record<string, ChannelDetails> = {};

  if (inDemo) {
    await sleep(500, signal);
    rawVideos = mockAiFetchVideos(plan, query);
  } else {
    try {
      const allVideoIds = new Set<string>();
      const videoDuration = durataPerYouTube(plan.durata_minima_min);

      for (const r of plan.ricerche) {
        controlla();
        const ids = await searchYouTubeVideos({
          query: testoRicerca(r),
          apiKey: settings.youtubeApiKey,
          maxResults: 12,
          relevanceLanguage: linguaRicerca(r, plan),
          videoDuration,
          signal,
          fetchFn,
        });
        ids.forEach((id) => allVideoIds.add(id));
      }

      const uniqueIds = Array.from(allVideoIds);
      if (uniqueIds.length === 0) {
        onStatusUpdate({
          step: 'done',
          message: 'Nessun video trovato su YouTube per i parametri specificati.',
          plan,
        });
        return [];
      }

      // Recupera dettagli completi (durata, visualizzazioni, etc.)
      const details = await fetchYouTubeVideoDetails({
        videoIds: uniqueIds,
        apiKey: settings.youtubeApiKey,
        signal,
        fetchFn,
      });

      // Filtra durata minima ed esclusioni
      rawVideos = details.filter((video) => {
        if (plan.durata_minima_min > 0 && video.durationSec < plan.durata_minima_min * 60) {
          return false;
        }

        const titleLower = video.title.toLowerCase();
        const descLower = video.description.toLowerCase();
        const isExcluded = plan.escludi.some((term) => {
          const t = term.toLowerCase();
          return titleLower.includes(t) || descLower.includes(t);
        });

        return !isExcluded;
      });

      // Chi sono i canali dei risultati: una sola chiamata (1 unità), se fallisce si va avanti senza
      try {
        canali = await fetchChannelDetails({
          ids: rawVideos.map((v) => v.channelId),
          apiKey: settings.youtubeApiKey,
          signal,
          fetchFn,
        });
      } catch (e) {
        if (isAnnullata(e, signal)) throw e;
        canali = {};
      }
    } catch (err: any) {
      if (isAnnullata(err, signal)) throw new RicercaAnnullata();
      onStatusUpdate({
        step: 'error',
        message: 'Errore nel Passo 2 (Ricerca YouTube)',
        error: err.message,
        plan,
      });
      throw err;
    }
  }

  controlla();
  if (rawVideos.length === 0) {
    onStatusUpdate({
      step: 'done',
      message: 'Nessun video corrisponde ai criteri dopo i filtri di durata ed esclusione.',
      plan,
    });
    return [];
  }

  // --- PASSO 3: L'AI sceglie i migliori e scarta acchiappa-clic ---
  onStatusUpdate({
    step: 'evaluating',
    message: "L'AI sceglie i video e scarta i contenuti fuori tema…",
    details: `Valutazione comparativa di ${rawVideos.length} video trovati`,
    plan,
  });

  let evaluations: VideoEvaluation[] = [];

  if (inDemo) {
    await sleep(600, signal);
    evaluations = mockAiEvaluateVideos(query, rawVideos);
  } else {
    const listSummary = rawVideos.map((v) => ({
      id: v.id,
      titolo: v.title,
      canale: v.channelTitle,
      dati_canale: canaleInBreve(canali[v.channelId]),
      durata: v.duration,
      descrizione: v.description.slice(0, 800),
    }));

    const evalSystemPrompt = `Sei un curatore di contenuti video critico ed esigente. Valuta i video rispetto alla richiesta dell'utente: "${query}". Assegna a ciascuno un punteggio da 0 a 10 e una breve frase esplicativa sul motivo. Scarta e penalizza severamente acchiappa-clic, titoli sensazionalistici, contenuti banali, promozionali o fuori tema. Premia contenuti rigorosi, approfonditi e aderenti alla richiesta. Per ogni video indica anche "autore" (chi parla, se si capisce da titolo, descrizione o canale, altrimenti "non indicato"; non inventare nomi) e "autorita" sull'argomento della richiesta: "alta" | "media" | "bassa" | "sconosciuta" (usa i dati del canale quando ci sono). Scrivi il motivo in ${nomeLingua(settings.aiLanguage)}. Rispondi ESCLUSIVAMENTE con un array JSON valido nel formato: [{"id": "...", "punteggio": 0-10, "motivo": "una frase", "autore": "...", "autorita": "alta|media|bassa|sconosciuta"}]. Nessun testo prima o dopo.`;

    let evalRaw: string;
    try {
      evalRaw = await askBridge({
        bridgeUrl: settings.bridgeUrl,
        token: settings.bridgeToken,
        provider,
        prompt: `Ecco l'elenco dei video da valutare:\n${JSON.stringify(listSummary, null, 2)}`,
        system: evalSystemPrompt,
        signal,
        fetchFn,
      });

      try {
        evaluations = extractAndParseJson<VideoEvaluation[]>(evalRaw);
      } catch {
        // Riprova una volta
        onStatusUpdate({
          step: 'evaluating',
          message: "L'AI sceglie… (nuovo tentativo formattazione)",
          details: 'La risposta non era un JSON valido, secondo tentativo…',
          plan,
        });

        const retryPrompt = `ERRORE: La risposta precedente non era un array JSON valido. Rispondi ORA SOLTANTO con l'array JSON: [{"id": "...", "punteggio": 0-10, "motivo": "una frase", "autore": "...", "autorita": "alta|media|bassa|sconosciuta"}]`;
        evalRaw = await askBridge({
          bridgeUrl: settings.bridgeUrl,
          token: settings.bridgeToken,
          provider,
          prompt: `${retryPrompt}\nElenco video:\n${JSON.stringify(listSummary, null, 2)}`,
          system: evalSystemPrompt,
          signal,
          fetchFn,
        });

        try {
          evaluations = extractAndParseJson<VideoEvaluation[]>(evalRaw);
        } catch {
          throw new Error(`Risposta non valida dell'AI (Passo 3): ${evalRaw.slice(0, 100)}…`);
        }
      }
    } catch (err: any) {
      if (isAnnullata(err, signal)) throw new RicercaAnnullata();
      onStatusUpdate({
        step: 'error',
        message: 'Errore nel Passo 3 (Valutazione AI)',
        error: err.message,
        plan,
      });
      throw err;
    }
  }

  controlla();
  // Associa punteggio e motivo a ciascun video
  const evalMap = new Map<string, VideoEvaluation>();
  if (Array.isArray(evaluations)) {
    for (const ev of evaluations) {
      if (ev && ev.id) {
        evalMap.set(ev.id, ev);
      }
    }
  }

  const scoredVideos: VideoItem[] = rawVideos.map((v) => {
    const evaluation = evalMap.get(v.id);
    return {
      ...v,
      aiScore: evaluation ? Math.max(0, Math.min(10, Number(evaluation.punteggio) || 0)) : 5.0,
      aiReason: evaluation ? evaluation.motivo : 'Video selezionato dalla ricerca.',
      aiQuery: query,
      // retro-compatibile: se l'AI non manda autore/autorità i campi restano vuoti
      aiAutore: evaluation?.autore ? String(evaluation.autore).trim() || undefined : undefined,
      aiAutorita: normalizzaLivello(evaluation?.autorita),
    };
  });

  // Ordina per punteggio decrescente
  scoredVideos.sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0));

  onStatusUpdate({
    step: 'done',
    message: 'Ricerca e selezione AI completata con successo!',
    details: `${scoredVideos.length} video ordinati per pertinenza qualitativa`,
    plan,
  });

  return scoredVideos;
}


// L'AI (soprattutto Argon) a volte torna senza risposta: si riprova una volta.
// Argon lavora nella cartella dei libri di Penna: gli si dice di non cercare file.
const SOLO_TESTO = '\nNon usare strumenti e non cercare file: rispondi subito, solo dal testo che ti do qui.';

async function askConRiprova(o: Parameters<typeof askBridge>[0]): Promise<string> {
  try {
    return await askBridge(o);
  } catch (e) {
    if (o.signal?.aborted) throw e;
    return await askBridge(o);
  }
}

// --- Riassunto e commento del voto, preparati quando si apre un video ---
export interface VideoReview {
  riassunto: string;
  commento: string;
}

export async function reviewVideo(opts: {
  video: VideoItem;
  provider: AiProvider;
  settings: AppSettings;
  signal?: AbortSignal;
  fetchFn?: typeof fetch;
}): Promise<VideoReview> {
  const { video, provider, settings, signal, fetchFn } = opts;
  const voto = typeof video.aiScore === 'number' ? `${video.aiScore}/10` : 'non assegnato';
  const system = `Sei un curatore di video critico e onesto. Hai SOLO titolo, canale, durata e descrizione del video (non lo hai visto): non inventare contenuti che lì non compaiono. Scrivi in ${nomeLingua(settings.aiLanguage)}.
Rispondi ESCLUSIVAMENTE con un oggetto JSON: {"riassunto": "2-3 frasi su che cosa tratta il video", "commento": "2-3 frasi che giustificano il voto ${voto} rispetto alla richiesta dell'utente: punti di forza, limiti, per chi è adatto"}.`;
  const prompt = JSON.stringify({
    richiesta_utente: video.aiQuery || '',
    voto: voto,
    motivo_breve: video.aiReason || '',
    titolo: video.title,
    canale: video.channelTitle,
    durata: video.duration,
    descrizione: (video.description || '').slice(0, 3000),
  }, null, 2);
  const raw = await askConRiprova({
    bridgeUrl: settings.bridgeUrl,
    token: settings.bridgeToken,
    provider,
    prompt,
    system: system + SOLO_TESTO,
    signal,
    fetchFn,
  });
  let r: Partial<VideoReview> = {};
  try {
    r = extractAndParseJson<VideoReview>(raw);
  } catch {
    throw new Error("L'AI non ha risposto nel formato atteso.");
  }
  if (!r.riassunto || !r.commento) throw new Error("L'AI non ha risposto nel formato atteso.");
  return { riassunto: String(r.riassunto), commento: String(r.commento) };
}


// --- Dalla trascrizione: riassunto a capitoli e ricerca di un punto preciso ---
export interface TranscriptDigest {
  riassunto: string;
  capitoli: { t: number; titolo: string }[];
}

const transcriptCache = new Map<string, string>();

async function transcriptText(video: VideoItem, settings: AppSettings, fetchFn?: typeof fetch): Promise<string> {
  const c = transcriptCache.get(video.id);
  if (c) return c;
  const segs = await fetchTranscript({ bridgeUrl: settings.bridgeUrl, token: settings.bridgeToken, videoId: video.id, fetchFn });
  if (!segs.length) throw new Error('Questo video non ha sottotitoli.');
  const txt = transcriptToText(segs);
  transcriptCache.set(video.id, txt);
  return txt;
}

export async function digestFromTranscript(opts: {
  video: VideoItem; provider: AiProvider; settings: AppSettings; fetchFn?: typeof fetch;
}): Promise<TranscriptDigest> {
  const { video, provider, settings, fetchFn } = opts;
  const txt = await transcriptText(video, settings, fetchFn);
  const breve = txt.length < 2500;   // video di pochi minuti: niente capitoli
  const system = breve
    ? `Hai la trascrizione completa di un video breve. Scrivi in ${nomeLingua(settings.aiLanguage)}, anche se il video è in un'altra lingua. Non inventare nulla che non sia nella trascrizione.
Rispondi ESCLUSIVAMENTE con un oggetto JSON: {"riassunto": "2-4 frasi: che cosa dice e con quale tesi", "capitoli": []}.`
    : `Hai la trascrizione completa di un video, a blocchi con l'orario [mm:ss]. Scrivi in ${nomeLingua(settings.aiLanguage)}, anche se il video è in un'altra lingua. Non inventare nulla che non sia nella trascrizione.
Rispondi ESCLUSIVAMENTE con un oggetto JSON: {"riassunto": "5-8 frasi: tesi principali, argomenti, conclusione", "capitoli": [{"t": secondi_di_inizio, "titolo": "titolo breve del capitolo"}]} con 5-10 capitoli in ordine di tempo; "t" deve essere un numero di secondi preso dagli orari della trascrizione.`;
  const raw = await askConRiprova({
    bridgeUrl: settings.bridgeUrl, token: settings.bridgeToken, provider, system: system + SOLO_TESTO, fetchFn,
    prompt: `Video: «${video.title}» (${video.channelTitle})\nRichiesta dell'utente: ${video.aiQuery || '-'}\n\nTRASCRIZIONE:\n${txt}`,
  });
  const d = extractAndParseJson<TranscriptDigest>(raw);
  if (!d || !d.riassunto) throw new Error("L'AI non ha risposto nel formato atteso.");
  const capitoli = (Array.isArray(d.capitoli) ? d.capitoli : [])
    .map((c: any) => ({ t: Math.max(0, Math.round(Number(c.t) || 0)), titolo: String(c.titolo || '') }))
    .filter((c) => c.titolo)
    .sort((a, b) => a.t - b.t);
  return { riassunto: String(d.riassunto), capitoli };
}

export async function findMoment(opts: {
  video: VideoItem; provider: AiProvider; settings: AppSettings; domanda: string; fetchFn?: typeof fetch;
}): Promise<{ t: number; spiegazione: string } | null> {
  const { video, provider, settings, domanda, fetchFn } = opts;
  const txt = await transcriptText(video, settings, fetchFn);
  const system = `Hai la trascrizione di un video a blocchi con l'orario [mm:ss]. Trova il punto in cui si parla di ciò che chiede l'utente. Scrivi in ${nomeLingua(settings.aiLanguage)}.
Rispondi ESCLUSIVAMENTE con JSON: {"t": secondi_di_inizio, "spiegazione": "una frase su che cosa si dice lì"} oppure {"t": null, "spiegazione": "non se ne parla"} se l'argomento non c'è.`;
  const raw = await askConRiprova({
    bridgeUrl: settings.bridgeUrl, token: settings.bridgeToken, provider, system: system + SOLO_TESTO, fetchFn,
    prompt: `Cerco: ${domanda}\n\nTRASCRIZIONE:\n${txt}`,
  });
  const d = extractAndParseJson<{ t: number | null; spiegazione: string }>(raw);
  if (d == null || d.t == null || isNaN(Number(d.t))) return null;
  return { t: Math.max(0, Math.round(Number(d.t))), spiegazione: String(d.spiegazione || '') };
}
