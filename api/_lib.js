// TuboF — funzioni comuni del server (Vercel Functions, Node).
// Account: Vercel Blob privato (scritto solo quando cambiano gli account).
// Contatori giornalieri, tentativi di accesso, cache: Vercel Runtime Cache (veloce, non permanente).
import { get, put } from '@vercel/blob';
import { getCache } from '@vercel/functions';
import crypto from 'node:crypto';

const FILE_UTENTI = 'tubof/utenti.json';
const FILE_INVITI = 'tubof/inviti.json';
const COOKIE = 'tubof';
const DURATA_SESSIONE = 180 * 24 * 3600; // 180 giorni: su telefono e iPad si resta dentro

export const cache = getCache({ namespace: 'tubof-v2' });

// ---------- risposte ----------
export function json(dati, status = 200, headers = {}) {
  return new Response(JSON.stringify(dati), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}
export const errore = (msg, status = 400) => json({ errore: msg, error: msg }, status);

/** Le richieste che cambiano qualcosa devono venire da TuboF stesso. */
export function stessaOrigine(req) {
  const o = req.headers.get('origin');
  if (!o) return true;
  try { return new URL(o).host === new URL(req.url).host; } catch { return false; }
}

// ---------- archivio (Blob privato) ----------
async function leggiFile(path) {
  // file assente = vuoto; un errore di rete o un file illeggibile NON diventa «vuoto» (si ferma tutto)
  const r = await get(path, { access: 'private', useCache: false });
  if (!r) return {};
  if (r.statusCode !== 200 || !r.stream) throw new Error(`Archivio: lettura di ${path} non riuscita`);
  return JSON.parse(await new Response(r.stream).text());
}
async function scriviFile(path, dati) {
  await put(path, JSON.stringify(dati), {
    access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json',
  });
}

export async function leggiUtenti() {
  const c = await cache.get('utenti').catch(() => null);
  if (c) return c;
  const u = await leggiFile(FILE_UTENTI);
  await cache.set('utenti', u, { ttl: 600 }).catch(() => {});
  return u;
}
export async function scriviUtenti(u) {
  await scriviFile(FILE_UTENTI, u);
  await cache.set('utenti', u, { ttl: 600 }).catch(() => {});
}
export const leggiInviti = () => leggiFile(FILE_INVITI);
export const scriviInviti = (i) => scriviFile(FILE_INVITI, i);

// ---------- password ----------
const scryptAsync = (pw, salt) =>
  new Promise((ok, ko) => crypto.scrypt(pw, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? ko(e) : ok(k))));

export async function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('base64');
  const hash = (await scryptAsync(pw, salt)).toString('base64');
  return { salt, hash };
}
export async function passwordGiusta(pw, utente) {
  if (!utente?.salt || !utente?.hash) return false;
  const k = await scryptAsync(pw, utente.salt);
  const h = Buffer.from(utente.hash, 'base64');
  return h.length === k.length && crypto.timingSafeEqual(h, k);
}
export const nuovoCodice = () => crypto.randomBytes(18).toString('base64url');
export const normEmail = (e) => String(e || '').trim().toLowerCase();

// ---------- sessione (cookie firmato) ----------
function firma(testo) {
  const segreto = process.env.SEGRETO_SESSIONE;
  if (!segreto || segreto.length < 32) throw new Error('SEGRETO_SESSIONE mancante');
  return crypto.createHmac('sha256', segreto).update(testo).digest('base64url');
}
export function cookieSessione(email, ver) {
  const corpo = Buffer.from(JSON.stringify({ e: email, v: ver, x: Math.floor(Date.now() / 1000) + DURATA_SESSIONE })).toString('base64url');
  return `${COOKIE}=${corpo}.${firma(corpo)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DURATA_SESSIONE}`;
}
export const cookieUscita = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

function leggiCookie(req) {
  const tutti = req.headers.get('cookie') || '';
  for (const parte of tutti.split(/;\s*/)) {
    const i = parte.indexOf('=');
    if (i > 0 && parte.slice(0, i) === COOKIE) return parte.slice(i + 1);
  }
  return null;
}

/** L'utente della richiesta, oppure null (cookie assente, scaduto, falso, account tolto o password cambiata). */
export async function utenteDa(req) {
  const c = leggiCookie(req);
  if (!c) return null;
  const [corpo, sig] = c.split('.');
  if (!corpo || !sig) return null;
  const atteso = firma(corpo);
  if (sig.length !== atteso.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(atteso))) return null;
  let d;
  try { d = JSON.parse(Buffer.from(corpo, 'base64url').toString()); } catch { return null; }
  if (!d.e || d.x < Date.now() / 1000) return null;
  const u = (await leggiUtenti())[d.e];
  if (!u || u.ver !== d.v) return null;
  return { email: d.e, ...u };
}

// ---------- uso giornaliero ----------
export const oggi = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date());
const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

export function limiti(utente) {
  return utente.admin
    ? { unita: num(process.env.LIMITE_UNITA_ADMIN, 4000), ai: num(process.env.LIMITE_AI_ADMIN, 400) }
    : { unita: num(process.env.LIMITE_UNITA, 3000), ai: num(process.env.LIMITE_AI, 200) };
}
export async function usoDi(email) {
  return (await cache.get(`uso:${oggi()}:${email}`).catch(() => null)) || { unita: 0, ai: 0 };
}
/** Aggiunge al conto di oggi; false (senza aggiungere) se si supererebbe il limite. */
export async function consuma(utente, cosa, quanto) {
  const chiave = `uso:${oggi()}:${utente.email}`;
  const u = (await cache.get(chiave).catch(() => null)) || { unita: 0, ai: 0 };
  if (u[cosa] + quanto > limiti(utente)[cosa]) return false;
  u[cosa] += quanto;
  await cache.set(chiave, u, { ttl: 2 * 24 * 3600 }).catch(() => {});
  return true;
}

export function pubblico(utente, uso) {
  const l = limiti(utente);
  return {
    email: utente.email, nome: utente.nome, admin: !!utente.admin,
    uso: uso ? { unita: uso.unita, limiteUnita: l.unita, ai: uso.ai, limiteAi: l.ai } : undefined,
  };
}
