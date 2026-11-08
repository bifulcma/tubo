import { AiProvider } from './types';

export interface BridgeMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AskBridgePayload {
  provider: AiProvider;
  model: string;
  system: string;
  messages: BridgeMessage[];
  web: boolean;
}

export interface AskBridgeOptions {
  bridgeUrl: string;
  token: string;
  provider: AiProvider;
  prompt: string;
  system?: string;
  model?: string;
  signal?: AbortSignal;
  fetchFn?: typeof fetch;
  onChunk?: (chunk: string) => void;
}

export class BridgeError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'BridgeError';
  }
}

/**
 * Normalizza l'indirizzo del ponte rimuovendo eventuali slash finali.
 */
export function normalizeBridgeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/**
 * Parsifica uno stream Server-Sent Events (SSE) secondo le specifiche del ponte di Tubo:
 * - evento `meta`: metadati iniziali
 * - evento `text`: dati in formato {"t": "<pezzo di testo>"} da concatenare
 * - evento `thinking`: ignorato
 * - evento `error`: dati in formato {"message": "<errore>"} -> solleva eccezione
 * - evento `done`: conclusione dello stream
 */
export async function parseBridgeSseStream(
  stream: ReadableStream<Uint8Array>,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';

  let currentEvent = 'message';
  let currentData = '';

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) {
      // Linea vuota indica la fine di un evento SSE
      if (currentEvent === 'text' && currentData) {
        try {
          const parsed = JSON.parse(currentData);
          if (parsed && typeof parsed.t === 'string') {
            fullText += parsed.t;
            onChunk?.(parsed.t);
          }
        } catch {
          // Se per qualche motivo non è JSON, usa currentData se non vuoto
          fullText += currentData;
          onChunk?.(currentData);
        }
      } else if (currentEvent === 'error' && currentData) {
        let msg = 'Errore sconosciuto restituito dal ponte AI';
        try {
          const parsed = JSON.parse(currentData);
          if (parsed && parsed.message) {
            msg = parsed.message;
          }
        } catch {
          msg = currentData;
        }
        throw new BridgeError(msg);
      }
      // Reset evento
      currentEvent = 'message';
      currentData = '';
      return;
    }

    if (line.startsWith(':')) {
      // Commento SSE, ignora
      return;
    }

    if (line.startsWith('event:')) {
      currentEvent = line.slice(6).trim();
      return;
    }

    if (line.startsWith('data:')) {
      const dataContent = line.slice(5).trim();
      currentData = currentData ? currentData + '\n' + dataContent : dataContent;
      return;
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r\n|\r|\n/);
      // L'ultimo elemento potrebbe essere parziale
      buffer = lines.pop() || '';
      for (const line of lines) {
        processLine(line);
      }
    }

    // Processa eventuale buffer residuo
    if (buffer) {
      processLine(buffer);
      // Forza il flush dell'ultimo blocco se non terminato da linea vuota
      processLine('');
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
}

/**
 * Invia una richiesta all'endpoint /ask del ponte AI e attende la risposta completa concatenando lo stream SSE.
 */
export async function askBridge(options: AskBridgeOptions): Promise<string> {
  const {
    bridgeUrl,
    token,
    provider,
    prompt,
    system = '',
    model = '',
    signal,
    fetchFn = fetch,
    onChunk,
  } = options;

  if (!bridgeUrl) {
    throw new BridgeError('Indirizzo del ponte AI non configurato.');
  }

  const endpoint = `${normalizeBridgeUrl(bridgeUrl)}/ask`;

  const payload: AskBridgePayload = {
    provider,
    model,
    system,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    web: false,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  let response: Response;
  try {
    response = await fetchFn(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw err;
    }
    throw new BridgeError(`Impossibile contattare il ponte AI su ${bridgeUrl}: ${err.message}`);
  }

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.message || errorJson.error || JSON.stringify(errorJson);
    } catch {
      try {
        errorDetail = await response.text();
      } catch {
        errorDetail = response.statusText;
      }
    }
    throw new BridgeError(
      `Il ponte AI ha risposto con errore HTTP ${response.status}: ${errorDetail || response.statusText}`,
      response.status
    );
  }

  if (!response.body) {
    throw new BridgeError('Il ponte AI ha restituito una risposta senza corpo stream.');
  }

  return parseBridgeSseStream(response.body, onChunk);
}
