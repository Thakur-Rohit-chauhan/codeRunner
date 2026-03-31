import { create } from 'zustand'

const USERS_KEY = 'coderunner_users_v1'

const safeReadUsers = () => {
    if (typeof window === 'undefined') return {}

    try {
        const raw = window.localStorage.getItem(USERS_KEY)
        if (!raw) return {}
        const parsed = JSON.parse(raw)
        return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
        return {}
    }
}

const safeWriteUsers = (users) => {
    if (typeof window === 'undefined') return

    try {
        window.localStorage.setItem(USERS_KEY, JSON.stringify(users))
    } catch {
        // ignore
    }
}

const usernameSeed = (username = 'user') =>
    username.split('').reduce((total, char) => total + char.charCodeAt(0), 0)

const normalizeUsername = (value = '') =>
    value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')

const buildUserFromSeed = ({ username, email, displayName }) => {
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
        id: Date.now(),
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
    }
}

const defaultMockUser = () => ({
    id: 1,
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
})

const findUserByEmail = (users, email) => {
    const lower = (email || '').trim().toLowerCase()
    if (!lower) return null
    return Object.values(users).find((u) => (u.email || '').toLowerCase() === lower) || null
}

const useAuthStore = create((set, get) => ({
    users: safeReadUsers(),
    user: null,
    token: null,
    isAuthenticated: false,

    login: (userData, token) => set((state) => {
        const nextUsers = { ...state.users, [userData.username]: userData }
        safeWriteUsers(nextUsers)
        return {
            users: nextUsers,
            user: userData,
            token,
            isAuthenticated: true,
        }
    }),

    logout: () => set({
        user: null,
        token: null,
        isAuthenticated: false,
    }),

    // Update user profile globally and persist it in the local directory.
    updateUser: (newData) => set((state) => {
        if (!state.user) return state
        const updated = { ...state.user, ...newData }
        const nextUsers = { ...state.users, [updated.username]: updated }
        safeWriteUsers(nextUsers)
        return { users: nextUsers, user: updated }
    }),

    // Local demo auth: create or load users from localStorage.
    mockLogin: (overrides = {}) => set((state) => {
        const nextUsers = { ...state.users }

        const resolvedEmail = (overrides.email || '').trim() || undefined
        const hasExplicitUsername = typeof overrides.username === 'string' && overrides.username.trim().length > 0
        const resolvedUsername = normalizeUsername(overrides.username || (resolvedEmail ? resolvedEmail.split('@')[0] : 'coderunner')) || 'coderunner'
        const resolvedDisplayName = (overrides.displayName || '').trim() || resolvedUsername

        // Prefer an explicit username (Register flow) so new accounts don't inherit an existing user's data
        // just because the email matches. For Login (no explicit username), fall back to email lookup.
        let selected = nextUsers[resolvedUsername] || null
        if (!selected && resolvedEmail && !hasExplicitUsername) {
            selected = findUserByEmail(nextUsers, resolvedEmail)
        }

        if (!selected) {
            selected = resolvedUsername === 'coderunner' && !resolvedEmail
                ? defaultMockUser()
                : buildUserFromSeed({ username: resolvedUsername, email: resolvedEmail || `${resolvedUsername}@coderunner.dev`, displayName: resolvedDisplayName })
        } else if (overrides.displayName || overrides.username) {
            selected = {
                ...selected,
                username: resolvedUsername,
                email: resolvedEmail || selected.email,
                displayName: resolvedDisplayName || selected.displayName,
            }
        }

        nextUsers[selected.username] = selected
        safeWriteUsers(nextUsers)

        return {
            users: nextUsers,
            user: selected,
            token: 'mock-jwt-token-xyz',
            isAuthenticated: true,
        }
    }),
}))

export default useAuthStore
