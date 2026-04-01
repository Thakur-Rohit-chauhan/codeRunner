import { create } from 'zustand'
import api from '../services/api.js'

const TOKEN_STORAGE_KEY = 'token'
const SESSION_USER_STORAGE_KEY = 'coderunner_session_user_v1'
const USERS_STORAGE_KEY = 'coderunner_users_v1'
const PASSWORDS_STORAGE_KEY = 'coderunner_passwords_v1'
const OFFLINE_TOKEN_PREFIX = 'offline.'

const safeReadToken = () => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
}

const safeReadSessionUsername = () => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(SESSION_USER_STORAGE_KEY)
}

const safeReadJson = (key, fallback) => {
    if (typeof window === 'undefined') return fallback

    try {
        const raw = window.localStorage.getItem(key)
        if (!raw) return fallback
        const parsed = JSON.parse(raw)
        return parsed && typeof parsed === 'object' ? parsed : fallback
    } catch {
        return fallback
    }
}

const safeWriteJson = (key, value) => {
    if (typeof window === 'undefined') return

    try {
        window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
        // ignore localStorage persistence failures
    }
}

const persistToken = (token) => {
    if (typeof window === 'undefined') return

    if (token) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
    } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
}

const persistSessionUsername = (username) => {
    if (typeof window === 'undefined') return

    if (username) {
        window.localStorage.setItem(SESSION_USER_STORAGE_KEY, username)
    } else {
        window.localStorage.removeItem(SESSION_USER_STORAGE_KEY)
    }
}

const normalizeUsername = (value = '') =>
    value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')

const buildStableUserId = ({ username = '', email = '' }) => {
    const normalizedUsername = normalizeUsername(username)
    const normalizedEmail = (email || '').trim().toLowerCase()
    return `user:${normalizedUsername || normalizedEmail || 'anonymous'}`
}

const usernameSeed = (username = 'user') =>
    username.split('').reduce((total, char) => total + char.charCodeAt(0), 0)

const ensureStableIdentity = (user) => {
    if (!user) return null
    return {
        ...user,
        id: user.id || buildStableUserId(user),
    }
}

const buildLocalUserFromSeed = ({ username, email, displayName }) => {
    const seed = usernameSeed(username)
    const ratings = ['Novice', 'Apprentice', 'Guardian', 'Elite', 'Legend']
    const rank = ratings[seed % ratings.length]
    const rating = 1200 + (seed % 900)
    const globalRanking = 1000 + (seed % 200000)
    const contests = 1 + (seed % 18)
    const topPercent = (2 + (seed % 90) / 10).toFixed(1)
    const streak = 1 + (seed % 45)
    const solvedProblems = 40 + (seed % 220)
    const totalProblems = 500 + (seed % 5000)

    return {
        id: buildStableUserId({ username, email }),
        username,
        email,
        displayName,
        avatar: null,
        rank,
        rating,
        globalRanking,
        solvedProblems,
        totalProblems,
        easy: Math.min(solvedProblems, 10 + (seed % 120)),
        medium: Math.min(solvedProblems, 8 + (seed % 90)),
        hard: Math.min(solvedProblems, 3 + (seed % 50)),
        streak,
        contests,
        topPercent,
        languages: [
            { name: 'Python', count: 15 + (seed % 60) },
            { name: 'C++', count: 8 + (seed % 40) },
            { name: 'JavaScript', count: 3 + (seed % 25) },
        ],
        location: 'India',
        github: '',
        linkedin: '',
        views: 100 + (seed % 9000),
        solutions: 2 + (seed % 60),
        discussions: 1 + (seed % 40),
        reputation: 20 + (seed % 900),
        followers: 0,
        following: 0,
        gender: 'Male',
        birthday: '',
        websites: '',
        x: '',
        readme: '',
        work: '',
        education: '',
        skills: '',
        recentAC: true,
        heatmap: true,
    }
}

