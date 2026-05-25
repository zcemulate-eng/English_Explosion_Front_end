'use client';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

import React, { useState } from 'react';
import { Mail, Lock, ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Step = 'email' | 'code' | 'password';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
    }, 1000);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); setError('');
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) { setStep('code'); startCountdown(); }
      else { const d = await res.json(); setError(d.message || 'Failed to send code.'); }
    } catch { setError('Cannot connect to server.'); }
    finally { setIsLoading(false); }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError('');
    try {
      await fetch(`${API}/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      startCountdown();
    } catch { setError('Failed to resend.'); }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); setError('');
    try {
      const res = await fetch(`${API}/auth/verify-reset-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      if (res.ok) { setStep('password'); }
      else { const d = await res.json(); setError(d.message || 'Invalid code.'); }
    } catch { setError('Cannot connect to server.'); }
    finally { setIsLoading(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setIsLoading(true); setError('');
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      if (res.ok) { sessionStorage.setItem('prefill_email', email); router.push('/login'); }
      else { const d = await res.json(); setError(d.message || 'Failed to reset password.'); }
    } catch { setError('Cannot connect to server.'); }
    finally { setIsLoading(false); }
  };

  const steps = [{ key: 'email', label: 'Email' }, { key: 'code', label: 'Verify' }, { key: 'password', label: 'Reset' }];
  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-[#3a2818] flex flex-col items-center justify-center p-4 relative"
      style={{ backgroundImage: "url('/wood-bg1.jpg')", backgroundSize: 'cover' }}>

      <Link href="/login" className="absolute top-6 left-6 flex items-center gap-2 text-[#e8dcb8] hover:text-white transition-colors text-sm font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Login
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-[#e8dcb8] text-3xl font-serif tracking-widest mb-1">English Explosion</h1>
        <p className="text-[#c2a36d] text-sm">Reset your password</p>
      </div>

      <div className="relative w-full max-w-[400px]">
        <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-[#c2a36d] rounded-tl-lg z-10" />
        <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-[#c2a36d] rounded-tr-lg z-10" />
        <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-[#c2a36d] rounded-bl-lg z-10" />
        <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-[#c2a36d] rounded-br-lg z-10" />

        <div className="bg-[#f0e8d5] rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-2 border-[#8c7355] overflow-hidden">

          {/* 步骤指示器 */}
          <div className="bg-[#1c452c] px-8 py-5 border-b-2 border-[#8c7355]">
            <div className="flex items-center justify-between">
              {steps.map((s, i) => (
                <React.Fragment key={s.key}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                      ${i < stepIndex ? 'bg-[#c2a36d] border-[#c2a36d] text-[#1c452c]' : ''}
                      ${i === stepIndex ? 'bg-[#e8dcb8] border-[#e8dcb8] text-[#1c452c]' : ''}
                      ${i > stepIndex ? 'bg-transparent border-[#e8dcb8]/40 text-[#e8dcb8]/40' : ''}`}>
                      {i < stepIndex ? <CheckCircle className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className={`text-xs font-medium ${i === stepIndex ? 'text-[#e8dcb8]' : 'text-[#e8dcb8]/50'}`}>{s.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-4 transition-all ${i < stepIndex ? 'bg-[#c2a36d]' : 'bg-[#e8dcb8]/20'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="px-8 py-8">

            {/* Step 1: Email */}
            {step === 'email' && (
              <form onSubmit={handleSendCode} className="space-y-5">
                <div className="text-center mb-2">
                  <h2 className="text-[#3a2818] font-bold text-xl mb-1">Forgot Password?</h2>
                  <p className="text-[#6b513b] text-sm">Enter your registered email and we will send you a verification code.</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-[#6b513b]" />
                  </div>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-12 pr-4 py-3 bg-[#fbf9f4] border-2 border-[#1c452c] rounded-full focus:outline-none focus:ring-2 focus:ring-[#1c452c]/30 text-[#3a2818] placeholder-[#8c7355] font-medium" />
                </div>
                {error && <p className="text-red-600 text-sm text-center bg-red-50 py-2 rounded-xl border border-red-200">{error}</p>}
                <button type="submit" disabled={isLoading}
                  className="w-full bg-[#1c452c] text-[#e8dcb8] py-3 rounded-full font-bold hover:bg-[#153621] disabled:opacity-60 transition-all shadow-md">
                  {isLoading ? 'Sending...' : 'Send Verification Code'}
                </button>
              </form>
            )}

            {/* Step 2: 验证码 */}
            {step === 'code' && (
              <form onSubmit={handleVerifyCode} className="space-y-5">
                <div className="text-center mb-2">
                  <h2 className="text-[#3a2818] font-bold text-xl mb-1">Check Your Email</h2>
                  <p className="text-[#6b513b] text-sm">We sent a 6-digit code to<br />
                    <span className="font-bold text-[#1c452c]">{email}</span>
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <input key={i} id={`code-${i}`} type="text" inputMode="numeric" maxLength={1}
                      value={code[i] || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        const arr = code.split('');
                        arr[i] = val;
                        setCode(arr.join('').slice(0, 6));
                        if (val && i < 5) document.getElementById(`code-${i + 1}`)?.focus();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !code[i] && i > 0) document.getElementById(`code-${i - 1}`)?.focus();
                      }}
                      className="w-11 text-center text-xl font-bold bg-[#fbf9f4] border-2 border-[#1c452c] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1c452c]/30 text-[#3a2818] py-3" />
                  ))}
                </div>
                {error && <p className="text-red-600 text-sm text-center bg-red-50 py-2 rounded-xl border border-red-200">{error}</p>}
                <button type="submit" disabled={isLoading || code.length < 6}
                  className="w-full bg-[#1c452c] text-[#e8dcb8] py-3 rounded-full font-bold hover:bg-[#153621] disabled:opacity-60 transition-all shadow-md">
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </button>
                <div className="text-center">
                  <button type="button" onClick={handleResend} disabled={countdown > 0}
                    className="flex items-center gap-1.5 mx-auto text-sm text-[#6b513b] hover:text-[#1c452c] disabled:text-[#8c7355]/50 disabled:cursor-not-allowed transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: 新密码 */}
            {step === 'password' && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="text-center mb-2">
                  <h2 className="text-[#3a2818] font-bold text-xl mb-1">Set New Password</h2>
                  <p className="text-[#6b513b] text-sm">Choose a strong password with at least 6 characters.</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-[#6b513b]" />
                  </div>
                  <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password"
                    className="w-full pl-12 pr-4 py-3 bg-[#fbf9f4] border-2 border-[#1c452c] rounded-full focus:outline-none focus:ring-2 focus:ring-[#1c452c]/30 text-[#3a2818] placeholder-[#8c7355] font-medium" />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-[#6b513b]" />
                  </div>
                  <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm New Password"
                    className="w-full pl-12 pr-4 py-3 bg-[#fbf9f4] border-2 border-[#1c452c] rounded-full focus:outline-none focus:ring-2 focus:ring-[#1c452c]/30 text-[#3a2818] placeholder-[#8c7355] font-medium" />
                </div>
                {confirmPassword && (
                  <p className={`text-xs text-center font-medium ${newPassword === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                    {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}
                {error && <p className="text-red-600 text-sm text-center bg-red-50 py-2 rounded-xl border border-red-200">{error}</p>}
                <button type="submit" disabled={isLoading || newPassword !== confirmPassword}
                  className="w-full bg-[#1c452c] text-[#e8dcb8] py-3 rounded-full font-bold hover:bg-[#153621] disabled:opacity-60 transition-all shadow-md">
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}