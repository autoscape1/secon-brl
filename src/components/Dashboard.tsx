import React from 'react';
import { motion } from 'motion/react';
import { Entry } from '../types';
import { formatDistanceToNow } from 'date-fns';
import SpotlightCard from './SpotlightCard';
import InputArea from './InputArea';

interface DashboardProps {
  entries: Entry[];
  onSelectEntry: (entry: Entry) => void;
  onViewAllNotes: () => void;
  theme: 'journal' | 'noir';
  onGlobalInput: (text: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ entries, onSelectEntry, onViewAllNotes, theme, onGlobalInput }) => {
  const isNoir = theme === 'noir';
  const tasks = entries.filter(e => e.type === 'task').slice(0, 2);
  const notes = entries.filter(e => e.type === 'note' || e.type === 'request').slice(0, 3);

  const calculateVolume = (entries: Entry[]) => {
    const totalBytes = entries.reduce((acc, entry) => {
      const contentLen = entry.content?.length || 0;
      const titleLen = entry.title?.length || 0;
      // Rough estimate: 2 bytes per character for UTF-16
      return acc + (contentLen + titleLen) * 2;
    }, 0);

    if (totalBytes < 1024) return `${totalBytes} B`;
    if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`;
    return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const stats = [
    { 
      label: 'Tasks Active', 
      value: entries.filter(e => e.type === 'task' && e.status !== 'done').length.toLocaleString(), 
      icon: 'assignment' 
    },
    { 
      label: 'Notes Registered', 
      value: entries.filter(e => e.type === 'note' || e.type === 'request').length.toLocaleString(), 
      icon: 'description' 
    },
    { 
      label: 'Notes base Volume', 
      value: calculateVolume(entries), 
      icon: 'database' 
    },
    { 
      label: 'Current Date', 
      value: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
      icon: 'calendar_today' 
    },
  ];

  return (
    <div className="notebook-margin pt-6 pb-20 max-w-7xl px-8 transition-all duration-500">
      {/* Header Section */}
      <div className="mb-12 relative text-center">
        <h1 className={`font-headline font-black tracking-tight mb-4 transition-all duration-500 text-6xl ${
          isNoir ? 'text-white' : 'text-primary'
        }`}>
          Second Brain Dashboard
        </h1>
        <p className={`font-body text-lg max-w-2xl mx-auto leading-relaxed transition-colors duration-500 ${
          isNoir ? 'text-white/40' : 'text-primary/40'
        }`}>
          Visualizing the intersection of neural nodes and digital architecture.
        </p>
      </div>

      {/* Input Area */}
      <InputArea onSubmit={onGlobalInput} theme={theme} />

      {/* Stats at the Top */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
        {stats.map((stat, i) => (
          <SpotlightCard
            key={i}
            theme={theme}
            variant="flat"
            className={`p-8 transition-all duration-500 flex flex-col items-center justify-center text-center cursor-default rounded-2xl border-none ${
              isNoir 
                ? 'ambient-glow' 
                : 'hover:nm-convex'
            }`}
          >
            <span className={`text-4xl font-black transition-colors duration-500 ${isNoir ? 'text-[#FF3B30]' : 'text-primary'}`}>
              {stat.value}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-widest mt-2 transition-colors duration-500 ${
              isNoir ? 'text-white/40' : 'text-primary/40'
            }`}>
              {stat.label}
            </span>
          </SpotlightCard>
        ))}
      </section>

      {/* Previews Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        {/* Tasks Pipeline Preview */}
        <SpotlightCard 
          theme={theme}
          variant="flat"
          className={`p-10 relative transition-all duration-500 rounded-3xl border-none ${
            isNoir ? 'ambient-glow' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-10">
            <h2 className={`font-headline text-2xl font-bold flex items-center gap-4 transition-colors duration-500 ${
              isNoir ? 'text-white' : 'text-primary'
            }`}>
              <span className={`material-symbols-outlined ${isNoir ? 'text-[#FF3B30]' : 'text-primary/60'}`}>account_tree</span> 
              Tasks Pipeline
            </h2>
            <span className={`text-[10px] px-4 py-1 font-black rounded-full uppercase tracking-tighter transition-all duration-500 nm-flat ${
              isNoir ? 'bg-[#FF3B30] text-white' : 'bg-[#eaea00] text-black'
            }`}>View All</span>
          </div>
          <div className="space-y-6">
            {tasks.length > 0 ? tasks.map((task, i) => (
              <SpotlightCard
                key={task.id}
                theme={theme}
                variant="flat"
                onClick={() => onSelectEntry(task)}
                className={`p-6 transition-all duration-500 cursor-pointer rounded-xl border-none hover:nm-convex ${
                  isNoir 
                    ? 'hover:bg-white/5' 
                    : ''
                }`}
              >
                <p className={`text-base font-medium transition-colors duration-500 ${isNoir ? 'text-white/90' : 'text-primary/90'}`}>
                  {task.title || task.content}
                </p>
                <p className={`text-[10px] mt-2 transition-colors duration-500 ${isNoir ? 'text-white/30' : 'text-primary/40'}`}>
                  {formatDistanceToNow(task.createdAt.toDate())} ago
                </p>
              </SpotlightCard>
            )) : (
              <p className="text-sm text-primary/30 italic">No tasks in pipeline.</p>
            )}
          </div>
        </SpotlightCard>

        {/* Notes Preview */}
        <SpotlightCard 
          theme={theme}
          variant="flat"
          className={`p-10 relative overflow-hidden flex flex-col max-h-[600px] transition-all duration-500 rounded-3xl border-none ${
            isNoir ? 'ambient-glow' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-10">
            <h2 className={`font-headline text-2xl font-bold flex items-center gap-4 transition-colors duration-500 ${
              isNoir ? 'text-white' : 'text-primary'
            }`}>
              <span className={`material-symbols-outlined ${isNoir ? 'text-[#FF3B30]' : 'text-primary/60'}`}>folder_special</span> 
              Your Notes
            </h2>
          </div>
          <div className="space-y-8 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {notes.length > 0 ? (
              <>
                {notes.map((note) => (
                  <SpotlightCard
                    key={note.id}
                    theme={theme}
                    variant="flat"
                    onClick={() => onSelectEntry(note)}
                    className="flex gap-6 group cursor-pointer items-center p-6 rounded-2xl hover:nm-convex transition-all duration-500"
                  >
                    <div className={`w-16 h-16 shrink-0 flex items-center justify-center transition-all duration-500 rounded-xl nm-inset ${
                      isNoir 
                        ? 'text-[#FF3B30]' 
                        : 'text-primary/30'
                    }`}>
                      <span className="material-symbols-outlined">description</span>
                    </div>
                    <div>
                      <h4 className={`text-base font-bold transition-all duration-500 ${
                        isNoir ? 'text-white group-hover:text-[#FF3B30]' : 'text-primary group-hover:text-primary-container'
                      }`}>
                        {note.title || 'Untitled Note'}
                      </h4>
                      <p className={`text-xs italic line-clamp-1 transition-colors duration-500 ${
                        isNoir ? 'text-white/40' : 'text-primary/50'
                       }`}>
                        {note.content}
                      </p>
                    </div>
                  </SpotlightCard>
                ))}
                {entries.filter(e => e.type === 'note' || e.type === 'request').length > 3 && (
                  <button
                    onClick={onViewAllNotes}
                    className={`w-full py-5 mt-6 font-bold text-sm transition-all flex items-center justify-center gap-3 rounded-2xl nm-flat hover:nm-inset ${
                      isNoir 
                        ? 'text-white/40 hover:text-white' 
                        : 'text-primary/40 hover:text-primary/60'
                    }`}
                  >
                    Load More in Notes base
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-primary/30 italic">No notes in vault.</p>
            )}
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
};

export default Dashboard;
