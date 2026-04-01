import React, { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Code2, Copy, MessageCircle, MessageSquare, Terminal, ThumbsUp, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import useSolutionStore, { canManageSolution } from '../store/solutionStore'
import { getDefaultLanguageForDomain, getLanguagesForDomain, languageLabelMap } from '../utils/compilerLanguages'

const EMPTY_SOLUTIONS = []
const EMPTY_COMMENTS = []

const domainLabelMap = {
    DSA: 'DSA',
    ML: 'Machine Learning',
    CTF: 'Cyber Security',
}

function timeAgo(iso) {
    if (!iso) return ''
    const ms = new Date().getTime() - new Date(iso).getTime()
    const s = Math.max(0, Math.floor(ms / 1000))
    if (s < 60) return 'just now'
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d < 7) return `${d}d ago`
    const w = Math.floor(d / 7)
    if (w < 6) return `${w}w ago`
    const mo = Math.floor(d / 30)
    if (mo < 24) return `${mo}mo ago`
    const y = Math.floor(d / 365)
    return `${y}y ago`
}

export default function ProblemSolutionsTab({ problem }) {
    const user = useAuthStore((state) => state.user)
    const addSolution = useSolutionStore((state) => state.addSolution)
    const deleteSolution = useSolutionStore((state) => state.deleteSolution)
    const toggleUpvote = useSolutionStore((state) => state.toggleUpvote)
    const addComment = useSolutionStore((state) => state.addComment)
    const syncSolutionsFromStorage = useSolutionStore((state) => state.syncFromStorage)
    const solutionsByProblem = useSolutionStore((state) => state.solutionsByProblem)
    const commentsBySolutionMap = useSolutionStore((state) => state.commentsBySolution)

    const availableLanguages = useMemo(() => getLanguagesForDomain(problem?.domain), [problem?.domain])
    const problemSolutionKey = useMemo(
        () => `${problem?.domain || 'DSA'}:${String(problem?.id || '')}`,
        [problem?.domain, problem?.id]
    )
    const problemSolutions = useMemo(() => {
        const entries = solutionsByProblem?.[problemSolutionKey]
        return Array.isArray(entries) ? entries : EMPTY_SOLUTIONS
    }, [solutionsByProblem, problemSolutionKey])

    const [solutionSort, setSolutionSort] = useState('top')
    const [solutionLanguage, setSolutionLanguage] = useState(getDefaultLanguageForDomain(problem?.domain))
    const [solutionDraft, setSolutionDraft] = useState({ title: '', explanation: '', code: '' })
    const [expandedSolutions, setExpandedSolutions] = useState(() => new Set())
    const [commentDrafts, setCommentDrafts] = useState({})
    const [solutionPendingDelete, setSolutionPendingDelete] = useState(null)

    useEffect(() => {
        if (typeof window === 'undefined') return undefined

        const handleStorage = (event) => {
            if (!event.key || event.key === 'coderunner_solutions_v1') {
                syncSolutionsFromStorage()
            }
        }

        window.addEventListener('storage', handleStorage)
        return () => window.removeEventListener('storage', handleStorage)
    }, [syncSolutionsFromStorage])

    useEffect(() => {
        syncSolutionsFromStorage()
    }, [user?.username, syncSolutionsFromStorage])

    const solutionItems = useMemo(() => {
        const sorted = [...problemSolutions]
        if (solutionSort === 'newest') {
            sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        } else {
            sorted.sort((a, b) => (b.upvotes?.length || 0) - (a.upvotes?.length || 0) || (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
        }
        return sorted
    }, [problemSolutions, solutionSort])

    const toggleExpanded = (solutionId) => {
        setExpandedSolutions((prev) => {
            const next = new Set(prev)
            if (next.has(solutionId)) next.delete(solutionId)
            else next.add(solutionId)
            return next
        })
    }

    const handlePublishSolution = () => {
        if (!user?.username) {
            toast.error('Please log in to post a solution', {
                style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
            })
            return
        }

        const title = (solutionDraft.title || '').trim()
        const explanation = (solutionDraft.explanation || '').trim()
        const code = (solutionDraft.code || '').trim()
        if (!title && !explanation && !code) {
            toast.error('Write something before publishing', {
                style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
            })
            return
        }

        const createdId = addSolution({
            problemId: problem.id,
            domain: problem.domain,
            author: { id: user.id, username: user.username, email: user.email, displayName: user.displayName, avatar: user.avatar },
            language: languageLabelMap[solutionLanguage] || solutionLanguage,
            title: title || `${problem.title} (${languageLabelMap[solutionLanguage] || solutionLanguage})`,
            explanation,
            code,
        })

        setSolutionDraft({ title: '', explanation: '', code: '' })
        if (createdId) {
            setExpandedSolutions((prev) => new Set(prev).add(createdId))
            toast.success('Published to community solutions', {
                style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
            })
        }
    }

    const handleConfirmDeleteSolution = () => {
        if (!solutionPendingDelete) return

        const deleted = deleteSolution({
            problemId: problem.id,
            domain: problem.domain,
            solutionId: solutionPendingDelete.id,
            actor: user,
        })

        setSolutionPendingDelete(null)

        if (deleted) {
            toast.success('Deleted', {
                style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
            })
        } else {
            toast.error('Only the author can delete this solution', {
                style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
            })
        }
    }

    return (
        <div style={{ padding: '18px 18px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'linear-gradient(135deg, rgba(14,20,29,0.92) 0%, rgba(18,24,33,0.85) 100%)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
            }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#e5e7eb' }}>Community Solutions</span>
                <span style={{ fontSize: '12px', color: '#7c8596', lineHeight: 1.5 }}>
                    Shared approaches, code, and discussion for {domainLabelMap[problem.domain] || problem.domain}.
                </span>
            </div>

            <div style={{
                borderRadius: '18px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.018) 100%)',
                padding: '16px',
                boxShadow: '0 16px 40px rgba(0,0,0,0.28)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '34px', height: '34px', borderRadius: '10px',
                            background: 'rgba(52,211,153,0.10)',
                            border: '1px solid rgba(52,211,153,0.18)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#34d399',
                        }}>
                            <MessageSquare style={{ width: '16px', height: '16px' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#e5e7eb' }}>Share your solution</span>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                Post the idea, the tradeoffs, and optionally the code from your current approach.
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={() => setSolutionSort('top')}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '999px',
                                fontSize: '12px',
                                fontWeight: 700,
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: solutionSort === 'top' ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.03)',
                                color: solutionSort === 'top' ? '#34d399' : '#9ca3af',
                                cursor: 'pointer',
                            }}
                        >
                            Top
                        </button>
                        <button
                            onClick={() => setSolutionSort('newest')}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '999px',
                                fontSize: '12px',
                                fontWeight: 700,
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: solutionSort === 'newest' ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.03)',
                                color: solutionSort === 'newest' ? '#60a5fa' : '#9ca3af',
                                cursor: 'pointer',
                            }}
                        >
                            Newest
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <input
                        value={solutionDraft.title}
                        onChange={(e) => setSolutionDraft((p) => ({ ...p, title: e.target.value }))}
                        placeholder="Title (e.g. O(n) hash map)"
                        style={{
                            flex: '1 1 260px',
                            padding: '10px 12px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(10,14,20,0.6)',
                            color: '#e5e7eb',
                            outline: 'none',
                            fontSize: '12.5px',
                        }}
                    />
                    <div style={{
                        flex: '1 1 220px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(10,14,20,0.6)',
                        color: '#9ca3af',
                        fontSize: '12.5px',
                    }}>
                        <Code2 style={{ width: '14px', height: '14px', color: '#34d399', flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, flex: 1 }}>
                            <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                Solution language
                            </span>
                            <select
                                value={solutionLanguage}
                                onChange={(e) => setSolutionLanguage(e.target.value)}
                                style={{
                                    width: '100%',
                                    appearance: 'none',
                                    WebkitAppearance: 'none',
                                    MozAppearance: 'none',
                                    padding: '0 28px 0 0',
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#e5e7eb',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    outline: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                {availableLanguages.map((language) => (
                                    <option key={language.key} value={language.key} style={{ color: '#0b0f19' }}>
                                        {language.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <ChevronDown style={{ width: '15px', height: '15px', color: '#6b7280', pointerEvents: 'none', flexShrink: 0 }} />
                    </div>
                </div>

                <textarea
                    value={solutionDraft.explanation}
                    onChange={(e) => setSolutionDraft((p) => ({ ...p, explanation: e.target.value }))}
                    placeholder="Explain your logic, edge cases, and complexity..."
                    rows={4}
                    style={{
                        marginTop: '10px',
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(10,14,20,0.6)',
                        color: '#e5e7eb',
                        outline: 'none',
                        fontSize: '12.5px',
                        lineHeight: 1.5,
                        resize: 'vertical',
                    }}
                />

                <textarea
                    value={solutionDraft.code}
                    onChange={(e) => setSolutionDraft((p) => ({ ...p, code: e.target.value }))}
                    placeholder="Paste the code (optional)"
                    rows={6}
                    style={{
                        marginTop: '10px',
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(10,14,20,0.6)',
                        color: '#e5e7eb',
                        outline: 'none',
                        fontSize: '12.2px',
                        lineHeight: 1.5,
                        resize: 'vertical',
                        fontFamily: "'JetBrains Mono', monospace",
                    }}
                />

                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Posting as <span style={{ color: '#e5e7eb', fontWeight: 700 }}>{user?.displayName || user?.username || 'Guest'}</span>
                    </div>
                    <button
                        onClick={handlePublishSolution}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '7px',
                            padding: '8px 12px',
                            borderRadius: '12px',
                            fontSize: '12.5px',
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
                            border: '1px solid rgba(52,211,153,0.28)',
                            color: '#08110f',
                            cursor: 'pointer',
                            boxShadow: '0 10px 26px rgba(52,211,153,0.18)',
                        }}
                    >
                        <Upload style={{ width: '14px', height: '14px' }} />
                        Publish
                    </button>
                </div>
            </div>

            {solutionItems.length === 0 ? (
                <div style={{
                    borderRadius: '16px',
                    border: '1px dashed rgba(255,255,255,0.10)',
                    background: 'rgba(255,255,255,0.02)',
                    padding: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#e5e7eb' }}>No solutions yet</span>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>Be the first to share your logic and code for this problem.</span>
                    </div>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280',
                    }}>
                        <MessageCircle style={{ width: '16px', height: '16px' }} />
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {solutionItems.map((solution) => {
                        const isExpanded = expandedSolutions.has(solution.id)
                        const upvoteCount = solution.upvotes?.length || 0
                        const userUpvoted = !!(user?.username && solution.upvotes?.includes(user.username))
                        const canDelete = canManageSolution(solution, user)
                        const comments = Array.isArray(commentsBySolutionMap?.[solution.id]) ? commentsBySolutionMap[solution.id] : EMPTY_COMMENTS
                        const commentValue = commentDrafts[solution.id] || ''

                        return (
                            <div key={solution.id} style={{
                                borderRadius: '18px',
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: 'linear-gradient(180deg, rgba(255,255,255,0.024) 0%, rgba(255,255,255,0.015) 100%)',
                                overflow: 'hidden',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.16)',
                            }}>
                                <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                            <div style={{
                                                width: '34px', height: '34px', borderRadius: '12px',
                                                background: solution.author?.avatar ? 'transparent' : 'linear-gradient(135deg, rgba(96,165,250,0.35), rgba(52,211,153,0.20))',
                                                border: '1px solid rgba(255,255,255,0.10)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                overflow: 'hidden',
                                                flexShrink: 0,
                                            }}>
                                                {solution.author?.avatar ? (
                                                    <img src={solution.author.avatar} alt={solution.author.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#0b0f19' }}>
                                                        {(solution.author?.displayName || solution.author?.username || 'A')[0]?.toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                                <span style={{ fontSize: '14px', fontWeight: 800, color: '#f3f4f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {solution.title}
                                                </span>
                                                <span style={{ fontSize: '11.5px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {solution.author?.displayName || solution.author?.username || 'Anonymous'} · {solution.language} · {timeAgo(solution.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                        {solution.explanation && (
                                            <div style={{
                                                fontSize: '12.5px',
                                                color: '#d1d5db',
                                                lineHeight: 1.55,
                                                opacity: isExpanded ? 1 : 0.94,
                                                whiteSpace: isExpanded ? 'pre-wrap' : 'normal',
                                                overflow: 'hidden',
                                                display: '-webkit-box',
                                                WebkitLineClamp: isExpanded ? 'unset' : 3,
                                                WebkitBoxOrient: 'vertical',
                                            }}>
                                                {solution.explanation}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                        <button
                                            onClick={() => {
                                                if (!user?.username) {
                                                    toast.error('Log in to upvote', { style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } })
                                                    return
                                                }
                                                toggleUpvote({ problemId: problem.id, domain: problem.domain, solutionId: solution.id, username: user.username })
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                padding: '7px 10px', borderRadius: '999px',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                background: userUpvoted ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.03)',
                                                color: userUpvoted ? '#34d399' : '#9ca3af',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: 800,
                                            }}
                                        >
                                            <ThumbsUp style={{ width: '14px', height: '14px' }} />
                                            {upvoteCount}
                                        </button>

                                        {canDelete && (
                                            <button
                                                onClick={() => setSolutionPendingDelete(solution)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    width: '32px', height: '32px', borderRadius: '10px',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    color: '#f87171',
                                                    cursor: 'pointer',
                                                }}
                                                title="Delete your solution"
                                            >
                                                <Trash2 style={{ width: '16px', height: '16px' }} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div style={{
                                    padding: '0 16px 14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{
                                            fontSize: '11.5px',
                                            fontWeight: 700,
                                            color: '#34d399',
                                            background: 'rgba(52,211,153,0.10)',
                                            border: '1px solid rgba(52,211,153,0.16)',
                                            padding: '4px 9px',
                                            borderRadius: '999px',
                                        }}>
                                            {solution.language}
                                        </span>
                                        <span style={{ fontSize: '11.5px', color: '#6b7280' }}>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
                                        <span style={{ fontSize: '11.5px', color: '#6b7280' }}>{upvoteCount} {upvoteCount === 1 ? 'upvote' : 'upvotes'}</span>
                                    </div>

                                    {(solution.code || solution.explanation?.length > 220 || comments.length > 0) && (
                                        <button
                                            onClick={() => toggleExpanded(solution.id)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: isExpanded ? '#60a5fa' : '#9ca3af',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: 800,
                                                padding: 0,
                                            }}
                                        >
                                            {isExpanded ? 'Show less' : 'Open thread'}
                                        </button>
                                    )}
                                </div>

                                {isExpanded && solution.code && (
                                    <div style={{ padding: '0 16px 14px' }}>
                                        <div style={{
                                            borderRadius: '14px',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            background: 'rgba(10,14,20,0.75)',
                                            overflow: 'hidden',
                                        }}>
                                            <div style={{
                                                padding: '10px 10px',
                                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '10px',
                                                color: '#9ca3af',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                            }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                                    <Terminal style={{ width: '14px', height: '14px', color: '#34d399' }} />
                                                    Code
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(solution.code || '')
                                                        toast.success('Code copied', { style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } })
                                                    }}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                        padding: '6px 10px', borderRadius: '10px',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        background: 'rgba(255,255,255,0.03)',
                                                        color: '#d1d5db',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                        fontWeight: 800,
                                                    }}
                                                >
                                                    <Copy style={{ width: '14px', height: '14px' }} />
                                                    Copy
                                                </button>
                                            </div>
                                            <pre style={{
                                                margin: 0,
                                                padding: '12px 12px',
                                                fontSize: '12.2px',
                                                lineHeight: 1.55,
                                                color: '#e5e7eb',
                                                overflowX: 'auto',
                                                fontFamily: "'JetBrains Mono', monospace",
                                            }}>
                                                {solution.code}
                                            </pre>
                                        </div>
                                    </div>
                                )}

                                {isExpanded && (
                                    <div style={{
                                        padding: '12px 14px 14px',
                                        borderTop: '1px solid rgba(255,255,255,0.06)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px',
                                        background: 'rgba(255,255,255,0.01)',
                                    }}>
                                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 800 }}>
                                            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                                        </span>

                                        {comments.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {comments.slice(-8).map((comment) => (
                                                    <div key={comment.id} style={{
                                                        display: 'flex',
                                                        alignItems: 'flex-start',
                                                        gap: '10px',
                                                        padding: '10px 10px',
                                                        borderRadius: '14px',
                                                        border: '1px solid rgba(255,255,255,0.06)',
                                                        background: 'rgba(10,14,20,0.55)',
                                                    }}>
                                                        <div style={{
                                                            width: '28px', height: '28px', borderRadius: '10px',
                                                            background: comment.author?.avatar ? 'transparent' : 'linear-gradient(135deg, rgba(244,114,182,0.28), rgba(96,165,250,0.20))',
                                                            border: '1px solid rgba(255,255,255,0.10)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            overflow: 'hidden',
                                                            flexShrink: 0,
                                                        }}>
                                                            {comment.author?.avatar ? (
                                                                <img src={comment.author.avatar} alt={comment.author.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <span style={{ fontSize: '12px', fontWeight: 900, color: '#0b0f19' }}>
                                                                    {(comment.author?.displayName || comment.author?.username || 'A')[0]?.toUpperCase()}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                                <span style={{ fontSize: '12.5px', fontWeight: 900, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {comment.author?.displayName || comment.author?.username || 'Anonymous'}
                                                                </span>
                                                                <span style={{ fontSize: '11px', color: '#6b7280' }}>{timeAgo(comment.createdAt)}</span>
                                                            </div>
                                                            <div style={{ fontSize: '12.5px', color: '#d1d5db', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                                                {comment.text}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <input
                                                value={commentValue}
                                                onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [solution.id]: e.target.value }))}
                                                placeholder={user?.username ? 'Write a comment...' : 'Log in to comment'}
                                                disabled={!user?.username}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px 12px',
                                                    borderRadius: '12px',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    background: 'rgba(10,14,20,0.6)',
                                                    color: '#e5e7eb',
                                                    outline: 'none',
                                                    fontSize: '12.5px',
                                                    opacity: user?.username ? 1 : 0.6,
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault()
                                                        if (!user?.username) return
                                                        addComment({ solutionId: solution.id, author: { id: user.id, username: user.username, email: user.email, displayName: user.displayName, avatar: user.avatar }, text: commentValue })
                                                        setCommentDrafts((prev) => ({ ...prev, [solution.id]: '' }))
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={() => {
                                                    if (!user?.username) return
                                                    addComment({ solutionId: solution.id, author: { id: user.id, username: user.username, email: user.email, displayName: user.displayName, avatar: user.avatar }, text: commentValue })
                                                    setCommentDrafts((prev) => ({ ...prev, [solution.id]: '' }))
                                                }}
                                                disabled={!user?.username || !commentValue.trim()}
                                                style={{
                                                    padding: '10px 12px',
                                                    borderRadius: '12px',
                                                    border: '1px solid rgba(52,211,153,0.26)',
                                                    background: (!user?.username || !commentValue.trim()) ? 'rgba(255,255,255,0.03)' : 'rgba(52,211,153,0.14)',
                                                    color: (!user?.username || !commentValue.trim()) ? '#6b7280' : '#34d399',
                                                    cursor: (!user?.username || !commentValue.trim()) ? 'default' : 'pointer',
                                                    fontSize: '12.5px',
                                                    fontWeight: 900,
                                                }}
                                                title="Post comment"
                                            >
                                                Post
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {solutionPendingDelete && (
                <div
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setSolutionPendingDelete(null)
                        }
                    }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 100000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px 16px',
                        background: 'rgba(3, 7, 18, 0.72)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                    }}
                >
                    <div
                        style={{
                            width: 'min(92vw, 440px)',
                            borderRadius: '24px',
                            padding: '24px',
                            background: 'linear-gradient(180deg, rgba(21,26,35,0.98) 0%, rgba(12,16,24,0.98) 100%)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
                        }}
                    >
                        <div
                            style={{
                                width: '48px',
                                height: '48px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '16px',
                                marginBottom: '18px',
                                background: 'rgba(248,113,113,0.12)',
                                border: '1px solid rgba(248,113,113,0.16)',
                                color: '#fca5a5',
                            }}
                        >
                            <Trash2 size={20} />
                        </div>

                        <h2
                            style={{
                                fontSize: '24px',
                                fontWeight: 900,
                                color: '#f8fafc',
                                letterSpacing: '-0.04em',
                                marginBottom: '10px',
                            }}
                        >
                            Delete this solution?
                        </h2>

                        <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#94a3b8', marginBottom: '22px' }}>
                            You are about to delete <span style={{ color: '#f8fafc', fontWeight: 700 }}>"{solutionPendingDelete.title}"</span>.
                            This action cannot be undone.
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setSolutionPendingDelete(null)}
                                style={{
                                    padding: '11px 16px',
                                    borderRadius: '14px',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#cbd5e1',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                }}
                            >
                                No
                            </button>
                            <button
                                onClick={handleConfirmDeleteSolution}
                                style={{
                                    padding: '11px 16px',
                                    borderRadius: '14px',
                                    background: 'linear-gradient(135deg, rgba(248,113,113,0.18) 0%, rgba(220,38,38,0.18) 100%)',
                                    border: '1px solid rgba(248,113,113,0.22)',
                                    color: '#fecaca',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    boxShadow: '0 12px 24px rgba(127,29,29,0.16)',
                                }}
                            >
                                Yes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
