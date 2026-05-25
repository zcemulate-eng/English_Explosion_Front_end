'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { WeeklyGoalModal } from './WeeklyGoalModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function WeeklyGoalChecker() {
  const { isLoggedIn, isLoading, user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const checkedRef = useRef(false); // 用 ref 避免重复检查

  useEffect(() => {
    // 未完成初始化、未登录、已检查过 → 不处理
    if (isLoading || !isLoggedIn || checkedRef.current) return;

    checkedRef.current = true;

    const checkGoal = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API}/weekly-goals/current`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const goal = await res.json();
          if (!goal) setShowModal(true);
        }
      } catch {
        // 静默忽略
      }
    };

    // 稍微延迟，确保页面渲染完成后再弹窗，体验更自然
    const timer = setTimeout(checkGoal, 800);
    return () => clearTimeout(timer);
  }, [isLoggedIn, isLoading]); // user 变化（登录/登出）也会触发

  // 登出时重置，下次登录重新检查
  useEffect(() => {
    if (!isLoggedIn) checkedRef.current = false;
  }, [isLoggedIn]);

  if (!showModal) return null;
  return <WeeklyGoalModal onComplete={() => setShowModal(false)} />;
}