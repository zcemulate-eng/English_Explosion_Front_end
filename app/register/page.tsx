'use client';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

import React, { useState, useRef } from 'react';
import { Mail, Lock, Camera, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function RegisterPage() {
	const router = useRouter();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [nickname, setNickname] = useState('');
	const [phone, setPhone] = useState('');
	const [purpose, setPurpose] = useState('');
	const [avatarBase64, setAvatarBase64] = useState<string | null>(null); // base64 预览 + 上传
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	// 点击头像区域触发文件选择
	const handleAvatarClick = () => fileInputRef.current?.click();

	// 选择图片后转 base64
	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// 限制 5MB
		if (file.size > 5 * 1024 * 1024) {
			setErrorMessage('Avatar image must be smaller than 5MB.');
			return;
		}

		const reader = new FileReader();
		reader.onload = () => setAvatarBase64(reader.result as string);
		reader.readAsDataURL(file);
	};

	const handleRegister = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMessage('');

		if (phone.trim() && !/^1\d{10}$/.test(phone.trim())) {
			setErrorMessage('Phone number must be an 11-digit string starting with 1.');
			return;
		}

		setIsLoading(true);

		try {
			const response = await fetch(`${API}/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					password,
					nickname,
					phone: phone.trim() !== '' ? phone : undefined,
					purpose: purpose !== '' ? purpose : undefined,
					avatar_url: avatarBase64 ?? undefined,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				sessionStorage.setItem('prefill_email', email);
				router.push('/login');
			} else {
				const errorMsg = Array.isArray(data.message) ? data.message[0] : data.message;
				setErrorMessage(errorMsg || 'Registration failed. Please try again.');
			}
		} catch {
			setErrorMessage('Network error. Is your backend running?');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div
			className="min-h-screen bg-[#3a2818] bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center p-4 relative"
			style={{ backgroundImage: "url('/wood-bg1.jpg')" }}
		>
			<div className="text-center mb-8 flex flex-col items-center drop-shadow-lg">
				<h1 className="text-[#e8dcb8] text-4xl md:text-5xl font-serif tracking-[0.15em] mb-1">OAK & LEAF</h1>
				<h2 className="text-[#e8dcb8] text-xl font-serif italic tracking-widest">English</h2>
			</div>

			<div className="relative w-full max-w-[420px]">
				{/* 金角装饰 */}
				<div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#c2a36d] rounded-tl-lg z-10 shadow-sm" />
				<div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#c2a36d] rounded-tr-lg z-10 shadow-sm" />
				<div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#c2a36d] rounded-bl-lg z-10 shadow-sm" />
				<div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#c2a36d] rounded-br-lg z-10 shadow-sm" />

				<div className="bg-[#f0e8d5] rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-2 border-[#8c7355] overflow-hidden">
					<div className="bg-[#1c452c] text-center py-4 border-b-2 border-[#8c7355] shadow-inner">
						<h3 className="text-[#e8dcb8] font-serif text-xl tracking-wide">Join Your English Journey</h3>
					</div>

					<div className="px-8 py-8 flex flex-col items-center relative">
						<div className="absolute inset-0 opacity-20 pointer-events-none"
							style={{ backgroundImage: "radial-gradient(#8c7355 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

						{/* 头像上传区域 */}
						<div className="relative z-10 mb-6 cursor-pointer group" onClick={handleAvatarClick}>
							<div className="w-20 h-20 rounded-full bg-[#d0bfa1] border-[3px] border-[#8c7355] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105">
								{avatarBase64 ? (
									<Image
										src={avatarBase64}
										alt="Avatar preview"
										width={80}
										height={80}
										className="w-full h-full object-cover"
									/>
								) : (
									<div className="w-14 h-14 rounded-full border border-[#8c7355] border-dashed flex flex-col items-center justify-center gap-1">
										<Camera className="text-[#6b513b] w-5 h-5" />
										<span className="text-[#6b513b] text-[9px] font-medium">Upload</span>
									</div>
								)}
							</div>
							{/* 编辑角标 */}
							<div className="absolute bottom-0 right-0 w-6 h-6 bg-[#1c452c] rounded-full flex items-center justify-center border-2 border-[#f0e8d5] shadow-sm">
								<Camera className="w-3 h-3 text-[#e8dcb8]" />
							</div>
						</div>

						{/* 隐藏的文件 input */}
						<input
							ref={fileInputRef}
							type="file"
							accept="image/jpeg,image/png,image/webp"
							className="hidden"
							onChange={handleFileChange}
						/>

						<form className="w-full space-y-4 relative z-10" onSubmit={handleRegister}>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
									<Mail className="h-5 w-5 text-[#8a6b4a]" />
								</div>
								<input
									type="email" required value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="Email Address"
									/* 💡 修改这里的 className */
									className="w-full pl-12 pr-4 py-3.5 bg-[#fdfaf5] border border-[#a48663] rounded-full focus:outline-none focus:border-[#1c452c] focus:ring-4 focus:ring-[#1c452c]/15 text-[#332019] placeholder-[#9c7d5f] font-medium shadow-[inset_0_2px_5px_rgba(70,40,18,0.06)] transition-all duration-300"
								/>
							</div>

							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
									<Lock className="h-5 w-5 text-[#8a6b4a]" />
								</div>
								<input
									type="password" required value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="Password (Min 6 chars)"
									/* 💡 修改这里的 className */
									className="w-full pl-12 pr-4 py-3.5 bg-[#fdfaf5] border border-[#a48663] rounded-full focus:outline-none focus:border-[#1c452c] focus:ring-4 focus:ring-[#1c452c]/15 text-[#332019] placeholder-[#9c7d5f] font-medium shadow-[inset_0_2px_5px_rgba(70,40,18,0.06)] transition-all duration-300"
								/>
							</div>

							<div className="relative">
								<input
									type="text" required value={nickname}
									onChange={(e) => setNickname(e.target.value)}
									placeholder="Nickname"
									/* 💡 修改这里的 className (无图标，左边距为 px-5) */
									className="w-full px-5 py-3.5 bg-[#fdfaf5] border border-[#a48663] rounded-full focus:outline-none focus:border-[#1c452c] focus:ring-4 focus:ring-[#1c452c]/15 text-[#332019] placeholder-[#9c7d5f] font-medium shadow-[inset_0_2px_5px_rgba(70,40,18,0.06)] transition-all duration-300"
								/>
							</div>

							<div className="relative">
								<input
									type="tel" value={phone}
									onChange={(e) => setPhone(e.target.value)}
									placeholder="Phone Number (Optional)"
									/* 💡 修改这里的 className (无图标，左边距为 px-5) */
									className="w-full px-5 py-3.5 bg-[#fdfaf5] border border-[#a48663] rounded-full focus:outline-none focus:border-[#1c452c] focus:ring-4 focus:ring-[#1c452c]/15 text-[#332019] placeholder-[#9c7d5f] font-medium shadow-[inset_0_2px_5px_rgba(70,40,18,0.06)] transition-all duration-300"
								/>
							</div>

							<div className="relative">
								<select value={purpose} onChange={(e) => setPurpose(e.target.value)}
									/* 💡 修改这里的 className */
									className="w-full px-5 py-3.5 bg-[#fdfaf5] border border-[#a48663] rounded-full appearance-none focus:outline-none focus:border-[#1c452c] focus:ring-4 focus:ring-[#1c452c]/15 text-[#332019] font-medium shadow-[inset_0_2px_5px_rgba(70,40,18,0.06)] transition-all duration-300 cursor-pointer"
								>
									<option value="" disabled hidden className="text-[#9c7d5f]">Purpose (Optional)</option>
									<option value="Study_Abroad">Study Abroad</option>
									<option value="CET_4_6">CET-4/6</option>
									<option value="Travel">Travel</option>
									<option value="Work">Work</option>
									<option value="Exam">Exam</option>
								</select>
								<div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
									<ChevronDown className="h-5 w-5 text-[#8a6b4a]" />
								</div>
							</div>

							{errorMessage && (
								<div className="text-red-600 text-sm font-medium text-center bg-red-100 py-2 rounded-lg border border-red-200">
									{errorMessage}
								</div>
							)}

							<div className="pt-4">
								{/* 💡 修改按钮 className，加入立体渐变和阴影，使其像一颗有质感的木质宝石 */}
								<button type="submit" disabled={isLoading}
									className="w-full bg-gradient-to-b from-[#2c8a4d] to-[#0d6735] text-[#fff6df] font-serif text-xl tracking-wide py-3.5 rounded-full border border-[#094121] shadow-[0_6px_15px_rgba(13,103,53,0.3),inset_0_2px_4px_rgba(255,255,255,0.2)] hover:from-[#339e58] hover:to-[#117a40] active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
								>
									{isLoading ? 'Registering...' : 'Start Learning'}
								</button>
							</div>

							<p className="text-center text-sm text-[#6b513b] pt-1">
								Already have an account?{' '}
								<Link href="/login" className="text-[#1c452c] font-bold underline underline-offset-2 hover:text-[#0d2617] transition-colors">
									Log in
								</Link>
							</p>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
}