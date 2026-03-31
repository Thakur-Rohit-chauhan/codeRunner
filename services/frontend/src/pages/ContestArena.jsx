import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    Shield, ChevronLeft, ChevronRight, Clock, Send, CheckCircle,
    XCircle, Loader, AlertTriangle, Trophy, Swords, Play,
    RotateCcw, Maximize2, Minimize2, ChevronDown, Code2, Target
} from 'lucide-react'
import useContestStore from '../store/contestStore'
import useAuthStore from '../store/authStore'
import { getProblemDetail } from '../utils/mockData'
import { getDefaultLanguageForDomain, getLanguagesForDomain, getStarterCodeForLanguage } from '../utils/compilerLanguages'

// ─── Countdown Timer ──────────────────────────────────────────────────────────
function useContestTimer(startedAt, durationMin) {
    const [remaining, setRemaining] = useState(0)
    useEffect(() => {
        const endTime = new Date(startedAt).getTime() + durationMin * 60 * 1000
        const calc = () => { const r = Math.max(0, Math.floor((endTime - Date.now()) / 1000)); setRemaining(r) }
        calc(); const id = setInterval(calc, 1000); return () => clearInterval(id)
    }, [startedAt, durationMin])
    const h = Math.floor(remaining / 3600)
    const m = Math.floor((remaining % 3600) / 60)
    const s = remaining % 60
    const isUrgent = remaining < 300 // < 5 min
    return { h, m, s, remaining, isUrgent }
}

// ─── Languages ────────────────────────────────────────────────────────────────
function formatAccuracy(value) {
    return `${(value * 100).toFixed(2)}%`
}

