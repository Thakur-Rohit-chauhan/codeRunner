import { useEffect, useRef, useState } from 'react'
import api from '../../services/api'

let googleScriptPromise = null

const loadGoogleScript = () => {
    if (googleScriptPromise) return googleScriptPromise

    googleScriptPromise = new Promise((resolve, reject) => {
        if (window.google?.accounts?.id) {
            resolve(window.google)
            return
        }

        const existing = document.querySelector('script[data-google-identity="true"]')
        if (existing) {
            existing.addEventListener('load', () => resolve(window.google), { once: true })
            existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')), { once: true })
            return
        }

        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.dataset.googleIdentity = 'true'
        script.onload = () => resolve(window.google)
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
        document.head.appendChild(script)
    })

    return googleScriptPromise
}

export default function GoogleSignInButton({ onCredential, onError }) {
    const buttonRef = useRef(null)
    const [config, setConfig] = useState({ enabled: false, clientId: '' })
    const [message, setMessage] = useState('Loading Google sign-in...')

    useEffect(() => {
        let active = true

        api.get('/auth/google-config')
            .then((response) => {
                if (!active) return
                const nextConfig = response.data || { enabled: false, clientId: '' }
                setConfig(nextConfig)
                setMessage(nextConfig.enabled ? '' : 'Google sign-in is not configured yet.')
            })
            .catch(() => {
                if (!active) return
                setConfig({ enabled: false, clientId: '' })
                setMessage('Google sign-in is unavailable right now.')
            })

        return () => {
            active = false
        }
    }, [])

    useEffect(() => {
        let cancelled = false

        if (!config.enabled || !config.clientId || !buttonRef.current) {
            return () => { }
        }

        loadGoogleScript()
            .then(() => {
                if (cancelled || !window.google?.accounts?.id || !buttonRef.current) return

                buttonRef.current.innerHTML = ''
                window.google.accounts.id.initialize({
                    client_id: config.clientId,
                    callback: (response) => {
                        if (response?.credential) {
                            onCredential?.(response.credential)
                            return
                        }
                        onError?.(new Error('Google did not return a credential'))
                    },
                })
                window.google.accounts.id.renderButton(buttonRef.current, {
                    theme: 'outline',
                    size: 'large',
                    shape: 'pill',
                    text: 'continue_with',
                    width: 380,
                })
            })
            .catch((error) => {
                if (cancelled) return
                setMessage(error.message || 'Google sign-in failed to initialize.')
                onError?.(error)
            })

        return () => {
            cancelled = true
            if (buttonRef.current) {
                buttonRef.current.innerHTML = ''
            }
        }
    }, [config.clientId, config.enabled, onCredential, onError])

    return (
        <div style={{ width: '100%', marginBottom: 24 }}>
            <div
                ref={buttonRef}
                style={{
                    display: config.enabled ? 'flex' : 'none',
                    justifyContent: 'center',
                    width: '100%',
                }}
            />
            {!config.enabled && (
                <button
                    type="button"
                    disabled
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        backgroundColor: '#e5e7eb',
                        color: '#6b7280',
                        fontWeight: 700,
                        padding: '14px 0',
                        borderRadius: 8,
                        fontSize: 15,
                        border: 'none',
                        cursor: 'not-allowed',
                    }}
                >
                    Continue with Google
                </button>
            )}
            {message && (
                <p style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', marginTop: 10 }}>
                    {message}
                </p>
            )}
        </div>
    )
}
