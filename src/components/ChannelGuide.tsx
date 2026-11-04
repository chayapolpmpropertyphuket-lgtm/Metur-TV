import React, { useState } from 'react';
import { MediaItem } from '../types';
import { Radio, Play, Clock, Sparkles, Star } from 'lucide-react';

interface ChannelGuideProps {
  channels: MediaItem[];
  onSelectChannel: (channel: MediaItem) => void;
  onToggleFavorite?: (channel: MediaItem) => void;
  focusedChannelId?: string;
  onFocusChannel?: (channel: MediaItem) => void;
}

export const ChannelGuide: React.FC<ChannelGuideProps> = ({
  channels,
  onSelectChannel,
  onToggleFavorite,
  focusedChannelId,
  onFocusChannel,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');

  // Extract unique categories + Favorites
  const uniqueCategories = Array.from(new Set(channels.map((c) => c.group || 'ทั่วไป')));
  const categories = ['ทั้งหมด', 'รายการโปรด ★', ...uniqueCategories];

  const filteredChannels = channels.filter((c) => {
    if (selectedCategory === 'ทั้งหมด') return true;
    if (selectedCategory === 'รายการโปรด ★') return c.isFavorite;
    return (c.group || 'ทั่วไป') === selectedCategory;
  });

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Category filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-white text-black shadow-lg scale-102'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Channels Grid / EPG list */}
      <div data-tv-focus-group="channel-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredChannels.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            ไม่พบช่องในหมวดหมู่นี้
          </div>
        ) : (
          filteredChannels.map((channel) => {
            const isFocused = focusedChannelId === channel.id;

            return (
              <div
                key={channel.id}
                role="button"
                tabIndex={0}
                aria-label={"รับชม " + channel.title}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectChannel(channel);
                  }
                }}
                onClick={() => onSelectChannel(channel)}
                onMouseEnter={() => onFocusChannel?.(channel)}
                className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 group outline-none ${
                  isFocused
                    ? 'bg-white/15 border-white shadow-2xl ring-2 ring-white scale-102 z-10'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/20'
                }`}
              >
                {/* Channel Head info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="relative w-12 h-12 rounded-xl bg-slate-900 border border-white/10 overflow-hidden shrink-0">
                      <img
                        src={channel.poster}
                        alt={channel.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-amber-400 font-bold">
                          CH {channel.channelNumber || '01'}
                        </span>
                        <span className="font-semibold text-white text-sm truncate">
                          {channel.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 truncate mt-0.5">
                        {channel.serverName || channel.sourceType.toUpperCase()} · {channel.resolution || '1080p'}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Favorite Star & Live Badge */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {onToggleFavorite && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(channel);
                        }}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          channel.isFavorite
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-white/5 text-slate-400 hover:text-white border-white/5'
                        }`}
                        title={channel.isFavorite ? 'นำออกจากช่องโปรด' : 'เพิ่มในช่องโปรด'}
                      >
                        <Star className={`w-3.5 h-3.5 ${channel.isFavorite ? 'fill-current' : ''}`} />
                      </button>
                    )}
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600/90 text-white text-[10px] font-bold">
                      <Radio className="w-3 h-3 animate-pulse" />
                      LIVE
                    </span>
                  </div>
                </div>

                {/* EPG Now / Next Schedule */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5 text-xs">
                  <div className="flex items-center gap-2 text-slate-200 truncate">
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300 font-medium shrink-0">
                      ตอนนี้
                    </span>
                    <span className="truncate text-xs font-medium">
                      {channel.epgNow || 'รายการสดทั่วไป (Live Broadcast)'}
                    </span>
                  </div>

                  {channel.epgNext && (
                    <div className="flex items-center gap-2 text-slate-400 truncate text-[11px]">
                      <Clock className="w-3 h-3 shrink-0 text-slate-500" />
                      <span className="truncate">{channel.epgNext}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Quick Play Action on hover */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {channel.audio || 'AAC Stereo'}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-white opacity-80 group-hover:opacity-100 font-medium">
                    <Play className="w-3 h-3 fill-current" />
                    <span>รับชม</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