const defaultLocalUser = () => ({
    id: buildStableUserId({ username: 'coderunner', email: 'user@coderunner.dev' }),
    username: 'coderunner',
    email: 'user@coderunner.dev',
    displayName: 'Code Runner',
    avatar: null,
    rank: 'Guardian',
    rating: 1847,
    globalRanking: 12453,
    solvedProblems: 146,
    totalProblems: 3859,
    easy: 65,
    medium: 58,
    hard: 23,
    streak: 14,
    contests: 12,
    topPercent: '8.2',
    languages: [
        { name: 'C++', count: 82 },
        { name: 'Python', count: 45 },
        { name: 'Java', count: 19 },
    ],
    location: 'San Francisco, CA',
    github: 'coderunnerdev',
    linkedin: 'coderunnerdev',
    views: 2340,
    solutions: 34,
    discussions: 12,
    reputation: 456,
    followers: 128,
    following: 43,
    gender: 'Male',
    birthday: '',
    websites: '',
    x: '',
    readme: '',
    work: '',
    education: '',
    skills: '',
    recentAC: true,
    heatmap: true,
})

const mapUsers = (users = []) =>
    Object.fromEntries(
        users
            .map((user) => ensureStableIdentity(user))
            .filter(Boolean)
            .map((user) => [user.username, user])
    )

const ensureLocalUsers = () => {
    const storedUsers = safeReadJson(USERS_STORAGE_KEY, {})
    const normalizedUsers = mapUsers(Object.values(storedUsers))

    if (Object.keys(normalizedUsers).length > 0) {
        return normalizedUsers
    }

    const seededUsers = { coderunner: ensureStableIdentity(defaultLocalUser()) }
    safeWriteJson(USERS_STORAGE_KEY, seededUsers)
    return seededUsers
}

const ensureLocalPasswords = () => {
    const storedPasswords = safeReadJson(PASSWORDS_STORAGE_KEY, {})

    if (Object.keys(storedPasswords).length > 0) {
        return storedPasswords
    }

    const seededPasswords = { coderunner: 'password123' }
    safeWriteJson(PASSWORDS_STORAGE_KEY, seededPasswords)
    return seededPasswords
}

const persistLocalUsers = (users) => {
    safeWriteJson(USERS_STORAGE_KEY, users)
}

const persistLocalPasswords = (passwords) => {
    safeWriteJson(PASSWORDS_STORAGE_KEY, passwords)
}

const findUserByEmail = (users, email) => {
    const normalizedEmail = (email || '').trim().toLowerCase()
    if (!normalizedEmail) return null
    return Object.values(users).find((user) => (user.email || '').toLowerCase() === normalizedEmail) || null
}

const createAuthError = (detail, status) => {
    const error = new Error(detail)
    error.response = {
        status,
        data: { detail },
    }
    return error
}

const shouldFallbackToLocalAuth = (error) => {
    if (!error) return false
    if (!error.response) return true
    return [500, 502, 503, 504].includes(error.response.status)
}

const issueOfflineToken = (username) => `${OFFLINE_TOKEN_PREFIX}${normalizeUsername(username)}`

const parseOfflineToken = (token) => {
    if (!token || !token.startsWith(OFFLINE_TOKEN_PREFIX)) return null
    return normalizeUsername(token.slice(OFFLINE_TOKEN_PREFIX.length))
}

const persistLocalAccount = ({ user, password }) => {
    if (!user) return

    const normalizedUser = ensureStableIdentity(user)
    const localUsers = {
        ...ensureLocalUsers(),
        [normalizedUser.username]: normalizedUser,
    }
    persistLocalUsers(localUsers)

    if (typeof password === 'string') {
        const localPasswords = {
            ...ensureLocalPasswords(),
            [normalizedUser.username]: password,
        }
        persistLocalPasswords(localPasswords)
    }
}

const resolveOfflineSession = (token) => {
    const localUsers = ensureLocalUsers()
    const sessionUsername = parseOfflineToken(token) || normalizeUsername(safeReadSessionUsername() || '')
    return {
        user: sessionUsername ? localUsers[sessionUsername] || null : null,
        users: Object.values(localUsers),
    }
}

