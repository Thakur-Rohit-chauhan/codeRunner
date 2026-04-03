import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

/* ═══════════════════════════════════════════════
   Background Lines (connecting nodes to center)
   ═══════════════════════════════════════════════ */
function ConnectionLines() {
    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden lg:block">
            <line x1="50%" y1="50%" x2="16%" y2="28%" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
            <line x1="50%" y1="50%" x2="84%" y2="26%" stroke="rgba(56,189,248,0.3)" strokeWidth="1" />
            <line x1="50%" y1="50%" x2="20%" y2="70%" stroke="rgba(56,189,248,0.3)" strokeWidth="1" />
            <line x1="50%" y1="50%" x2="80%" y2="68%" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
        </svg>
    )
}

/* ═══════════════════════════════════════════════
   Floating Decorations
   ═══════════════════════════════════════════════ */
function DSADecoration() {
    return (
        <div className="absolute left-[16%] top-[28%] -translate-x-1/2 -translate-y-1/2 z-10 hidden lg:flex flex-col items-center gap-3">
            <div className="w-16 h-11 rounded-lg border border-gray-600/40 bg-slate-800/60 backdrop-blur-sm relative overflow-hidden flex items-center justify-center">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gray-800/80 border-b border-gray-600/40 flex items-center px-1.5 gap-1">
                    <div className="w-1 h-1 rounded-full bg-red-400"></div>
                    <div className="w-1 h-1 rounded-full bg-yellow-400"></div>
                    <div className="w-1 h-1 rounded-full bg-green-400"></div>
                </div>
                <span className="text-gray-300 font-mono text-sm mt-1 opacity-90">&lt;/&gt;</span>
            </div>
            <span className="text-gray-400 font-semibold tracking-widest text-xs">DSA</span>
        </div>
    )
}

