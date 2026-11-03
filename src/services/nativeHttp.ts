type NativeHttpBridge = {
  request(requestId: string, url: string, method: string, headersJson: string, body: string): void;
};

declare global {
  interface Window {
    MeturNativeHttp?: NativeHttpBridge;
    __meturHttpResolve?: (requestId: string, response: string) => void;
  }
}

export interface NativeHttpResponse<T = unknown> {
  status: number;
  body: string;
  ok: boolean;
  error?: string;
  data?: T;
}

let nextRequestId = 0;
const pending = new Map<string, { resolve: (value: string) => void; reject: (reason: Error) => void; timer: number }>();

if (typeof window !== 'undefined') {
  window.__meturHttpResolve = (requestId, response) => {
    const entry = pending.get(requestId);
    if (!entry) return;
    window.clearTimeout(entry.timer);
    pending.delete(requestId);
    entry.resolve(response);
  };
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

  const requestId = `metur-${Date.now()}-${++nextRequestId}`;
  const raw = await new Promise<string>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pending.delete(requestId);
      reject(new Error('เซิร์ฟเวอร์ใช้เวลาตอบสนองนานเกินไป กรุณาตรวจสอบเครือข่ายและ URL'));
    }, 35000);
    pending.set(requestId, { resolve, reject, timer });
    try {
      window.MeturNativeHttp!.request(
        requestId,
        url,
        method,
        JSON.stringify(headers),
        body === undefined ? '' : JSON.stringify(body),
      );
    } catch (error) {
      window.clearTimeout(timer);
      pending.delete(requestId);
      reject(error instanceof Error ? error : new Error('เริ่มการเชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ'));
    }
  });

  let result: NativeHttpResponse<T>;
  try {
    result = JSON.parse(raw) as NativeHttpResponse<T>;
  } catch {
    throw new Error('รูปแบบการตอบกลับจากระบบเครือข่ายไม่ถูกต้อง');
  }
  if (!result.ok && result.error) throw new Error(result.error);
  if (result.ok && result.body) {
    try {
      result.data = JSON.parse(result.body) as T;
    } catch {
      // Some server endpoints return plain text or XML; preserve the raw body.
    }
  }
  return result;
}