const registerOfflineAccount = ({ username, email, password, displayName }) => {
    const localUsers = ensureLocalUsers()
    const localPasswords = ensureLocalPasswords()
    const normalizedUsername = normalizeUsername(username || (email || '').split('@')[0])
    const normalizedEmail = (email || '').trim().toLowerCase()

    if (!normalizedUsername) {
        throw createAuthError('Username is required', 400)
    }
    if (!normalizedEmail) {
        throw createAuthError('Email is required', 400)
    }
    if ((password || '').length < 4) {
        throw createAuthError('Password must be at least 4 characters', 400)
    }
    if (localUsers[normalizedUsername]) {
        throw createAuthError('Username already exists', 409)
    }
    if (findUserByEmail(localUsers, normalizedEmail)) {
        throw createAuthError('Email already exists', 409)
    }

    const user = ensureStableIdentity(buildLocalUserFromSeed({
        username: normalizedUsername,
        email: normalizedEmail,
        displayName: displayName || normalizedUsername,
    }))
    const nextUsers = {
        ...localUsers,
        [normalizedUsername]: user,
    }
    const nextPasswords = {
        ...localPasswords,
        [normalizedUsername]: password,
    }

    persistLocalUsers(nextUsers)
    persistLocalPasswords(nextPasswords)

    return {
        user,
        token: issueOfflineToken(normalizedUsername),
        users: Object.values(nextUsers),
    }
}

const loginOfflineAccount = ({ email, password }) => {
    const localUsers = ensureLocalUsers()
    const localPasswords = ensureLocalPasswords()
    const identifier = (email || '').trim()
    const normalizedIdentifier = normalizeUsername(identifier)
    const user = localUsers[normalizedIdentifier] || findUserByEmail(localUsers, identifier)

    if (!user) {
        throw createAuthError('Invalid credentials', 401)
    }

    if (localPasswords[user.username] !== password) {
        throw createAuthError('Invalid credentials', 401)
    }

    return {
        user,
        token: issueOfflineToken(user.username),
        users: Object.values(localUsers),
    }
}

const socialLoginOffline = ({ username, email, displayName, provider = 'google' }) => {
    const localUsers = ensureLocalUsers()
    const localPasswords = ensureLocalPasswords()
    const fallbackUsername = normalizeUsername(username || (email || 'google_user').split('@')[0]) || 'google_user'
    const fallbackEmail = email?.trim().toLowerCase() || `${fallbackUsername}@coderunner.dev`
    const existingUser = localUsers[fallbackUsername] || findUserByEmail(localUsers, fallbackEmail)
    const user = ensureStableIdentity(existingUser || buildLocalUserFromSeed({
        username: fallbackUsername,
        email: fallbackEmail,
        displayName: displayName || fallbackUsername,
    }))
    const nextUsers = {
        ...localUsers,
        [user.username]: {
            ...user,
            displayName: displayName || user.displayName,
            email: fallbackEmail,
        },
    }
    const nextPasswords = {
        ...localPasswords,
        [user.username]: localPasswords[user.username] || `${provider}-oauth`,
    }

    persistLocalUsers(nextUsers)
    persistLocalPasswords(nextPasswords)

    return {
        user: nextUsers[user.username],
        token: issueOfflineToken(user.username),
        users: Object.values(nextUsers),
    }
}

const applySession = (set, { user, token, users = [] }) => {
    const normalizedUser = ensureStableIdentity(user)
    const directory = {
        ...mapUsers(users),
        ...(normalizedUser ? { [normalizedUser.username]: normalizedUser } : {}),
    }

    persistToken(token)
    persistSessionUsername(normalizedUser?.username || null)
    persistLocalUsers(directory)

    set({
        users: directory,
        user: normalizedUser,
        token: token || null,
        isAuthenticated: Boolean(normalizedUser && token),
        isHydrating: false,
        authError: null,
    })
}

const clearSession = (set) => {
    persistToken(null)
    persistSessionUsername(null)
    set({
        user: null,
        token: null,
        isAuthenticated: false,
        isHydrating: false,
        authError: null,
    })
}

