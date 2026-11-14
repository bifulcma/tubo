import React, { useState } from 'react';
import {
  Settings,
  Key,
  Network,
  Bot,
  Save,
  Trash2,
  Check,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { AiProvider, AI_PROVIDERS, AppSettings, LINGUE, nomeCompletoAi } from '../types';
import { FAMIGLIA } from '../famiglia';
import { AccountFamiglia } from '../components/AccountFamiglia';
import { DEFAULT_BRIDGE_URL } from '../storage';
import { askBridge } from '../ponte';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (settings: Partial<AppSettings>) => void;
  onClearHistory: () => void;
  onClearWatchLater: () => void;
  onBackToHome: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onClearHistory,
  onClearWatchLater,
  onBackToHome,
}) => {
  const [youtubeApiKey, setYoutubeApiKey] = useState(settings.youtubeApiKey);
  const [bridgeUrl, setBridgeUrl] = useState(settings.bridgeUrl || DEFAULT_BRIDGE_URL);
  const [bridgeToken, setBridgeToken] = useState(settings.bridgeToken);
  const [defaultProvider, setDefaultProvider] = useState<AiProvider>(settings.defaultProvider);
  const [demoMode, setDemoMode] = useState(settings.demoMode);
  const [aiLanguage, setAiLanguage] = useState(settings.aiLanguage || 'it');
  const [videoLanguages, setVideoLanguages] = useState<string[]>(settings.videoLanguages || []);

  const [showApiKey, setShowApiKey] = useState(false);
  const [showBridgeToken, setShowBridgeToken] = useState(false);

  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; message?: string } | null>(null);

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSaveSettings({
      youtubeApiKey: youtubeApiKey.trim(),
      bridgeUrl: bridgeUrl.trim(),
      bridgeToken: bridgeToken.trim(),
      defaultProvider,
      demoMode,
      aiLanguage,
      videoLanguages,
    });
    setSaveStatus('Impostazioni salvate con successo in localStorage!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleTestBridge = async () => {
    if (!bridgeUrl.trim()) {
      setTestStatus({ loading: false, success: false, message: 'Inserisci prima l’indirizzo del ponte.' });
      return;
    }
    setTestStatus({ loading: true, message: 'Test di connessione in corso…' });
    try {
      const response = await askBridge({
        bridgeUrl: bridgeUrl.trim(),
        token: bridgeToken.trim(),
        provider: defaultProvider,
        prompt: 'Ping di prova: rispondi brevemente "OK"',
        system: 'Rispondi solo con OK',
      });
      setTestStatus({
        loading: false,
        success: true,
        message: `Connessione riuscita! Risposta: "${response.slice(0, 30)}"`,
      });
    } catch (err: any) {
      setTestStatus({
        loading: false,
        success: false,
        message: `Errore di connessione: ${err.message}`,
      });
    }
  };

  const isActuallyDemo = demoMode || !youtubeApiKey.trim() || !bridgeToken.trim();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4 light:border-slate-200">
        <button
          onClick={onBackToHome}
          aria-label="Torna alla Home"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer light:bg-white light:border-slate-200 light:text-slate-600"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white light:text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            Impostazioni
          </h1>
          <p className="text-xs text-slate-400 light:text-slate-500 mt-0.5">
            {FAMIGLIA
              ? 'Il tuo account e le preferenze. Le preferenze restano su questo dispositivo.'
              : <>Tutte le chiavi e le preferenze sono memorizzate solo sul tuo dispositivo (<code className="text-indigo-300">localStorage</code>) e mai condivise.</>}
          </p>
        </div>
      </div>

      {FAMIGLIA && <AccountFamiglia />}

      {/* Mode Status Pill */}
      {!FAMIGLIA && (
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4 light:bg-white light:border-slate-200">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isActuallyDemo ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
          <div>
            <p className="text-sm font-bold text-white light:text-slate-900">
              Stato attuale: {isActuallyDemo ? 'Modalità Dimostrazione' : 'Modalità Reale (YouTube Data API + Ponte)'}
            </p>
            <p className="text-xs text-slate-400 light:text-slate-500">
              {isActuallyDemo
                ? 'Usa dati finti e AI simulata (perfetta per provare l’interfaccia senza credenziali).'
                : 'Tubo effettua le vere chiamate alla YouTube Data API v3 e al tuo ponte AI.'}
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={demoMode}
            onChange={(e) => setDemoMode(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700 focus:ring-indigo-500"
          />
          <span className="text-xs font-semibold text-slate-300 light:text-slate-700">
            Forza Demo
          </span>
        </label>
      </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {!FAMIGLIA && (<>
        {/* YouTube API Key */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 light:bg-white light:border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 light:text-indigo-600">
            <Key className="w-4 h-4" />
            <h3 className="font-bold text-sm sm:text-base text-white light:text-slate-900">
              Chiave YouTube Data API v3
            </h3>
          </div>
          <p className="text-xs text-slate-400 light:text-slate-500 leading-relaxed">
            Inserisci la tua chiave API Google per le chiamate a <code className="text-indigo-300">search.list</code> e <code className="text-indigo-300">videos.list</code>. Se lasci il campo vuoto, verrà utilizzata automaticamente la modalità dimostrazione.
          </p>

          <div className="relative flex items-center">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={youtubeApiKey}
              onChange={(e) => setYoutubeApiKey(e.target.value)}
              placeholder="es. AIzaSy..."
              className="w-full py-2.5 pl-3.5 pr-10 text-sm bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none text-slate-100 light:bg-slate-50 light:border-slate-300 light:text-slate-900 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 text-slate-400 hover:text-white transition cursor-pointer"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Ponte AI Settings */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 light:bg-white light:border-slate-200 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400 light:text-indigo-600">
            <Network className="w-4 h-4" />
            <h3 className="font-bold text-sm sm:text-base text-white light:text-slate-900">
              Ponte AI (Mac locale o Tailscale)
            </h3>
          </div>
          <p className="text-xs text-slate-400 light:text-slate-500 leading-relaxed">
            Indirizzo dell'endpoint e token Bearer per parlare con i modelli (Nemotron, Claude, Argon).
          </p>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 light:text-slate-700">
                  Indirizzo del ponte
                </label>
                {DEFAULT_BRIDGE_URL && (
                <button
                  type="button"
                  onClick={() => setBridgeUrl(DEFAULT_BRIDGE_URL)}
                  className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Predefinito ({DEFAULT_BRIDGE_URL.slice(0, 28)}…)
                </button>
                )}
              </div>
              <input
                type="text"
                value={bridgeUrl}
                onChange={(e) => setBridgeUrl(e.target.value)}
                placeholder="https://nome-mac.tailnet.ts.net:8443"
                className="w-full py-2.5 px-3.5 text-sm bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none text-slate-100 light:bg-slate-50 light:border-slate-300 light:text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1.5">
                Token del ponte (Authorization: Bearer)
              </label>
              <div className="relative flex items-center">
                <input
                  type={showBridgeToken ? 'text' : 'password'}
                  value={bridgeToken}
                  onChange={(e) => setBridgeToken(e.target.value)}
                  placeholder="Token segreto del ponte..."
                  className="w-full py-2.5 pl-3.5 pr-10 text-sm bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none text-slate-100 light:bg-slate-50 light:border-slate-300 light:text-slate-900 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowBridgeToken(!showBridgeToken)}
                  className="absolute right-3 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  {showBridgeToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestBridge}
                disabled={testStatus?.loading}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer disabled:opacity-50"
              >
                {testStatus?.loading ? 'Test in corso…' : 'Testa connessione al ponte'}
              </button>
              {testStatus && !testStatus.loading && (
                <span
                  className={`text-xs font-medium ${
                    testStatus.success ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {testStatus.message}
                </span>
              )}
            </div>
          </div>
        </div>

        </>)}

        {/* Default AI Selection */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 light:bg-white light:border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 light:text-indigo-600">
            <Bot className="w-4 h-4" />
            <h3 className="font-bold text-sm sm:text-base text-white light:text-slate-900">
              Intelligenza Artificiale predefinita
            </h3>
          </div>
          <p className="text-xs text-slate-400 light:text-slate-500 leading-relaxed">
            Scegli il modello preferito che verrà selezionato all'avvio dell'applicazione.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {(Object.keys(AI_PROVIDERS) as AiProvider[]).map((provKey) => {
              const prov = AI_PROVIDERS[provKey];
              const isSelected = defaultProvider === provKey;
              return (
                <div
                  key={provKey}
                  onClick={() => setDefaultProvider(provKey)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500/50 light:bg-indigo-50 light:border-indigo-400'
                      : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 light:bg-slate-50 light:border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white light:text-slate-900">
                        {nomeCompletoAi(prov)}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                          prov.isLocal
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                            : 'bg-sky-950/60 text-sky-400 border border-sky-800/40'
                        }`}
                      >
                        {prov.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 light:text-slate-500 mt-1">
                      {prov.description}
                    </p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Lingua */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 light:bg-white light:border-slate-200 space-y-4">
          <h3 className="font-bold text-sm sm:text-base text-white light:text-slate-900">Lingua</h3>
          <div>
            <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1.5">
              Lingua dell'AI (motivi, riassunti, commenti, capitoli)
            </label>
            <select
              value={aiLanguage}
              onChange={(e) => setAiLanguage(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 light:bg-slate-50 light:border-slate-200 light:text-slate-900"
            >
              {LINGUE.map((l) => (
                <option key={l.code} value={l.code}>{l.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1.5">
              Lingue preferite dei video
            </label>
            <div className="flex flex-wrap gap-2">
              {LINGUE.map((l) => {
                const on = videoLanguages.includes(l.code);
                return (
                  <button
                    type="button"
                    key={l.code}
                    onClick={() => setVideoLanguages(on ? videoLanguages.filter((c) => c !== l.code) : [...videoLanguages, l.code])}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border cursor-pointer transition ${
                      on
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600 light:bg-slate-50 light:border-slate-200 light:text-slate-700'
                    }`}
                  >
                    {on ? '✓ ' : ''}{l.nome}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-400 light:text-slate-500">
              Nessuna scelta = decide l'AI dalla tua domanda. Le ricerche si fanno nelle lingue scelte, salvo che la domanda ne chieda altre.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Salva impostazioni
          </button>

          {saveStatus && (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-4 h-4" />
              {saveStatus}
            </span>
          )}
        </div>
      </form>

      {/* Storage Management / Danger Zone */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 light:bg-slate-50 light:border-slate-200 space-y-4">
        <h3 className="font-bold text-sm text-slate-300 light:text-slate-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Gestione dati locali
        </h3>
        <p className="text-xs text-slate-400">
          Puoi azzerare la cronologia dei video visti o l'elenco di «Guarda più tardi» in qualsiasi momento.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              if (confirm('Vuoi davvero cancellare tutta la cronologia?')) {
                onClearHistory();
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Azzera cronologia
          </button>

          <button
            type="button"
            onClick={() => {
              if (confirm('Vuoi davvero svuotare la lista Guarda più tardi?')) {
                onClearWatchLater();
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Svuota «Guarda più tardi»
          </button>
        </div>
      </div>
    </div>
  );
};
