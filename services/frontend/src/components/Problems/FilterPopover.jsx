import { useState, useRef, useEffect } from 'react'
import { CheckSquare, Square, ChevronDown, Plus, Minus, X } from 'lucide-react'

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
                    padding: '8px 12px', borderRadius: '8px',
                    backgroundColor: disabled ? '#2a2a2a' : 'transparent',
                    border: '1px solid #3e3e3e',
                    color: disabled ? '#6b7280' : (value ? '#d1d5db' : '#8d96a0'),
                    cursor: disabled ? 'default' : 'pointer',
                    fontSize: '14px',
                    height: '36px',
                    boxSizing: 'border-box'
                }}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {value || placeholder}
                </span>
                <ChevronDown style={{ width: '16px', height: '16px', color: '#6b7280', flexShrink: 0 }} />
            </div>

            {open && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60,
                    marginTop: '4px', padding: '4px', borderRadius: '8px',
                    backgroundColor: '#2a2a2a', border: '1px solid #3e3e3e',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    maxHeight: '200px', overflowY: 'auto'
                }}>
                    {options.map((opt) => (
                        <div
                            key={opt}
                            onClick={() => { onChange(opt); setOpen(false) }}
                            style={{
                                padding: '8px 12px', borderRadius: '4px', cursor: 'pointer',
                                color: '#d1d5db', fontSize: '14px',
                                backgroundColor: value === opt ? '#3e3e3e' : 'transparent',
                            }}
                            onMouseEnter={(e) => { if (value !== opt) e.currentTarget.style.backgroundColor = '#333' }}
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

    return (
        <div
            ref={popoverRef}
            style={{
                position: 'absolute', top: '48px', right: 0, zIndex: 50,
                width: '450px', borderRadius: '12px',
                backgroundColor: '#2a2a2a', border: '1px solid #3e3e3e',
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                padding: '20px',
                display: 'flex', flexDirection: 'column', gap: '20px'
            }}
        >
            {/* Header: Match Configuration */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: '#fff', fontWeight: 500 }}>
                <span>Match</span>
                <CustomSelect
                    value={matchStrategy}
                    onChange={setMatchStrategy}
                    options={['All', 'Any']}
                    style={{ width: '80px' }}
                />
                <span>of the following filters:</span>
            </div>

            {/* Filter Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filters.map((filter, index) => (
                    <div key={filter.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Checkbox */}
                        <div
                            onClick={() => toggleFilterEnabled(filter.id)}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                            {filter.enabled ?
                                <CheckSquare style={{ width: '18px', height: '18px', color: '#8d96a0' }} /> :
                                <Square style={{ width: '18px', height: '18px', color: '#6b7280' }} />
                            }
                        </div>

                        {/* Property Dropdown */}
                        <CustomSelect
                            value={filter.property}
                            onChange={(val) => updateFilter(filter.id, 'property', val)}
                            options={properties}
                            style={{ width: '120px' }}
                            disabled={!filter.enabled}
                        />

                        {/* Operator Dropdown */}
                        <CustomSelect
                            value={filter.operator}
                            onChange={(val) => updateFilter(filter.id, 'operator', val)}
                            options={['is', 'is not']}
                            style={{ width: '80px' }}
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
                                background: 'none', border: 'none', padding: 0,
                                color: filters.length <= 1 ? '#3e3e3e' : '#8d96a0',
                                cursor: filters.length <= 1 ? 'default' : 'pointer'
                            }}
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
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'none', border: 'none', padding: 0,
                        color: '#8d96a0', cursor: 'pointer'
                    }}
                >
                    <Plus style={{ width: '20px', height: '20px' }} />
                </button>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', backgroundColor: '#3e3e3e', margin: '4px -20px' }}></div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
                <button style={{
                    flex: 1, padding: '10px', borderRadius: '8px',
                    backgroundColor: '#352e46', color: '#c49aff',
                    border: 'none', fontSize: '14px', fontWeight: 500,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '1.5px solid currentColor' }}></div>
                    Save as Smart List
                </button>
                <button
                    onClick={resetFilters}
                    style={{
                        flex: 1, padding: '10px', borderRadius: '8px',
                        backgroundColor: '#333', color: '#fff',
                        border: 'none', fontSize: '14px', fontWeight: 500,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
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
