export type AiProvider = 'qwen' | 'gemma' | 'claude' | 'argon';

export interface AiProviderConfig {
  id: AiProvider;
  name: string;
  description: string;
  isLocal: boolean;
  badge: string;
}

export const AI_PROVIDERS: Record<AiProvider, AiProviderConfig> = {
  qwen: {
    id: 'qwen',
    name: 'Qwen (locale)',
    description: 'Modello locale open-weights, veloce ed efficiente',
    isLocal: true,
    badge: 'Locale',
  },
  gemma: {
    id: 'gemma',
    name: 'Gemma (locale)',
    description: 'Modello open di Google in esecuzione locale',
    isLocal: true,
    badge: 'Locale',
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    description: 'Anthropic Claude per analisi testuale raffinata',
    isLocal: false,
    badge: 'Cloud',
  },
  argon: {
    id: 'argon',
    name: 'Argon (Gemini Flash)',
    description: 'Google Gemini 2.0 Flash, rapido e versatile',
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
}

export interface SearchPlan {
  ricerche: string[];
  lingue: string[];
  durata_minima_min: number;
  escludi: string[];
}

export interface VideoEvaluation {
  id: string;
  punteggio: number;
  motivo: string;
}

export type SearchStepState = 'idle' | 'planning' | 'fetching' | 'evaluating' | 'done' | 'error';

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
}

export interface HistoryEntry {
  video: VideoItem;
  watchedAt: number;
}
