import { create } from 'zustand'

const STORAGE_KEY = 'coderunner_solutions_v1'

const defaultState = {
    solutionsByProblem: {},
    commentsBySolution: {},
}

const normalizeSolutionsByProblem = (value) => {
    if (!value || typeof value !== 'object') return {}

    return Object.fromEntries(
        Object.entries(value).map(([key, entries]) => [key, Array.isArray(entries) ? entries.map(normalizeSolutionEntry) : []])
    )
}

const normalizeCommentsBySolution = (value) => {
    if (!value || typeof value !== 'object') return {}

    return Object.fromEntries(
        Object.entries(value).map(([key, entries]) => [key, Array.isArray(entries) ? entries : []])
    )
}

const safeReadState = () => {
    if (typeof window === 'undefined') return defaultState

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return defaultState
        const parsed = JSON.parse(raw)
        return {
            solutionsByProblem: normalizeSolutionsByProblem(parsed.solutionsByProblem),
            commentsBySolution: normalizeCommentsBySolution(parsed.commentsBySolution),
        }
    } catch {
        return defaultState
    }
}

const persistState = (state) => {
    if (typeof window === 'undefined') return

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            solutionsByProblem: state.solutionsByProblem,
            commentsBySolution: state.commentsBySolution,
        }))
    } catch {
        // ignore persistence failures
    }
}

const generateId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const keyForProblem = ({ problemId, domain }) => `${domain || 'DSA'}:${String(problemId)}`

const normalizeValue = (value) => String(value || '').trim().toLowerCase()

const normalizeUsername = (value = '') =>
    value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')

const buildIdentityKey = (identity = {}) => {
    const id = String(identity?.id || '').trim()
    if (id) return `id:${id}`

    const email = normalizeValue(identity?.email)
    if (email) return `email:${email}`

    const username = normalizeUsername(identity?.username || '')
    if (username) return `username:${username}`

    return null
}

const normalizeAuthor = (author = {}) => {
    const normalized = {
        id: author?.id ?? null,
        username: author?.username || 'anonymous',
        email: author?.email || null,
        displayName: author?.displayName || author?.username || 'Anonymous',
        avatar: author?.avatar || null,
    }

    return {
        ...normalized,
        identityKey: author?.identityKey || buildIdentityKey(normalized),
    }
}

const normalizeSolutionEntry = (solution = {}) => ({
    ...solution,
    author: normalizeAuthor(solution.author),
    authorIdentityKey: solution.authorIdentityKey || solution.author?.identityKey || buildIdentityKey(solution.author),
    upvotes: Array.isArray(solution.upvotes) ? solution.upvotes : [],
})

export const canManageSolution = (solution, actor) => {
    if (!solution || !actor) return false

    const ownerKey = solution.authorIdentityKey || solution.author?.identityKey || buildIdentityKey(solution.author)
    const actorKey = buildIdentityKey(actor)
    return !!ownerKey && !!actorKey && ownerKey === actorKey
}

const initial = safeReadState()

const useSolutionStore = create((set, get) => ({
    solutionsByProblem: initial.solutionsByProblem,
    commentsBySolution: initial.commentsBySolution,

    syncFromStorage: () => {
        const next = safeReadState()
        persistState(next)
        set({
            solutionsByProblem: next.solutionsByProblem,
            commentsBySolution: next.commentsBySolution,
        })
    },

    listSolutions: ({ problemId, domain }) => {
        const key = keyForProblem({ problemId, domain })
        return get().solutionsByProblem[key] || []
    },

    addSolution: ({ problemId, domain, author, language, title, explanation, code }) => {
        if (!problemId) return null
        const key = keyForProblem({ problemId, domain })
        const nextId = generateId()
        const now = new Date().toISOString()

        set((state) => {
            const prev = state.solutionsByProblem[key] || []
            const nextAuthor = normalizeAuthor(author)
            const nextSolution = normalizeSolutionEntry({
                id: nextId,
                problemId,
                domain,
                author: nextAuthor,
                authorIdentityKey: nextAuthor.identityKey,
                language: language || 'text',
                title: (title || '').trim() || 'Solution',
                explanation: (explanation || '').trim(),
                code: (code || '').trim(),
                createdAt: now,
                upvotes: [],
            })

            const nextState = {
                ...state,
                solutionsByProblem: {
                    ...state.solutionsByProblem,
                    [key]: [nextSolution, ...prev].slice(0, 300),
                },
            }
            persistState(nextState)
            return nextState
        })

        return nextId
    },

    deleteSolution: ({ problemId, domain, solutionId, actor, username, actorId, actorEmail }) => {
        if (!problemId || !solutionId) return false
        const key = keyForProblem({ problemId, domain })
        let didDelete = false

        set((state) => {
            const prev = state.solutionsByProblem[key] || []
            const target = prev.find((s) => s.id === solutionId)
            if (!target) return state

            const currentActor = actor || {
                id: actorId ?? null,
                email: actorEmail ?? null,
                username: username ?? null,
            }

            if (!canManageSolution(target, currentActor)) return state

            const nextSolutions = prev.filter((s) => s.id !== solutionId)
            const nextCommentsBySolution = { ...state.commentsBySolution }
            delete nextCommentsBySolution[solutionId]
            didDelete = true

            const nextState = {
                ...state,
                solutionsByProblem: {
                    ...state.solutionsByProblem,
                    [key]: nextSolutions,
                },
                commentsBySolution: nextCommentsBySolution,
            }
            persistState(nextState)
            return nextState
        })

        return didDelete
    },

    toggleUpvote: ({ problemId, domain, solutionId, username }) => {
        if (!problemId || !solutionId || !username) return
        const key = keyForProblem({ problemId, domain })

        set((state) => {
            const prev = state.solutionsByProblem[key] || []
            const idx = prev.findIndex((s) => s.id === solutionId)
            if (idx === -1) return state

            const next = [...prev]
            const target = { ...next[idx] }
            const upvotes = Array.isArray(target.upvotes) ? target.upvotes : []
            const has = upvotes.includes(username)
            target.upvotes = has ? upvotes.filter((u) => u !== username) : [...upvotes, username]
            next[idx] = target

            const nextState = {
                ...state,
                solutionsByProblem: {
                    ...state.solutionsByProblem,
                    [key]: next,
                },
            }
            persistState(nextState)
            return nextState
        })
    },

    listComments: (solutionId) => {
        if (!solutionId) return []
        return get().commentsBySolution[solutionId] || []
    },

    addComment: ({ solutionId, author, text }) => {
        if (!solutionId) return
        const trimmed = (text || '').trim()
        if (!trimmed) return

        set((state) => {
            const prev = state.commentsBySolution[solutionId] || []
            const nextComment = {
                id: generateId(),
                solutionId,
                author: {
                    id: author?.id ?? null,
                    username: author?.username || 'anonymous',
                    email: author?.email || null,
                    displayName: author?.displayName || author?.username || 'Anonymous',
                    avatar: author?.avatar || null,
                },
                text: trimmed,
                createdAt: new Date().toISOString(),
            }
            const nextState = {
                ...state,
                commentsBySolution: {
                    ...state.commentsBySolution,
                    [solutionId]: [...prev, nextComment].slice(-500),
                },
            }
            persistState(nextState)
            return nextState
        })
    },
}))

export default useSolutionStore
