import { useState, useMemo, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search, Check, Minus, ChevronLeft, ChevronRight, ArrowUpDown, SlidersHorizontal, BarChart3, Lock, Bookmark, FolderOpen, X, EyeOff, Eye, Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar/Navbar'
import FilterPopover from '../components/Problems/FilterPopover'
import useProblemStore from '../store/problemStore'
import useAuthStore from '../store/authStore'

const diffLabels = {
    Easy: 'Easy',
    Medium: 'Med.',
    Hard: 'Hard',
}

const difficultyOrder = { Easy: 1, Medium: 2, Hard: 3 }

const sortOptions = [
    { key: 'custom', label: 'Custom', icon: 'check' },
    { key: 'difficulty', label: 'Difficulty' },
    { key: 'acceptance', label: 'Acceptance' },
    { key: 'questionId', label: 'Question ID' },
    { key: 'lastSubmitted', label: 'Last Submitted Time' },
    { key: 'tags', label: 'Tags', icon: 'eyeOff' },
]

function ProblemEditorModal({ initialProblem, defaultDomain, onClose, onSave, isSaving }) {
    const [form, setForm] = useState(() => ({
        title: initialProblem?.title || '',
        domain: initialProblem?.domain || defaultDomain || 'DSA',
        difficulty: initialProblem?.difficulty || 'Medium',
        acceptance: initialProblem?.acceptance || '0.0%',
        tags: Array.isArray(initialProblem?.tags) ? initialProblem.tags.join(', ') : '',
        description: initialProblem?.description || '',
        exampleInput: initialProblem?.examples?.[0]?.input || '',
        exampleOutput: initialProblem?.examples?.[0]?.output || '',
        constraints: Array.isArray(initialProblem?.constraints) ? initialProblem.constraints.join('\n') : '',
    }))
    const [error, setError] = useState('')

    const inputStyle = {
        width: '100%',
        padding: '11px 14px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
        color: '#e5e7eb',
        fontSize: '14px',
        outline: 'none',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
    }

    const handleSubmit = async () => {
        if (!form.title.trim()) {
            setError('Problem title is required')
            return
        }

        setError('')
        await onSave(form)
    }

    return (
        <div
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !isSaving) onClose()
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
            }}
        >
            <div style={{ width: 'min(94vw, 720px)', maxHeight: '92vh', overflowY: 'auto', borderRadius: '24px', padding: '24px', background: 'linear-gradient(180deg, rgba(21,26,35,0.98) 0%, rgba(12,16,24,0.98) 100%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.45)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '22px' }}>
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.04em', marginBottom: '6px' }}>
                            {initialProblem ? 'Edit Problem' : 'Create Problem'}
                        </h2>
                        <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
                            Configure the problem metadata that will be used across the list, solver, and contest system.
                        </p>
                    </div>
                    <button onClick={onClose} disabled={isSaving} style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isSaving ? 'default' : 'pointer' }}>
                        <X size={16} />
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.8fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Title</label>
                        <input style={inputStyle} value={form.title} onChange={(event) => setForm((state) => ({ ...state, title: event.target.value }))} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Domain</label>
                        <select style={inputStyle} value={form.domain} onChange={(event) => setForm((state) => ({ ...state, domain: event.target.value }))}>
                            <option value="DSA">Algorithms</option>
                            <option value="ML">Machine Learning</option>
                            <option value="CTF">Cyber Security</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Difficulty</label>
                        <select style={inputStyle} value={form.difficulty} onChange={(event) => setForm((state) => ({ ...state, difficulty: event.target.value }))}>
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Acceptance</label>
                        <input style={inputStyle} value={form.acceptance} onChange={(event) => setForm((state) => ({ ...state, acceptance: event.target.value }))} placeholder="0.0%" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tags</label>
                        <input style={inputStyle} value={form.tags} onChange={(event) => setForm((state) => ({ ...state, tags: event.target.value }))} placeholder="Array, Graph, DP" />
                    </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</label>
                    <textarea style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }} value={form.description} onChange={(event) => setForm((state) => ({ ...state, description: event.target.value }))} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Example Input</label>
                        <textarea style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} value={form.exampleInput} onChange={(event) => setForm((state) => ({ ...state, exampleInput: event.target.value }))} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Example Output</label>
                        <textarea style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} value={form.exampleOutput} onChange={(event) => setForm((state) => ({ ...state, exampleOutput: event.target.value }))} />
                    </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Constraints</label>
                    <textarea style={{ ...inputStyle, minHeight: '96px', resize: 'vertical' }} value={form.constraints} onChange={(event) => setForm((state) => ({ ...state, constraints: event.target.value }))} placeholder="One constraint per line" />
                </div>

                {error && <p style={{ fontSize: '13px', color: '#fca5a5', marginBottom: '14px' }}>{error}</p>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={onClose} disabled={isSaving} style={{ padding: '11px 16px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1', fontSize: '13px', fontWeight: 800, opacity: isSaving ? 0.6 : 1 }}>
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={isSaving} style={{ padding: '11px 16px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(52,211,153,0.25) 0%, rgba(5,150,105,0.24) 100%)', border: '1px solid rgba(52,211,153,0.22)', color: '#d1fae5', fontSize: '13px', fontWeight: 800, boxShadow: '0 12px 24px rgba(5,150,105,0.18)', opacity: isSaving ? 0.6 : 1 }}>
                        {isSaving ? 'Saving...' : initialProblem ? 'Save Changes' : 'Create Problem'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function ConfirmDeleteModal({ title, body, onClose, onConfirm, busy }) {
    return (
        <div
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !busy) onClose()
            }}
            style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: 'rgba(3, 7, 18, 0.72)', backdropFilter: 'blur(10px)' }}
        >
            <div style={{ width: 'min(92vw, 440px)', borderRadius: '24px', padding: '24px', background: 'linear-gradient(180deg, rgba(21,26,35,0.98) 0%, rgba(12,16,24,0.98) 100%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.45)' }}>
                <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', marginBottom: '18px', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.16)', color: '#fca5a5' }}>
                    <Trash2 size={20} />
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.04em', marginBottom: '10px' }}>{title}</h2>
                <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#94a3b8', marginBottom: '22px' }}>{body}</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={onClose} disabled={busy} style={{ padding: '11px 16px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1', fontSize: '13px', fontWeight: 800, opacity: busy ? 0.6 : 1 }}>
                        No
                    </button>
                    <button onClick={onConfirm} disabled={busy} style={{ padding: '11px 16px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(248,113,113,0.18) 0%, rgba(220,38,38,0.18) 100%)', border: '1px solid rgba(248,113,113,0.22)', color: '#fecaca', fontSize: '13px', fontWeight: 800, opacity: busy ? 0.6 : 1 }}>
                        Yes
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function Problems() {
    const problems = useProblemStore((state) => state.problems)
    const toggleBookmark = useProblemStore((state) => state.toggleBookmark)
    const createProblem = useProblemStore((state) => state.createProblem)
    const updateProblem = useProblemStore((state) => state.updateProblem)
    const deleteProblem = useProblemStore((state) => state.deleteProblem)
    const user = useAuthStore((state) => state.user)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [sortOpen, setSortOpen] = useState(false)
    const [activeSort, setActiveSort] = useState('custom')
    const [sortDirection, setSortDirection] = useState('asc') // 'asc' or 'desc'
    const [showTags, setShowTags] = useState(false)
    const [filterOpen, setFilterOpen] = useState(false)
    const [matchStrategy, setMatchStrategy] = useState('All') // 'All', 'Any'
    const [filters, setFilters] = useState([
        { id: 1, enabled: true, property: 'Status', operator: 'is', value: '' }
    ])
    const [editingProblem, setEditingProblem] = useState(null)
    const [showProblemEditor, setShowProblemEditor] = useState(false)
    const [pendingDeleteProblem, setPendingDeleteProblem] = useState(null)
    const [isSavingProblem, setIsSavingProblem] = useState(false)
    const isAdmin = Boolean(user?.isAdmin)

    const sortRef = useRef(null)
    const perPage = 15

    const location = useLocation()
    const queryParams = new URLSearchParams(location.search)
    const urlDomain = queryParams.get('domain')

    const domainProblems = useMemo(() => {
        if (!urlDomain) return problems
        return problems.filter(p => p.domain === urlDomain)
    }, [problems, urlDomain])

    const solvedCount = useMemo(() => domainProblems.filter((p) => p.status === 'solved').length, [domainProblems])
    const totalCount = domainProblems.length

    // Close sort dropdown on outside click
    useEffect(() => {
        const handler = (e) => { if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Handle sort selection - clicking the same option toggles direction
    const handleSortSelect = (key) => {
        // Tags is a visibility toggle, not a sort
        if (key === 'tags') {
            setShowTags((v) => !v)
            setSortOpen(false)
            return
        }
        if (key === activeSort) {
            setSortDirection((d) => d === 'asc' ? 'desc' : 'asc')
        } else {
            setActiveSort(key)
            setSortDirection('asc')
        }
        setSortOpen(false)
        setPage(1)
    }

    const filtered = useMemo(() => {
        let result = [...domainProblems]
        if (search) result = result.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))

        // Apply advanced filters
        const activeFilters = filters.filter(f => f.enabled && f.value)
        if (activeFilters.length > 0) {
            result = result.filter(p => {
                const matchResults = activeFilters.map(f => {
                    let isMatch = false
                    if (f.property === 'Status') {
                        // Assuming 'todo' maps to null status in mock
                        const pStatus = p.status || 'todo'
                        isMatch = pStatus === f.value
                    } else if (f.property === 'Difficulty') {
                        isMatch = p.difficulty === f.value
                    } else if (f.property === 'Topics') {
                        isMatch = p.tags?.includes(f.value)
                    } else if (f.property === 'Language') {
                        // Language is not heavily populated in mock data outside of Recent Submissions right now
                        // Just returning true as a mock implementation.
                        isMatch = true
                    }
                    return f.operator === 'is' ? isMatch : !isMatch
                })

                if (matchStrategy === 'All') {
                    return matchResults.every(Boolean)
                } else {
                    return matchResults.some(Boolean)
                }
            })
        }

        const dir = sortDirection === 'asc' ? 1 : -1

        if (activeSort === 'difficulty') {

            result.sort((a, b) => (difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]) * dir)
        } else if (activeSort === 'acceptance') {
            result.sort((a, b) => (parseFloat(a.acceptance) - parseFloat(b.acceptance)) * dir)
        } else if (activeSort === 'questionId') {
            result.sort((a, b) => (a.id - b.id) * dir)
        } else if (activeSort === 'lastSubmitted') {
            result.sort((a, b) => {
                if (!a.lastSubmitted && !b.lastSubmitted) return 0
                if (!a.lastSubmitted) return 1
                if (!b.lastSubmitted) return -1
                return (new Date(b.lastSubmitted) - new Date(a.lastSubmitted)) * dir
            })
        }

        return result
    }, [domainProblems, search, activeSort, sortDirection, filters, matchStrategy])

    const totalPages = Math.ceil(filtered.length / perPage)
    const paginated = filtered.slice((page - 1) * perPage, page * perPage)

    const handleToggleBookmark = async (event, problemId) => {
        event.preventDefault()
        event.stopPropagation()

        const problem = problems.find((item) => item.id === problemId)
        if (!problem) return

        const nextProblem = await toggleBookmark(problemId, user?.username)
        const isStarred = Boolean(nextProblem?.starred ?? !problem.starred)

        toast.success(isStarred ? 'Added to bookmarks' : 'Removed from bookmarks', {
            icon: isStarred ? '🔖' : '🗑️',
            style: {
                background: 'rgba(30,36,44,0.95)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
            },
        })
    }

    const openCreateProblem = () => {
        setEditingProblem(null)
        setShowProblemEditor(true)
    }

    const openEditProblem = (event, problem) => {
        event.preventDefault()
        event.stopPropagation()
        setEditingProblem(problem)
        setShowProblemEditor(true)
    }

    const handleSaveProblem = async (form) => {
        setIsSavingProblem(true)
        try {
            if (editingProblem) {
                await updateProblem(editingProblem.id, form)
                toast.success('Problem updated', {
                    style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
                })
            } else {
                await createProblem(form)
                toast.success('Problem created', {
                    style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
                })
            }
            setShowProblemEditor(false)
            setEditingProblem(null)
        } catch (error) {
            toast.error(error?.response?.data?.detail || 'Unable to save problem', {
                style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
            })
        } finally {
            setIsSavingProblem(false)
        }
    }

    const handleDeleteProblem = async () => {
        if (!pendingDeleteProblem) return
        setIsSavingProblem(true)
        try {
            await deleteProblem(pendingDeleteProblem.id)
            toast.success('Problem deleted', {
                style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
            })
            setPendingDeleteProblem(null)
        } catch (error) {
            toast.error(error?.response?.data?.detail || 'Unable to delete problem', {
                style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
            })
        } finally {
            setIsSavingProblem(false)
        }
    }

    return (
        <div className="min-h-screen" style={{
            background: 'linear-gradient(135deg, #0b0f19 0%, #161b22 100%)',
            color: '#e5e7eb',
            fontFamily: '"Inter", "Roboto", sans-serif'
        }}>
            <Navbar />
            {showProblemEditor && (
                <ProblemEditorModal
                    initialProblem={editingProblem}
                    defaultDomain={urlDomain || 'DSA'}
                    onClose={() => {
                        if (isSavingProblem) return
                        setShowProblemEditor(false)
                        setEditingProblem(null)
                    }}
                    onSave={handleSaveProblem}
                    isSaving={isSavingProblem}
                />
            )}
            {pendingDeleteProblem && (
                <ConfirmDeleteModal
                    title="Delete this problem?"
                    body={`You are about to remove "${pendingDeleteProblem.title}" from the problem system. This action cannot be undone.`}
                    onClose={() => {
                        if (isSavingProblem) return
                        setPendingDeleteProblem(null)
                    }}
                    onConfirm={handleDeleteProblem}
                    busy={isSavingProblem}
                />
            )}

            {/* Main content */}
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 32px 48px' }}>
                {/* Search & Filter Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Search */}
                        <div style={{ position: 'relative' }}>
                            <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#6b7280' }} />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                                placeholder="Search questions"
                                style={{
                                    width: '280px',
                                    paddingLeft: '40px',
                                    paddingRight: '14px',
                                    paddingTop: '10px',
                                    paddingBottom: '10px',
                                    borderRadius: '12px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    color: '#d1d5db',
                                    fontSize: '14.5px',
                                    outline: 'none',
                                    fontFamily: 'inherit',
                                    transition: 'all 0.2s ease',
                                    backdropFilter: 'blur(10px)',
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.15)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.05)';
                                }}
                            />
                        </div>

                        {/* Sort */}
                        <div style={{ position: 'relative' }} ref={sortRef}>
                            <button
                                onClick={() => setSortOpen(!sortOpen)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: '40px', height: '40px', borderRadius: '12px',
                                    backgroundColor: sortOpen ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                                    border: `1px solid ${sortOpen ? 'rgba(255,255,255,0.1)' : 'rgba(255, 255, 255, 0.05)'}`,
                                    color: sortOpen ? '#d1d5db' : '#8d96a0', cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    backdropFilter: 'blur(10px)'
                                }}
                                onMouseEnter={(e) => { if (!sortOpen) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)' }}
                                onMouseLeave={(e) => { if (!sortOpen) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)' }}
                            >
                                <ArrowUpDown style={{ width: '16px', height: '16px' }} />
                            </button>

                            {/* Sort Dropdown */}
                            {sortOpen && (
                                <div className="animate-slide-down" style={{
                                    position: 'absolute', top: '48px', left: 0, zIndex: 60,
                                    width: '240px', borderRadius: '16px', overflow: 'hidden',
                                    background: 'linear-gradient(to bottom, rgba(30,36,44,0.95) 0%, rgba(15,20,25,0.98) 100%)',
                                    backdropFilter: 'blur(24px)',
                                    WebkitBackdropFilter: 'blur(24px)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                                }}>
                                    {sortOptions.map((opt, idx) => {
                                        const isLocked = opt.icon === 'lock'
                                        const isActive = activeSort === opt.key
                                        const isLast = opt.key === 'tags'

                                        return (
                                            <button
                                                key={opt.key}
                                                onClick={() => { if (!isLocked) handleSortSelect(opt.key) }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    width: '100%', padding: '12px 18px',
                                                    backgroundColor: 'transparent', border: 'none', cursor: isLocked ? 'default' : 'pointer',
                                                    borderTop: isLast ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                                    borderBottom: idx === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                                    transition: 'all 0.15s',
                                                }}
                                                onMouseEnter={(e) => { if (!isLocked) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)' }}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <span style={{
                                                    fontSize: '14px', fontWeight: isActive ? 500 : 400,
                                                    color: isLocked ? '#6b7280' : (isActive ? '#fff' : '#d1d5db'),
                                                }}>
                                                    {opt.label}
                                                </span>
                                                {isActive && <Check style={{ width: '16px', height: '16px', color: '#34d399' }} />}
                                                {opt.icon === 'lock' && <Lock style={{ width: '16px', height: '16px', color: '#fbbf24' }} />}
                                                {opt.icon === 'eyeOff' && (showTags
                                                    ? <Eye style={{ width: '16px', height: '16px', color: '#d1d5db' }} />
                                                    : <EyeOff style={{ width: '16px', height: '16px', color: '#8d96a0' }} />
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Filter */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setFilterOpen(!filterOpen)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: '40px', height: '40px', borderRadius: '12px',
                                    backgroundColor: filterOpen ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                                    border: `1px solid ${filterOpen ? 'rgba(255,255,255,0.1)' : 'rgba(255, 255, 255, 0.05)'}`,
                                    color: filterOpen ? '#d1d5db' : '#8d96a0', cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    backdropFilter: 'blur(10px)'
                                }}
                                onMouseEnter={(e) => { if (!filterOpen) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)' }}
                                onMouseLeave={(e) => { if (!filterOpen) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)' }}
                            >
                                <SlidersHorizontal style={{ width: '16px', height: '16px' }} />
                            </button>

                            {/* Filter Popover Component */}
                            {filterOpen && (
                                <FilterPopover
                                    filters={filters}
                                    setFilters={setFilters}
                                    matchStrategy={matchStrategy}
                                    setMatchStrategy={setMatchStrategy}
                                    onClose={() => setFilterOpen(false)}
                                />
                            )}
                        </div>
                    </div>

                    {/* Solved Counter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            background: 'rgba(255,255,255,0.02)', padding: '6px 14px',
                            borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            {/* Progress Ring */}
                            <svg width="20" height="20" viewBox="0 0 22 22" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="11" cy="11" r="9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                                <circle
                                    cx="11" cy="11" r="9" fill="none" stroke="#34d399" strokeWidth="2.5"
                                    strokeDasharray={`${(solvedCount / totalCount) * 56.55} 56.55`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span style={{ fontSize: '13.5px', color: '#9ca3af', fontWeight: 500 }}>
                                <span style={{ color: '#fff', fontWeight: 600 }}>{solvedCount}</span> <span className="mx-0.5">/</span> {totalCount} Solved
                            </span>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={openCreateProblem}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 14px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(52,211,153,0.22)',
                                    background: 'rgba(52,211,153,0.10)',
                                    color: '#6ee7b7',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                <Plus size={15} />
                                Add Problem
                            </button>
                        )}
                    </div>
                </div>

                {/* Problem Rows Container */}
                <div style={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: 'rgba(20, 24, 32, 0.4)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(20px)'
                }}>
                    {paginated.map((p, i) => (
                        <Link
                            key={p.id}
                            to={urlDomain ? `/problems/${p.id}?domain=${encodeURIComponent(urlDomain)}` : `/problems/${p.id}`}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '16px 24px',
                                backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                                borderBottom: i !== paginated.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                textDecoration: 'none',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            {/* Status Icon */}
                            <div style={{ width: '36px', flexShrink: 0, display: 'flex' }}>
                                {p.status === 'solved' && <Check style={{ width: '18px', height: '18px', color: '#34d399' }} />}
                                {p.status === 'attempted' && <Minus style={{ width: '18px', height: '18px', color: '#fbbf24' }} />}
                                {p.status === 'pinned' && <FolderOpen style={{ width: '18px', height: '18px', color: '#60a5fa' }} />}
                            </div>

                            {/* Number + Title + Tags */}
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '15px', color: '#e5e7eb', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {p.id}. {p.title}
                                </span>
                                {showTags && p.tags && p.tags.length > 0 && (
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {p.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                style={{
                                                    fontSize: '11px',
                                                    fontWeight: 500,
                                                    color: '#9ca3af',
                                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                }}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Acceptance */}
                            <div style={{ width: '80px', textAlign: 'right', flexShrink: 0 }}>
                                <span style={{ fontSize: '14px', color: '#9ca3af', fontWeight: 500 }}>{p.acceptance}</span>
                            </div>

                            {/* Difficulty */}
                            <div style={{ width: '70px', textAlign: 'center', flexShrink: 0, marginLeft: '24px' }}>
                                <span style={{
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    letterSpacing: '0.02em',
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    color: p.difficulty === 'Easy' ? '#34d399' : p.difficulty === 'Medium' ? '#fbbf24' : '#f87171',
                                    backgroundColor: p.difficulty === 'Easy' ? 'rgba(52, 211, 153, 0.1)' : p.difficulty === 'Medium' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                                }}>
                                    {diffLabels[p.difficulty]}
                                </span>
                            </div>

                            {/* Action Icons */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: '32px', flexShrink: 0 }}>
                                <div style={{ cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <BarChart3 style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                                </div>
                                <div style={{ cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <Lock style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                                </div>
                                <div
                                    role="button"
                                    aria-label={p.starred ? `Remove ${p.title} from bookmarks` : `Add ${p.title} to bookmarks`}
                                    title={p.starred ? 'Remove bookmark' : 'Add to bookmarks'}
                                    style={{ cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'all 0.2s' }}
                                    onClick={(event) => handleToggleBookmark(event, p.id)}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(52, 211, 153, 0.12)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <Bookmark style={{
                                        width: '16px', height: '16px',
                                        color: p.starred ? '#34d399' : '#6b7280',
                                        fill: p.starred ? 'rgba(52, 211, 153, 0.18)' : 'none',
                                    }} />
                                </div>
                                {isAdmin && (
                                    <>
                                        <button
                                            onClick={(event) => openEditProblem(event, p)}
                                            title="Edit problem"
                                            style={{ cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'all 0.2s', background: 'transparent', border: 'none' }}
                                            onMouseEnter={(event) => { event.currentTarget.style.backgroundColor = 'rgba(96,165,250,0.12)' }}
                                            onMouseLeave={(event) => { event.currentTarget.style.backgroundColor = 'transparent' }}
                                        >
                                            <Pencil style={{ width: '16px', height: '16px', color: '#60a5fa' }} />
                                        </button>
                                        <button
                                            onClick={(event) => {
                                                event.preventDefault()
                                                event.stopPropagation()
                                                setPendingDeleteProblem(p)
                                            }}
                                            title="Delete problem"
                                            style={{ cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'all 0.2s', background: 'transparent', border: 'none' }}
                                            onMouseEnter={(event) => { event.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.12)' }}
                                            onMouseLeave={(event) => { event.currentTarget.style.backgroundColor = 'transparent' }}
                                        >
                                            <Trash2 style={{ width: '16px', height: '16px', color: '#f87171' }} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '32px' }}>
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            style={{
                                padding: '8px', borderRadius: '10px', color: '#8d96a0',
                                background: 'transparent', border: '1px solid rgba(255,255,255,0.05)', cursor: page === 1 ? 'default' : 'pointer',
                                opacity: page === 1 ? 0.3 : 1, transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { if (page !== 1) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                            onMouseLeave={(e) => { if (page !== 1) e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                            <ChevronLeft style={{ width: '18px', height: '18px' }} />
                        </button>
                        <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {Array.from({ length: totalPages }, (_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => setPage(i + 1)}
                                    style={{
                                        width: '36px', height: '36px', borderRadius: '8px',
                                        fontSize: '14px', fontWeight: page === i + 1 ? 600 : 500, border: 'none', cursor: 'pointer',
                                        backgroundColor: page === i + 1 ? 'rgba(255,255,255,0.1)' : 'transparent',
                                        color: page === i + 1 ? '#fff' : '#8d96a0',
                                        transition: 'all 0.2s',
                                        boxShadow: page === i + 1 ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                                    }}
                                    onMouseEnter={(e) => { if (page !== i + 1) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                                    onMouseLeave={(e) => { if (page !== i + 1) e.currentTarget.style.backgroundColor = 'transparent' }}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            style={{
                                padding: '8px', borderRadius: '10px', color: '#8d96a0',
                                background: 'transparent', border: '1px solid rgba(255,255,255,0.05)', cursor: page === totalPages ? 'default' : 'pointer',
                                opacity: page === totalPages ? 0.3 : 1, transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { if (page !== totalPages) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                            onMouseLeave={(e) => { if (page !== totalPages) e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                            <ChevronRight style={{ width: '18px', height: '18px' }} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
