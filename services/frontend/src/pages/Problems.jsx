import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Check, Minus, ChevronLeft, ChevronRight, ArrowUpDown, SlidersHorizontal, BarChart3, Lock, Star, FolderOpen, X, EyeOff, Eye } from 'lucide-react'
import Navbar from '../components/Navbar/Navbar'
import { mockProblems } from '../utils/mockData'
import FilterPopover from '../components/Problems/FilterPopover'

const diffColors = {
    Easy: 'text-[#34d399]',
    Medium: 'text-[#fbbf24]',
    Hard: 'text-[#f87171]',
}

const diffLabels = {
    Easy: 'Easy',
    Medium: 'Med.',
    Hard: 'Hard',
}

const sortOptions = [
    { key: 'custom', label: 'Custom', icon: 'check' },
    { key: 'difficulty', label: 'Difficulty' },
    { key: 'acceptance', label: 'Acceptance' },
    { key: 'questionId', label: 'Question ID' },
    { key: 'lastSubmitted', label: 'Last Submitted Time' },
    { key: 'tags', label: 'Tags', icon: 'eyeOff' },
]

export default function Problems() {
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [sortOpen, setSortOpen] = useState(false)
    const [activeSort, setActiveSort] = useState('custom')
    const [sortDirection, setSortDirection] = useState('asc') // 'asc' or 'desc'
    const [showTags, setShowTags] = useState(false)
    const [filterOpen, setFilterOpen] = useState(false)
    const [matchStrategy, setMatchStrategy] = useState('All') // 'All', 'Any'
    const [filters, setFilters] = useState([
        { id: Date.now(), enabled: true, property: 'Status', operator: 'is', value: '' }
    ])

    const sortRef = useRef(null)
    const perPage = 15

    const solvedCount = useMemo(() => mockProblems.filter((p) => p.status === 'solved').length, [])
    const totalCount = mockProblems.length

    // Close sort dropdown on outside click
    useEffect(() => {
        const handler = (e) => { if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Handle sort selection — clicking the same option toggles direction
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

    const difficultyOrder = { Easy: 1, Medium: 2, Hard: 3 }

    const filtered = useMemo(() => {
        let result = [...mockProblems]
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
    }, [search, activeSort, sortDirection, filters, matchStrategy])

    const totalPages = Math.ceil(filtered.length / perPage)
    const paginated = filtered.slice((page - 1) * perPage, page * perPage)

    return (
        <div className="min-h-screen" style={{ 
            background: 'linear-gradient(135deg, #0b0f19 0%, #161b22 100%)',
            color: '#e5e7eb',
            fontFamily: '"Inter", "Roboto", sans-serif'
        }}>
            <Navbar />

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
                                        const showDivider = idx === 0 || isLast

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
                            to={`/problems/${p.id}`}
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
                                <div style={{ cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <Star style={{
                                        width: '16px', height: '16px',
                                        color: p.starred ? '#fbbf24' : '#6b7280',
                                        fill: p.starred ? '#fbbf24' : 'none',
                                    }} />
                                </div>
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
