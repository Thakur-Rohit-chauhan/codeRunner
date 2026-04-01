import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Trophy, Clock, Users, Calendar, ChevronRight, Zap, Star,
    Flame, Target, Award, TrendingUp, PlayCircle, CheckCircle,
    Timer, Crown, Plus, X, AlertCircle, ChevronDown, Search,
    Globe, Lock, Swords, Medal, BarChart2, Code2, FileText, Sparkles
} from 'lucide-react'
import Navbar from '../components/Navbar/Navbar'
import useContestStore from '../store/contestStore'
import useAuthStore from '../store/authStore'
import useProblemStore from '../store/problemStore'
import {
    getAggregatePrizePool,
    getContestPhase,
    getContestUserStats,
    getPrizeUnit,
} from '../utils/contestUtils'

// ─── Countdown Hook ───────────────────────────────────────────────────────────
function useCountdown(isoDate) {
    const [t, setT] = useState({})
    useEffect(() => {
        const calc = () => {
            const target = new Date(isoDate).getTime()
            if (!isoDate || Number.isNaN(target)) return setT({ d: 0, h: 0, m: 0, s: 0, over: true })
            const diff = target - Date.now()
            if (diff <= 0) return setT({ d: 0, h: 0, m: 0, s: 0, over: true })
            setT({ d: Math.floor(diff / 86400000), h: Math.floor((diff % 86400000) / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) })
        }
        calc()
        const id = setInterval(calc, 1000)
        return () => clearInterval(id)
    }, [isoDate])
    return t
}

function useNow(intervalMs = 1000) {
    const [now, setNow] = useState(0)

    useEffect(() => {
        const frame = requestAnimationFrame(() => setNow(Date.now()))
        const id = setInterval(() => setNow(Date.now()), intervalMs)
        return () => {
            cancelAnimationFrame(frame)
            clearInterval(id)
        }
    }, [intervalMs])

    return now
}

// ─── Countdown Display ────────────────────────────────────────────────────────
function Countdown({ startTime }) {
    const { d, h, m, s } = useCountdown(startTime)
    return (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {[{ l: 'D', v: d }, { l: 'H', v: h }, { l: 'M', v: m }, { l: 'S', v: s }].map(({ l, v }) => (
                <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: 700, color: '#34d399', fontVariantNumeric: 'tabular-nums' }}>
                        {String(v ?? 0).padStart(2, '0')}
                    </div>
                    <span style={{ fontSize: '9px', color: '#6b7280', fontWeight: 600, marginTop: '3px', letterSpacing: '0.05em' }}>{l}</span>
                </div>
            ))}
        </div>
    )
}

// ─── Type Badge ───────────────────────────────────────────────────────────────
const typeMeta = {
    weekly:   { label: 'Weekly',   color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.2)' },
    biweekly: { label: 'Biweekly', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)' },
    special:  { label: 'Special',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)' },
    custom:   { label: 'Custom',   color: '#c084fc', bg: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.2)' },
}
function TypeBadge({ type }) {
    const m = typeMeta[type] || typeMeta.weekly
    return (
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: m.color, background: m.bg, border: `1px solid ${m.border}`, padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>
            {m.label}
        </span>
    )
}

