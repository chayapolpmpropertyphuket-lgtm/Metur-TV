import React, { useState } from 'react';
import {
  Home,
  Tv,
  Film,
  Clapperboard,
  Server,
  ListPlus,
  Settings,
  Wifi,
  Cast,
  Star,
  History,
  Moon,
} from 'lucide-react';

export type TabType =
  | 'home'
  | 'live'
  | 'movies'
  | 'series'
  | 'favorites'
  | 'history'
  | 'servers'
  | 'playlists'
  | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isFocused?: boolean;
  focusedIndex?: number;
  lang?: 'th' | 'en';
  favoritesCount?: number;
  sleepTimerMinutes?: number | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isFocused = false,
  focusedIndex = 0,
  lang = 'th',
  favoritesCount,
  sleepTimerMinutes,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const eventSafeContainsActive = () => {
    if (typeof document === 'undefined') return false;
    return document.querySelector('[data-tv-sidebar="true"]')?.contains(document.activeElement) ?? false;
  };

  const navItems = [
    {
      id: 'home' as TabType,
      label: lang === 'th' ? 'หน้าหลัก' : 'Home',
      icon: Home,
    },
    {
      id: 'live' as TabType,
      label: lang === 'th' ? 'ทีวีสด / IPTV' : 'Live TV',
      icon: Tv,
    },
    {
      id: 'movies' as TabType,
      label: lang === 'th' ? 'ภาพยนตร์' : 'Movies',
      icon: Film,
    },
    {
      id: 'series' as TabType,
      label: lang === 'th' ? 'ซีรีส์' : 'Series',
      icon: Clapperboard,
    },
    {
      id: 'favorites' as TabType,
      label: lang === 'th' ? 'รายการโปรด' : 'Favorites',
      icon: Star,
      badge: favoritesCount && favoritesCount > 0 ? String(favoritesCount) : undefined,
    },
    {
      id: 'history' as TabType,
      label: lang === 'th' ? 'ประวัติการรับชม' : 'History',
      icon: History,
    },
    {
      id: 'servers' as TabType,
      label: lang === 'th' ? 'เซิร์ฟเวอร์' : 'Servers',
      icon: Server,
    },
    {
      id: 'playlists' as TabType,
      label: lang === 'th' ? 'เพลย์ลิสต์ W3U' : 'Playlists',
      icon: ListPlus,
    },
    {
      id: 'settings' as TabType,
      label: lang === 'th' ? 'ตั้งค่าระบบ' : 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside
      data-tv-sidebar="true"
      aria-label={lang === 'th' ? 'เมนูหลัก' : 'Main navigation'}
      onFocusCapture={() => setIsExpanded(true)}
      onBlurCapture={(event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
          setIsExpanded(false);
        }
      }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => {
        if (!eventSafeContainsActive()) setIsExpanded(false);
      }}
      className={`fixed left-0 top-0 bottom-0 z-40 flex flex-col justify-between py-6 px-3.5 transition-all duration-300 ease-in-out border-r border-violet-300/10 backdrop-blur-2xl ${
        isExpanded || isFocused
          ? 'w-64 bg-[#080B1A]/96 shadow-2xl shadow-black/80'
          : 'w-20 bg-[#080B1A]/78'
      }`}
    >
      {/* Top: App Brand & Lenna minimal icon */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3.5 px-2.5 py-1">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-[#10152B] border border-violet-400/30 shrink-0 shadow-[0_0_24px_rgba(99,102,241,0.22)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 via-blue-600/15 to-cyan-400/20" />
            <svg viewBox="0 0 48 48" className="relative w-9 h-9" aria-label="Metur TV" role="img">
              <defs><linearGradient id="metur-mark-gradient" x1="5" y1="7" x2="43" y2="41" gradientUnits="userSpaceOnUse">
                <stop stopColor="#C084FC" /><stop offset=".52" stopColor="#6366F1" /><stop offset="1" stopColor="#22D3EE" />
              </linearGradient></defs>
              <path d="M5 38V10h7l12 15L36 10h7v28h-8V22L24 36 13 22v16H5Z" fill="url(#metur-mark-gradient)" />
              <path d="m20 18 13 7-13 7V18Z" fill="#F8FAFC" stroke="#10152B" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          {(isExpanded || isFocused) && (
            <div className="flex flex-col overflow-hidden transition-opacity duration-200">
              <span className="font-semibold text-base tracking-tight text-white whitespace-nowrap">
                Metur TV
              </span>
              <span className="text-[11px] text-slate-400 whitespace-nowrap">
                {lang === 'th' ? 'แอนดรอยด์ทีวี มีเดีย' : 'Android TV Edition'}
              </span>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav data-tv-focus-group="sidebar-navigation" className="flex flex-col gap-1.5">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const isItemFocused = isFocused && focusedIndex === index;

            return (
              <button
                type="button"
                key={item.id}
                data-tv-nav={item.id}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                onClick={() => onSelectTab(item.id)}
                className={`relative flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left outline-none ${
                  isActive
                    ? 'text-white bg-gradient-to-r from-violet-500/25 via-blue-500/15 to-cyan-400/10 shadow-[inset_3px_0_0_#22D3EE,0_0_18px_rgba(99,102,241,0.12)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                } ${
                  isItemFocused
                    ? 'ring-2 ring-white/90 bg-white/15 scale-102 text-white'
                    : ''
                }`}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-white" />
                )}

                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />

                {(isExpanded || isFocused) && (
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis flex-1">
                    {item.label}
                  </span>
                )}

                {(isExpanded || isFocused) && item.badge && (
                  <span className="text-[10px] text-slate-400 tabular-nums px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Network status and TV mode specs */}
      <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-slate-500">
          <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
          {(isExpanded || isFocused) && (
            <div className="flex flex-col overflow-hidden leading-tight">
              <span className="text-slate-300 font-medium text-[11px] truncate">
                Wi-Fi 5GHz · 4K Ready
              </span>
              <span className="text-[10px] text-slate-500">
                192.168.1.105
              </span>
            </div>
          )}
        </div>

        {/* Sleep Timer status if active */}
        {sleepTimerMinutes !== null && sleepTimerMinutes !== undefined && (
          <div className="flex items-center gap-2.5 px-2.5 py-1 text-xs text-amber-400">
            <Moon className="w-4 h-4 shrink-0" />
            {(isExpanded || isFocused) && (
              <span className="text-[11px] font-mono truncate">
                ปิดอัตโนมัติใน {sleepTimerMinutes} นาที
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2.5 px-2.5 py-1 text-xs text-slate-500">
          <Cast className="w-4 h-4 text-slate-400 shrink-0" />
          {(isExpanded || isFocused) && (
            <span className="text-[11px] text-slate-400 truncate">
              Google Cast / DLNA On
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};
