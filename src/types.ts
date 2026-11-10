export type AiProvider = 'nemotron' | 'claude' | 'argon';

export interface AiProviderConfig {
  id: AiProvider;
  name: string;
  description: string;
  shortDescription: string;   // mini-descrizione mostrata accanto al nome
  isLocal: boolean;
  badge: string;
}

/** «Nemotron 3.5 — locale sul Mac Studio» */
export function nomeCompletoAi(p: AiProviderConfig): string {
  return `${p.name} — ${p.shortDescription}`;
}

export const AI_PROVIDERS: Record<AiProvider, AiProviderConfig> = {
  nemotron: {
    id: 'nemotron',
    name: 'Nemotron 3.5',
    description: 'NVIDIA Nemotron 3.5 Super via Ollama: privato, nessun costo',
    shortDescription: 'locale sul Mac Studio',
    isLocal: true,
    badge: 'Locale',
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    description: 'Anthropic Claude: analisi dei testi più raffinata',
    shortDescription: 'Anthropic, nel cloud',
    isLocal: false,
    badge: 'Cloud',
  },
  argon: {
    id: 'argon',
    name: 'Argon',
    description: 'Google Gemini 3.8 Flash via Antigravity',
    shortDescription: 'Gemini Flash, nel cloud, rapido',
    isLocal: false,
    badge: 'Cloud',
  },
};

export interface VideoItem {
  id: string;
  title: string;
  channelTitle: string;
  channelId: string;
  channelAvatar?: string;
  description: string;
  duration: string; // e.g. "45:12"
  durationSec: number;
  viewCount: number;
  publishedAt: string;
  thumbnailUrl: string;
  aiScore?: number; // 0 - 10
  aiReason?: string;
  aiQuery?: string;      // la richiesta per cui l'AI ha dato il voto
  aiSummary?: string;    // riassunto preparato all'apertura del video
  aiComment?: string;    // commento che giustifica il voto
  aiAutore?: string;     // chi parla (dal passo 3), «non indicato» se non si capisce
  aiAutorita?: LivelloAutorita; // autorevolezza sull'argomento (dal passo 3)
}

export type LivelloAutorita = 'alta' | 'media' | 'bassa' | 'sconosciuta';

export const LIVELLI_AUTORITA: LivelloAutorita[] = ['alta', 'media', 'bassa', 'sconosciuta'];

export function normalizzaLivello(x: unknown): LivelloAutorita | undefined {
  const v = String(x ?? '').trim().toLowerCase();
  return (LIVELLI_AUTORITA as string[]).includes(v) ? (v as LivelloAutorita) : undefined;
}

/** Una ricerca del piano: testo semplice (vecchio formato) o con la sua lingua. */
export type PlannedQuery = string | { q: string; lingua?: string };

export function testoRicerca(r: PlannedQuery): string {
  return typeof r === 'string' ? r : r.q;
}

/** Dati di un canale da YouTube (channels.list). */
export interface ChannelDetails {
  id: string;
  title: string;
  description: string;
  country?: string;
  publishedAt?: string;
  customUrl?: string;
  subscriberCount?: number;   // assente se il canale nasconde gli iscritti
  videoCount?: number;
  viewCount?: number;
  thumbnailUrl?: string;
  uploadsPlaylistId?: string;
  topics?: string[];
  demo?: boolean;
}

/** «Chi parla e con quale autorità»: giudizio dell'AI su canale e relatore. */
export interface ChiParla {
  canale: string;
  autore: string;
  ruolo_affiliazione: string;
  legittimazione: string;
  livello: LivelloAutorita;
  orientamento: string;
  fonti: { titolo: string; url: string }[];
  certezza: 'verificato' | 'dedotto';
  webUsato: boolean;     // false = il ponte non ha potuto cercare in rete
  at: number;
  demo?: boolean;
}

export interface SearchPlan {
  ricerche: PlannedQuery[];
  lingue: string[];
  durata_minima_min: number;
  escludi: string[];
}

export interface VideoEvaluation {
  id: string;
  punteggio: number;
  motivo: string;
  autore?: string;
  autorita?: string;
}

export type SearchStepState = 'idle' | 'planning' | 'fetching' | 'evaluating' | 'done' | 'error' | 'cancelled';

export interface SearchStatus {
  step: SearchStepState;
  message: string;
  details?: string;
  plan?: SearchPlan;
  error?: string;
}

export interface AppSettings {
  youtubeApiKey: string;
  bridgeUrl: string;
  bridgeToken: string;
  defaultProvider: AiProvider;
  demoMode: boolean;
  theme: 'dark' | 'light';
  aiLanguage: string;        // lingua delle risposte dell'AI (codice: it, en, de, fr, es)
  videoLanguages: string[];  // lingue preferite dei video; vuoto = decide l'AI
}

export interface HistoryEntry {
  video: VideoItem;
  watchedAt: number;
}

export interface SavedSearch {
  query: string;
  provider: AiProvider;
  at: number;
  status: SearchStatus;
  results: VideoItem[];
}

export const LINGUE: { code: string; nome: string; nomeNelPrompt: string }[] = [
  { code: 'it', nome: 'Italiano', nomeNelPrompt: 'italiano' },
  { code: 'en', nome: 'English', nomeNelPrompt: 'inglese' },
  { code: 'de', nome: 'Deutsch', nomeNelPrompt: 'tedesco' },
  { code: 'fr', nome: 'Français', nomeNelPrompt: 'francese' },
  { code: 'es', nome: 'Español', nomeNelPrompt: 'spagnolo' },
];

export function nomeLingua(code: string): string {
  return LINGUE.find((l) => l.code === code)?.nomeNelPrompt ?? 'italiano';
}
