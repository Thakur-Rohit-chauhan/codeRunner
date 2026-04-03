import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'

export default function OAuthCallback() {
    const { provider = 'google' } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const completeOAuthLogin = useAuthStore((state) => state.completeOAuthLogin)
    const hasStartedRef = useRef(false)

    useEffect(() => {
        if (hasStartedRef.current) return
        hasStartedRef.current = true

        const run = async () => {
            try {
                await completeOAuthLogin(provider, location.search || '')
                toast.success('Signed in successfully')
                navigate('/problems', { replace: true })
            } catch (error) {
                toast.error(error.response?.data?.detail || 'Google sign-in failed')
                navigate('/login', { replace: true })
            }
        }

        run()
    }, [completeOAuthLogin, location.search, navigate, provider])

    return null
}
