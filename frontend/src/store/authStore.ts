import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { authApi } from '@/lib/api';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
  minecraftUsername?: string;
  avatar?: string;
  playTime?: number;
  achievements?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  deviceUuid: string | null;
  // 是否为“可信设备”：决定状态持久化方式（localStorage / sessionStorage）
  trusted: boolean;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, deviceUuid: string, trusted: boolean, expiresIn?: number) => void;
  clearAuth: () => void;
  logout: (scope?: 'current' | 'all') => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

const STORAGE_KEY = 'auth-storage';

/**
 * 可信设备 -> localStorage（关闭浏览器后仍保持登录）
 * 普通会话 -> sessionStorage（关闭浏览器即清除）
 * 写入时根据状态中的 trusted 标志选择存储；读取时两处都尝试。
 */
const splitStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(name) ?? window.sessionStorage.getItem(name);
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return;
    try {
      const parsed = JSON.parse(value);
      const trusted = parsed?.state?.trusted === true;
      window.localStorage.removeItem(name);
      window.sessionStorage.removeItem(name);
      const target = trusted ? window.localStorage : window.sessionStorage;
      target.setItem(name, value);
    } catch {
      window.sessionStorage.setItem(name, value);
    }
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(name);
    window.sessionStorage.removeItem(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      deviceUuid: null,
      trusted: false,
      isAuthenticated: false,

      setAuth: (user, token, deviceUuid, trusted, expiresIn) => {
        // 可信设备 cookie 保留 30 天；普通会话为会话级 cookie
        if (trusted) {
          const expires = expiresIn
            ? new Date(Date.now() + expiresIn * 1000)
            : 30;
          Cookies.set('token', token, { expires });
        } else {
          Cookies.set('token', token);
        }
        set({ user, token, deviceUuid, trusted, isAuthenticated: true });
      },

      clearAuth: () => {
        Cookies.remove('token');
        splitStorage.removeItem(STORAGE_KEY);
        set({ user: null, token: null, deviceUuid: null, trusted: false, isAuthenticated: false });
      },

      logout: async (scope = 'current') => {
        // 通知后端作废旧会话（失败不阻塞本地清理，例如 token 已过期）
        try {
          if (get().token) {
            await authApi.logout(scope);
          }
        } catch {
          // 忽略：本地仍需清除
        }
        get().clearAuth();
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } });
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => splitStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        deviceUuid: state.deviceUuid,
        trusted: state.trusted,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
