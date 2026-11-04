import React, { useRef } from 'react';
import { MediaItem } from '../types';
import { MediaCard } from './MediaCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MediaShelfProps {
  title: string;
  subtitle?: string;
  badge?: string;
  items: MediaItem[];
  aspectRatio?: 'poster' | 'landscape';
  focusedItemId?: string;
  onSelect: (item: MediaItem) => void;
  onFocusItem: (item: MediaItem) => void;
  onToggleFavorite?: (item: MediaItem) => void;
  onSeeAll?: () => void;
}

export const MediaShelf: React.FC<MediaShelfProps> = ({
  title,
  subtitle,
  badge,
  items,
  aspectRatio = 'poster',
  focusedItemId,
  onSelect,
  onFocusItem,
  onToggleFavorite,
  onSeeAll,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -480 : 480;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 py-3 w-full">
      {/* Header */}
      <div className="flex items-baseline justify-between px-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            {title}
          </h2>
          {subtitle && (
            <span className="text-xs text-slate-400 font-medium">
              {subtitle}
            </span>
          )}
          {badge && (
            <span className="text-xs text-slate-400 tabular-nums">
              · {badge}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded"
            >
              ดูทั้งหมด ({items.length})
            </button>
          )}

          {/* Quick arrow controls for desktop/mouse users */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => scroll('left')}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Cards Shelf */}
      <div
        ref={scrollContainerRef}
        data-tv-focus-group="media-shelf"
        aria-label={title}
        className="flex items-center gap-5 overflow-x-auto no-scrollbar py-3 px-2 scroll-smooth"
        style={{
          scrollSnapType: 'x mandatory',
          transform: 'translate3d(0, 0, 0)',
        }}
      >
        {items.map((item) => (
          <div key={item.id} style={{ scrollSnapAlign: 'start' }}>
            <MediaCard
              item={item}
              aspectRatio={aspectRatio}
              isFocused={focusedItemId === item.id}
              onSelect={onSelect}
              onFocus={onFocusItem}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
