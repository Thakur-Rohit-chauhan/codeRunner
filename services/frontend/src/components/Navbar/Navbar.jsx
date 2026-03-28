import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Shield, User, LogOut, Settings, Palette, ChevronDown, BookOpen, BarChart3, Layout } from 'lucide-react'
import useAuthStore from '../../store/authStore'

export default function Navbar() {
    const { user, isAuthenticated, logout } = useAuthStore()
    const [dropdown, setDropdown] = useState(false)
    const dropdownRef = useRef(null)
    const navigate = useNavigate()
    const location = useLocation()

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

    return (
        <nav className="sticky top-0 z-50 flex items-center justify-between px-8 md:px-12 lg:px-16 py-4 bg-[#1a1a1a] border-b border-[#2a2a2a]">
            {/* Logo — Shield + CodeRunner */}
            <Link to="/" className="flex items-center gap-2.5 group">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl border border-green-500/40 bg-green-500/5 group-hover:bg-green-500/10 transition-colors">
                    <Shield className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-lg font-bold text-white tracking-wide">
                    Code<span className="text-green-400">Runner</span>
                </span>
            </Link>

            {/* Nav Links — Centered, uppercase */}
            <div className="hidden md:flex items-center gap-6">
                {navLinks.map(({ to, label }) => (
                    <Link
                        key={label}
                        to={to}
                        className={`py-2 text-[13px] font-medium tracking-[0.15em] transition-colors ${location.pathname === to
                            ? 'text-white'
                            : 'text-[#a1a1aa] hover:text-white'
                            }`}
                    >
                        {label}
                    </Link>
                ))}
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
                {isAuthenticated ? (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdown(!dropdown)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-sm font-bold text-slate-900 shadow-[0_0_10px_rgba(74,222,128,0.3)]">
                                {user?.displayName?.[0] || 'U'}
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${dropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {dropdown && (
                            <div
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 'calc(100% + 8px)',
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
                                        { Icon: BookOpen, label: 'Lists' },
                                        { Icon: Layout, label: 'Notes' },
                                        { Icon: BarChart3, label: 'Stats' },
                                    ].map(({ Icon, label }) => (
                                        <button key={label}
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
                                        { Icon: Settings, label: 'Settings', onClick: () => setDropdown(false) },
                                        { Icon: Palette, label: 'Appearance', onClick: () => setDropdown(false) },
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
                            className="px-6 py-2.5 rounded-md text-[13px] font-semibold tracking-[0.15em] text-green-400 border border-green-500/60 hover:bg-green-500/10 hover:border-green-400 transition-all"
                        >
                            REGISTER
                        </Link>
                        <Link
                            to="/login"
                            className="px-6 py-2.5 rounded-md text-[13px] font-semibold tracking-[0.15em] text-[#e5e7eb] border border-[#4b5563] hover:bg-white/5 hover:border-[#9ca3af] transition-all"
                        >
                            LOGIN
                        </Link>
                    </>
                )}
            </div>
        </nav>
    )
}
