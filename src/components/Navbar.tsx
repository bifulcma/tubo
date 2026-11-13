import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bot,
  Bookmark,
  History,
  Settings,
  Sun,
  Moon,
  Tv,
  ChevronDown,
  Check,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { AiProvider, AI_PROVIDERS, Periodo, nomeCompletoAi } from '../types';
import { PERIODI } from '../periodo';

interface NavbarProps {
  activePage: string;
  onNavigate: (page: any, params?: any) => void;
  selectedAi: AiProvider;
  onSelectAi: (ai: AiProvider) => void;
  periodo: Periodo;
  onSelectPeriodo: (p: Periodo) => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  watchLaterCount: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenMobileSearch?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  onNavigate,
  selectedAi,
  onSelectAi,
  periodo,
  onSelectPeriodo,
  searchQuery,
  onSearch,
  watchLaterCount,
  theme,
  onToggleTheme,
  onOpenMobileSearch,
}) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [isAiDropdownOpen, setIsAiDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsAiDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      onSearch(localQuery.trim());
    }
  };

  const currentProvider = AI_PROVIDERS[selectedAi];

  // placeholder lungo solo dove c'è spazio (niente testo tagliato su iPhone/iPad)
  const [largo, setLargo] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1180px)').matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(min-width: 1180px)');
    if (!mq) return;
    const f = () => setLargo(mq.matches);
    mq.addEventListener?.('change', f);
    return () => mq.removeEventListener?.('change', f);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors bg-slate-950/80 border-slate-800/80 light:bg-white/80 light:border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
        {/* Brand Logo */}
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 cursor-pointer shrink-0 select-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition">
            <svg
              className="w-5 h-5 text-white fill-current ml-0.5"
              viewBox="0 0 24 24"
            >
              <path d="M5 4.5v15a1.5 1.5 0 002.3 1.3l12-7.5a1.5 1.5 0 000-2.6l-12-7.5A1.5 1.5 0 005 4.5z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent light:from-slate-900 light:via-indigo-950 light:to-indigo-600">
              Tubo
            </span>
            <span className="text-[10px] -mt-1 font-medium tracking-wide uppercase text-indigo-400/80 light:text-indigo-600/80 hidden sm:inline">
              Ricerca AI
            </span>
          </div>
        </div>

        {/* Su iPhone: un pulsante che apre la ricerca a tutto schermo (niente testo tagliato) */}
        <button
          type="button"
          onClick={() => onOpenMobileSearch?.()}
          className="sm:hidden flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-900/90 text-slate-300 text-sm cursor-pointer light:bg-slate-100 light:border-slate-300 light:text-slate-600"
        >
          <Search className="w-4 h-4 shrink-0 text-indigo-300" />
          <span className="truncate">{localQuery || 'Cosa cerchi?'}</span>
        </button>

        {/* Central Search Bar with AI Selector */}
        <form
          onSubmit={handleSubmit}
          className="hidden sm:flex flex-1 max-w-2xl items-center relative"
        >
          <div
            onClick={() => {
              if (window.innerWidth < 640 && onOpenMobileSearch) {
                onOpenMobileSearch();
              }
            }}
            className="w-full flex items-center rounded-xl border border-slate-800 bg-slate-900/90 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 transition shadow-inner light:bg-slate-100/90 light:border-slate-300 cursor-pointer sm:cursor-text"
          >
            {/* Search Input */}
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 ml-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                onFocus={() => {
                  if (window.innerWidth < 640 && onOpenMobileSearch) {
                    onOpenMobileSearch();
                  }
                }}
                placeholder={largo ? 'Cosa vuoi guardare? Es. lezioni serie su Carl Schmitt' : 'Cosa vuoi guardare?'}
                className="w-full py-2.5 pl-3 pr-2 text-base sm:text-sm bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-100 placeholder:text-slate-400 light:text-slate-900 light:placeholder:text-slate-400"
              />
            </div>

            {/* Periodo di pubblicazione (criterio della ricerca) */}
            <label
              className={`relative shrink-0 flex items-center gap-1 pl-2.5 pr-1 border-l border-slate-800 light:border-slate-300 text-xs font-medium cursor-pointer ${
                periodo !== 'auto' ? 'text-sky-300 light:text-sky-700' : 'text-slate-300 light:text-slate-700'
              }`}
              title="Periodo di pubblicazione dei video"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-400 light:text-indigo-600 pointer-events-none" />
              <select
                value={periodo}
                onChange={(e) => onSelectPeriodo(e.target.value as Periodo)}
                aria-label="Periodo di pubblicazione"
                className="bg-transparent border-0 py-2 pr-1 text-xs font-medium focus:outline-none focus:ring-0 cursor-pointer appearance-none"
              >
                {PERIODI.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100 light:bg-white light:text-slate-900">
                    {p.id === 'auto' ? 'Ogni data' : p.nome}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none" />
            </label>

            {/* AI Selector Dropdown Pill */}
            <div className="relative shrink-0 border-l border-slate-800 light:border-slate-300" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsAiDropdownOpen(!isAiDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white transition light:text-slate-700 light:hover:text-slate-900 cursor-pointer"
                title="Scegli il modello di intelligenza artificiale per la ricerca"
              >
                <Bot className="w-3.5 h-3.5 text-indigo-400 light:text-indigo-600" />
                <span className="hidden sm:inline whitespace-nowrap">{currentProvider.name}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* AI Dropdown Menu */}
              {isAiDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 light:bg-white light:border-slate-200">
                  <div className="px-3 py-1.5 border-b border-slate-800 light:border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      Motore di Ricerca AI
                    </p>
                  </div>
                  {(Object.keys(AI_PROVIDERS) as AiProvider[]).map((provKey) => {
                    const prov = AI_PROVIDERS[provKey];
                    const isSelected = selectedAi === provKey;
                    return (
                      <button
                        key={provKey}
                        type="button"
                        onClick={() => {
                          onSelectAi(provKey);
                          setIsAiDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 flex items-start justify-between gap-2 hover:bg-slate-800/60 light:hover:bg-slate-100 transition cursor-pointer ${
                          isSelected ? 'bg-indigo-950/40 light:bg-indigo-50/60 text-indigo-300 light:text-indigo-700' : 'text-slate-200 light:text-slate-800'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-semibold">{nomeCompletoAi(prov)}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                                prov.isLocal
                                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 light:bg-emerald-100 light:text-emerald-800'
                                  : 'bg-sky-950/60 text-sky-400 border border-sky-800/40 light:bg-sky-100 light:text-sky-800'
                              }`}
                            >
                              {prov.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 light:text-slate-600 mt-0.5">
                            {prov.description}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-indigo-400 light:text-indigo-600 mt-0.5 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Search Submit Button */}
            <button
              type="submit"
              aria-label="Cerca"
              className="p-2.5 mr-1 text-slate-300 hover:text-white bg-indigo-600/80 hover:bg-indigo-600 rounded-lg transition cursor-pointer shrink-0"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Right Navigation & Tools */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Home / Tendenze (desktop) */}
          <button
            onClick={() => onNavigate('home')}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
              activePage === 'home'
                ? 'bg-slate-800 text-white light:bg-slate-200 light:text-slate-900'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60 light:text-slate-600 light:hover:text-slate-900 light:hover:bg-slate-100'
            }`}
          >
            <Tv className="w-4 h-4" />
            Home
          </button>

          {/* Guarda più tardi */}
          <button
            onClick={() => onNavigate('watchLater')}
            title="Guarda più tardi"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer relative ${
              activePage === 'watchLater'
                ? 'bg-slate-800 text-white light:bg-slate-200 light:text-slate-900'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60 light:text-slate-600 light:hover:text-slate-900 light:hover:bg-slate-100'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span className="hidden lg:inline">Più tardi</span>
            {watchLaterCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                {watchLaterCount}
              </span>
            )}
          </button>

          {/* Cronologia */}
          <button
            onClick={() => onNavigate('history')}
            title="Cronologia"
            className={`hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
              activePage === 'history'
                ? 'bg-slate-800 text-white light:bg-slate-200 light:text-slate-900'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60 light:text-slate-600 light:hover:text-slate-900 light:hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span className="hidden lg:inline">Cronologia</span>
          </button>

          {/* Impostazioni */}
          <button
            onClick={() => onNavigate('settings')}
            title="Impostazioni"
            className={`p-2 rounded-lg transition cursor-pointer ${
              activePage === 'settings'
                ? 'bg-slate-800 text-white light:bg-slate-200 light:text-slate-900'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60 light:text-slate-600 light:hover:text-slate-900 light:hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
            aria-label="Alterna tema chiaro e scuro"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/60 light:text-slate-600 light:hover:text-slate-900 light:hover:bg-slate-100 transition cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
