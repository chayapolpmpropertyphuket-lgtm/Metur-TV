import type { MediaItem, MediaServerConfig, TVSettings } from '../types';
import { deleteSecureValue, getSecureValue, putSecureValue } from './secureVault';

const DB_NAME = 'metur-tv-local';
const DB_VERSION = 1;
const STORE_NAME = 'app-state';
let secureWriteSequence = 0;

export interface PersistedPlaylist {
  id: string;
  name: string;
  type: 'w3u' | 'm3u';
  source: 'url' | 'content';
  itemCount: number;
  groups: string[];
  addedAt: string;
  items: MediaItem[];
}

export interface PersistedAppState {
  settings: TVSettings;
  servers: Array<Omit<MediaServerConfig, 'username' | 'token'>>;
  w3uItems: MediaItem[];
  continueWatching: MediaItem[];
  liveChannels: MediaItem[];
  featuredItems: MediaItem[];
  watchHistory: MediaItem[];
}

type StoredMediaItem = Omit<MediaItem, 'streamUrl' | 'headers'> & {
  streamUrl?: string;
  headers?: Record<string, string>;
  secureRef?: string;
};

type StoredPlaylist = Omit<PersistedPlaylist, 'items'> & { items: StoredMediaItem[] };
type StoredAppState = Omit<PersistedAppState,
  'w3uItems' | 'continueWatching' | 'liveChannels' | 'featuredItems' | 'watchHistory'> & {
    w3uItems: StoredMediaItem[];
    continueWatching: StoredMediaItem[];
    liveChannels: StoredMediaItem[];
    featuredItems: StoredMediaItem[];
    watchHistory: StoredMediaItem[];
  };

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('อุปกรณ์นี้ไม่รองรับ IndexedDB'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('เปิดฐานข้อมูลในเครื่องไม่สำเร็จ'));
    request.onblocked = () => reject(new Error('ฐานข้อมูลถูกบล็อก กรุณาปิดแอป Metur TV ที่เปิดซ้ำ'));
  });
}

function readRecord<T>(db: IDBDatabase, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve((request.result?.value as T | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('อ่านข้อมูลในเครื่องไม่สำเร็จ'));
  });
}

function writeRecord<T>(db: IDBDatabase, key: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put({
      key,
      schemaVersion: DB_VERSION,
      updatedAt: Date.now(),
      value,
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('บันทึกข้อมูลไม่สำเร็จ'));
    transaction.onabort = () => reject(transaction.error ?? new Error('การบันทึกถูกยกเลิก'));
  });
}

function hasSensitiveStreamData(item: MediaItem): boolean {
  if (item.headers && Object.keys(item.headers).length > 0) return true;
  const url = item.streamUrl || '';
  if (/[?#]/.test(url)) return true;
  try {
    const parsed = new URL(url);
    return Boolean(parsed.username || parsed.password);
  } catch {
    return /:\/\/[^/]*@/.test(url);
  }
}

function makeSecureRef(namespace: string, index: number): string {
  const safeNamespace = namespace.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 65);
  // Use a fresh reference for each write. This keeps the previous encrypted value
  // intact until the IndexedDB transaction commits successfully.
  secureWriteSequence += 1;
  return `media:${safeNamespace}:${Date.now().toString(36)}:${secureWriteSequence}:${index}`;
}

async function serializeItems(namespace: string, items: MediaItem[]): Promise<StoredMediaItem[]> {
  return Promise.all(items.map(async (item, index) => {
    if (!hasSensitiveStreamData(item)) return { ...item };
    const secureRef = makeSecureRef(namespace, index);
    const payload = JSON.stringify({ streamUrl: item.streamUrl, headers: item.headers ?? null });
    await putSecureValue(secureRef, payload);
    const { streamUrl: _streamUrl, headers: _headers, ...safeItem } = item;
    return { ...safeItem, streamUrl: undefined, headers: undefined, secureRef };
  }));
}

async function deserializeItems(items: StoredMediaItem[]): Promise<MediaItem[]> {
  return Promise.all(items.map(async (stored) => {
    if (!stored.secureRef) return { ...stored, streamUrl: stored.streamUrl ?? '' } as MediaItem;
    const payload = await getSecureValue(stored.secureRef);
    if (!payload) {
      return { ...stored, streamUrl: '', headers: undefined } as MediaItem;
    }
    try {
      const secret = JSON.parse(payload) as { streamUrl?: string; headers?: Record<string, string> | null };
      const { secureRef: _secureRef, ...safeItem } = stored;
      return {
        ...safeItem,
        streamUrl: secret.streamUrl ?? '',
        ...(secret.headers ? { headers: secret.headers } : {}),
      } as MediaItem;
    } catch {
      const { secureRef: _secureRef, ...safeItem } = stored;
      return { ...safeItem, streamUrl: '', headers: undefined } as MediaItem;
    }
  }));
}

function collectSecureRefs(value: unknown): Set<string> {
  const refs = new Set<string>();
  const visit = (candidate: unknown): void => {
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }
    if (!candidate || typeof candidate !== 'object') return;
    const record = candidate as Record<string, unknown>;
    if (typeof record.secureRef === 'string') refs.add(record.secureRef);
    Object.values(record).forEach(visit);
  };
  visit(value);
  return refs;
}

