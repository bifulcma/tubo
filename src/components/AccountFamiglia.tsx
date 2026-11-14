import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { UserRound, LogOut, UserPlus, Copy, Check, KeyRound, Trash2 } from 'lucide-react';
import { conto, linkInvito, type UtenteFamiglia } from '../famiglia';

const scheda = 'p-6 rounded-2xl bg-slate-900/60 border border-slate-800 light:bg-white light:border-slate-200 space-y-4';
const campo =
  'w-full py-2.5 px-3.5 text-sm bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none text-slate-100 light:bg-slate-50 light:border-slate-300 light:text-slate-900';
const piccolo =
  'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5';

/** TuboF › Impostazioni: il proprio account e, per l'amministratore, gli inviti. */
export function AccountFamiglia() {
  const [utente, setUtente] = useState<UtenteFamiglia | null>(null);
  const [vecchia, setVecchia] = useState('');
  const [nuova, setNuova] = useState('');
  const [msgPw, setMsgPw] = useState('');

  useEffect(() => { conto.io().then((r) => setUtente(r.utente)).catch(() => {}); }, []);

  const esci = async () => {
    try { await conto.esci(); } finally { window.location.hash = '#/'; window.location.reload(); }
  };

  const cambia = async (e: FormEvent) => {
    e.preventDefault();
    if (nuova.length < 10) { setMsgPw('La nuova password deve avere almeno 10 caratteri.'); return; }
    try { await conto.cambiaPassword(vecchia, nuova); setMsgPw('Password cambiata.'); setVecchia(''); setNuova(''); }
    catch (err: any) { setMsgPw(err.message); }
  };

  if (!utente) return null;
  const u = utente.uso;

  return (
    <div className="space-y-6">
      <div className={scheda}>
        <div className="flex items-center gap-2 text-indigo-400">
          <UserRound className="w-4 h-4" />
          <h3 className="font-bold text-sm sm:text-base text-white light:text-slate-900">Il tuo account</h3>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <div className="font-semibold text-white light:text-slate-900">{utente.nome}{utente.admin ? ' · amministratore' : ''}</div>
            <div className="text-slate-400">{utente.email}</div>
          </div>
          <button type="button" onClick={esci} className={piccolo}><LogOut className="w-3.5 h-3.5" /> Esci</button>
        </div>
        {u && (
          <p className="text-xs text-slate-400 leading-relaxed">
            Oggi: circa {Math.floor(u.unita / 100)} ricerche YouTube su {Math.floor(u.limiteUnita / 100)} · {u.ai} risposte AI su {u.limiteAi}.
            Il conto riparte ogni giorno.
          </p>
        )}
        <form onSubmit={cambia} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 pt-1">
          <input className={campo} type="password" autoComplete="current-password" placeholder="Password attuale"
            value={vecchia} onChange={(e) => setVecchia(e.target.value)} required />
          <input className={campo} type="password" autoComplete="new-password" placeholder="Nuova password"
            value={nuova} onChange={(e) => setNuova(e.target.value)} required />
          <button className={piccolo + ' justify-center'}><KeyRound className="w-3.5 h-3.5" /> Cambia</button>
        </form>
        {msgPw && <p className="text-xs text-slate-300">{msgPw}</p>}
      </div>

      {utente.admin && <Inviti />}
    </div>
  );
}

function Copia({ testo }: { testo: string }) {
  const [fatto, setFatto] = useState(false);
  return (
    <button type="button" className={piccolo} onClick={async () => {
      try { await navigator.clipboard.writeText(testo); setFatto(true); setTimeout(() => setFatto(false), 2000); } catch { /* niente */ }
    }}>
      {fatto ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {fatto ? 'Copiato' : 'Copia link'}
    </button>
  );
}

function Inviti() {
  const [dati, setDati] = useState<Awaited<ReturnType<typeof conto.elenco>> | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [nuovoLink, setNuovoLink] = useState<{ chi: string; link: string } | null>(null);
  const [errore, setErrore] = useState('');

  const ricarica = useCallback(() => { conto.elenco().then(setDati).catch((e) => setErrore(e.message)); }, []);
  useEffect(ricarica, [ricarica]);

  const prova = async (f: () => Promise<unknown>) => {
    setErrore('');
    try { await f(); ricarica(); } catch (e: any) { setErrore(e.message); }
  };

  const invita = (e: FormEvent) => {
    e.preventDefault();
    prova(async () => {
      const { codice } = await conto.invita(nome.trim(), email.trim());
      setNuovoLink({ chi: nome.trim(), link: linkInvito(codice) });
      setNome(''); setEmail('');
    });
  };

  return (
    <div className={scheda}>
      <div className="flex items-center gap-2 text-indigo-400">
        <UserPlus className="w-4 h-4" />
        <h3 className="font-bold text-sm sm:text-base text-white light:text-slate-900">Famiglia: inviti e accessi</h3>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">
        Crei un invito e mandi il link (WhatsApp, Signal…). Chi lo apre sceglie la sua password. Il link vale 7 giorni e funziona una volta sola.
      </p>

      <form onSubmit={invita} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
        <input className={campo} placeholder="Nome (es. Giulia)" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <input className={campo} type="email" placeholder="Email (facoltativa)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className={piccolo + ' justify-center'}><UserPlus className="w-3.5 h-3.5" /> Crea invito</button>
      </form>

      {nuovoLink && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-sm space-y-2">
          <div>Link per <b>{nuovoLink.chi}</b>:</div>
          <div className="font-mono text-xs break-all text-emerald-300">{nuovoLink.link}</div>
          <Copia testo={nuovoLink.link} />
        </div>
      )}
      {errore && <p className="text-xs text-rose-400">{errore}</p>}

      {dati && (
        <div className="space-y-4 pt-2">
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2">Chi ha accesso</div>
            <ul className="space-y-2">
              {dati.utenti.map((x) => (
                <li key={x.email} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    <b>{x.nome}</b> <span className="text-slate-400">{x.email}</span>
                    <span className="text-xs text-slate-500"> · oggi ~{Math.floor(x.usoOggi / 100)} ricerche</span>
                  </span>
                  {!x.admin && (
                    <span className="flex gap-2">
                      <button type="button" className={piccolo} onClick={() => prova(async () => {
                        const { codice } = await conto.nuovaPassword(x.email);
                        setNuovoLink({ chi: `${x.nome} (nuova password)`, link: linkInvito(codice) });
                      })}><KeyRound className="w-3.5 h-3.5" /> Nuova password</button>
                      <button type="button" className={piccolo} onClick={() => {
                        if (confirm(`Togliere l'accesso a ${x.nome}?`)) prova(() => conto.revoca(x.email));
                      }}><Trash2 className="w-3.5 h-3.5" /> Togli accesso</button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          {dati.inviti.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-300 mb-2">Inviti in attesa</div>
              <ul className="space-y-2">
                {dati.inviti.map((i) => (
                  <li key={i.codice} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span><b>{i.nome}</b> <span className="text-xs text-slate-500">scade il {new Date(i.scade).toLocaleDateString('it-IT')}</span></span>
                    <span className="flex gap-2">
                      <Copia testo={linkInvito(i.codice)} />
                      <button type="button" className={piccolo} onClick={() => prova(() => conto.annullaInvito(i.codice))}>
                        <Trash2 className="w-3.5 h-3.5" /> Annulla
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
