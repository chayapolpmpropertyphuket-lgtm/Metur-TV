type NativeVaultBridge = {
  putSecret: (name: string, value: string) => string;
  getSecret: (name: string) => string | null;
  deleteSecret: (name: string) => string;
};

declare global {
  interface Window {
    MeturSecureVault?: NativeVaultBridge;
  }
}

function bridge(): NativeVaultBridge {
  if (typeof window === 'undefined' || !window.MeturSecureVault) {
    throw new Error('การเก็บรหัสผ่านอย่างปลอดภัยรองรับในแอป Android เท่านั้น กรุณาเปิด Metur TV บนอุปกรณ์ Android TV');
  }
  return window.MeturSecureVault;
}

export async function putSecureValue(key: string, value: string): Promise<void> {
  if (!/^[A-Za-z0-9._:-]{1,160}$/.test(key)) {
    throw new Error('รหัสข้อมูลที่เข้ารหัสไม่ถูกต้อง');
  }
  const result = bridge().putSecret(key, value);
  if (result !== 'OK') {
    throw new Error('ไม่สามารถเข้ารหัสและบันทึกข้อมูลสตรีมบน Android Keystore ได้');
  }
}

export async function getSecureValue(key: string): Promise<string | null> {
  if (!/^[A-Za-z0-9._:-]{1,160}$/.test(key)) {
    throw new Error('รหัสข้อมูลที่เข้ารหัสไม่ถูกต้อง');
  }
  return bridge().getSecret(key);
}

export async function deleteSecureValue(key: string): Promise<void> {
  if (!/^[A-Za-z0-9._:-]{1,160}$/.test(key)) {
    throw new Error('รหัสข้อมูลที่เข้ารหัสไม่ถูกต้อง');
  }
  const result = bridge().deleteSecret(key);
  if (result !== 'OK') {
    throw new Error('ไม่สามารถลบข้อมูลสตรีมจากคลังเข้ารหัสได้');
  }
}

function credentialKey(serverId: string, field: 'username' | 'token'): string {
  if (!/^[A-Za-z0-9._-]{1,120}$/.test(serverId)) {
    throw new Error('รหัสเซิร์ฟเวอร์ไม่ถูกต้อง');
  }
  return `server:${serverId}:${field}`;
}

export async function saveServerCredentials(
  serverId: string,
  credentials: { username?: string; token?: string },
): Promise<void> {
  const values: Array<['username' | 'token', string | undefined]> = [
    ['username', credentials.username],
    ['token', credentials.token],
  ];
  if (!values.some(([, value]) => Boolean(value))) return;
  const native = bridge();
  const saved: string[] = [];
  try {
    for (const [field, value] of values) {
      if (!value) continue;
      const key = credentialKey(serverId, field);
      const result = native.putSecret(key, value);
      if (result !== 'OK') {
        throw new Error('ไม่สามารถเข้ารหัสและบันทึกข้อมูลรับรองบนอุปกรณ์ได้');
      }
      saved.push(key);
    }
  } catch (error) {
    for (const key of saved) native.deleteSecret(key);
    throw error;
  }
}

export async function getServerCredential(
  serverId: string,
  field: 'username' | 'token',
): Promise<string | null> {
  return bridge().getSecret(credentialKey(serverId, field));
}

export async function deleteServerCredentials(serverId: string): Promise<void> {
  const native = bridge();
  for (const field of ['username', 'token'] as const) {
    const result = native.deleteSecret(credentialKey(serverId, field));
    if (result !== 'OK') {
      throw new Error('ไม่สามารถลบข้อมูลรับรองจากคลังเข้ารหัสได้');
    }
  }
}