// ─── Upcoming Contest Card ────────────────────────────────────────────────────
function UpcomingCard({ contest, featured }) {
    const navigate = useNavigate()
    const user = useAuthStore((state) => state.user)
    const [hovered, setHovered] = useState(false)
    const { registerContest, unregisterContest, isRegistered, startAttempt } = useContestStore()
    const reg = isRegistered(contest.id)
    const isLive = getContestPhase(contest) === 'active'

    const handleBtn = async (e) => {
        e.stopPropagation()
        if (isLive && reg) { startAttempt(contest.id); navigate(`/contests/${contest.id}/arena`) }
        else if (reg) await unregisterContest(contest.id, user?.username)
        else await registerContest(contest.id, user?.username)
    }

    return (
        <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={() => navigate(`/contests/${contest.id}`)}
            style={{ borderRadius: '20px', border: featured ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(255,255,255,0.07)', background: hovered ? 'linear-gradient(135deg,rgba(30,38,50,.9),rgba(20,28,40,.95))' : 'linear-gradient(135deg,rgba(22,28,38,.8),rgba(15,20,30,.9))', backdropFilter: 'blur(20px)', padding: '26px', position: 'relative', overflow: 'hidden', transition: 'all 0.3s', transform: hovered ? 'translateY(-3px)' : 'none', boxShadow: hovered ? (featured ? '0 20px 50px rgba(52,211,153,0.12),0 8px 20px rgba(0,0,0,.4)' : '0 20px 50px rgba(0,0,0,.4)') : 'none', cursor: 'pointer' }}>
            {featured && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,transparent,#34d399,transparent)' }} />}
            {isLive && <div style={{ position: 'absolute', top: '14px', right: '14px', display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '20px', padding: '3px 10px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444', animation: 'pulse 1s infinite' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444' }}>LIVE</span>
            </div>}

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px' }}>
                <TypeBadge type={contest.type} />
                {featured && <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: '3px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}><Flame size={10} /> Featured</span>}
            </div>

            <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#f1f5f9', marginBottom: '6px', lineHeight: 1.3 }}>{contest.title}</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{contest.description}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '13px', marginBottom: '14px' }}>
                <Calendar size={12} /><span>{new Date(contest.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                <span style={{ margin: '0 4px' }}>·</span>
                <Timer size={12} /><span>{contest.duration} min</span>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {(contest.tags || []).map(tag => <span key={tag} style={{ fontSize: '11.5px', color: '#9ca3af', fontWeight: 500, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', padding: '3px 10px', borderRadius: '8px' }}>{tag}</span>)}
            </div>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '13px' }}><Target size={13} /><span>{contest.problemIds?.length || 0} Problems</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '13px' }}><Users size={13} /><span>{(contest.participants || 0).toLocaleString()} Registered</span></div>
            </div>

            {!isLive && (
                <div style={{ marginBottom: '18px' }}>
                    <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Starts In</p>
                    <Countdown startTime={contest.startTime} />
                </div>
            )}

            {contest.prizes?.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Crown size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
                    <span style={{ fontSize: '12.5px', color: '#9ca3af' }}>
                        <span style={{ color: '#f59e0b', fontWeight: 600 }}>1st:</span> {contest.prizes[0]}
                        {contest.prizes[1] ? <> · <span>2nd: {contest.prizes[1]}</span></> : null}
                    </span>
                </div>
            )}

            <button onClick={handleBtn} style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.25s', fontFamily: 'inherit', border: isLive && reg ? 'none' : reg ? '1px solid rgba(52,211,153,0.3)' : '1px solid transparent', background: isLive && reg ? 'linear-gradient(135deg,#ef4444,#b91c1c)' : reg ? 'rgba(52,211,153,0.08)' : 'linear-gradient(135deg,#34d399 0%,#059669 100%)', color: isLive && reg ? '#fff' : reg ? '#34d399' : '#0b1a14', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', boxShadow: isLive && reg ? '0 4px 16px rgba(239,68,68,0.3)' : !reg ? '0 4px 16px rgba(52,211,153,0.3)' : 'none' }}>
                {isLive && reg ? <><Swords size={15} /> Enter Arena</> : reg ? <><CheckCircle size={15} /> Registered — Click to Unregister</> : <><PlayCircle size={15} /> Register Now</>}
            </button>
        </div>
    )
}

// ─── Past Contest Row ─────────────────────────────────────────────────────────
function PastRow({ contest, userStats }) {
    const navigate = useNavigate()
    const [h, setH] = useState(false)
    return (
        <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={() => navigate(`/contests/${contest.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px', borderRadius: '14px', background: h ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s', cursor: 'pointer' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trophy size={18} style={{ color: '#fbbf24' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#e5e7eb', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contest.title}</p>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <TypeBadge type={contest.type} />
                    <span style={{ fontSize: '12.5px', color: '#6b7280' }}>{new Date(contest.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
            </div>
            <div style={{ textAlign: 'center', minWidth: '70px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Problems</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#d1d5db' }}>{contest.problemIds?.length || 0}</p>
            </div>
            <div style={{ textAlign: 'center', minWidth: '90px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Participants</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#d1d5db' }}>{(contest.participants || 0).toLocaleString()}</p>
            </div>
            {userStats.rank ? (
                <div style={{ textAlign: 'center', minWidth: '80px' }}>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Your Rank</p>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: '#34d399' }}>#{userStats.rank}</p>
                </div>
            ) : (
                <div style={{ minWidth: '80px', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280', padding: '4px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>Not Rated</span>
                </div>
            )}
            <ChevronRight size={18} style={{ color: '#6b7280', flexShrink: 0, transition: 'transform 0.2s', transform: h ? 'translateX(3px)' : 'none' }} />
        </div>
    )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, gradient }) {
    return (
        <div style={{ borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
            <div>
                <p style={{ fontSize: '22px', fontWeight: 700, color: '#f1f5f9' }}>{value}</p>
                <p style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>{label}</p>
            </div>
        </div>
    )
}

// ─── Create Contest Modal ─────────────────────────────────────────────────────
function CreateContestModal({ onClose, onCreate }) {
    const { addCustomProblem } = useContestStore()
    const allProblems = useProblemStore((state) => state.problems)
    const [form, setForm] = useState({
        title: '', domain: 'DSA', type: 'custom', description: '', startTime: '',
        duration: 90, prizes: ['', '', ''], tags: '', visibility: 'public',
        selectedProblems: [],
    })
    const [searchQ, setSearchQ] = useState('')
    const [step, setStep] = useState(1)
    const [errors, setErrors] = useState({})
    const [step2Tab, setStep2Tab] = useState('select') // 'select' | 'create'
    const [createdProblems, setCreatedProblems] = useState([]) // locally created problems shown in step 2

    // New problem form state
    const emptyProblem = { title: '', difficulty: 'Medium', tags: '', description: '', exInput: '', exOutput: '', constraint: '' }
    const [newProb, setNewProb] = useState(emptyProblem)
    const [probErrors, setProbErrors] = useState({})

    const filtered = useMemo(() =>
        [...createdProblems, ...allProblems]
            .filter(p => p.domain === form.domain)
            .filter(p => p.title.toLowerCase().includes(searchQ.toLowerCase()))
            .slice(0, 20),
        [allProblems, searchQ, createdProblems, form.domain]
    )

    const toggleProblem = (id) => {
        setForm(f => ({
            ...f,
            selectedProblems: f.selectedProblems.includes(id)
                ? f.selectedProblems.filter(x => x !== id)
                : [...f.selectedProblems, id]
        }))
    }

    const validate1 = () => {
        const e = {}
        if (!form.title.trim()) e.title = 'Title is required'
        if (form.duration < 15 || form.duration > 360) e.duration = 'Duration must be 15–360 min'
        if (!form.description.trim()) e.description = 'Description is required'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const validate2 = () => {
        const e = {}
        if (form.selectedProblems.length < 1) e.problems = 'Select at least 1 problem'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const validateProblem = () => {
        const e = {}
        if (!newProb.title.trim()) e.title = 'Title is required'
        if (!newProb.description.trim()) e.description = 'Description is required'
        setProbErrors(e)
        return Object.keys(e).length === 0
    }

    const handleAddProblem = () => {
        if (!validateProblem()) return
        const id = addCustomProblem({
            title: newProb.title,
            domain: form.domain,
            difficulty: newProb.difficulty,
            tags: newProb.tags.split(',').map(t => t.trim()).filter(Boolean),
            description: newProb.description,
            examples: newProb.exInput ? [{ input: newProb.exInput, output: newProb.exOutput, explanation: null }] : [],
            constraints: newProb.constraint ? [newProb.constraint] : [],
            testCases: newProb.exInput ? [{ input: newProb.exInput, expectedOutput: newProb.exOutput || 'expected' }] : [],
        })
        const createdProbObj = {
            id,
            title: newProb.title,
            difficulty: newProb.difficulty,
            tags: newProb.tags.split(',').map(t => t.trim()).filter(Boolean),
            domain: form.domain,
            isCustom: true,
        }
        setCreatedProblems(cp => [createdProbObj, ...cp])
        setForm(f => ({ ...f, selectedProblems: [...f.selectedProblems, id] }))
        setNewProb(emptyProblem)
        setProbErrors({})
        setStep2Tab('select')
    }

    const handleSubmit = async () => {
        if (!validate2()) return
        const defaultStart = new Date(Date.now() + 86400000).toISOString()
        const createdId = await onCreate({
            title: form.title, domain: form.domain, type: form.type, description: form.description,
            startTime: form.startTime ? new Date(form.startTime).toISOString() : defaultStart,
            duration: Number(form.duration),
            prizes: form.prizes.filter(Boolean),
            tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
            problemIds: form.selectedProblems,
            ranking: form.domain === 'ML' ? 'accuracy' : 'score',
        })
        if (createdId) onClose()
    }

    const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e5e7eb', fontSize: '14px', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s', boxSizing: 'border-box' }
    const labelStyle = { fontSize: '12px', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }
    const errStyle = { fontSize: '12px', color: '#f87171', marginTop: '4px' }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
            <div style={{ width: '620px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '24px', background: 'linear-gradient(135deg,#161b24,#0d1117)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 80px rgba(0,0,0,0.6)', padding: '32px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#f1f5f9' }}>Create Contest</h2>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>Step {step} of 2 — {step === 1 ? 'Contest Details' : 'Select Problems'}</p>
                    </div>
                    <button onClick={onClose} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
                </div>

                {/* Step indicator */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
                    {[1, 2].map(s => (
                        <div key={s} style={{ flex: 1, height: '4px', borderRadius: '4px', background: s <= step ? 'linear-gradient(90deg,#34d399,#059669)' : 'rgba(255,255,255,0.08)', transition: 'background 0.3s' }} />
                    ))}
                </div>

                {step === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        {/* Title */}
                        <div>
                            <label style={labelStyle}>Contest Title *</label>
                            <input style={inputStyle} placeholder="e.g. My Weekly DSA Contest" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} onFocus={e => e.target.style.borderColor = 'rgba(52,211,153,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                            {errors.title && <p style={errStyle}>{errors.title}</p>}
                        </div>
                        {/* Domain + Type + Visibility row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                            <div>
                                <label style={labelStyle}>Contest Domain</label>
                                <select
                                    style={{ ...inputStyle, cursor: 'pointer' }}
                                    value={form.domain}
                                    onChange={e => setForm(f => ({ ...f, domain: e.target.value, selectedProblems: [] }))}
                                >
                                    <option value="DSA" style={{ background: '#1a1f2e' }}>Algorithms / DSA</option>
                                    <option value="ML" style={{ background: '#1a1f2e' }}>Machine Learning</option>
                                    <option value="CTF" style={{ background: '#1a1f2e' }}>Cyber Security</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Contest Type</label>
                                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                                    {['custom', 'weekly', 'biweekly', 'special'].map(t => <option key={t} value={t} style={{ background: '#1a1f2e' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Visibility</label>
                                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}>
                                    <option value="public" style={{ background: '#1a1f2e' }}>🌐 Public</option>
                                    <option value="private" style={{ background: '#1a1f2e' }}>🔒 Private</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#9ca3af', lineHeight: 1.6 }}>
                            {form.domain === 'ML'
                                ? 'ML contests use a Kaggle-style leaderboard: participants rank by highest achieved accuracy, with earlier best submissions winning ties.'
                                : form.domain === 'CTF'
                                    ? 'Cyber contests rank participants by challenge score and solve time.'
                                    : 'DSA contests rank participants by score, solved count, and time.'}
                        </div>
                        {/* Start time + Duration */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            <div>
                                <label style={labelStyle}>Start Time *</label>
                                <input type="datetime-local" style={inputStyle} value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} onFocus={e => e.target.style.borderColor = 'rgba(52,211,153,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                {errors.startTime && <p style={errStyle}>{errors.startTime}</p>}
                            </div>
                            <div>
                                <label style={labelStyle}>Duration (minutes) *</label>
                                <input type="number" min="15" max="360" style={inputStyle} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} onFocus={e => e.target.style.borderColor = 'rgba(52,211,153,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                {errors.duration && <p style={errStyle}>{errors.duration}</p>}
                            </div>
                        </div>
                        {/* Description */}
                        <div>
                            <label style={labelStyle}>Description *</label>
                            <textarea style={{ ...inputStyle, height: '90px', resize: 'vertical' }} placeholder="Tell participants what this contest is about..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} onFocus={e => e.target.style.borderColor = 'rgba(52,211,153,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                            {errors.description && <p style={errStyle}>{errors.description}</p>}
                        </div>
                        {/* Tags */}
                        <div>
                            <label style={labelStyle}>Tags (comma separated)</label>
                            <input style={inputStyle} placeholder="e.g. DSA, Graphs, DP" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} onFocus={e => e.target.style.borderColor = 'rgba(52,211,153,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                        </div>
                        {/* Prizes */}
                        <div>
                            <label style={labelStyle}>Prizes (optional)</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {form.prizes.map((p, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '13px', color: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : '#cd7c2f', fontWeight: 700, minWidth: '40px' }}>{i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : 'rd'}</span>
                                        <input style={{ ...inputStyle }} placeholder={`${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : 'rd'} place prize`} value={p} onChange={e => setForm(f => { const prizes = [...f.prizes]; prizes[i] = e.target.value; return { ...f, prizes } })} onFocus={e => e.target.style.borderColor = 'rgba(52,211,153,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button onClick={() => { if (validate1()) setStep(2) }} style={{ padding: '13px', borderRadius: '12px', background: 'linear-gradient(135deg,#34d399,#059669)', border: 'none', color: '#0b1a14', fontWeight: 700, fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(52,211,153,0.25)' }}>
                            Next: Select Problems <ChevronRight size={16} />
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        {/* Sub-tab: Select vs Create */}
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '18px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {[
                                { key: 'select', label: 'Select Problems', icon: <Search size={13} /> },
                                { key: 'create', label: '+ Create New Problem', icon: <Sparkles size={13} /> },
                            ].map(({ key, label, icon }) => (
                                <button key={key} onClick={() => setStep2Tab(key)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 12px', borderRadius: '9px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', border: 'none', fontFamily: 'inherit', background: step2Tab === key ? (key === 'create' ? 'rgba(192,132,252,0.15)' : 'rgba(255,255,255,0.1)') : 'transparent', color: step2Tab === key ? (key === 'create' ? '#c084fc' : '#fff') : '#6b7280' }}>
                                    {icon} {label}
                                </button>
                            ))}
                        </div>

                        {/* ── SELECT EXISTING ── */}
                        {step2Tab === 'select' && (
                            <div>
                                <div style={{ position: 'relative', marginBottom: '12px' }}>
                                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', width: '15px' }} />
                                    <input style={{ ...inputStyle, paddingLeft: '38px' }} placeholder={`Search ${form.domain} problems...`} value={searchQ} onChange={e => setSearchQ(e.target.value)} onFocus={e => e.target.style.borderColor = 'rgba(52,211,153,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{form.selectedProblems.length} selected</span>
                                    {createdProblems.filter(p => p.domain === form.domain).length > 0 && <span style={{ color: '#c084fc' }}>✨ {createdProblems.filter(p => p.domain === form.domain).length} custom problem{createdProblems.filter(p => p.domain === form.domain).length > 1 ? 's' : ''} created</span>}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                                    {/* Custom problems first */}
                                    {createdProblems.filter(p => p.domain === form.domain).map(p => {
                                        const sel = form.selectedProblems.includes(p.id)
                                        return (
                                            <div key={p.id} onClick={() => toggleProblem(p.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '12px', background: sel ? 'rgba(192,132,252,0.08)' : 'rgba(192,132,252,0.04)', border: `1px solid ${sel ? 'rgba(192,132,252,0.3)' : 'rgba(192,132,252,0.15)'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                                                <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${sel ? '#c084fc' : 'rgba(192,132,252,0.4)'}`, background: sel ? '#c084fc' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                                                    {sel && <CheckCircle size={12} style={{ color: '#0b1a14' }} />}
                                                </div>
                                                <span style={{ flex: 1, fontSize: '14px', color: '#e5e7eb', fontWeight: 500 }}>{p.title}</span>
                                                <span style={{ fontSize: '11px', color: '#c084fc', background: 'rgba(192,132,252,0.1)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>Custom</span>
                                                <span style={{ fontSize: '11px', color: '#9ca3af', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>{p.domain}</span>
                                                <span style={{ fontSize: '12px', fontWeight: 600, color: p.difficulty === 'Easy' ? '#34d399' : p.difficulty === 'Medium' ? '#fbbf24' : '#f87171', background: p.difficulty === 'Easy' ? 'rgba(52,211,153,0.1)' : p.difficulty === 'Medium' ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)', padding: '2px 8px', borderRadius: '6px' }}>{p.difficulty}</span>
                                            </div>
                                        )
                                    })}
                                    {/* Existing problems */}
                                    {filtered.filter(p => !createdProblems.find(cp => cp.id === p.id)).map(p => {
                                        const sel = form.selectedProblems.includes(p.id)
                                        return (
                                            <div key={p.id} onClick={() => toggleProblem(p.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '12px', background: sel ? 'rgba(52,211,153,0.07)' : 'rgba(255,255,255,0.02)', border: `1px solid ${sel ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                                                <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${sel ? '#34d399' : 'rgba(255,255,255,0.2)'}`, background: sel ? '#34d399' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                                                    {sel && <CheckCircle size={12} style={{ color: '#0b1a14' }} />}
                                                </div>
                                                <span style={{ flex: 1, fontSize: '14px', color: '#e5e7eb', fontWeight: 500 }}>{p.id}. {p.title}</span>
                                                <span style={{ fontSize: '11px', color: '#9ca3af', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>{p.domain}</span>
                                                <span style={{ fontSize: '12px', fontWeight: 600, color: p.difficulty === 'Easy' ? '#34d399' : p.difficulty === 'Medium' ? '#fbbf24' : '#f87171', background: p.difficulty === 'Easy' ? 'rgba(52,211,153,0.1)' : p.difficulty === 'Medium' ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)', padding: '2px 8px', borderRadius: '6px' }}>{p.difficulty}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── CREATE NEW PROBLEM ── */}
                        {step2Tab === 'create' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ background: 'rgba(192,132,252,0.05)', border: '1px solid rgba(192,132,252,0.15)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Sparkles size={14} /> Define a custom {form.domain} problem. It will be auto-added to this contest.
                                </div>
                                {/* Title + Difficulty */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px' }}>
                                    <div>
                                        <label style={labelStyle}>Problem Title *</label>
                                        <input style={inputStyle} placeholder="e.g. Find Maximum Subarray" value={newProb.title} onChange={e => setNewProb(p => ({ ...p, title: e.target.value }))} onFocus={e => e.target.style.borderColor = 'rgba(192,132,252,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                        {probErrors.title && <p style={{ ...errStyle }}>{probErrors.title}</p>}
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Difficulty</label>
                                        <select style={{ ...inputStyle, width: '120px', cursor: 'pointer' }} value={newProb.difficulty} onChange={e => setNewProb(p => ({ ...p, difficulty: e.target.value }))}>
                                            {['Easy', 'Medium', 'Hard'].map(d => <option key={d} value={d} style={{ background: '#1a1f2e' }}>{d}</option>)}
                                        </select>
                                    </div>
                                </div>
                                {/* Tags */}
                                <div>
                                    <label style={labelStyle}>Tags (comma-separated)</label>
                                    <input style={inputStyle} placeholder="Array, Hash Table, Greedy" value={newProb.tags} onChange={e => setNewProb(p => ({ ...p, tags: e.target.value }))} onFocus={e => e.target.style.borderColor = 'rgba(192,132,252,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                </div>
                                {/* Description */}
                                <div>
                                    <label style={labelStyle}>Problem Description *</label>
                                    <textarea style={{ ...inputStyle, height: '100px', resize: 'vertical' }} placeholder="Describe the problem clearly. Include what the input/output should be..." value={newProb.description} onChange={e => setNewProb(p => ({ ...p, description: e.target.value }))} onFocus={e => e.target.style.borderColor = 'rgba(192,132,252,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                    {probErrors.description && <p style={errStyle}>{probErrors.description}</p>}
                                </div>
                                {/* Example */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={labelStyle}>Example Input</label>
                                        <input style={inputStyle} placeholder="nums = [1,2,3]" value={newProb.exInput} onChange={e => setNewProb(p => ({ ...p, exInput: e.target.value }))} onFocus={e => e.target.style.borderColor = 'rgba(192,132,252,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Example Output</label>
                                        <input style={inputStyle} placeholder="6" value={newProb.exOutput} onChange={e => setNewProb(p => ({ ...p, exOutput: e.target.value }))} onFocus={e => e.target.style.borderColor = 'rgba(192,132,252,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                    </div>
                                </div>
                                {/* Constraint */}
                                <div>
                                    <label style={labelStyle}>Key Constraint (optional)</label>
                                    <input style={inputStyle} placeholder="1 ≤ n ≤ 10⁵" value={newProb.constraint} onChange={e => setNewProb(p => ({ ...p, constraint: e.target.value }))} onFocus={e => e.target.style.borderColor = 'rgba(192,132,252,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                </div>
                                <button onClick={handleAddProblem} style={{ padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg,#c084fc,#7c3aed)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(192,132,252,0.25)' }}>
                                    <Plus size={15} /> Add Problem to Contest
                                </button>
                            </div>
                        )}

                        {errors.problems && <p style={{ ...errStyle, marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertCircle size={13} />{errors.problems}</p>}

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button onClick={() => setStep(1)} style={{ flex: 1, padding: '13px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af', fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                                ← Back
                            </button>
                            <button onClick={handleSubmit} style={{ flex: 2, padding: '13px', borderRadius: '12px', background: 'linear-gradient(135deg,#34d399,#059669)', border: 'none', color: '#0b1a14', fontWeight: 700, fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(52,211,153,0.25)' }}>
                                🏆 Create Contest
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Contests() {
    const navigate = useNavigate()
    const user = useAuthStore((state) => state.user)
    const now = useNow()
    const [tab, setTab] = useState('upcoming')
    const [showCreate, setShowCreate] = useState(false)
    const [searchQ, setSearchQ] = useState('')
    const { contests, createContest, registered } = useContestStore()

    const contestEntries = useMemo(() =>
        contests.map((contest) => ({
            contest,
            phase: getContestPhase(contest, now),
            userStats: getContestUserStats(contest, user?.username),
        })),
        [contests, now, user?.username]
    )

    const upcomingContests = useMemo(() =>
        contestEntries
            .filter(({ phase, contest }) => phase !== 'past' && (!searchQ || contest.title.toLowerCase().includes(searchQ.toLowerCase())))
            .sort((a, b) => new Date(a.contest.startTime) - new Date(b.contest.startTime)),
        [contestEntries, searchQ]
    )

    const pastContests = useMemo(() =>
        contestEntries
            .filter(({ phase, contest }) => phase === 'past' && (!searchQ || contest.title.toLowerCase().includes(searchQ.toLowerCase())))
            .sort((a, b) => new Date(b.contest.startTime) - new Date(a.contest.startTime)),
        [contestEntries, searchQ]
    )

    const featuredContests = upcomingContests.filter(({ contest }) => contest.featured)
    const regularContests  = upcomingContests.filter(({ contest }) => !contest.featured)

    const registeredCount = useMemo(
        () => Object.values(registered).filter(Boolean).length,
        [registered]
    )

    const participatedContests = useMemo(() =>
        pastContests.filter(({ userStats }) =>
            userStats.rank || userStats.score !== null || userStats.accuracy !== null || userStats.solved !== null
        ),
        [pastContests]
    )

    const bestRank = useMemo(() => {
        const ranks = participatedContests.map(({ userStats }) => userStats.rank).filter(Boolean)
        return ranks.length > 0 ? Math.min(...ranks) : null
    }, [participatedContests])

    const totalSolved = useMemo(
        () => participatedContests.reduce((total, { userStats }) => total + (userStats.solved || 0), 0),
        [participatedContests]
    )

    const topScore = useMemo(
        () => participatedContests.reduce((best, { userStats }) => Math.max(best, userStats.score || 0), 0),
        [participatedContests]
    )

    const topAccuracy = useMemo(
        () => participatedContests.reduce((best, { userStats }) => Math.max(best, userStats.accuracy || 0), 0),
        [participatedContests]
    )

    const liveContests = useMemo(
        () => contestEntries.filter(({ phase }) => phase === 'active'),
        [contestEntries]
    )

    const openContestRegistrations = useMemo(
        () => upcomingContests.reduce((total, { contest }) => total + (contest.participants || 0), 0),
        [upcomingContests]
    )

    const representedCountries = useMemo(() => {
        const countries = new Set()
        contests.forEach((contest) => {
            ;(contest.leaderboard || []).forEach((row) => {
                if (row.country) countries.add(row.country)
            })
        })
        return countries
    }, [contests])

    const aggregatePrizePool = useMemo(() => getAggregatePrizePool(contests), [contests])
    const prizeUnit = useMemo(() => getPrizeUnit(contests), [contests])

    const heroStats = useMemo(() => [
        { label: 'Open Registrations', value: openContestRegistrations.toLocaleString() },
        { label: 'Contests Held', value: pastContests.length.toLocaleString() },
        { label: 'Prize Pool', value: aggregatePrizePool > 0 ? `${aggregatePrizePool.toLocaleString()}${prizeUnit ? ` ${prizeUnit}` : ''}` : 'TBD' },
        { label: 'Countries Represented', value: representedCountries.size.toLocaleString() },
    ], [aggregatePrizePool, openContestRegistrations, pastContests.length, prizeUnit, representedCountries.size])

    const performanceStat = topScore > 0
        ? { label: 'Top Score', value: topScore.toLocaleString(), icon: <Star size={18} style={{ color: '#60a5fa' }} />, gradient: 'rgba(96,165,250,0.15)' }
        : topAccuracy > 0
            ? { label: 'Top Accuracy', value: `${(topAccuracy * 100).toFixed(2)}%`, icon: <Star size={18} style={{ color: '#60a5fa' }} />, gradient: 'rgba(96,165,250,0.15)' }
            : { label: 'Top Score', value: 'N/A', icon: <Star size={18} style={{ color: '#60a5fa' }} />, gradient: 'rgba(96,165,250,0.15)' }

    const handleCreate = async (data) => {
        const id = await createContest(data, user?.username)
        if (id) navigate(`/contests/${id}`)
        return id
    }

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0b0f19 0%,#0d1520 50%,#0b0f19 100%)', color: '#e5e7eb', fontFamily: '"Inter","Roboto",sans-serif' }}>
            <Navbar />

            {showCreate && <CreateContestModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}

            {/* ── Hero ── */}
            <div style={{ position: 'relative', overflow: 'hidden', padding: '52px 0 40px', textAlign: 'center' }}>
                <div style={{ position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(52,211,153,0.06) 0%,transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', maxWidth: '760px', margin: '0 auto', padding: '0 32px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '20px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', marginBottom: '18px' }}>
                        <Zap size={13} style={{ color: '#34d399' }} /><span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{liveContests.length > 0 ? `${liveContests.length} Live Now` : 'Contest Overview'}</span>
                    </div>
                    <h1 style={{ fontSize: '46px', fontWeight: 800, lineHeight: 1.1, background: 'linear-gradient(135deg,#f1f5f9 0%,#94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '14px', letterSpacing: '-0.02em' }}>Compete. Rank. Conquer.</h1>
                    <p style={{ fontSize: '16px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '28px' }}>
                        Track live contests, upcoming registrations, and your own performance from the contests currently in the system.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', padding: '18px 28px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {heroStats.map(({ label, value }) => (
                            <div key={label} style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '20px', fontWeight: 700, color: '#34d399', marginBottom: '2px' }}>{value}</p>
                                <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>{label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Main Content ── */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px 64px' }}>

                {/* My Stats */}
                <div style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#e5e7eb', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={17} style={{ color: '#34d399' }} /> My Contest Stats</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '12px' }}>
                        <StatCard icon={<Trophy size={18} style={{ color: '#fbbf24' }} />} label="Contests Attended" value={participatedContests.length.toLocaleString()} gradient="rgba(245,158,11,0.15)" />
                        <StatCard icon={<Award size={18} style={{ color: '#34d399' }} />} label="Best Rank" value={bestRank ? `#${bestRank}` : 'N/A'} gradient="rgba(52,211,153,0.15)" />
                        <StatCard icon={performanceStat.icon} label={performanceStat.label} value={performanceStat.value} gradient={performanceStat.gradient} />
                        <StatCard icon={<Flame size={18} style={{ color: '#f87171' }} />} label="Problems Solved" value={totalSolved.toLocaleString()} gradient="rgba(248,113,113,0.15)" />
                        <StatCard icon={<BarChart2 size={18} style={{ color: '#c084fc' }} />} label="Registered" value={registeredCount.toLocaleString()} gradient="rgba(192,132,252,0.15)" />
                    </div>
                </div>

                {/* Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {[{ key: 'upcoming', label: 'Upcoming', icon: <Clock size={13} /> }, { key: 'past', label: 'Past', icon: <CheckCircle size={13} /> }].map(({ key, label, icon }) => (
                            <button key={key} onClick={() => setTab(key)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', border: 'none', fontFamily: 'inherit', background: tab === key ? 'rgba(255,255,255,0.1)' : 'transparent', color: tab === key ? '#fff' : '#6b7280' }}>
                                {icon} {label}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', width: '14px' }} />
                            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search contests..." style={{ paddingLeft: '36px', paddingRight: '14px', paddingTop: '9px', paddingBottom: '9px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e5e7eb', fontSize: '13.5px', outline: 'none', width: '220px', fontFamily: 'inherit' }} />
                        </div>
                        <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '12px', background: 'linear-gradient(135deg,#34d399,#059669)', border: 'none', color: '#0b1a14', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(52,211,153,0.25)', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                            <Plus size={15} /> Create Contest
                        </button>
                    </div>
                </div>

                {/* ── Upcoming ── */}
                {tab === 'upcoming' && (
                    <div>
                        {featuredContests.length > 0 && (
                            <div style={{ marginBottom: '28px' }}>
                                <p style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}><Flame size={11} style={{ color: '#f59e0b' }} /> Featured</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: '20px' }}>
                                    {featuredContests.map(({ contest }) => <UpcomingCard key={contest.id} contest={contest} featured />)}
                                </div>
                            </div>
                        )}
                        {regularContests.length > 0 && (
                            <div>
                                <p style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>All Upcoming</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '16px' }}>
                                    {regularContests.map(({ contest }) => <UpcomingCard key={contest.id} contest={contest} featured={false} />)}
                                </div>
                            </div>
                        )}
                        {upcomingContests.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
                                <Trophy size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
                                <p style={{ fontSize: '16px' }}>No upcoming contests {searchQ && `matching "${searchQ}"`}</p>
                                <button onClick={() => setShowCreate(true)} style={{ marginTop: '16px', padding: '10px 20px', borderRadius: '10px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                                    + Create the first one
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {/* ── Past ── */}
                {tab === 'past' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {pastContests.map(({ contest, userStats }) => <PastRow key={contest.id} contest={contest} userStats={userStats} />)}
                        {pastContests.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
                                <CheckCircle size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
                                <p>No past contests found</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .4; }
                }
            `}</style>
        </div>
    )
}
