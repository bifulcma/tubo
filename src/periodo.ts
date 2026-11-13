import { Periodo, SearchPlan, VideoItem } from './types';

/**
 * Periodo di pubblicazione: criterio scelto dall'utente (o dedotto dall'AI)
 * e date dei video (anno sempre visibile, attualità nel voto).
 */

export const PERIODI: { id: Periodo; nome: string; breve: string; giorni?: number }[] = [
  { id: 'auto', nome: "Qualsiasi data (decide l'AI)", breve: 'Ogni data' },
  { id: '7g', nome: 'Ultima settimana', breve: '7 giorni', giorni: 7 },
  { id: '30g', nome: 'Ultimo mese', breve: '30 giorni', giorni: 30 },
  { id: '6m', nome: 'Ultimi 6 mesi', breve: '6 mesi', giorni: 183 },
  { id: '1a', nome: 'Ultimo anno', breve: '1 anno', giorni: 365 },
  { id: '3a', nome: 'Ultimi 3 anni', breve: '3 anni', giorni: 3 * 365 },
  { id: '5a', nome: 'Ultimi 5 anni', breve: '5 anni', giorni: 5 * 365 },
];

export function isPeriodo(x: unknown): x is Periodo {
  return PERIODI.some((p) => p.id === x);
}

export function infoPeriodo(p: Periodo | undefined) {
  return PERIODI.find((x) => x.id === p) ?? PERIODI[0];
}

/** Data locale in formato AAAA-MM-GG. */
export function isoGiorno(d: Date): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

/** Accetta "2020", "2020-03", "2020-03-15" (anche con orario); altro → undefined. */
export function normalizzaData(x: unknown): string | undefined {
  const m = String(x ?? '').trim().match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/);
  if (!m) return undefined;
  const anno = Number(m[1]);
  const mese = m[2] ? Number(m[2]) : 1;
  const giorno = m[3] ? Number(m[3]) : 1;
  if (anno < 2005 || anno > 2100 || mese < 1 || mese > 12 || giorno < 1 || giorno > 31) return undefined;
  const z = (n: number) => String(n).padStart(2, '0');
  return `${anno}-${z(mese)}-${z(giorno)}`;
}

/** Inizio del periodo scelto dall'utente (AAAA-MM-GG), o undefined per «qualsiasi data». */
export function inizioPeriodo(p: Periodo | undefined, oggi: Date = new Date()): string | undefined {
  const giorni = infoPeriodo(p).giorni;
  if (!giorni) return undefined;
  const d = new Date(oggi.getTime() - giorni * 86_400_000);
  return isoGiorno(d);
}

/** Se l'AI dice «attualità» senza date, si guarda l'ultimo anno. */
const ATTUALITA_GIORNI_DEFAULT = 365;

/**
 * Unisce il piano dell'AI con il periodo scelto dall'utente.
 * La scelta dell'utente vince sempre sulla data di inizio.
 */
export function applicaPeriodo(plan: SearchPlan, periodo: Periodo | undefined, oggi: Date = new Date()): SearchPlan {
  const out: SearchPlan = { ...plan };
  let dopo = normalizzaData(plan.pubblicato_dopo);
  let prima = normalizzaData(plan.pubblicato_prima);
  let attualita = plan.attualita === true;

  const scelto = inizioPeriodo(periodo, oggi);
  if (scelto) {
    dopo = scelto;
    const giorni = infoPeriodo(periodo).giorni ?? 0;
    if (giorni <= 365) attualita = true;
  } else if (attualita && !dopo) {
    dopo = isoGiorno(new Date(oggi.getTime() - ATTUALITA_GIORNI_DEFAULT * 86_400_000));
  }

  if (dopo && prima && prima <= dopo) prima = undefined;   // intervallo impossibile: si tiene l'inizio
  if (dopo && dopo > isoGiorno(oggi)) dopo = undefined;      // data nel futuro: si ignora

  out.attualita = attualita;
  out.pubblicato_dopo = dopo;
  out.pubblicato_prima = prima;
  if (!dopo) delete out.pubblicato_dopo;
  if (!prima) delete out.pubblicato_prima;
  return out;
}

/** AAAA-MM-GG → formato RFC 3339 richiesto da YouTube (publishedAfter/Before). */
export function rfc3339(giorno: string | undefined): string | undefined {
  return giorno ? `${giorno}T00:00:00Z` : undefined;
}

/** Il video rientra nelle date del piano? (senza data = si tiene) */
export function nelPeriodo(v: VideoItem, plan: SearchPlan): boolean {
  const g = (v.publishedAt || '').slice(0, 10);
  if (!g) return true;
  if (plan.pubblicato_dopo && g < plan.pubblicato_dopo) return false;
  if (plan.pubblicato_prima && g >= plan.pubblicato_prima) return false;
  return true;
}

/** Descrizione breve delle date del piano, per l'avanzamento («dal 13 nov 2025»). */
export function descriviDate(plan: SearchPlan): string | undefined {
  const f = (g: string) => etichettaGiorno(g);
  if (plan.pubblicato_dopo && plan.pubblicato_prima) return `dal ${f(plan.pubblicato_dopo)} al ${f(plan.pubblicato_prima)}`;
  if (plan.pubblicato_dopo) return `dal ${f(plan.pubblicato_dopo)}`;
  if (plan.pubblicato_prima) return `prima del ${f(plan.pubblicato_prima)}`;
  return undefined;
}

const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

function etichettaGiorno(g: string): string {
  const [a, m, d] = g.split('-').map(Number);
  return `${d} ${MESI[(m || 1) - 1]} ${a}`;
}

/**
 * Etichetta della data sulle schede: sempre con l'anno («mar 2019»),
 * per i video di questi giorni «oggi», «ieri», «3 giorni fa».
 */
export function etichettaData(publishedAt: string, oggi: Date = new Date()): string | undefined {
  const t = Date.parse(publishedAt);
  if (!publishedAt || isNaN(t)) return undefined;
  const d = new Date(t);
  const giorni = Math.floor((oggi.getTime() - t) / 86_400_000);
  if (giorni >= 0 && giorni < 7) {
    if (giorni === 0) return 'oggi';
    if (giorni === 1) return 'ieri';
    return `${giorni} giorni fa`;
  }
  return `${MESI[d.getMonth()]} ${d.getFullYear()}`;
}

/** Ordine dei risultati: voto AI; a parità, se conta l'attualità, prima i più recenti. */
export function ordinaRisultati(videos: VideoItem[], attualita: boolean): VideoItem[] {
  return [...videos].sort((a, b) => {
    const s = (b.aiScore ?? 0) - (a.aiScore ?? 0);
    if (s !== 0 || !attualita) return s;
    return (b.publishedAt || '').localeCompare(a.publishedAt || '');
  });
}

export function ordinaPerData(videos: VideoItem[]): VideoItem[] {
  return [...videos].sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
}
