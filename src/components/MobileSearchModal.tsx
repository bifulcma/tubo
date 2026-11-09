import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Mic,
  MicOff,
  Sparkles,
  History,
  Bot,
  Check,
  ArrowRight,
  Compass,
} from 'lucide-react';
import { AiProvider, AI_PROVIDERS, SavedSearch } from '../types';

interface MobileSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  selectedAi: AiProvider;
  onSelectAi: (ai: AiProvider) => void;
  savedSearches: SavedSearch[];
  onOpenSavedSearch: (s: SavedSearch) => void;
  initialQuery?: string;
}

export const MobileSearchModal: React.FC<MobileSearchModalProps> = ({
  isOpen,
  onClose,
  onSearch,
  selectedAi,
  onSelectAi,
  savedSearches,
  onOpenSavedSearch,
  initialQuery = '',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const inspirationQueries = [
    'lezioni serie su Carl Schmitt e il katechon, non divulgative, in italiano o tedesco',
    'Meccanica quantistica: paradosso EPR e teorema di Bell',
    'Architettura dei Large Language Models: Transformer e FlashAttention',
    'J.S. Bach: Die Kunst der Fuge analisi contrappuntistica',
    'Design industriale italiano: Ettore Sottsass e Achille Castiglioni',
  ];

  // Inizializza il supporto per Speech Recognition (dettatura vocale)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'it-IT';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setQuery(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Quando si apre, sincronizza la query e dai il focus
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Errore avvio riconoscimento vocale:', err);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      onClose();
    }
  };

  const handleSelectQuick = (q: string) => {
    setQuery(q);
    onSearch(q);
    onClose();
  };

  const quando = (t: number) => {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'adesso';
    if (m < 60) return `${m} min fa`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} h fa`;
    const g = Math.round(h / 24);
    return g === 1 ? 'ieri' : `${g} gg fa`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 text-slate-100 light:bg-white/98 light:text-slate-900 backdrop-blur-xl animate-in fade-in duration-150 overflow-y-auto">
      {/* Header bar con chiusura rapida */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 pt-4 pb-2 bg-slate-950/95 light:bg-white/95 border-b border-slate-800/80 light:border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight">Cerca video con AI</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 -mr-2 rounded-full text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900 active:scale-95 transition"
          aria-label="Chiudi"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-5 pb-24 max-w-lg mx-auto w-full">
        {/* Modulo di ricerca principale */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative flex items-center rounded-2xl border-2 border-indigo-500/50 bg-slate-900 shadow-xl focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/20 light:bg-slate-100 light:border-indigo-400/60 transition">
            <Search className="w-5 h-5 ml-3.5 text-slate-400 shrink-0 pointer-events-none" />
            
            {/* L'input usa text-base (16px) per impedire lo zoom automatico di iOS Safari */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cosa vuoi guardare o imparare?"
              className="w-full py-3.5 pl-3 pr-2 text-base bg-transparent border-0 focus:outline-none focus:ring-0 text-white placeholder:text-slate-500 light:text-slate-900 light:placeholder:text-slate-400"
            />

            {/* Tasto Cancella testo */}
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="p-2 text-slate-400 hover:text-white light:hover:text-slate-800"
                aria-label="Cancella testo"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Tasto Dettatura Vocale (se supportata dal browser) */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2.5 mr-1 rounded-xl transition ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'text-slate-400 hover:text-indigo-400 light:text-slate-500'
                }`}
                title={isListening ? 'In ascolto… parla' : 'Detta con la voce'}
                aria-label="Dettatura vocale"
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            )}
          </div>

          {/* Feedback dettatura vocale */}
          {isListening && (
            <p className="text-xs text-rose-400 font-medium flex items-center gap-1.5 animate-pulse pl-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Ascolto… parla pure, trascrivo la richiesta
            </p>
          )}

          {/* Grande pulsante Cerca per facilitare il tap col pollice */}
          <button
            type="submit"
            disabled={!query.trim()}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-base shadow-lg shadow-indigo-600/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99] transition cursor-pointer"
          >
            <Search className="w-5 h-5" />
            <span>Avvia ricerca AI</span>
          </button>
        </form>

        {/* Selettore AI a pulsanti larghi per il pollice */}
        <div className="space-y-2 pt-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 light:text-slate-500 flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            Scegli il modello AI:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(AI_PROVIDERS) as AiProvider[]).map((provKey) => {
              const prov = AI_PROVIDERS[provKey];
              const isSelected = selectedAi === provKey;
              return (
                <button
                  key={provKey}
                  type="button"
                  onClick={() => onSelectAi(provKey)}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/50 light:bg-indigo-50/80 shadow-md ring-1 ring-indigo-500'
                      : 'border-slate-800 bg-slate-900/60 light:border-slate-200 light:bg-slate-100 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-xs text-white light:text-slate-900">
                      {prov.name}
                    </span>
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-indigo-400 light:text-indigo-600 shrink-0" />
                    ) : (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                          prov.isLocal
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 light:bg-emerald-100 light:text-emerald-800'
                            : 'bg-sky-950/60 text-sky-400 border border-sky-800/40 light:bg-sky-100 light:text-sky-800'
                        }`}
                      >
                        {prov.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 light:text-slate-500 mt-1 line-clamp-1">
                    {prov.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ultime ricerche salvate (se presenti) */}
        {savedSearches.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 light:text-slate-500 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-indigo-400" />
              Ultime ricerche:
            </p>
            <div className="space-y-1.5">
              {savedSearches.slice(0, 4).map((s, idx) => (
                <button
                  key={`${s.query}-${s.provider}-${idx}`}
                  type="button"
                  onClick={() => {
                    onOpenSavedSearch(s);
                    onClose();
                  }}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 light:bg-slate-100 light:border-slate-200 flex items-center justify-between gap-3 active:scale-[0.99] transition cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-200 light:text-slate-800 line-clamp-1">
                      {s.query}
                    </p>
                    <p className="text-[10px] text-slate-500 light:text-slate-400 mt-0.5">
                      {AI_PROVIDERS[s.provider]?.name || s.provider} · {quando(s.at)} · {s.results.length} video
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ricerche di esempio consigliate con un tocco */}
        <div className="space-y-2 pt-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 light:text-slate-500 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            Ricerche d'esempio con un tap:
          </p>
          <div className="space-y-1.5">
            {inspirationQueries.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectQuick(item)}
                className="w-full text-left p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:bg-slate-800/60 light:bg-slate-50 light:border-slate-200 light:hover:bg-slate-100 text-xs text-slate-300 light:text-slate-700 flex items-center justify-between gap-2 active:scale-[0.99] transition cursor-pointer"
              >
                <span className="line-clamp-1">«{item}»</span>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
