// TuboF — account: entra, esci, inviti, nuova password, elenco (amministratore).
import {
  json, errore, stessaOrigine, cache, leggiUtenti, scriviUtenti, leggiInviti, scriviInviti,
  hashPassword, passwordGiusta, nuovoCodice, normEmail, cookieSessione, cookieUscita,
  utenteDa, usoDi, pubblico,
} from './_lib.js';

const SETTE_GIORNI = 7 * 24 * 3600 * 1000;
const MIN_PASSWORD = 10;
const emailValida = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

/** L'invito valido per questo codice (anche il primo invito dell'amministratore, finché non c'è nessuno). */
async function trovaInvito(codice) {
  if (!codice || typeof codice !== 'string') return null;
  const utenti = await leggiUtenti();
  const primo = process.env.PRIMO_INVITO;
  if (primo && primo.length >= 20 && codice === primo && Object.keys(utenti).length === 0) {
    return { nome: process.env.ADMIN_NOME || 'Amministratore', email: normEmail(process.env.ADMIN_EMAIL) || null, admin: true, reset: false, primo: true };
  }
  const inviti = await leggiInviti();
  const i = inviti[codice];
  if (!i || new Date(i.scade).getTime() < Date.now()) return null;
  return i;
}

async function tentativiFalliti(email) {
  return (await cache.get(`falliti:${email}`).catch(() => null)) || 0;
}

