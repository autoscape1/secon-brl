import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, googleProvider, signInWithPopup, onAuthStateChanged, db, collection, query, where, orderBy, onSnapshot, User, testConnection, handleFirestoreError, OperationType, updateDoc, doc, Timestamp, deleteDoc } from './firebase';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Archive from './components/Archive';
import TranscriptsView from './components/TranscriptsView';
import InputArea from './components/InputArea';
import ErrorBoundary from './components/ErrorBoundary';
import SpotlightCard from './components/SpotlightCard';
import { Entry } from './types';
import { Loader2 } from 'lucide-react';
import { defaultVoiceInstructions } from './services/gemini';

export default function App() {
  const [user, setUser] = useState<User | null>({ uid: 'local-user' });
  const [isAuthReady, setIsAuthReady] = useState(true);
  const [activeTab, setActiveTab] = useState('archive');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [theme, setTheme] = useState<'journal' | 'noir'>('noir');
  const [incomingMessage, setIncomingMessage] = useState<string | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [voiceInstructions, setVoiceInstructions] = useState(defaultVoiceInstructions);

  useEffect(() => {
    if (user) {
      const savedInstructions = localStorage.getItem(`voiceInstructions_${user.uid}`);
      if (savedInstructions) {
        setVoiceInstructions(savedInstructions);
      }
    }
  }, [user]);

  const handleSaveSettings = () => {
    if (user) {
      localStorage.setItem(`voiceInstructions_${user.uid}`, voiceInstructions);
    }
    setShowSettings(false);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'journal' ? 'noir' : 'journal');
  };

  const handleGlobalInput = (text: string) => {
    setIncomingMessage(text);
    setActiveTab('archive');
  };

  const startEditing = () => {
    if (selectedEntry) {
      setEditTitle(selectedEntry.title || '');
      setEditContent(selectedEntry.content);
      setIsEditing(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;
    try {
      await deleteDoc(doc(db, 'entries', selectedEntry.id));
      setSelectedEntry(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `entries/${selectedEntry.id}`);
    }
  };

  useEffect(() => {
    setShowDeleteConfirm(false);
  }, [selectedEntry]);

  const handleSave = async () => {
    if (!selectedEntry || !auth.currentUser) return;
    setIsSaving(true);
    try {
      const entryRef = doc(db, 'entries', selectedEntry.id);
      await updateDoc(entryRef, {
        title: editTitle,
        content: editContent,
        updatedAt: Timestamp.now()
      });
      setIsEditing(false);
      // The onSnapshot listener will update the entries list automatically
      // We also update the selectedEntry locally to reflect changes in the modal
      setSelectedEntry({
        ...selectedEntry,
        title: editTitle,
        content: editContent
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `entries/${selectedEntry.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isAuthReady) return;

    const q = query(
      collection(db, 'entries'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entry));
      setEntries(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'entries');
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const filteredEntries = entries.filter(e => 
    e.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={`${theme === 'noir' ? 'theme-noir' : ''} bg-surface font-body text-on-surface selection:bg-secondary-container/50 overflow-x-hidden min-h-screen transition-colors duration-500`}>
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onNewEntry={() => {
            setActiveTab('archive');
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          }} 
          theme={theme}
        />
        
        <main className="ml-64 min-h-screen paper-texture relative">
          <Header onSearch={setSearchQuery} theme={theme} onToggleTheme={toggleTheme} onOpenSettings={() => setShowSettings(true)} />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'database' && (
                <div className="notebook-margin pt-12 px-12 pb-20 transition-all duration-500 flex flex-col min-h-screen">
                  <h2 className={`text-5xl font-headline font-black mb-12 transition-colors duration-500 ${
                    theme === 'noir' ? 'text-white' : 'text-primary'
                  }`}>
                    Notes base
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 flex-1">
                    {filteredEntries.filter(e => e.type === 'note').map(entry => (
                      <SpotlightCard 
                        key={entry.id} 
                        theme={theme}
                        variant="flat"
                        as={motion.div}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setSelectedEntry(entry)}
                        className={`p-8 transition-all duration-500 cursor-pointer flex flex-col h-64 rounded-2xl border-none ${
                          theme === 'noir' 
                            ? 'ambient-glow hover:bg-white/5' 
                            : 'hover:nm-convex'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-6">
                          <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-500 ${
                            theme === 'noir' ? 'text-[#FF3B30]' : 'text-primary/40'
                          }`}>Note</span>
                          <span className={`text-[10px] transition-colors duration-500 ${
                            theme === 'noir' ? 'text-white/30' : 'text-primary/40'
                          }`}>{entry.createdAt.toDate().toLocaleDateString()}</span>
                        </div>
                        <h4 className={`font-bold text-lg mb-4 line-clamp-1 transition-colors duration-500 ${
                          theme === 'noir' ? 'text-white' : 'text-primary'
                        }`}>{entry.title || 'Untitled'}</h4>
                        <p className={`text-sm line-clamp-4 mb-8 flex-1 transition-colors duration-500 ${
                          theme === 'noir' ? 'text-white/50' : 'text-primary/70'
                        }`}>{entry.content}</p>
                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {entry.tags.slice(0, 3).map(tag => (
                              <span key={tag} className={`text-[9px] px-2 py-0.5 rounded transition-all duration-500 nm-inset ${
                                theme === 'noir' ? 'text-white/40' : 'text-primary/50'
                              }`}>#{tag}</span>
                            ))}
                          </div>
                        )}
                      </SpotlightCard>
                    ))}
                  </div>
                  
                  <div className="mt-16 text-center">
                    <button 
                      onClick={() => setActiveTab('transcripts')}
                      className={`inline-flex items-center gap-2 text-sm font-bold transition-colors ${
                        theme === 'noir' ? 'text-white/50 hover:text-white' : 'text-primary/50 hover:text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined">history</span>
                      View all raw inputs and transcripts
                    </button>
                  </div>
                </div>
              )}
              {activeTab === 'transcripts' && (
                <TranscriptsView 
                  entries={filteredEntries} 
                  theme={theme} 
                  onBack={() => setActiveTab('database')} 
                />
              )}
              {activeTab === 'archive' && (
                <Archive 
                  entries={filteredEntries} 
                  theme={theme} 
                  incomingMessage={incomingMessage}
                  clearIncomingMessage={() => setIncomingMessage(null)}
                  voiceInstructions={voiceInstructions}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Overlay Paper Texture */}
          {theme === 'journal' && (
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] z-50"></div>
          )}
        </main>

        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
              <SpotlightCard
                theme={theme}
                as={motion.div}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`p-8 max-w-2xl w-full shadow-2xl rounded-2xl relative overflow-hidden transition-all duration-500 ${
                  theme === 'noir' 
                    ? 'liquid-glass ambient-glow' 
                    : 'bg-white border border-primary/10'
                }`}
              >
                <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                  <button 
                    onClick={() => setShowSettings(false)}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      theme === 'noir' ? 'text-white/40 hover:text-white hover:bg-white/10' : 'hover:bg-surface-container-low text-primary/40'
                    }`}
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="mb-6">
                  <h2 className={`text-3xl font-headline font-black mt-4 transition-all duration-500 ${
                    theme === 'noir' ? 'text-white' : 'text-primary'
                  }`}>
                    Settings
                  </h2>
                </div>

                <div className="mb-8">
                  <label className={`block text-sm font-bold mb-2 ${theme === 'noir' ? 'text-white/70' : 'text-primary/80'}`}>
                    Voice & Persona Instructions
                  </label>
                  <p className={`text-xs mb-4 italic ${theme === 'noir' ? 'text-white/40' : 'text-primary/50'}`}>
                    Customize how the AI speaks and formats its text for text-to-speech narration.
                  </p>
                  <textarea
                    value={voiceInstructions}
                    onChange={(e) => setVoiceInstructions(e.target.value)}
                    className={`w-full min-h-[200px] whitespace-pre-wrap leading-relaxed p-4 rounded-xl border-none outline-none resize-none font-label italic text-lg transition-all duration-500 ${
                      theme === 'noir' ? 'bg-white/5 text-white/80 focus:ring-1 focus:ring-[#FF3B30]/30' : 'bg-primary/5 text-primary/80 focus:ring-1 focus:ring-primary/20'
                    }`}
                    placeholder="Enter voice instructions..."
                  />
                </div>

                <div className="flex items-center justify-end">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowSettings(false)}
                      className={`px-4 py-2 text-sm font-bold transition-all duration-300 ${
                        theme === 'noir' ? 'text-white/40 hover:text-white' : 'text-primary/40 hover:text-primary'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveSettings}
                      className={`px-6 py-2 rounded-full text-sm font-bold shadow-lg transition-all duration-300 flex items-center gap-2 ${
                        theme === 'noir' ? 'bg-[#FF3B30] text-white hover:scale-105 ambient-glow' : 'bg-primary text-white hover:bg-primary/90'
                      }`}
                    >
                      Save Settings
                    </button>
                  </div>
                </div>
              </SpotlightCard>
            </div>
          )}
        </AnimatePresence>

        {/* Entry Detail Modal */}
        <AnimatePresence>
          {selectedEntry && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
              <SpotlightCard
                theme={theme}
                as={motion.div}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`p-8 max-w-2xl w-full shadow-2xl rounded-2xl relative overflow-hidden transition-all duration-500 ${
                  theme === 'noir' 
                    ? 'liquid-glass ambient-glow' 
                    : 'bg-white border border-primary/10'
                }`}
              >
                {/* Header Buttons */}
                <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                  {!isEditing && (
                    <>
                      {showDeleteConfirm ? (
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full mr-2 ${theme === 'noir' ? 'bg-[#FF3B30]/20' : 'bg-red-100'}`}>
                          <span className={`text-xs font-bold ${theme === 'noir' ? 'text-[#FF3B30]' : 'text-red-600'}`}>Delete?</span>
                          <button onClick={handleDelete} className={`p-1 rounded-full transition-colors ${theme === 'noir' ? 'text-[#FF3B30] hover:bg-white/20' : 'text-red-600 hover:bg-white/50'}`}>
                            <span className="material-symbols-outlined text-sm">check</span>
                          </button>
                          <button onClick={() => setShowDeleteConfirm(false)} className={`p-1 rounded-full transition-colors ${theme === 'noir' ? 'text-white/60 hover:bg-white/20' : 'text-primary/60 hover:bg-white/50'}`}>
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setShowDeleteConfirm(true)}
                          className={`p-2 rounded-full transition-all duration-300 ${
                            theme === 'noir' ? 'text-white/40 hover:text-[#FF3B30] hover:bg-white/10' : 'hover:bg-red-50 text-primary/40 hover:text-red-500'
                          }`}
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      )}
                      <button 
                        onClick={startEditing}
                        className={`p-2 rounded-full transition-all duration-300 ${
                          theme === 'noir' ? 'text-white/40 hover:text-white hover:bg-white/10' : 'hover:bg-surface-container-low text-primary/40'
                        }`}
                      >
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => {
                      setSelectedEntry(null);
                      setIsEditing(false);
                    }}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      theme === 'noir' ? 'text-white/40 hover:text-white hover:bg-white/10' : 'hover:bg-surface-container-low text-primary/40'
                    }`}
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="mb-6">
                  <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-widest transition-all duration-500 ${
                    theme === 'noir' ? 'bg-[#FF3B30] text-white' : 'bg-secondary-container text-primary'
                  }`}>
                    {selectedEntry.type}
                  </span>
                  
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className={`w-full text-3xl font-headline font-black mt-4 bg-transparent border-b outline-none pb-2 transition-all duration-500 ${
                        theme === 'noir' ? 'text-white border-white/10 focus:border-[#FF3B30]' : 'text-primary border-primary/10 focus:border-primary/30'
                      }`}
                      placeholder="Title"
                    />
                  ) : (
                    <h2 className={`text-3xl font-headline font-black mt-4 transition-all duration-500 ${
                      theme === 'noir' ? 'text-white' : 'text-primary'
                    }`}>
                      {selectedEntry.title || 'Untitled Entry'}
                    </h2>
                  )}
                  
                  <p className={`text-[10px] mt-2 font-mono transition-colors duration-500 ${
                    theme === 'noir' ? 'text-white/30' : 'text-primary/40'
                  }`}>
                    Captured: {selectedEntry.createdAt.toDate().toLocaleString()}
                  </p>
                </div>

                <div className="mb-8">
                  {isEditing ? (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className={`w-full min-h-[200px] whitespace-pre-wrap leading-relaxed p-4 rounded-xl border-none outline-none resize-none font-label italic text-lg transition-all duration-500 ${
                        theme === 'noir' ? 'bg-white/5 text-white/80 focus:ring-1 focus:ring-[#FF3B30]/30' : 'bg-primary/5 text-primary/80 focus:ring-1 focus:ring-primary/20'
                      }`}
                      placeholder="Content..."
                    />
                  ) : (
                    <p className={`whitespace-pre-wrap leading-relaxed font-label italic text-lg transition-colors duration-500 ${
                      theme === 'noir' ? 'text-white/70' : 'text-primary/80'
                    }`}>
                      {selectedEntry.content}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {selectedEntry.tags && selectedEntry.tags.map(tag => (
                      <span key={tag} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all duration-500 ${
                        theme === 'noir' ? 'bg-white/10 text-white/50' : 'bg-primary/5 text-primary/60'
                      }`}>
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {isEditing && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setIsEditing(false)}
                        className={`px-4 py-2 text-sm font-bold transition-all duration-300 ${
                          theme === 'noir' ? 'text-white/40 hover:text-white' : 'text-primary/40 hover:text-primary'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`px-6 py-2 rounded-full text-sm font-bold shadow-lg transition-all duration-300 flex items-center gap-2 ${
                          theme === 'noir' ? 'bg-[#FF3B30] text-white hover:scale-105 ambient-glow' : 'bg-primary text-white hover:bg-primary/90'
                        }`}
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </div>
              </SpotlightCard>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
