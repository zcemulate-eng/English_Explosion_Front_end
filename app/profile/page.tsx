// app/profile/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { HomeNavbar } from '../components/HomeNavbar';
import { User, Lock, Mail, Phone, Target, Camera, CheckCircle, AlertCircle, Shield, BadgeInfo, ChevronDown } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ProfilePage() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    nickname: '',
    phone: '',
    purpose: 'Study_Abroad',
    avatar_url: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', msg: string }>({ type: 'idle', msg: '' });

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoading, isLoggedIn, router]);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        nickname: user.nickname || '',
        phone: user.phone || '',
        purpose: user.purpose || 'Study_Abroad',
        avatar_url: user.avatar_url || ''
      }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setStatus({ type: 'idle', msg: '' });
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setStatus({ type: 'error', msg: 'Avatar image size cannot exceed 5MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, avatar_url: reader.result as string }));
      setStatus({ type: 'idle', msg: '' });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.phone && !/^1\d{10}$/.test(formData.phone)) {
      setStatus({ type: 'error', msg: 'Phone number must be an 11-digit string starting with 1.' });
      return;
    }

    if (formData.newPassword || formData.oldPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setStatus({ type: 'error', msg: 'New passwords do not match.' });
        return;
      }
      if (!formData.oldPassword) {
        setStatus({ type: 'error', msg: 'Please enter your current password to verify identity.' });
        return;
      }
      if (formData.newPassword.length < 6) {
        setStatus({ type: 'error', msg: 'New password must be at least 6 characters.' });
        return;
      }
    }

    setStatus({ type: 'loading', msg: 'Saving changes...' });

    try {
      const token = localStorage.getItem('access_token');
      const payload: any = {
        nickname: formData.nickname,
        phone: formData.phone,
        purpose: formData.purpose,
        avatar_url: formData.avatar_url || undefined,
      };

      if (formData.newPassword) {
        payload.oldPassword = formData.oldPassword;
        payload.newPassword = formData.newPassword;
        payload.confirmPassword = formData.confirmPassword;
      }

      const res = await fetch(`${API}/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');

      setStatus({ type: 'success', msg: 'Profile updated successfully!' });
      setFormData(prev => ({ ...prev, oldPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    }
  };

  if (isLoading || !user) return null;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: `
        radial-gradient(circle at 10% 20%, rgba(216,149,82,0.15), transparent 40rem),
        radial-gradient(circle at 90% 80%, rgba(28,69,44,0.12), transparent 45rem),
        radial-gradient(circle at 50% 10%, rgba(255,255,255,0.9), transparent 50rem),
        linear-gradient(135deg, #faf4e8 0%, #f4eae0 100%)
      `,
      fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
    }}>
      <HomeNavbar />
      
      {/* 💡 核心改动：利用 flex: 1 占据剩余空间，并让内容完美垂直居中 */}
      <main style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '40px 24px', 
        width: '100%' 
      }}>
        <div style={{
          display: 'flex', flexWrap: 'wrap', borderRadius: 28,
          width: '100%', maxWidth: 1040, // 稍微放宽一点点
          background: `
            linear-gradient(145deg, rgba(251,212,164,0.96), rgba(228,155,83,0.9)),
            repeating-linear-gradient(0deg, rgba(104,62,25,0.08) 0 1px, transparent 1px 8px)
          `,
          boxShadow: '0 20px 40px rgba(58,35,18,0.2), inset 0 4px 10px rgba(255,255,255,0.4)',
          overflow: 'hidden', border: '8px solid #78a36a'
        }}>
          
          {/* ==================== 左侧：头像区 ==================== */}
          <div style={{
            flex: '1 1 280px', background: 'rgba(255,252,247,0.75)', 
            padding: '48px 32px', // 💡 增加了上下留白
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
            borderRight: '2px dashed rgba(126,79,38,0.2)'
          }}>
            <div 
              onClick={handleAvatarClick}
              style={{ 
                width: 140, height: 140, borderRadius: '50%', border: '4px solid #78a36a', // 💡 头像适度拉大到140
                boxShadow: '0 8px 16px rgba(58,35,18,0.15)', overflow: 'hidden', background: '#d0bfa1',
                marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative'
              }}
              className="group"
            >
              {formData.avatar_url ? (
                <img src={formData.avatar_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#5c3d2e', fontWeight: 800, fontSize: '3.5rem' }}>{formData.nickname?.charAt(0).toUpperCase() || 'U'}</span>
              )}
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(28,69,44,0.4)', display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                color: '#fff6df', opacity: 0, transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
              >
                <Camera size={22} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Change</span>
              </div>
            </div>

            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFileChange} />

            <h3 style={{ margin: '0 0 6px', fontSize: '1.4rem', fontWeight: 800, color: '#332019', textAlign: 'center' }}>{formData.nickname || 'Student'}</h3>
            <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#8a6b4a', fontWeight: 600, textAlign: 'center' }}>{user.email}</p>
            <span style={{ fontSize: '0.8rem', color: '#8c7355', textAlign: 'center', lineHeight: 1.4 }}>💡 Click avatar to change.</span>
          </div>

          {/* ==================== 右侧：表单区 ==================== */}
          <div style={{ 
            flex: '2 1 540px', 
            padding: '40px 48px', // 💡 增加了四周留白
            display: 'flex', flexDirection: 'column' 
          }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h1 style={{ margin: 0, color: '#064f2c', fontSize: '1.8rem', fontWeight: 800, fontFamily: "Georgia, serif" }}>Account Settings</h1>
            </div>

            {status.msg && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '12px 16px', borderRadius: 12,
                background: status.type === 'success' ? '#b8e5a9' : status.type === 'error' ? '#ffaaa9' : '#fde68a',
                color: status.type === 'success' ? '#0f4e29' : status.type === 'error' ? '#8b1010' : '#78350f',
                fontWeight: 700, fontSize: '0.9rem'
              }}>
                {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                {status.msg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}> {/* 💡 增大了整体的区块 gap */}
              
              {/* --- 1. 基础资料与学习目标 --- */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#064f2c', borderBottom: '2px solid rgba(126,79,38,0.2)', paddingBottom: 8, marginBottom: 16 }}>
                  <BadgeInfo size={18} />
                  <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Basic Information</h2>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}> {/* 💡 增大了网格间隙 */}
                  {/* Email */}
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, color: '#332019', fontWeight: 700, fontSize: '0.85rem' }}>Registered Email</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#8a6b4a' }} />
                      <input type="email" value={user.email} disabled 
                        style={{
                          width: '100%', padding: '12px 16px 12px 40px', borderRadius: 10, border: '2px solid rgba(126,79,38,0.2)', // 💡 增大了输入框内边距
                          background: 'rgba(230,220,205,0.5)', color: '#6b513b', fontSize: '0.95rem', cursor: 'not-allowed', outline: 'none'
                        }} 
                      />
                    </div>
                  </div>

                  {/* Nickname */}
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, color: '#332019', fontWeight: 700, fontSize: '0.85rem' }}>Nickname</label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6b513b' }} />
                      <input type="text" name="nickname" value={formData.nickname} onChange={handleChange} required
                        style={{
                          width: '100%', padding: '12px 16px 12px 40px', borderRadius: 10, border: '2px solid rgba(126,79,38,0.4)',
                          background: '#fffcf7', color: '#332019', fontSize: '0.95rem', outline: 'none', boxShadow: 'inset 0 2px 4px rgba(70,40,18,0.05)'
                        }} 
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, color: '#332019', fontWeight: 700, fontSize: '0.85rem' }}>Phone Number</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6b513b' }} />
                      <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="11 digits"
                        style={{
                          width: '100%', padding: '12px 16px 12px 40px', borderRadius: 10, border: '2px solid rgba(126,79,38,0.4)',
                          background: '#fffcf7', color: '#332019', fontSize: '0.95rem', outline: 'none', boxShadow: 'inset 0 2px 4px rgba(70,40,18,0.05)'
                        }} 
                      />
                    </div>
                  </div>

                  {/* Primary Goal */}
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, color: '#332019', fontWeight: 700, fontSize: '0.85rem' }}>Primary Goal</label>
                    <div style={{ position: 'relative' }}>
                      <Target size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6b513b' }} />
                      <select name="purpose" value={formData.purpose} onChange={handleChange}
                        style={{
                          width: '100%', padding: '12px 16px 12px 40px', borderRadius: 10, border: '2px solid rgba(126,79,38,0.4)',
                          background: '#fffcf7', color: '#332019', fontSize: '0.95rem', outline: 'none', appearance: 'none', cursor: 'pointer',
                          boxShadow: 'inset 0 2px 4px rgba(70,40,18,0.05)'
                        }}
                      >
                        <option value="Study_Abroad">Study Abroad</option>
                        <option value="CET_4_6">CET 4/6</option>
                        <option value="Exam">Postgraduate Exam</option>
                        <option value="Work">Professional Work</option>
                        <option value="Travel">Travel & Daily</option>
                      </select>
                      <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                        <ChevronDown size={16} color="#8a6b4a" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* --- 2. 安全密码 --- */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#064f2c', borderBottom: '2px solid rgba(126,79,38,0.2)', paddingBottom: 8, marginBottom: 16 }}>
                  <Shield size={18} />
                  <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Password & Security</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                  {/* Old Password */}
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, color: '#332019', fontWeight: 700, fontSize: '0.85rem' }}>Current Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6b513b' }} />
                      <input type="password" name="oldPassword" value={formData.oldPassword} onChange={handleChange} placeholder="Required"
                        style={{
                          width: '100%', padding: '12px 16px 12px 40px', borderRadius: 10, border: '2px solid rgba(126,79,38,0.4)',
                          background: '#fffcf7', color: '#332019', fontSize: '0.95rem', outline: 'none'
                        }} 
                      />
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, color: '#332019', fontWeight: 700, fontSize: '0.85rem' }}>New Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6b513b' }} />
                      <input type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} placeholder="Min 6 chars"
                        style={{
                          width: '100%', padding: '12px 16px 12px 40px', borderRadius: 10, border: '2px solid rgba(126,79,38,0.4)',
                          background: '#fffcf7', color: '#332019', fontSize: '0.95rem', outline: 'none'
                        }} 
                      />
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, color: '#332019', fontWeight: 700, fontSize: '0.85rem' }}>Confirm Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6b513b' }} />
                      <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Repeat new"
                        style={{
                          width: '100%', padding: '12px 16px 12px 40px', borderRadius: 10, border: '2px solid rgba(126,79,38,0.4)',
                          background: '#fffcf7', color: '#332019', fontSize: '0.95rem', outline: 'none'
                        }} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 底部保存按钮 */}
              <div style={{ marginTop: 12 }}> {/* 💡 稍微增加了按钮上方的间距 */}
                <button type="submit" disabled={status.type === 'loading'}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 12, color: '#fff6df', // 💡 按钮撑得更高一点
                    background: 'linear-gradient(180deg, #2c8a4d, #0d6735)', border: '2px solid rgba(7,72,34,0.62)',
                    boxShadow: '0 5px 0 #0b4c2a, 0 10px 20px rgba(36,47,24,0.2), inset 0 2px 4px rgba(255,255,255,0.25)',
                    fontSize: '1.15rem', fontWeight: 800, cursor: status.type === 'loading' ? 'not-allowed' : 'pointer', transition: 'all 0.1s ease',
                  }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(3px)'; e.currentTarget.style.boxShadow = '0 2px 0 #0b4c2a, 0 4px 10px rgba(36,47,24,0.25)'; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 5px 0 #0b4c2a, 0 10px 20px rgba(36,47,24,0.2), inset 0 2px 4px rgba(255,255,255,0.25)'; }}
                >
                  {status.type === 'loading' ? 'Saving Changes...' : 'Save All Changes'}
                </button>
              </div>

            </form>
          </div>
        </div>
      </main>
    </div>
  );
}