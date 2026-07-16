import React from 'react';
import { Moon, Sun } from 'lucide-react';
import SpotlightCard from './SpotlightCard';

interface HeaderProps {
  onSearch: (query: string) => void;
  theme: 'journal' | 'noir';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSearch, theme, onToggleTheme, onOpenSettings }) => {
  const isNoir = theme === 'noir';

  return (
    <header className={`sticky top-0 flex justify-between items-center w-full px-8 py-6 max-w-[1920px] mx-auto z-40 transition-all duration-500 bg-transparent border-b border-dashed backdrop-blur-sm ${
      isNoir 
        ? 'border-white/10' 
        : 'border-[#003399]/10'
    }`}>
      <div className={`text-2xl font-black italic transition-all duration-500 ${
        isNoir 
          ? 'text-[#FF3B30]' 
          : 'text-[#003399]'
      }`}>
        The Living Journal
      </div>
      
      <div className="flex items-center gap-8">
        <SpotlightCard theme={theme} variant="inset" className="relative group rounded-xl">
          <input
            className={`transition-all duration-300 font-label w-72 px-6 py-3 focus:outline-none rounded-xl border-none bg-transparent ${
              isNoir 
                ? 'text-white placeholder:text-white/30' 
                : 'text-primary placeholder:text-primary/40 italic'
            }`}
            placeholder="Search knowledge..."
            type="text"
            onChange={(e) => onSearch(e.target.value)}
          />
          <span className={`material-symbols-outlined absolute right-4 top-3.5 transition-colors ${
            isNoir ? 'text-[#FF3B30]' : 'text-primary/40'
          }`}>search</span>
        </SpotlightCard>
        
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleTheme}
            className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center nm-flat ${
              isNoir 
                ? 'text-[#FF3B30] hover:nm-inset' 
                : 'text-primary/70 hover:nm-inset'
            }`}
            title="Toggle Theme"
          >
            {isNoir ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          <div className="flex gap-2">
            <span 
              onClick={onOpenSettings}
              className={`material-symbols-outlined cursor-pointer p-3 rounded-xl transition-all nm-flat ${
              isNoir 
                ? 'text-white/40 hover:text-white hover:nm-inset' 
                : 'text-primary/70 hover:nm-inset'
            }`}>settings</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
