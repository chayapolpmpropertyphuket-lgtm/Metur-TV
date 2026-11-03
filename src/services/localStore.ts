import type { MediaItem, MediaServerConfig, TVSettings } from '../types';

const DB_NAME = 'metur-tv-local';
const DB_VERSION = 1;
const STORE_NAME = 'app-state';

export interface PersistedAppState {
  settings: TVSettings;
  servers: Array<Omit<MediaServerConfig, 'username' | 'token'>>;
  w3uItems: MediaItem[];
  continueWatching: MediaItem[];
  liveChannels: MediaItem[];
  featuredItems: MediaItem[];
  watchHistory: MediaItem[];
}

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

export async function loadAppState(): Promise<Partial<PersistedAppState> | null> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get('root');
      request.onsuccess = () => resolve(request.result?.value ?? null);
      request.onerror = () => reject(request.error ?? new Error('อ่านข้อมูลในเครื่องไม่สำเร็จ'));
    });
  } finally {
    db.close();
  }
}

export async function saveAppState(state: PersistedAppState): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put({
        key: 'root',
        schemaVersion: DB_VERSION,
        updatedAt: Date.now(),
        value: state,
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('บันทึกข้อมูลในเครื่องไม่สำเร็จ'));
      transaction.onabort = () => reject(transaction.error ?? new Error('การบันทึกถูกยกเลิก'));
    });
  } finally {
    db.close();
  }
}
