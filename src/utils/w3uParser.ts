import { MediaItem, W3UPlaylist, W3UItem } from '../types';

/**
 * Real Parser for Wiseplay W3U JSON playlist format
 * Supports standard format, nested groups, stations, and header directives
 */
export function parseW3U(jsonContent: string, sourceName = 'Wiseplay List', baseUrl?: string): {
  playlist: W3UPlaylist;
  items: MediaItem[];
  groups: string[];
} {
  try {
    const data = JSON.parse(jsonContent.replace(/^\uFEFF/, ''));
    const playlistName = data.name || sourceName;
    const items: MediaItem[] = [];
    const groupSet = new Set<string>();

    const processStation = (station: W3UItem, groupName = 'General') => {
      if (!station.url && !station.stations) return;

      groupSet.add(groupName);

      // Headers / User-Agent handling
      const headers: Record<string, string> = { ...(station.headers || {}) };
      if (station.userAgent) {
        headers['User-Agent'] = station.userAgent;
      }
      if (station.referer) {
        headers['Referer'] = station.referer;
      }

      const id = `w3u-${Math.random().toString(36).substring(2, 9)}`;
      let streamUrl = station.url || '';
      if (baseUrl && streamUrl && !/^[a-z][a-z0-9+.-]*:/i.test(streamUrl)) {
        try { streamUrl = new URL(streamUrl, baseUrl).toString(); } catch { /* Keep the original URL for validation downstream. */ }
      }
      const isHls = streamUrl.toLowerCase().includes('.m3u8');

      items.push({
        id,
        title: station.name || 'Untitled Stream',
        poster: station.image || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=500&auto=format&fit=crop&q=80',
        backdrop: station.image || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1280&auto=format&fit=crop&q=80',
        type: isHls ? 'channel' : 'stream',
        sourceType: 'w3u',
        streamUrl,
        group: groupName,
        serverName: playlistName,
        resolution: '1080p',
        audio: 'AAC Stereo',
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      });
    };

    // Case 1: groups array (Standard Wiseplay)
    if (Array.isArray(data.groups)) {
      data.groups.forEach((grp: { name: string; image?: string; stations: W3UItem[] }) => {
        const grpName = grp.name || 'General';
        if (Array.isArray(grp.stations)) {
          grp.stations.forEach((st) => processStation(st, grpName));
        }
      });
    }

    // Case 2: direct stations array
    if (Array.isArray(data.stations)) {
      data.stations.forEach((st: W3UItem) => processStation(st, 'General'));
    }

    // Case 3: Root is direct array of items
    if (Array.isArray(data)) {
      data.forEach((item: W3UItem) => processStation(item, 'Imported'));
    }

    return {
      playlist: {
        name: playlistName,
        author: data.author || 'Wiseplay Community',
        info: data.info || '',
        image: data.image,
        groups: data.groups,
        stations: data.stations,
      },
      items,
      groups: Array.from(groupSet),
    };
  } catch (error) {
    console.error('Failed to parse W3U content:', error);
    throw new Error('รูปแบบไฟล์ W3U ไม่ถูกต้อง (Invalid JSON / Wiseplay structure)');
  }
}