function formatElapsed(seconds) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`
    if (minutes > 0) return `${minutes}m ${secs}s`
    return `${secs}s`
}

// ─── Submission status pill ───────────────────────────────────────────────────
const statusMeta = {
    accepted:    { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)',  icon: <CheckCircle size={13} />,    label: 'Accepted' },
    wrong:       { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)', icon: <XCircle size={13} />,        label: 'Wrong Answer' },
    tle:         { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.25)',  icon: <Clock size={13} />,          label: 'Time Limit' },
    error:       { color: '#c084fc', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.25)', icon: <AlertTriangle size={13} />,  label: 'Runtime Error' },
    submitting:  { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)',  icon: <Loader size={13} className="animate-spin" />, label: 'Judging…' },
}

function StatusPill({ status }) {
    if (!status) return null
    const m = statusMeta[status] || statusMeta.wrong
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '20px', background: m.bg, border: `1px solid ${m.border}`, color: m.color, fontSize: '12.5px', fontWeight: 700 }}>
            {m.icon} {m.label}
        </span>
    )
}

// ─── Arena ────────────────────────────────────────────────────────────────────
export default function ContestArena() {
    const { contestId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const { getContest, getProblemsForContest, activeAttempt, saveAnswer, endAttempt, recordContestResult } = useContestStore()
    const contest = getContest(contestId)

    const [problemIdx, setProblemIdx] = useState(0)
    const [lang, setLang] = useState('python')
    const [langOpen, setLangOpen] = useState(false)
    const [code, setCode] = useState('')
    const [submissions, setSubmissions] = useState({}) // { problemId: { status, time } }
    const [runOutput, setRunOutput] = useState(null)
    const [isRunning, setIsRunning] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [fullscreen, setFullscreen] = useState(false)
    const [showFinish, setShowFinish] = useState(false)
    const [finished, setFinished] = useState(false)

    // Timer
    const startedAt = activeAttempt?.startedAt || new Date().toISOString()
    const { h, m, s, remaining, isUrgent } = useContestTimer(startedAt, contest?.duration || 90)

    // Redirect if no active attempt
    useEffect(() => {
        if (!activeAttempt || activeAttempt.contestId !== contestId) {
            navigate(`/contests/${contestId}`)
        }
    }, [activeAttempt, contestId])

    if (!contest) return null
    const problems = getProblemsForContest(contest)
    const currentProblem = problems[problemIdx]
    const detail = currentProblem ? (currentProblem.isCustom ? currentProblem : getProblemDetail(currentProblem.id)) : null
    const contestDomain = contest.domain || problems[0]?.domain || 'DSA'
    const isMlContest = contest.ranking === 'accuracy' || contestDomain === 'ML'
    const availableLanguages = useMemo(() => getLanguagesForDomain(contestDomain), [contestDomain])
    const currentLang = availableLanguages.find(language => language.key === lang) || availableLanguages[0]
    const elapsedSeconds = Math.max(0, (contest?.duration || 90) * 60 - remaining)

    // Load code from answers store when switching problems
    useEffect(() => {
        if (currentProblem) {
            const saved = activeAttempt?.answers?.[currentProblem.id]?.[lang]
            setCode(saved || getStarterCodeForLanguage(detail, lang))
        }
    }, [problemIdx, lang, currentProblem?.id, detail, activeAttempt])

    useEffect(() => {
        if (!availableLanguages.some(language => language.key === lang)) {
            setLang(getDefaultLanguageForDomain(contestDomain))
        }
    }, [availableLanguages, contestDomain, lang])

    // Auto-save on change
    useEffect(() => {
        if (currentProblem) {
            const merged = {
                ...(activeAttempt?.answers?.[currentProblem.id] || {}),
                [lang]: code,
            }
            saveAnswer(currentProblem.id, merged)
        }
    }, [code])

    const handleRun = useCallback(() => {
        setIsRunning(true)
        setRunOutput(null)
        setTimeout(() => {
            if (isMlContest) {
                const accuracy = 0.72 + Math.random() * 0.2
                setRunOutput({
                    type: 'success',
                    message: `Validation complete: ${formatAccuracy(accuracy)} accuracy`,
                    metrics: [
                        { label: 'Accuracy', value: formatAccuracy(accuracy) },
                        { label: 'Loss', value: (0.35 + Math.random() * 0.25).toFixed(3) },
                        { label: 'Runtime', value: `${45 + Math.floor(Math.random() * 35)}s` },
                    ],
                })
            } else {
                const pass = Math.random() > 0.3
                setRunOutput(pass
                    ? { type: 'success', message: '✓ All sample test cases passed!', cases: [{ input: detail?.testCases?.[0]?.input || 'sample', expected: detail?.testCases?.[0]?.expectedOutput || 'ok', got: detail?.testCases?.[0]?.expectedOutput || 'ok', passed: true }] }
                    : { type: 'error', message: '✗ Test case failed', cases: [{ input: detail?.testCases?.[0]?.input || 'sample', expected: detail?.testCases?.[0]?.expectedOutput || 'ok', got: 'null', passed: false }] }
                )
            }
            setIsRunning(false)
        }, 1400)
    }, [detail, isMlContest])

    const handleSubmit = useCallback(() => {
        if (!currentProblem) return
        setIsSubmitting(true)
        setSubmissions(s => ({ ...s, [currentProblem.id]: { status: 'submitting', time: new Date().toLocaleTimeString() } }))
        setTimeout(() => {
            if (isMlContest) {
                const accuracy = 0.74 + Math.random() * 0.21
                setSubmissions(s => {
                    const previous = s[currentProblem.id] || {}
                    const previousBest = previous.accuracy || 0
                    const nextBest = Math.max(previousBest, accuracy)
                    const bestTimeSeconds = accuracy > previousBest
                        ? elapsedSeconds
                        : (previous.timeSeconds ?? elapsedSeconds)
                    return {
                        ...s,
                        [currentProblem.id]: {
                            status: 'accepted',
                            accuracy: nextBest,
                            lastAccuracy: accuracy,
                            submissions: (previous.submissions || 0) + 1,
                            time: formatElapsed(bestTimeSeconds),
                            timeSeconds: bestTimeSeconds,
                            lastSubmittedAt: new Date().toLocaleTimeString(),
                        },
                    }
                })
                setRunOutput({
                    type: 'success',
                    message: `Submission accepted at ${formatAccuracy(accuracy)}`,
                    metrics: [
                        { label: 'Current Accuracy', value: formatAccuracy(accuracy) },
                        { label: 'Leaderboard Metric', value: formatAccuracy(accuracy) },
                        { label: 'Best Time', value: formatElapsed(elapsedSeconds) },
                    ],
                })
            } else {
                const outcomes = ['accepted', 'accepted', 'accepted', 'wrong', 'tle', 'error']
                const outcome = outcomes[Math.floor(Math.random() * outcomes.length)]
                setSubmissions(s => ({ ...s, [currentProblem.id]: { status: outcome, time: new Date().toLocaleTimeString(), timeSeconds: elapsedSeconds } }))
            }
            setIsSubmitting(false)
        }, 2000)
    }, [currentProblem, elapsedSeconds, isMlContest])

    const handleFinish = () => {
        const participantName = user?.username || 'coderunner'
        if (isMlContest) {
            const mlRows = Object.values(submissions).filter(sub => typeof sub.accuracy === 'number')
            const bestSubmission = mlRows.reduce((best, sub) => {
                if (!best) return sub
                if ((sub.accuracy || 0) !== (best.accuracy || 0)) {
                    return (sub.accuracy || 0) > (best.accuracy || 0) ? sub : best
                }
                return (sub.timeSeconds ?? Infinity) < (best.timeSeconds ?? Infinity) ? sub : best
            }, null)
            recordContestResult(contestId, {
                name: participantName,
                country: '🌍',
                accuracy: bestSubmission?.accuracy || 0,
                submissions: mlRows.reduce((count, sub) => count + (sub.submissions || 0), 0),
                time: formatElapsed(bestSubmission?.timeSeconds ?? elapsedSeconds),
                timeSeconds: bestSubmission?.timeSeconds ?? elapsedSeconds,
            })
        } else {
            const problemMap = Object.fromEntries(problems.map(problem => [problem.id, problem]))
            const wrongCount = Object.values(submissions).filter(sub => ['wrong', 'tle', 'error'].includes(sub.status)).length
            const score = Object.entries(submissions).reduce((total, [problemId, sub]) => {
                if (sub.status !== 'accepted') return total
                const difficulty = problemMap[problemId]?.difficulty
                const points = difficulty === 'Hard' ? 1600 : difficulty === 'Medium' ? 1200 : 800
                return total + points
            }, 0) - wrongCount * 50
            recordContestResult(contestId, {
                name: participantName,
                country: '🌍',
                score: Math.max(0, score),
                solved: solvedCount,
                time: formatElapsed(elapsedSeconds),
                timeSeconds: elapsedSeconds,
            })
        }
        endAttempt()
        setFinished(true)
        setTimeout(() => navigate(`/contests/${contestId}`), 3000)
    }

    // Timer urgency effect
    const timerColor = remaining === 0 ? '#ef4444' : isUrgent ? '#f59e0b' : '#34d399'

    // Solved count / ML metric
    const solvedCount = Object.values(submissions).filter(s => s.status === 'accepted').length
    const bestAccuracy = Object.values(submissions).reduce((best, submission) => Math.max(best, submission.accuracy || 0), 0)

    if (finished) {
        return (
            <div style={{ minHeight: '100vh', background: '#0b0f19', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', gap: '20px' }}>
                <div style={{ fontSize: '64px', animation: 'bounce 1s ease' }}>🏆</div>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f1f5f9' }}>Contest Submitted!</h1>
                <p style={{ color: '#9ca3af', fontSize: '16px' }}>
                    {isMlContest
                        ? <>Your best accuracy was <strong style={{ color: '#34d399' }}>{formatAccuracy(bestAccuracy)}</strong></>
                        : <>You solved <strong style={{ color: '#34d399' }}>{solvedCount}</strong> out of <strong style={{ color: '#e5e7eb' }}>{problems.length}</strong> problems</>}
                </p>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>Redirecting to results…</p>
                <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }`}</style>
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0b0f19', display: 'flex', flexDirection: 'column', fontFamily: '"Inter","Roboto",sans-serif', overflow: 'hidden' }}>

            {/* ── Top Bar ── */}
            <div style={{ height: '52px', background: '#111827', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={18} style={{ color: '#34d399' }} />
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Code<span style={{ color: '#34d399' }}>Runner</span></span>
                    </div>
                    <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />
                    <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 500, maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contest.title}</span>
                </div>

                {/* Center: Problem tabs */}
                <div style={{ display: 'flex', gap: '4px' }}>
                    {problems.map((p, i) => {
                        const sub = submissions[p.id]
                        const isActive = i === problemIdx
                        return (
                            <button key={p.id} onClick={() => setProblemIdx(i)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '8px', background: isActive ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isActive ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.07)'}`, color: isActive ? '#34d399' : '#9ca3af', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                                {String.fromCharCode(65 + i)}
                                {sub?.status === 'accepted' && <CheckCircle size={11} style={{ color: '#34d399' }} />}
                                {sub?.status && sub.status !== 'accepted' && sub.status !== 'submitting' && <XCircle size={11} style={{ color: '#f87171' }} />}
                            </button>
                        )
                    })}
                </div>

                {/* Timer + actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 14px', borderRadius: '10px', background: isUrgent ? 'rgba(239,68,68,0.12)' : 'rgba(52,211,153,0.08)', border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.3)' : 'rgba(52,211,153,0.2)'}` }}>
                        <Clock size={14} style={{ color: timerColor }} />
                        <span style={{ fontSize: '15px', fontWeight: 700, color: timerColor, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em' }}>
                            {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontSize: '13px', color: '#9ca3af' }}>
                        <Target size={13} /> {isMlContest ? formatAccuracy(bestAccuracy) : `${solvedCount}/${problems.length}`}
                    </div>
                    <button onClick={() => setShowFinish(true)} style={{ padding: '6px 16px', borderRadius: '9px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Trophy size={13} /> Finish
                    </button>
                </div>
            </div>

            {/* ── Main Layout ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* ── Left: Problem Description ── */}
                {!fullscreen && (
                    <div style={{ width: '44%', minWidth: '340px', borderRight: '1px solid rgba(255,255,255,0.07)', overflowY: 'auto', flexShrink: 0, background: '#0d1117' }}>
                        {currentProblem && detail && (
                            <div style={{ padding: '24px' }}>
                                {/* Problem nav */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                                    <button onClick={() => setProblemIdx(i => Math.max(0, i - 1))} disabled={problemIdx === 0} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: problemIdx === 0 ? '#4b5563' : '#9ca3af', cursor: problemIdx === 0 ? 'default' : 'pointer', fontSize: '13px', fontFamily: 'inherit', opacity: problemIdx === 0 ? 0.4 : 1 }}>
                                        <ChevronLeft size={14} /> Prev
                                    </button>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#34d399' }}>{String.fromCharCode(65 + problemIdx)}.</span>
                                        {submissions[currentProblem.id] && <StatusPill status={submissions[currentProblem.id].status} />}
                                    </div>
                                    <button onClick={() => setProblemIdx(i => Math.min(problems.length - 1, i + 1))} disabled={problemIdx === problems.length - 1} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: problemIdx === problems.length - 1 ? '#4b5563' : '#9ca3af', cursor: problemIdx === problems.length - 1 ? 'default' : 'pointer', fontSize: '13px', fontFamily: 'inherit', opacity: problemIdx === problems.length - 1 ? 0.4 : 1 }}>
                                        Next <ChevronRight size={14} />
                                    </button>
                                </div>

                                {/* Title */}
                                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f1f5f9', marginBottom: '10px', lineHeight: 1.3 }}>{currentProblem.title}</h2>

                                {/* Badges */}
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, color: currentProblem.difficulty === 'Easy' ? '#34d399' : currentProblem.difficulty === 'Medium' ? '#fbbf24' : '#f87171', background: currentProblem.difficulty === 'Easy' ? 'rgba(52,211,153,0.1)' : currentProblem.difficulty === 'Medium' ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${currentProblem.difficulty === 'Easy' ? 'rgba(52,211,153,0.2)' : currentProblem.difficulty === 'Medium' ? 'rgba(251,191,36,0.2)' : 'rgba(248,113,113,0.2)'}` }}>{currentProblem.difficulty}</span>
                                    {currentProblem.tags?.slice(0, 2).map(t => <span key={t} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11.5px', color: '#6b7280', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>{t}</span>)}
                                </div>

                                {/* Description */}
                                <div style={{ fontSize: '14.5px', color: '#9ca3af', lineHeight: 1.8, marginBottom: '24px', whiteSpace: 'pre-wrap' }}>{detail.description}</div>

                                {/* Examples */}
                                {detail.examples?.length > 0 && (
                                    <div style={{ marginBottom: '24px' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#e5e7eb', marginBottom: '12px' }}>Examples</h3>
                                        {detail.examples.map((ex, i) => (
                                            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 16px', marginBottom: '10px' }}>
                                                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>Example {i + 1}</p>
                                                <p style={{ fontSize: '13px', color: '#9ca3af', fontFamily: 'monospace' }}><strong style={{ color: '#e5e7eb' }}>Input:</strong> {ex.input}</p>
                                                <p style={{ fontSize: '13px', color: '#9ca3af', fontFamily: 'monospace' }}><strong style={{ color: '#e5e7eb' }}>Output:</strong> {ex.output}</p>
                                                {ex.explanation && <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px' }}>{ex.explanation}</p>}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Constraints */}
                                {detail.constraints?.length > 0 && (
                                    <div>
                                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#e5e7eb', marginBottom: '10px' }}>Constraints</h3>
                                        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {detail.constraints.map((c, i) => <li key={i} style={{ fontSize: '13px', color: '#9ca3af', fontFamily: 'monospace' }}>{c}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Right: Code Editor ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0b0f19' }}>

                    {/* Editor toolbar */}
                    <div style={{ height: '44px', background: '#111827', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Code2 size={14} style={{ color: '#6b7280' }} />
                            {/* Language selector */}
                            <div style={{ position: 'relative' }}>
                                <button onClick={() => setLangOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                                    {currentLang?.label || 'Language'} <ChevronDown size={12} style={{ transition: 'transform 0.2s', transform: langOpen ? 'rotate(180deg)' : 'none' }} />
                                </button>
                                {langOpen && (
                                    <div style={{ position: 'absolute', top: '36px', left: 0, zIndex: 200, width: '140px', borderRadius: '12px', background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 32px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                                        {availableLanguages.map(language => (
                                            <button key={language.key} onClick={() => { setLang(language.key); setLangOpen(false) }} style={{ width: '100%', padding: '10px 16px', background: language.key === lang ? 'rgba(52,211,153,0.1)' : 'transparent', border: 'none', color: language.key === lang ? '#34d399' : '#d1d5db', fontSize: '13.5px', fontWeight: language.key === lang ? 700 : 400, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                {language.label} {language.key === lang && <CheckCircle size={13} />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button onClick={() => { if (detail) setCode(getStarterCodeForLanguage(detail, lang)) }} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 11px', borderRadius: '7px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280', fontSize: '12.5px', cursor: 'pointer', fontFamily: 'inherit' }}>
                                <RotateCcw size={11} /> Reset
                            </button>
                            <button onClick={() => setFullscreen(f => !f)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 11px', borderRadius: '7px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280', fontSize: '12.5px', cursor: 'pointer', fontFamily: 'inherit' }}>
                                {fullscreen ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
                            </button>
                        </div>
                    </div>

                    {/* Code area */}
                    <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                        <textarea
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            spellCheck={false}
                            style={{ width: '100%', height: '100%', background: '#0b0f19', border: 'none', color: '#e5e7eb', fontFamily: '"Fira Code","JetBrains Mono","Cascadia Code",monospace', fontSize: '14px', lineHeight: 1.65, padding: '18px 20px', outline: 'none', resize: 'none', boxSizing: 'border-box', tabSize: 4 }}
                            onKeyDown={e => {
                                if (e.key === 'Tab') { e.preventDefault(); const s = e.target.selectionStart; const v = e.target.value; setCode(v.substring(0, s) + '    ' + v.substring(e.target.selectionEnd)); requestAnimationFrame(() => { e.target.selectionStart = e.target.selectionEnd = s + 4 }) }
                            }}
                        />
                    </div>

                    {/* Run output */}
                    {runOutput && (
                        <div style={{ background: '#111827', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '14px 20px', maxHeight: '180px', overflowY: 'auto', flexShrink: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: 700, color: runOutput.type === 'success' ? '#34d399' : '#f87171', marginBottom: '10px' }}>{runOutput.message}</p>
                            {runOutput.metrics?.map((metric, i) => (
                                <div key={metric.label} style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: '8px', padding: '10px 14px', marginBottom: i < runOutput.metrics.length - 1 ? '6px' : 0, fontSize: '13px', fontFamily: 'monospace', color: '#9ca3af' }}>
                                    <span style={{ color: '#34d399', fontWeight: 700, marginRight: '8px' }}>{metric.label}:</span>
                                    <span>{metric.value}</span>
                                </div>
                            ))}
                            {runOutput.cases?.map((c, i) => (
                                <div key={i} style={{ background: c.passed ? 'rgba(52,211,153,0.05)' : 'rgba(248,113,113,0.05)', border: `1px solid ${c.passed ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '6px', fontSize: '13px', fontFamily: 'monospace', color: '#9ca3af' }}>
                                    <span style={{ color: c.passed ? '#34d399' : '#f87171', fontWeight: 700, marginRight: '8px' }}>{c.passed ? '✓' : '✗'}</span>
                                    <span>Input: {c.input} · Expected: {c.expected} · Got: {c.got}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Bottom action bar */}
                    <div style={{ height: '56px', background: '#111827', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 }}>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                            {currentProblem && <span>Problem {String.fromCharCode(65 + problemIdx)} · {currentProblem.difficulty}{isMlContest ? ` · Best ${formatAccuracy(bestAccuracy)}` : ''}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={handleRun} disabled={isRunning} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db', fontWeight: 600, fontSize: '13.5px', cursor: isRunning ? 'default' : 'pointer', transition: 'all 0.2s', fontFamily: 'inherit', opacity: isRunning ? 0.6 : 1 }}>
                                {isRunning ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />} {isMlContest ? 'Run Validation' : 'Run'}
                            </button>
                            <button onClick={handleSubmit} disabled={isSubmitting} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 20px', borderRadius: '10px', background: isSubmitting ? 'rgba(52,211,153,0.1)' : 'linear-gradient(135deg,#34d399,#059669)', border: isSubmitting ? '1px solid rgba(52,211,153,0.3)' : 'none', color: isSubmitting ? '#34d399' : '#0b1a14', fontWeight: 700, fontSize: '13.5px', cursor: isSubmitting ? 'default' : 'pointer', transition: 'all 0.2s', fontFamily: 'inherit', boxShadow: !isSubmitting ? '0 4px 14px rgba(52,211,153,0.25)' : 'none' }}>
                                {isSubmitting ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />} {isMlContest ? 'Submit Model' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Finish Confirm Modal ── */}
            {showFinish && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '400px', borderRadius: '20px', background: '#161b24', border: '1px solid rgba(255,255,255,0.1)', padding: '32px', boxShadow: '0 40px 80px rgba(0,0,0,0.6)', textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏁</div>
                        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#f1f5f9', marginBottom: '8px' }}>Finish Contest?</h2>
                        <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: 1.6, marginBottom: '8px' }}>
                            {isMlContest
                                ? <>Your current leaderboard metric is <strong style={{ color: '#34d399' }}>{formatAccuracy(bestAccuracy)}</strong>.</>
                                : <>You have solved <strong style={{ color: '#34d399' }}>{solvedCount}</strong> of <strong style={{ color: '#e5e7eb' }}>{problems.length}</strong> problems.</>}
                        </p>
                        <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '24px' }}>Time remaining: {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setShowFinish(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af', fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                            <button onClick={handleFinish} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg,#34d399,#059669)', border: 'none', color: '#0b1a14', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
                                <Trophy size={15} /> Submit All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
            `}</style>
        </div>
    )
}
