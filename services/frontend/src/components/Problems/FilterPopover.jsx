import { useState, useRef, useEffect } from 'react'
import { CheckSquare, Square, ChevronDown, Plus, Minus } from 'lucide-react'
import toast from 'react-hot-toast'

// Options for different properties
const filterOptions = {
    Status: ['solved', 'attempted', 'todo'],
    Difficulty: ['Easy', 'Medium', 'Hard'],
    Topics: [
        'Array', 'String', 'Hash Table', 'Dynamic Programming', 'Math', 'Sorting',
        'Greedy', 'Graph', 'Tree', 'BFS', 'DFS', 'Binary Search', 'Linked List',
        'Neural Networks', 'NLP', 'Computer Vision', 'Regression', 'Classification',
        'Packet Analysis', 'Binary Exploit', 'Web Security', 'Cryptography', 'SQL'
    ],
    Language: ['C++', 'Java', 'Python', 'JavaScript', 'Go']
}

const properties = Object.keys(filterOptions)

// A custom Select component to match the dark theme exact styling
const CustomSelect = ({ value, onChange, options, style, disabled = false, placeholder = '' }) => {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div ref={ref} style={{ position: 'relative', width: '100%', ...style }}>
            <div
                onClick={() => !disabled && setOpen(!open)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: '10px',
                    backgroundColor: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    color: disabled ? '#6b7280' : (value ? '#d1d5db' : '#8d96a0'),
                    cursor: disabled ? 'default' : 'pointer',
                    fontSize: '14px',
                    height: '36px',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)' }}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {value || placeholder}
                </span>
                <ChevronDown style={{ width: '16px', height: '16px', color: '#6b7280', flexShrink: 0 }} />
            </div>

            {open && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60,
                    marginTop: '6px', padding: '6px', borderRadius: '12px',
                    background: 'linear-gradient(to bottom, rgba(30,36,44,0.95) 0%, rgba(15,20,25,0.98) 100%)',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.8)',
                    maxHeight: '200px', overflowY: 'auto'
                }}>
                    {options.map((opt) => (
                        <div
                            key={opt}
                            onClick={() => { onChange(opt); setOpen(false) }}
                            style={{
                                padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                                color: value === opt ? '#fff' : '#d1d5db', fontSize: '14px',
                                backgroundColor: value === opt ? 'rgba(255,255,255,0.08)' : 'transparent',
                                transition: 'all 0.2s',
                                fontWeight: value === opt ? 500 : 400
                            }}
                            onMouseEnter={(e) => { if (value !== opt) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)' }}
                            onMouseLeave={(e) => { if (value !== opt) e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function FilterPopover({ filters, setFilters, matchStrategy, setMatchStrategy, onClose }) {
    const popoverRef = useRef(null)

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                onClose()
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [onClose])

    const addFilter = () => {
        setFilters([...filters, {
            id: Date.now(),
            enabled: true,
            property: properties[0],
            operator: 'is',
            value: ''
        }])
    }

    const removeFilter = (id) => {
        if (filters.length <= 1) return // Keep at least one
        setFilters(filters.filter(f => f.id !== id))
    }

    const updateFilter = (id, field, val) => {
        setFilters(filters.map(f => {
            if (f.id === id) {
                const updated = { ...f, [field]: val }
                // Reset value if property changes
                if (field === 'property') {
                    updated.value = ''
                }
                return updated
            }
            return f
        }))
    }

    const toggleFilterEnabled = (id) => {
        setFilters(filters.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f))
    }

    const resetFilters = () => {
        setFilters([{ id: Date.now(), enabled: true, property: 'Status', operator: 'is', value: '' }])
        setMatchStrategy('All')
    }

    const handleSaveSmartList = () => {
        const listName = window.prompt("Enter a name for your Smart List:")
        if (!listName || listName.trim() === '') return // User cancelled or entered empty string

        try {
            let saved = JSON.parse(localStorage.getItem('smartLists') || '[]')
            if (!Array.isArray(saved)) {
                saved = []
            }
            saved.push({
                name: listName.trim(),
                filters,
                matchStrategy,
                createdAt: new Date().toISOString()
            })
            localStorage.setItem('smartLists', JSON.stringify(saved))
            toast.success(`Smart List "${listName.trim()}" saved!`, {
                style: {
                    background: '#222',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                }
            })
            onClose()
        } catch (error) {
            console.error("Failed to save Smart List:", error)
            toast.error("Failed to save Smart List")
        }
    }

    return (
        <div
            ref={popoverRef}
            className="animate-slide-down"
            style={{
                position: 'absolute', top: '48px', left: 0, zIndex: 50,
                width: '460px', borderRadius: '20px',
                background: 'linear-gradient(to bottom, rgba(30,36,44,0.85) 0%, rgba(15,20,25,0.98) 100%)',
                backdropFilter: 'blur(32px)',
                WebkitBackdropFilter: 'blur(32px)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.8)',
                padding: '24px',
                display: 'flex', flexDirection: 'column', gap: '20px'
            }}
        >
            {/* Header: Match Configuration */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14.5px', color: '#e5e7eb', fontWeight: 500 }}>
                <span>Match</span>
                <CustomSelect
                    value={matchStrategy}
                    onChange={setMatchStrategy}
                    options={['All', 'Any']}
                    style={{ width: '85px' }}
                />
                <span className="text-gray-400">of the following filters:</span>
            </div>

            {/* Filter Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filters.map((filter) => (
                    <div key={filter.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Checkbox */}
                        <div
                            onClick={() => toggleFilterEnabled(filter.id)}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                        >
                            {filter.enabled ?
                                <CheckSquare style={{ width: '18px', height: '18px', color: '#34d399' }} /> :
                                <Square style={{ width: '18px', height: '18px', color: 'rgba(255,255,255,0.2)' }} />
                            }
                        </div>

                        {/* Property Dropdown */}
                        <CustomSelect
                            value={filter.property}
                            onChange={(val) => updateFilter(filter.id, 'property', val)}
                            options={properties}
                            style={{ width: '130px' }}
                            disabled={!filter.enabled}
                        />

                        {/* Operator Dropdown */}
                        <CustomSelect
                            value={filter.operator}
                            onChange={(val) => updateFilter(filter.id, 'operator', val)}
                            options={['is', 'is not']}
                            style={{ width: '85px' }}
                            disabled={!filter.enabled}
                        />

                        {/* Value Dropdown */}
                        <CustomSelect
                            value={filter.value}
                            onChange={(val) => updateFilter(filter.id, 'value', val)}
                            options={filterOptions[filter.property] || []}
                            style={{ flex: 1 }}
                            disabled={!filter.enabled}
                        />

                        {/* Remove Button */}
                        <button
                            onClick={() => removeFilter(filter.id)}
                            disabled={filters.length <= 1}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'none', border: 'none', padding: '4px', borderRadius: '6px',
                                color: filters.length <= 1 ? 'rgba(255,255,255,0.1)' : '#9ca3af',
                                cursor: filters.length <= 1 ? 'default' : 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { if (filters.length > 1) { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; } }}
                            onMouseLeave={(e) => { if (filters.length > 1) { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.backgroundColor = 'transparent'; } }}
                        >
                            <Minus style={{ width: '18px', height: '18px' }} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Add Button */}
            <div>
                <button
                    onClick={addFilter}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.05)', 
                        padding: '6px 12px', borderRadius: '8px',
                        color: '#9ca3af', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                    <Plus style={{ width: '16px', height: '16px' }} /> Add Filter
                </button>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '4px -24px' }}></div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                    onClick={handleSaveSmartList}
                    style={{
                    flex: 1, padding: '10px', borderRadius: '10px',
                    backgroundColor: 'rgba(196, 154, 255, 0.1)', color: '#d8b4fe',
                    border: '1px solid rgba(196, 154, 255, 0.2)', fontSize: '14px', fontWeight: 500,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(196, 154, 255, 0.15)' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(196, 154, 255, 0.1)' }}
                >
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1.5px solid currentColor' }}></div>
                    Save as Smart List
                </button>
                <button
                    onClick={resetFilters}
                    style={{
                        flex: 1, padding: '10px', borderRadius: '10px',
                        backgroundColor: 'rgba(255,255,255,0.03)', color: '#d1d5db',
                        border: '1px solid rgba(255,255,255,0.05)', fontSize: '14px', fontWeight: 500,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)' }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                        <path d="M3 3v5h5"></path>
                    </svg>
                    Reset
                </button>
            </div>
        </div>
    )
}
