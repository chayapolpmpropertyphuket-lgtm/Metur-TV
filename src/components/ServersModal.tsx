import React, { useState } from 'react';
import { MediaServerConfig } from '../types';
import {
  Server,
  Plus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldCheck,
  HardDrive,
  X,
} from 'lucide-react';

interface ServersModalProps {
  servers: MediaServerConfig[];
  isOpen: boolean;
  onClose: () => void;
  onAddServer: (server: MediaServerConfig) => void;
  onRemoveServer: (id: string) => void;
}

export const ServersModal: React.FC<ServersModalProps> = ({
  servers,
  isOpen,
  onClose,
  onAddServer,
  onRemoveServer,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [serverType, setServerType] = useState<'jellyfin' | 'emby' | 'plex' | 'webdav'>('jellyfin');
  const [serverName, setServerName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [testingStatus, setTestingStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestAndSave = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUrl = serverUrl.trim();
    if (!normalizedUrl) return;

    try {
      const parsedUrl = new URL(normalizedUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('รองรับเฉพาะ URL แบบ HTTP หรือ HTTPS');
      }

      const newServer: MediaServerConfig = {
        id: `srv-${Date.now()}`,
        name: serverName.trim() || `${serverType.toUpperCase()} Server`,
        type: serverType,
        url: normalizedUrl.replace(/\/$/, ''),
        username: username.trim() || undefined,
        token: token || undefined,
        status: 'disconnected',
        itemCount: 0,
      };

      onAddServer(newServer);
      setTestingStatus('บันทึกแหล่งเซิร์ฟเวอร์แล้ว แต่ยังไม่ได้ทดสอบการเชื่อมต่อจริง');
      setActiveTab('list');
      setServerName('');
      setServerUrl('');
      setUsername('');
      setToken('');
    } catch (error) {
      setTestingStatus(error instanceof Error ? error.message : 'URL ไม่ถูกต้อง');
    }
  };

  const getServerBadgeColor = (type: string) => {
    switch (type) {
      case 'jellyfin':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'emby':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'plex':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <div className="relative w-full max-w-2xl bg-[#090b10] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-white">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                มีเดียเซิร์ฟเวอร์ (Media Servers)
              </h2>
              <p className="text-xs text-slate-400">
                เชื่อมต่อ Jellyfin, Emby, Plex, WebDAV และสตรีมโดยตรงบน Android TV
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

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/5">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'list'
                ? 'bg-white text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            เซิร์ฟเวอร์ที่เชื่อมต่อ ({servers.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'add'
                ? 'bg-white text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            เพิ่มเซิร์ฟเวอร์ใหม่
          </button>
        </div>

        {/* Server List Tab */}
        {activeTab === 'list' && (
          <div className="flex flex-col gap-3">
            {servers.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                <HardDrive className="w-12 h-12 text-slate-600" />
                <p className="text-sm text-slate-400">ยังไม่มีเซิร์ฟเวอร์ที่เชื่อมต่อ</p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="px-4 py-2 rounded-xl bg-white text-black text-xs font-medium hover:bg-slate-200"
                >
                  เชื่อมต่อเซิร์ฟเวอร์แรก
                </button>
              </div>
            ) : (
              servers.map((srv) => (
                <div
                  key={srv.id}
                  className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 overflow-hidden">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
                      <Server className="w-5 h-5 text-slate-300" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm truncate">
                          {srv.name}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border uppercase ${getServerBadgeColor(
                            srv.type
                          )}`}
                        >
                          {srv.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 truncate">
                        <span className="font-mono">{srv.url}</span>
                        <span aria-hidden="true">·</span>
                        <span>{srv.itemCount.toLocaleString()} สื่อที่ซิงค์</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onRemoveServer(srv.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="ลบการเชื่อมต่อ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Add Server Form Tab */}
        {activeTab === 'add' && (
          <form onSubmit={handleTestAndSave} className="flex flex-col gap-4">
            {/* Server Type Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-slate-400">เลือกประเภทเซิร์ฟเวอร์</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'jellyfin', label: 'Jellyfin' },
                  { id: 'emby', label: 'Emby' },
                  { id: 'plex', label: 'Plex' },
                  { id: 'webdav', label: 'WebDAV' },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setServerType(type.id as any)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize transition-all ${
                      serverType === type.id
                        ? 'bg-white text-black border-white shadow-md'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Server Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">ชื่อเซิร์ฟเวอร์ที่ต้องการแสดง</label>
              <input
                type="text"
                placeholder="เช่น ห้องนั่งเล่น Jellyfin, Home NAS"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {/* Server URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">
                Server URL (เช่น http://192.168.1.100:8096 หรือ https://plex.mydomain.com)
              </label>
              <input
                type="text"
                required
                placeholder="http://192.168.1.xxx:8096"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {/* Username / Token */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400">ชื่อผู้ใช้ (Username)</label>
                <input
                  type="text"
                  placeholder="admin หรือ ชื่อผู้ใช้"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400">API Key หรือ Token (ถ้ามี)</label>
                <input
                  type="password"
                  placeholder="Optional Token / Key"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>

            {/* Connection status feedback */}
            {testingStatus && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                <span>{testingStatus}</span>
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                บันทึกเซิร์ฟเวอร์
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
