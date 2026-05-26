'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

// 全局离线指示器：网络断开时常驻顶部红条；恢复时短暂显示绿色提示后自动消失。
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    // 初始状态（SSR 阶段 navigator 不存在，故在 effect 内读取）
    setOffline(!navigator.onLine);

    const handleOffline = () => {
      setOffline(true);
      setJustReconnected(false);
    };

    const handleOnline = () => {
      setOffline(false);
      setJustReconnected(true);
      // 3 秒后隐藏“已恢复”提示
      window.setTimeout(() => setJustReconnected(false), 3000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!offline && !justReconnected) return null;

  const isOffline = offline;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '10px 16px',
        fontSize: 14,
        fontWeight: 500,
        color: '#fff',
        background: isOffline ? '#b91c1c' : '#0d6735',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        transition: 'background 0.3s ease',
      }}
    >
      {isOffline ? <WifiOff size={16} /> : <Wifi size={16} />}
      <span>
        {isOffline
          ? '网络连接已断开，请检查你的网络。已加载的内容仍可继续使用。'
          : '网络已恢复连接'}
      </span>
    </div>
  );
}