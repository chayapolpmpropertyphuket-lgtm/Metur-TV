import React from 'react';
import { MediaItem } from '../types';
import { Play, Star } from 'lucide-react';

interface MediaCardProps {
  item: MediaItem;
  isFocused?: boolean;
  onSelect: (item: MediaItem) => void;
  onFocus?: (item: MediaItem) => void;
  onToggleFavorite?: (item: MediaItem) => void;
  aspectRatio?: 'poster' | 'landscape' | 'banner';
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  isFocused = false,
  onSelect,
  onFocus,
  onToggleFavorite,
  aspectRatio = 'poster',
}) => {
  const isLandscape = aspectRatio === 'landscape' || item.type === 'channel';

  const formatSourceLabel = (src: string) => {
    switch (src) {
      case 'w3u':
        return 'W3U';
      case 'm3u':
        return 'IPTV';
      case 'jellyfin':
        return 'Jellyfin';
      case 'emby':
        return 'Emby';
      case 'plex':
        return 'Plex';
      default:
        return src.toUpperCase();
    }
  };

  return (
    <button
      onClick={() => onSelect(item)}
      onMouseEnter={() => onFocus?.(item)}
      onFocus={() => onFocus?.(item)}
      className={`group relative flex flex-col text-left outline-none transition-all duration-200 ease-out shrink-0 focus-visible:outline-none ${
        isLandscape ? 'w-64 md:w-72' : 'w-40 sm:w-44 md:w-48'
      } ${
        isFocused
          ? 'scale-105 z-20'
          : 'hover:scale-[1.03] z-10 opacity-90 hover:opacity-100'
      }`}
    >
      {/* Media Image Container with focus border */}
      <div
        className={`relative w-full overflow-hidden rounded-2xl bg-slate-900 border transition-all duration-200 ${
          isLandscape ? 'aspect-video' : 'aspect-[2/3]'
        } ${
          isFocused
            ? 'border-white shadow-[0_16px_36px_rgba(0,0,0,0.8)] ring-2 ring-white/60'
            : 'border-white/10 group-hover:border-white/30 shadow-lg shadow-black/40'
        }`}
      >
        <img
          src={isLandscape ? item.backdrop || item.poster : item.poster}
          alt={item.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Source badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-medium text-slate-300">
          <span>{formatSourceLabel(item.sourceType)}</span>
          {item.resolution && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-amber-400 font-semibold">{item.resolution}</span>
            </>
          )}
        </div>

        {/* Favorite Star button and Live status */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
          {item.type === 'channel' && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-600/90 text-white text-[10px] font-semibold tracking-wider uppercase">
              <span>LIVE</span>
            </div>
          )}

          {onToggleFavorite && (
            <div
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(item);
              }}
              className={`p-1.5 rounded-full backdrop-blur-md transition-all ${
                item.isFavorite
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-black/50 text-slate-400 hover:text-white border border-white/10 opacity-0 group-hover:opacity-100'
              }`}
              title={item.isFavorite ? 'นำออกจากรายการโปรด' : 'เพิ่มในรายการโปรด'}
            >
              <Star className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-current' : ''}`} />
            </div>
          )}
        </div>

        {/* Play icon overlay on hover/focus */}
        {isFocused && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] transition-opacity">
            <div className="w-12 h-12 rounded-full bg-white/90 text-black flex items-center justify-center shadow-2xl transform transition-transform group-hover:scale-110">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
          </div>
        )}

        {/* Watch Progress bar */}
        {typeof item.progress === 'number' && item.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
            <div
              className="h-full bg-rose-500 rounded-r transition-all duration-300"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Card Info below image */}
      <div className="mt-2.5 flex flex-col gap-0.5 px-1">
        <h3
          className={`font-medium text-sm truncate transition-colors ${
            isFocused ? 'text-white font-semibold' : 'text-slate-200'
          }`}
        >
          {item.title}
        </h3>

        {/* Clean unboxed metadata */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
          {item.year && <span>{item.year}</span>}
          {item.duration && (
            <>
              <span aria-hidden="true">·</span>
              <span>{Math.round(item.duration / 60)} น.</span>
            </>
          )}
          {item.epgNow && (
            <span className="text-slate-400 truncate text-[11px]">{item.epgNow}</span>
          )}
          {item.serverName && !item.epgNow && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{item.serverName}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
};
