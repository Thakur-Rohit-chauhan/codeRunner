import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Shield, User, LogOut, Settings, Palette, ChevronDown, BookOpen, BarChart3, Layout, X, Download, Check, Trophy } from 'lucide-react'
import useAuthStore from '../../store/authStore'

export default function Navbar() {
    const { user, isAuthenticated, logout } = useAuthStore()
    const [dropdown, setDropdown] = useState(false)
    const dropdownRef = useRef(null)
    const navigate = useNavigate()
    const location = useLocation()

    // --- New States for drop-down features ---
    const [isNotesOpen, setIsNotesOpen] = useState(false)
    const [notesText, setNotesText] = useState(() => localStorage.getItem('user_notes') || '')
    const [notesTitle, setNotesTitle] = useState(() => localStorage.getItem('user_notes_title') || 'Personal Notes')
    const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'dark')
    const [showSavedToast, setShowSavedToast] = useState(false)

    useEffect(() => {
        localStorage.setItem('user_notes', notesText)
    }, [notesText])

    useEffect(() => {
        localStorage.setItem('user_notes_title', notesTitle)
    }, [notesTitle])

    useEffect(() => {
        localStorage.setItem('app_theme', theme)
        if (theme === 'light') {
            document.body.classList.add('light-theme')
        } else {
            document.body.classList.remove('light-theme')
        }
    }, [theme])

    const handleSaveNoteToFile = () => {
        const blob = new Blob([notesText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${notesTitle.trim() || 'note'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleManualSave = () => {
        setShowSavedToast(true);
        setTimeout(() => setShowSavedToast(false), 2000);
    };

    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const navLinks = [
        { to: '/problems?domain=DSA', label: 'Algorithms' },
        { to: '/problems?domain=ML', label: 'Machine Learning' },
        { to: '/problems?domain=CTF', label: 'Cyber Security' },
    ]

    const currentRoute = `${location.pathname}${location.search}`
    const isContestRoute = location.pathname === '/contests' || location.pathname.startsWith('/contests/')

    return (
        <nav
            className="sticky top-0 z-50"
            style={{
                padding: '14px 18px 10px',
                background: 'linear-gradient(180deg, rgba(11,15,25,0.92) 0%, rgba(11,15,25,0.78) 100%)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
            }}
        >
            <div
                style={{
                    maxWidth: '1380px',
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '18px',
                    padding: '10px 14px',
                    borderRadius: '24px',
                    background: 'linear-gradient(180deg, rgba(23,27,35,0.94) 0%, rgba(18,22,30,0.9) 100%)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    boxShadow: '0 18px 50px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
            >
                {/* Logo */}
                <Link
                    to="/"
                    className="group"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        flexShrink: 0,
                        textDecoration: 'none',
                    }}
                >
                    <div
                        style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(180deg, rgba(52,211,153,0.12) 0%, rgba(52,211,153,0.05) 100%)',
                            border: '1px solid rgba(52,211,153,0.24)',
                            boxShadow: '0 0 0 1px rgba(52,211,153,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        }}
                    >
                        <Shield className="w-5 h-5 text-green-400" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                            Code<span style={{ color: '#4ade80' }}>Runner</span>
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                            Practice Workspace
                        </span>
                    </div>
                </Link>

                {/* Nav links */}
                <div
                    className="hidden md:flex"
                    style={{
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px',
                        borderRadius: '18px',
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                    }}
                >
                    {navLinks.map(({ to, label }) => {
                        const isActive = currentRoute === to
                        return (
                            <Link
                                key={label}
                                to={to}
                                style={{
                                    position: 'relative',
                                    padding: '11px 18px',
                                    borderRadius: '14px',
                                    fontSize: '13px',
                                    fontWeight: isActive ? 700 : 600,
                                    letterSpacing: '0.12em',
                                    whiteSpace: 'nowrap',
                                    textTransform: 'uppercase',
                                    textDecoration: 'none',
                                    color: isActive ? '#eafff4' : '#a1a1aa',
                                    background: isActive ? 'linear-gradient(135deg, rgba(52,211,153,0.16) 0%, rgba(16,185,129,0.08) 100%)' : 'transparent',
                                    border: `1px solid ${isActive ? 'rgba(52,211,153,0.18)' : 'transparent'}`,
                                    boxShadow: isActive ? '0 10px 24px rgba(16,185,129,0.14)' : 'none',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                                        e.currentTarget.style.color = '#f3f4f6'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'transparent'
                                        e.currentTarget.style.color = '#a1a1aa'
                                    }
                                }}
                            >
                                {label}
                            </Link>
                        )
                    })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    {/* Contests CTA */}
                    {isAuthenticated && (
                        <Link
                            to="/contests"
                            className="hidden md:flex items-center gap-2"
                            style={{
                                padding: '11px 18px',
                                borderRadius: '16px',
                                alignItems: 'center',
                                background: isContestRoute
                                    ? 'linear-gradient(135deg, rgba(52,211,153,0.22) 0%, rgba(5,150,105,0.18) 100%)'
                                    : 'linear-gradient(135deg, rgba(52,211,153,0.08) 0%, rgba(16,185,129,0.04) 100%)',
                                border: '1px solid rgba(52,211,153,0.25)',
                                color: isContestRoute ? '#d1fae5' : '#6ee7b7',
                                fontSize: '13px',
                                fontWeight: 700,
                                letterSpacing: '0.06em',
                                textDecoration: 'none',
                                transition: 'all 0.25s',
                                boxShadow: isContestRoute ? '0 12px 28px rgba(16,185,129,0.18)' : 'none',
                            }}
                            onMouseEnter={e => {
                                if (!isContestRoute) {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(52,211,153,0.14) 0%, rgba(16,185,129,0.08) 100%)'
                                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(16,185,129,0.12)'
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isContestRoute) {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(52,211,153,0.08) 0%, rgba(16,185,129,0.04) 100%)'
                                    e.currentTarget.style.boxShadow = 'none'
                                }
                            }}
                        >
                            <Trophy size={14} />
                            Contests
                        </Link>
                    )}

                    {/* Auth Buttons */}
                    <div className="flex items-center gap-3">
                        {isAuthenticated ? (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setDropdown(!dropdown)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '6px 8px 6px 6px',
                                        borderRadius: '16px',
                                        background: dropdown ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${dropdown ? 'rgba(52,211,153,0.16)' : 'rgba(255,255,255,0.05)'}`,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={e => {
                                        if (!dropdown) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                                    }}
                                    onMouseLeave={e => {
                                        if (!dropdown) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                                    }}
                                >
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-emerald-500/50 shadow-[0_0_12px_rgba(74,222,128,0.2)]" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-sm font-bold text-slate-900 shadow-[0_0_14px_rgba(74,222,128,0.3)]">
                                            {user?.displayName?.[0] || 'U'}
                                        </div>
                                    )}
                                    <div className="hidden sm:flex" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1px', minWidth: 0 }}>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#e5e7eb', maxWidth: '92px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {user?.displayName || 'User'}
                                        </span>
                                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                            Profile
                                        </span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${dropdown ? 'rotate-180' : ''}`} />
                                </button>

                                {dropdown && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            right: 0,
                                            top: 'calc(100% + 10px)',
                                            width: '320px',
                                            borderRadius: '20px',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            background: 'linear-gradient(to bottom, rgba(22,28,36,0.97) 0%, rgba(13,17,23,0.99) 100%)',
                                            backdropFilter: 'blur(32px)',
                                            WebkitBackdropFilter: 'blur(32px)',
                                            boxShadow: '0 24px 48px -12px rgba(0,0,0,0.8), 0 0 24px rgba(52,211,153,0.06)',
                                            padding: '10px 8px 8px',
                                            zIndex: 9999,
                                        }}
                                    >
                                {/* User info card */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    padding: '14px 16px',
                                    marginBottom: '8px',
                                    borderRadius: '14px',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="Large Avatar" style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            flexShrink: 0,
                                            boxShadow: '0 0 16px rgba(52,211,153,0.35)',
                                            border: '1px solid rgba(52,211,153,0.3)',
                                        }} />
                                    ) : (
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #34d399, #059669)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '20px',
                                            fontWeight: 700,
                                            color: '#0b0f19',
                                            flexShrink: 0,
                                            boxShadow: '0 0 16px rgba(52,211,153,0.35)',
                                            border: '1px solid rgba(52,211,153,0.25)',
                                        }}>
                                            {user?.displayName?.[0] || 'U'}
                                        </div>
                                    )}
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <p style={{
                                            fontWeight: 700,
                                            color: 'rgba(255,255,255,0.92)',
                                            fontSize: '15px',
                                            letterSpacing: '0.01em',
                                            marginBottom: '3px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>{user?.displayName || 'User'}</p>
                                        <p style={{
                                            fontSize: '13px',
                                            color: 'rgba(156,163,175,0.8)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>{user?.email}</p>
                                    </div>
                                </div>

                                {/* Quick stats */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '8px', padding: '0 2px' }}>
                                    {[
                                        { Icon: BookOpen, label: 'Lists', onClick: () => { navigate('/list/bookmarks'); setDropdown(false); } },
                                        { Icon: Layout, label: 'Notes', onClick: () => { setIsNotesOpen(true); setDropdown(false); } },
                                        { Icon: BarChart3, label: 'Stats', onClick: () => { navigate(`/profile/${user?.username}`); setDropdown(false); } },
                                    ].map(({ Icon, label, onClick }) => (
                                        <button key={label} onClick={onClick}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '7px',
                                                padding: '12px 4px',
                                                borderRadius: '12px',
                                                background: 'rgba(255,255,255,0.025)',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = 'rgba(52,211,153,0.09)'
                                                e.currentTarget.style.borderColor = 'rgba(52,211,153,0.2)'
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
                                            }}
                                        >
                                            <Icon style={{ width: '18px', height: '18px', color: '#6b7280' }} />
                                            <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Divider */}
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '6px 10px 4px' }} />

                                {/* Menu items */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', padding: '2px 2px 4px' }}>
                                    {[
                                        { Icon: User, label: 'View Profile', onClick: () => { setDropdown(false); navigate(`/profile/${user?.username}`) } },
                                        { Icon: Settings, label: 'Settings', onClick: () => { setDropdown(false); navigate('/settings') } },
                                        { Icon: Palette, label: 'Appearance', onClick: () => { setTheme(theme === 'dark' ? 'light' : 'dark'); setDropdown(false); } },
                                    ].map(({ Icon, label, onClick }) => (
                                        <button key={label} onClick={onClick}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '13px',
                                                width: '100%',
                                                padding: '10px 14px',
                                                borderRadius: '11px',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '14.5px',
                                                fontWeight: 500,
                                                color: 'rgba(209,213,219,0.9)',
                                                transition: 'all 0.15s',
                                                textAlign: 'left',
                                                fontFamily: 'inherit',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff' }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(209,213,219,0.9)' }}
                                        >
                                            <Icon style={{ width: '18px', height: '18px', color: '#9ca3af', flexShrink: 0 }} />
                                            {label}
                                        </button>
                                    ))}

                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '6px 8px' }} />

                                    <button
                                        onClick={() => { logout(); setDropdown(false); navigate('/') }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '13px',
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '11px',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '14.5px',
                                            fontWeight: 500,
                                            color: '#f87171',
                                            transition: 'all 0.15s',
                                            textAlign: 'left',
                                            fontFamily: 'inherit',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.09)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                    >
                                        <LogOut style={{ width: '18px', height: '18px', color: 'rgba(248,113,113,0.75)', flexShrink: 0 }} />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <Link
                                    to="/register"
                                    style={{
                                        padding: '10px 16px',
                                        borderRadius: '14px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        letterSpacing: '0.12em',
                                        textDecoration: 'none',
                                        color: '#4ade80',
                                        border: '1px solid rgba(74,222,128,0.35)',
                                        background: 'rgba(52,211,153,0.06)',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    REGISTER
                                </Link>
                                <Link
                                    to="/login"
                                    style={{
                                        padding: '10px 16px',
                                        borderRadius: '14px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        letterSpacing: '0.12em',
                                        textDecoration: 'none',
                                        color: '#e5e7eb',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        background: 'rgba(255,255,255,0.03)',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    LOGIN
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ═ Notes Editor Modal ═ */}
            {isNotesOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div style={{ width: '500px', backgroundColor: '#161a20', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                <Layout size={20} className="text-green-400" />
                                <input
                                    type="text"
                                    value={notesTitle}
                                    onChange={(e) => setNotesTitle(e.target.value)}
                                    placeholder="Note Title..."
                                    style={{
                                        background: 'transparent', border: 'none', color: '#fff', fontSize: '18px', fontWeight: 600, outline: 'none', width: '100%',
                                        borderBottom: '1px solid transparent', transition: 'border-color 0.2s'
                                    }}
                                    onFocus={e => e.currentTarget.style.borderBottomColor = 'rgba(52,211,153,0.5)'}
                                    onBlur={e => e.currentTarget.style.borderBottomColor = 'transparent'}
                                />
                            </div>
                            <button onClick={() => setIsNotesOpen(false)} style={{ color: '#9ca3af', padding: '4px', borderRadius: '8px' }} onMouseEnter={e => e.currentTarget.style.backgroundColor='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
                                <X size={20} />
                            </button>
                        </div>
                        <textarea
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            placeholder="Jot down formulas, algorithmic thoughts, or reference links here... They are saved automatically to your device."
                            style={{ width: '100%', height: '320px', backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#e5e7eb', fontSize: '14px', lineHeight: '1.6', resize: 'none', outline: 'none', fontFamily: 'monospace' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                    onClick={handleManualSave}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor='rgba(52,211,153,0.2)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor='rgba(52,211,153,0.1)'}
                                >
                                    {showSavedToast ? <Check size={16} /> : <Check size={16} opacity={0.6} />}
                                    {showSavedToast ? 'Saved!' : 'Save'}
                                </button>
                                {showSavedToast && <span className="text-xs text-green-400/80 animate-fade-in">Saved to browser storage</span>}
                            </div>
                            <button
                                onClick={handleSaveNoteToFile}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fff', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor='#e5e5e5'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor='#fff'}
                            >
                                <Download size={16} /> Export File
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </nav>
    )
}
