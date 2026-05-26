'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { PenLine, X, Loader2 } from 'lucide-react';
import { HomeNavbar } from '../components/HomeNavbar';
import { useAuth } from '../contexts/AuthContext';
import { normalizeSentence } from '../utils/text-normalization';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ─── Types ────────────────────────────────────────────────────────────────────
type Segment = { text: string; status: 'neutral' | 'wrong' | 'correct' };

interface Material {
	id: number; title: string; audio_url: string;
	difficulty_level: string | null; total_sentences: number | null;
}
interface Sentence {
	id: number; order_index: number; content: string;
	audio_start_time: number | null; audio_end_time: number | null;
	translation: string | null;
}
interface AnswerRecord {
	userSegments: Segment[]; correctSegments: Segment[];
	accuracyScore: number; submitted: boolean; userAnswer: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const WAVEFORM = [
	10, 18, 30, 42, 54, 36, 48, 40, 30, 24, 50, 62, 86, 54, 68, 78, 58, 92,
	70, 60, 52, 48, 40, 76, 34, 48, 62, 42, 54, 48, 38, 44, 56, 42, 60, 48,
	36, 52, 64, 78, 56, 42, 50, 34, 44, 58, 72, 46, 36, 42, 54, 32, 44, 38,
	50, 28, 36, 22,
];
const SPEED_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

// ─── Fill-in-blank types ─────────────────────────────────────────────────────
interface BlankItem { wordIndex: number; word: string; }
type PracticeMode = 'full_text' | 'fill_in_blank';

function generateBlanks(sentence: string, count: number): BlankItem[] {
	const words = sentence.trim().split(/\s+/);
	const candidates = words
		.map((w, i) => ({ wordIndex: i, word: w }))
		.filter(({ word }) => word.replace(/[^a-zA-Z]/g, '').length > 2);
	const shuffled = candidates.sort(() => Math.random() - 0.5);
	return shuffled.slice(0, Math.min(count, shuffled.length))
		.sort((a, b) => a.wordIndex - b.wordIndex);
}

function diffFillInBlank(
	userInputs: string[],
	blanks: BlankItem[],
): { segments: Segment[]; accuracyScore: number } {
	const clean = (w: string) => w.replace(/[^a-zA-Z0-9']/g, '').toLowerCase();
	let correct = 0;
	const segments: Segment[] = blanks.map((blank, i) => {
		const u = userInputs[i] ?? '';
		const match = clean(u) === clean(blank.word);
		if (match) correct++;
		return { text: blank.word + ' ', status: match ? 'correct' : 'wrong' };
	});
	const accuracyScore = blanks.length > 0
		? Math.round((correct / blanks.length) * 100) : 0;
	return { segments, accuracyScore };
}

function diffAnswer(userInput: string, correct: string): {
	userSegments: Segment[]; correctSegments: Segment[]; accuracyScore: number;
} {
	// 不再使用原有的简易 clean，改为使用标准化函数拉平数据
	const normalizedUser = normalizeSentence(userInput);
	const normalizedCorrect = normalizeSentence(correct);

	const uWords = normalizedUser.split(' ').filter(Boolean);
	const cWords = normalizedCorrect.split(' ').filter(Boolean);
	const len = Math.max(uWords.length, cWords.length);

	const userSegments: Segment[] = [];
	const correctSegments: Segment[] = [];
	let correctCount = 0;

	for (let i = 0; i < len; i++) {
		const u = uWords[i] ?? '';
		const c = cWords[i] ?? '';
		const match = u !== '' && u === c;
		if (match) correctCount++;

		if (u) userSegments.push({ text: u + (i < len - 1 ? ' ' : ''), status: match ? 'correct' : 'wrong' });
		if (c) correctSegments.push({ text: c + (i < len - 1 ? ' ' : ''), status: match ? 'correct' : 'wrong' });
	}

	const accuracyScore = cWords.length > 0 ? Math.round((correctCount / cWords.length) * 100) : 0;
	return { userSegments, correctSegments, accuracyScore };
}

function HighlightedSentence({ segments }: { segments: Segment[] }) {
	return (
		<p style={{ margin: '0 0 12px', color: '#251915', fontSize: 'clamp(1.06rem, 1.55vw, 1.55rem)', lineHeight: 1.25 }}>
			{segments.map((seg, i) => {
				if (seg.status === 'wrong')
					return <span key={i} style={{ padding: '0 4px', color: '#8b1010', background: '#ffaaa9' }}>{seg.text}</span>;
				if (seg.status === 'correct')
					return <span key={i} style={{ padding: '0 4px', color: '#0f4e29', background: '#b8e5a9' }}>{seg.text}</span>;
				return <span key={i}>{seg.text}</span>;
			})}
		</p>
	);
}

function fmt(s: number) {
	return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PracticePage() {
	return (
		<Suspense fallback={
			<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<div style={{ color: '#5b311e', fontSize: '1.2rem' }}>Loading...</div>
			</div>
		}>
			<PracticeContent />
		</Suspense>
	);
}

function PracticeContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const { isLoggedIn, isLoading: authLoading } = useAuth();
	const materialId = Number(searchParams.get('materialId'));
	const highlightSentenceId = Number(searchParams.get('highlightSentenceId')) || null;

	const [material, setMaterial] = useState<Material | null>(null);
	const [sentences, setSentences] = useState<Sentence[]>([]);
	const [sessionId, setSessionId] = useState<number | null>(null);
	const [currentIdx, setCurrentIdx] = useState(0);
	const [highlightedSentenceId, setHighlightedSentenceId] = useState<number | null>(null);
	const [answers, setAnswers] = useState<Map<number, AnswerRecord>>(new Map());
	const [pageLoading, setPageLoading] = useState(true);
	const [pageError, setPageError] = useState('');

	const [isPlaying, setIsPlaying] = useState(false);
	const [speed, setSpeed] = useState(1.0);
	const [elapsed, setElapsed] = useState(0);
	const [inputText, setInputText] = useState('');
	const [showComparison, setShowComparison] = useState(false);
	const [liveWave, setLiveWave] = useState(WAVEFORM);

	const [showNoteModal, setShowNoteModal] = useState(false);
	const [noteText, setNoteText] = useState('');
	const [noteSaving, setNoteSaving] = useState(false);

	// ── 结算弹窗 state ──
	const [showCompletion, setShowCompletion] = useState(false);

	const [practiceMode, setPracticeMode] = useState<PracticeMode>('full_text');
	const [blankCount, setBlankCount] = useState(2);
	const [blanks, setBlanks] = useState<BlankItem[]>([]);
	const [blankInputs, setBlankInputs] = useState<string[]>([]);
	const [hintLevel, setHintLevel] = useState(0);
	const [highlightedBlankIdx, setHighlightedBlankIdx] = useState<number | null>(null);

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const audioRef = useRef<HTMLAudioElement>(null);
	const pendingRef = useRef<Map<number, AnswerRecord>>(new Map());
	const syncCntRef = useRef(0);
	const sessionStartTime = useRef<number>(Date.now());

	const [audioDuration, setAudioDuration] = useState(0);
	const TOTAL_SECONDS = audioDuration || 1;

	const progress = useMemo(() => Math.min(elapsed / TOTAL_SECONDS, 1), [elapsed, TOTAL_SECONDS]);
	const speedLabel = useMemo(() => speed.toFixed(1) + 'x', [speed]);
	const speedIdx = useMemo(() => SPEED_STEPS.indexOf(speed), [speed]);
	const speedFillPct = useMemo(() => (speedIdx / (SPEED_STEPS.length - 1)) * 100, [speedIdx]);
	const [totalSubmits, setTotalSubmits] = useState(0); // 💡 新增：记录总提交次数

	// ── Auth guard ──────────────────────────────────────────────────────────────
	useEffect(() => {
		if (!authLoading && !isLoggedIn) router.push('/login');
	}, [authLoading, isLoggedIn, router]);

	// ── 加载数据 ────────────────────────────────────────────────────────────────
	useEffect(() => {
		if (!materialId || authLoading || !isLoggedIn) return;
		const token = localStorage.getItem('access_token');

		const load = async () => {
			try {
				const [matRes, senRes] = await Promise.all([
					fetch(`${API}/materials/${materialId}`),
					fetch(`${API}/materials/${materialId}/sentences`),
				]);
				if (!matRes.ok) throw new Error('Material not found');
				const mat: Material = await matRes.json();
				const sens: Sentence[] = await senRes.json();
				setMaterial(mat);
				setSentences(sens);

				const sessRes = await fetch(`${API}/practice/sessions`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
					body: JSON.stringify({ material_id: materialId }),
				});
				if (sessRes.ok) {
					const { session, resumed } = await sessRes.json();
					setSessionId(session.id);

					if (highlightSentenceId && sens.length > 0) {
						const idx = sens.findIndex((s) => s.id === highlightSentenceId);
						if (idx >= 0) {
							setCurrentIdx(idx);
							setHighlightedSentenceId(highlightSentenceId);
							setTimeout(() => setHighlightedSentenceId(null), 3000);
						}
					} else if (resumed && session.current_sentence_id && sens.length > 0) {
						const idx = sens.findIndex((s) => s.id === session.current_sentence_id);
						if (idx >= 0) setCurrentIdx(idx);
					}
				}
			} catch (e: unknown) {
				setPageError(e instanceof Error ? e.message : 'Failed to load');
			} finally {
				setPageLoading(false);
			}
		};
		load();
	}, [materialId, authLoading, isLoggedIn, highlightSentenceId]);

	const syncToServer = useCallback(() => {
		if (!sessionId || pendingRef.current.size === 0) return;
		const token = localStorage.getItem('access_token');
		const progress_percentage = sentences.length > 0
			? Math.round((answers.size / sentences.length) * 100) : 0;

		const now = Date.now();
		const time_spent_seconds = Math.floor((now - sessionStartTime.current) / 1000);
		sessionStartTime.current = now;

		const payload = {
			session_id: sessionId, material_id: materialId, progress_percentage,
			current_sentence_id: sentences[currentIdx]?.id ?? null,
			time_spent_seconds,
			answers: Array.from(pendingRef.current.entries()).map(([sid, rec]) => ({
				sentence_id: sid, user_answer: rec.userAnswer,
				correct_answer: sentences.find((s) => s.id === sid)?.content ?? '',
				accuracy_score: rec.accuracyScore,
			})),
		};
		pendingRef.current.clear();
		fetch(`${API}/practice/progress`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(payload),
			keepalive: true,
		}).catch(() => { });
	}, [sessionId, materialId, sentences, currentIdx, answers]);

	// ─── 用户操作函数（全部提前定义）─────────────────────────────────────────

	const handleTogglePlay = useCallback(() => {
		const audio = audioRef.current;
		if (!audio) return;
		if (isPlaying) { audio.pause(); setIsPlaying(false); }
		else { audio.play(); setIsPlaying(true); }
	}, [isPlaying]);

	const handleStop = useCallback(() => {
		const audio = audioRef.current;
		if (audio) { audio.pause(); audio.currentTime = 0; }
		setIsPlaying(false); setElapsed(0);
	}, []);

	const handleSeekForward = useCallback(() => {
		if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 5, audioDuration);
	}, [audioDuration]);

