import React, { useState } from 'react';
import { MediaItem } from '../types';
import { Play, X, Server, Film, Clock, Radio, Shield, HardDrive, Copy, Check, Star } from 'lucide-react';

interface MediaDetailsModalProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPlay: (item: MediaItem) => void;
  onToggleFavorite?: (item: MediaItem) => void;
}

export const MediaDetailsModal: React.FC<MediaDetailsModalProps> = ({
  item,
  isOpen,
  onClose,
  onPlay,
  onToggleFavorite,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !item) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(item.streamUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl">
      <div className="relative w-full max-w-3xl bg-[#090b10] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Backdrop Header */}
        <div className="relative w-full h-64 md:h-72 overflow-hidden shrink-0">
          <img
            src={item.backdrop || item.poster}
            alt={item.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090b10] via-[#090b10]/60 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all hover:scale-105"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Overlay info */}
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="px-2 py-0.5 rounded bg-white/20 backdrop-blur-md text-white font-semibold uppercase text-[10px]">
                  {item.serverName || item.sourceType.toUpperCase()}
                </span>
                {item.year && <span>{item.year}</span>}
                {item.rating && <span className="text-amber-400 font-bold">★ {item.rating}</span>}
                {item.resolution && <span>{item.resolution}</span>}
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                {item.title}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onToggleFavorite && (
                <button
                  onClick={() => onToggleFavorite(item)}
                  className={`p-3 rounded-2xl backdrop-blur-md transition-colors ${
                    item.isFavorite
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                  }`}
                  title={item.isFavorite ? 'นำออกจากรายการโปรด' : 'เพิ่มในรายการโปรด'}
                >
                  <Star className={`w-5 h-5 ${item.isFavorite ? 'fill-current' : ''}`} />
                </button>
              )}

              <button
                onClick={() => {
                  onPlay(item);
                  onClose();
                }}
                className="px-6 py-3 rounded-2xl bg-white text-black font-bold text-sm hover:bg-slate-200 transition-transform hover:scale-105 active:scale-95 shadow-xl flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>เล่นทันที</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 md:p-8 flex flex-col gap-6 overflow-y-auto no-scrollbar">
          {/* Overview */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              เรื่องย่อ (Synopsis)
            </h3>
            <p className="text-sm md:text-base text-slate-200 leading-relaxed">
              {item.overview ||
                'ไม่มีข้อมูลเรื่องย่อเพิ่มเติมสำหรับรายการนี้ สตรีมนี้พร้อมเล่นผ่านตัวถอดรหัสความเร็วสูงของ Lenna TV'}
            </p>
          </div>

          {/* Technical Specs Bento */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-1">
              <span className="text-[11px] text-slate-400">แหล่งที่มา (Source)</span>
              <span className="text-sm font-semibold text-white capitalize">{item.sourceType}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-1">
              <span className="text-[11px] text-slate-400">ความละเอียด (Video)</span>
              <span className="text-sm font-semibold text-amber-400">{item.resolution || '1080p FHD'}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-1">
              <span className="text-[11px] text-slate-400">ระบบเสียง (Audio)</span>
              <span className="text-sm font-semibold text-white">{item.audio || 'Dolby Digital / Stereo'}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-1">
              <span className="text-[11px] text-slate-400">รูปแบบสตรีม (Format)</span>
              <span className="text-sm font-semibold text-white font-mono">
                {item.streamUrl.includes('.m3u8') ? 'HLS (.m3u8)' : 'MP4 / H.265'}
              </span>
            </div>
          </div>

          {/* Stream URL details & Copy Link */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">ที่อยู่สตรีมมีเดีย (Stream Target)</span>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}</span>
              </button>
            </div>
            <p className="text-xs font-mono text-slate-300 break-all select-all bg-black/40 p-2.5 rounded-xl border border-white/5">
              {item.streamUrl}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
