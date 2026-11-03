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
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={`fixed left-0 top-0 bottom-0 z-40 flex flex-col justify-between py-6 px-3.5 transition-all duration-300 ease-in-out border-r border-white/5 backdrop-blur-2xl ${
        isExpanded || isFocused
          ? 'w-64 bg-[#08090f]/95 shadow-2xl shadow-black/80'
          : 'w-20 bg-[#08090f]/60'
      }`}
    >
      {/* Top: App Brand & Lenna minimal icon */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3.5 px-2.5 py-1">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 via-sky-500/20 to-teal-500/10 border border-white/10 shrink-0 shadow-lg">
            {/* Minimalist Lenna geometric mark */}
            <div className="w-4 h-4 rounded-full border-2 border-white/90 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            </div>
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
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const isItemFocused = isFocused && focusedIndex === index;

            return (
              <button
                key={item.id}
                data-tv-nav={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`relative flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left outline-none ${
                  isActive
                    ? 'text-white bg-white/10 shadow-sm'
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
