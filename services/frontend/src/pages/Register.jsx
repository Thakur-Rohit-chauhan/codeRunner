import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Play, Eye, EyeOff } from 'lucide-react'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

export default function Register() {
    const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' })
    const [showPw, setShowPw] = useState(false)
    const { mockLogin } = useAuthStore()
    const navigate = useNavigate()

    const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!form.username || !form.email || !form.password || !form.confirmPassword) {
            return toast.error('Please fill in all fields')
        }
        if (form.password !== form.confirmPassword) {
            return toast.error('Passwords do not match')
        }
        mockLogin()
        toast.success('Account created successfully!')
        navigate('/problems')
    }

    const handleGoogle = () => {
        mockLogin()
        toast.success('Signed up with Google')
        navigate('/problems')
    }

    const fields = [
        { key: 'username', label: 'Username', type: 'text', placeholder: 'coderunner' },
        { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
        { key: 'password', label: 'Password', type: showPw ? 'text' : 'password', placeholder: '••••••••', hasPwToggle: true },
        { key: 'confirmPassword', label: 'Confirm Password', type: showPw ? 'text' : 'password', placeholder: '••••••••' },
    ]

    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-8">
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent-teal/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-md">
                <Link to="/" className="flex items-center justify-center gap-2 mb-8">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10">
                        <Play className="w-5 h-5 text-accent fill-accent" />
                    </div>
                    <span className="text-2xl font-bold text-text-primary">
                        Code<span className="text-accent">Runner</span>
                    </span>
                </Link>

                <div className="bg-bg-card border border-border rounded-2xl p-8">
                    <h1 className="text-2xl font-bold text-center mb-1 text-text-primary">Create Account</h1>
                    <p className="text-center text-text-secondary text-sm mb-8">Join Code Runner today</p>

                    <button
                        onClick={handleGoogle}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-white text-gray-800 font-medium text-sm hover:bg-gray-100 transition-colors mb-6"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </button>

                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-text-secondary">or</span>
                        <div className="flex-1 h-px bg-border" />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {fields.map(({ key, label, type, placeholder, hasPwToggle }) => (
                            <div key={key}>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>
                                <div className="relative">
                                    <input
                                        type={type}
                                        value={form[key]}
                                        onChange={update(key)}
                                        placeholder={placeholder}
                                        className="w-full px-4 py-2.5 rounded-lg bg-bg-panel border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors"
                                    />
                                    {hasPwToggle && (
                                        <button
                                            type="button"
                                            onClick={() => setShowPw(!showPw)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                                        >
                                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        <button
                            type="submit"
                            className="w-full py-3 rounded-lg bg-accent text-bg-primary font-semibold text-sm hover:bg-accent/90 transition-colors mt-2"
                        >
                            Create Account
                        </button>
                    </form>

                    <p className="text-center text-sm text-text-secondary mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-accent hover:underline font-medium">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
