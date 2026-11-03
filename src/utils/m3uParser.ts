import { MediaItem } from '../types';

/**
 * Robust parser for M3U / M3U8 playlist strings
 * Extracts tvg-name, tvg-logo, tvg-id, group-title, headers, and stream URLs
 */
export function parseM3U(m3uContent: string, playlistName = 'IPTV List', baseUrl?: string): {
  items: MediaItem[];
  groups: string[];
} {
  const lines = m3uContent.replace(/^\uFEFF/, '').split(/\r?\n/);
  const items: MediaItem[] = [];
  const groupSet = new Set<string>();

  let currentTitle = '';
  let currentLogo = '';
  let currentGroup = 'Live TV';
  let currentNumber = '';
  let currentHeaders: Record<string, string> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      // Parse metadata from #EXTINF line
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      const nameMatch = line.match(/tvg-name="([^"]+)"/i);
      const chNoMatch = line.match(/tvg-chno="([^"]+)"/i);

      currentGroup = groupMatch ? groupMatch[1] : 'Live TV';
      currentLogo = logoMatch ? logoMatch[1] : '';
      currentNumber = chNoMatch ? chNoMatch[1] : '';

      // Title is after the last comma
      const commaIdx = line.lastIndexOf(',');
      if (commaIdx !== -1) {
        currentTitle = line.substring(commaIdx + 1).trim();
      } else if (nameMatch) {
        currentTitle = nameMatch[1];
      } else {
        currentTitle = 'Live Stream';
      }
    } else if (line.startsWith('#EXTVLCOPT:') || line.startsWith('#EXTHTTP:')) {
      // Extra VLC options or user-agent
      if (line.includes('http-user-agent=')) {
        currentHeaders['User-Agent'] = line.split('http-user-agent=')[1].trim();
      }
      if (line.includes('http-referrer=')) {
        currentHeaders['Referer'] = line.split('http-referrer=')[1].trim();
      }
    } else if (!line.startsWith('#')) {
      // This is the media URL line
      let url = line;
      if (baseUrl && !/^[a-z][a-z0-9+.-]*:/i.test(url)) {
        try { url = new URL(url, baseUrl).toString(); } catch { /* Ignore malformed relative URLs. */ }
      }
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('rtmp://')) {
        groupSet.add(currentGroup);

        const id = `m3u-${Math.random().toString(36).substring(2, 9)}`;
        items.push({
          id,
          title: currentTitle || 'Unknown Channel',
          poster: currentLogo || 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500&auto=format&fit=crop&q=80',
          backdrop: currentLogo || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1280&auto=format&fit=crop&q=80',
          type: 'channel',
          sourceType: 'm3u',
          streamUrl: url,
          channelNumber: currentNumber || String(items.length + 1),
          group: currentGroup,
          serverName: playlistName,
          resolution: '1080p',
          audio: 'AAC Stereo',
          headers: Object.keys(currentHeaders).length > 0 ? currentHeaders : undefined,
        });

        // Reset for next entry
        currentTitle = '';
        currentLogo = '';
        currentHeaders = {};
      }
    }
  }

  return {
    items,
    groups: Array.from(groupSet),
  };
}