	const handleSeekBackward = useCallback(() => {
		if (audioRef.current) audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 5, 0);
	}, []);

	const handleRepeat = useCallback(() => {
		const audio = audioRef.current;
		if (!audio) return;
		const s = sentences[currentIdx];
		audio.currentTime = s?.audio_start_time ?? 0;
		audio.play(); setIsPlaying(true);
	}, [sentences, currentIdx]);

	const handleNext = useCallback(() => {
		const nextIdx = currentIdx + 1;
		if (nextIdx < sentences.length) {
			setCurrentIdx(nextIdx);
			setInputText(''); setShowComparison(false);
			setBlankInputs([]); setHintLevel(0); setHighlightedBlankIdx(null);
			const audio = audioRef.current;
			const s = sentences[nextIdx];
			if (audio && s?.audio_start_time != null) {
				audio.currentTime = s.audio_start_time;
				audio.play(); setIsPlaying(true);
			}
		} else {
			// 全部完成：同步进度并弹出结算
			setInputText(''); setShowComparison(false);
			setBlankInputs([]); setHintLevel(0); setHighlightedBlankIdx(null);
			const audio = audioRef.current;
			if (audio) { audio.pause(); setIsPlaying(false); }
			syncToServer();
			setShowCompletion(true);
		}
	}, [currentIdx, sentences, syncToServer]);

	const handleSubmit = useCallback(() => {
		const sentence = sentences[currentIdx];
		if (!sentence) return;

		if (practiceMode === 'fill_in_blank' && blankInputs.every((v) => !v.trim())) return;
		if (practiceMode === 'full_text' && !inputText.trim()) return;

		setTotalSubmits((prev) => prev + 1);

		let record: AnswerRecord;

		if (practiceMode === 'fill_in_blank') {
			if (blankInputs.every((v) => !v.trim())) return;
			const { segments, accuracyScore } = diffFillInBlank(blankInputs, blanks);
			const userSegs: Segment[] = blankInputs.map((v, i) => ({
				text: (v || '___') + ' ',
				status: segments[i]?.status ?? 'wrong',
			}));
			record = {
				userAnswer: blankInputs.join(' '),
				userSegments: userSegs,
				correctSegments: segments,
				accuracyScore,
				submitted: true,
			};
		} else {
			if (!inputText.trim()) return;
			const { userSegments, correctSegments, accuracyScore } = diffAnswer(inputText, sentence.content);
			record = { userAnswer: inputText, userSegments, correctSegments, accuracyScore, submitted: true };
		}

		setAnswers((prev) => new Map(prev).set(sentence.id, record));
		pendingRef.current.set(sentence.id, record);
		syncCntRef.current += 1;
		if (syncCntRef.current % 5 === 0) syncToServer();
		setShowComparison(true);
	}, [inputText, blankInputs, blanks, practiceMode, sentences, currentIdx, syncToServer]);

	// ── 音频事件绑定 ──────────────────────────────────────────────────────────
	// 用 ref 存最新的 sentences/currentIdx，避免闭包问题
	const sentencesRef = useRef(sentences);
	const currentIdxRef = useRef(currentIdx);
	const answersRef = useRef(answers);   // 追踪答题状态，供音频回调读取
	useEffect(() => { sentencesRef.current = sentences; }, [sentences]);
	useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);
	useEffect(() => { answersRef.current = answers; }, [answers]);

	// 用 callback ref：audio 元素挂载到 DOM 时立即绑定事件，卸载时清除
	// 定位到当前句子开始时间的工具函数
	const seekToCurrentSentence = (audioEl: HTMLAudioElement) => {
		const sens = sentencesRef.current;
		const cidx = currentIdxRef.current;
		const target = sens[cidx];
		if (target?.audio_start_time != null) {
			audioEl.currentTime = target.audio_start_time;
		}
	};

	const audioCallbackRef = useCallback((audio: HTMLAudioElement | null) => {
		if (!audio) return;
		(audioRef as React.MutableRefObject<HTMLAudioElement | null>).current = audio;

		const onTime = () => {
			setElapsed(audio.currentTime);
			const sens = sentencesRef.current;
			const cidx = currentIdxRef.current;
			const ansMap = answersRef.current;
			if (sens.length === 0) return;

			const t = audio.currentTime;
			const curSentence = sens[cidx];

			// 当音频播出当前句子结束时间，自动暂停并回到句子起点
			// 用户必须手动点播放才能继续，确保专注在当前句子
			if (
				curSentence?.audio_end_time != null &&
				t > curSentence.audio_end_time + 0.3
			) {
				audio.pause();
				audio.currentTime = curSentence.audio_start_time ?? t;
				setIsPlaying(false);
				return;
			}

			// 已答对时才允许随音频自动跳句
			const idx = sens.findIndex(
				(s) => s.audio_start_time != null && s.audio_end_time != null
					&& t >= s.audio_start_time && t < s.audio_end_time
			);
			const curAnswer = curSentence?.id ? ansMap.get(curSentence.id) : undefined;
			const answered = curAnswer && curAnswer.accuracyScore >= 80;
			if (idx >= 0 && idx !== cidx && answered) setCurrentIdx(idx);
		};

		const onMeta = () => {
			setAudioDuration(audio.duration);
			// metadata 就绪后定位到当前句子（若句子数据已加载）
			seekToCurrentSentence(audio);
		};

		const onEnded = () => setIsPlaying(false);

		audio.addEventListener('timeupdate', onTime);
		audio.addEventListener('loadedmetadata', onMeta);
		audio.addEventListener('ended', onEnded);

		// 浏览器缓存：metadata 已就绪，直接处理
		if (!isNaN(audio.duration) && audio.duration > 0) {
			setAudioDuration(audio.duration);
			seekToCurrentSentence(audio);
		}
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	// ── 句子数据就绪后，若 audio 已加载完成则立刻定位 ──────────────────────────
	// 解决：API 返回比 loadedmetadata 慢时，onMeta 时 sentencesRef 还是空的情况
	useEffect(() => {
		if (sentences.length === 0) return;
		const audio = audioRef.current;
		if (!audio) return;
		// 只在还没播放过时定位（currentTime 接近 0）
		if (audio.currentTime < 2) {
			const target = sentences[currentIdx];
			if (target?.audio_start_time != null) {
				audio.currentTime = target.audio_start_time;
			}
		}
	}, [sentences]); // eslint-disable-line react-hooks/exhaustive-deps

	// ── 波形动画 ────────────────────────────────────────────────────────────
	useEffect(() => {
		if (!isPlaying) return;
		const id = setInterval(() => {
			setLiveWave(WAVEFORM.map((h) => Math.max(4, h + (Math.random() - 0.5) * 14)));
		}, 130);
		return () => clearInterval(id);
	}, [isPlaying]);

	// ── 键盘快捷键 ──────────────────────────────────────────────────────────
	useEffect(() => {
		const fn = (e: KeyboardEvent) => {
			// 笔记弹窗打开时禁用所有快捷键
			if (showNoteModal) return;

			const inInput = document.activeElement === textareaRef.current
				|| (document.activeElement as HTMLElement)?.tagName === 'INPUT'
				|| (document.activeElement as HTMLElement)?.tagName === 'TEXTAREA';

			if (e.code === 'Space' && !inInput) {
				e.preventDefault();
				handleTogglePlay();
			}
			if (e.code === 'KeyR' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				handleRepeat();
			}
		};
		window.addEventListener('keydown', fn);
		return () => window.removeEventListener('keydown', fn);
	}, [handleTogglePlay, handleRepeat, showNoteModal]);

	// ── 离开页面同步 ─────────────────────────────────────────────────────────
	useEffect(() => {
		window.addEventListener('pagehide', syncToServer);
		return () => window.removeEventListener('pagehide', syncToServer);
	}, [syncToServer]);

	// ── 速度同步到音频 ─────────────────────────────────────────────────────
	useEffect(() => {
		if (audioRef.current) audioRef.current.playbackRate = speed;
	}, [speed]);

	// ── 句子/模式切换时重新生成填空 ────────────────────────────────────────
	useEffect(() => {
		if (practiceMode === 'fill_in_blank' && sentences[currentIdx]) {
			const newBlanks = generateBlanks(sentences[currentIdx].content, blankCount);
			setBlanks(newBlanks);
			setBlankInputs(new Array(newBlanks.length).fill(''));
		}
	}, [currentIdx, practiceMode, blankCount, sentences]);

	// ── 记笔记 ─────────────────────────────────────────────────────────────────
	const handleSaveNote = async () => {
		if (!noteText.trim()) return;
		setNoteSaving(true);
		try {
			const token = localStorage.getItem('access_token');
			await fetch(`${API}/notes`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({
					material_id: materialId,
					sentence_id: sentences[currentIdx]?.id ?? null,
					content: noteText,
				}),
			});
			setNoteText(''); setShowNoteModal(false);
		} catch { /* 静默失败 */ }
		finally { setNoteSaving(false); }
	};

	const currentSentence = sentences[currentIdx];
	const currentAnswer = currentSentence ? answers.get(currentSentence.id) : undefined;

	// ── Loading / Error ─────────────────────────────────────────────────────────
	if (pageLoading) {
		return (
			<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fbf9f4' }}>
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: '#6b513b' }}>
					<Loader2 style={{ width: 40, height: 40, animation: 'spin 1s linear infinite' }} />
					<p>Loading material...</p>
					<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
				</div>
			</div>
		);
	}
	if (pageError || !material) {
		return (
			<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
				<p style={{ fontSize: '1.2rem', color: '#6b513b' }}>{pageError || 'Material not found'}</p>
				<Link href="/" style={{ color: '#1c452c', textDecoration: 'underline' }}>← Back to Home</Link>
			</div>
		);
	}

	// ─── Render ─────────────────────────────────────────────────────────────
	return (
		<>
			<audio
				ref={audioCallbackRef}
				src={(() => {
					if (!material.audio_url) return '';
					if (material.audio_url.startsWith('http')) {
						// OSS URL：只对路径部分编码（处理中文目录名）
						try {
							const url = new URL(material.audio_url);
							// decodeURIComponent 先解码，再 encodeURIComponent 重新编码，最后还原斜杠
							url.pathname = url.pathname.split('/').map(seg => encodeURIComponent(decodeURIComponent(seg))).join('/');
							return url.toString();
						} catch {
							return material.audio_url;
						}
					}
					// 本地开发走后端代理
					return `${API}/materials/${material.id}/audio`;
				})()}
				preload="auto"
			/>

			<style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; min-height: 100vh; }
      `}</style>

			<div
				style={{
					width: '100vw', minHeight: '100vh', margin: 0, overflow: 'auto',
					fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
					color: '#4b3621',
					background: `
            radial-gradient(circle at 20% 18%, rgba(255,255,255,0.88), transparent 28rem),
            linear-gradient(90deg, rgba(250,244,232,0.94), rgba(252,248,240,0.90)),
            repeating-linear-gradient(90deg, rgba(99,63,28,0.035) 0 1px, transparent 1px 18px)
          `,
				}}
			>
				<HomeNavbar />

				<header
					style={{
						display: 'flex', alignItems: 'center', justifyContent: 'space-between',
						minHeight: 60, padding: '0 32px',
						background: `
              linear-gradient(90deg, rgba(233,163,92,0.88), rgba(238,178,113,0.82)),
              repeating-linear-gradient(0deg, rgba(113,68,28,0.16) 0 1px, transparent 1px 6px),
              linear-gradient(90deg, #d89552, #efbd86)
            `,
						borderTop: '1px solid rgba(145,86,36,0.22)', borderBottom: '1px solid rgba(145,86,36,0.28)',
						boxShadow: 'inset 0 6px 10px rgba(255,235,195,0.3), inset 0 -7px 13px rgba(135,75,28,0.14)',
					}}
				>
					<h1 style={{
						margin: 0, color: '#064f2c',
						fontFamily: "Georgia,'Times New Roman',serif",
						fontSize: 'clamp(1.65rem,3vw,3rem)', fontWeight: 800, letterSpacing: '-0.035em',
					}}>
						{material.title}
					</h1>
					<span style={{ color: '#201713', fontSize: 'clamp(1.1rem,1.9vw,2rem)', whiteSpace: 'nowrap', fontWeight: 800 }}>
						{sentences.length > 0 ? `${currentIdx + 1} / ${sentences.length}` : ''}
					</span>
				</header>

				<section
					style={{
						display: 'grid',
						gridTemplateColumns: '1fr 1fr',
						gap: 24, padding: '16px 32px 20px', alignItems: 'start',
					}}
				>
					{/* ── LEFT: Audio Player ── */}
					<article
						aria-label="Audio player"
						style={{
							padding: 12, border: '13px solid #78a36a', borderRadius: 38,
							background: `
                linear-gradient(145deg, rgba(247,199,140,0.86), rgba(220,142,67,0.76)),
                repeating-linear-gradient(0deg, rgba(104,62,25,0.1) 0 1px, transparent 1px 8px)
              `,
							boxShadow: `
                0 17px 0 #9b6632, 0 28px 38px rgba(59,38,19,0.36),
                inset 0 0 0 2px rgba(110,65,26,0.25), inset 0 8px 12px rgba(255,241,210,0.35)
              `,
						}}
					>
						<div style={{
							borderRadius: 20,
							background: `
                linear-gradient(90deg, rgba(240,171,99,0.66), rgba(246,198,141,0.74)),
                repeating-linear-gradient(0deg, rgba(122,78,34,0.12) 0 1px, transparent 1px 9px)
              `,
						}}>
							<div aria-label="Audio waveform" style={{
								margin: 0, padding: '16px 20px', height: 160,
								border: '3px solid rgba(126,79,38,0.38)', borderRadius: '22px 22px 0 0',
								background: `
                  radial-gradient(circle at 15% 20%, rgba(255,255,255,0.85), transparent 16rem),
                  linear-gradient(180deg, #fff8ec, #f5e8d5)
                `,
								boxShadow: 'inset 0 6px 12px rgba(63,36,16,0.14)',
							}}>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: '100%' }}>
									{liveWave.map((h, i) => {
										const s = sentencesRef.current[currentIdxRef.current];
										const senStart = s?.audio_start_time ?? 0;
										const senEnd = s?.audio_end_time ?? 0;
										const senDur = senEnd - senStart;
										const senPos = Math.max(0, elapsed - senStart);
										const senProg = senDur > 0 ? Math.min(senPos / senDur, 1) : 0;
										const played = i / liveWave.length < senProg;
										return (
											<span key={i} style={{
												width: 4, minHeight: 6, height: `${h}%`, borderRadius: 999,
												transition: 'height 0.1s ease',
												background: played
													? 'linear-gradient(180deg,#5b9b66,#005e34)'
													: 'linear-gradient(180deg,#ad743c,#7e4b23)',
											}} />
										);
									})}
								</div>
							</div>

							<div style={{
								display: 'grid', gridTemplateColumns: '1fr 0.95fr', gap: '18px 28px',
								padding: '16px 20px 16px',
								border: '3px solid rgba(126,79,38,0.25)', borderTop: 0, borderRadius: '0 0 22px 22px',
								background: 'linear-gradient(180deg, rgba(255,248,237,0.74), rgba(251,234,210,0.82))',
							}}>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
									<button type="button" aria-label="Seek backward 5 seconds" onClick={handleSeekBackward}
										style={{
											display: 'grid', placeItems: 'center', width: 54, height: 54, borderRadius: '50%',
											color: '#9a5e31', background: 'radial-gradient(circle at 35% 25%,#fff7ed,#f1d4b1)',
											border: '2px solid rgba(144,89,44,0.5)',
											boxShadow: '0 5px 12px rgba(76,43,17,0.22), inset 0 3px 7px rgba(255,255,255,0.55)',
											fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', lineHeight: 1.1,
										}}>-5s</button>

									<button type="button" aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
										onClick={handleTogglePlay}
										style={{
											display: 'grid', placeItems: 'center', width: 100, height: 100, borderRadius: '50%',
											color: '#fff6df', fontSize: '3.2rem', lineHeight: 1,
											background: 'radial-gradient(circle at 36% 25%,#5f9a5e,#0d6b38 66%,#07542c)',
											border: '6px solid #d29b62',
											boxShadow: '0 8px 0 #a86431, 0 13px 20px rgba(59,39,17,0.34), inset 0 5px 14px rgba(255,255,255,0.28)',
											cursor: 'pointer',
										}}>
										{isPlaying ? 'Ⅱ' : '▶'}
									</button>

									<button type="button" aria-label="Seek forward 5 seconds" onClick={handleSeekForward}
										style={{
											display: 'grid', placeItems: 'center', width: 54, height: 54, borderRadius: '50%',
											color: '#9a5e31', background: 'radial-gradient(circle at 35% 25%,#fff7ed,#f1d4b1)',
											border: '2px solid rgba(144,89,44,0.5)',
											boxShadow: '0 5px 12px rgba(76,43,17,0.22), inset 0 3px 7px rgba(255,255,255,0.55)',
											fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', lineHeight: 1.1,
										}}>+5s</button>
								</div>

								<div style={{
									alignSelf: 'center', padding: '22px 26px 16px',
									border: '2px solid rgba(170,124,78,0.45)', borderRadius: 18,
									background: 'rgba(255,251,244,0.78)', boxShadow: 'inset 0 3px 10px rgba(91,54,24,0.08)',
								}}>
									<strong style={{
										display: 'block', marginBottom: 22, color: '#382017',
										fontSize: 'clamp(1.1rem,1.6vw,1.65rem)', textAlign: 'center', fontWeight: 500,
									}}>
										Speed: {speedLabel}
									</strong>
									<div style={{ position: 'relative', height: 12, borderRadius: 999, background: '#d8c8b3', boxShadow: 'inset 0 2px 5px rgba(85,50,21,0.25)' }}>
										<span style={{ display: 'block', width: `${speedFillPct}%`, height: '100%', borderRadius: 'inherit', background: 'linear-gradient(90deg,#449457,#84b66b)' }} />
										<span style={{
											position: 'absolute', top: '50%', left: `${speedFillPct}%`,
											width: 40, height: 40, borderRadius: '50%',
											background: 'linear-gradient(90deg,#d28d4b,#e4ae73)', border: '2px solid #a56632',
											transform: 'translate(-50%,-50%)', boxShadow: '0 4px 8px rgba(76,43,18,0.28)',
										}} />
										<input type="range" min={0} max={5} step={1} value={speedIdx}
											aria-label="Playback speed"
											onChange={(e) => setSpeed(SPEED_STEPS[Number(e.target.value)])}
											style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} />
									</div>
									<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, color: '#382017', fontSize: 'clamp(0.75rem,1.1vw,1.1rem)' }}>
										<span>0.5x</span><span>0.75x</span><span>1.0x</span><span>1.25x</span><span>1.5x</span><span>2.0x</span>
									</div>
								</div>

								{/* 进度条：显示当前句子内的播放进度 + 句子计数 */}
								<div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 20 }}>
									<div>
										{/* 句子内进度条 */}
										{(() => {
											const s = sentences[currentIdx];
											const start = s?.audio_start_time ?? 0;
											const end = s?.audio_end_time ?? 0;
											const dur = end - start;
											const pos = Math.max(0, elapsed - start);
											const senPct = dur > 0 ? Math.min(pos / dur, 1) : 0;
											return (
												<div
													style={{ position: 'relative', height: 12, borderRadius: 999, background: '#d5c2aa', boxShadow: 'inset 0 2px 5px rgba(80,45,17,0.23)', cursor: 'pointer' }}
													onClick={(e) => {
														if (!s || dur <= 0) return;
														const r = e.currentTarget.getBoundingClientRect();
														const pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
														if (audioRef.current) audioRef.current.currentTime = start + pct * dur;
													}}
												>
													<span style={{ display: 'block', width: `${senPct * 100}%`, height: '100%', borderRadius: 'inherit', background: 'linear-gradient(90deg,#0c7a3b,#5fa45b)', transition: 'width 0.08s linear' }} />
													<span style={{
														position: 'absolute', top: '50%', left: `${senPct * 100}%`,
														width: 38, height: 38, borderRadius: '50%',
														background: 'linear-gradient(145deg,#3a9a54,#23793d)', border: '2px solid #11632f',
														transform: 'translate(-50%,-50%)', boxShadow: '0 4px 8px rgba(43,71,33,0.32)',
													}} />
												</div>
											);
										})()}
										{/* 句子时长显示 */}
										{(() => {
											const s = sentences[currentIdx];
											const dur = (s?.audio_end_time ?? 0) - (s?.audio_start_time ?? 0);
											const pos = Math.max(0, elapsed - (s?.audio_start_time ?? 0));
											return (
												<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, color: '#8a6b4a', fontSize: 'clamp(0.8rem,1.1vw,1.1rem)' }}>
													<span>{fmt(Math.min(pos, dur))}</span>
													<span>{fmt(dur)}</span>
												</div>
											);
										})()}
									</div>
									{/* 句子计数：13 / 53 */}
									<span style={{
										color: '#2e1c16', fontSize: 'clamp(1rem,1.45vw,1.5rem)',
										fontWeight: 800, whiteSpace: 'nowrap', letterSpacing: '-0.02em',
									}}>
										{sentences.length > 0 ? `${currentIdx + 1} / ${sentences.length}` : ''}
									</span>
								</div>
							</div>
						</div>

						<button type="button" onClick={handleRepeat}
							style={{
								width: '100%', marginTop: 26, padding: '15px 18px',
								border: '2px solid rgba(170,124,78,0.42)', borderRadius: 14,
								color: '#5b311e', background: 'rgba(255,248,237,0.82)',
								boxShadow: 'inset 0 3px 8px rgba(255,255,255,0.6), 0 5px 10px rgba(77,45,19,0.12)',
								fontSize: 'clamp(1.15rem,1.55vw,1.65rem)', fontWeight: 800, cursor: 'pointer',
							}}>
							↻ Repeat Sentence
						</button>
					</article>

					{/* ── RIGHT: Input + Answer ── */}
					<section aria-label="Answer area" style={{ position: 'relative', paddingTop: 0 }}>
						{highlightedSentenceId && currentSentence?.id === highlightedSentenceId && (
							<div style={{
								marginBottom: 12, padding: '10px 18px', borderRadius: 12,
								background: 'linear-gradient(90deg,#0c7a3b,#3a9a54)',
								color: '#fff', fontSize: 'clamp(0.95rem,1.3vw,1.2rem)', fontWeight: 700,
								display: 'flex', alignItems: 'center', gap: 8,
								boxShadow: '0 4px 12px rgba(12,122,59,0.3)',
								animation: 'fadeIn 0.3s ease',
							}}>
								📌 Jumped from your notes — this is the sentence you bookmarked
							</div>
						)}

						<article
							style={{
								position: 'relative', zIndex: 2, padding: '22px 22px 24px',
								border: '10px solid #78a36a', borderRadius: 34,
								background: `
                  linear-gradient(145deg, rgba(249,202,146,0.9), rgba(224,145,70,0.78)),
                  repeating-linear-gradient(0deg, rgba(104,62,25,0.11) 0 1px, transparent 1px 8px)
                `,
								boxShadow: '0 12px 20px rgba(40,34,22,0.25), inset 0 0 0 2px rgba(112,67,28,0.26)',
							}}
						>
							{sentences.length > 0 && (
								<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
									<button
										type="button"
										// 👇 在这里加上 setHintLevel(0);
										onClick={() => { setPracticeMode('full_text'); setShowComparison(false); setInputText(''); setHintLevel(0); }}
										style={{
											padding: '6px 18px', borderRadius: 999, fontWeight: 700, cursor: 'pointer',
											fontSize: 'clamp(0.85rem,1.1vw,1.1rem)',
											background: practiceMode === 'full_text' ? '#0d6735' : 'rgba(255,248,237,0.8)',
											color: practiceMode === 'full_text' ? '#fff6df' : '#5b311e',
											border: practiceMode === 'full_text' ? '2px solid #0b4c2a' : '2px solid rgba(126,79,38,0.4)',
										}}
									>
										Full Text
									</button>
									<button
										type="button"
										// 👇 在这里加上 setHintLevel(0);
										onClick={() => { setPracticeMode('fill_in_blank'); setShowComparison(false); setInputText(''); setHintLevel(0); }}
										style={{
											padding: '6px 18px', borderRadius: 999, fontWeight: 700, cursor: 'pointer',
											fontSize: 'clamp(0.85rem,1.1vw,1.1rem)',
											background: practiceMode === 'fill_in_blank' ? '#0d6735' : 'rgba(255,248,237,0.8)',
											color: practiceMode === 'fill_in_blank' ? '#fff6df' : '#5b311e',
											border: practiceMode === 'fill_in_blank' ? '2px solid #0b4c2a' : '2px solid rgba(126,79,38,0.4)',
										}}
									>
										Fill in Blank
									</button>
									{practiceMode === 'fill_in_blank' && (
										<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
											<span style={{ fontSize: 'clamp(0.8rem,1vw,1rem)', color: '#5b311e', fontWeight: 600 }}>Blanks:</span>
											{[1, 2, 3, 4].map((n) => (
												<button
													key={n}
													type="button"
													onClick={() => setBlankCount(n)}
													style={{
														width: 28, height: 28, borderRadius: '50%', fontWeight: 700,
														fontSize: '0.85rem', cursor: 'pointer',
														background: blankCount === n ? '#0d6735' : 'rgba(255,248,237,0.8)',
														color: blankCount === n ? '#fff6df' : '#5b311e',
														border: blankCount === n ? '2px solid #0b4c2a' : '2px solid rgba(126,79,38,0.4)',
													}}
												>
													{n}
												</button>
											))}
										</div>
									)}
								</div>
							)}

							{practiceMode === 'full_text' && (
								<textarea
									ref={textareaRef}
									value={inputText}
									onChange={(e) => {
										setInputText(e.target.value);
										if (showComparison) setShowComparison(false);
									}}
									onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
									placeholder={sentences.length === 0 ? 'No sentence data yet. Audio only mode.' : 'Type what you hear and press Enter...'}
									disabled={sentences.length === 0}
									style={{
										display: 'block', width: '100%', minHeight: 190, resize: 'vertical',
										border: '3px solid rgba(126,79,38,0.48)', borderRadius: 18, padding: '22px 24px',
										color: '#332019', background: 'linear-gradient(145deg,#fff8ed,#f7eadb)',
										boxShadow: 'inset 0 5px 12px rgba(70,40,18,0.14)',
										font: 'inherit', fontSize: 'clamp(1.15rem,1.7vw,1.8rem)', outline: 'none',
									}}
								/>
							)}

							{practiceMode === 'fill_in_blank' && currentSentence && blanks.length > 0 && (
								<div style={{
									minHeight: 80, padding: '16px 20px',
									border: '3px solid rgba(126,79,38,0.48)', borderRadius: 18,
									background: 'linear-gradient(145deg,#fff8ed,#f7eadb)',
									boxShadow: 'inset 0 5px 12px rgba(70,40,18,0.14)',
									// 用 flex + wrap 代替 inline，保证长句自动换行不溢出
									display: 'flex', flexWrap: 'wrap', alignItems: 'center',
									gap: '4px 6px',
									fontSize: 'clamp(1rem,1.35vw,1.4rem)', lineHeight: 1.8, color: '#332019',
								}}>
									{currentSentence.content.trim().split(/\s+/).map((word, wi) => {
										const blankIdx = blanks.findIndex((b) => b.wordIndex === wi);
										if (blankIdx >= 0) {
											return (
												<input
													key={wi}
													type="text"
													value={blankInputs[blankIdx] ?? ''}
													onChange={(e) => {
														const next = [...blankInputs];
														next[blankIdx] = e.target.value;
														setBlankInputs(next);
														if (showComparison) setShowComparison(false);
													}}
													onKeyDown={(e) => {
														if (e.key === 'Tab') {
															e.preventDefault();
															const inputs = document.querySelectorAll<HTMLInputElement>('.blank-input');
															const curIdx = Array.from(inputs).findIndex((el) => el === e.target);
															if (curIdx >= 0 && curIdx < inputs.length - 1) inputs[curIdx + 1].focus();
														}

														if (e.key === 'Enter' && !e.shiftKey) {
															e.preventDefault();
															const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('.blank-input'));
															const curIdx = inputs.findIndex((el) => el === e.target);

															// 1. 当前空后面还有未填的空 → 跳到下一个未填的空
															const nextEmpty = inputs.findIndex((el, i) => i > curIdx && !el.value.trim());
															if (nextEmpty >= 0) {
																inputs[nextEmpty].focus();
																setHighlightedBlankIdx(nextEmpty);
																setTimeout(() => setHighlightedBlankIdx(null), 1500);
																return;
															}

															// 2. 当前空前面还有未填的空 → 高亮第一个未填的空
															const firstEmpty = inputs.findIndex((el) => !el.value.trim());
															if (firstEmpty >= 0) {
																inputs[firstEmpty].focus();
																setHighlightedBlankIdx(firstEmpty);
																setTimeout(() => setHighlightedBlankIdx(null), 1500);
																return;
															}

															// 3. 所有空都填了 → 提交答案
															handleSubmit();
														}
													}}
													placeholder="___"
													className="blank-input"
													style={{
														width: `${Math.max(word.length, 3) + 1}ch`,
														border: 'none',
														borderBottom: highlightedBlankIdx === blankIdx
															? '2.5px solid #e05c1e'   // 橙色：提示需要填写
															: '2.5px solid #0d6735',  // 绿色：正常
														background: highlightedBlankIdx === blankIdx
															? 'rgba(224,92,30,0.08)'
															: 'rgba(13,103,53,0.06)',
														borderRadius: 4, outline: 'none', textAlign: 'center',
														fontSize: 'inherit', color: '#0d6735', fontWeight: 700,
														padding: '2px 4px', flexShrink: 0,
														transition: 'border-color 0.2s, background 0.2s',
													}}
												/>
											);
										}
										return <span key={wi}>{word}</span>;
									})}
								</div>
							)}

							<div style={{ display: 'flex', alignItems: 'center', gap: 26, marginTop: 18 }}>
								<button type="button" onClick={handleSubmit}
									style={{
										padding: '14px 32px', borderRadius: 11, color: '#fff6df',
										background: 'linear-gradient(180deg,#2c8a4d,#0d6735)',
										border: '2px solid rgba(7,72,34,0.62)',
										boxShadow: '0 5px 0 #0b4c2a, 0 8px 14px rgba(36,47,24,0.26), inset 0 4px 8px rgba(255,255,255,0.22)',
										fontSize: 'clamp(1.15rem,1.55vw,1.65rem)', fontWeight: 700, cursor: 'pointer',
									}}>
									Submit ↗
								</button>

								<button type="button"
									onClick={() => {
										if (!currentSentence) return;
										if (hintLevel >= 3) return; // 防止超过上限

										const next = hintLevel + 1;
										setHintLevel(next);

										if (practiceMode === 'fill_in_blank') {
											// ... [保持你现有的填空模式提示代码不变] ...
											const newInputs = [...blankInputs];
											blanks.forEach((blank, i) => {
												const cleanWord = blank.word.replace(/[^a-zA-Z0-9']/g, '');
												if (next === 1) newInputs[i] = cleanWord.charAt(0);
												else if (next === 2) newInputs[i] = cleanWord.substring(0, 2);
												else newInputs[i] = cleanWord;
											});
											setBlankInputs(newInputs);
										} else {
											// ✅ 优化后的全文模式提示逻辑
											const words = currentSentence.content.trim().split(/\s+/);

											if (next === 1) {
												// 第 1 级提示：给出开头的 2 到 3 个单词作为 Anchor（如果句子很短则至少给 1 个）
												const anchorCount = Math.max(2, Math.ceil(words.length * 0.2));
												const actualCount = Math.min(anchorCount, words.length - 1); // 保证不会直接给出全句
												setInputText(words.slice(0, actualCount).join(' ') + ' ...');
											} else if (next === 2) {
												// 第 2 级提示：给出句子的前 60%
												const halfCount = Math.ceil(words.length * 0.6);
												setInputText(words.slice(0, halfCount).join(' ') + ' ...');
											} else {
												// 第 3 级提示：完整句子
												setInputText(currentSentence.content);
											}
										}
									}}
									style={{
										padding: 0, borderRadius: 0, background: 'transparent',
										border: 'none', borderBottom: '2px solid currentColor',
										fontSize: 'clamp(1.1rem,1.55vw,1.55rem)', cursor: 'pointer',
										color: hintLevel > 0 ? '#b35c1e' : '#2e1c16',
									}}>
									Hint {hintLevel > 0 ? `(${hintLevel}/3)` : ''}
								</button>

								{sentences.length > 0 && (
									<button type="button" onClick={() => setShowNoteModal(true)}
										style={{
											display: 'inline-flex', alignItems: 'center', gap: 6,
											padding: 0, borderRadius: 0, color: '#2e1c16', background: 'transparent',
											border: 'none', borderBottom: '2px solid currentColor',
											fontSize: 'clamp(1.1rem,1.55vw,1.55rem)', cursor: 'pointer',
										}}>
										<PenLine size={18} /> Note
									</button>
								)}
							</div>
						</article>

						{showComparison && currentAnswer && (
							<article
								style={{
									width: 'calc(100% - 62px)', margin: '-18px auto 0',
									padding: '52px 26px 24px',
									border: '1px solid rgba(164,118,74,0.38)', borderRadius: '0 0 16px 16px',
									background: 'linear-gradient(145deg, rgba(255,249,239,0.94), rgba(248,232,211,0.9))',
									boxShadow: '0 8px 18px rgba(66,43,22,0.12)',
								}}
							>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
									<h2 style={{ margin: 0, color: '#064f2c', fontSize: 'clamp(1.25rem,1.75vw,1.8rem)' }}>
										Answer Comparison:
									</h2>
									<span style={{
										padding: '4px 14px', borderRadius: 999, fontWeight: 700,
										fontSize: 'clamp(0.95rem,1.3vw,1.3rem)',
										background: currentAnswer.accuracyScore >= 80 ? '#b8e5a9' : currentAnswer.accuracyScore >= 50 ? '#fde68a' : '#ffaaa9',
										color: currentAnswer.accuracyScore >= 80 ? '#0f4e29' : currentAnswer.accuracyScore >= 50 ? '#78350f' : '#8b1010',
									}}>
										{currentAnswer.accuracyScore}%
									</span>
								</div>

								<p style={{ margin: '0 0 4px', fontSize: '0.9rem', color: '#8b1010', fontWeight: 700 }}>Your answer:</p>
								<HighlightedSentence segments={currentAnswer.userSegments} />

								<p style={{ margin: '0 0 4px', fontSize: '0.9rem', color: '#0f4e29', fontWeight: 700 }}>
									{practiceMode === 'fill_in_blank' ? 'Correct blanks:' : 'Correct answer:'}
								</p>
								<HighlightedSentence segments={currentAnswer.correctSegments} />

								<div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
									{/* 答对（≥80%）才显示 Next Sentence */}
									{currentAnswer.accuracyScore >= 80 ? (
										<button type="button" onClick={handleNext}
											style={{
												padding: '10px 20px',
												border: '2px solid #0b4c2a', borderRadius: 10,
												color: '#fff6df', background: 'linear-gradient(180deg,#2c8a4d,#0d6735)',
												boxShadow: '0 5px 0 #0b4c2a, 0 8px 14px rgba(36,47,24,0.2)',
												fontSize: 'clamp(1.05rem,1.45vw,1.45rem)', cursor: 'pointer', fontWeight: 700,
											}}>
											Next Sentence →
										</button>
									) : (
										/* 答错：显示重试提示 */
										<button type="button" onClick={() => {
											setShowComparison(false);
											setInputText('');
											setBlankInputs(blanks.map(() => ''));
										}}
											style={{
												padding: '10px 20px',
												border: '2px solid rgba(170,124,78,0.42)', borderRadius: 10,
												color: '#8b1010', background: 'rgba(255,220,220,0.7)',
												boxShadow: '0 5px 8px rgba(74,43,18,0.14)',
												fontSize: 'clamp(1.05rem,1.45vw,1.45rem)', cursor: 'pointer', fontWeight: 700,
											}}>
											↺ Try Again
										</button>
									)}
									{/* 跳过按钮（低分时也可以强制进入下一句）*/}
									{currentAnswer.accuracyScore < 80 && (
										<button type="button" onClick={handleNext}
											style={{
												padding: '10px 16px',
												border: '2px solid rgba(170,124,78,0.42)', borderRadius: 10,
												color: '#6b513b', background: 'rgba(255,248,237,0.86)',
												fontSize: 'clamp(0.9rem,1.2vw,1.2rem)', cursor: 'pointer',
											}}>
											Skip →
										</button>
									)}
								</div>
							</article>
						)}

						{/* 未提交时不显示 Next Sentence，避免用户跳过 */}
						{!showComparison && sentences.length > 0 && (
							<div style={{ marginTop: 18, color: '#8a6b4a', fontSize: 'clamp(0.9rem,1.2vw,1.2rem)' }}>
								💡 Listen carefully, then type what you hear and press <strong>Submit</strong>.
							</div>
						)}
					</section>
				</section>

				<style>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
          @media (max-width: 1280px) { section[aria-label="Answer area"] { max-width: none; } }
          @media (max-width: 760px) {
            nav[aria-label="Primary navigation"],
            header { height: auto !important; flex-direction: column; align-items: flex-start; gap: 14px; padding: 20px !important; }
          }
          textarea::placeholder { color: #a98973; }
        `}</style>
			</div>

			{showNoteModal && (
				<div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
					<div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
						onClick={() => setShowNoteModal(false)} />
					<div style={{
						position: 'relative', zIndex: 1, background: '#f0e8d5', borderRadius: 20,
						boxShadow: '0 20px 50px rgba(0,0,0,0.4)', width: '100%', maxWidth: 440,
						padding: 28, border: '2px solid #c2a36d',
					}}>
						<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
							<strong style={{ color: '#1c452c', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
								<PenLine size={18} /> Add Note
							</strong>
							<button onClick={() => setShowNoteModal(false)}
								style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8c7355' }}>
								<X size={20} />
							</button>
						</div>

						{currentSentence && (
							<div style={{
								background: 'white', borderRadius: 12, padding: '10px 14px', marginBottom: 14,
								border: '1px solid #d0bfa1', fontSize: '0.9rem', color: '#3a2818',
							}}>
								<p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: '#8c7355', fontWeight: 700 }}>
									Sentence {currentIdx + 1}
								</p>
								{currentSentence.content}
							</div>
						)}

						<textarea
							value={noteText}
							onChange={(e) => setNoteText(e.target.value)}
							placeholder="Write your note here..."
							rows={4} autoFocus
							style={{
								width: '100%', padding: '12px 14px', border: '2px solid #1c452c', borderRadius: 12,
								resize: 'none', outline: 'none', fontSize: '1rem', color: '#3a2818',
								background: 'white', marginBottom: 16, fontFamily: 'inherit',
							}}
						/>

						<div style={{ display: 'flex', gap: 12 }}>
							<button onClick={() => setShowNoteModal(false)}
								style={{
									flex: 1, padding: '10px 0', borderRadius: 999, border: '2px solid #8c7355',
									color: '#5c3d2e', background: 'transparent', fontWeight: 700, cursor: 'pointer', fontSize: '1rem',
								}}>
								Cancel
							</button>
							<button onClick={handleSaveNote} disabled={!noteText.trim() || noteSaving}
								style={{
									flex: 1, padding: '10px 0', borderRadius: 999, border: 'none',
									background: '#1c452c', color: '#e8dcb8', fontWeight: 700,
									cursor: noteSaving ? 'not-allowed' : 'pointer', opacity: !noteText.trim() ? 0.5 : 1, fontSize: '1rem',
								}}>
								{noteSaving ? 'Saving...' : 'Save Note'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ── 精听完成结算弹窗 ── */}
			{showCompletion && (() => {
				// 计算本次统计
				const total = sentences.length;
				const answered = answers.size;
				const avgScore = totalSubmits > 0
					? Math.round((answered / totalSubmits) * 100)
					: 0;
				const scores = Array.from(answers.values()).map((a) => a.accuracyScore);

				const perfect = scores.filter((s) => s === 100).length;

				// 等级评定
				const grade = avgScore >= 90 ? { label: 'Excellent!', emoji: '🏆', color: '#0f4e29' }
					: avgScore >= 75 ? { label: 'Great job!', emoji: '🎉', color: '#1c6b3a' }
						: avgScore >= 60 ? { label: 'Good effort!', emoji: '👍', color: '#7a5200' }
							: { label: 'Keep practicing!', emoji: '💪', color: '#7a2020' };

				return (
					<div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
						<div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} />
						<div style={{
							position: 'relative', zIndex: 1, width: '100%', maxWidth: 460,
							background: '#f0e8d5', borderRadius: 24, border: '2px solid #c2a36d',
							boxShadow: '0 24px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
						}}>
							{/* 头部 */}
							<div style={{ background: '#1c452c', padding: '28px 24px 20px', textAlign: 'center' }}>
								<div style={{ fontSize: 56, lineHeight: 1, marginBottom: 8 }}>{grade.emoji}</div>
								<h2 style={{ margin: 0, color: '#e8dcb8', fontSize: '1.8rem', fontWeight: 800 }}>
									Practice Complete!
								</h2>
								<p style={{ margin: '6px 0 0', color: '#c2a36d', fontSize: '1.1rem', fontWeight: 600 }}>
									{grade.label}
								</p>
							</div>

							{/* 统计数据 */}
							<div style={{ padding: '24px 28px' }}>
								<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
									{[
										{ label: 'Sentences', value: `${answered} / ${total}` },
										{ label: 'Avg Accuracy', value: `${avgScore}%` },
										{ label: 'Perfect Sentences', value: `${perfect}` },
										{ label: 'Material', value: material?.title ?? '' },
									].map(({ label, value }) => (
										<div key={label} style={{
											background: 'white', borderRadius: 14, padding: '14px 16px',
											border: '1px solid #d0bfa1', textAlign: 'center',
										}}>
											<p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: '#8c7355', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
												{label}
											</p>
											<p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: grade.color }}>
												{value}
											</p>
										</div>
									))}
								</div>

								{/* 准确率进度条 */}
								<div style={{ marginBottom: 24 }}>
									<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem', color: '#6b513b', fontWeight: 600 }}>
										<span>Overall Accuracy</span>
										<span>{avgScore}%</span>
									</div>
									<div style={{ height: 10, background: '#d0bfa1', borderRadius: 999, overflow: 'hidden' }}>
										<div style={{
											height: '100%', borderRadius: 'inherit',
											width: `${avgScore}%`,
											background: avgScore >= 80 ? 'linear-gradient(90deg,#1c452c,#3a9a54)'
												: avgScore >= 60 ? 'linear-gradient(90deg,#7a5200,#c49a00)'
													: 'linear-gradient(90deg,#7a2020,#c44)',
											transition: 'width 0.8s ease',
										}} />
									</div>
								</div>

								{/* 按钮 */}
								<div style={{ display: 'flex', gap: 12 }}>
									<button
										onClick={() => { setShowCompletion(false); router.push('/'); }}
										style={{
											flex: 1, padding: '12px 0', borderRadius: 999,
											border: '2px solid #1c452c', background: 'transparent',
											color: '#1c452c', fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
										}}>
										Back to Home
									</button>
									<button
										onClick={() => { setShowCompletion(false); router.push('/progress'); }}
										style={{
											flex: 1, padding: '12px 0', borderRadius: 999,
											border: 'none', background: '#1c452c',
											color: '#e8dcb8', fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
										}}>
										View Progress →
									</button>
								</div>
							</div>
						</div>
					</div>
				);
			})()}
		</>
	);
}