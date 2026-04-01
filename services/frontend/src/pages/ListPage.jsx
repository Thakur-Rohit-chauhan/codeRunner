import React, { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar/Navbar'
import { Search, Play, Bookmark, Share2, HelpCircle, CheckCircle2, Lock, ArrowLeft, ArrowUpDown, Filter, Check, EyeOff, Plus, Minus, ChevronDown, RefreshCw } from 'lucide-react'
import { PieChart, Pie, Cell } from 'recharts'
import toast, { Toaster } from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import useProblemStore from '../store/problemStore'

// Theme constants
const COLORS = {
    bgDark: '#0f1115',
    bgCard: '#1a1d24',
    bgHover: '#252932',
    textMain: '#f3f4f6',
    textMuted: '#9ca3af',
    border: 'rgba(255,255,255,0.08)',
    easy: '#10b981',
    medium: '#fbbf24',
    hard: '#ef4444',
    brand: '#3b82f6',
}

const glassCard = {
    backgroundColor: COLORS.bgCard,
    borderRadius: '16px',
    border: `1px solid ${COLORS.border}`,
    overflow: 'hidden',
}

export default function ListPage() {
    const { listId } = useParams()
    const navigate = useNavigate()
    const user = useAuthStore((state) => state.user)
    const problems = useProblemStore((state) => state.problems)
    const toggleBookmark = useProblemStore((state) => state.toggleBookmark)
    const [searchQuery, setSearchQuery] = useState('')
    
    // Sort & Filter state
    const [sortConfig, setSortConfig] = useState({ key: 'custom', direction: 'asc' })
    const [filterMatchMode, setFilterMatchMode] = useState('All') // 'All' or 'Any'
    const [filterRules, setFilterRules] = useState([]) // Array of { id, active, field, operator, value }
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)

    // Helper for filter options
    const FILTER_FIELDS = {
        'Status': ['Solved', 'Attempted', 'Unsolved'],
        'Difficulty': ['Easy', 'Medium', 'Hard'],
        'List': ['Bookmarked', 'Not Bookmarked']
    }
    const FILTER_OPERATORS = ['is', 'is not']

    // Decode URL param
    const currentListId = decodeURIComponent(listId || 'bookmarks')
    const isBookmarksList = currentListId === 'bookmarks'
    const listTitle = currentListId === 'bookmarks' ? 'Bookmarked Questions' : currentListId.charAt(0).toUpperCase() + currentListId.slice(1)

    // Filter problems that match the list
    const listProblems = useMemo(() => {
        if (currentListId === 'bookmarks') return problems.filter(p => p.starred)
        // Future scalable lists could filter by p.listId or similar
        return problems
    }, [currentListId, problems])

    // Compute stats
    const stats = useMemo(() => {
        let total = { all: 0, Easy: 0, Medium: 0, Hard: 0 }
        let solved = { all: 0, Easy: 0, Medium: 0, Hard: 0 }
        let attempting = 0

        listProblems.forEach(p => {
            total.all++
            if (p.difficulty === 'Easy') total.Easy++
            else if (p.difficulty === 'Medium') total.Medium++
            else if (p.difficulty === 'Hard') total.Hard++

            if (p.status === 'solved') {
                solved.all++
                if (p.difficulty === 'Easy') solved.Easy++
                else if (p.difficulty === 'Medium') solved.Medium++
                else if (p.difficulty === 'Hard') solved.Hard++
            } else if (p.status === 'attempted') {
                attempting++
            }
        })

        return { total, solved, attempting }
    }, [listProblems])

    // Searching, Filtering, and Sorting logic
    const displayProblems = useMemo(() => {
        let result = [...listProblems]

        // 1. Text Search
        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase()
            result = result.filter(p => p.title.toLowerCase().includes(lowerQ) || p.id.toString().includes(lowerQ))
        }

        // 2. Advanced Dynamic Filters
        if (filterRules.length > 0) {
            const activeRules = filterRules.filter(r => r.active && r.field && r.operator && r.value)
            
            if (activeRules.length > 0) {
                result = result.filter(p => {
                    const ruleEvals = activeRules.map(rule => {
                        let fieldVal = ''
                        if (rule.field === 'Status') {
                            fieldVal = p.status === 'solved' ? 'Solved' : p.status === 'attempted' ? 'Attempted' : 'Unsolved'
                        } else if (rule.field === 'Difficulty') {
                            fieldVal = p.difficulty
                        } else if (rule.field === 'List') {
                            fieldVal = p.starred ? 'Bookmarked' : 'Not Bookmarked'
                        }

                        if (rule.operator === 'is') return fieldVal === rule.value
                        if (rule.operator === 'is not') return fieldVal !== rule.value
                        return true
                    })

                    return filterMatchMode === 'All' ? ruleEvals.every(Boolean) : ruleEvals.some(Boolean)
                })
            }
        }

        // 3. Sort
        result.sort((a, b) => {
            if (sortConfig.key === 'custom') return 0
            
            let valA, valB
            if (sortConfig.key === 'id') {
                valA = a.id
                valB = b.id
            } else if (sortConfig.key === 'acceptance') {
                valA = parseFloat(a.acceptance) || 0
                valB = parseFloat(b.acceptance) || 0
            } else if (sortConfig.key === 'difficulty') {
                const diffMap = { Easy: 1, Medium: 2, Hard: 3 }
                valA = diffMap[a.difficulty] || 0
                valB = diffMap[b.difficulty] || 0
            } else if (sortConfig.key === 'lastSubmitted') {
                valA = a.lastSubmitted ? new Date(a.lastSubmitted).getTime() : 0
                valB = b.lastSubmitted ? new Date(b.lastSubmitted).getTime() : 0
            }

            if (valA !== undefined && valB !== undefined) {
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
            }
            return 0
        })

        return result
    }, [listProblems, searchQuery, filterRules, filterMatchMode, sortConfig])

    // Recharts data for the Donut
    const chartData = [
        { name: 'Solved', value: stats.solved.all, color: '#22c55e' }, // vibrant green
        { name: 'Unsolved', value: stats.total.all - stats.solved.all, color: '#2d333b' }
    ]

    const handlePractice = () => {
        // Find the first unsolved problem, or just the first problem
        const firstUnsolved = listProblems.find(p => p.status !== 'solved')
        if (firstUnsolved) {
            navigate(`/problems/${firstUnsolved.id}?list=${encodeURIComponent(currentListId)}`)
        } else if (listProblems.length > 0) {
            navigate(`/problems/${listProblems[0].id}?list=${encodeURIComponent(currentListId)}`)
        } else {
            navigate('/problems')
        }
    }

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href)
        toast.success('Link copied to clipboard!')
    }

    // Helper functions for Query Builder
    const addRule = () => {
        if (filterRules.length >= 6) {
            toast.error('Maximum of 6 filter rules allowed')
            return
        }
        const newId = filterRules.length > 0 ? Math.max(...filterRules.map(r => r.id)) + 1 : 1
        setFilterRules([...filterRules, { id: newId, active: true, field: 'Status', operator: 'is', value: 'Solved' }])
    }
    const updateRule = (id, updates) => setFilterRules(filterRules.map(r => r.id === id ? { ...r, ...updates } : r))
    const removeRule = id => setFilterRules(filterRules.filter(r => r.id !== id))
    const resetRules = () => setFilterRules([])

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: COLORS.bgDark,
            color: COLORS.textMain,
            fontFamily: '"Inter", -apple-system, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
        }}>
            <Toaster position="bottom-right" toastOptions={{ style: { background: '#252932', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
            <Navbar />

            {/* Invisible overlay to close dropdowns when clicking outside */}
            {(isSortMenuOpen || isFilterMenuOpen) && (
                <div 
                    style={{ position: 'fixed', inset: 0, zIndex: 40 }} 
                    onClick={() => { setIsSortMenuOpen(false); setIsFilterMenuOpen(false); }} 
                />
            )}

            <div style={{
                flex: 1,
                maxWidth: '1280px',
                margin: '0 auto',
                width: '100%',
                padding: '30px 24px',
                display: 'grid',
                gridTemplateColumns: '320px 1fr',
                gap: '24px',
                alignItems: 'start'
            }}>
                {/* Left Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Header Card */}
                    <div style={{ ...glassCard, padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', cursor: 'pointer', color: COLORS.textMuted, fontSize: '14px', width: 'fit-content' }} onClick={() => navigate(user?.username ? `/profile/${user.username}` : '/profile')} onMouseEnter={e => e.currentTarget.style.color = COLORS.textMain} onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}>
                            <ArrowLeft style={{ width: '16px', height: '16px' }} />
                            <span>Back to Profile</span>
                        </div>
                        
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '14px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '20px', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)'
                        }}>
                            <span style={{ fontSize: '28px', color: '#fff', fontWeight: 800 }}>{listTitle.charAt(0)}</span>
                        </div>

                        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0', color: '#fff' }}>{listTitle}</h1>
                        <p style={{ fontSize: '13.5px', color: COLORS.textMuted, margin: '0 0 24px 0' }}>
                            CodeRunner • {stats.total.all} questions
                        </p>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <button onClick={handlePractice} style={{
                                flex: 1, padding: '10px 16px', borderRadius: '24px',
                                backgroundColor: '#fff', color: '#000', border: 'none',
                                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                transition: 'all 0.2s'
                            }} onMouseEnter={e => e.currentTarget.style.opacity = 0.9} onMouseLeave={e => e.currentTarget.style.opacity = 1}>
                                <Play style={{ width: '16px', height: '16px', fill: 'currentColor' }} />
                                Practice
                            </button>

                            <button onClick={() => navigate('/list/bookmarks')} style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                backgroundColor: COLORS.bgHover, border: `1px solid ${COLORS.border}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: isBookmarksList ? '#34d399' : COLORS.textMain, transition: 'all 0.2s'
                            }}>
                                <Bookmark style={{ width: '18px', height: '18px', fill: isBookmarksList ? 'rgba(52, 211, 153, 0.18)' : 'none' }} />
                            </button>

                            <button onClick={handleShare} style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                backgroundColor: COLORS.bgHover, border: `1px solid ${COLORS.border}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: COLORS.textMain, transition: 'all 0.2s'
                            }}>
                                <Share2 style={{ width: '18px', height: '18px' }} />
                            </button>
                        </div>
                    </div>

                    {/* Progress Card */}
                    <div style={{ ...glassCard, padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Progress</h3>
                        </div>

                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                            {/* Donut Chart */}
                            <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                                <PieChart width={120} height={120}>
                                    <Pie
                                        data={chartData}
                                        cx="50%" cy="50%"
                                        innerRadius={45} outerRadius={55}
                                        startAngle={90} endAngle={-270}
                                        dataKey="value" stroke="none"
                                        isAnimationActive={true}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>{stats.solved.all}</span>
                                    <span style={{ fontSize: '11px', color: COLORS.textMuted }}>/{stats.total.all}</span>
                                </div>
                            </div>

                            {/* Difficulty Breakdown */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[
                                    { label: 'Easy', solved: stats.solved.Easy, total: stats.total.Easy, color: COLORS.easy },
                                    { label: 'Med.', solved: stats.solved.Medium, total: stats.total.Medium, color: COLORS.medium },
                                    { label: 'Hard', solved: stats.solved.Hard, total: stats.total.Hard, color: COLORS.hard }
                                ].map(diff => (
                                    <div key={diff.label} style={{
                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                        padding: '8px 12px', borderRadius: '8px',
                                        display: 'flex', flexDirection: 'column', gap: '4px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                            <span style={{ color: diff.color, fontWeight: 500 }}>{diff.label}</span>
                                            <span style={{ color: COLORS.textMuted }}>{diff.solved}/{diff.total}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {stats.attempting > 0 && (
                            <div style={{ marginTop: '16px', fontSize: '13px', color: COLORS.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                                {stats.attempting} Attempting
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Main Area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Toolbar */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{
                            flex: 1, height: '40px', backgroundColor: COLORS.bgCard,
                            border: `1px solid ${COLORS.border}`, borderRadius: '20px',
                            display: 'flex', alignItems: 'center', padding: '0 16px', gap: '10px'
                        }}>
                            <Search style={{ width: '16px', height: '16px', color: COLORS.textMuted }} />
                            <input 
                                type="text"
                                placeholder="Search questions"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{
                                    flex: 1, background: 'transparent', border: 'none', color: '#fff',
                                    outline: 'none', fontSize: '14px'
                                }}
                            />
                        </div>
                        
                        {/* Sort Dropdown */}
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => { setIsSortMenuOpen(!isSortMenuOpen); setIsFilterMenuOpen(false); }} style={{
                                width: '40px', height: '40px', borderRadius: '20px',
                                backgroundColor: isSortMenuOpen ? COLORS.bgHover : COLORS.bgCard, border: `1px solid ${COLORS.border}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: isSortMenuOpen ? '#3b82f6' : COLORS.textMuted,
                                position: 'relative', zIndex: 50, transition: 'all 0.2s'
                            }}>
                                <ArrowUpDown style={{ width: '16px', height: '16px' }} />
                                {(sortConfig.key !== 'custom') && (
                                    <span style={{ position: 'absolute', top: '0', right: '0', width: '8px', height: '8px', backgroundColor: '#3b82f6', borderRadius: '50%' }} />
                                )}
                            </button>
                            {isSortMenuOpen && (
                                <div style={{
                                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                                    width: '240px', backgroundColor: '#1a1d24', border: `1px solid ${COLORS.border}`,
                                    borderRadius: '12px', zIndex: 100, padding: '6px 0',
                                    boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                                    display: 'flex', flexDirection: 'column', overflow: 'hidden'
                                }}>
                                    {[
                                        { label: 'Custom', key: 'custom' },
                                        { label: 'Difficulty', key: 'difficulty' },
                                        { label: 'Acceptance', key: 'acceptance' },
                                        { label: 'Question ID', key: 'id' },
                                        { label: 'Last Submitted Time', key: 'lastSubmitted' },
                                    ].map((opt, idx) => {
                                        const isActive = sortConfig.key === opt.key
                                        return (
                                            <React.Fragment key={opt.key}>
                                                <button onClick={() => { 
                                                    if (isActive && opt.key !== 'custom') {
                                                        setSortConfig({ key: opt.key, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })
                                                    } else {
                                                        setSortConfig({ key: opt.key, direction: opt.key === 'acceptance' ? 'desc' : 'asc' })
                                                    }
                                                }} style={{
                                                    padding: '8px 16px', background: 'transparent', border: 'none', 
                                                    cursor: 'pointer', width: '100%',
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    transition: 'all 0.15s'
                                                }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                    <span style={{ fontWeight: isActive ? 600 : 400, color: isActive && opt.key !== 'custom' ? '#3b82f6' : COLORS.textMain, fontSize: '13px' }}>{opt.label}</span>
                                                    <div style={{ width: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                                        {opt.key === 'custom' && isActive && <Check style={{ width: '14px', height: '14px', color: '#10b981' }} />}
                                                        {opt.key !== 'custom' && isActive && (
                                                            <ArrowUpDown style={{ width: '14px', height: '14px', color: '#3b82f6', transform: sortConfig.direction === 'asc' ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
                                                        )}
                                                    </div>
                                                </button>
                                                {idx === 0 && <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.06)', margin: '4px 16px' }} />}
                                            </React.Fragment>
                                        )
                                    })}
                                    <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                                    <div style={{
                                        padding: '12px 16px', background: 'transparent', color: COLORS.textMuted, 
                                        fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6
                                    }}>
                                        <span>Tags</span>
                                        <EyeOff style={{ width: '16px', height: '16px' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Filter Dropdown */}
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => { setIsFilterMenuOpen(!isFilterMenuOpen); setIsSortMenuOpen(false); }} style={{
                                width: '40px', height: '40px', borderRadius: '20px',
                                backgroundColor: isFilterMenuOpen ? COLORS.bgHover : COLORS.bgCard, border: `1px solid ${COLORS.border}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: filterRules.length > 0 ? '#3b82f6' : (isFilterMenuOpen ? '#fff' : COLORS.textMuted),
                                position: 'relative', zIndex: 50, transition: 'all 0.2s'
                            }}>
                                <Filter style={{ width: '16px', height: '16px' }} />
                                {filterRules.length > 0 && (
                                    <span style={{ position: 'absolute', top: '0', right: '0', width: '8px', height: '8px', backgroundColor: '#3b82f6', borderRadius: '50%' }} />
                                )}
                            </button>
                            {isFilterMenuOpen && (
                                <div style={{
                                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                                    width: '440px', backgroundColor: '#1a1d24', border: `1px solid ${COLORS.border}`,
                                    borderRadius: '16px', padding: '20px', zIndex: 100,
                                    boxShadow: '0 12px 40px rgba(0,0,0,0.8)'
                                }}>
                                    {/* Match All / Any Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: COLORS.textMuted, fontSize: '14.5px' }}>
                                        <span>Match</span>
                                        <div style={{ position: 'relative' }}>
                                            <select 
                                                value={filterMatchMode} 
                                                onChange={e => setFilterMatchMode(e.target.value)}
                                                style={{
                                                    backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                                                    color: '#fff', borderRadius: '8px', padding: '6px 28px 6px 12px',
                                                    fontSize: '14px', outline: 'none', cursor: 'pointer', appearance: 'none'
                                                }}
                                            >
                                                <option value="All">All</option>
                                                <option value="Any">Any</option>
                                            </select>
                                            <ChevronDown style={{ position: 'absolute', right: '10px', top: '10px', width: '14px', height: '14px', pointerEvents: 'none' }} />
                                        </div>
                                        <span>of the following filters:</span>
                                    </div>

                                    {/* Rules List */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                                        {filterRules.map((rule) => (
                                            <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {/* Checkbox */}
                                                <button onClick={() => updateRule(rule.id, { active: !rule.active })} style={{
                                                    width: '18px', height: '18px', borderRadius: '4px', border: rule.active ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.3)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', cursor: 'pointer', padding: 0, flexShrink: 0
                                                }}>
                                                    {rule.active && <Check style={{ width: '14px', height: '14px', color: '#10b981' }} />}
                                                </button>

                                                {/* Field Select */}
                                                <div style={{ position: 'relative', flex: 2 }}>
                                                    <select value={rule.field} onChange={e => {
                                                        const newField = e.target.value;
                                                        updateRule(rule.id, { field: newField, operator: 'is', value: FILTER_FIELDS[newField][0] })
                                                    }} style={{
                                                        width: '100%', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                                        color: '#fff', borderRadius: '8px', padding: '8px 24px 8px 12px', fontSize: '14px', appearance: 'none', outline: 'none', cursor: 'pointer'
                                                    }}>
                                                        {Object.keys(FILTER_FIELDS).map(f => <option key={f} value={f}>{f}</option>)}
                                                    </select>
                                                    <ChevronDown style={{ position: 'absolute', right: '10px', top: '10px', width: '14px', height: '14px', color: COLORS.textMuted, pointerEvents: 'none' }} />
                                                </div>

                                                {/* Operator Select */}
                                                <div style={{ position: 'relative', flex: 1.5 }}>
                                                    <select value={rule.operator} onChange={e => updateRule(rule.id, { operator: e.target.value })} style={{
                                                        width: '100%', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                                        color: '#fff', borderRadius: '8px', padding: '8px 24px 8px 12px', fontSize: '14px', appearance: 'none', outline: 'none', cursor: 'pointer'
                                                    }}>
                                                        {FILTER_OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                                                    </select>
                                                    <ChevronDown style={{ position: 'absolute', right: '10px', top: '10px', width: '14px', height: '14px', color: COLORS.textMuted, pointerEvents: 'none' }} />
                                                </div>

                                                {/* Value Select */}
                                                <div style={{ position: 'relative', flex: 2 }}>
                                                    <select value={rule.value} onChange={e => updateRule(rule.id, { value: e.target.value })} style={{
                                                        width: '100%', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                                        color: '#fff', borderRadius: '8px', padding: '8px 24px 8px 12px', fontSize: '14px', appearance: 'none', outline: 'none', cursor: 'pointer'
                                                    }}>
                                                        {FILTER_FIELDS[rule.field]?.map(val => <option key={val} value={val}>{val}</option>)}
                                                    </select>
                                                    <ChevronDown style={{ position: 'absolute', right: '10px', top: '10px', width: '14px', height: '14px', color: COLORS.textMuted, pointerEvents: 'none' }} />
                                                </div>

                                                {/* Remove Button */}
                                                <button onClick={() => removeRule(rule.id)} style={{
                                                    background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: COLORS.textMuted, flexShrink: 0
                                                }} onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}>
                                                    <Minus style={{ width: '18px', height: '18px' }} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Filter Button */}
                                    <button onClick={addRule} style={{
                                        display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: '8px', padding: '8px 14px', color: COLORS.textMuted, fontSize: '13.5px', cursor: 'pointer', transition: 'all 0.2s', width: 'fit-content'
                                    }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = COLORS.textMuted }}>
                                        <Plus style={{ width: '16px', height: '16px' }} />
                                        Add Filter
                                    </button>

                                    <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.08)', margin: '20px 0' }} />

                                    {/* Footer Actions */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <button onClick={() => toast.success('Smart List saved locally!')} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            backgroundColor: 'transparent', border: '1px solid #6366f1', color: '#818cf8',
                                            borderRadius: '8px', padding: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'background-color 0.2s'
                                        }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.1)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #818cf8' }} />
                                            Save as Smart List
                                        </button>

                                        <button onClick={resetRules} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                                            borderRadius: '8px', padding: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'background-color 0.2s'
                                        }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                            <RefreshCw style={{ width: '16px', height: '16px' }} />
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Problem List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {displayProblems.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: COLORS.textMuted, fontSize: '14px' }}>
                                No problems found.
                            </div>
                        ) : (
                            displayProblems.map((p, index) => (
                                <div key={p.id} 
                                    onClick={() => navigate(`/problems/${p.id}?list=${encodeURIComponent(currentListId)}`)}
                                    style={{
                                    ...glassCard,
                                    padding: '16px 20px',
                                    display: 'grid',
                                    gridTemplateColumns: '24px 1fr 80px 60px 60px',
                                    alignItems: 'center',
                                    gap: '16px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px'
                                }} onMouseEnter={e => e.currentTarget.style.backgroundColor = COLORS.bgHover} onMouseLeave={e => e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'}>
                                    
                                    {/* Status Icon */}
                                    <div>
                                        {p.status === 'solved' ? (
                                            <CheckCircle2 style={{ width: '18px', height: '18px', color: '#10b981' }} />
                                        ) : p.status === 'attempted' ? (
                                            <HelpCircle style={{ width: '18px', height: '18px', color: '#f59e0b' }} />
                                        ) : (
                                            <div style={{ width: '18px', height: '18px' }} />
                                        )}
                                    </div>

                                    {/* Title */}
                                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {p.id}. {p.title}
                                    </div>

                                    {/* Acceptance */}
                                    <div style={{ fontSize: '13px', color: COLORS.textMuted, textAlign: 'right' }}>
                                        {p.acceptance}
                                    </div>

                                    {/* Difficulty */}
                                    <div style={{ 
                                        fontSize: '13px', textAlign: 'center', fontWeight: 500,
                                        color: p.difficulty === 'Easy' ? COLORS.easy : p.difficulty === 'Medium' ? COLORS.medium : COLORS.hard
                                    }}>
                                        {p.difficulty === 'Medium' ? 'Med.' : p.difficulty}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center', color: COLORS.textMuted }}>
                                        {index % 3 === 0 && <Lock style={{ width: '14px', height: '14px', fill: 'currentColor' }} />}
                                        <button 
                                            onClick={async (e) => {
                                                e.stopPropagation()
                                                await toggleBookmark(p.id, user?.username)
                                            }} 
                                            style={{ 
                                                background: 'none', border: 'none', cursor: 'pointer', padding: 0, 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: p.starred ? '#34d399' : COLORS.textMuted 
                                            }}
                                            aria-label={p.starred ? `Remove ${p.title} from bookmarks` : `Add ${p.title} to bookmarks`}
                                            title={p.starred ? 'Remove bookmark' : 'Add to bookmarks'}
                                        >
                                            <Bookmark style={{ width: '16px', height: '16px', fill: p.starred ? 'rgba(52, 211, 153, 0.18)' : 'none', transition: 'all 0.2s' }} />
                                        </button>
                                    </div>

                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
