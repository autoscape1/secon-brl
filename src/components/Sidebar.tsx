import React from 'react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  Database, 
  Plus, 
  Settings, 
  Trash2,
  MessageSquare
} from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onNewEntry: () => void;
  theme: 'journal' | 'noir';
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onNewEntry, theme }) => {
  const isNoir = theme === 'noir';
  const navItems = [
    { id: 'archive', label: 'Chats', icon: MessageSquare },
    { id: 'database', label: 'Notes base', icon: Database },
  ];

  return (
    <aside className={cn(
      "h-screen w-64 fixed left-0 top-0 flex flex-col py-8 px-4 z-50 transition-all duration-500",
      isNoir 
        ? "bg-[#121212] border-r border-white/5 nm-flat" 
        : "bg-surface border-r border-[#002068]/10 nm-flat"
    )}>
      <div className={cn(
        "text-xl font-bold mb-12 font-headline px-2 flex items-center gap-2 transition-all duration-500",
        isNoir ? "text-[#FF3B30]" : "text-primary"
      )}>
        <div className={cn(
          "w-2 h-8 rounded-full transition-all duration-500 nm-flat",
          isNoir ? "bg-[#FF3B30] shadow-[0_0_15px_rgba(255,59,48,0.5)]" : "bg-primary"
        )} />
        Second Brain
      </div>
      
      <nav className="flex-1 space-y-4 relative">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <div
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "relative p-4 rounded-xl flex items-center gap-3 cursor-pointer transition-all group z-10",
                isActive 
                  ? (isNoir ? "text-[#FF3B30] font-black nm-inset" : "text-primary font-bold nm-inset") 
                  : (isNoir ? "text-white/40 hover:text-white hover:nm-flat" : "text-primary/60 hover:text-primary hover:nm-flat")
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-sm tracking-tight">{item.label}</span>

              {isActive && (
                <motion.div
                  layoutId="sidebar-lamp"
                  className={cn(
                    "absolute inset-0 rounded-xl -z-10",
                    isNoir ? "bg-white/5" : "bg-primary/5"
                  )}
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  {/* The Lamp Glow Effect (Vertical) */}
                  <div className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full transition-all duration-500",
                    isNoir ? "bg-[#FF3B30]" : "bg-primary"
                  )}>
                    <div className={cn(
                      "absolute w-6 h-12 rounded-full blur-md -left-2 -top-3 transition-all duration-500",
                      isNoir ? "bg-[#FF3B30]/30" : "bg-primary/20"
                    )} />
                    <div className={cn(
                      "absolute w-4 h-8 rounded-full blur-sm -left-1 -top-1 transition-all duration-500",
                      isNoir ? "bg-[#FF3B30]/30" : "bg-primary/20"
                    )} />
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </nav>

      <div className={cn(
        "mt-auto space-y-4 pt-6 border-t border-dashed transition-all duration-500",
        isNoir ? "border-white/10" : "border-primary/10"
      )}>
        <button
          onClick={onNewEntry}
          className={cn(
            "w-full py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 mb-6 group nm-flat",
            isNoir 
              ? "bg-[#FF3B30] text-white shadow-[0_0_20px_rgba(255,59,48,0.2)] hover:shadow-[0_0_30px_rgba(255,59,48,0.4)]" 
              : "bg-primary text-white hover:shadow-lg hover:shadow-primary/20"
          )}
        >
          <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
          New Entry
        </button>
        
        <div className="flex flex-col gap-2">
          <div className={cn(
            "flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all hover:nm-flat",
            isNoir ? "text-white/40 hover:text-white" : "text-primary/60 hover:text-primary"
          )}>
            <Settings size={18} />
            <span className="text-sm font-medium">Settings</span>
          </div>
          <div className={cn(
            "flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all hover:nm-flat",
            isNoir ? "text-white/40 hover:text-white" : "text-primary/60 hover:text-primary"
          )}>
            <Trash2 size={18} />
            <span className="text-sm font-medium">Trash</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
