import React, { useEffect, useState } from 'react';
import { MediaItem } from '../types';
import { loadPlaylists, savePlaylists, PersistedPlaylist } from '../services/localStore';
import { nativeRequest } from '../services/nativeHttp';
import { resolvePlaylistContent } from '../utils/playlistResolver';
import {
  ListPlus,
  Tv,
  FileCode,
  Download,
  Trash2,
  Pencil,
  Check,
  RotateCw,
  CheckCircle,
  AlertTriangle,
  Play,
  X,
  Layers,
} from 'lucide-react';

type PlaylistEntry = PersistedPlaylist;

interface PlaylistsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaylistItemSelect: (item: MediaItem) => void;
  onImportItems: (newItems: MediaItem[], playlistTitle: string) => void;
}

export const PlaylistsModal: React.FC<PlaylistsModalProps> = ({
  isOpen,
  onClose,
  onPlaylistItemSelect,
  onImportItems,
}) => {
  const [activeTab, setActiveTab] = useState<'manage' | 'import' | 'direct'>('manage');
  const [smartInput, setSmartInput] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [directStreamUrl, setDirectStreamUrl] = useState('');
  const [directStreamTitle, setDirectStreamTitle] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Start empty; users add their own playlist sources.
  const [savedPlaylists, setSavedPlaylists] = useState<PlaylistEntry[]>([]);
  const [playlistsReady, setPlaylistsReady] = useState(false);
  const [renamingPlaylistId, setRenamingPlaylistId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState('');
  const [refreshingPlaylistId, setRefreshingPlaylistId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadPlaylists()
      .then((items) => { if (active) setSavedPlaylists(items); })
      .catch((error) => console.error('[Metur TV] Playlist load failed:', error))
      .finally(() => { if (active) setPlaylistsReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!playlistsReady) return;
    savePlaylists(savedPlaylists).catch((error) => console.error('[Metur TV] Playlist save failed:', error));
  }, [playlistsReady, savedPlaylists]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistEntry | null>(null);

  const makePlaylistId = () => {
    const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    return `pl-${Date.now().toString(36)}-${randomId}`;
  };

  const handleImportFile = async (file: File | undefined, type: 'w3u' | 'm3u') => {
    if (!file) return;
    try {
      if (file.size === 0) throw new Error('ไฟล์นี้ไม่มีข้อมูล');
      if (file.size > 8 * 1024 * 1024) {
        throw new Error('ไฟล์มีขนาดเกิน 8 MB กรุณาใช้ Playlist ที่มีขนาดเล็กลง');
      }

      const content = await file.text();
      if (!content.trim()) throw new Error('ไฟล์นี้ไม่มีเนื้อหา Playlist');
      const name = playlistName.trim() || file.name.replace(/\.[^.]+$/, '');
      const parsed = resolvePlaylistContent(content, name);
      const detectedType = parsed.type;
      if (parsed.items.length === 0) {
        throw new Error('ไม่พบรายการสื่อในไฟล์ หรือโครงสร้าง Playlist ไม่ถูกต้อง');
      }

      const entry: PlaylistEntry = {
        id: makePlaylistId(),
        name,
        type: detectedType,
        source: 'content',
        itemCount: parsed.items.length,
        groups: parsed.groups,
        addedAt: `นำเข้าจากไฟล์ ${file.name}`,
        items: parsed.items,
      };
      setSavedPlaylists((previous) => [entry, ...previous]);
      setSelectedPlaylist(entry);
      onImportItems(parsed.items, entry.name);
      setPlaylistName('');
      setStatusMessage({
        text: `นำเข้าไฟล์ ${file.name} สำเร็จ ${parsed.items.length} รายการ`,
        type: 'success',
      });
      setActiveTab('manage');
    } catch (error) {
      setStatusMessage({
        text: error instanceof Error ? error.message : 'ไม่สามารถอ่านไฟล์ Playlist ได้',
        type: 'error',
      });
    }
  };

  const handleImportSmart = async (file?: File) => {
    const input = file ? await file.text() : smartInput.trim();
    if (!input.trim()) {
      setStatusMessage({ text: 'กรุณาวาง URL หรือโค้ด W3U / M3U / M3U8 หรือเลือกไฟล์', type: 'error' });
      return;
    }
    try {
      let content = input.trim();
      let sourceUrl: string | undefined;
      let source: 'url' | 'content' = 'content';
      if (/^https?:\/\//i.test(content)) {
        const parsedUrl = new URL(content);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('รองรับเฉพาะ HTTP/HTTPS');
        sourceUrl = parsedUrl.toString();
        source = 'url';
        setStatusMessage({ text: 'กำลังตรวจสอบลิงก์และค้นหาไฟล์ Playlist...', type: 'success' });
        // Gofile share pages are folders, not playlist files. Resolve their public
        // contents endpoint first; the returned file URL is then fetched as text.
        if (/^(?:www\.)?gofile\.io$/i.test(parsedUrl.hostname) && /^\/d\//.test(parsedUrl.pathname)) {
          const code = parsedUrl.pathname.split('/').filter(Boolean)[1];
          const listing = await nativeRequest<{ status?: string; data?: Record<string, unknown> }>(
            `https://api.gofile.io/contents/${encodeURIComponent(code)}`,
            'GET',
            { Accept: 'application/json' },
            undefined,
            { allowRedirects: true },
          );
          if (!listing.ok) throw new Error('Gofile ไม่อนุญาตให้แอปอ่านรายการไฟล์ผ่าน API ในขณะนี้ กรุณาใช้ลิงก์ดาวน์โหลดไฟล์ Playlist โดยตรง หรือแชร์ไฟล์แบบสาธารณะ');
          const payload = listing.data ?? JSON.parse(listing.body);
          const root = (payload as any).data ?? payload;
          const children = Array.isArray(root.childs) ? root.childs : [];
          const candidates: any[] = [];
          const collect = (nodes: any[]) => nodes.forEach((node) => {
            if (node?.type === 'folder' && Array.isArray(node.childs)) collect(node.childs);
            else if (node?.type === 'file' && /\.(?:w3u|m3u8?)$/i.test(String(node.name || ''))) candidates.push(node);
          });
          collect(children);
          if (!candidates.length) throw new Error('Gofile เปิดโฟลเดอร์ได้ แต่ไม่พบไฟล์ .w3u, .m3u หรือ .m3u8 ภายใน');
          const selected = candidates.length === 1 ? candidates[0] : candidates.find((node) => /\.(?:w3u|m3u8?)$/i.test(String(node.name || '')));
          const downloadUrl = String(selected.link || selected.directLink || '');
          if (!downloadUrl) throw new Error('พบไฟล์ Playlist ใน Gofile แต่ไม่มีลิงก์ดาวน์โหลดโดยตรง');
          sourceUrl = downloadUrl;
          content = (await nativeRequest(downloadUrl, 'GET', { Accept: 'text/plain, application/json, */*' }, undefined, { allowRedirects: true })).body;
        } else {
          const response = await nativeRequest(content, 'GET',
            { Accept: 'application/x-mpegURL, application/vnd.apple.mpegurl, text/plain, application/json, */*' },
            undefined, { allowRedirects: true });
          if (!response.ok) throw new Error(response.status > 0 ? `ดาวน์โหลดไม่สำเร็จ (HTTP ${response.status})` : response.error || 'ไม่สามารถเชื่อมต่อ URL ได้');
          content = response.body;
        }
      }
      if (!content.trim()) throw new Error('ไม่พบเนื้อหา Playlist ในข้อมูลที่ได้รับ');
      const inferredName = file?.name || (sourceUrl ? new URL(sourceUrl).pathname.split('/').pop() : 'Imported Playlist') || 'Imported Playlist';
      const name = playlistName.trim() || inferredName.replace(/\.(?:w3u|m3u8?)$/i, '');
      const parsed = resolvePlaylistContent(content, name, sourceUrl);
      if (!parsed.items.length) throw new Error('ไม่พบรายการสื่อใน Playlist');
      const entry: PlaylistEntry = {
        id: makePlaylistId(), name: playlistName.trim() || parsed.name || name,
        type: parsed.type, source, sourceUrl, itemCount: parsed.items.length,
        groups: parsed.groups, addedAt: file ? `นำเข้าจากไฟล์ ${file.name}` : source === 'url' ? 'นำเข้าจาก URL' : 'เพิ่งนำเข้า',
        items: parsed.items,
      };
      setSavedPlaylists((previous) => [entry, ...previous]);
      setSelectedPlaylist(entry);
      onImportItems(parsed.items, entry.name);
      setSmartInput('');
      setPlaylistName('');
      setStatusMessage({ text: `ตรวจพบ ${parsed.type.toUpperCase()} · นำเข้าสำเร็จ ${parsed.items.length} รายการ`, type: 'success' });
      setActiveTab('manage');
    } catch (error) {
      setStatusMessage({ text: error instanceof Error ? error.message : 'ไม่สามารถอ่าน Playlist ได้', type: 'error' });
    }
  };

  if (!isOpen) return null;

  const handleImportW3U = () => {
    try {
      const content = w3uInput.trim();
      if (!content) throw new Error('กรุณาวางเนื้อหา W3U ก่อนนำเข้า');
      const parsed = parseW3U(content, playlistName || 'Wiseplay W3U List');

      const newEntry: PlaylistEntry = {
        id: makePlaylistId(),
        name: playlistName || parsed.playlist.name,
        type: 'w3u',
        source: 'content',
        itemCount: parsed.items.length,
        groups: parsed.groups,
        addedAt: 'เพิ่งนำเข้า',
        items: parsed.items,
      };

      setSavedPlaylists((previous) => [newEntry, ...previous]);
      setSelectedPlaylist(newEntry);
      onImportItems(parsed.items, newEntry.name);

      setStatusMessage({
        text: `นำเข้า W3U สำเร็จ! พบ ${parsed.items.length} รายการ ใน ${parsed.groups.length} หมวดหมู่`,
        type: 'success',
      });
      setW3uInput('');
      setPlaylistName('');
      setTimeout(() => {
        setActiveTab('manage');
        setStatusMessage(null);
      }, 1200);
    } catch (e: any) {
      setStatusMessage({ text: e.message || 'ไม่สามารถแปลผล W3U ได้', type: 'error' });
    }
  };

  const handleImportM3U = () => {
    try {
      const content = m3uInput.trim();
      if (!content) throw new Error('กรุณาวางเนื้อหา M3U ก่อนนำเข้า');
      const parsed = parseM3U(content, playlistName || 'IPTV Playlist');

      const newEntry: PlaylistEntry = {
        id: makePlaylistId(),
        name: playlistName || 'IPTV Playlist',
        type: 'm3u',
        source: 'content',
        itemCount: parsed.items.length,
        groups: parsed.groups,
        addedAt: 'เพิ่งนำเข้า',
        items: parsed.items,
      };

      setSavedPlaylists((previous) => [newEntry, ...previous]);
      setSelectedPlaylist(newEntry);
      onImportItems(parsed.items, newEntry.name);

      setStatusMessage({
        text: `นำเข้า M3U สำเร็จ! พบ ${parsed.items.length} ช่องถ่ายทอดสด`,
        type: 'success',
      });
      setM3uInput('');
      setPlaylistName('');
      setTimeout(() => {
        setActiveTab('manage');
        setStatusMessage(null);
      }, 1200);
    } catch (e: any) {
      setStatusMessage({ text: 'ไม่สามารถแปลผล M3U ได้', type: 'error' });
    }
  };

  const handleSavePlaylistName = (id: string) => {
    const nextName = renamingName.trim();
    if (!nextName) {
      setStatusMessage({ text: 'กรุณาระบุชื่อเพลย์ลิสต์', type: 'error' });
      return;
    }
    setSavedPlaylists((previous) => previous.map((playlist) =>
      playlist.id === id ? { ...playlist, name: nextName } : playlist
    ));
    setSelectedPlaylist((previous) => previous?.id === id
      ? { ...previous, name: nextName }
      : previous);
    setRenamingPlaylistId(null);
    setRenamingName('');
    setStatusMessage({ text: 'เปลี่ยนชื่อเพลย์ลิสต์แล้ว', type: 'success' });
  };

  const handleRefreshPlaylist = async (playlist: PlaylistEntry) => {
    if (!playlist.sourceUrl) {
      setStatusMessage({ text: 'เพลย์ลิสต์นี้มาจากไฟล์ในเครื่อง จึงไม่มี URL สำหรับอัปเดต', type: 'error' });
      return;
    }
    if (refreshingPlaylistId) return;
    setRefreshingPlaylistId(playlist.id);
    setStatusMessage({ text: 'กำลังอัปเดตเพลย์ลิสต์จาก URL...', type: 'success' });
    try {
      const parsedUrl = new URL(playlist.sourceUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('URL ของเพลย์ลิสต์ไม่ถูกต้อง');
      }
      const response = await nativeRequest(
        parsedUrl.toString(),
        'GET',
        { Accept: 'application/x-mpegURL, application/vnd.apple.mpegurl, text/plain, application/json, */*' },
        undefined,
        { allowRedirects: true },
      );
      if (!response.ok) {
        throw new Error(response.status > 0
          ? `อัปเดตไม่สำเร็จ (HTTP ${response.status})`
          : response.error || 'ไม่สามารถเชื่อมต่อ URL ได้');
      }
      const content = response.body;
      if (!content.trim()) throw new Error('เซิร์ฟเวอร์ตอบกลับเป็นข้อมูลว่าง');
      const parsed = resolvePlaylistContent(content, playlist.name, parsedUrl.toString());
      if (parsed.items.length === 0) {
        throw new Error('ไม่พบรายการสื่อใหม่ จึงเก็บข้อมูลเดิมไว้เพื่อป้องกันข้อมูลสูญหาย');
      }
      const updated: PlaylistEntry = {
        ...playlist,
        type: parsed.type,
        itemCount: parsed.items.length,
        groups: parsed.groups,
        addedAt: `อัปเดตล่าสุด ${new Date().toLocaleString()}`,
        items: parsed.items,
      };
      setSavedPlaylists((previous) => previous.map((entry) =>
        entry.id === playlist.id ? updated : entry
      ));
      setSelectedPlaylist((previous) => previous?.id === playlist.id ? updated : previous);
      onImportItems(parsed.items, updated.name);
      setStatusMessage({ text: `อัปเดตสำเร็จ พบ ${parsed.items.length} รายการ`, type: 'success' });
    } catch (error) {
      setStatusMessage({
        text: error instanceof Error ? error.message : 'อัปเดต Playlist ไม่สำเร็จ',
        type: 'error',
      });
    } finally {
      setRefreshingPlaylistId(null);
    }
  };

  const handleDeletePlaylist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = savedPlaylists.filter((p) => p.id !== id);
    setSavedPlaylists(filtered);
    if (selectedPlaylist?.id === id) {
      setSelectedPlaylist(filtered[0] || null);
    }
  };

  const handlePlayDirectStream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directStreamUrl.trim()) return;

    const newItem: MediaItem = {
      id: `stream-${Date.now()}`,
      title: directStreamTitle.trim() || 'Online Network Stream',
      poster: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=500&auto=format&fit=crop&q=80',
      backdrop: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1280&auto=format&fit=crop&q=80',
      type: directStreamUrl.includes('.m3u8') ? 'channel' : 'stream',
      sourceType: 'w3u',
      streamUrl: directStreamUrl.trim(),
      resolution: '1080p',
      audio: 'Direct Stream',
    };

    onPlaylistItemSelect(newItem);
    onClose();
  };

  const handleExportPlaylist = (playlist: PlaylistEntry) => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(playlist.items, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${playlist.name.replace(/\s+/g, '_')}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setStatusMessage({ text: `ส่งออกเพลย์ลิสต์ "${playlist.name}" สำเร็จ`, type: 'success' });
      setTimeout(() => setStatusMessage(null), 2500);
    } catch {
      setStatusMessage({ text: 'ไม่สามารถส่งออกไฟล์ได้', type: 'error' });
    }
  };

  return (
    <div data-tv-modal="true" data-tv-focus-group="modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <div className="relative w-full max-w-4xl bg-[#090b10] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-white">
              <ListPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                ศูนย์จัดการเพลย์ลิสต์ (W3U & M3U8 Manager)
              </h2>
              <p className="text-xs text-slate-400">
                รองรับไฟล์ w3u ของ Wiseplay อย่างสมบูรณ์ รวมถึง m3u / m3u8 IPTV และสตรีมมีเดียต่างๆ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Action Tabs */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/5 shrink-0">
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'manage'
                ? 'bg-white text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            เพลย์ลิสต์ทั้งหมด ({savedPlaylists.length})
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'import' ? 'bg-white text-black shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <FileCode className="w-4 h-4" />
            เพิ่ม Playlist
          </button>
          <button
            onClick={() => setActiveTab('direct')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'direct'
                ? 'bg-white text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Play className="w-4 h-4" />
            เปิดสตรีมตรง (URL)
          </button>
        </div>

        {/* Status message */}
        {statusMessage && (
          <div
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Manage Playlists Tab (Split View: Playlists list on left, Channel/item list on right) */}
        {activeTab === 'manage' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 overflow-hidden min-h-[350px]">
            {/* Left Column: Playlist list */}
            <div className="md:col-span-5 flex flex-col gap-2.5 overflow-y-auto no-scrollbar pr-1">
              <span className="text-xs font-medium text-slate-400 px-1">
                รายการเพลย์ลิสต์ในเครื่อง
              </span>
              {savedPlaylists.map((pl) => {
                const isSel = selectedPlaylist?.id === pl.id;
                return (
                  <div
                    key={pl.id}
                    role="button"
                    tabIndex={0}
                    aria-label={"เลือกเพลย์ลิสต์ " + pl.name}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedPlaylist(pl);
                      }
                    }}
                    onClick={() => setSelectedPlaylist(pl)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSel
                        ? 'bg-white/10 border-white/40 shadow-lg'
                        : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0">
                        {pl.type === 'w3u' ? (
                          <FileCode className="w-4 h-4 text-sky-400" />
                        ) : (
                          <Tv className="w-4 h-4 text-purple-400" />
                        )}
                      </div>
                      <div className="flex flex-col overflow-hidden flex-1">
                        {renamingPlaylistId === pl.id ? (
                          <input
                            autoFocus
                            value={renamingName}
                            aria-label="ชื่อเพลย์ลิสต์ใหม่"
                            onChange={(event) => setRenamingName(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                event.stopPropagation();
                                handleSavePlaylistName(pl.id);
                              }
                              if (event.key === 'Escape') {
                                event.preventDefault();
                                event.stopPropagation();
                                setRenamingPlaylistId(null);
                              }
                            }}
                            onClick={(event) => event.stopPropagation()}
                            className="w-full min-w-0 px-2 py-1 rounded-lg bg-black/40 border border-cyan-400/50 text-white text-xs focus:outline-none"
                          />
                        ) : (
                          <span className="text-xs font-semibold text-white truncate">{pl.name}</span>
                        )}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                          <span className="uppercase text-slate-300 font-medium">{pl.type}</span>
                          <span aria-hidden="true">·</span>
                          <span>{pl.itemCount} รายการ</span>
                          <span aria-hidden="true">·</span>
                          <span>{pl.groups.length} หมวด</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {renamingPlaylistId === pl.id ? (
                        <>
                          <button
                            onClick={(event) => { event.stopPropagation(); handleSavePlaylistName(pl.id); }}
                            className="p-1.5 rounded-lg text-emerald-300 hover:bg-emerald-500/10"
                            aria-label="บันทึกชื่อเพลย์ลิสต์"
                          ><Check className="w-3.5 h-3.5" /></button>
                          <button
                            onClick={(event) => { event.stopPropagation(); setRenamingPlaylistId(null); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10"
                            aria-label="ยกเลิกเปลี่ยนชื่อ"
                          ><X className="w-3.5 h-3.5" /></button>
                        </>
                      ) : (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setRenamingPlaylistId(pl.id);
                            setRenamingName(pl.name);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                          title="เปลี่ยนชื่อเพลย์ลิสต์"
                          aria-label="เปลี่ยนชื่อเพลย์ลิสต์"
                        ><Pencil className="w-3.5 h-3.5" /></button>
                      )}
                      <button
                        onClick={(event) => handleDeletePlaylist(pl.id, event)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="ลบเพลย์ลิสต์"
                        aria-label="ลบเพลย์ลิสต์"
                      ><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Channels inside selected playlist */}
            <div className="md:col-span-7 flex flex-col gap-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4 overflow-hidden">
              {selectedPlaylist ? (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div className="flex flex-col">
                      <span className="font-semibold text-white text-sm">
                        {selectedPlaylist.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        {selectedPlaylist.groups.join(', ') || 'ไม่มีหมวดหมู่'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedPlaylist.source === 'url' && selectedPlaylist.sourceUrl && (
                        <button
                          onClick={() => void handleRefreshPlaylist(selectedPlaylist)}
                          disabled={refreshingPlaylistId !== null}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 disabled:opacity-40 text-xs flex items-center gap-1 border border-cyan-400/20"
                          title="อัปเดต Playlist จาก URL"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${refreshingPlaylistId === selectedPlaylist.id ? 'animate-spin' : ''}`} />
                          <span>อัปเดต</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleExportPlaylist(selectedPlaylist)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs flex items-center gap-1 border border-white/5 transition-colors"
                        title="ส่งออกเพลย์ลิสต์นี้เป็นไฟล์"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>ส่งออก</span>
                      </button>
                      <span className="text-xs px-2.5 py-1 rounded bg-white/10 text-white font-mono">
                        {selectedPlaylist.itemCount} สตรีม
                      </span>
                    </div>
                  </div>

                  {/* Channel / Item list with instant play */}
                  <div className="flex flex-col gap-1.5 overflow-y-auto no-scrollbar flex-1 pr-1">
                    {selectedPlaylist.items.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        role="button"
                        tabIndex={0}
                        aria-label={"เล่น " + item.title}
                        onKeyDown={(event) => {
                          if (event.target !== event.currentTarget) return;
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onPlaylistItemSelect(item);
                            onClose();
                          }
                        }}
                        onClick={() => {
                          onPlaylistItemSelect(item);
                          onClose();
                        }}
                        className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/10 border border-white/5 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img
                            src={item.poster}
                            alt=""
                            className="w-10 h-7 rounded object-cover bg-slate-800 shrink-0"
                          />
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-xs font-medium text-white truncate">
                              {item.title}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate">
                              {item.group || 'ทั่วไป'} · {item.resolution || '1080p'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 rounded-full bg-white text-black">
                            <Play className="w-3 h-3 fill-current ml-0.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  เลือกเพลย์ลิสต์ทางซ้ายเพื่อดูรายการสตรีม
                </div>
              )}
            </div>
          </div>
        )}

        {/* Smart Playlist Input: format is detected from content, not extension. */}
        {activeTab === 'import' && (
          <div className="flex flex-col gap-4 overflow-y-auto no-scrollbar">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-400">ชื่อเพลย์ลิสต์ (ไม่บังคับ)</label>
              <input type="text" placeholder="ตั้งชื่อ Playlist" value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-300">วาง URL หรือโค้ด Playlist ในช่องเดียว</label>
              <textarea rows={11}
                placeholder={'วางลิงก์ เช่น https://example.com/list หรือโค้ด\n#EXTM3U\n#EXTINF:-1,Channel 1\nhttps://example.com/live.m3u8\n\nหรือวาง JSON/W3U'}
                value={smartInput} onChange={(e) => setSmartInput(e.target.value)}
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400" />
            </div>
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <label className="text-xs font-medium text-slate-300">หรือเลือกไฟล์จากอุปกรณ์ (ตรวจชนิดให้อัตโนมัติ)</label>
              <input type="file" accept=".w3u,.m3u,.m3u8,.json,text/plain,application/json"
                aria-label="เลือกไฟล์ Playlist" onChange={(e) => {
                  const selected = e.currentTarget.files?.[0];
                  if (selected) void handleImportSmart(selected);
                  e.currentTarget.value = '';
                }} className="w-full text-xs text-slate-300" />
            </div>
            <div className="flex items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-slate-500">ระบบแยก W3U / M3U / M3U8 จากข้อมูลจริง ไม่ต้องเลือกประเภท</span>
              <button type="button" onClick={() => void handleImportSmart()}
                className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-slate-200 flex items-center gap-2">
                <Download className="w-4 h-4" /> ตรวจจับและนำเข้า
              </button>
            </div>
          </div>
        )}

        {/* Direct Stream Opener Tab */}
        {activeTab === 'direct' && (
          <form onSubmit={handlePlayDirectStream} className="flex flex-col gap-4 overflow-y-auto no-scrollbar">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-400">
                ชื่อรายการ / ชื่อช่อง (Title)
              </label>
              <input
                type="text"
                placeholder="เช่น My Private Stream, Test HLS Live"
                value={directStreamTitle}
                onChange={(e) => setDirectStreamTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">
                URL ลิงก์สตรีมออนไลน์ (รองรับ .m3u8, .mp4, HLS, WebM, TS)
              </label>
              <input
                type="url"
                required
                placeholder="https://example.com/live/master.m3u8"
                value={directStreamUrl}
                onChange={(e) => setDirectStreamUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex flex-col gap-2 pt-1">
              <span className="text-[11px] text-slate-500">ทดสอบด้วยลิงก์สตรีมเร็ว:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDirectStreamTitle('Akamai Global HLS Test');
                    setDirectStreamUrl('https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8');
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5 transition-colors"
                >
                  Akamai HLS
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDirectStreamTitle('Tears of Steel 4K HLS');
                    setDirectStreamUrl('https://bitmovin-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8');
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5 transition-colors"
                >
                  Tears of Steel 4K
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDirectStreamTitle('Big Buck Bunny HLS');
                    setDirectStreamUrl('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5 transition-colors"
                >
                  Big Buck Bunny
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/5">
              <span className="text-[11px] text-slate-500">
                ตัวเล่นจะเริ่มถอดรหัสฮาร์ดแวร์โดยตรงทันที
              </span>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                เริ่มเล่นสตรีมทันที
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
