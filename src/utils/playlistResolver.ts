import { MediaItem } from '../types';
import { parseM3U } from './m3uParser';
import { parseW3U } from './w3uParser';

export type PlaylistFormat = 'w3u' | 'm3u';
export interface ResolvedPlaylist {
  type: PlaylistFormat;
  items: MediaItem[];
  groups: string[];
  name?: string;
}
function decodeHtml(value: string): string {
  return value
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp);/gi, (entity) => ({
      '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
      '&apos;': "'", '&nbsp;': ' ',
    }[entity.toLowerCase()] ?? entity))
    .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_entity, code: string) => {
      const point = code[0].toLowerCase() === 'x' ? Number.parseInt(code.slice(1), 16) : Number.parseInt(code, 10);
      return Number.isFinite(point) && point <= 0x10ffff ? String.fromCodePoint(point) : '';
    });
}
function extractHtmlPayloads(html: string): string[] {
  const candidates: string[] = [];
  const addMatches = (pattern: RegExp) => {
    for (const match of html.matchAll(pattern)) if (match[1]) candidates.push(decodeHtml(match[1]));
  };
  addMatches(/<(?:pre|code|textarea)\b[^>]*>([\s\S]*?)<\/(?:pre|code|textarea)\s*>/gi);
  addMatches(/<script\b[^>]*type=["']application\/(?:json|ld\+json)["'][^>]*>([\s\S]*?)<\/script\s*>/gi);
  candidates.push(decodeHtml(html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '\n')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '\n')));
  return candidates;
}
function cleanCandidate(value: string): string {
  return value.replace(/^\s*```(?:json|m3u|m3u8|w3u)?\s*/i, '')
    .replace(/\s*```\s*$/, '').replace(/^\uFEFF/, '').trim();
}
/** Detect format from the returned payload, and inspect HTML wrappers for embedded playlist data. */
export function resolvePlaylistContent(rawContent: string, playlistName = 'Imported Playlist', baseUrl?: string): ResolvedPlaylist {
  if (!rawContent || !rawContent.trim()) throw new Error('เซิร์ฟเวอร์ตอบกลับเป็นข้อมูลว่าง');
  const candidates = [rawContent];
  if (/<(?:!doctype\s+html|html|head|body|pre|code|textarea)\b/i.test(rawContent)) {
    candidates.push(...extractHtmlPayloads(rawContent));
  }
  const seen = new Set<string>();
  for (const rawCandidate of candidates) {
    const candidate = cleanCandidate(rawCandidate);
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    if (/^#EXTM3U\b/im.test(candidate) || /^#EXTINF:/im.test(candidate)) {
      const parsed = parseM3U(candidate, playlistName, baseUrl);
      if (parsed.items.length) return { type: 'm3u', items: parsed.items, groups: parsed.groups };
    }
    if (/^[\[{]/.test(candidate)) {
      try {
        const value = JSON.parse(candidate);
        const hasPlaylistShape = Array.isArray(value) ||
          (value && typeof value === 'object' && (Array.isArray(value.groups) || Array.isArray(value.stations)));
        if (hasPlaylistShape) {
          const parsed = parseW3U(candidate, playlistName, baseUrl);
          if (parsed.items.length) return { type: 'w3u', name: parsed.playlist.name, items: parsed.items, groups: parsed.groups };
        }
      } catch { /* Inspect other embedded candidates before reporting a format error. */ }
    }
  }
  if (/<(?:!doctype\s+html|html|head|body)\b/i.test(rawContent)) {
    throw new Error('พบหน้าเว็บ HTML แต่ไม่พบข้อมูล Playlist ที่อ่านได้ในหน้าเว็บ กรุณาใช้ลิงก์ Playlist โดยตรงหรือเปิดเผยข้อมูลในหน้าเว็บ');
  }
  throw new Error('ไม่สามารถระบุรูปแบบ Playlist ได้ รองรับข้อมูล W3U/JSON และ M3U/M3U8');
}
