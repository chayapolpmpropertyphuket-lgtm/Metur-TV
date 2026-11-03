type NativeHttpBridge = {
  request(url: string, method: string, headersJson: string, body: string): string;
};

declare global {
  interface Window {
    MeturNativeHttp?: NativeHttpBridge;
  }
}

export interface NativeHttpResponse<T = unknown> {
  status: number;
  body: string;
  ok: boolean;
  error?: string;
  data?: T;
}

export async function nativeRequest<T = unknown>(
  url: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  headers: Record<string, string> = {},
  body?: unknown,
): Promise<NativeHttpResponse<T>> {
  if (typeof window === 'undefined' || !window.MeturNativeHttp) {
    throw new Error('การเชื่อมต่อ Media Server ต้องทำผ่านแอป Metur TV บน Android TV');
  }
  const raw = window.MeturNativeHttp.request(
    url,
    method,
    JSON.stringify(headers),
    body === undefined ? '' : JSON.stringify(body),
  );
  let result: NativeHttpResponse<T>;
  try {
    result = JSON.parse(raw) as NativeHttpResponse<T>;
  } catch {
    throw new Error('รูปแบบการตอบกลับจากระบบเครือข่ายไม่ถูกต้อง');
  }
  if (result.ok && result.body) {
    try {
      result.data = JSON.parse(result.body) as T;
    } catch {
      // Some server endpoints return plain text or XML; preserve the raw body.
    }
  }
  return result;
}
