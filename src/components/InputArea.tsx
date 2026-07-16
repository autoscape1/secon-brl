import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Mic, Send } from 'lucide-react';
import SpotlightCard from './SpotlightCard';

interface InputAreaProps {
  onSubmit: (text: string) => void;
  theme: 'journal' | 'noir';
  isProcessing?: boolean;
  placeholder?: string;
  className?: string;
}

const InputArea: React.FC<InputAreaProps> = ({ 
  onSubmit, 
  theme, 
  isProcessing = false,
  placeholder = "Type a thought, a link, or a prompt...",
  className = "max-w-5xl mx-auto mt-12 px-4 relative pb-12"
}) => {
  const isNoir = theme === 'noir';
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleSubmit = () => {
    if (!input.trim() || isProcessing) return;
    onSubmit(input);
    setInput('');
    setInterimText('');
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
  };

  const handleMicClick = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        stream.getTracks().forEach(track => track.stop());
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          setInterimText('Transcribing audio (English & Portuguese)...');
          
          try {
            const { transcribeAudio } = await import('../services/gemini');
            const transcription = await transcribeAudio(base64data, audioBlob.type);
            if (transcription) {
              setInput(prev => prev + (prev ? ' ' : '') + transcription.trim());
            }
          } catch (e) {
            console.error("Transcription failed", e);
          } finally {
            setInterimText('');
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setInterimText('Listening... (Click mic again to stop)');
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone.");
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input, interimText]);

  return (
    <section className={className}>
      <div className="relative group">
        <SpotlightCard 
          theme={theme}
          variant="flat"
          className={`relative flex flex-col transition-all duration-500 rounded-2xl border-none ${
            isNoir 
              ? 'ambient-glow' 
              : 'hover:nm-convex'
          }`}
        >
          <div className="flex items-center w-full">
            <textarea
              ref={textareaRef}
              className={`w-full py-8 px-10 bg-transparent border-none focus:ring-0 text-xl font-label placeholder:text-primary/20 resize-none overflow-hidden transition-all duration-500 ${
                isNoir ? 'text-white italic placeholder:text-white/20' : 'italic text-primary'
              }`}
              placeholder={placeholder}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              disabled={isProcessing}
            />
            <div className="flex items-center gap-4 pr-8 shrink-0">
              <button 
                onClick={handleMicClick}
                className={`p-4 transition-all duration-300 rounded-full nm-flat ${
                  isRecording 
                    ? 'text-[#FF3B30] nm-inset animate-pulse' 
                    : (isNoir ? 'text-white/30 hover:text-white hover:nm-inset' : 'text-primary/40 hover:text-primary hover:nm-inset')
                }`}
              >
                <Mic className="w-6 h-6" />
              </button>
              <button
                onClick={handleSubmit}
                disabled={isProcessing || !input.trim()}
                className={`p-4 transition-all duration-300 rounded-full disabled:opacity-30 nm-flat ${
                  isNoir ? 'text-[#FF3B30] hover:text-white hover:nm-inset' : 'text-primary/80 hover:text-primary-container hover:nm-inset'
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <Send className="w-8 h-8" />
                )}
              </button>
            </div>
          </div>
          {interimText && (
            <div className={`px-10 pb-6 text-lg italic flex items-center gap-3 ${isNoir ? 'text-white/50' : 'text-primary/50'}`}>
              {interimText.includes('Transcribing') && <Loader2 className="w-4 h-4 animate-spin" />}
              {interimText}
            </div>
          )}
        </SpotlightCard>
      </div>
      {className.includes('pb-12') && (
        <p className={`text-center mt-6 font-label text-xs italic tracking-wide transition-colors duration-500 ${
          isNoir ? 'text-white/20' : 'text-primary/30'
        }`}>
          Capturing nodes to the vault in real-time...
        </p>
      )}
    </section>
  );
};

export default InputArea;