function MLTopRightDecoration() {
    const layer1 = [25, 45, 65]
    const layer2 = [18, 36, 54, 72]
    const layer3 = [25, 45, 65]
    return (
        <div className="absolute right-[16%] top-[26%] translate-x-1/2 -translate-y-1/2 z-10 hidden lg:flex flex-col items-center gap-2">
            <svg viewBox="0 0 90 90" className="w-16 h-16">
                {layer1.map((y1, i) =>
                    layer2.map((y2, j) => (
                        <line key={`1-2-${i}-${j}`} x1="15" y1={y1} x2="45" y2={y2} stroke="#38bdf8" strokeWidth="0.5" opacity="0.3" />
                    ))
                )}
                {layer2.map((y1, i) =>
                    layer3.map((y2, j) => (
                        <line key={`2-3-${i}-${j}`} x1="45" y1={y1} x2="75" y2={y2} stroke="#38bdf8" strokeWidth="0.5" opacity="0.3" />
                    ))
                )}
                {layer1.map((y, i) => <circle key={`n1-${i}`} cx="15" cy={y} r="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />)}
                {layer2.map((y, i) => <circle key={`n2-${i}`} cx="45" cy={y} r="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />)}
                {layer3.map((y, i) => <circle key={`n3-${i}`} cx="75" cy={y} r="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />)}
            </svg>
            <span className="text-gray-400 font-semibold tracking-widest text-xs">ML</span>
        </div>
    )
}

function MLBottomLeftDecoration() {
    const nodes = [[45, 20], [25, 35], [65, 40], [45, 50], [30, 65], [60, 65], [45, 80]]
    const edges = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6], [1, 4], [2, 5]]
    return (
        <div className="absolute left-[20%] top-[70%] -translate-x-1/2 -translate-y-1/2 z-10 hidden lg:flex flex-col items-center gap-2">
            <svg viewBox="0 0 90 90" className="w-14 h-14">
                {edges.map(([a, b], i) => (
                    <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke="#38bdf8" strokeWidth="0.5" opacity="0.3" />
                ))}
                {nodes.map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r="2.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
                ))}
            </svg>
            <span className="text-gray-400 font-semibold tracking-widest text-xs">ML</span>
        </div>
    )
}

function CTFBottomRightDecoration() {
    return (
        <div className="absolute right-[20%] top-[68%] translate-x-1/2 -translate-y-1/2 z-10 hidden lg:flex flex-col items-center gap-2">
            <svg viewBox="0 0 64 64" className="w-12 h-12">
                <path d="M32 8 L52 16 V32 C52 44 42 54 32 60 C22 54 12 44 12 32 V16 Z" fill="rgba(16,185,129,0.05)" stroke="#10b981" strokeWidth="1.5" />
                <path d="M32 24 C29.239 24 27 26.239 27 29 C27 31.126 28.327 32.938 30.176 33.652 L29.5 39 H34.5 L33.824 33.652 C35.673 32.938 37 31.126 37 29 C37 26.239 34.761 24 32 24 Z" fill="#10b981" opacity="0.8" />
            </svg>
            <span className="text-gray-400 font-semibold tracking-widest text-xs">CTF</span>
        </div>
    )
}

/* ═══════════════════════════════════════════════
   Main Login Component
   ═══════════════════════════════════════════════ */
export default function Login() {
    const [form, setForm] = useState({
        email: '', password: '',
    })
    const [showPw, setShowPw] = useState(false)
    const loginWithCredentials = useAuthStore((state) => state.loginWithCredentials)
    const socialLogin = useAuthStore((state) => state.socialLogin)
    const navigate = useNavigate()

    const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.email || !form.password) {
            return toast.error('Please fill in all fields')
        }

        try {
            await loginWithCredentials({ email: form.email, password: form.password })
            toast.success('Signed in successfully!')
            navigate('/problems?domain=DSA')
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Unable to sign in')
        }
    }

    const handleGoogle = async () => {
        const fallbackKey = `google_${Date.now()}`

        try {
            await socialLogin({
                username: form.email ? form.email.split('@')[0] : fallbackKey,
                email: form.email || `${fallbackKey}@coderunner.dev`,
                displayName: 'Google User',
                provider: 'google',
            })
            toast.success('Signed in with Google')
            navigate('/problems?domain=DSA')
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Google sign-in failed')
        }
    }

    const fields = [
        { key: 'email', type: 'email', placeholder: 'Email Address' },
        { key: 'password', type: showPw ? 'text' : 'password', placeholder: 'Password', hasPwToggle: true },
    ]

    /* ── Inline styles to guarantee exact sizing (Tailwind arbitrary values were not applying) ── */
    const inputStyle = {
        width: '100%',
        backgroundColor: 'transparent',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '8px',
        padding: '14px 16px',
        fontSize: '15px',
        color: '#fff',
        outline: 'none',
        transition: 'border-color 0.2s',
    }

    const dividerLineStyle = {
        position: 'absolute',
        width: '100%',
        height: '1px',
        backgroundColor: 'rgba(255,255,255,0.1)',
    }

    const dividerTextStyle = {
        backgroundColor: '#1e242c',
        padding: '2px 12px',
        fontSize: '11px',
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        position: 'relative',
        zIndex: 10,
        fontWeight: 700,
        whiteSpace: 'nowrap',
    }

    return (
        <div
            className="relative overflow-hidden"
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#161a20',
                padding: '120px 16px',
            }}
        >
            {/* Background Base */}
            <div className="absolute inset-0" style={{ backgroundColor: '#161a20' }}></div>

            {/* ═══ Glowing X-Ray Effects ═══ */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden">
                <div
                    className="absolute"
                    style={{
                        width: '150%', height: 40,
                        background: 'linear-gradient(to right, transparent, #38bdf8, transparent)',
                        filter: 'blur(40px)', opacity: 0.2,
                        transform: 'rotate(20deg) translateY(-100px)',
                    }}
                />
                <div
                    className="absolute"
                    style={{
                        width: '200%', height: 120,
                        background: 'linear-gradient(to right, transparent, #4ade80, transparent)',
                        filter: 'blur(60px)', opacity: 0.1,
                        transform: 'rotate(-25deg) translateY(100px)',
                    }}
                />
                <div
                    className="absolute"
                    style={{
                        width: '200%', height: 30,
                        background: 'linear-gradient(to right, transparent, #4ade80, transparent)',
                        filter: 'blur(20px)', opacity: 0.2,
                        transform: 'rotate(-25deg) translateY(100px)',
                    }}
                />
                <div
                    className="absolute"
                    style={{
                        right: '-10%', top: '30%',
                        width: 500, height: 500,
                        background: 'radial-gradient(circle, rgba(74,222,128,0.08), transparent)',
                        borderRadius: '50%', filter: 'blur(150px)',
                    }}
                />
            </div>

            {/* Connecting lines array */}
            <ConnectionLines />

            {/* Floating Domain Widgets */}
            <DSADecoration />
            <MLTopRightDecoration />
            <MLBottomLeftDecoration />
            <CTFBottomRightDecoration />

            {/* ═══ Main Glass Container ═══ */}
            <div className="relative z-20" style={{ width: '100%', maxWidth: 440 }}>

                {/* The Glass Card */}
                <div
                    className="relative"
                    style={{
                        borderRadius: 20,
                        padding: '36px 28px 36px 28px',
                        background: 'linear-gradient(180deg, rgba(30,36,44,0.7) 0%, rgba(20,25,31,0.9) 100%)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: '0 0 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px rgba(74,222,128,0.1)',
                    }}
                >
                    {/* Inner glow overlay */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            borderRadius: 20,
                            boxShadow: 'inset 0 0 90px rgba(74,222,128,0.08)',
                        }}
                    />

                    <div className="relative z-10">
                        {/* Heading */}
                        <h1
                            style={{
                                fontSize: 28,
                                fontWeight: 900,
                                textAlign: 'center',
                                color: '#fff',
                                marginBottom: 28,
                                fontFamily: 'Inter, sans-serif',
                                letterSpacing: '-0.3px',
                                transform: 'scaleY(1.05)',
                            }}
                        >
                            WELCOME BACK
                        </h1>

                        {/* Divider 1 */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 24, width: '90%', marginLeft: 'auto', marginRight: 'auto' }}>
                            <div style={dividerLineStyle}></div>
                            <span style={dividerTextStyle}>Sign In With</span>
                        </div>

                        {/* Google Button */}
                        <button
                            type="button"
                            onClick={handleGoogle}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                backgroundColor: '#fff',
                                color: '#1a1a1a',
                                fontWeight: 700,
                                padding: '14px 0',
                                borderRadius: 8,
                                fontSize: 15,
                                marginBottom: 24,
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            }}
                        >
                            <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                        </button>

                        {/* Divider 2 */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 24 }}>
                            <div style={{ ...dividerLineStyle, width: '95%' }}></div>
                            <span style={dividerTextStyle}>Or Sign In Via Email</span>
                        </div>

                        {/* Form Area */}
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                {fields.map(({ key, type, placeholder, hasPwToggle }) => (
                                    <div key={key} style={{ position: 'relative' }}>
                                        <input
                                            type={type}
                                            value={form[key]}
                                            onChange={update(key)}
                                            placeholder={placeholder}
                                            style={inputStyle}
                                        />
                                        {hasPwToggle && (
                                            <button
                                                type="button"
                                                onClick={() => setShowPw(!showPw)}
                                                style={{
                                                    position: 'absolute',
                                                    right: 14,
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#9ca3af',
                                                    cursor: 'pointer',
                                                    padding: 0,
                                                }}
                                            >
                                                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button
                                type="submit"
                                style={{
                                    width: '100%',
                                    backgroundColor: '#4ade80',
                                    color: '#022c22',
                                    fontWeight: 700,
                                    fontSize: 15,
                                    padding: '15px 0',
                                    borderRadius: 8,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    border: 'none',
                                    cursor: 'pointer',
                                    marginTop: 28,
                                    boxShadow: '0 4px 12px rgba(74,222,128,0.25)',
                                }}
                            >
                                Sign In
                            </button>
                        </form>

                        {/* Footer */}
                        <div style={{ marginTop: 28, textAlign: 'center' }}>
                            <p style={{ fontSize: 14, color: '#d1d5db' }}>
                                Don't have an account?{' '}
                                <Link to="/register" style={{ color: '#34d399', textDecoration: 'none' }}>Register.</Link>
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}
