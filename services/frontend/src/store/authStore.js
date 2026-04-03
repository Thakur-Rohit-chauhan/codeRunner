import { create } from 'zustand'
import api from '../services/api.js'

const TOKEN_STORAGE_KEY = 'token'
const SESSION_USER_STORAGE_KEY = 'coderunner_session_user_v1'
const USERS_STORAGE_KEY = 'coderunner_users_v1'
const PASSWORDS_STORAGE_KEY = 'coderunner_passwords_v1'
const OFFLINE_TOKEN_PREFIX = 'offline.'
const DEFAULT_ADMIN_USERNAME = 'admin'
const DEFAULT_ADMIN_EMAIL = 'admin@gmail.com'
const DEFAULT_ADMIN_PASSWORD = 'Admin123'

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
        // Ignore persistence failures so auth remains usable in-memory.
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

    const normalizedUsername = normalizeUsername(
        user.username || user.displayName || (user.email || '').split('@')[0] || ''
    )
    const isAdmin = Boolean(user.isAdmin || user.role === 'admin')

    return {
        ...user,
        username: normalizedUsername || user.username || 'user',
        displayName: user.displayName || normalizedUsername || 'User',
        email: user.email || '',
        id: user.id || buildStableUserId({
            username: normalizedUsername || user.username || '',
            email: user.email || '',
        }),
        role: isAdmin ? 'admin' : 'user',
        isAdmin,
        isOnline: Boolean(user.isOnline),
        lastSeenAt: user.lastSeenAt || null,
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
        role: 'user',
        isAdmin: false,
        isOnline: false,
        lastSeenAt: null,
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
    role: 'user',
    isAdmin: false,
    isOnline: false,
    lastSeenAt: null,
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

const defaultLocalAdmin = () => {
    const admin = buildLocalUserFromSeed({
        username: DEFAULT_ADMIN_USERNAME,
        email: DEFAULT_ADMIN_EMAIL,
        displayName: 'Admin',
    })

    return {
        ...admin,
        rank: 'Admin',
        role: 'admin',
        isAdmin: true,
    }
}

const isDefaultAdminUsername = (username) => normalizeUsername(username) === DEFAULT_ADMIN_USERNAME

const normalizeDefaultAdminUser = (user = {}) => ensureStableIdentity({
    ...defaultLocalAdmin(),
    ...user,
    username: DEFAULT_ADMIN_USERNAME,
    email: DEFAULT_ADMIN_EMAIL,
    displayName: 'Admin',
    role: 'admin',
    isAdmin: true,
})

const buildSyncedUsersDirectory = (users = {}) => {
    const backendUsers = mapUsers(Object.values(users))
    return {
        coderunner: backendUsers.coderunner || ensureStableIdentity(defaultLocalUser()),
        admin: normalizeDefaultAdminUser(backendUsers.admin),
        ...backendUsers,
    }
}

const mapUsers = (users = []) =>
    Object.fromEntries(
        users
            .map((user) => ensureStableIdentity(user))
            .filter(Boolean)
            .map((user) => [user.username, user])
    )

const persistLocalUsers = (users) => {
    safeWriteJson(USERS_STORAGE_KEY, users)
}

const persistLocalPasswords = (passwords) => {
    safeWriteJson(PASSWORDS_STORAGE_KEY, passwords)
}

const pruneLocalPasswordsForUsers = (users) => {
    const allowedUsernames = new Set(Object.keys(users || {}))
    const existingPasswords = ensureLocalPasswords()
    const nextPasswords = Object.fromEntries(
        Object.entries(existingPasswords).filter(([username]) => allowedUsernames.has(username))
    )
    if (!nextPasswords.coderunner) nextPasswords.coderunner = 'password123'
    nextPasswords.admin = DEFAULT_ADMIN_PASSWORD
    persistLocalPasswords(nextPasswords)
}

const ensureLocalUsers = () => {
    const storedUsers = safeReadJson(USERS_STORAGE_KEY, {})
    const normalizedUsers = mapUsers(Object.values(storedUsers))

    if (Object.keys(normalizedUsers).length > 0) {
        const seededUsers = {
            coderunner: normalizedUsers.coderunner || ensureStableIdentity(defaultLocalUser()),
            admin: normalizeDefaultAdminUser(normalizedUsers.admin),
            ...normalizedUsers,
        }
        seededUsers.admin = normalizeDefaultAdminUser(seededUsers.admin)
        persistLocalUsers(seededUsers)
        return seededUsers
    }

    const seededUsers = {
        coderunner: ensureStableIdentity(defaultLocalUser()),
        admin: normalizeDefaultAdminUser(),
    }
    persistLocalUsers(seededUsers)
    return seededUsers
}

const ensureLocalPasswords = () => {
    const storedPasswords = safeReadJson(PASSWORDS_STORAGE_KEY, {})

    if (Object.keys(storedPasswords).length > 0) {
        const seededPasswords = {
            coderunner: storedPasswords.coderunner || 'password123',
            admin: DEFAULT_ADMIN_PASSWORD,
            ...storedPasswords,
        }
        seededPasswords.admin = DEFAULT_ADMIN_PASSWORD
        persistLocalPasswords(seededPasswords)
        return seededPasswords
    }

    const seededPasswords = {
        coderunner: 'password123',
        admin: DEFAULT_ADMIN_PASSWORD,
    }
    persistLocalPasswords(seededPasswords)
    return seededPasswords
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
    persistLocalUsers({
        ...ensureLocalUsers(),
        [normalizedUser.username]: normalizedUser,
    })

    if (typeof password === 'string') {
        persistLocalPasswords({
            ...ensureLocalPasswords(),
            [normalizedUser.username]: password,
        })
    }
}

const updateLocalUser = (username, updater) => {
    const normalizedUsername = normalizeUsername(username)
    if (!normalizedUsername) return null

    const localUsers = ensureLocalUsers()
    const target = localUsers[normalizedUsername]
    if (!target) return null

    const nextUser = ensureStableIdentity(updater(target))
    const nextUsers = {
        ...localUsers,
        [normalizedUsername]: nextUser,
    }

    persistLocalUsers(nextUsers)
    return { user: nextUser, users: nextUsers }
}

const markLocalUserPresence = (username, isOnline) =>
    updateLocalUser(username, (user) => ({
        ...user,
        isOnline: Boolean(isOnline),
        lastSeenAt: new Date().toISOString(),
    }))

const removeLocalAccount = (username) => {
    const normalizedUsername = normalizeUsername(username)
    if (!normalizedUsername) return null
    if (isDefaultAdminUsername(normalizedUsername)) return ensureLocalUsers()

    const localUsers = { ...ensureLocalUsers() }
    if (!localUsers[normalizedUsername]) return null
    delete localUsers[normalizedUsername]
    persistLocalUsers(localUsers)

    const localPasswords = { ...ensureLocalPasswords() }
    delete localPasswords[normalizedUsername]
    persistLocalPasswords(localPasswords)

    return localUsers
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

    const user = ensureStableIdentity({
        ...buildLocalUserFromSeed({
            username: normalizedUsername,
            email: normalizedEmail,
            displayName: displayName || normalizedUsername,
        }),
        isOnline: true,
        lastSeenAt: new Date().toISOString(),
    })

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

    if (!user || localPasswords[user.username] !== password) {
        throw createAuthError('Invalid credentials', 401)
    }

    const nextUsers = {
        ...localUsers,
        [user.username]: ensureStableIdentity({
            ...user,
            isOnline: true,
            lastSeenAt: new Date().toISOString(),
        }),
    }
    persistLocalUsers(nextUsers)

    return {
        user: nextUsers[user.username],
        token: issueOfflineToken(user.username),
        users: Object.values(nextUsers),
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
        [user.username]: ensureStableIdentity({
            ...user,
            displayName: displayName || user.displayName,
            email: fallbackEmail,
            isOnline: true,
            lastSeenAt: new Date().toISOString(),
        }),
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
    const normalizedUser = user ? ensureStableIdentity({
        ...user,
        isOnline: true,
        lastSeenAt: user.lastSeenAt || new Date().toISOString(),
    }) : null
    const directory = {
        ...mapUsers(users),
        ...(normalizedUser ? { [normalizedUser.username]: normalizedUser } : {}),
    }

    persistToken(token)
    persistSessionUsername(normalizedUser?.username || null)
    persistLocalUsers({
        ...ensureLocalUsers(),
        ...directory,
    })

    set({
        users: {
            ...ensureLocalUsers(),
            ...directory,
        },
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
            const nextUsers = buildSyncedUsersDirectory(mapUsers(users))
            persistLocalUsers(nextUsers)
            pruneLocalPasswordsForUsers(nextUsers)
            set((state) => {
                return {
                    users: nextUsers,
                    user: state.user?.username ? nextUsers[state.user.username] || state.user : state.user,
                }
            })
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
                user: state.user?.username ? localUsers[state.user.username] || state.user : state.user,
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
            const meResponse = await api.get('/auth/me')
            let usersPayload = []
            try {
                const usersResponse = await api.get('/auth/users')
                usersPayload = usersResponse.data?.users || []
            } catch (usersError) {
                if (shouldFallbackToLocalAuth(usersError)) {
                    usersPayload = Object.values(ensureLocalUsers())
                } else {
                    // Most non-admin users are not allowed to call /auth/users.
                    usersPayload = []
                }
            }
            applySession(set, {
                user: meResponse.data?.user,
                token,
                users: usersPayload,
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

    logout: async () => {
        const { token, user } = get()
        const username = user?.username

        if (username) {
            const nextPresence = markLocalUserPresence(username, false)
            if (nextPresence?.users) {
                set((state) => ({
                    users: {
                        ...state.users,
                        ...nextPresence.users,
                    },
                }))
            }
        }

        try {
            if (token && !parseOfflineToken(token)) {
                await api.post('/auth/logout')
            }
        } catch {
            // Clear the local session even if the backend cannot be reached.
        }

        clearSession(set)
    },

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

    setUserAdminStatus: async (username, isAdmin) => {
        const normalizedUsername = normalizeUsername(username)
        if (!normalizedUsername) return null
        if (isDefaultAdminUsername(normalizedUsername)) {
            throw createAuthError('The default admin cannot be modified', 400)
        }

        const previousUsers = get().users
        const previousUser = get().user
        const existing = previousUsers[normalizedUsername]
        if (!existing) {
            throw createAuthError('User not found', 404)
        }

        const optimistic = ensureStableIdentity({
            ...existing,
            isAdmin: Boolean(isAdmin),
            role: isAdmin ? 'admin' : 'user',
        })

        const optimisticUsers = {
            ...previousUsers,
            [normalizedUsername]: optimistic,
        }

        persistLocalUsers({
            ...ensureLocalUsers(),
            [normalizedUsername]: optimistic,
        })
        set({
            users: optimisticUsers,
            user: previousUser?.username === normalizedUsername ? optimistic : previousUser,
        })

        try {
            const response = await api.patch(`/auth/users/${normalizedUsername}`, { isAdmin: Boolean(isAdmin) })
            const mappedUsers = mapUsers(response.data?.users || [response.data?.user].filter(Boolean))
            const nextUsers = buildSyncedUsersDirectory({
                ...get().users,
                ...mappedUsers,
            })
            persistLocalUsers(nextUsers)
            pruneLocalPasswordsForUsers(nextUsers)
            set({
                users: nextUsers,
                user: previousUser?.username ? nextUsers[previousUser.username] || previousUser : previousUser,
            })
            return nextUsers[normalizedUsername] || optimistic
        } catch (error) {
            if (error?.response?.status === 404) {
                removeLocalAccount(normalizedUsername)
                const nextUsers = ensureLocalUsers()
                set({
                    users: nextUsers,
                    user: previousUser,
                })
                throw createAuthError('User was not found and has been removed from the directory', 404)
            }

            if (shouldFallbackToLocalAuth(error)) {
                return optimistic
            }

            persistLocalUsers({
                ...ensureLocalUsers(),
                [normalizedUsername]: existing,
            })
            set({
                users: previousUsers,
                user: previousUser,
            })
            throw error
        }
    },

    deleteUserAccount: async (username) => {
        const normalizedUsername = normalizeUsername(username)
        if (!normalizedUsername) return false
        if (isDefaultAdminUsername(normalizedUsername)) {
            throw createAuthError('The default admin cannot be deleted', 400)
        }

        const previousUsers = get().users
        const previousUser = get().user
        const previousPasswords = ensureLocalPasswords()
        const existing = previousUsers[normalizedUsername]
        if (!existing) {
            throw createAuthError('User not found', 404)
        }

        const nextUsers = { ...previousUsers }
        delete nextUsers[normalizedUsername]

        set({
            users: nextUsers,
            user: previousUser?.username === normalizedUsername ? null : previousUser,
        })
        removeLocalAccount(normalizedUsername)

        try {
            await api.delete(`/auth/users/${normalizedUsername}`)
            return true
        } catch (error) {
            if (error?.response?.status === 404) {
                return true
            }

            if (shouldFallbackToLocalAuth(error)) {
                return true
            }

            persistLocalUsers(previousUsers)
            persistLocalPasswords(previousPasswords)
            set({
                users: previousUsers,
                user: previousUser,
            })
            throw error
        }
    },
}))

export default useAuthStore
