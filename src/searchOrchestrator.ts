import { AiProvider, AppSettings, SearchPlan, SearchStatus, VideoEvaluation, VideoItem } from './types';
import { askBridge } from './ponte';
import { mockAiEvaluateVideos, mockAiFetchVideos, mockAiPlanSearch } from './demo/mockAi';
import { fetchYouTubeVideoDetails, searchYouTubeVideos } from './youtube';

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Orchestratore principale della ricerca guidata dall'AI (Passo 1 -> Passo 2 -> Passo 3).
 */
export async function executeAiSearch(params: RunSearchParams): Promise<VideoItem[]> {
  const { query, provider, settings, onStatusUpdate, signal, fetchFn = fetch } = params;
  const inDemo = isDemoMode(settings);

  // --- PASSO 1: L'AI prepara le ricerche ---
  onStatusUpdate({
    step: 'planning',
    message: "L'AI prepara le ricerche…",
    details: `Analisi della richiesta con il modello ${provider}`,
  });

  let plan: SearchPlan;

  if (inDemo) {
    await sleep(400);
    plan = mockAiPlanSearch(query);
  } else {
    const systemPrompt = `Sei il motore di ricerca di Tubo. Analizza la richiesta in linguaggio naturale dell'utente e pianifica da 2 a 4 ricerche mirate per YouTube, identificando lingue, durata minima in minuti ed eventuali termini da escludere. Rispondi ESCLUSIVAMENTE con un oggetto JSON valido nel seguente formato: {"ricerche": ["query 1", "query 2"], "lingue": ["it", "de"], "durata_minima_min": 0, "escludi": ["parola1"]}. Non aggiungere alcun testo, commento o spiegazione oltre al JSON.`;

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

        const retryPrompt = `ERRORE: La tua risposta non era un JSON valido o conteneva testo superfluo. Rispondi ORA SOLTANTO con il JSON grezzo: {"ricerche": ["..."], "lingue": ["..."], "durata_minima_min": 0, "escludi": ["..."]}`;

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
      onStatusUpdate({
        step: 'error',
        message: 'Errore nel Passo 1 (Pianificazione AI)',
        error: err.message,
      });
      throw err;
    }
  }

  // Normalizza campi piano
  if (!Array.isArray(plan.ricerche) || plan.ricerche.length === 0) {
    plan.ricerche = [query];
  }
  if (!Array.isArray(plan.lingue)) {
    plan.lingue = ['it'];
  }
  if (typeof plan.durata_minima_min !== 'number') {
    plan.durata_minima_min = 0;
  }
  if (!Array.isArray(plan.escludi)) {
    plan.escludi = [];
  }

  // --- PASSO 2: Cerco su YouTube ---
  onStatusUpdate({
    step: 'fetching',
    message: 'Cerco su YouTube…',
    details: `Esecuzione di ${plan.ricerche.length} ricerche: ${plan.ricerche.map((r) => `"${r}"`).join(', ')}`,
    plan,
  });

  let rawVideos: VideoItem[] = [];

  if (inDemo) {
    await sleep(500);
    rawVideos = mockAiFetchVideos(plan, query);
  } else {
    try {
      const allVideoIds = new Set<string>();

      for (const singleQuery of plan.ricerche) {
        if (signal?.aborted) throw new Error('Ricerca annullata.');
        const ids = await searchYouTubeVideos({
          query: singleQuery,
          apiKey: settings.youtubeApiKey,
          maxResults: 12,
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
    } catch (err: any) {
      onStatusUpdate({
        step: 'error',
        message: 'Errore nel Passo 2 (Ricerca YouTube)',
        error: err.message,
        plan,
      });
      throw err;
    }
  }

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
    await sleep(600);
    evaluations = mockAiEvaluateVideos(query, rawVideos);
  } else {
    const listSummary = rawVideos.map((v) => ({
      id: v.id,
      titolo: v.title,
      canale: v.channelTitle,
      durata: v.duration,
      descrizione: v.description.slice(0, 200),
    }));

    const evalSystemPrompt = `Sei un curatore di contenuti video critico ed esigente. Valuta i video rispetto alla richiesta dell'utente: "${query}". Assegna a ciascuno un punteggio da 0 a 10 e una breve frase esplicativa sul motivo. Scarta e penalizza severamente acchiappa-clic, titoli sensazionalistici, contenuti banali, promozionali o fuori tema. Premia contenuti rigorosi, approfonditi e aderenti alla richiesta. Rispondi ESCLUSIVAMENTE con un array JSON valido nel formato: [{"id": "...", "punteggio": 0-10, "motivo": "una frase"}]. Nessun testo prima o dopo.`;

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

        const retryPrompt = `ERRORE: La risposta precedente non era un array JSON valido. Rispondi ORA SOLTANTO con l'array JSON: [{"id": "...", "punteggio": 0-10, "motivo": "una frase"}]`;
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
      onStatusUpdate({
        step: 'error',
        message: 'Errore nel Passo 3 (Valutazione AI)',
        error: err.message,
        plan,
      });
      throw err;
    }
  }

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
      aiScore: evaluation ? Math.max(0, Math.min(10, evaluation.punteggio)) : 5.0,
      aiReason: evaluation ? evaluation.motivo : 'Video selezionato dalla ricerca.',
      aiQuery: query,
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
  const system = `Sei un curatore di video critico e onesto. Hai SOLO titolo, canale, durata e descrizione del video (non lo hai visto): non inventare contenuti che lì non compaiono. Scrivi in italiano.
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
  const raw = await askBridge({
    bridgeUrl: settings.bridgeUrl,
    token: settings.bridgeToken,
    provider,
    prompt,
    system,
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
