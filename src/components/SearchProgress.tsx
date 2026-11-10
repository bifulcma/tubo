import React from 'react';
import { Bot, Search, Sparkles, CheckCircle2, AlertCircle, RefreshCw, XCircle, Ban } from 'lucide-react';
import { SearchStatus, testoRicerca } from '../types';

interface SearchProgressProps {
  status: SearchStatus;
  onRetry?: () => void;
  onCancel?: () => void;
}

export const SearchProgress: React.FC<SearchProgressProps> = ({ status, onRetry, onCancel }) => {
  const { step, message, details, plan, error } = status;

  if (step === 'idle') return null;
  const inCorso = step === 'planning' || step === 'fetching' || step === 'evaluating';
  const annullata = step === 'cancelled';

  const isStepActive = (targetStep: string) => step === targetStep;
  const isStepPassed = (targetStep: string) => {
    const order = ['planning', 'fetching', 'evaluating', 'done'];
    const currentIndex = order.indexOf(step);
    const targetIndex = order.indexOf(targetStep);
    return currentIndex > targetIndex;
  };

  const steps = [
    {
      id: 'planning',
      title: "1. L'AI prepara le ricerche…",
      subtitle: 'Analisi semantica e scomposizione in sotto-ricerche mirate',
      icon: Bot,
    },
    {
      id: 'fetching',
      title: '2. Cerco su YouTube…',
      subtitle: 'Recupero dati, durate effettive e statistiche',
      icon: Search,
    },
    {
      id: 'evaluating',
      title: "3. L'AI sceglie e ordina…",
      subtitle: 'Filtro acchiappa-clic e valutazione pertinenza qualitativa',
      icon: Sparkles,
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto my-6 p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md light:bg-white light:border-slate-200">
      {/* Current Headline */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
            {step === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400" />
            ) : annullata ? (
              <Ban className="w-5 h-5 text-slate-300" />
            ) : step === 'done' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            )}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white light:text-slate-900">
              {message}
            </h2>
            {details && (
              <p className="text-xs sm:text-sm text-slate-400 light:text-slate-500 mt-0.5">
                {details}
              </p>
            )}
          </div>
        </div>

        {inCorso && onCancel && (
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-semibold cursor-pointer transition shrink-0 light:bg-slate-100 light:border-slate-300 light:text-slate-800 light:hover:bg-slate-200"
          >
            <XCircle className="w-3.5 h-3.5" />
            Annulla
          </button>
        )}

        {(annullata || (error && step === 'error')) && onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-xs font-semibold cursor-pointer transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {annullata ? 'Cerca di nuovo' : 'Riprova'}
          </button>
        )}
      </div>

      {/* Stepper visualizer */}
      {!annullata && <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map((st) => {
          const Icon = st.icon;
          const active = isStepActive(st.id);
          const completed = isStepPassed(st.id) || step === 'done';

          let stateStyle = 'border-slate-800/60 bg-slate-950/40 opacity-50 light:border-slate-200 light:bg-slate-50';
          let iconStyle = 'bg-slate-800 text-slate-400';

          if (active) {
            stateStyle = 'border-indigo-500/60 bg-indigo-950/20 ring-1 ring-indigo-500/40 light:bg-indigo-50 light:border-indigo-300';
            iconStyle = 'bg-indigo-600 text-white animate-pulse';
          } else if (completed) {
            stateStyle = 'border-emerald-500/40 bg-emerald-950/10 light:bg-emerald-50 light:border-emerald-300';
            iconStyle = 'bg-emerald-600/30 text-emerald-400 light:text-emerald-700';
          }

          return (
            <div
              key={st.id}
              className={`p-3.5 rounded-xl border transition-all ${stateStyle}`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconStyle}`}>
                  {completed ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-200 light:text-slate-800 truncate">
                    {st.title}
                  </p>
                  <p className="text-[11px] text-slate-400 light:text-slate-500 line-clamp-1">
                    {st.subtitle}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>}

      {/* Detailed Search Plan Badges (if available) */}
      {plan && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 light:border-slate-200">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Parametri decisi dall'AI:
          </p>
          <div className="flex flex-wrap gap-1.5 items-center">
            {plan.ricerche.map((r, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-md text-xs bg-slate-800/80 text-indigo-300 border border-slate-700/60 light:bg-slate-100 light:border-slate-200 light:text-indigo-700"
              >
                🔍 “{testoRicerca(r)}”{typeof r !== 'string' && r.lingua ? ` · ${r.lingua}` : ''}
              </span>
            ))}
            {plan.lingue.length > 0 && (
              <span className="px-2 py-0.8 rounded-md text-xs bg-slate-800/60 text-slate-300 border border-slate-700 light:bg-slate-100 light:border-slate-200 light:text-slate-700">
                🌐 Lingue: {plan.lingue.join(', ')}
              </span>
            )}
            {plan.durata_minima_min > 0 && (
              <span className="px-2 py-0.8 rounded-md text-xs bg-amber-950/40 text-amber-300 border border-amber-800/40 light:bg-amber-100 light:border-amber-200 light:text-amber-800">
                ⏱️ Durata min: {plan.durata_minima_min} min
              </span>
            )}
            {plan.escludi.length > 0 && (
              <span className="px-2 py-0.8 rounded-md text-xs bg-rose-950/40 text-rose-300 border border-rose-800/40 light:bg-rose-100 light:border-rose-200 light:text-rose-800">
                🚫 Esclusi: {plan.escludi.join(', ')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-100">Si è verificato un errore durante l'operazione:</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};
