import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Search, X, Volume2, Sparkles, AlertCircle } from 'lucide-react';

interface VoiceSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  lang?: 'th' | 'en';
  isListeningExternal?: boolean;
  onListeningChange?: (isListening: boolean) => void;
  placeholder?: string;
}

export const VoiceSearch: React.FC<VoiceSearchProps> = ({
  searchQuery,
  onSearchChange,
  lang = 'th',
  isListeningExternal,
  onListeningChange,
  placeholder,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = lang === 'th' ? 'th-TH' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        onListeningChange?.(true);
        setErrorMessage(null);
        setTranscript('');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i][0];
          currentTranscript += item.transcript;
        }

        setTranscript(currentTranscript);
        onSearchChange(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage(
            lang === 'th'
              ? 'กรุณาอนุญาตสิทธิ์การใช้ไมโครโฟนในเบราว์เซอร์'
              : 'Microphone permission denied'
          );
        } else if (event.error === 'no-speech') {
          setErrorMessage(
            lang === 'th'
              ? 'ไม่พบเสียงพูด ลองพูดใหม่อีกครั้ง'
              : 'No speech detected, please try again'
          );
        } else {
          setErrorMessage(
            lang === 'th' ? 'เกิดข้อผิดพลาดในการฟังเสียง' : 'Speech recognition error'
          );
        }
        setIsListening(false);
        onListeningChange?.(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        onListeningChange?.(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.error('Speech recognition init error:', e);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [lang]);

  // Sync external listening trigger (e.g. from Remote Voice button)
  useEffect(() => {
    if (isListeningExternal !== undefined && isListeningExternal !== isListening) {
      if (isListeningExternal) {
        startListening();
      } else {
        stopListening();
      }
    }
  }, [isListeningExternal]);

  const startListening = () => {
    if (!isSupported) {
      setErrorMessage(
        lang === 'th'
          ? 'เบราว์เซอร์ของคุณยังไม่รองรับ Web Speech API'
          : 'Web Speech API is not supported in this browser'
      );
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = lang === 'th' ? 'th-TH' : 'en-US';
        recognitionRef.current.start();
      } catch (e) {
        // Recognition might already be running
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
    onListeningChange?.(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="relative w-full">
      {/* Search Input Box */}
      <div
        className={`relative flex items-center w-full rounded-2xl transition-all duration-200 border ${
          isListening
            ? 'bg-rose-500/10 border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.25)] ring-2 ring-rose-500/40'
            : 'bg-white/5 border-white/10 hover:border-white/25 focus-within:border-white/40 focus-within:bg-white/10'
        }`}
      >
        <Search className="w-4 h-4 ml-3.5 text-slate-400 shrink-0" />

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={
            isListening
              ? lang === 'th'
                ? 'กำลังฟังเสียงของคุณ...'
                : 'Listening to your voice...'
              : placeholder || (lang === 'th' ? 'ค้นหาภาพยนตร์, ซีรีส์, ช่องสด...' : 'Search media...')
          }
          className="w-full py-2.5 pl-3 pr-20 text-xs text-white placeholder-slate-400 bg-transparent focus:outline-none"
        />

        {/* Clear query button */}
        {searchQuery && !isListening && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="p-1 mr-1 text-slate-400 hover:text-white transition-colors"
            title="ล้างข้อความ (Clear)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Voice Search Microphone Button */}
        <button
          type="button"
          onClick={toggleListening}
          className={`relative p-2 mr-1.5 rounded-xl transition-all duration-200 flex items-center justify-center ${
            isListening
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 animate-pulse scale-105'
              : 'text-slate-400 hover:text-white hover:bg-white/10 active:scale-95'
          }`}
          title={
            isListening
              ? lang === 'th'
                ? 'แตะเพื่อหยุดฟัง (Listening... tap to stop)'
                : 'Listening... tap to stop'
              : lang === 'th'
              ? 'ค้นหาด้วยเสียง (Web Speech API)'
              : 'Voice Search (Web Speech API)'
          }
        >
          {isListening ? (
            <Mic className="w-4 h-4 animate-bounce" />
          ) : (
            <Mic className="w-4 h-4" />
          )}

          {/* Pulsing ring indicator while active */}
          {isListening && (
            <span className="absolute inset-0 rounded-xl bg-rose-500/40 animate-ping pointer-events-none" />
          )}
        </button>
      </div>

      {/* Error alert toast */}
      {errorMessage && (
        <div className="absolute left-0 right-0 top-full mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 backdrop-blur-xl z-30 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-rose-400 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Android TV Voice Assistant Floating Overlay during active speech */}
      {isListening && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#0a0d14]/95 border border-white/15 p-8 shadow-2xl flex flex-col items-center text-center gap-6">
            {/* Animated Sound Waveform Indicator */}
            <div className="relative flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-rose-500/20 via-sky-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center shadow-inner">
                <div className="w-16 h-16 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xl shadow-rose-600/30 animate-pulse">
                  <Mic className="w-8 h-8" />
                </div>
              </div>

              {/* Pulsing rings */}
              <span className="absolute inset-0 rounded-full border border-rose-500/30 animate-ping" />
            </div>

            {/* Title & Speech Status */}
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xl font-bold text-white tracking-tight">
                {lang === 'th' ? 'กำลังฟังเสียงของคุณ...' : 'Listening...'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'th'
                  ? 'พูดชื่อภาพยนตร์, ซีรีส์, หรือช่องโทรทัศน์ที่ต้องการรับชม'
                  : 'Say the name of a movie, series, or live TV channel'}
              </p>
            </div>

            {/* Live Audio Visualizer Bars */}
            <div className="flex items-center gap-1.5 h-8">
              <div className="w-1.5 bg-sky-400 rounded-full animate-[pulse_0.4s_infinite_ease-in-out] h-4" />
              <div className="w-1.5 bg-rose-400 rounded-full animate-[pulse_0.6s_infinite_ease-in-out] h-7" />
              <div className="w-1.5 bg-amber-400 rounded-full animate-[pulse_0.3s_infinite_ease-in-out] h-5" />
              <div className="w-1.5 bg-emerald-400 rounded-full animate-[pulse_0.5s_infinite_ease-in-out] h-8" />
              <div className="w-1.5 bg-purple-400 rounded-full animate-[pulse_0.4s_infinite_ease-in-out] h-6" />
              <div className="w-1.5 bg-indigo-400 rounded-full animate-[pulse_0.7s_infinite_ease-in-out] h-4" />
            </div>

            {/* Recognized transcript output */}
            <div className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <p className="text-base font-semibold text-white">
                {transcript ? `"${transcript}"` : (
                  <span className="text-slate-400 text-sm font-normal">
                    {lang === 'th' ? 'เช่น: "Dune", "ไทยพีบีเอส", "Interstellar"...' : 'e.g., "Dune", "Thai PBS", "Interstellar"...'}
                  </span>
                )}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={stopListening}
                className="flex-1 py-3 rounded-2xl bg-white text-black font-semibold text-xs hover:bg-slate-200 transition-colors"
              >
                {lang === 'th' ? 'เสร็จสิ้น (Done)' : 'Done'}
              </button>
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  onSearchChange('');
                }}
                className="px-5 py-3 rounded-2xl bg-white/10 text-white font-medium text-xs hover:bg-white/20 transition-colors"
              >
                {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
