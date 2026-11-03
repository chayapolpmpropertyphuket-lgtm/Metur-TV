import React, { useEffect, useState } from 'react';
import { MediaItem } from '../types';
import { parseW3U } from '../utils/w3uParser';
import { parseM3U } from '../utils/m3uParser';
import { loadPlaylists, savePlaylists, PersistedPlaylist } from '../services/localStore';
import { nativeRequest } from '../services/nativeHttp';
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
  const [activeTab, setActiveTab] = useState<'manage' | 'import-w3u' | 'import-m3u' | 'direct'>('manage');
  const [w3uInput, setW3uInput] = useState('');
  const [m3uInput, setM3uInput] = useState('');
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
      const extension = file.name.split('.').pop()?.toLowerCase();
      const allowed = type === 'w3u' ? ['w3u', 'json'] : ['m3u', 'm3u8'];
      if (!extension || !allowed.includes(extension)) {
        throw new Error(type === 'w3u'
          ? 'กรุณาเลือกไฟล์ .w3u หรือ .json เท่านั้น'
          : 'กรุณาเลือกไฟล์ .m3u หรือ .m3u8 เท่านั้น');
      }
      if (file.size === 0) throw new Error('ไฟล์นี้ไม่มีข้อมูล');
      if (file.size > 8 * 1024 * 1024) {
        throw new Error('ไฟล์มีขนาดเกิน 8 MB กรุณาใช้ Playlist ที่มีขนาดเล็กลง');
      }

      const content = await file.text();
      if (!content.trim()) throw new Error('ไฟล์นี้ไม่มีเนื้อหา Playlist');
      const name = playlistName.trim() || file.name.replace(/\.[^.]+$/, '');
      const parsed = type === 'w3u'
        ? parseW3U(content, name)
        : parseM3U(content, name);
      if (parsed.items.length === 0) {
        throw new Error('ไม่พบรายการสื่อในไฟล์ หรือโครงสร้าง Playlist ไม่ถูกต้อง');
      }

      const entry: PlaylistEntry = {
        id: makePlaylistId(),
        name,
        type,
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

  const handleImportFromUrl = async (type: 'w3u' | 'm3u') => {
    const sourceUrl = urlInput.trim();
    if (!sourceUrl) {
      setStatusMessage({ text: 'กรุณากรอก URL ของ Playlist', type: 'error' });
      return;
    }

    try {
      const parsedUrl = new URL(sourceUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('รองรับเฉพาะ URL แบบ HTTP หรือ HTTPS');
      }

      setStatusMessage({ text: 'กำลังดาวน์โหลด Playlist จาก URL...', type: 'success' });
      // Fetch through Android's native HTTP bridge to avoid WebView CORS restrictions.
      // Redirects are enabled only for public playlist downloads; authenticated server
      // requests keep redirects disabled so credentials are never forwarded unexpectedly.
      const response = await nativeRequest(
        parsedUrl.toString(),
        'GET',
        { Accept: 'application/x-mpegURL, application/vnd.apple.mpegurl, text/plain, application/json, */*' },
        undefined,
        { allowRedirects: true },
      );
      if (!response.ok) {
        throw new Error(response.status > 0
          ? `ดาวน์โหลดไม่สำเร็จ (HTTP ${response.status})`
          : response.error || 'ไม่สามารถเชื่อมต่อ URL ได้');
      }

      const content = response.body;
      if (!content.trim()) throw new Error('เซิร์ฟเวอร์ตอบกลับเป็นไฟล์ว่าง');
      if (/^\s*<(?:!doctype\s+html|html|head|body)\b/i.test(content)) {
        throw new Error('URL นี้ส่งหน้าเว็บ HTML กลับมา ไม่ใช่ไฟล์ Playlist (อาจต้องใช้ลิงก์ดาวน์โหลดโดยตรงหรือเข้าสู่ระบบก่อน)');
      }
      let nameFromUrl = parsedUrl.pathname.split('/').pop() || 'Remote Playlist';
      try { nameFromUrl = decodeURIComponent(nameFromUrl); } catch { /* Keep the encoded filename. */ }
      const name = playlistName.trim() || nameFromUrl;
      const parsed = type === 'w3u'
        ? parseW3U(content, name, parsedUrl.toString())
        : parseM3U(content, name, parsedUrl.toString());

      if (parsed.items.length === 0) {
        throw new Error('ไม่พบรายการสื่อใน Playlist หรือรูปแบบไฟล์ไม่ตรงกับประเภทที่เลือก');
      }

      const entry: PlaylistEntry = {
        id: makePlaylistId(),
        name,
        type,
        source: 'url',
        sourceUrl: parsedUrl.toString(),
        itemCount: parsed.items.length,
        groups: parsed.groups,
        addedAt: 'นำเข้าจาก URL',
        items: parsed.items,
      };

      setSavedPlaylists((previous) => [entry, ...previous]);
      setSelectedPlaylist(entry);
      onImportItems(parsed.items, entry.name);
      setUrlInput('');
      setPlaylistName('');
      setStatusMessage({ text: `นำเข้า ${type.toUpperCase()} สำเร็จ ${parsed.items.length} รายการ`, type: 'success' });
      setActiveTab('manage');
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'ไม่สามารถนำเข้า Playlist จาก URL ได้';
      setStatusMessage({ text: message, type: 'error' });
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
      if (!content.trim() || /^\s*<(?:!doctype\s+html|html|head|body)\b/i.test(content)) {
        throw new Error('URL ไม่ได้ส่งข้อมูล Playlist ที่ถูกต้องกลับมา');
      }
      const parsed = playlist.type === 'w3u'
        ? parseW3U(content, playlist.name, parsedUrl.toString())
        : parseM3U(content, playlist.name, parsedUrl.toString());
      if (parsed.items.length === 0) {
        throw new Error('ไม่พบรายการสื่อใหม่ จึงเก็บข้อมูลเดิมไว้เพื่อป้องกันข้อมูลสูญหาย');
      }
      const updated: PlaylistEntry = {
        ...playlist,
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
            onClick={() => setActiveTab('import-w3u')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'import-w3u'
                ? 'bg-white text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4" />
            นำเข้า W3U (Wiseplay)
          </button>
          <button
            onClick={() => setActiveTab('import-m3u')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'import-m3u'
                ? 'bg-white text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tv className="w-4 h-4" />
            นำเข้า M3U / M3U8
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
                        onClick={() => handleExportPlaylist(selectedPlaylist)
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

        {/* Import W3U Tab */}
        {activeTab === 'import-w3u' && (
          <div className="flex flex-col gap-4 overflow-y-auto no-scrollbar">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-400">ชื่อเพลย์ลิสต์ W3U</label>
              <input
                type="text"
                placeholder="เช่น Wiseplay Cinema Thai, Sports 2026"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <label className="text-xs font-medium text-slate-300">นำเข้าไฟล์ W3U จากอุปกรณ์</label>
              <input
                type="file"
                accept=".w3u,.json,application/json,text/plain"
                aria-label="เลือกไฟล์ W3U หรือ JSON"
                onChange={(event) => {
                  const selectedFile = event.currentTarget.files?.[0];
                  void handleImportFile(selectedFile, 'w3u');
                  event.currentTarget.value = '';
                }}
                className="w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-black focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>

            <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <label className="text-xs font-medium text-slate-300">หรือโหลด W3U จาก URL</label>
              <input
                type="url"
                placeholder="https://example.com/playlist.w3u"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-white"
              />
              <button type="button" onClick={() => handleImportFromUrl('w3u')} className="self-end px-4 py-2 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/15">
                โหลดและนำเข้า W3U จาก URL
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">
                เนื้อหา JSON ของ W3U (โครงสร้าง groups, stations, url)
              </label>
              <textarea
                rows={8}
                placeholder="วางโค้ด JSON ของ w3u ที่นี่..."
                value={w3uInput}
                onChange={(e) => setW3uInput(e.target.value)}
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">
                รองรับการถอดรหัส groups, stations, headers (User-Agent/Referer)
              </span>
              <button
                onClick={handleImportW3U}
                className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                เริ่มแปลผลและนำเข้า W3U
              </button>
            </div>
          </div>
        )}

        {/* Import M3U Tab */}
        {activeTab === 'import-m3u' && (
          <div className="flex flex-col gap-4 overflow-y-auto no-scrollbar">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-400">ชื่อเพลย์ลิสต์ M3U / IPTV</label>
              <input
                type="text"
                placeholder="เช่น Thai Digital TV, World News M3U8"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <label className="text-xs font-medium text-slate-300">นำเข้าไฟล์ M3U / M3U8 จากอุปกรณ์</label>
              <input
                type="file"
                accept=".m3u,.m3u8,audio/x-mpegurl,application/vnd.apple.mpegurl,text/plain"
                aria-label="เลือกไฟล์ M3U หรือ M3U8"
                onChange={(event) => {
                  const selectedFile = event.currentTarget.files?.[0];
                  void handleImportFile(selectedFile, 'm3u');
                  event.currentTarget.value = '';
                }}
                className="w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-black focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>

            <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <label className="text-xs font-medium text-slate-300">หรือโหลด M3U / M3U8 จาก URL</label>
              <input
                type="url"
                placeholder="https://example.com/playlist.m3u"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-white"
              />
              <button type="button" onClick={() => handleImportFromUrl('m3u')} className="self-end px-4 py-2 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/15">
                โหลดและนำเข้า M3U จาก URL
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">
                เนื้อหา M3U (#EXTM3U, #EXTINF และ URL สตรีม)
              </label>
              <textarea
                rows={8}
                placeholder="#EXTM3U&#10;#EXTINF:-1 tvg-name=&quot;Channel 1&quot; group-title=&quot;News&quot;,Channel 1&#10;https://example.com/live.m3u8"
                value={m3uInput}
                onChange={(e) => setM3uInput(e.target.value)}
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">
                รองรับการตรวจจับ tvg-logo, group-title และ stream headers
              </span>
              <button
                onClick={handleImportM3U}
                className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                เริ่มแปลผลและนำเข้า M3U
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