const useAuthStore = create((set, get) => ({
    users: ensureLocalUsers(),
    user: null,
    token: safeReadToken(),
    isAuthenticated: false,
    isHydrating: true,
    authError: null,

    syncUsersDirectory: async () => {
        try {
            const response = await api.get('/auth/users')
            const users = Array.isArray(response.data?.users) ? response.data.users : []
            set((state) => ({
                users: {
                    ...state.users,
                    ...mapUsers(users),
                },
            }))
            return users
        } catch (error) {
            if (!shouldFallbackToLocalAuth(error)) {
                return Object.values(get().users)
            }

            const localUsers = ensureLocalUsers()
            set((state) => ({
                users: {
                    ...state.users,
                    ...localUsers,
                },
            }))
            return Object.values(localUsers)
        }
    },

    hydrateSession: async () => {
        const token = safeReadToken()
        if (!token) {
            clearSession(set)
            return null
        }

        try {
            const [meResponse, usersResponse] = await Promise.all([
                api.get('/auth/me'),
                api.get('/auth/users'),
            ])
            applySession(set, {
                user: meResponse.data?.user,
                token,
                users: usersResponse.data?.users || [],
            })
            return meResponse.data?.user || null
        } catch (error) {
            if (!shouldFallbackToLocalAuth(error)) {
                clearSession(set)
                return null
            }

            const offlineSession = resolveOfflineSession(token)
            if (!offlineSession.user) {
                clearSession(set)
                return null
            }

            applySession(set, {
                user: offlineSession.user,
                token,
                users: offlineSession.users,
            })
            return offlineSession.user
        }
    },

    registerAccount: async ({ username, email, password, displayName }) => {
        try {
            const response = await api.post('/auth/register', {
                username,
                email,
                password,
                displayName,
            })
            applySession(set, response.data || {})
            persistLocalAccount({ user: response.data?.user, password })
            return response.data?.user || null
        } catch (error) {
            if (!shouldFallbackToLocalAuth(error)) {
                throw error
            }

            const offlineResponse = registerOfflineAccount({ username, email, password, displayName })
            applySession(set, offlineResponse)
            return offlineResponse.user
        }
    },

    loginWithCredentials: async ({ email, password }) => {
        try {
            const response = await api.post('/auth/login', { email, password })
            applySession(set, response.data || {})
            persistLocalAccount({ user: response.data?.user, password })
            return response.data?.user || null
        } catch (error) {
            if (!shouldFallbackToLocalAuth(error)) {
                throw error
            }

            const offlineResponse = loginOfflineAccount({ email, password })
            applySession(set, offlineResponse)
            return offlineResponse.user
        }
    },

    socialLogin: async ({ username, email, displayName, provider = 'google' }) => {
        try {
            const response = await api.post('/auth/social-login', {
                username,
                email,
                displayName,
                provider,
            })
            applySession(set, response.data || {})
            persistLocalAccount({ user: response.data?.user })
            return response.data?.user || null
        } catch (error) {
            if (!shouldFallbackToLocalAuth(error)) {
                throw error
            }

            const offlineResponse = socialLoginOffline({ username, email, displayName, provider })
            applySession(set, offlineResponse)
            return offlineResponse.user
        }
    },

    logout: () => clearSession(set),

    updateUser: async (newData) => {
        const currentUser = get().user
        if (!currentUser) return null

        const optimistic = ensureStableIdentity({ ...currentUser, ...newData })
        set((state) => ({
            user: optimistic,
            users: {
                ...state.users,
                [optimistic.username]: optimistic,
            },
        }))

        try {
            const response = await api.patch('/auth/me', newData)
            const nextUser = ensureStableIdentity(response.data?.user || optimistic)
            persistLocalAccount({ user: nextUser })
            set((state) => ({
                user: nextUser,
                users: {
                    ...state.users,
                    [nextUser.username]: nextUser,
                },
            }))
            return nextUser
        } catch (error) {
            if (shouldFallbackToLocalAuth(error)) {
                persistLocalAccount({ user: optimistic })
                return optimistic
            }

            set((state) => ({
                user: currentUser,
                users: {
                    ...state.users,
                    [currentUser.username]: currentUser,
                },
            }))
            return currentUser
        }
    },
}))

export default useAuthStore
