import React from 'react';
import { MediaItem } from '../types';
import { Play, Info, Sparkles, Radio } from 'lucide-react';

interface HeroBannerProps {
  item: MediaItem;
  onPlay: (item: MediaItem) => void;
  onOpenDetails?: (item: MediaItem) => void;
  lang?: 'th' | 'en';
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  item,
  onPlay,
  onOpenDetails,
  lang = 'th',
}) => {
  const isLive = item.type === 'channel';

  return (
    <div className="relative w-full pt-8 pb-10 flex flex-col justify-end min-h-[360px] md:min-h-[420px] transition-all duration-500 ease-out z-10 px-2">
      {/* Hero Content */}
      <div className="flex flex-col gap-4 max-w-3xl">
        {/* Source & Metadata Strip */}
        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <span className="px-2 py-0.5 rounded bg-white/10 backdrop-blur-md border border-white/10 font-medium text-white uppercase text-[11px]">
            {item.serverName || item.sourceType.toUpperCase()}
          </span>

          {isLive ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px] uppercase tracking-wider">
              <Radio className="w-3 h-3 animate-pulse" />
              LIVE STREAM
            </span>
          ) : (
            <>
              {item.year && <span>{item.year}</span>}
              {item.rating && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-400 font-semibold font-mono">★ {item.rating}</span>
                </>
              )}
              {item.duration && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{Math.round(item.duration / 60)} นาที</span>
                </>
              )}
            </>
          )}

          {item.resolution && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-slate-200">{item.resolution}</span>
            </>
          )}

          {item.audio && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-slate-400">{item.audio}</span>
            </>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight drop-shadow-md">
          {item.title}
        </h1>

        {/* Overview Description */}
        <p className="text-sm md:text-base text-slate-300 line-clamp-2 md:line-clamp-3 leading-relaxed max-w-2xl drop-shadow">
          {item.overview ||
            'สัมผัสประสบการณ์ความบันเทิงระดับพรีเมียม ถ่ายทอดภาพและเสียงคุณภาพสูงสุดบน Android TV ผ่านตัวเล่นความเร็วสูง'}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3.5 pt-2">
          <button
            onClick={() => onPlay(item)}
            className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-white text-black font-bold text-sm hover:bg-slate-200 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10 outline-none focus:ring-2 focus:ring-white"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
            <span>{isLive ? (lang === 'th' ? 'รับชมสด' : 'Watch Live') : (lang === 'th' ? 'เล่นตอนนี้' : 'Play Now')}</span>
          </button>

          {onOpenDetails && (
            <button
              onClick={() => onOpenDetails(item)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm backdrop-blur-md transition-all hover:scale-105 active:scale-95 outline-none border border-white/10"
            >
              <Info className="w-4 h-4" />
              <span>{lang === 'th' ? 'ข้อมูลเพิ่มเติม' : 'Details'}</span>
            </button>
          )}

          {item.progress && item.progress > 0 && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 pl-2">
              <div className="w-24 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <span className="tabular-nums">เล่นค้างไว้ {item.progress}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
