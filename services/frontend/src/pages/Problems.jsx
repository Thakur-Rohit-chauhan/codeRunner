import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Check, Minus, ChevronLeft, ChevronRight, ArrowUpDown, SlidersHorizontal, BarChart3, Lock, Star, FolderOpen, X, EyeOff, Eye } from 'lucide-react'
import Navbar from '../components/Navbar/Navbar'
import { mockProblems } from '../utils/mockData'
import FilterPopover from '../components/Problems/FilterPopover'

const diffColors = {
    Easy: 'text-[#00b8a3]',
    Medium: 'text-[#ffa116]',
    Hard: 'text-[#ef4444]',
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
        <div className="min-h-screen" style={{ backgroundColor: '#1e1e1e' }}>
            <Navbar />

            {/* Main content */}
            <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '28px 32px 48px' }}>
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
                                    width: '240px',
                                    paddingLeft: '40px',
                                    paddingRight: '14px',
                                    paddingTop: '10px',
                                    paddingBottom: '10px',
                                    borderRadius: '8px',
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #3e3e3e',
                                    color: '#d1d5db',
                                    fontSize: '14px',
                                    outline: 'none',
                                    fontFamily: 'inherit',
                                }}
                            />
                        </div>

                        {/* Sort */}
                        <div style={{ position: 'relative' }} ref={sortRef}>
                            <button
                                onClick={() => setSortOpen(!sortOpen)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: '40px', height: '40px', borderRadius: '8px',
                                    backgroundColor: sortOpen ? '#333' : '#2a2a2a',
                                    border: `1px solid ${sortOpen ? '#555' : '#3e3e3e'}`,
                                    color: '#8d96a0', cursor: 'pointer',
                                }}
                            >
                                <ArrowUpDown style={{ width: '16px', height: '16px' }} />
                            </button>

                            {/* Sort Dropdown */}
                            {sortOpen && (
                                <div style={{
                                    position: 'absolute', top: '48px', left: 0, zIndex: 50,
                                    width: '240px', borderRadius: '12px', overflow: 'hidden',
                                    backgroundColor: '#2a2a2a', border: '1px solid #3e3e3e',
                                    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
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
                                                    borderTop: isLast ? '1px solid #3e3e3e' : 'none',
                                                    borderBottom: idx === 0 ? '1px solid #3e3e3e' : 'none',
                                                    transition: 'background-color 0.1s',
                                                }}
                                                onMouseEnter={(e) => { if (!isLocked) e.currentTarget.style.backgroundColor = '#333' }}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <span style={{
                                                    fontSize: '15px', fontWeight: isActive ? 600 : 400,
                                                    color: isLocked ? '#6b7280' : '#d1d5db',
                                                }}>
                                                    {opt.label}
                                                </span>
                                                {isActive && <Check style={{ width: '16px', height: '16px', color: '#8d96a0' }} />}
                                                {opt.icon === 'lock' && <Lock style={{ width: '16px', height: '16px', color: '#ffa116' }} />}
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
                                    width: '40px', height: '40px', borderRadius: '8px',
                                    backgroundColor: filterOpen ? '#333' : '#2a2a2a',
                                    border: `1px solid ${filterOpen ? '#555' : '#3e3e3e'}`,
                                    color: '#8d96a0', cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Progress Ring */}
                            <svg width="22" height="22" viewBox="0 0 22 22" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="11" cy="11" r="9" fill="none" stroke="#3e3e3e" strokeWidth="2.5" />
                                <circle
                                    cx="11" cy="11" r="9" fill="none" stroke="#00b8a3" strokeWidth="2.5"
                                    strokeDasharray={`${(solvedCount / totalCount) * 56.55} 56.55`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span style={{ fontSize: '14px', color: '#8d96a0' }}>
                                <span style={{ color: '#fff', fontWeight: 600 }}>{solvedCount}</span>/{totalCount} Solved
                            </span>
                        </div>
                        <button style={{ color: '#8d96a0', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
                            <X style={{ width: '16px', height: '16px' }} />
                        </button>
                    </div>
                </div>

                {/* Problem Rows */}
                <div style={{ borderRadius: '12px', overflow: 'hidden' }}>
                    {paginated.map((p, i) => (
                        <Link
                            key={p.id}
                            to={`/problems/${p.id}`}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '14px 24px',
                                backgroundColor: i % 2 === 0 ? '#282828' : '#1e1e1e',
                                textDecoration: 'none',
                                transition: 'background-color 0.15s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = i % 2 === 0 ? '#282828' : '#1e1e1e'}
                        >
                            {/* Status Icon */}
                            <div style={{ width: '36px', flexShrink: 0 }}>
                                {p.status === 'solved' && <Check style={{ width: '18px', height: '18px', color: '#2cbb5d' }} />}
                                {p.status === 'attempted' && <Minus style={{ width: '18px', height: '18px', color: '#ffa116' }} />}
                                {p.status === 'pinned' && <FolderOpen style={{ width: '18px', height: '18px', color: '#3b82f6' }} />}
                            </div>

                            {/* Number + Title + Tags */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ fontSize: '15px', color: '#d1d5db', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {p.id}. {p.title}
                                </span>
                                {showTags && p.tags && p.tags.length > 0 && (
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                        {p.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                style={{
                                                    fontSize: '11px',
                                                    fontWeight: 500,
                                                    color: '#c4c4c4',
                                                    backgroundColor: '#333',
                                                    padding: '3px 10px',
                                                    borderRadius: '4px',
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
                                <span style={{ fontSize: '14px', color: '#8d96a0' }}>{p.acceptance}</span>
                            </div>

                            {/* Difficulty */}
                            <div style={{ width: '70px', textAlign: 'center', flexShrink: 0, marginLeft: '20px' }}>
                                <span style={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: p.difficulty === 'Easy' ? '#00b8a3' : p.difficulty === 'Medium' ? '#ffa116' : '#ef4444',
                                }}>
                                    {diffLabels[p.difficulty]}
                                </span>
                            </div>

                            {/* Action Icons */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: '20px', flexShrink: 0 }}>
                                <BarChart3 style={{ width: '16px', height: '16px', color: '#555' }} />
                                <Lock style={{ width: '16px', height: '16px', color: '#555' }} />
                                <Star style={{
                                    width: '16px', height: '16px',
                                    color: p.starred ? '#ffa116' : '#555',
                                    fill: p.starred ? '#ffa116' : 'none',
                                }} />
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '28px' }}>
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            style={{
                                padding: '8px', borderRadius: '8px', color: '#8d96a0',
                                background: 'none', border: 'none', cursor: page === 1 ? 'default' : 'pointer',
                                opacity: page === 1 ? 0.3 : 1,
                            }}
                        >
                            <ChevronLeft style={{ width: '18px', height: '18px' }} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => setPage(i + 1)}
                                style={{
                                    width: '36px', height: '36px', borderRadius: '8px',
                                    fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer',
                                    backgroundColor: page === i + 1 ? '#3e3e3e' : 'transparent',
                                    color: page === i + 1 ? '#fff' : '#8d96a0',
                                }}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            style={{
                                padding: '8px', borderRadius: '8px', color: '#8d96a0',
                                background: 'none', border: 'none', cursor: page === totalPages ? 'default' : 'pointer',
                                opacity: page === totalPages ? 0.3 : 1,
                            }}
                        >
                            <ChevronRight style={{ width: '18px', height: '18px' }} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
