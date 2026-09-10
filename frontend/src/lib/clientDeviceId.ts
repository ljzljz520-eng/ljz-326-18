/**
 * 客户端稳定设备标识：
 * 每个浏览器实例生成一次并持久保存在 localStorage，
 * 登录时上送给后端，用于“可信设备”记录复用。
 *
 * 注意：不能用 User-Agent 代替——相同浏览器/系统的多台设备 UA 完全一致，
 * 会导致多台设备共享同一条会话记录，移除其中一台时另一台被一并强制下线。
 */

const STORAGE_KEY = 'client-device-id';

export function getClientDeviceId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 15)}`;
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // localStorage 不可用（隐私模式等）：本次登录不携带设备标识，后端将新建会话记录
    return null;
  }
}
