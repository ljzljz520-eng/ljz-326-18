import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

declare module 'axios' {
  export interface AxiosRequestConfig {
    // 401 时不强制跳转登录页（如退出登录、设备列表加载等场景）
    skipAuthRedirect?: boolean;
    // 出错时不弹全局 toast
    skipErrorToast?: boolean;
  }
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const message = error.response?.data?.message || '网络请求失败，请稍后重试';
    const skipAuthRedirect = error.config?.skipAuthRedirect;
    const skipErrorToast = error.config?.skipErrorToast;

    if (error.response?.status === 401 && !skipAuthRedirect) {
      Cookies.remove('token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } else if (!skipErrorToast) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

// 封装请求方法，返回正确的类型
const request = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    api.get(url, config) as Promise<T>,
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    api.post(url, data, config) as Promise<T>,
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    api.patch(url, data, config) as Promise<T>,
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    api.delete(url, config) as Promise<T>,
};

// Auth API
export const authApi = {
  register: (data: { username: string; email: string; password: string; minecraftUsername?: string }) =>
    request.post('/auth/register', data),
  login: (data: { email: string; password: string; rememberMe?: boolean; deviceName?: string; clientDeviceId?: string | null }) =>
    request.post<LoginResponse>('/auth/login', data),
  logout: (scope: 'current' | 'all' = 'current') =>
    request.post<{ message: string }>(
      '/auth/logout',
      { scope },
      { skipAuthRedirect: true, skipErrorToast: true },
    ),
  forgotPassword: (data: { email: string }) =>
    request.post('/auth/forgot-password', data),
  resetPassword: (data: { token: string; password: string }) =>
    request.post('/auth/reset-password', data),
  verifyEmail: (token: string) =>
    request.get(`/auth/verify-email?token=${token}`),
};

export interface DeviceInfo {
  id: number;
  name: string;
  trusted: boolean;
  ip: string | null;
  lastLoginAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  isCurrent: boolean;
  user?: { id: number; username: string; email: string };
}

export interface LoginResponse {
  accessToken: string;
  user: any;
  message: string;
  trusted: boolean;
  deviceUuid: string;
  expiresIn: number;
}

// 设备管理 API
export const deviceApi = {
  list: () => request.get<DeviceInfo[]>('/devices'),
  rename: (id: number, name: string) =>
    request.patch<DeviceInfo>(`/devices/${id}`, { name }),
  remove: (id: number) =>
    request.delete<{ message: string }>(`/devices/${id}`),
  // 管理员
  listAll: () => request.get<DeviceInfo[]>('/devices/admin/all'),
  listByUser: (userId: number) =>
    request.get<DeviceInfo[]>(`/devices/admin/users/${userId}`),
  removeAsAdmin: (id: number) =>
    request.delete<{ message: string }>(`/devices/admin/${id}`),
};

// User API
export const userApi = {
  getProfile: () => request.get<any>('/users/profile'),
  updateProfile: (data: { minecraftUsername?: string; avatar?: string }) =>
    request.patch<any>('/users/profile', data),
  getAll: () => request.get<any[]>('/users'),
};

// News API
export const newsApi = {
  getAll: (all?: boolean) => request.get<any[]>(`/news${all ? '?all=true' : ''}`),
  getLatest: (limit?: number) => request.get<any[]>(`/news/latest${limit ? `?limit=${limit}` : ''}`),
  getOne: (id: number) => request.get<any>(`/news/${id}`),
  create: (data: any) => request.post('/news', data),
  update: (id: number, data: any) => request.patch(`/news/${id}`, data),
  delete: (id: number) => request.delete(`/news/${id}`),
};

// QA API
export const qaApi = {
  getAll: (all?: boolean) => request.get<any[]>(`/qa${all ? '?all=true' : ''}`),
  getCategories: () => request.get<string[]>('/qa/categories'),
  getByCategory: (category: string) => request.get<any[]>(`/qa/category/${category}`),
  search: (keyword: string) => request.get<any[]>(`/qa/search?keyword=${keyword}`),
  getOne: (id: number) => request.get<any>(`/qa/${id}`),
  create: (data: any) => request.post('/qa', data),
  update: (id: number, data: any) => request.patch(`/qa/${id}`, data),
  delete: (id: number) => request.delete(`/qa/${id}`),
};

// Server Status API
export const serverApi = {
  getStatus: () => request.get<any>('/server-status'),
  getInfo: () => request.get<any>('/server-status/info'),
  getHistory: (limit?: number) => request.get<any[]>(`/server-status/history${limit ? `?limit=${limit}` : ''}`),
  updateStatus: (data: any) => request.post('/server-status', data),
};

// Leaderboard API
export const leaderboardApi = {
  getPlaytime: (limit?: number) => request.get<any[]>(`/leaderboard/playtime${limit ? `?limit=${limit}` : ''}`),
  getAchievements: (limit?: number) => request.get<any[]>(`/leaderboard/achievements${limit ? `?limit=${limit}` : ''}`),
};

// Announcements API
export const announcementApi = {
  getAll: (all?: boolean) => request.get<any[]>(`/announcements${all ? '?all=true' : ''}`),
  getLatest: (limit?: number) => request.get<any[]>(`/announcements/latest${limit ? `?limit=${limit}` : ''}`),
  getOne: (id: number) => request.get<any>(`/announcements/${id}`),
  create: (data: any) => request.post('/announcements', data),
  update: (id: number, data: any) => request.patch(`/announcements/${id}`, data),
  delete: (id: number) => request.delete(`/announcements/${id}`),
};

// Gameplay API
export const gameplayApi = {
  getAll: (all?: boolean) => request.get<any[]>(`/gameplay${all ? '?all=true' : ''}`),
  getFeatured: () => request.get<any[]>('/gameplay/featured'),
  getByMode: (mode: string) => request.get<any[]>(`/gameplay/mode/${mode}`),
  getOne: (id: number) => request.get<any>(`/gameplay/${id}`),
  create: (data: any) => request.post('/gameplay', data),
  update: (id: number, data: any) => request.patch(`/gameplay/${id}`, data),
  delete: (id: number) => request.delete(`/gameplay/${id}`),
};

export default api;
