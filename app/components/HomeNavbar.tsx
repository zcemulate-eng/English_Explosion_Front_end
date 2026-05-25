'use client';

import { useState, useRef, useEffect } from 'react';
import { Leaf, LogOut, ChevronDown, LogIn, UserPlus, X, User, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export function HomeNavbar() {
	const router = useRouter();
	const { user, isLoggedIn, logout } = useAuth();
	const [showDropdown, setShowDropdown] = useState(false);
	const [showAuthPrompt, setShowAuthPrompt] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);


	// 点击外部关闭下拉菜单
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setShowDropdown(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);


	const handleLogout = () => {
		logout();
		setShowDropdown(false);
	};

	// Notes / Records 点击拦截：未登录弹窗，已登录直接跳转
	const handleProtectedNav = (path: string) => {
		if (isLoggedIn) {
			router.push(path);
		} else {
			setShowAuthPrompt(true);
		}
	};

	return (
		<>
			<header
				className="w-full h-20 flex items-center justify-between px-8 md:px-16 shadow-md z-50 relative border-b border-[#d0bfa1]/40"
				style={{
					backgroundImage: "url('/wood-bg2.jpg')",
					backgroundSize: 'cover',
					backgroundPosition: 'center',
					backgroundRepeat: 'no-repeat',
				}}
			>
				{/* Logo */}
				<div className="flex items-center gap-2">
					<Leaf className="text-[#1c452c] w-8 h-8" />
					<div className="flex flex-col leading-tight">
						<span className="font-serif text-xl font-bold text-[#1c452c] tracking-wide">English</span>
						<span className="font-serif text-xl font-bold text-[#1c452c] tracking-wide">Explosion</span>
					</div>
				</div>

				{/* 右侧：导航 + 用户区域 */}
				<div className="flex items-center gap-8">
					<nav className="hidden md:flex gap-6 font-medium text-[#5c3d2e]">
						<Link href="/" className="hover:text-[#1c452c] transition-colors">Home</Link>

						{/* Notes：未登录时弹窗，已登录直接跳转 */}
						<button
							onClick={() => handleProtectedNav('/notes')}
							className="hover:text-[#1c452c] transition-colors cursor-pointer bg-transparent border-none p-0 font-medium text-[#5c3d2e]"
						>
							Notes
						</button>

						{/* Records：未登录时弹窗，已登录直接跳转 */}
						<button
							onClick={() => handleProtectedNav('/progress')}
							className="hover:text-[#1c452c] transition-colors cursor-pointer bg-transparent border-none p-0 font-medium text-[#5c3d2e]"
						>
							Records
						</button>
					</nav>

					<div className="flex items-center gap-4">
						{/* 已登录状态下的用户区域 */}
						{isLoggedIn && user ? (
							<div className="relative" ref={dropdownRef}>
								{/* 触发按钮：点击头像或用户名 */}
								<button
									onClick={() => setShowDropdown(!showDropdown)}
									className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity focus:outline-none"
								>
									<div className="w-10 h-10 rounded-full border-2 border-[#8c7355] overflow-hidden bg-[#d0bfa1]">
										{user.avatar_url ? (
											<img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
										) : (
											<div className="w-full h-full flex items-center justify-center text-[#5c3d2e] font-bold">
												{user.nickname?.charAt(0).toUpperCase() || 'U'}
											</div>
										)}
									</div>
									<span className="font-bold text-[#1c452c] hidden sm:block">
										{user.nickname}
									</span>
								</button>

								{/* 下拉菜单面板 */}
								{showDropdown && (
									<div className="absolute right-0 mt-3 w-56 bg-[#fdfaf5] border-2 border-[#a48663] rounded-xl shadow-[0_10px_25px_rgba(40,34,22,0.2)] py-2 z-50 overflow-hidden">
										<div className="px-4 py-2 border-b border-[#e6d5b8] mb-1">
											<p className="text-sm font-bold text-[#332019] truncate">{user.nickname}</p>
											<p className="text-xs text-[#8a6b4a] truncate">{user.email}</p>
										</div>

										<button
											onClick={() => {
												setShowDropdown(false);
												router.push('/profile');
											}}
											className="w-full text-left px-4 py-2.5 hover:bg-[#f0e8d5] text-[#332019] font-medium flex items-center gap-3 transition-colors"
										>
											<Settings size={18} className="text-[#6b513b]" />
											Edit Profile
										</button>

										<button
											onClick={() => {
												setShowDropdown(false);
												if (logout) logout();
											}}
											className="w-full text-left px-4 py-2.5 hover:bg-[#fde68a] text-[#8b1010] font-medium flex items-center gap-3 transition-colors"
										>
											<LogOut size={18} className="text-[#8b1010]" />
											Log Out
										</button>
									</div>
								)}
							</div>
						) : (
							<div className="w-10 h-10 rounded-full bg-[#d0bfa1] border-2 border-[#8c7355] flex items-center justify-center shadow-sm">
								<User className="text-[#6b513b] w-6 h-6" />
							</div>
						)}

					</div>
				</div>
			</header>

			{/* ── 未登录提示弹窗（与主页卡片弹窗完全一致）── */}
			{showAuthPrompt && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/40 backdrop-blur-sm"
						onClick={() => setShowAuthPrompt(false)}
					/>
					<div className="relative z-10 bg-[#f0e8d5] rounded-3xl shadow-2xl w-full max-w-sm p-8 border-2 border-[#c2a36d] text-center">
						<button
							onClick={() => setShowAuthPrompt(false)}
							className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[#8c7355] hover:bg-[#d0bfa1] transition-colors"
						>
							<X className="w-4 h-4" />
						</button>

						<div className="flex items-center justify-center gap-2 mb-3">
							<Leaf className="text-[#1c452c] w-6 h-6" />
							<span className="font-serif text-base font-bold text-[#1c452c] tracking-wide">
								English Explosion
							</span>
						</div>
						<h2 className="text-xl font-extrabold text-[#3a2818] mb-2">
							Sign in to continue
						</h2>
						<p className="text-sm text-[#6b513b] mb-8 leading-relaxed">
							You need an account to access this page.
							<br />
							Already have one? Log in. New here? Join for free!
						</p>

						<div className="flex flex-col gap-3">
							<button
								onClick={() => { setShowAuthPrompt(false); router.push('/login'); }}
								className="flex items-center justify-center gap-2 w-full bg-[#1c452c] text-[#e8dcb8] py-3 rounded-full font-bold text-base shadow-md hover:bg-[#153621] transition-all"
							>
								<LogIn className="w-4 h-4" />
								Log In
							</button>
							<button
								onClick={() => { setShowAuthPrompt(false); router.push('/register'); }}
								className="flex items-center justify-center gap-2 w-full bg-[#f0e8d5] text-[#1c452c] py-3 rounded-full font-bold text-base border-2 border-[#1c452c] hover:bg-[#d0bfa1] transition-all"
							>
								<UserPlus className="w-4 h-4" />
								Create an Account
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}