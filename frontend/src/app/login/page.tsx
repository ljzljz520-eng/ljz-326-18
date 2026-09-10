'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, ShieldCheck, MonitorSmartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import LoadingSpinner from '@/components/LoadingSpinner';

const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(1, '请输入密码'),
  rememberMe: z.boolean().optional(),
  deviceName: z.string().max(100, '设备名称最长 100 个字符').optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [trusted, setTrusted] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false, deviceName: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const response = await authApi.login({
        email: data.email,
        password: data.password,
        rememberMe: trusted,
        deviceName: trusted ? data.deviceName?.trim() || undefined : undefined,
      });
      setAuth(
        response.user,
        response.accessToken,
        response.deviceUuid,
        response.trusted,
        response.expiresIn,
      );
      toast.success('登录成功');
      router.push('/');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-minecraft-green rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">MC</span>
            </div>
            <h1 className="text-2xl font-bold text-white">欢迎回来</h1>
            <p className="text-gray-400 mt-2">登录您的账户继续冒险</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('email')}
                  type="email"
                  className="glass-input pl-10"
                  placeholder="your@email.com"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="glass-input pl-10 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer select-none">
                  <input
                    {...register('rememberMe')}
                    type="checkbox"
                    checked={trusted}
                    onChange={(e) => setTrusted(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-white/10 text-minecraft-green focus:ring-minecraft-green"
                  />
                  <ShieldCheck size={15} className="ml-2 text-minecraft-green" />
                  <span className="ml-1.5 text-sm text-gray-300">信任此设备，30天免登录</span>
                </label>
                <Link href="/forgot-password" className="text-sm text-minecraft-green hover:underline">
                  忘记密码?
                </Link>
              </div>

              <AnimatePresence>
                {trusted && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="relative mt-3">
                      <MonitorSmartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        {...register('deviceName')}
                        type="text"
                        maxLength={100}
                        className="glass-input pl-9 text-sm"
                        placeholder="设备名称（可选，如：我的电脑）"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">
                      你可以随时在“个人中心 - 可信设备”中移除此设备。
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full glass-button flex items-center justify-center gap-2"
            >
              {loading ? <LoadingSpinner size="sm" /> : '登录'}
            </button>
          </form>

          <p className="text-center text-gray-400 mt-6">
            还没有账户?{' '}
            <Link href="/register" className="text-minecraft-green hover:underline">
              立即注册
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