async function removeStaleSecureValues(previous: unknown, next: unknown): Promise<void> {
  const nextRefs = collectSecureRefs(next);
  const stale = [...collectSecureRefs(previous)].filter((ref) => !nextRefs.has(ref));
  await Promise.all(stale.map((ref) => deleteSecureValue(ref).catch(() => undefined)));
}

function hasLegacySensitiveItems(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasLegacySensitiveItems);
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.streamUrl === 'string' && !record.secureRef) {
    const item = record as unknown as MediaItem;
    if (hasSensitiveStreamData(item)) return true;
  }
  return Object.values(record).some(hasLegacySensitiveItems);
}

async function serializeAppState(state: PersistedAppState): Promise<StoredAppState> {
  const [w3uItems, continueWatching, liveChannels, featuredItems, watchHistory] = await Promise.all([
    serializeItems('app-w3u', state.w3uItems),
    serializeItems('app-continue', state.continueWatching),
    serializeItems('app-live', state.liveChannels),
    serializeItems('app-featured', state.featuredItems),
    serializeItems('app-history', state.watchHistory),
  ]);
  return { ...state, w3uItems, continueWatching, liveChannels, featuredItems, watchHistory };
}

async function deserializeAppState(state: StoredAppState): Promise<PersistedAppState> {
  const [w3uItems, continueWatching, liveChannels, featuredItems, watchHistory] = await Promise.all([
    deserializeItems(state.w3uItems ?? []),
    deserializeItems(state.continueWatching ?? []),
    deserializeItems(state.liveChannels ?? []),
    deserializeItems(state.featuredItems ?? []),
    deserializeItems(state.watchHistory ?? []),
  ]);
  return { ...state, w3uItems, continueWatching, liveChannels, featuredItems, watchHistory };
}

export async function loadAppState(): Promise<Partial<PersistedAppState> | null> {
  const db = await openDatabase();
  try {
    const stored = await readRecord<StoredAppState>(db, 'root');
    if (!stored) return null;
    const restored = await deserializeAppState(stored);
    // Migrate older records that kept tokenized stream URLs or request headers in IndexedDB.
    if (hasLegacySensitiveItems(stored)) {
      const migrated = await serializeAppState(restored);
      await writeRecord(db, 'root', migrated);
      await removeStaleSecureValues(stored, migrated);
    }
    return restored;
  } finally {
    db.close();
  }
}

export async function loadPlaylists(): Promise<PersistedPlaylist[]> {
  const db = await openDatabase();
  try {
    const stored = await readRecord<StoredPlaylist[]>(db, 'playlists') ?? [];
    const restored = await Promise.all(stored.map(async (playlist) => ({
      ...playlist,
      items: await deserializeItems(playlist.items ?? []),
    })));
    if (hasLegacySensitiveItems(stored)) {
      const migrated = await Promise.all(restored.map(async (playlist) => ({
        ...playlist,
        items: await serializeItems(`playlist-${playlist.id}`, playlist.items),
      })));
      await writeRecord(db, 'playlists', migrated);
      await removeStaleSecureValues(stored, migrated);
    }
    return restored;
  } finally {
    db.close();
  }
}

export async function savePlaylists(playlists: PersistedPlaylist[]): Promise<void> {
  const db = await openDatabase();
  try {
    const previous = await readRecord<StoredPlaylist[]>(db, 'playlists') ?? [];
    const stored = await Promise.all(playlists.map(async (playlist) => ({
      ...playlist,
      items: await serializeItems(`playlist-${playlist.id}`, playlist.items),
    })));
    await writeRecord(db, 'playlists', stored);
    await removeStaleSecureValues(previous, stored);
  } finally {
    db.close();
  }
}

export async function saveAppState(state: PersistedAppState): Promise<void> {
  const db = await openDatabase();
  try {
    const previous = await readRecord<StoredAppState>(db, 'root');
    const stored = await serializeAppState(state);
    await writeRecord(db, 'root', stored);
    await removeStaleSecureValues(previous, stored);
  } finally {
    db.close();
  }
}
