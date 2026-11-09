import React from 'react';
import { Tv, Search, Bookmark, History, Settings } from 'lucide-react';

interface MobileNavProps {
  activePage: string;
  onNavigate: (page: any) => void;
  onOpenSearch: () => void;
  watchLaterCount: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activePage,
  onNavigate,
  onOpenSearch,
  watchLaterCount,
}) => {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 light:bg-white/95 backdrop-blur-lg border-t border-slate-800 light:border-slate-200 safe-pb">
      <div className="grid grid-cols-5 h-14">
        {/* Home */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center gap-1 transition relative cursor-pointer active:scale-95 ${
            activePage === 'home'
              ? 'text-indigo-400 light:text-indigo-600 font-semibold'
              : 'text-slate-400 light:text-slate-500 hover:text-slate-200'
          }`}
        >
          <Tv className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Home</span>
        </button>

        {/* Tasto CERCA dedicato (apre la modale mobile pensata per iPhone) */}
        <button
          type="button"
          onClick={onOpenSearch}
          className={`flex flex-col items-center justify-center gap-1 transition relative cursor-pointer active:scale-95 ${
            activePage === 'search'
              ? 'text-indigo-400 light:text-indigo-600 font-semibold'
              : 'text-indigo-400/90 light:text-indigo-600/90 hover:text-indigo-300'
          }`}
        >
          <div className="relative p-1 rounded-xl bg-indigo-600/15 light:bg-indigo-50 border border-indigo-500/30">
            <Search className="w-4 h-4 text-indigo-400 light:text-indigo-600" />
          </div>
          <span className="text-[10px] tracking-tight font-medium">Cerca</span>
        </button>

        {/* Più tardi */}
        <button
          type="button"
          onClick={() => onNavigate('watchLater')}
          className={`flex flex-col items-center justify-center gap-1 transition relative cursor-pointer active:scale-95 ${
            activePage === 'watchLater'
              ? 'text-indigo-400 light:text-indigo-600 font-semibold'
              : 'text-slate-400 light:text-slate-500 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Bookmark className="w-5 h-5" />
            {Boolean(watchLaterCount && watchLaterCount > 0) && (
              <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold bg-indigo-600 text-white flex items-center justify-center">
                {watchLaterCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Più tardi</span>
        </button>

        {/* Cronologia */}
        <button
          type="button"
          onClick={() => onNavigate('history')}
          className={`flex flex-col items-center justify-center gap-1 transition relative cursor-pointer active:scale-95 ${
            activePage === 'history'
              ? 'text-indigo-400 light:text-indigo-600 font-semibold'
              : 'text-slate-400 light:text-slate-500 hover:text-slate-200'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Cronologia</span>
        </button>

        {/* Impostazioni */}
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className={`flex flex-col items-center justify-center gap-1 transition relative cursor-pointer active:scale-95 ${
            activePage === 'settings'
              ? 'text-indigo-400 light:text-indigo-600 font-semibold'
              : 'text-slate-400 light:text-slate-500 hover:text-slate-200'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Opzioni</span>
        </button>
      </div>
    </nav>
  );
};
