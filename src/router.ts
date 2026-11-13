import { AiProvider, Periodo } from './types';
import { isPeriodo } from './periodo';

/**
 * Indirizzi delle pagine di Tubo (dopo il #), così il tasto Indietro
 * del browser/iPad e il ricaricamento della pagina funzionano:
 *   #/                       Home
 *   #/cerca?q=...&ai=...&periodo=1a   risultati di una ricerca (periodo solo se scelto)
 *   #/video/<id>             pagina di un video
 *   #/canale/<id>            pagina di un canale
 *   #/cronologia             cronologia
 *   #/dopo                   guarda più tardi
 *   #/impostazioni           impostazioni
 */
export type Route =
  | { page: 'home' }
  | { page: 'search'; q: string; ai?: AiProvider; periodo?: Periodo }
  | { page: 'watch'; id: string }
  | { page: 'channel'; id: string }
  | { page: 'history' }
  | { page: 'watchLater' }
  | { page: 'settings' };

export type PageName = Route['page'];

const AI_VALIDE = ['nemotron', 'claude', 'argon'];

export function parseHash(hash: string): Route {
  const h = (hash || '').replace(/^#/, '').replace(/^\/?/, '/');
  const [path, qs = ''] = h.split('?');
  const parti = path.split('/').filter(Boolean).map((p) => {
    try { return decodeURIComponent(p); } catch { return p; }
  });
  const params = new URLSearchParams(qs);
  switch (parti[0]) {
    case 'cerca': {
      const q = (params.get('q') || '').trim();
      if (!q) return { page: 'home' };
      const ai = params.get('ai') || '';
      const periodo = params.get('periodo') || '';
      const r: Route = AI_VALIDE.includes(ai) ? { page: 'search', q, ai: ai as AiProvider } : { page: 'search', q };
      if (isPeriodo(periodo) && periodo !== 'auto') r.periodo = periodo;
      return r;
    }
    case 'video':
      return parti[1] ? { page: 'watch', id: parti[1] } : { page: 'home' };
    case 'canale':
      return parti[1] ? { page: 'channel', id: parti[1] } : { page: 'home' };
    case 'cronologia':
      return { page: 'history' };
    case 'dopo':
      return { page: 'watchLater' };
    case 'impostazioni':
      return { page: 'settings' };
    default:
      return { page: 'home' };
  }
}

export function buildHash(r: Route): string {
  switch (r.page) {
    case 'home':
      return '#/';
    case 'search': {
      const p = new URLSearchParams({ q: r.q });
      if (r.ai) p.set('ai', r.ai);
      if (r.periodo && r.periodo !== 'auto') p.set('periodo', r.periodo);
      return `#/cerca?${p.toString()}`;
    }
    case 'watch':
      return `#/video/${encodeURIComponent(r.id)}`;
    case 'channel':
      return `#/canale/${encodeURIComponent(r.id)}`;
    case 'history':
      return '#/cronologia';
    case 'watchLater':
      return '#/dopo';
    case 'settings':
      return '#/impostazioni';
  }
}

/** Indirizzo completo da condividere (stessa pagina di Tubo, con l'hash della route). */
export function shareUrl(r: Route, loc: { origin: string; pathname: string } = window.location): string {
  return `${loc.origin}${loc.pathname}${buildHash(r)}`;
}

export function sameRoute(a: Route, b: Route): boolean {
  return buildHash(a) === buildHash(b);
}
