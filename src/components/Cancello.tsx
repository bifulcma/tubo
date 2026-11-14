import { useEffect, useState, type ReactNode, type FormEvent } from 'react';
import { conto, codiceDaIndirizzo, type UtenteFamiglia } from '../famiglia';

/**
 * TuboF: prima di mostrare l'app controlla l'accesso.
 * - #/invito?c=CODICE → si crea l'account (o una nuova password) scegliendo la propria password;
 * - altrimenti, senza sessione → email e password.
 */
export function Cancello({ children }: { children: ReactNode }) {
  const [utente, setUtente] = useState<UtenteFamiglia | null | undefined>(undefined);
  const [codice, setCodice] = useState<string | null>(() => codiceDaIndirizzo());
  const [erroreRete, setErroreRete] = useState('');

  useEffect(() => {
    const onHash = () => setCodice(codiceDaIndirizzo());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    conto.io().then((r) => setUtente(r.utente)).catch((e) => { setUtente(null); setErroreRete(e.message); });
  }, []);

  const entrato = (u: UtenteFamiglia) => {
    setUtente(u);
    if (codice) { window.location.hash = '#/'; setCodice(null); }
  };

  if (utente === undefined) {
    return <Pagina><p className="text-sm text-slate-400 text-center">Un attimo…</p></Pagina>;
  }
  if (codice) return <Registrazione codice={codice} onFatto={entrato} />;
  if (!utente) return <Accesso onFatto={entrato} erroreIniziale={erroreRete} />;
  return <>{children}</>;
}

function Pagina({ children, titolo }: { children: ReactNode; titolo?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="text-3xl font-extrabold tracking-tight">
            <span className="text-rose-500">▶</span> TuboF
          </div>
          <p className="text-xs text-slate-400">Video scelti con l'AI · per la famiglia</p>
        </div>
        {titolo && <h1 className="text-lg font-bold text-center">{titolo}</h1>}
        {children}
      </div>
    </div>
  );
}

const campo =
  'w-full py-3 px-3.5 text-base bg-slate-900 border border-slate-700 rounded-xl focus:border-indigo-500 focus:outline-none text-slate-100';
const bottone =
  'w-full py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer disabled:opacity-50';

function Accesso({ onFatto, erroreIniziale }: { onFatto: (u: UtenteFamiglia) => void; erroreIniziale?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState(erroreIniziale || '');
  const [attesa, setAttesa] = useState(false);

  const invia = async (e: FormEvent) => {
    e.preventDefault();
    setErrore(''); setAttesa(true);
    try { onFatto((await conto.entra(email, password)).utente); }
    catch (err: any) { setErrore(err.message); }
    finally { setAttesa(false); }
  };

  return (
    <Pagina titolo="Entra">
      <form onSubmit={invia} className="space-y-3">
        <input className={campo} type="email" autoComplete="username" placeholder="La tua email"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={campo} type="password" autoComplete="current-password" placeholder="Password"
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        {errore && <p className="text-sm text-rose-400">{errore}</p>}
        <button className={bottone} disabled={attesa}>{attesa ? 'Controllo…' : 'Entra'}</button>
      </form>
      <p className="text-xs text-slate-500 text-center leading-relaxed">
        TuboF è solo su invito. Password dimenticata? Chiedi a chi ti ha invitato un link per sceglierne una nuova.
      </p>
    </Pagina>
  );
}

function Registrazione({ codice, onFatto }: { codice: string; onFatto: (u: UtenteFamiglia) => void }) {
  const [info, setInfo] = useState<{ nome: string; email: string | null; reset: boolean } | null>(null);
  const [errore, setErrore] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ripeti, setRipeti] = useState('');
  const [attesa, setAttesa] = useState(false);

  useEffect(() => {
    conto.infoInvito(codice)
      .then((i) => { setInfo(i); if (i.email) setEmail(i.email); })
      .catch((e) => setErrore(e.message));
  }, [codice]);

  const invia = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 10) { setErrore('La password deve avere almeno 10 caratteri.'); return; }
    if (password !== ripeti) { setErrore('Le due password non sono uguali.'); return; }
    setErrore(''); setAttesa(true);
    try { onFatto((await conto.registra(codice, email, password)).utente); }
    catch (err: any) { setErrore(err.message); }
    finally { setAttesa(false); }
  };

  if (!info) {
    return (
      <Pagina titolo="Invito">
        {errore
          ? <><p className="text-sm text-rose-400 text-center">{errore}</p>
              <a href="#/" className="block text-center text-sm text-indigo-400">Vai all'accesso</a></>
          : <p className="text-sm text-slate-400 text-center">Controllo l'invito…</p>}
      </Pagina>
    );
  }

  return (
    <Pagina titolo={info.reset ? `Nuova password per ${info.nome}` : `Benvenuto, ${info.nome}!`}>
      <p className="text-sm text-slate-400 text-center">
        {info.reset ? 'Scegli la tua nuova password.' : 'Scegli la tua password: la userai per entrare in TuboF.'}
      </p>
      <form onSubmit={invia} className="space-y-3">
        <input className={campo} type="email" autoComplete="username" placeholder="La tua email"
          value={email} onChange={(e) => setEmail(e.target.value)} readOnly={!!info.email} required />
        <input className={campo} type="password" autoComplete="new-password" placeholder="Password (almeno 10 caratteri)"
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        <input className={campo} type="password" autoComplete="new-password" placeholder="Ripeti la password"
          value={ripeti} onChange={(e) => setRipeti(e.target.value)} required />
        {errore && <p className="text-sm text-rose-400">{errore}</p>}
        <button className={bottone} disabled={attesa}>{attesa ? 'Salvo…' : info.reset ? 'Salva la nuova password' : 'Crea il mio account'}</button>
      </form>
    </Pagina>
  );
}
