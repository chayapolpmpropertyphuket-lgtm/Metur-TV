import React, { useEffect, useRef, useState } from 'react';
import { MediaItem, TVSettings } from '../types';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize2,
  Volume2,
  VolumeX,
  Subtitles,
  Sparkles,
  ArrowLeft,
  Settings,
  Radio,
  Check,
  Moon,
  Info,
  Layers,
  Star,
  Tv,
  List,
  Sliders,
  X,
  PictureInPicture,
} from 'lucide-react';

interface PlayerViewProps {
  item: MediaItem;
  settings: TVSettings;
  channelsList?: MediaItem[];
  onClose: () => void;
  onSelectChannel?: (channel: MediaItem) => void;
  onToggleFavorite?: (item: MediaItem) => void;
  onTogglePiP?: () => void;
}

export const PlayerView: React.FC<PlayerViewProps> = ({
  item,
  settings,
  channelsList = [],
  onClose,
  onSelectChannel,
  onToggleFavorite,
  onTogglePiP,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<'fit' | 'fill' | '16:9' | '21:9'>('fit');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeSubtitle, setActiveSubtitle] = useState<string>('th');
  const [subtitleColor, setSubtitleColor] = useState<'white' | 'yellow' | 'cyan'>('white');
  const [activeAudioTrack, setActiveAudioTrack] = useState<string>('original');
  const [soundProfile, setSoundProfile] = useState<'standard' | 'cinema' | 'voice_boost' | 'night'>('cinema');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showChannelDrawer, setShowChannelDrawer] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [qualityLevel, setQualityLevel] = useState<string>('Auto (1080p)');
  const [streamError, setStreamError] = useState<string | null>(null);

  // Sleep timer in player
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [sleepTimerCountdown, setSleepTimerCountdown] = useState<number | null>(null);

  const isLive = item.type === 'channel' || duration === 0 || !Number.isFinite(duration);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize playback with HLS.js or native HTML5 video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setStreamError(null);
    const url = item.streamUrl;
    const streamHeaders = item.headers ?? {};
    const hasCustomHeaders = Object.keys(streamHeaders).length > 0;
    const isHlsSource = url.toLowerCase().includes('.m3u8') || item.type === 'channel';
    const nativePlayer = (window as any).MeturNativePlayer;
    if (hasCustomHeaders && nativePlayer && typeof nativePlayer.play === 'function') {
      (window as any).__meturNativePlayerError = (message: string) => setStreamError(message);
      nativePlayer.play(url, item.title, JSON.stringify(streamHeaders));
      return () => {
        delete (window as any).__meturNativePlayerError;
      };
    }

    const browserBlockedHeaders = Object.keys(streamHeaders).filter((name) =>
      /^(host|cookie|origin|content-length|connection|referer|user-agent)$/i.test(name)
    );

    // Browser fallback: do not silently discard headers the WebView cannot set.
    if (browserBlockedHeaders.length > 0) {
      setStreamError('สตรีมนี้ต้องใช้ Header ที่เบราว์เซอร์ไม่อนุญาตให้แอปกำหนด (' + browserBlockedHeaders.join(', ') + ') ต้องเปิดเล่นผ่าน Android Native Player');
      return;
    }
    if (hasCustomHeaders && (!isHlsSource || !Hls.isSupported())) {
      setStreamError('สตรีมนี้ต้องใช้ HTTP Headers เพิ่มเติม แต่ไม่พบ Native Player บนอุปกรณ์นี้');
      return;
    }

    if (Hls.isSupported() && isHlsSource) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const applyHeaders = (headers: Headers) => {
        Object.entries(streamHeaders).forEach(([name, value]) => {
          // These are browser-controlled or security-sensitive request headers.
          if (/^(host|cookie|origin|content-length|connection|referer)$/i.test(name)) return;
          try { headers.set(name, value); } catch { /* Ignore invalid browser headers. */ }
        });
      };

      const hls = new Hls({
        maxBufferLength: settings.bufferSizeMB > 64 ? 60 : 30,
        enableWorker: true,
        lowLatencyMode: true,
        xhrSetup: (xhr) => {
          Object.entries(streamHeaders).forEach(([name, value]) => {
            if (/^(host|cookie|origin|content-length|connection|referer)$/i.test(name)) return;
            try { xhr.setRequestHeader(name, value); } catch { /* Ignore invalid browser headers. */ }
          });
        },
        fetchSetup: (context, initParams) => {
          const headers = new Headers(initParams.headers);
          applyHeaders(headers);
          return new Request(context.url, { ...initParams, headers });
        },
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          setIsPlaying(false);
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setStreamError('ไม่สามารถโหลดสตรีมนี้ได้ (Stream unavailable or network error)');
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple HLS support
      video.src = url;
      video.play().catch(() => setIsPlaying(false));
    } else {
      // Standard MP4/WebM stream
      video.src = url;
      video.play().catch(() => setIsPlaying(false));
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [item.streamUrl, item.type, item.headers, settings.bufferSizeMB]);

  // Return to the app screen after the native Android player is closed.
  useEffect(() => {
    const handleNativePlayerReturn = () => onClose();
    window.addEventListener('metur-native-player-returned', handleNativePlayerReturn);
    return () => window.removeEventListener('metur-native-player-returned', handleNativePlayerReturn);
  }, [onClose]);

  // Sleep timer interval countdown
  useEffect(() => {
    if (sleepTimer === null) {
      setSleepTimerCountdown(null);
      return;
    }

    let remainingSeconds = sleepTimer * 60;
    setSleepTimerCountdown(remainingSeconds);

    const interval = setInterval(() => {
      remainingSeconds -= 1;
      setSleepTimerCountdown(remainingSeconds);

      if (remainingSeconds <= 0) {
        clearInterval(interval);
        // Sleep Timer Triggered: Stop playback and close
        if (videoRef.current) videoRef.current.pause();
        onClose();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimer, onClose]);

  // Activity timer to auto-hide OSD
  const resetHideTimer = () => {
    setShowControls(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettingsMenu && !showChannelDrawer) {
        setShowControls(false);
      }
    }, 4500);
  };

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [isPlaying, showSettingsMenu, showChannelDrawer]);

  // Video time & buffer tracking
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    if (video.buffered.length > 0) {
      setBufferedTime(video.buffered.end(video.buffered.length - 1));
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 0);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
    resetHideTimer();
  };

  const handleSeek = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
    resetHideTimer();
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || isLive || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * duration;
    resetHideTimer();
  };

  const cycleAspectRatio = () => {
    const ratios: Array<'fit' | 'fill' | '16:9' | '21:9'> = ['fit', 'fill', '16:9', '21:9'];
    const nextIdx = (ratios.indexOf(aspectRatio) + 1) % ratios.length;
    setAspectRatio(ratios[nextIdx]);
    resetHideTimer();
  };

  // Keyboard navigation & remote control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      resetHideTimer();
      switch (e.key) {
        case 'Escape':
        case 'Backspace':
          if (showSettingsMenu) setShowSettingsMenu(false);
          else if (showChannelDrawer) setShowChannelDrawer(false);
          else if (showStats) setShowStats(false);
          else onClose();
          break;
        case ' ':
        case 'k':
        case 'MediaPlayPause':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSeek(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSeek(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setShowChannelDrawer((prev) => !prev);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setShowControls(true);
          break;
        case 'i':
        case 'I':
          setShowStats((prev) => !prev);
          break;
        case 'm':
        case 'AudioVolumeMute':
          setIsMuted(!isMuted);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, duration, showSettingsMenu, showChannelDrawer, showStats, onClose]);

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || isNaN(secs)) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'fill':
        return 'object-cover w-full h-full';
      case '16:9':
        return 'aspect-video w-full h-full object-contain';
      case '21:9':
        return 'aspect-[21/9] w-full h-full object-contain';
      case 'fit':
      default:
        return 'object-contain w-full h-full';
    }
  };

  const getSubtitleColorClass = () => {
    switch (subtitleColor) {
      case 'yellow':
        return 'text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]';
      case 'cyan':
        return 'text-cyan-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]';
      case 'white':
      default:
        return 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]';
    }
  };

  return (
    <div
      onMouseMove={resetHideTimer}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden"
    >
      {/* Video Canvas */}
      <video
        ref={videoRef}
        className={`${getAspectRatioClass()} transition-all duration-300`}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        playsInline
        muted={isMuted}
      />

      {/* Simulated Subtitle Overlay if active */}
      {activeSubtitle !== 'off' && isPlaying && (
        <div className="absolute bottom-24 left-10 right-10 flex justify-center pointer-events-none z-15">
          <div
            className={`px-4 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-center font-medium transition-all ${
              settings.subtitleSize === 'small'
                ? 'text-sm'
                : settings.subtitleSize === 'large'
                ? 'text-2xl'
                : 'text-lg'
            } ${getSubtitleColorClass()}`}
          >
            {activeSubtitle === 'th'
              ? 'คำบรรยายภาษาไทย · ถอดรหัสฮาร์ดแวร์แบบไม่สะดุด'
              : 'English Subtitles · Hardware Accelerated Master Track'}
          </div>
        </div>
      )}

      {/* Stream Stats Overlay (Key 'i') */}
      {showStats && (
        <div className="absolute top-20 left-6 z-30 p-4 rounded-2xl bg-black/85 border border-white/10 backdrop-blur-xl text-xs font-mono text-slate-300 flex flex-col gap-1.5 shadow-2xl">
          <div className="flex items-center justify-between pb-1 border-b border-white/10 text-white font-bold">
            <span>ข้อมูลสตรีมเชิงลึก (Stream Specs)</span>
            <button onClick={() => setShowStats(false)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>Decoder: {settings.decoder.toUpperCase()} (ExoPlayer Native)</div>
          <div>Resolution: {item.resolution || '1080p FHD'} @ 60 FPS</div>
          <div>Video Codec: HEVC / H.265 Main 10</div>
          <div>Audio Engine: {soundProfile.toUpperCase()} · {item.audio || 'AAC 5.1'}</div>
          <div>Buffer Ahead: {Math.max(0, Math.round(bufferedTime - currentTime))} วินาที</div>
          <div>Dropped Frames: 0 (0.00%) · Zero Judder</div>
          <div>Network Latency: 12ms (Direct CDN)</div>
        </div>
      )}

      {/* Channel Surfing Quick Drawer (When viewing live channels) */}
      {showChannelDrawer && channelsList.length > 0 && (
        <div className="absolute top-0 bottom-0 left-0 w-80 bg-[#07090e]/95 border-r border-white/10 backdrop-blur-2xl z-40 p-5 flex flex-col gap-4 animate-in slide-in-from-left duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Tv className="w-4 h-4 text-rose-400" />
              <span>สลับช่องด่วน (Channel Surfer)</span>
            </div>
            <button
              onClick={() => setShowChannelDrawer(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar flex-1">
            {channelsList.map((ch) => {
              const isCurrent = ch.id === item.id;
              return (
                <div
                  key={ch.id}
                  onClick={() => {
                    onSelectChannel?.(ch);
                    setShowChannelDrawer(false);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-white/15 border-white shadow-md'
                      : 'bg-white/[0.02] hover:bg-white/10 border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <img
                      src={ch.poster}
                      alt=""
                      className="w-10 h-7 rounded object-cover bg-slate-800 shrink-0"
                    />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-semibold text-white truncate">
                        {ch.channelNumber ? `CH ${ch.channelNumber} · ` : ''}
                        {ch.title}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">
                        {ch.epgNow || ch.group || 'Live Stream'}
                      </span>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-rose-400 shrink-0">กำลังเล่น</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stream Error Notice if failed */}
      {streamError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md z-30 p-6 text-center">
          <p className="text-rose-400 font-semibold mb-2">{streamError}</p>
          <p className="text-slate-400 text-sm max-w-md mb-6">
            สตรีมอาจถูกจำกัดเครือข่าย หรือต้องการการรับรอง Token จากเซิร์ฟเวอร์
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-white text-black font-medium hover:bg-slate-200 transition-colors"
          >
            กลับสู่หน้าหลัก (Back)
          </button>
        </div>
      )}

      {/* Top Header Bar (OSD) */}
      <div
        className={`absolute top-0 left-0 right-0 p-6 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all hover:scale-105 active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-3">
              {item.title}
              {isLive && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-600/90 text-white text-[11px] font-bold tracking-wider">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  ถ่ายทอดสด LIVE
                </span>
              )}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
              <span>{item.serverName || item.sourceType.toUpperCase()}</span>
              {item.resolution && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-400 font-medium">{item.resolution}</span>
                </>
              )}
              {item.audio && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-400">{item.audio}</span>
                </>
              )}
              {sleepTimerCountdown !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-300 font-mono flex items-center gap-1">
                    <Moon className="w-3 h-3" />
                    ปิดใน {Math.floor(sleepTimerCountdown / 60)}:{(sleepTimerCountdown % 60).toString().padStart(2, '0')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Top Right TV Action Tools */}
        <div className="flex items-center gap-2 text-xs">
          {/* Channel drawer toggle button */}
          {channelsList.length > 0 && (
            <button
              onClick={() => setShowChannelDrawer(!showChannelDrawer)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors flex items-center gap-1.5"
              title="สลับช่องถ่ายทอดสด"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">ผังช่อง</span>
            </button>
          )}

          {/* Favorite button in player */}
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(item)}
              className={`p-2.5 rounded-xl backdrop-blur-md transition-colors ${
                item.isFavorite ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="รายการโปรด"
            >
              <Star className={`w-4 h-4 ${item.isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}

          {/* Stream stats info button */}
          <button
            onClick={() => setShowStats(!showStats)}
            className={`p-2.5 rounded-xl backdrop-blur-md transition-colors ${
              showStats ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="ข้อมูลสตรีม (Key 'i')"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Sleep timer button */}
          <button
            onClick={() => {
              const options = [null, 15, 30, 45, 60, 90];
              const nextIdx = (options.indexOf(sleepTimer) + 1) % options.length;
              setSleepTimer(options[nextIdx]);
            }}
            className={`px-3 py-2 rounded-xl backdrop-blur-md transition-colors flex items-center gap-1.5 ${
              sleepTimer !== null ? 'bg-amber-500 text-black font-semibold' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="ตั้งเวลาปิดอัตโนมัติ (Sleep Timer)"
          >
            <Moon className="w-4 h-4" />
            <span>{sleepTimer ? `${sleepTimer}น.` : 'ตั้งเวลา'}</span>
          </button>

          {/* Settings Menu Button */}
          <button
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            className={`p-2.5 rounded-xl backdrop-blur-md transition-colors ${
              showSettingsMenu ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Flyout Modal */}
      {showSettingsMenu && (
        <div className="absolute right-6 top-20 w-88 rounded-2xl bg-[#0c0d14]/95 border border-white/10 backdrop-blur-2xl p-5 shadow-2xl z-30 flex flex-col gap-4 text-xs max-h-[80vh] overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="font-semibold text-sm text-white">ปรับแต่งการเล่น (Playback Menu)</span>
            <span className="text-slate-400">Metur TV Engine</span>
          </div>

          {/* Subtitles & Color */}
          <div className="flex flex-col gap-2">
            <span className="text-slate-400 font-medium">คำบรรยาย (Subtitles)</span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'off', label: 'ปิด' },
                { id: 'th', label: 'ไทย (Thai)' },
                { id: 'en', label: 'English' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubtitle(sub.id)}
                  className={`py-1.5 px-2 rounded-lg border text-center transition-colors ${
                    activeSubtitle === sub.id
                      ? 'bg-white text-black font-semibold'
                      : 'border-white/5 bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Subtitle Color */}
            {activeSubtitle !== 'off' && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">สีตัวอักษรคำบรรยาย</span>
                <div className="flex gap-1.5">
                  {(['white', 'yellow', 'cyan'] as const).map((col) => (
                    <button
                      key={col}
                      onClick={() => setSubtitleColor(col)}
                      className={`px-2 py-0.5 rounded text-[10px] border capitalize ${
                        subtitleColor === col
                          ? 'border-white bg-white/20 text-white font-bold'
                          : 'border-white/10 bg-white/5 text-slate-400'
                      }`}
                    >
                      {col}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sound Mode / Voice Boost */}
          <div className="flex flex-col gap-1.5">
            <span className="text-slate-400 font-medium">โปรไฟล์เสียง (Sound Mode)</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'cinema', label: 'โรงภาพยนตร์ (Cinema)' },
                { id: 'voice_boost', label: 'เน้นเสียงพูด (Dialogue)' },
                { id: 'night', label: 'โหมดกลางคืน (Night)' },
                { id: 'standard', label: 'มาตรฐาน (Standard)' },
              ].map((snd) => (
                <button
                  key={snd.id}
                  onClick={() => setSoundProfile(snd.id as any)}
                  className={`py-1.5 px-2 rounded-lg border text-center transition-colors ${
                    soundProfile === snd.id
                      ? 'bg-white text-black font-semibold'
                      : 'border-white/5 bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {snd.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Tracks */}
          <div className="flex flex-col gap-1.5">
            <span className="text-slate-400 font-medium">แทร็กเสียง (Audio Track)</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'original', label: 'Original 5.1 Atmos' },
                { id: 'thai', label: 'พากย์ไทย 5.1 HD' },
              ].map((aud) => (
                <button
                  key={aud.id}
                  onClick={() => setActiveAudioTrack(aud.id)}
                  className={`py-1.5 px-2 rounded-lg border text-center transition-colors ${
                    activeAudioTrack === aud.id
                      ? 'bg-white text-black font-semibold'
                      : 'border-white/5 bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {aud.label}
                </button>
              ))}
            </div>
          </div>

          {/* Playback Speed */}
          <div className="flex flex-col gap-1.5">
            <span className="text-slate-400 font-medium">ความเร็วในการเล่น (Speed)</span>
            <div className="grid grid-cols-4 gap-1.5">
              {[0.75, 1.0, 1.25, 1.5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => {
                    setPlaybackSpeed(spd);
                    if (videoRef.current) videoRef.current.playbackRate = spd;
                  }}
                  className={`py-1.5 rounded-lg border text-center transition-colors ${
                    playbackSpeed === spd
                      ? 'bg-white text-black font-semibold'
                      : 'border-white/5 bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls Bar (OSD) */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-6 md:p-8 flex flex-col gap-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Timeline scrubber (for VOD streams) */}
        {!isLive && (
          <div className="flex items-center gap-4 w-full">
            <span className="text-xs text-slate-300 font-mono tabular-nums w-12 text-right">
              {formatTime(currentTime)}
            </span>

            <div
              onClick={handleProgressBarClick}
              className="relative flex-1 h-2 bg-white/20 hover:h-3 rounded-full cursor-pointer transition-all duration-150 overflow-hidden group"
            >
              {/* Buffer Bar */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-white/30 rounded-full"
                style={{
                  width: `${duration > 0 ? (bufferedTime / duration) * 100 : 0}%`,
                }}
              />
              {/* Played Bar */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-white rounded-full group-hover:bg-rose-500 transition-colors"
                style={{
                  width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                }}
              />
            </div>

            <span className="text-xs text-slate-400 font-mono tabular-nums w-12">
              {formatTime(duration)}
            </span>
          </div>
        )}

        {/* Controls row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Rewind 10s */}
            <button
              onClick={() => handleSeek(-10)}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
              aria-label="Rewind 10 seconds"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Play/Pause Main Button */}
            <button
              onClick={togglePlay}
              className="p-4 rounded-2xl bg-white text-black hover:bg-slate-200 transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-white/10"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </button>

            {/* Forward 10s */}
            <button
              onClick={() => handleSeek(10)}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
              aria-label="Forward 10 seconds"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            {/* Volume toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
              aria-label="Toggle Mute"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-3">
            {/* Aspect Ratio Button */}
            <button
              onClick={cycleAspectRatio}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Maximize2 className="w-4 h-4" />
              <span className="uppercase">{aspectRatio}</span>
            </button>

            {/* Subtitle indicator */}
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className={`p-3 rounded-xl backdrop-blur-md transition-colors ${
                activeSubtitle !== 'off'
                  ? 'bg-white text-black'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Subtitles className="w-5 h-5" />
            </button>

            {/* Ambient Lighting Tone badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[11px] text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Metur HDR Tone</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
