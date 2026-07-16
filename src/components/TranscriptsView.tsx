import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Entry } from '../types';
import { format } from 'date-fns';
import Markdown from 'react-markdown';
import SpotlightCard from './SpotlightCard';

interface TranscriptsViewProps {
  entries: Entry[];
  theme: 'journal' | 'noir';
  onBack: () => void;
}

const TranscriptsView: React.FC<TranscriptsViewProps> = ({ entries, theme, onBack }) => {
  const isNoir = theme === 'noir';
  const transcripts = entries
    .filter(e => e.type === 'transcript')
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    
  const [selected, setSelected] = useState<Entry | null>(transcripts.length > 0 ? transcripts[0] : null);

  return (
    <div className="notebook-margin pt-6 pb-20 max-w-7xl mx-auto px-8 transition-all duration-500 h-screen flex flex-col">
      <button 
        onClick={onBack}
        className={`mb-6 flex items-center gap-2 text-sm font-bold transition-colors w-fit ${
          isNoir ? 'text-white/50 hover:text-white' : 'text-primary/50 hover:text-primary'
        }`}
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Back to Notes base
      </button>

      <div className="flex flex-1 gap-8 overflow-hidden">
        {/* Left List */}
        <div className="w-1/3 flex flex-col overflow-y-auto custom-scrollbar pr-4 space-y-4">
          <h3 className={`font-headline font-bold text-2xl mb-4 ${isNoir ? 'text-white' : 'text-primary'}`}>
            Raw Inputs
          </h3>
          {transcripts.length === 0 ? (
            <p className={`text-sm italic ${isNoir ? 'text-white/40' : 'text-primary/40'}`}>No inputs recorded yet.</p>
          ) : (
            transcripts.map(t => (
              <SpotlightCard
                key={t.id}
                theme={theme}
                variant="flat"
                onClick={() => setSelected(t)}
                className={`p-4 cursor-pointer transition-all duration-300 rounded-xl border-none ${
                  selected?.id === t.id 
                    ? (isNoir ? 'bg-white/10' : 'nm-inset')
                    : (isNoir ? 'hover:bg-white/5' : 'hover:nm-convex')
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className={`font-bold text-sm line-clamp-1 ${isNoir ? 'text-white' : 'text-primary'}`}>
                    {t.title || 'Input'}
                  </h4>
                </div>
                <span className={`text-[10px] ${isNoir ? 'text-white/40' : 'text-primary/50'}`}>
                  {format(t.createdAt.toDate(), 'MMM d, yyyy - h:mm a')}
                </span>
              </SpotlightCard>
            ))
          )}
        </div>

        {/* Right Detail View */}
        <div className={`w-2/3 flex flex-col overflow-y-auto custom-scrollbar p-8 rounded-3xl transition-all duration-500 ${
          isNoir ? 'bg-white/5 ambient-glow' : 'nm-flat'
        }`}>
          {selected ? (
            <div className="space-y-8">
              <div className="border-b pb-6 border-primary/10">
                <span className={`text-[10px] font-bold uppercase tracking-widest mb-2 block ${
                  isNoir ? 'text-[#FF3B30]' : 'text-primary/40'
                }`}>
                  {format(selected.createdAt.toDate(), 'MMMM d, yyyy - h:mm a')}
                </span>
                <h2 className={`text-3xl font-headline font-black ${isNoir ? 'text-white' : 'text-primary'}`}>
                  {selected.title || 'Raw Input'}
                </h2>
              </div>

              <div>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${isNoir ? 'text-white/40' : 'text-primary/40'}`}>
                  AI Summary
                </h3>
                <div className={`markdown-body prose prose-sm max-w-none ${isNoir ? 'prose-invert' : ''}`}>
                  <Markdown>{selected.summary || 'No summary available.'}</Markdown>
                </div>
              </div>

              <div className="pt-6 border-t border-primary/10">
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${isNoir ? 'text-white/40' : 'text-primary/40'}`}>
                  Raw Transcription
                </h3>
                <div className={`p-6 rounded-2xl font-mono text-sm leading-relaxed whitespace-pre-wrap ${
                  isNoir ? 'bg-black/20 text-white/70' : 'bg-primary/5 text-primary/80'
                }`}>
                  {selected.content}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className={`italic ${isNoir ? 'text-white/30' : 'text-primary/30'}`}>
                Select an input to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranscriptsView;
