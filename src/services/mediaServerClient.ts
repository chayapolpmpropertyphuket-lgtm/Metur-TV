import { MediaItem, MediaServerConfig } from '../types';
import { nativeRequest } from './nativeHttp';
import { getServerCredential, saveServerCredentials } from './secureVault';

const clientHeader = 'MediaBrowser Client="Metur TV", Device="Android TV", DeviceId="metur-tv-android", Version="1.0.0"';

interface AuthResult {
  AccessToken?: string;
  User?: { Id?: string; Name?: string };
  Id?: string;
  Name?: string;
}

interface ServerItemsResult {
  Items?: Array<Record<string, unknown>>;
  TotalRecordCount?: number;
}

function apiUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function parseJson<T>(body: string, message: string): T {
  try { return JSON.parse(body) as T; }
  catch { throw new Error(message); }
}

function mapServerItem(raw: Record<string, unknown>, server: MediaServerConfig, accessToken: string): MediaItem | null {
  const id = String(raw.Id ?? '');
  const title = String(raw.Name ?? '').trim();
  const rawType = String(raw.Type ?? '');
  if (!id || !title) return null;
  let type: MediaItem['type'];
  if (rawType === 'Movie') type = 'movie';
  else if (rawType === 'Series') type = 'series';
  else if (rawType === 'Episode') type = 'episode';
  else return null;

  const imageBase = apiUrl(server.url, `Items/${encodeURIComponent(id)}/Images`);
  const genres = Array.isArray(raw.Genres) ? raw.Genres.map(String) : [];
  const ticks = Number(raw.RunTimeTicks ?? 0);
  const year = Number(raw.ProductionYear ?? 0);
  const poster = raw.ImageTags && typeof raw.ImageTags === 'object'
    && (raw.ImageTags as Record<string, unknown>).Primary
    ? `${imageBase}/Primary?maxWidth=480&api_key=${encodeURIComponent(accessToken)}`
    : '';
  const backdrop = Array.isArray(raw.BackdropImageTags) && raw.BackdropImageTags.length
    ? `${imageBase}/Backdrop/0?maxWidth=1280&api_key=${encodeURIComponent(accessToken)}`
    : poster;
  return {
    id: `${server.id}:${id}`,
    title,
    overview: String(raw.Overview ?? ''),
    poster,
    backdrop,
    type,
    sourceType: server.type,
    streamUrl: '',
    duration: ticks > 0 ? Math.round(ticks / 10000000) : undefined,
    year: year > 0 ? year : undefined,
    genres,
    serverName: server.name,
    serverId: server.id,
    serverItemId: id,
  };
}

async function getCurrentUser(server: MediaServerConfig, accessToken: string): Promise<AuthResult> {
  const response = await nativeRequest<AuthResult>(
    apiUrl(server.url, 'Users/Me'),
    'GET',
    { 'X-Emby-Token': accessToken, 'X-Emby-Authorization': clientHeader },
  );
  if (!response.ok) throw new Error(`ตรวจสอบ API Token ไม่สำเร็จ (HTTP ${response.status})`);
  return response.data ?? parseJson<AuthResult>(response.body, 'ข้อมูลผู้ใช้จากเซิร์ฟเวอร์ไม่ถูกต้อง');
}

export interface MediaServerConnectionResult {
  server: MediaServerConfig;
  items: MediaItem[];
  userName?: string;
}

export async function connectJellyfinOrEmby(
  server: MediaServerConfig,
  username: string,
  passwordOrApiToken: string,
): Promise<MediaServerConnectionResult> {
  if (server.type !== 'jellyfin' && server.type !== 'emby') {
    throw new Error('รอบนี้รองรับการเชื่อมต่อจริงเฉพาะ Jellyfin และ Emby');
  }
  const base = server.url.replace(/\/$/, '');
  let accessToken = '';
  let user: AuthResult;

  if (passwordOrApiToken) {
    const auth = await nativeRequest<AuthResult>(
      apiUrl(base, 'Users/AuthenticateByName'),
      'POST',
      { 'X-Emby-Authorization': clientHeader },
      { Username: username, Pw: passwordOrApiToken },
    );
    if (auth.ok) {
      const data = auth.data ?? parseJson<AuthResult>(auth.body, 'ข้อมูลยืนยันตัวตนไม่ถูกต้อง');
      accessToken = String(data.AccessToken ?? '');
      user = data.User ?? {};
    } else {
      // If the supplied value is an API token, validate it with /Users/Me.
      try {
        user = await getCurrentUser(server, passwordOrApiToken);
        accessToken = passwordOrApiToken;
      } catch {
        throw new Error(`เข้าสู่ระบบไม่สำเร็จ (HTTP ${auth.status}) กรุณาตรวจ Username และ Password หรือ API Token`);
      }
    }
  } else {
    throw new Error('กรุณากรอก Password หรือ API Token');
  }

  const userId = String(user.Id ?? '');
  if (!accessToken || !userId) {
    throw new Error('เซิร์ฟเวอร์ยืนยันตัวตนไม่ครบถ้วน ไม่พบ Access Token หรือ User ID');
  }

  const itemsResponse = await nativeRequest<ServerItemsResult>(
    apiUrl(base, `Users/${encodeURIComponent(userId)}/Items?Recursive=true&IncludeItemTypes=Movie,Series,Episode&Fields=Overview,Genres,ProductionYear,RunTimeTicks,ImageTags,BackdropImageTags&SortBy=DateCreated&SortOrder=Descending&Limit=300`),
    'GET',
    { 'X-Emby-Token': accessToken, 'X-Emby-Authorization': clientHeader },
  );
  if (!itemsResponse.ok) {
    throw new Error(`เข้าสู่ระบบสำเร็จ แต่ดึงรายการสื่อไม่สำเร็จ (HTTP ${itemsResponse.status})`);
  }
  const payload = itemsResponse.data ?? parseJson<ServerItemsResult>(itemsResponse.body, 'รายการสื่อจากเซิร์ฟเวอร์ไม่ถูกต้อง');
  const items = (payload.Items ?? [])
    .map((item) => mapServerItem(item, server, accessToken))
    .filter((item): item is MediaItem => item !== null);

  await saveServerCredentials(server.id, { username, token: accessToken });

  return {
    server: {
      ...server,
      username: undefined,
      token: undefined,
      status: 'connected',
      itemCount: items.length,
      lastSync: new Date().toISOString(),
    },
    items,
    userName: user.Name,
  };
}

export async function buildAuthenticatedStreamUrl(item: MediaItem, server: MediaServerConfig): Promise<string> {
  if (!item.serverItemId || !item.serverId) return item.streamUrl;
  const token = await getServerCredential(item.serverId, 'token');
  if (!token) throw new Error('ไม่พบ Access Token ที่เข้ารหัสไว้ กรุณาเชื่อมต่อเซิร์ฟเวอร์ใหม่');
  return `${apiUrl(server.url, `Videos/${encodeURIComponent(item.serverItemId)}/stream`)}?static=true&api_key=${encodeURIComponent(token)}`;
}
