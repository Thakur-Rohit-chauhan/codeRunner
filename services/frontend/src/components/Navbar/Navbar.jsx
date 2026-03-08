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
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-bg-card transition-colors"
                        >
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-accent-teal flex items-center justify-center text-xs font-bold text-bg-primary">
                                {user?.displayName?.[0] || 'U'}
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 text-text-secondary transition-transform ${dropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {dropdown && (
                            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-bg-card border border-border shadow-2xl animate-slide-down overflow-hidden">
                                {/* User info */}
                                <div className="px-4 py-4 border-b border-border">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-teal flex items-center justify-center text-sm font-bold text-bg-primary">
                                            {user?.displayName?.[0] || 'U'}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-text-primary">{user?.displayName}</p>
                                            <p className="text-xs text-text-secondary">{user?.email}</p>
                                        </div>
                                    </div>
                                </div>
                                {/* Quick stats */}
                                <div className="px-4 py-3 border-b border-border flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                                        <BookOpen className="w-3.5 h-3.5" /> <span>My Lists</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                                        <Layout className="w-3.5 h-3.5" /> <span>Notebook</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                                        <BarChart3 className="w-3.5 h-3.5" /> <span>Stats</span>
                                    </div>
                                </div>
                                {/* Menu items */}
                                <div className="py-1">
                                    <button
                                        onClick={() => { setDropdown(false); navigate(`/profile/${user?.username}`) }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-panel transition-colors"
                                    >
                                        <User className="w-4 h-4" /> View Profile
                                    </button>
                                    <button
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-panel transition-colors"
                                    >
                                        <Settings className="w-4 h-4" /> Settings
                                    </button>
                                    <button
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-panel transition-colors"
                                    >
                                        <Palette className="w-4 h-4" /> Appearance
                                    </button>
                                    <button
                                        onClick={() => { logout(); setDropdown(false); navigate('/') }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-accent-red hover:bg-bg-panel transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" /> Sign Out
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
