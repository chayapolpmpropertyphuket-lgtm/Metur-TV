import React, { useState, useEffect } from 'react';
import {
  MediaItem,
  MediaServerConfig,
  TVSettings,
} from './types';
import {
  DEFAULT_TV_SETTINGS,
} from './data/sampleData';
import { BackdropAmbient } from './components/BackdropAmbient';
import { Sidebar, TabType } from './components/Sidebar';
import { HeroBanner } from './components/HeroBanner';
import { MediaShelf } from './components/MediaShelf';
import { PlayerView } from './components/PlayerView';
import { ServersModal } from './components/ServersModal';
import { PlaylistsModal } from './components/PlaylistsModal';
import { SettingsModal } from './components/SettingsModal';
import { MediaDetailsModal } from './components/MediaDetailsModal';
import { ChannelGuide } from './components/ChannelGuide';
import { VirtualRemote } from './components/VirtualRemote';
import { VoiceSearch } from './components/VoiceSearch';
import { loadAppState, saveAppState } from './services/localStore';
import { deleteServerCredentials } from './services/secureVault';
import {
  Server,
  ListPlus,
  Tv,
  Film,
  Sparkles,
  Search,
  SlidersHorizontal,
  Mic,
  Star,
  History,
  Clock,
  Play,
  Moon,
} from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [settings, setSettings] = useState<TVSettings>(DEFAULT_TV_SETTINGS);
  const [servers, setServers] = useState<MediaServerConfig[]>([]);

  // Media Collections
  const [featuredItems, setFeaturedItems] = useState<MediaItem[]>([]);
  const [continueWatching, setContinueWatching] = useState<MediaItem[]>([]);
  const [liveChannels, setLiveChannels] = useState<MediaItem[]>([]);

  // Extra W3U imported items
  const [w3uItems, setW3uItems] = useState<MediaItem[]>([]);

  // Watch History
  const [watchHistory, setWatchHistory] = useState<MediaItem[]>([]);
  const [storageReady, setStorageReady] = useState(false);

  // Active / Focused Item State for 10-ft TV experience
  const [focusedItem, setFocusedItem] = useState<MediaItem | null>(null);
  const [playingItem, setPlayingItem] = useState<MediaItem | null>(null);
  const [detailsItem, setDetailsItem] = useState<MediaItem | null>(null);

  // Modals state
  const [isServersOpen, setIsServersOpen] = useState(false);
  const [isPlaylistsOpen, setIsPlaylistsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Quick search / filter & Voice Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isVoiceListening, setIsVoiceListening] = useState(false);

  // Quick Channel Number Tuning overlay feedback
  const [quickTuneNumber, setQuickTuneNumber] = useState<string | null>(null);

  // Load local-only app data once. Server credentials are deliberately excluded
  // until the Android Keystore bridge is available.
  useEffect(() => {
    let active = true;
    loadAppState()
      .then((saved) => {
        if (!active || !saved) return;
        if (saved.settings) setSettings(saved.settings);
        if (saved.servers) setServers(saved.servers.map((server) => ({
          ...server,
          username: undefined,
          token: undefined,
          status: 'disconnected' as const,
        })));
        if (saved.w3uItems) setW3uItems(saved.w3uItems);
        if (saved.continueWatching) setContinueWatching(saved.continueWatching);
        if (saved.liveChannels) setLiveChannels(saved.liveChannels);
        if (saved.featuredItems) setFeaturedItems(saved.featuredItems);
        if (saved.watchHistory) setWatchHistory(saved.watchHistory);
      })
      .catch((error) => console.error('[Metur TV] Local database load failed:', error))
      .finally(() => {
        if (active) setStorageReady(true);
      });
    return () => { active = false; };
  }, []);

  // Persist user data locally. Never write server usernames, API keys or tokens
  // into IndexedDB; those require the native encrypted credential vault.
  useEffect(() => {
    if (!storageReady) return;
    const safeServers = servers.map(({ username: _username, token: _token, ...server }) => server);
    saveAppState({
      settings,
      servers: safeServers,
      w3uItems,
      continueWatching,
      liveChannels,
      featuredItems,
      watchHistory,
    }).catch((error) => console.error('[Metur TV] Local database save failed:', error));
  }, [storageReady, settings, servers, w3uItems, continueWatching, liveChannels, featuredItems, watchHistory]);

  // Compute all favorites
  const allMediaItems = [...featuredItems, ...liveChannels, ...w3uItems, ...continueWatching];
  const favoriteItems = allMediaItems.filter((item, index, self) =>
    item.isFavorite && self.findIndex((i) => i.id === item.id) === index
  );

  // Toggle Favorite
  const handleToggleFavorite = (targetItem: MediaItem) => {
    const updatedStatus = !targetItem.isFavorite;

    const updateList = (list: MediaItem[]) =>
      list.map((item) => (item.id === targetItem.id ? { ...item, isFavorite: updatedStatus } : item));

    setFeaturedItems(updateList);
    setLiveChannels(updateList);
    setW3uItems(updateList);
    setContinueWatching(updateList);
    setWatchHistory(updateList);

    if (focusedItem?.id === targetItem.id) {
      setFocusedItem({ ...focusedItem, isFavorite: updatedStatus });
    }
    if (detailsItem && detailsItem.id === targetItem.id) {
      setDetailsItem({ ...detailsItem, isFavorite: updatedStatus });
    }
  };

  // Start Playing Item with history tracking
  const startPlaying = (item: MediaItem) => {
    setPlayingItem(item);
    // Add to history
    setWatchHistory((prev) => {
      const filtered = prev.filter((i) => i.id !== item.id);
      return [{ ...item, lastWatchedAt: Date.now() }, ...filtered];
    });
  };


  // Android TV D-Pad Navigation Engine
  useEffect(() => {
    const selector = [
      'button:not(:disabled)',
      'a[href]',
      'input:not(:disabled)',
      'select:not(:disabled)',
      'textarea:not(:disabled)',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    const getFocusable = (): HTMLElement[] => {
      return Array.from(
        document.querySelectorAll<HTMLElement>(selector)
      ).filter((el) => {
        return (
          el.getClientRects().length > 0 &&
          getComputedStyle(el).visibility !== 'hidden' &&
          !el.closest('[aria-hidden="true"]')
        );
      });
    };

    const moveFocus = (
      direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
    ) => {
      const elements = getFocusable();
      const active = document.activeElement as HTMLElement | null;

      if (!active || active === document.body ||
          !active.matches(selector)) {
        const initial =
          document.querySelector<HTMLElement>(
            `[data-tv-nav="${currentTab}"]`
          );

        (initial || elements[0])?.focus();
        return;
      }

      const current = active.getBoundingClientRect();
      const cx = current.left + current.width / 2;
      const cy = current.top + current.height / 2;

      const candidates = elements
        .filter((el) => el !== active)
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;

          const dx = x - cx;
          const dy = y - cy;

          let primary = 0;
          let secondary = 0;

          switch (direction) {
            case 'ArrowLeft':
              if (dx >= -1) return null;
              primary = -dx;
              secondary = Math.abs(dy);
              break;

            case 'ArrowRight':
              if (dx <= 1) return null;
              primary = dx;
              secondary = Math.abs(dy);
              break;

            case 'ArrowUp':
              if (dy >= -1) return null;
              primary = -dy;
              secondary = Math.abs(dx);
              break;

            case 'ArrowDown':
              if (dy <= 1) return null;
              primary = dy;
              secondary = Math.abs(dx);
              break;
          }

          return {
            el,
            score: primary + secondary * 1.5
          };
        })
        .filter(
          (item): item is { el: HTMLElement; score: number } =>
            item !== null
        )
        .sort((a, b) => a.score - b.score);

      if (candidates.length > 0) {
        const next = candidates[0].el;

        next.focus({ preventScroll: true });

        next.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      } else if (direction === 'ArrowUp') {
        window.scrollBy({ top: -200, behavior: 'smooth' });
      } else if (direction === 'ArrowDown') {
        window.scrollBy({ top: 200, behavior: 'smooth' });
      }
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (playingItem) return;

      const active = document.activeElement;

      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement ||
        (active instanceof HTMLElement && active.isContentEditable)
      ) {
        return;
      }

      // Quick channel tuning
      if (settings.quickChannelTuning && /^[0-9]$/.test(e.key)) {
        e.preventDefault();

        const num = e.key;
        setQuickTuneNumber(num);

        const targetChannel = liveChannels.find(
          (ch) =>
            ch.channelNumber === num ||
            ch.channelNumber === `0${num}`
        );

        if (targetChannel) {
          setTimeout(() => {
            startPlaying(targetChannel);
            setQuickTuneNumber(null);
          }, 600);
        } else {
          setTimeout(() => setQuickTuneNumber(null), 1500);
        }

        return;
      }

      // Four-direction navigation
      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        e.preventDefault();
        moveFocus(e.key);
        return;
      }

      // Select focused element
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();

        const focused = document.activeElement as HTMLElement;

        if (
          focused &&
          focused !== document.body &&
          focused.matches(selector)
        ) {
          focused.click();
        } else {
          document
            .querySelector<HTMLElement>(
              `[data-tv-nav="${currentTab}"]`
            )
            ?.focus();
        }

        return;
      }

      // Back button
      if (e.key === 'Escape') {
        if (isServersOpen || isPlaylistsOpen ||
            isSettingsOpen || detailsItem) {
          setIsServersOpen(false);
          setIsPlaylistsOpen(false);
          setIsSettingsOpen(false);
          setDetailsItem(null);
        }
      }
    };

    // Initial focus on active sidebar item
    const initialTimer = window.setTimeout(() => {
      if (document.activeElement === document.body) {
        document
          .querySelector<HTMLElement>(
            `[data-tv-nav="${currentTab}"]`
          )
          ?.focus();
      }
    }, 300);

    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      window.clearTimeout(initialTimer);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [
    playingItem,
    focusedItem,
    isServersOpen,
    isPlaylistsOpen,
    isSettingsOpen,
    detailsItem,
    liveChannels,
    settings.quickChannelTuning,
    currentTab
  ]);


  // Handlers for Virtual TV Remote
  const handleRemoteUp = () => {
    window.scrollBy({ top: -250, behavior: 'smooth' });
  };
  const handleRemoteDown = () => {
    window.scrollBy({ top: 250, behavior: 'smooth' });
  };
  const handleRemoteLeft = () => {
    const tabs: TabType[] = ['home', 'live', 'movies', 'series', 'favorites', 'history', 'servers', 'playlists', 'settings'];
    const currentIdx = tabs.indexOf(currentTab);
    if (currentIdx > 0) {
      setCurrentTab(tabs[currentIdx - 1]);
    }
  };
  const handleRemoteRight = () => {
    const tabs: TabType[] = ['home', 'live', 'movies', 'series', 'favorites', 'history', 'servers', 'playlists', 'settings'];
    const currentIdx = tabs.indexOf(currentTab);
    if (currentIdx < tabs.length - 1) {
      setCurrentTab(tabs[currentIdx + 1]);
    }
  };
  const handleRemoteSelect = () => {
    if (focusedItem) startPlaying(focusedItem);
  };
  const handleRemoteBack = () => {
    if (playingItem) setPlayingItem(null);
    else if (detailsItem) setDetailsItem(null);
    else if (isServersOpen || isPlaylistsOpen || isSettingsOpen) {
      setIsServersOpen(false);
      setIsPlaylistsOpen(false);
      setIsSettingsOpen(false);
    } else {
      setCurrentTab('home');
    }
  };
  const handleRemoteHome = () => {
    setPlayingItem(null);
    setDetailsItem(null);
    setIsServersOpen(false);
    setIsPlaylistsOpen(false);
    setIsSettingsOpen(false);
    setCurrentTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleRemotePlayPause = () => {
    if (!playingItem && focusedItem) {
      startPlaying(focusedItem);
    }
  };

  // Import handler from PlaylistsModal
  const handleImportNewItems = (newItems: MediaItem[], playlistTitle: string) => {
    setW3uItems((prev) => [...newItems, ...prev]);
  };

  // Add Server handler
  const handleAddServer = (newServer: MediaServerConfig) => {
    setServers((prev) => [newServer, ...prev]);
  };

  const handleRemoveServer = (id: string) => {
    deleteServerCredentials(id).catch((error) => {
      console.error('[Metur TV] Could not clear encrypted credentials:', error);
    }).finally(() => {
      setServers((prev) => prev.filter((server) => server.id !== id));
    });
  };


  // Navigation tab switch router
  const handleSelectTab = (tab: TabType) => {
    if (tab === 'servers') {
      setIsServersOpen(true);
    } else if (tab === 'playlists') {
      setIsPlaylistsOpen(true);
    } else if (tab === 'settings') {
      setIsSettingsOpen(true);
    } else {
      setCurrentTab(tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Filter items by search query if search is enabled
  const filterMediaList = (list: MediaItem[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.overview?.toLowerCase().includes(q) ||
        item.genres?.some((g) => g.toLowerCase().includes(q)) ||
        item.group?.toLowerCase().includes(q)
    );
  };

  return (
    <div className="relative min-h-screen bg-[#050608] text-slate-100 flex overflow-x-hidden">
      {/* 1. Ambient Background reacting to current focused poster */}
      <BackdropAmbient
        backdropUrl={focusedItem?.backdrop || focusedItem?.poster}
        enabled={settings.ambientBackdrop}
      />

      {/* 2. Lenna / Apple TV Minimalist Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        lang={settings.language}
        favoritesCount={favoriteItems.length}
        sleepTimerMinutes={settings.sleepTimerMinutes}
      />

      {/* 3. Main Content Viewport (Adjusted for sidebar padding) */}
      <main className="flex-1 ml-20 md:ml-24 px-6 md:px-12 py-8 flex flex-col min-h-screen z-10 transition-all duration-300 max-w-7xl">
        {/* Top Header Bar strictly following Top Bar Contract */}
        <header className="flex items-center justify-between gap-8 pb-6 border-b border-white/5">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xl md:text-2xl font-bold tracking-tight text-white whitespace-nowrap">
              {currentTab === 'home' && (settings.language === 'th' ? 'หน้าหลัก' : 'Home')}
              {currentTab === 'live' && (settings.language === 'th' ? 'ทีวีสด & IPTV' : 'Live TV & IPTV')}
              {currentTab === 'movies' && (settings.language === 'th' ? 'ภาพยนตร์' : 'Movies')}
              {currentTab === 'series' && (settings.language === 'th' ? 'ซีรีส์' : 'Series')}
              {currentTab === 'favorites' && (settings.language === 'th' ? 'รายการโปรด' : 'Favorites')}
              {currentTab === 'history' && (settings.language === 'th' ? 'ประวัติการรับชม' : 'History')}
            </span>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              · Metur Media Engine 2.4
            </span>
          </div>

          {/* Search is shown after the user has added media */}
          {allMediaItems.length > 0 && (
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <VoiceSearch
                searchQuery={searchQuery}
                onSearchChange={(q) => setSearchQuery(q)}
                lang={settings.language}
                isListeningExternal={isVoiceListening}
                onListeningChange={(l) => setIsVoiceListening(l)}
                placeholder={settings.language === 'th' ? 'ค้นหาสื่อ...' : 'Search media...'}
              />
            </div>
          )}
          {allMediaItems.length > 0 && (
            <div className="flex items-center gap-2.5 shrink-0">
              <button onClick={() => setIsPlaylistsOpen(true)} className="px-3.5 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold border border-white/10">เพลย์ลิสต์</button>
              <button onClick={() => setIsServersOpen(true)} className="px-3.5 py-2 rounded-xl bg-white text-black text-xs font-bold">เซิร์ฟเวอร์ ({servers.length})</button>
              <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-xl bg-white/5 text-slate-300 border border-white/5" title="ตั้งค่า Android TV"><SlidersHorizontal className="w-4 h-4" /></button>
            </div>
          )}
        </header>

        {/* Quick Tune Channel Number Indicator */}
        {quickTuneNumber && (
          <div className="fixed top-8 right-8 z-50 px-5 py-3 rounded-2xl bg-black/90 border border-white/20 backdrop-blur-2xl shadow-2xl flex items-center gap-3 animate-in fade-in duration-150">
            <Tv className="w-5 h-5 text-amber-400" />
            <div className="flex flex-col">
              <span className="text-xs text-slate-400">จูนช่องด่วน</span>
              <span className="text-xl font-bold font-mono text-white">CH {quickTuneNumber}</span>
            </div>
          </div>
        )}

        {/* ================= VIEW: HOME ================= */}
        {currentTab === 'home' && (
          <div className="flex flex-col gap-6 w-full">
            {/* Voice Search Active Banner */}
            {searchQuery && (
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white">
                      ผลการค้นหาด้วยเสียง / ค้นหา: "{searchQuery}"
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      แสดงรายการที่ตรงกับคำสั่งเสียงในภาพยนตร์ ซีรีส์ และช่องทีวีสด
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-slate-300 hover:text-white transition-colors"
                >
                  ล้างคำค้นหา
                </button>
              </div>
            )}

            {allMediaItems.length === 0 ? (
              <div className="flex-1 min-h-[55vh] flex flex-col items-center justify-center text-center gap-5">
                <div className="w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                  <Tv className="w-9 h-9 text-slate-500" />
                </div>
                <div className="max-w-lg">
                  <h1 className="text-2xl font-semibold text-white">
                    {settings.language === 'th' ? 'ยินดีต้อนรับสู่ Metur TV' : 'Welcome to Metur TV'}
                  </h1>
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                    {settings.language === 'th'
                      ? 'ยังไม่มีรายการในคลังของคุณ เพิ่มเพลย์ลิสต์หรือเชื่อมต่อมีเดียเซิร์ฟเวอร์เพื่อเริ่มต้น'
                      : 'Your library is empty. Add a playlist or connect a media server to get started.'}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => setIsPlaylistsOpen(true)}
                    className="px-5 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-slate-200 transition-colors"
                  >
                    + เพิ่ม Playlist / Stream URL
                  </button>
                  <button
                    onClick={() => setIsServersOpen(true)}
                    className="px-5 py-3 rounded-xl bg-white/10 border border-white/10 text-white text-sm font-semibold hover:bg-white/15 transition-colors"
                  >
                    + เพิ่ม Media Server
                  </button>
                </div>
              </div>
            ) : (
              <>
            {/* Dynamic Hero Banner */}
            {!searchQuery && focusedItem && (
              <HeroBanner
                item={focusedItem}
                onPlay={(item) => startPlaying(item)}
                onOpenDetails={(item) => setDetailsItem(item)}
                lang={settings.language}
              />
            )}

            {/* Shelf 1: Favorites if available */}
            {favoriteItems.length > 0 && !searchQuery && (
              <MediaShelf
                title="รายการโปรดของคุณ (My Favorites)"
                subtitle="บันทึกไว้เพื่อรับชมด่วน"
                badge={`${favoriteItems.length} รายการ`}
                items={favoriteItems}
                aspectRatio="poster"
                focusedItemId={focusedItem?.id}
                onSelect={(item) => startPlaying(item)}
                onFocusItem={(item) => setFocusedItem(item)}
                onToggleFavorite={handleToggleFavorite}
                onSeeAll={() => setCurrentTab('favorites')}
              />
            )}

            {/* Shelf 2: Continue Watching (เล่นค้างไว้) */}
            <MediaShelf
              title={settings.language === 'th' ? 'เล่นค้างไว้' : 'Continue Watching'}
              subtitle="ซิงค์จาก Jellyfin & Plex"
              items={filterMediaList(continueWatching)}
              aspectRatio="landscape"
              focusedItemId={focusedItem?.id}
              onSelect={(item) => startPlaying(item)}
              onFocusItem={(item) => setFocusedItem(item)}
              onToggleFavorite={handleToggleFavorite}
            />

            {/* Shelf 3: Wiseplay W3U & 4K Media (จากไฟล์ W3U) */}
            <MediaShelf
              title="เพลย์ลิสต์ Wiseplay W3U (4K HDR)"
              subtitle="ถอดรหัสจาก w3u JSON พร้อม HLS Streaming"
              badge={`${w3uItems.length} รายการ`}
              items={filterMediaList(w3uItems)}
              aspectRatio="poster"
              focusedItemId={focusedItem?.id}
              onSelect={(item) => startPlaying(item)}
              onFocusItem={(item) => setFocusedItem(item)}
              onToggleFavorite={handleToggleFavorite}
              onSeeAll={() => setIsPlaylistsOpen(true)}
            />

            {/* Shelf 4: Live Channels & IPTV Highlights */}
            <MediaShelf
              title={settings.language === 'th' ? 'ช่องรายการสดแนะนำ' : 'Live Channels'}
              subtitle="M3U8 HLS สตรีมตรงความหน่วงต่ำ"
              badge="LIVE"
              items={filterMediaList(liveChannels)}
              aspectRatio="landscape"
              focusedItemId={focusedItem?.id}
              onSelect={(item) => startPlaying(item)}
              onFocusItem={(item) => setFocusedItem(item)}
              onToggleFavorite={handleToggleFavorite}
              onSeeAll={() => setCurrentTab('live')}
            />

            {/* Shelf 5: Trending Masterpieces from Connected Media Servers */}
            <MediaShelf
              title={settings.language === 'th' ? 'ภาพยนตร์และซีรีส์เด่น' : 'Featured Media'}
              subtitle="Dolby Vision · Atmos · Ultra HD"
              items={filterMediaList(featuredItems)}
              aspectRatio="poster"
              focusedItemId={focusedItem?.id}
              onSelect={(item) => startPlaying(item)}
              onFocusItem={(item) => setFocusedItem(item)}
              onToggleFavorite={handleToggleFavorite}
            />

              </>
            )}          </div>
        )}

        {/* ================= VIEW: LIVE TV / IPTV ================= */}
        {currentTab === 'live' && (
          <div className="flex flex-col gap-6 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  ผังรายการทีวีสด & สตรีมออนไลน์ (Live TV & EPG Guide)
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  รองรับช่องจากเพลย์ลิสต์ M3U, M3U8, W3U พร้อมระบบ EPG ตารางเวลาออกอากาศ (กดเลข 0-9 เพื่อจูนช่องด่วน)
                </p>
              </div>
              <button
                onClick={() => setIsPlaylistsOpen(true)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/10 transition-colors"
              >
                + เพิ่มช่อง M3U / W3U
              </button>
            </div>

            <ChannelGuide
              channels={filterMediaList(liveChannels)}
              focusedChannelId={focusedItem?.id}
              onSelectChannel={(ch) => startPlaying(ch)}
              onFocusChannel={(ch) => setFocusedItem(ch)}
              onToggleFavorite={handleToggleFavorite}
            />
          </div>
        )}

        {/* ================= VIEW: MOVIES ================= */}
        {currentTab === 'movies' && (
          <div className="flex flex-col gap-6 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  คลังภาพยนตร์ (Movies Collection)
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  รวมภาพยนตร์จากเซิร์ฟเวอร์ Jellyfin, Emby, Plex และ W3U
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 pt-2">
              {[...featuredItems.filter((i) => i.type === 'movie'), ...w3uItems].map((item) => (
                <div
                  key={item.id}
                  onClick={() => startPlaying(item)}
                  onMouseEnter={() => setFocusedItem(item)}
                  className="group relative flex flex-col cursor-pointer transition-all duration-200 hover:scale-105"
                >
                  <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-slate-900 border border-white/10 group-hover:border-white shadow-xl">
                    <img
                      src={item.poster}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] text-white font-medium border border-white/10">
                      {item.sourceType.toUpperCase()}
                    </div>
                    {/* Star favorite */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(item);
                      }}
                      className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md ${
                        item.isFavorite
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-black/50 text-slate-400 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                  <h3 className="text-xs font-semibold text-white mt-2 truncate group-hover:text-amber-400">
                    {item.title}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {item.year || '2024'} · {item.resolution || '1080p'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= VIEW: SERIES ================= */}
        {currentTab === 'series' && (
          <div className="flex flex-col gap-6 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  ซีรีส์และรายการโทรทัศน์ (Series & TV Shows)
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  ติดตามตอนใหม่และเล่นต่อเนื่องได้อย่างราบรื่น
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 pt-2">
              {featuredItems
                .filter((i) => i.type === 'series' || i.type === 'episode')
                .map((item) => (
                  <div
                    key={item.id}
                    onClick={() => startPlaying(item)}
                    onMouseEnter={() => setFocusedItem(item)}
                    className="group relative flex flex-col cursor-pointer transition-all duration-200 hover:scale-105"
                  >
                    <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-slate-900 border border-white/10 group-hover:border-white shadow-xl">
                      <img
                        src={item.poster}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] text-white font-medium border border-white/10">
                        {item.sourceType.toUpperCase()}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(item);
                        }}
                        className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md ${
                          item.isFavorite
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-black/50 text-slate-400 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                    <h3 className="text-xs font-semibold text-white mt-2 truncate group-hover:text-amber-400">
                      {item.title}
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {item.year || '2024'} · {item.resolution || '4K HDR'}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ================= VIEW: FAVORITES ================= */}
        {currentTab === 'favorites' && (
          <div className="flex flex-col gap-6 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Star className="w-6 h-6 text-amber-400 fill-current" />
                  <span>รายการโปรดของคุณ ({favoriteItems.length})</span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  รวมภาพยนตร์ ซีรีส์ และช่องทีวีสดที่คุณกดติดดาวไว้
                </p>
              </div>
            </div>

            {favoriteItems.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                <Star className="w-12 h-12 text-slate-600" />
                <p className="text-sm text-slate-400">ยังไม่มีรายการโปรด</p>
                <p className="text-xs text-slate-500">
                  แตะที่ไอคอนรูปดาวบนภาพยนตร์ ช่อง หรือซีรีส์เพื่อเพิ่มไว้ที่นี่
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 pt-2">
                {favoriteItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => startPlaying(item)}
                    onMouseEnter={() => setFocusedItem(item)}
                    className="group relative flex flex-col cursor-pointer transition-all duration-200 hover:scale-105"
                  >
                    <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-slate-900 border border-white/10 group-hover:border-white shadow-xl">
                      <img
                        src={item.poster}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(item);
                        }}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md bg-amber-500/20 text-amber-400"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                    <h3 className="text-xs font-semibold text-white mt-2 truncate">
                      {item.title}
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {item.sourceType.toUpperCase()} · {item.resolution || '1080p'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= VIEW: HISTORY ================= */}
        {currentTab === 'history' && (
          <div className="flex flex-col gap-6 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <History className="w-6 h-6 text-sky-400" />
                  <span>ประวัติการรับชม (Watch History)</span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  รายการที่คุณเพิ่งเปิดรับชมล่าสุด
                </p>
              </div>
              {watchHistory.length > 0 && (
                <button
                  onClick={() => setWatchHistory([])}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  ล้างประวัติ
                </button>
              )}
            </div>

            {watchHistory.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                <History className="w-12 h-12 text-slate-600" />
                <p className="text-sm text-slate-400">ยังไม่มีประวัติการรับชม</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {watchHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => startPlaying(item)}
                    className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/20 transition-all cursor-pointer flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3.5 overflow-hidden">
                      <img
                        src={item.poster}
                        alt=""
                        className="w-16 h-12 rounded-xl object-cover bg-slate-900 shrink-0"
                      />
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-semibold text-white truncate">
                          {item.title}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className="uppercase">{item.sourceType}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.resolution || '1080p'}</span>
                        </div>
                      </div>
                    </div>

                    <button className="p-2.5 rounded-full bg-white text-black opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 4. Fullscreen Video Player (When active) */}
      {playingItem && (
        <PlayerView
          item={playingItem}
          settings={settings}
          channelsList={liveChannels}
          onClose={() => setPlayingItem(null)}
          onSelectChannel={(ch) => setPlayingItem(ch)}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {/* 5. Modals for Servers, Playlists W3U, Details, Settings */}
      <ServersModal
        servers={servers}
        isOpen={isServersOpen}
        onClose={() => setIsServersOpen(false)}
        onAddServer={handleAddServer}
        onRemoveServer={handleRemoveServer}
      />

      <PlaylistsModal
        isOpen={isPlaylistsOpen}
        onClose={() => setIsPlaylistsOpen(false)}
        onPlaylistItemSelect={(item) => startPlaying(item)}
        onImportItems={handleImportNewItems}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newVals) => setSettings({ ...settings, ...newVals })}
      />


      <MediaDetailsModal
        item={detailsItem}
        isOpen={Boolean(detailsItem)}
        onClose={() => setDetailsItem(null)}
        onPlay={(item) => startPlaying(item)}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* 6. Virtual Remote Controller for testing Android TV D-Pad directly */}
      <VirtualRemote
        onUp={handleRemoteUp}
        onDown={handleRemoteDown}
        onLeft={handleRemoteLeft}
        onRight={handleRemoteRight}
        onSelect={handleRemoteSelect}
        onBack={handleRemoteBack}
        onHome={handleRemoteHome}
        onPlayPause={handleRemotePlayPause}
        onVoiceSearch={() => setIsVoiceListening((prev) => !prev)}
        isVoiceListening={isVoiceListening}
      />
    </div>
  );
}
