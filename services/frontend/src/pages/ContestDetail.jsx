import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
    Trophy, Clock, Users, Calendar, Timer, Target, Crown,
    ChevronLeft, Swords, CheckCircle, PlayCircle, Flame,
    Tag, BarChart2, Award, AlertCircle, Shield, ExternalLink, ChevronRight
} from 'lucide-react'
import Navbar from '../components/Navbar/Navbar'
import useContestStore from '../store/contestStore'
import { mockProblems } from '../utils/mockData'

function useCountdown(isoDate) {
    const [t, setT] = useState({})
    useEffect(() => {
        const calc = () => {
            const diff = new Date(isoDate) - Date.now()
            if (diff <= 0) return setT({ d: 0, h: 0, m: 0, s: 0, over: true })
            setT({ d: Math.floor(diff / 86400000), h: Math.floor((diff % 86400000) / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) })
        }
        calc(); const id = setInterval(calc, 1000); return () => clearInterval(id)
    }, [isoDate])
    return t
}

const typeMeta = {
    weekly:   { label: 'Weekly',   color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.2)' },
    biweekly: { label: 'Biweekly', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)' },
    special:  { label: 'Special',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)' },
    custom:   { label: 'Custom',   color: '#c084fc', bg: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.2)' },
}

// Fake leaderboard
const fakeLeaderboard = [
    { rank: 1, name: 'alex_coder',   score: 4200, solved: 4, time: '1h 12m', country: '🇺🇸' },
    { rank: 2, name: 'devMaster99',  score: 3900, solved: 4, time: '1h 28m', country: '🇮🇳' },
    { rank: 3, name: 'rushikesh_r',  score: 3500, solved: 3, time: '58m',    country: '🇮🇳' },
    { rank: 4, name: 'codewizard22', score: 3200, solved: 3, time: '1h 05m', country: '🇩🇪' },
    { rank: 5, name: 'algo_queen',   score: 2800, solved: 3, time: '1h 20m', country: '🇬🇧' },
]

