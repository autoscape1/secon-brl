import React, { useState } from 'react';
import { Moon, Sun, Menu, Search } from 'lucide-react';
import SpotlightCard from './SpotlightCard';

interface HeaderProps {
  onSearch: (query: string) => void;
  theme: 'journal' | 'noir';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSearch, theme, onToggleTheme, onOpenSettings, onToggleSidebar }) => {
  const isNoir = theme === 'noir';
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  return (
    <header className={`sticky top-0 flex flex-col sm:flex-row sm:justify-between sm:items-center w-full px-4 sm:px-8 py-4 sm:py-6 max-w-[1920px] mx-auto z-40 transition-all duration-500 bg-transparent border-b border-dashed backdrop-blur-sm gap-4 sm:gap-0 ${
      isNoir 
        ? 'border-white/10' 
        : 'border-[#003399]/10'
    }`}>
      <div className="flex justify-between items-center w-full sm:w-auto">
        <div className="flex items-center gap-4">
          <button onClick={onToggleSidebar} className={`p-2 rounded-xl transition-all duration-300 ${isNoir ? 'text-white/70 hover:bg-white/10' : 'text-primary/70 hover:bg-primary/10'}`}>
            <Menu size={24} />
          </button>
          <div className={`text-xl sm:text-2xl font-black italic transition-all duration-500 ${
            isNoir 
              ? 'text-[#FF3B30]' 
              : 'text-[#003399]'
          }`}>
            The Living Journal
          </div>
        </div>
        <div className="flex items-center gap-2 sm:hidden">
          <button 
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className={`p-2 rounded-xl ${isNoir ? 'text-white/70 hover:bg-white/10' : 'text-primary/70 hover:bg-primary/10'}`}
          >
            <Search size={20} />
          </button>
        </div>
      </div>
      
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-8 ${showMobileSearch ? 'flex' : 'hidden sm:flex'}`}>
        <SpotlightCard theme={theme} variant="inset" className="relative group rounded-xl">
          <input
            className={`transition-all duration-300 font-label w-full sm:w-72 px-4 sm:px-6 py-2 sm:py-3 focus:outline-none rounded-xl border-none bg-transparent ${
              isNoir 
                ? 'text-white placeholder:text-white/30' 
                : 'text-primary placeholder:text-primary/40 italic'
            }`}
            placeholder="Search knowledge..."
            type="text"
            onChange={(e) => onSearch(e.target.value)}
          />
          <span className={`material-symbols-outlined absolute right-4 top-2 sm:top-3.5 transition-colors ${
            isNoir ? 'text-[#FF3B30]' : 'text-primary/40'
          }`}>search</span>
        </SpotlightCard>
        
        <div className="flex items-center justify-between sm:justify-start gap-4">
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
