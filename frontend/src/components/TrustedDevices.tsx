'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  MonitorSmartphone,
  ShieldCheck,
  MapPin,
  Clock,
  Trash2,
  Check,
  X,
  Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { deviceApi, DeviceInfo } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatDateTime } from '@/lib/utils';
import LoadingSpinner from './LoadingSpinner';
import ConfirmModal from './ConfirmModal';

export default function TrustedDevices() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<DeviceInfo | null>(null);
  const [removing, setRemoving] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const data = await deviceApi.list();
      setDevices(data);
    } catch {
      toast.error('获取设备列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const startRename = (device: DeviceInfo) => {
    setEditingId(device.id);
    setEditingName(device.name);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveRename = async () => {
    if (editingId === null) return;
    const name = editingName.trim();
    if (!name) {
      toast.error('设备名称不能为空');
      return;
    }
    setSaving(true);
    try {
      await deviceApi.rename(editingId, name);
      toast.success('设备名称已更新');
      cancelRename();
      fetchDevices();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '重命名失败');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    const target = removeTarget;
    setRemoving(true);
    try {
      await deviceApi.remove(target.id);
      toast.success('设备已移除，该设备已被下线');
      setRemoveTarget(null);
      // 移除的是当前设备：本地会话立即失效，跳转登录
      if (target.isCurrent) {
        clearAuth();
        router.push('/login');
        return;
      }
      fetchDevices();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '移除失败');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <MonitorSmartphone className="w-5 h-5 text-minecraft-green" />
        <h2 className="text-lg font-bold text-white">登录设备</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner size="md" />
        </div>
      ) : devices.length === 0 ? (
        <p className="text-gray-400 py-6 text-center">暂无登录设备记录</p>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => (
            <motion.div
              key={device.id}
              layout
              className="p-4 bg-black/20 rounded-lg border border-white/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {editingId === device.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        maxLength={100}
                        autoFocus
                        className="glass-input text-sm py-1.5 flex-1"
                        placeholder="设备名称"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename();
                          if (e.key === 'Escape') cancelRename();
                        }}
                      />
                      <button
                        onClick={saveRename}
                        disabled={saving}
                        className="p-1.5 text-minecraft-green hover:bg-white/10 rounded transition-colors"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={cancelRename}
                        className="p-1.5 text-gray-400 hover:bg-white/10 rounded transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-medium truncate">{device.name}</p>
                      {device.trusted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-minecraft-green/20 text-minecraft-green text-xs rounded-full">
                          <ShieldCheck size={11} />
                          可信设备
                        </span>
                      )}
                      {device.isCurrent && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                          当前设备
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-2 space-y-1 text-sm text-gray-400">
                    <p className="flex items-center gap-1.5">
                      <Clock size={13} />
                      最后登录：{formatDateTime(device.lastLoginAt)}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin size={13} />
                      IP：{device.ip || '未知'}
                    </p>
                  </div>
                </div>

                {editingId !== device.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startRename(device)}
                      title="重命名"
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setRemoveTarget(device)}
                      title="移除设备"
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={removeTarget !== null}
        title="移除设备"
        message={
          removeTarget?.isCurrent
            ? '确定要移除当前设备吗？移除后你将立即退出登录，需要重新输入账号密码。'
            : `确定要移除「${removeTarget?.name}」吗？该设备上的登录状态将立即失效。`
        }
        confirmText={removing ? '移除中...' : '移除'}
        cancelText="取消"
        type="danger"
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </>
  );
}