export default function ContestDetail() {
    const { contestId } = useParams()
    const navigate = useNavigate()
    const { getContest, isRegistered, registerContest, unregisterContest, startAttempt, getProblemsForContest } = useContestStore()
    const contest = getContest(contestId)
    const reg = isRegistered(contestId)
    const cd = useCountdown(contest?.startTime)
    const isLive = cd.over
    const [activeTab, setActiveTab] = useState('overview')
    const [hoveredProblem, setHoveredProblem] = useState(null)
    const [hoveredRow, setHoveredRow] = useState(null)

    if (!contest) return (
        <div style={{ minHeight: '100vh', background: '#0b0f19', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: '#6b7280', fontFamily: 'Inter,sans-serif' }}>
            <AlertCircle size={48} style={{ opacity: 0.3 }} />
            <p style={{ fontSize: '18px' }}>Contest not found</p>
            <button onClick={() => navigate('/contests')} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                ← Back to Contests
            </button>
        </div>
    )

    const problems = getProblemsForContest(contest)
    const meta = typeMeta[contest.type] || typeMeta.weekly

    const handleAttempt = () => {
        startAttempt(contestId)
        navigate(`/contests/${contestId}/arena`)
    }

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0b0f19,#0d1520,#0b0f19)', color: '#e5e7eb', fontFamily: '"Inter","Roboto",sans-serif' }}>
            <Navbar />

            {/* ── Hero Banner ── */}
            <div style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '40px 0 36px' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% -20%,rgba(52,211,153,0.06),transparent)', pointerEvents: 'none' }} />
                <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 32px', position: 'relative' }}>
                    <button onClick={() => navigate('/contests')} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '13.5px', fontWeight: 600, fontFamily: 'inherit', padding: 0 }}>
                        <ChevronLeft size={16} /> Back to Contests
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '32px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '280px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`, padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{meta.label}</span>
                                {contest.featured && <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: '4px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}><Flame size={11} /> Featured</span>}
                                <span style={{ fontSize: '12px', fontWeight: 600, color: contest.status === 'past' ? '#6b7280' : isLive ? '#ef4444' : '#34d399', background: contest.status === 'past' ? 'rgba(107,114,128,0.1)' : isLive ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)', border: `1px solid ${contest.status === 'past' ? 'rgba(107,114,128,0.2)' : isLive ? 'rgba(239,68,68,0.3)' : 'rgba(52,211,153,0.2)'}`, padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                    {contest.status === 'past' ? 'Ended' : isLive ? '🔴 Live Now' : 'Upcoming'}
                                </span>
                            </div>
                            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#f1f5f9', marginBottom: '10px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{contest.title}</h1>
                            <p style={{ fontSize: '15px', color: '#94a3b8', lineHeight: 1.6, maxWidth: '600px' }}>{contest.description}</p>

                            <div style={{ display: 'flex', gap: '20px', marginTop: '20px', flexWrap: 'wrap' }}>
                                {[
                                    { icon: <Calendar size={13} />, text: new Date(contest.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) },
                                    { icon: <Timer size={13} />, text: `${contest.duration} minutes` },
                                    { icon: <Target size={13} />, text: `${problems.length} problems` },
                                    { icon: <Users size={13} />, text: `${contest.participants.toLocaleString()} participants` },
                                ].map(({ icon, text }) => (
                                    <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '13.5px' }}>
                                        {icon} <span>{text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: CTA box */}
                        <div style={{ width: '300px', flexShrink: 0, borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '24px', backdropFilter: 'blur(20px)' }}>
                            {contest.status !== 'past' && !isLive && (
                                <>
                                    <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>Starts In</p>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                                        {[{ l: 'D', v: cd.d }, { l: 'H', v: cd.h }, { l: 'M', v: cd.m }, { l: 'S', v: cd.s }].map(({ l, v }) => (
                                            <div key={l} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <div style={{ width: '100%', height: '52px', borderRadius: '12px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 700, color: '#34d399' }}>{String(v ?? 0).padStart(2, '0')}</div>
                                                <span style={{ fontSize: '9px', color: '#6b7280', marginTop: '4px', fontWeight: 600 }}>{l}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {contest.prizes?.length > 0 && (
                                <div style={{ marginBottom: '18px' }}>
                                    <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Prizes</p>
                                    {contest.prizes.map((p, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: i < contest.prizes.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                            <span style={{ fontSize: '16px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                                            <span style={{ fontSize: '14px', color: '#d1d5db', fontWeight: 500 }}>{p}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {contest.status === 'past' ? (
                                <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                                    <Trophy size={20} style={{ marginBottom: '8px', color: '#fbbf24' }} />
                                    <p>Contest ended</p>
                                    {contest.results?.userRank && <p style={{ fontSize: '20px', fontWeight: 700, color: '#34d399', marginTop: '4px' }}>Your rank: #{contest.results.userRank}</p>}
                                </div>
                            ) : isLive ? (
                                reg && <button onClick={handleAttempt} style={{ width: '100%', padding: '14px', borderRadius: '13px', background: 'linear-gradient(135deg,#ef4444,#b91c1c)', border: 'none', color: '#fff', fontWeight: 800, fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 20px rgba(239,68,68,0.35)', letterSpacing: '0.03em' }}>
                                    <Swords size={18} /> Enter Arena Now
                                </button>
                            ) : (
                                <button onClick={() => reg ? unregisterContest(contestId) : registerContest(contestId)} style={{ width: '100%', padding: '14px', borderRadius: '13px', background: reg ? 'rgba(52,211,153,0.08)' : 'linear-gradient(135deg,#34d399,#059669)', border: reg ? '1px solid rgba(52,211,153,0.3)' : 'none', color: reg ? '#34d399' : '#0b1a14', fontWeight: 700, fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: !reg ? '0 4px 20px rgba(52,211,153,0.25)' : 'none', transition: 'all 0.25s' }}>
                                    {reg ? <><CheckCircle size={17} /> Registered</> : <><PlayCircle size={17} /> Register Now</>}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 32px' }}>
                {/* Only show Problems + Leaderboard tabs when the contest is live or finished */}
                <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '32px' }}>
                    {(['overview', ...(isLive || contest.status === 'past' ? ['problems', 'leaderboard'] : [])]).map(t => (
                        <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '14px 22px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', color: activeTab === t ? '#34d399' : '#6b7280', borderBottom: `2px solid ${activeTab === t ? '#34d399' : 'transparent'}`, transition: 'all 0.2s', textTransform: 'capitalize', letterSpacing: '0.02em' }}>
                            {t}
                        </button>
                    ))}
                </div>

                {/* ── Overview Tab ── */}
                {activeTab === 'overview' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', paddingBottom: '60px' }}>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#e5e7eb', marginBottom: '16px' }}>About this Contest</h2>
                            <div style={{ borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '24px', color: '#9ca3af', lineHeight: 1.8, fontSize: '14.5px' }}>
                                <p>{contest.description}</p>
                                <ul style={{ marginTop: '16px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <li>Duration: <strong style={{ color: '#e5e7eb' }}>{contest.duration} minutes</strong></li>
                                    <li>Problems: <strong style={{ color: '#e5e7eb' }}>{problems.length}</strong></li>
                                    <li>Type: <strong style={{ color: '#e5e7eb', textTransform: 'capitalize' }}>{contest.type}</strong></li>
                                    <li>Scoring: Points awarded based on correctness and time</li>
                                    <li>Penalty: 10 minutes per wrong submission</li>
                                </ul>
                            </div>

                            {contest.tags?.length > 0 && (
                                <div style={{ marginTop: '24px' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Tag size={13} /> Topics</h3>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {contest.tags.map(tag => <span key={tag} style={{ padding: '5px 14px', borderRadius: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '13px', color: '#9ca3af' }}>{tag}</span>)}
                                    </div>
                                </div>
                            )}

                            {/* Upcoming-only: locked notice */}
                            {!isLive && contest.status !== 'past' && (
                                <div style={{ marginTop: '24px', borderRadius: '16px', background: 'rgba(52,211,153,0.03)', border: '1px solid rgba(52,211,153,0.12)', padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(52,211,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Shield size={18} style={{ color: '#34d399' }} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>Problems & Leaderboard Locked</p>
                                        <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>Problem details and the leaderboard will be revealed once the contest goes live. Register now to get notified!</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Problem preview (titles hidden until live) */}
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#e5e7eb', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Shield size={16} style={{ color: '#34d399' }} /> Problems Preview</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {problems.map((p, i) => (
                                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <span style={{ width: '24px', height: '24px', borderRadius: '8px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#34d399', flexShrink: 0 }}>{String.fromCharCode(65 + i)}</span>
                                        {/* Hide title until live or finished */}
                                        <span style={{ flex: 1, fontSize: '14px', color: isLive || contest.status === 'past' || p.isCustom ? '#e5e7eb' : '#6b7280', fontWeight: 500, fontStyle: isLive || contest.status === 'past' || p.isCustom ? 'normal' : 'italic' }}>
                                            {isLive || contest.status === 'past' || p.isCustom ? p.title : `Problem ${String.fromCharCode(65 + i)} — Hidden`}
                                        </span>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: p.difficulty === 'Easy' ? '#34d399' : p.difficulty === 'Medium' ? '#fbbf24' : '#f87171' }}>{p.difficulty}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Problems Tab ── */}
                {activeTab === 'problems' && (
                    <div style={{ paddingBottom: '60px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {problems.map((p, i) => (
                                <div
                                    key={p.id}
                                    onMouseEnter={() => setHoveredProblem(p.id)}
                                    onMouseLeave={() => setHoveredProblem(null)}
                                    onClick={() => navigate(`/problems/${p.id}`)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 24px', borderRadius: '14px', background: hoveredProblem === p.id ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${hoveredProblem === p.id ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer', transition: 'all 0.2s', transform: hoveredProblem === p.id ? 'translateX(3px)' : 'none' }}
                                >
                                    <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: '#34d399', flexShrink: 0 }}>{String.fromCharCode(65 + i)}</span>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '15px', fontWeight: 600, color: hoveredProblem === p.id ? '#34d399' : '#e5e7eb', marginBottom: '4px', transition: 'color 0.2s' }}>
                                            {contest.status === 'past' || p.isCustom ? p.title : `Problem ${String.fromCharCode(65 + i)}`}
                                        </p>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {p.tags?.slice(0, 3).map(t => <span key={t} style={{ fontSize: '11px', color: '#6b7280', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px' }}>{t}</span>)}
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: p.difficulty === 'Easy' ? '#34d399' : p.difficulty === 'Medium' ? '#fbbf24' : '#f87171', background: p.difficulty === 'Easy' ? 'rgba(52,211,153,0.1)' : p.difficulty === 'Medium' ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)', padding: '4px 12px', borderRadius: '8px' }}>{p.difficulty}</span>
                                    <span style={{ fontSize: '13px', color: '#6b7280', minWidth: '42px', textAlign: 'right' }}>{p.isCustom ? 'Custom' : p.acceptance}</span>
                                    <ExternalLink size={14} style={{ color: hoveredProblem === p.id ? '#34d399' : '#4b5563', flexShrink: 0, transition: 'color 0.2s' }} />
                                </div>
                            ))}
                        </div>
                        {(reg || contest.status === 'past') && (
                            <div style={{ marginTop: '24px', textAlign: 'center' }}>
                                {isLive ? (
                                    <button onClick={handleAttempt} style={{ padding: '14px 36px', borderRadius: '14px', background: 'linear-gradient(135deg,#ef4444,#b91c1c)', border: 'none', color: '#fff', fontWeight: 800, fontSize: '16px', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 20px rgba(239,68,68,0.35)' }}>
                                        <Swords size={18} /> Enter Arena Now
                                    </button>
                                ) : !reg ? (
                                    <button onClick={() => registerContest(contestId)} style={{ padding: '14px 36px', borderRadius: '14px', background: 'linear-gradient(135deg,#34d399,#059669)', border: 'none', color: '#0b1a14', fontWeight: 800, fontSize: '16px', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 20px rgba(52,211,153,0.25)' }}>
                                        <PlayCircle size={18} /> Register to Attempt
                                    </button>
                                ) : null}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Leaderboard Tab ── */}
                {activeTab === 'leaderboard' && (
                    <div style={{ paddingBottom: '60px' }}>
                        <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 100px 80px 120px 40px', gap: '0', padding: '12px 24px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                {['Rank', 'Participant', 'Score', 'Solved', 'Time', ''].map(h => <span key={h} style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>)}
                            </div>
                            {fakeLeaderboard.map((row, i) => (
                                <div
                                    key={row.rank}
                                    onMouseEnter={() => setHoveredRow(row.rank)}
                                    onMouseLeave={() => setHoveredRow(null)}
                                    onClick={() => navigate(`/profile/${row.name}`)}
                                    style={{ display: 'grid', gridTemplateColumns: '60px 1fr 100px 80px 120px 40px', alignItems: 'center', padding: '16px 24px', borderBottom: i < fakeLeaderboard.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: hoveredRow === row.rank ? 'rgba(52,211,153,0.04)' : i === 0 ? 'rgba(245,158,11,0.04)' : 'transparent', transition: 'background 0.2s', cursor: 'pointer' }}
                                >
                                    <span style={{ fontSize: '16px', fontWeight: 800, color: row.rank <= 3 ? ['#f59e0b', '#9ca3af', '#cd7c2f'][row.rank - 1] : '#6b7280' }}>
                                        {row.rank <= 3 ? ['🥇', '🥈', '🥉'][row.rank - 1] : `#${row.rank}`}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#34d399,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#0b1a14' }}>{row.name[0].toUpperCase()}</div>
                                        <div>
                                            <p style={{ fontSize: '14px', fontWeight: 600, color: hoveredRow === row.rank ? '#34d399' : '#e5e7eb', transition: 'color 0.2s' }}>{row.name}</p>
                                            <p style={{ fontSize: '12px', color: '#6b7280' }}>{row.country}</p>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#34d399' }}>{row.score.toLocaleString()}</span>
                                    <span style={{ fontSize: '14px', color: '#d1d5db', fontWeight: 500 }}>{row.solved}/{problems.length}</span>
                                    <span style={{ fontSize: '13.5px', color: '#9ca3af' }}>{row.time}</span>
                                    <ChevronRight size={14} style={{ color: hoveredRow === row.rank ? '#34d399' : '#4b5563', transition: 'color 0.2s' }} />
                                </div>
                            ))}
                        </div>

                    </div>
                )}
            </div>
        </div>
    )
}
