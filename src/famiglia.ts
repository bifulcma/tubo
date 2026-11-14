/**
 * TuboF — la versione di famiglia di Tubo (sito su Vercel, con account).
 * Si accende solo costruendo con VITE_MODALITA=famiglia: il Tubo di Marco
 * (GitHub Pages + ponte dello Studio) non cambia.
 *
 * In TuboF:
 *  - le chiavi stanno sul server: l'AI va a /api/ask (Ollama Cloud) e YouTube a /api/yt;
 *  - si entra con email e password (cookie di sessione del sito, niente token nel browser);
 *  - gli account si creano solo da un invito di un amministratore.
 */
export const FAMIGLIA: boolean = import.meta.env.VITE_MODALITA === 'famiglia';

/** Valori segnaposto: in TuboF chiave e token veri non arrivano mai al browser. */
export const SEGNAPOSTO_CHIAVE = 'sul-server';
export const PONTE_FAMIGLIA = '/api';

/** Indirizzo per un endpoint YouTube Data API v3 (es. «search»). */
export function youtubeUrl(endpoint: string): URL {
  if (FAMIGLIA) {
    const u = new URL('/api/yt', window.location.origin);
    u.searchParams.set('ep', endpoint);
    return u;
  }
  return new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
}

export interface UtenteFamiglia {
  email: string;
  nome: string;
  admin: boolean;
  /** uso di oggi e limiti (unità YouTube; una ricerca YouTube = 100) */
  uso?: { unita: number; limiteUnita: number; ai: number; limiteAi: number };
}

async function chiama<T>(azione: string, corpo: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch('/api/conto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ azione, ...corpo }),
    credentials: 'same-origin',
  });
  let data: any = {};
  try { data = await res.json(); } catch { /* niente */ }
  if (!res.ok) throw Object.assign(new Error(data?.errore || `Errore ${res.status}`), { status: res.status });
  return data as T;
}

export const conto = {
  io: () => chiama<{ utente: UtenteFamiglia | null }>('io'),
  entra: (email: string, password: string) => chiama<{ utente: UtenteFamiglia }>('entra', { email, password }),
  esci: () => chiama<{ ok: true }>('esci'),
  infoInvito: (codice: string) => chiama<{ nome: string; email: string | null; reset: boolean }>('info-invito', { codice }),
  registra: (codice: string, email: string, password: string) =>
    chiama<{ utente: UtenteFamiglia }>('registra', { codice, email, password }),
  cambiaPassword: (vecchia: string, nuova: string) => chiama<{ ok: true }>('cambia-password', { vecchia, nuova }),
  // solo amministratori
  elenco: () => chiama<{ utenti: { email: string; nome: string; admin: boolean; creato: string; usoOggi: number }[]; inviti: { codice: string; nome: string; email: string | null; scade: string }[] }>('elenco'),
  invita: (nome: string, email: string) => chiama<{ codice: string }>('invita', { nome, email }),
  annullaInvito: (codice: string) => chiama<{ ok: true }>('annulla-invito', { codice }),
  revoca: (email: string) => chiama<{ ok: true }>('revoca', { email }),
  nuovaPassword: (email: string) => chiama<{ codice: string }>('nuova-password', { email }),
};

/** Link da mandare (WhatsApp/Signal) per un invito o una nuova password. */
export function linkInvito(codice: string): string {
  return `${window.location.origin}/#/invito?c=${encodeURIComponent(codice)}`;
}

/** Codice d'invito presente nell'indirizzo (#/invito?c=...), se c'è. */
export function codiceDaIndirizzo(hash = window.location.hash): string | null {
  const m = hash.match(/^#\/invito\?(.*)$/);
  if (!m) return null;
  return new URLSearchParams(m[1]).get('c');
}
