import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  ArrowLeft,
  Home,
  Play,
  Volume2,
  VolumeX,
  Tv2,
  X,
  Keyboard,
  Mic,
} from 'lucide-react';

interface VirtualRemoteProps {
  onUp: () => void;
  onDown: () => void;
  onLeft: () => void;
  onRight: () => void;
  onSelect: () => void;
  onBack: () => void;
  onHome: () => void;
  onPlayPause: () => void;
  onVoiceSearch?: () => void;
  isVoiceListening?: boolean;
}

export const VirtualRemote: React.FC<VirtualRemoteProps> = ({
  onUp,
  onDown,
  onLeft,
  onRight,
  onSelect,
  onBack,
  onHome,
  onPlayPause,
  onVoiceSearch,
  isVoiceListening = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#12141c]/90 hover:bg-[#1a1d28] border border-white/15 text-white shadow-2xl backdrop-blur-xl transition-all hover:scale-105 active:scale-95 group"
      >
        <Tv2 className="w-4 h-4 text-sky-400 group-hover:rotate-12 transition-transform" />
        <span className="text-xs font-semibold tracking-wide">รีโมท Android TV</span>
      </button>

      {/* Floating Remote Control Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-40 w-64 rounded-3xl bg-[#0a0c12]/95 border border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl p-5 flex flex-col gap-4 text-white select-none animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold tracking-wider uppercase text-slate-200">
                Metur TV Remote
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Voice Search / Google Assistant Remote Button */}
          {onVoiceSearch && (
            <div className="flex justify-center -mb-1">
              <button
                onClick={onVoiceSearch}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-semibold transition-all ${
                  isVoiceListening
                    ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/50 animate-pulse'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/10 hover:scale-105 active:scale-95'
                }`}
                title="Voice Search (Web Speech API)"
              >
                <Mic className={`w-3.5 h-3.5 ${isVoiceListening ? 'animate-bounce' : 'text-rose-400'}`} />
                <span>{isVoiceListening ? 'กำลังฟังเสียง...' : 'ค้นหาด้วยเสียง'}</span>
              </button>
            </div>
          )}

          {/* D-Pad Container */}
          <div className="relative w-44 h-44 mx-auto rounded-full bg-slate-900/90 border border-white/15 p-2 shadow-inner flex items-center justify-center">
            {/* Up */}
            <button
              onClick={onUp}
              className="absolute top-2 w-14 h-11 rounded-t-2xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors"
              aria-label="Up"
            >
              <ChevronUp className="w-6 h-6" />
            </button>

            {/* Down */}
            <button
              onClick={onDown}
              className="absolute bottom-2 w-14 h-11 rounded-b-2xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors"
              aria-label="Down"
            >
              <ChevronDown className="w-6 h-6" />
            </button>

            {/* Left */}
            <button
              onClick={onLeft}
              className="absolute left-2 w-11 h-14 rounded-l-2xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors"
              aria-label="Left"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Right */}
            <button
              onClick={onRight}
              className="absolute right-2 w-11 h-14 rounded-r-2xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors"
              aria-label="Right"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* OK / Center Button */}
            <button
              onClick={onSelect}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/30 text-white font-bold text-xs flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
            >
              OK
            </button>
          </div>

          {/* Secondary Buttons Row */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={onBack}
              className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-slate-300 hover:text-white text-[10px] font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={onHome}
              className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-slate-300 hover:text-white text-[10px] font-medium"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>

            <button
              onClick={onPlayPause}
              className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-slate-300 hover:text-white text-[10px] font-medium"
            >
              <Play className="w-4 h-4" />
              <span>Play</span>
            </button>
          </div>

          {/* Keyboard Hint */}
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] text-slate-400">
            <Keyboard className="w-4 h-4 text-slate-400 shrink-0" />
            <span>ใช้ปุ่มคีย์บอร์ด [▲▼◀▶], Enter, Esc ได้ทันที</span>
          </div>
        </div>
      )}
    </>
  );
};