export default {
  async fetch(req) {
    if (req.method !== 'POST') return errore('Metodo non consentito', 405);
    if (!stessaOrigine(req)) return errore('Origine non consentita', 403);
    let b;
    try { b = await req.json(); } catch { return errore('Richiesta non valida'); }
    const azione = b?.azione;

    // --- senza accesso ---
    if (azione === 'io') {
      const u = await utenteDa(req);
      return json({ utente: u ? pubblico(u, await usoDi(u.email)) : null });
    }

    if (azione === 'entra') {
      const email = normEmail(b.email);
      const n = await tentativiFalliti(email);
      if (n >= 8) return errore('Troppi tentativi sbagliati: riprova tra 15 minuti.', 429);
      const utenti = await leggiUtenti();
      const u = utenti[email];
      if (!u || !(await passwordGiusta(String(b.password || ''), u))) {
        await cache.set(`falliti:${email}`, n + 1, { ttl: 900 }).catch(() => {});
        await pausa(600);
        return errore('Email o password sbagliate.', 401);
      }
      try { await cache.delete(`falliti:${email}`); } catch { /* niente */ }
      const io = { email, ...u };
      return json({ utente: pubblico(io, await usoDi(email)) }, 200, { 'Set-Cookie': cookieSessione(email, u.ver) });
    }

    if (azione === 'esci') return json({ ok: true }, 200, { 'Set-Cookie': cookieUscita() });

    if (azione === 'info-invito') {
      const i = await trovaInvito(b.codice);
      if (!i) return errore('Invito non valido, già usato o scaduto. Chiedine uno nuovo.', 404);
      return json({ nome: i.nome, email: i.email || null, reset: !!i.reset });
    }

    if (azione === 'registra') {
      const i = await trovaInvito(b.codice);
      if (!i) return errore('Invito non valido, già usato o scaduto. Chiedine uno nuovo.', 404);
      const email = i.email || normEmail(b.email);
      const password = String(b.password || '');
      if (!emailValida(email)) return errore('Email non valida.');
      if (password.length < MIN_PASSWORD) return errore(`La password deve avere almeno ${MIN_PASSWORD} caratteri.`);
      const utenti = await leggiUtenti();
      const esiste = utenti[email];
      if (esiste && !i.reset) return errore('Esiste già un account con questa email: entra con la tua password.', 409);
      if (!esiste && i.reset) return errore('Questo account non esiste più.', 404);
      const { salt, hash } = await hashPassword(password);
      const ver = (esiste?.ver || 0) + 1;
      utenti[email] = {
        nome: esiste?.nome || i.nome, admin: !!(esiste?.admin || i.admin), salt, hash, ver,
        creato: esiste?.creato || new Date().toISOString(),
      };
      await scriviUtenti(utenti);
      if (!i.primo) {
        const inviti = await leggiInviti();
        delete inviti[b.codice];
        await scriviInviti(inviti);
      }
      const io = { email, ...utenti[email] };
      return json({ utente: pubblico(io, await usoDi(email)) }, 200, { 'Set-Cookie': cookieSessione(email, ver) });
    }

    // --- da qui serve l'accesso ---
    const io = await utenteDa(req);
    if (!io) return errore('Accesso scaduto: entra di nuovo.', 401);

    if (azione === 'cambia-password') {
      const nuova = String(b.nuova || '');
      if (nuova.length < MIN_PASSWORD) return errore(`La nuova password deve avere almeno ${MIN_PASSWORD} caratteri.`);
      const utenti = await leggiUtenti();
      const u = utenti[io.email];
      if (!(await passwordGiusta(String(b.vecchia || ''), u))) return errore('La password attuale non è giusta.', 401);
      Object.assign(u, await hashPassword(nuova), { ver: (u.ver || 0) + 1 });
      await scriviUtenti(utenti);
      return json({ ok: true }, 200, { 'Set-Cookie': cookieSessione(io.email, u.ver) });
    }

    // --- solo amministratori ---
    if (!io.admin) return errore('Solo l’amministratore può farlo.', 403);

    if (azione === 'elenco') {
      const utenti = await leggiUtenti();
      const inviti = await leggiInviti();
      const ora = Date.now();
      const lista = await Promise.all(Object.entries(utenti).map(async ([email, u]) => ({
        email, nome: u.nome, admin: !!u.admin, creato: u.creato, usoOggi: (await usoDi(email)).unita,
      })));
      return json({
        utenti: lista.sort((a, b) => (b.admin - a.admin) || a.nome.localeCompare(b.nome)),
        inviti: Object.entries(inviti)
          .filter(([, i]) => new Date(i.scade).getTime() > ora)
          .map(([codice, i]) => ({ codice, nome: i.reset ? `${i.nome} (nuova password)` : i.nome, email: i.email || null, scade: i.scade })),
      });
    }

    if (azione === 'invita') {
      const nome = String(b.nome || '').trim().slice(0, 40);
      const email = normEmail(b.email);
      if (!nome) return errore('Scrivi il nome.');
      if (email && !emailValida(email)) return errore('Email non valida.');
      if (email && (await leggiUtenti())[email]) return errore('Questa persona ha già un account.', 409);
      const inviti = await leggiInviti();
      const ora = Date.now();
      for (const [c, i] of Object.entries(inviti)) if (new Date(i.scade).getTime() < ora) delete inviti[c];
      const codice = nuovoCodice();
      inviti[codice] = { nome, email: email || null, reset: false, scade: new Date(ora + SETTE_GIORNI).toISOString(), da: io.email };
      await scriviInviti(inviti);
      return json({ codice });
    }

    if (azione === 'annulla-invito') {
      const inviti = await leggiInviti();
      delete inviti[b.codice];
      await scriviInviti(inviti);
      return json({ ok: true });
    }

    if (azione === 'nuova-password') {
      const email = normEmail(b.email);
      const u = (await leggiUtenti())[email];
      if (!u) return errore('Account non trovato.', 404);
      const inviti = await leggiInviti();
      const codice = nuovoCodice();
      inviti[codice] = { nome: u.nome, email, reset: true, scade: new Date(Date.now() + SETTE_GIORNI).toISOString(), da: io.email };
      await scriviInviti(inviti);
      return json({ codice });
    }

    if (azione === 'revoca') {
      const email = normEmail(b.email);
      if (email === io.email) return errore('Non puoi togliere l’accesso a te stesso.');
      const utenti = await leggiUtenti();
      delete utenti[email];
      await scriviUtenti(utenti);
      return json({ ok: true });
    }

    return errore('Azione sconosciuta.');
  },
};
