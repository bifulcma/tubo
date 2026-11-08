import React, { useState } from 'react';
import { Sparkles, Sliders, X } from 'lucide-react';

interface DemoBannerProps {
  onOpenSettings: () => void;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ onOpenSettings }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/60 border-b border-indigo-500/20 px-4 py-2.5 text-xs sm:text-sm text-indigo-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <p className="truncate">
            <strong className="font-semibold text-white">Modalità dimostrazione:</strong> Stai usando video inventati (anteprime SVG/CSS) e AI simulata.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-100 hover:text-white transition text-xs font-medium border border-indigo-500/30 cursor-pointer"
          >
            <Sliders className="w-3 h-3" />
            Configura API e Ponte
          </button>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Chiudi avviso"
            className="p-1 text-indigo-400 hover:text-white rounded transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
