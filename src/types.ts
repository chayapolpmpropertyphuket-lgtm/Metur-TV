export type MediaType = 'movie' | 'series' | 'episode' | 'channel' | 'stream';

export type MediaSourceType = 'w3u' | 'm3u' | 'jellyfin' | 'emby' | 'plex' | 'webdav' | 'local';

export interface MediaItem {
  id: string;
  title: string;
  originalTitle?: string;
  overview?: string;
  poster: string;
  backdrop: string;
  type: MediaType;
  sourceType: MediaSourceType;
  streamUrl: string;
  duration?: number; // in seconds
  year?: number;
  rating?: string;
  genres?: string[];
  resolution?: '4K HDR' | '1080p' | '720p' | '4K Dolby Vision';
  audio?: string; // e.g. "Dolby Atmos 5.1", "AAC Stereo"
  channelNumber?: string;
  group?: string;
  serverName?: string;
  serverId?: string;
  serverItemId?: string;
  headers?: Record<string, string>;
  epgNow?: string;
  epgNext?: string;
  progress?: number; // 0 to 100 for resume playback
  currentTimeSeconds?: number;
  isFavorite?: boolean;
  lastWatchedAt?: number;
}

export interface MediaShelfSection {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  items: MediaItem[];
  aspectRatio?: 'poster' | 'landscape' | 'banner';
}

export interface W3UItem {
  name: string;
  image?: string;
  url: string;
  stations?: W3UItem[];
  groups?: Array<{
    name: string;
    image?: string;
    stations: W3UItem[];
  }>;
  headers?: Record<string, string>;
  userAgent?: string;
  referer?: string;
  isDrm?: boolean;
}

export interface W3UPlaylist {
  name: string;
  author?: string;
  info?: string;
  image?: string;
  url?: string;
  groups?: Array<{
    name: string;
    image?: string;
    stations: W3UItem[];
  }>;
  stations?: W3UItem[];
}

export interface MediaServerConfig {
  id: string;
  name: string;
  type: 'jellyfin' | 'emby' | 'plex' | 'webdav';
  url: string;
  username?: string;
  token?: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  itemCount: number;
  lastSync?: string;
  pingMs?: number;
}

export interface TVSettings {
  language: 'th' | 'en';
  hardwareAcceleration: boolean;
  decoder: 'exoplayer' | 'hardware' | 'software' | 'auto';
  bufferSizeMB: number;
  audioPassthrough: boolean;
  soundProfile: 'standard' | 'cinema' | 'voice_boost' | 'night';
  subtitlesEnabled: boolean;
  subtitleSize: 'small' | 'medium' | 'large';
  subtitleColor: 'white' | 'yellow' | 'cyan';
  framerateMatching: boolean;
  ambientBackdrop: boolean;
  aspectRatio: 'fit' | 'fill' | '16:9' | '21:9' | 'original';
  sleepTimerMinutes: number | null;
  quickChannelTuning: boolean;
  pipEnabled: boolean;
}
