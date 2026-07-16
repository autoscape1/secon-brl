import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Entry, Message } from '../types';
import { db, auth, collection, addDoc, setDoc, updateDoc, deleteDoc, doc, Timestamp, handleFirestoreError, OperationType } from '../firebase';
import { chatWithGemini } from '../services/gemini';
import SpotlightCard from './SpotlightCard';
import InputArea from './InputArea';
import { Loader2, MessageSquare, Volume2, VolumeX, Play, Square, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ArchiveProps {
  entries: Entry[];
  theme: 'journal' | 'noir';
  incomingMessage?: string | null;
  clearIncomingMessage?: () => void;
  voiceInstructions?: string;
}

const Archive: React.FC<ArchiveProps> = ({ entries, theme, incomingMessage, clearIncomingMessage, voiceInstructions }) => {
  const isNoir = theme === 'noir';
  const chats = entries.filter(e => e.type === 'chat').sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
  
  const [activeChat, setActiveChat] = useState<Entry | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const processedMessageRef = useRef<string | null>(null);

  const [autoRead, setAutoRead] = useState(false);
  const autoReadRef = useRef(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    autoReadRef.current = autoRead;
  }, [autoRead]);

  useEffect(() => {
    if (incomingMessage) {
      if (incomingMessage !== processedMessageRef.current) {
        processedMessageRef.current = incomingMessage;
        handleStartChat(incomingMessage);
        if (clearIncomingMessage) clearIncomingMessage();
      }
    } else {
      processedMessageRef.current = null;
    }
  }, [incomingMessage]);
  
  const stopAudio = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
      } catch (e) {}
      audioSourceRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
    setPlayingAudioId(null);
  };

  function createWavBlob(base64Audio: string, sampleRate = 24000) {
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + len, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, len, true);
    
    return new Blob([wavHeader, bytes], { type: 'audio/wav' });
  }

  const handleDownload = async (msg: Message, msgIndex: number) => {
    if (!activeChat) return;
    setLoadingAudioId(`dl-${msgIndex}`);
    try {
      let base64Audio = msg.audioBase64;
      if (!base64Audio) {
        base64Audio = await import('../services/gemini').then(m => m.generateAudio(msg.content)) || undefined;
        if (base64Audio) {
          const updatedMessages = [...activeChat.messages || []];
          updatedMessages[msgIndex] = { ...msg, audioBase64: base64Audio };
          await updateDoc(doc(db, 'entries', activeChat.id), {
            messages: updatedMessages,
            updatedAt: Timestamp.now()
          });
        }
      }

      // Download text
      const textBlob = new Blob([msg.content], { type: 'text/plain' });
      const textUrl = URL.createObjectURL(textBlob);
      const textA = document.createElement('a');
      textA.href = textUrl;
      textA.download = `response_${msgIndex}.txt`;
      textA.click();
      URL.revokeObjectURL(textUrl);

      // Download audio if available
      if (base64Audio) {
        const audioBlob = createWavBlob(base64Audio);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audioA = document.createElement('a');
        audioA.href = audioUrl;
        audioA.download = `response_${msgIndex}.wav`;
        audioA.click();
        URL.revokeObjectURL(audioUrl);
      }
    } catch (e) {
      console.error("Failed to download", e);
    } finally {
      setLoadingAudioId(null);
    }
  };

  const playAudio = async (msg: Message, msgIndex: number) => {
    const msgId = `${activeChat?.id}-${msgIndex}`;
    if (playingAudioId === msgId) {
      stopAudio();
      return;
    }

    stopAudio();
    setLoadingAudioId(msgId);

    try {
      let base64Audio = msg.audioBase64;
      
      if (!base64Audio) {
        base64Audio = await import('../services/gemini').then(m => m.generateAudio(msg.content)) || undefined;
        if (base64Audio && activeChat) {
          const updatedMessages = [...activeChat.messages || []];
          updatedMessages[msgIndex] = { ...msg, audioBase64: base64Audio };
          await updateDoc(doc(db, 'entries', activeChat.id), {
            messages: updatedMessages,
            updatedAt: Timestamp.now()
          });
        }
      }

      if (base64Audio) {
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const buffer = new Int16Array(bytes.buffer);
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = audioCtx;
        
        const audioBuffer = audioCtx.createBuffer(1, buffer.length, 24000);
        const channelData = audioBuffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
          channelData[i] = buffer[i] / 32768.0;
        }
        
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.onended = () => {
          setPlayingAudioId(null);
          audioSourceRef.current = null;
        };
        
        audioSourceRef.current = source;
        source.start();
        setPlayingAudioId(msgId);
      }
    } catch (error) {
      console.error("Failed to play audio", error);
    } finally {
      setLoadingAudioId(null);
    }
  };

  const processAIResponse = async (chatId: string, history: Message[], newMessage: string) => {
    try {
      const historyForGemini = history.map(m => ({ role: m.role, content: m.content }));
      const response = await chatWithGemini(historyForGemini, newMessage, entries, voiceInstructions);
      
      const modelMessage: Message = {
        role: 'model',
        content: response.reply,
        timestamp: Timestamp.now(),
        ...(response.action ? { metadata: response.action } : {})
      };

      const updatedMessages = [...history, modelMessage];
      let finalAudioBase64: string | null = null;
      
      if (autoReadRef.current) {
        finalAudioBase64 = await import('../services/gemini').then(m => m.generateAudio(response.reply));
        if (finalAudioBase64) {
          updatedMessages[updatedMessages.length - 1].audioBase64 = finalAudioBase64;
        }
      }

      if (response.action && response.action.type !== 'none' && auth.currentUser) {
        const entryData: any = {
          userId: auth.currentUser.uid,
          type: response.action.type,
          content: response.action.content || '',
          title: response.action.title || '',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        if (response.action.type === 'task') {
          entryData.status = 'pending';
        }
        await addDoc(collection(db, 'entries'), entryData);
        
        updatedMessages.push({
          role: 'system',
          content: `I've created a ${response.action.type} for you: "${response.action.title}"`,
          timestamp: Timestamp.now()
        });
      }

      await updateDoc(doc(db, 'entries', chatId), {
        messages: updatedMessages,
        updatedAt: Timestamp.now()
      });

      if (autoReadRef.current && finalAudioBase64) {
        const msgId = `${chatId}-${updatedMessages.length - 1}`;
        // Temporarily assign it so playAudio can use it since state hasn't updated yet in the effect
        playAudio({ ...modelMessage, audioBase64: finalAudioBase64 }, updatedMessages.length - 1);
      }

    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `entries/${chatId}`);
    }
  };

  const saveTranscript = async (text: string) => {
    if (!auth.currentUser) return;
    try {
      const { title, summary } = await import('../services/gemini').then(m => m.generateTranscriptSummary(text));
      await addDoc(collection(db, 'entries'), {
        userId: auth.currentUser.uid,
        type: 'transcript',
        content: text,
        title: title,
        summary: summary,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Failed to save transcript", error);
    }
  };

  const handleStartChat = async (text: string) => {
    if (!text.trim() || isProcessing || !auth.currentUser) return;
    setIsProcessing(true);
    
    // Save raw input as transcript in background
    saveTranscript(text);
    
    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: Timestamp.now()
    };

    try {
      const chatData: any = {
        userId: auth.currentUser.uid,
        type: 'chat',
        content: text,
        title: text.slice(0, 40) + (text.length > 40 ? '...' : ''),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        messages: [userMessage]
      };

      const newDocRef = doc(db, 'entries');
      const newChat = { id: newDocRef.id, ...chatData } as Entry;
      
      // Set active chat immediately for instant UI feedback
      setActiveChat(newChat);

      await setDoc(newDocRef, chatData);

      await processAIResponse(newDocRef.id, [userMessage], text);

    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'entries');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isProcessing || !activeChat || !auth.currentUser) return;
    setIsProcessing(true);

    // Save raw input as transcript in background
    saveTranscript(text);

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: Timestamp.now()
    };

    const updatedMessages = [...(activeChat.messages || []), userMessage];
    
    try {
      await updateDoc(doc(db, 'entries', activeChat.id), {
        messages: updatedMessages,
        updatedAt: Timestamp.now()
      });

      await processAIResponse(activeChat.id, updatedMessages, text);

    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `entries/${activeChat.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteChat = async () => {
    if (!activeChat) return;
    try {
      await deleteDoc(doc(db, 'entries', activeChat.id));
      setActiveChat(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `entries/${activeChat.id}`);
    }
  };

  useEffect(() => {
    if (activeChat) {
      const updated = entries.find(e => e.id === activeChat.id);
      if (updated) setActiveChat(updated);
    }
  }, [entries, activeChat?.id]);

  if (activeChat) {
    return (
      <div className="notebook-margin pt-4 sm:pt-6 pb-20 max-w-5xl mx-auto px-4 sm:px-8 transition-all duration-500 h-screen flex flex-col">
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4 sm:gap-0 mb-6">
          <button 
            onClick={() => {
              stopAudio();
              setActiveChat(null);
            }}
            className={`sm:absolute sm:left-0 flex items-center self-start gap-2 text-sm font-bold transition-colors ${
              isNoir ? 'text-white/50 hover:text-white' : 'text-primary/50 hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Archive
          </button>
          
          <div className="flex items-center gap-3">
            <h3 className={`text-xl font-bold truncate max-w-md ${isNoir ? 'text-white' : 'text-primary'}`}>
              {activeChat.title}
            </h3>
            
            <button
              onClick={() => setAutoRead(!autoRead)}
              className={`p-2 rounded-full transition-all duration-300 ${
                autoRead 
                  ? (isNoir ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary')
                  : (isNoir ? 'text-white/40 hover:bg-white/10' : 'text-primary/40 hover:bg-primary/10')
              }`}
              title={autoRead ? "Auto-read enabled" : "Auto-read disabled"}
            >
              {autoRead ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            {showDeleteConfirm ? (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${isNoir ? 'bg-[#FF3B30]/20' : 'bg-red-100'}`}>
                <span className={`text-xs font-bold ${isNoir ? 'text-[#FF3B30]' : 'text-red-600'}`}>Delete?</span>
                <button onClick={handleDeleteChat} className={`p-1 rounded-full transition-colors ${isNoir ? 'text-[#FF3B30] hover:bg-white/20' : 'text-red-600 hover:bg-white/50'}`}>
                  <span className="material-symbols-outlined text-sm">check</span>
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} className={`p-1 rounded-full transition-colors ${isNoir ? 'text-white/60 hover:bg-white/20' : 'text-primary/60 hover:bg-white/50'}`}>
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className={`p-2 rounded-full transition-all duration-300 ${
                  isNoir ? 'text-white/40 hover:text-[#FF3B30] hover:bg-white/10' : 'hover:bg-red-50 text-primary/40 hover:text-red-500'
                }`}
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6 mb-6">
          {activeChat.messages?.map((msg, idx) => {
            const msgId = `${activeChat.id}-${idx}`;
            const isPlaying = playingAudioId === msgId;
            const isLoading = loadingAudioId === msgId;

            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}
              >
                {msg.role === 'system' ? (
                  <div className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide ${
                    isNoir ? 'bg-white/5 text-white/40' : 'bg-primary/5 text-primary/40'
                  }`}>
                    {msg.content}
                  </div>
                ) : (
                  <div className={`max-w-[80%] p-4 rounded-2xl relative group ${
                    msg.role === 'user' 
                      ? (isNoir ? 'bg-[#FF3B30] text-white nm-flat' : 'bg-primary text-white nm-flat')
                      : (isNoir ? 'bg-white/10 text-white nm-inset' : 'bg-surface-container-low text-primary nm-inset')
                  }`}>
                    <p className="whitespace-pre-wrap font-body leading-relaxed">{msg.content}</p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-[10px] opacity-50`}>
                        {msg.timestamp?.toDate ? formatDistanceToNow(msg.timestamp.toDate()) : 'just now'} ago
                      </span>
                      
                      {msg.role === 'model' && (
                        <div className={`flex items-center gap-1 opacity-100 transition-all duration-300`}>
                          <button
                            onClick={() => handleDownload(msg, idx)}
                            disabled={loadingAudioId === `dl-${idx}`}
                            className={`p-1.5 rounded-full transition-all duration-300 ${
                              isNoir 
                                ? 'bg-white/10 hover:bg-white/20 text-white' 
                                : 'bg-primary/10 hover:bg-primary/20 text-primary'
                            }`}
                            title="Download text & audio"
                          >
                            {loadingAudioId === `dl-${idx}` ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Download size={14} />
                            )}
                          </button>
                          
                          <button
                            onClick={() => playAudio(msg, idx)}
                            disabled={isLoading}
                            className={`p-1.5 rounded-full transition-all duration-300 ${
                              isNoir 
                                ? 'bg-white/10 hover:bg-white/20 text-white' 
                                : 'bg-primary/10 hover:bg-primary/20 text-primary'
                            }`}
                          >
                            {isLoading ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : isPlaying ? (
                              <Square size={14} className="fill-current" />
                            ) : (
                              <Play size={14} className="fill-current ml-0.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
          {isProcessing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className={`p-4 rounded-2xl flex items-center gap-3 ${
                isNoir ? 'bg-white/5 text-white/50' : 'bg-surface-container-lowest text-primary/50'
              }`}>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm italic">Model is thinking...</span>
              </div>
            </motion.div>
          )}
        </div>

        <InputArea 
          onSubmit={handleSendMessage} 
          theme={theme} 
          isProcessing={isProcessing} 
          placeholder="Reply to conversation..." 
          className="shrink-0 w-full" 
        />
      </div>
    );
  }

  return (
    <div className="notebook-margin pt-6 pb-20 max-w-7xl px-4 sm:px-8 transition-all duration-500">
      <header className="mb-8 sm:mb-16">
        <h2 className={`text-4xl sm:text-6xl font-headline font-black tracking-tight transition-all duration-500 mb-4 ${
          isNoir ? 'text-white' : 'text-primary italic'
        }`}>
          Archive & Chats
        </h2>
        <p className={`font-body text-lg max-w-2xl leading-relaxed transition-colors duration-500 ${
          isNoir ? 'text-white/40' : 'text-primary/40'
        }`}>
          Past conversations and archived neural nodes.
        </p>
      </header>

      <InputArea 
        onSubmit={handleStartChat} 
        theme={theme} 
        isProcessing={isProcessing} 
        placeholder="Start a new chat..." 
        className="mb-16 w-full" 
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {chats.map(chat => (
          <SpotlightCard 
            key={chat.id} 
            theme={theme}
            variant="flat"
            as={motion.div}
            whileHover={{ scale: 1.02 }}
            onClick={() => setActiveChat(chat)}
            className={`p-8 transition-all duration-500 cursor-pointer flex flex-col h-64 rounded-2xl border-none ${
              isNoir ? 'ambient-glow hover:bg-white/5' : 'hover:nm-convex'
            }`}
          >
            <div className="flex justify-between items-start mb-6">
              <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-500 flex items-center gap-2 ${
                isNoir ? 'text-[#FF3B30]' : 'text-primary/40'
              }`}>
                <MessageSquare size={12} /> Chat
              </span>
              <span className={`text-[10px] transition-colors duration-500 ${
                isNoir ? 'text-white/30' : 'text-primary/40'
              }`}>{chat.createdAt.toDate().toLocaleDateString()}</span>
            </div>
            <h4 className={`font-bold text-lg mb-4 line-clamp-2 transition-colors duration-500 ${
              isNoir ? 'text-white' : 'text-primary'
            }`}>{chat.title || 'Conversation'}</h4>
            <p className={`text-sm line-clamp-3 mb-8 flex-1 transition-colors duration-500 ${
              isNoir ? 'text-white/50' : 'text-primary/70'
            }`}>{chat.content}</p>
            <div className={`text-[10px] font-bold transition-colors duration-500 ${
              isNoir ? 'text-white/30' : 'text-primary/40'
            }`}>
              {chat.messages?.length || 0} messages
            </div>
          </SpotlightCard>
        ))}
      </div>
    </div>
  );
};

export default Archive;
