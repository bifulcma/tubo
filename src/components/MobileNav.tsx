import React from 'react';
import { Tv, Bookmark, History, Settings } from 'lucide-react';

interface MobileNavProps {
  activePage: string;
  onNavigate: (page: any) => void;
  watchLaterCount: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activePage,
  onNavigate,
  watchLaterCount,
}) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Tv },
    { id: 'watchLater', label: 'Più tardi', icon: Bookmark, badge: watchLaterCount },
    { id: 'history', label: 'Cronologia', icon: History },
    { id: 'settings', label: 'Impostazioni', icon: Settings },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 light:bg-white/95 backdrop-blur-lg border-t border-slate-800 light:border-slate-200 safe-pb">
      <div className="grid grid-cols-4 h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activePage === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 transition relative cursor-pointer ${
                isActive
                  ? 'text-indigo-400 light:text-indigo-600 font-semibold'
                  : 'text-slate-400 light:text-slate-500 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold bg-indigo-600 text-white flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
