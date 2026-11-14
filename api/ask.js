// TuboF — come POST /ask del ponte dello Studio, ma con Ollama Cloud.
// Risponde in SSE con gli stessi eventi (meta, text {"t":…}, error {"message":…}, done),
// così l'app usa lo stesso codice del Tubo di Marco.
import { errore, stessaOrigine, utenteDa, consuma } from './_lib.js';

const MODELLI = {
  nemotron: process.env.MODELLO_NEMOTRON || 'nemotron-3-super',
  claude: process.env.MODELLO_CLAUDE || 'glm-5.3',
  argon: process.env.MODELLO_ARGON || 'deepseek-v4.1-flash',
};
const MAX_CARATTERI = 400_000;

export default {
  async fetch(req) {
    if (req.method !== 'POST') return errore('Metodo non consentito', 405);
    if (!stessaOrigine(req)) return errore('Origine non consentita', 403);
    const io = await utenteDa(req);
    if (!io) return errore('Accesso scaduto: entra di nuovo.', 401);

    let b;
    try { b = await req.json(); } catch { return errore('Richiesta non valida'); }
    // la ricerca in rete qui non c'è: l'app riprova da sola senza (risultato «dedotto»)
    if (b?.web) return errore('Ricerca in rete non disponibile in TuboF.', 400);
    const messaggi = Array.isArray(b?.messages) ? b.messages : [];
    const tutti = [
      ...(b?.system ? [{ role: 'system', content: String(b.system) }] : []),
      ...messaggi.filter((m) => m && ['user', 'assistant', 'system'].includes(m.role)).map((m) => ({ role: m.role, content: String(m.content ?? '') })),
    ];
    if (!tutti.some((m) => m.role === 'user')) return errore('Manca la domanda.');
    if (tutti.reduce((n, m) => n + m.content.length, 0) > MAX_CARATTERI) return errore('Testo troppo lungo.', 413);

    if (!(await consuma(io, 'ai', 1))) {
      return errore('Hai finito le risposte AI di oggi: riprova domani.', 429);
    }

    const modello = MODELLI[b.provider] || MODELLI.nemotron;
    const chiave = process.env.OLLAMA_API_KEY;
    if (!chiave) return errore('Server non configurato (chiave AI mancante).', 500);

    const enc = new TextEncoder();
    const evento = (nome, dati) => enc.encode(`event: ${nome}\ndata: ${JSON.stringify(dati)}\n\n`);

    const stream = new ReadableStream({
      async start(ctrl) {
        const ping = setInterval(() => { try { ctrl.enqueue(enc.encode(': attesa\n\n')); } catch { /* chiuso */ } }, 15000);
        try {
          ctrl.enqueue(evento('meta', { provider: b.provider, model: modello }));
          const chiedi = (conThink) => fetch('https://ollama.com/api/chat', {
            method: 'POST',
            headers: { Authorization: `Bearer ${chiave}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: modello, messages: tutti, stream: true, ...(conThink ? { think: false } : {}) }),
            signal: req.signal,
          });
          let r = await chiedi(true);
          if (r.status === 400) r = await chiedi(false); // modello che non accetta «think»
          if (!r.ok || !r.body) {
            let d = '';
            try { d = (await r.text()).slice(0, 300); } catch { /* niente */ }
            throw new Error(`Ollama Cloud ha risposto ${r.status}${d ? ': ' + d : ''}`);
          }
          const reader = r.body.getReader();
          const dec = new TextDecoder();
          let buf = '';
          const riga = (l) => {
            if (!l.trim()) return;
            const o = JSON.parse(l);
            if (o.error) throw new Error(String(o.error));
            const t = o.message?.content;
            if (t) ctrl.enqueue(evento('text', { t }));
          };
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const righe = buf.split('\n');
            buf = righe.pop() || '';
            righe.forEach(riga);
          }
          riga(buf);
          ctrl.enqueue(evento('done', {}));
        } catch (e) {
          if (e?.name !== 'AbortError') {
            try { ctrl.enqueue(evento('error', { message: e?.message || 'Errore dell’AI' })); } catch { /* chiuso */ }
          }
        } finally {
          clearInterval(ping);
          try { ctrl.close(); } catch { /* già chiuso */ }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
      },
    });
  },
};
