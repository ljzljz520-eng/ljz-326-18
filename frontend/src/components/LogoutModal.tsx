'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MonitorSmartphone, MonitorX, LogOut } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface LogoutModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: (scope: 'current' | 'all') => Promise<void> | void;
}

export default function LogoutModal({ isOpen, onCancel, onConfirm }: LogoutModalProps) {
  const [loading, setLoading] = useState(false);

  const handle = async (scope: 'current' | 'all') => {
    setLoading(true);
    try {
      await onConfirm(scope);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={loading ? undefined : onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-md bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl overflow-hidden">
              <div className="h-1 w-full bg-red-500" />

              <button
                onClick={onCancel}
                disabled={loading}
                className="absolute top-3 right-3 p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>

              <div className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-full bg-white/10 text-red-400">
                    <LogOut size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white">退出登录</h3>
                </div>

                <p className="text-gray-300 mb-5">请选择退出范围：</p>

                <div className="space-y-3">
                  <button
                    onClick={() => handle('current')}
                    disabled={loading}
                    className="w-full flex items-start gap-3 p-4 bg-black/20 hover:bg-white/10 rounded-lg text-left transition-colors disabled:opacity-60"
                  >
                    <MonitorSmartphone size={20} className="text-minecraft-green mt-0.5 shrink-0" />
                    <div>
                      <p className="text-white font-medium">仅退出当前设备</p>
                      <p className="text-gray-400 text-sm mt-0.5">其他已登录设备保持登录状态</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handle('all')}
                    disabled={loading}
                    className="w-full flex items-start gap-3 p-4 bg-black/20 hover:bg-red-500/10 rounded-lg text-left transition-colors disabled:opacity-60"
                  >
                    <MonitorX size={20} className="text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-white font-medium">退出全部设备</p>
                      <p className="text-gray-400 text-sm mt-0.5">所有设备（含可信设备）都将被立即下线</p>
                    </div>
                  </button>
                </div>

                {loading && (
                  <div className="flex items-center justify-center gap-2 mt-5 text-gray-300 text-sm">
                    <LoadingSpinner size="sm" />
                    正在退出...
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
