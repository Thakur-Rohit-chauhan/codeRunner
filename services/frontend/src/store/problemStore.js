import { create } from 'zustand'
import api from '../services/api'
import {
    getSeedProblemDetail,
    seedProblemDetailsById,
    seedProblemSummaries,
    seedProblemTopics,
} from '../utils/problemSeed'

const LOCAL_SUBMISSIONS_STORAGE_KEY = 'coderunner_problem_submissions_v1'

const defaultLocalState = {
    submissionsByUsername: {},
}

const safeReadLocalState = () => {
    if (typeof window === 'undefined') return defaultLocalState

    try {
        const raw = window.localStorage.getItem(LOCAL_SUBMISSIONS_STORAGE_KEY)
        if (!raw) return defaultLocalState
        const parsed = JSON.parse(raw)
        return {
            submissionsByUsername: parsed?.submissionsByUsername || {},
        }
    } catch {
        return defaultLocalState
    }
}

const persistLocalState = (state) => {
    if (typeof window === 'undefined') return

    try {
        window.localStorage.setItem(LOCAL_SUBMISSIONS_STORAGE_KEY, JSON.stringify({
            submissionsByUsername: state?.submissionsByUsername || {},
        }))
    } catch {
        // Ignore persistence failures and keep the in-memory store usable.
    }
}

const sortSubmissions = (submissions = []) => (
    [...submissions].sort((left, right) => {
        const leftTime = new Date(left?.submittedAt || 0).getTime()
        const rightTime = new Date(right?.submittedAt || 0).getTime()
        return rightTime - leftTime
    })
)

const buildSubmissionIdentity = (submission = {}) => (
    submission.id ||
    [
        submission.problemId,
        submission.problemTitle,
        submission.language,
        submission.status,
        submission.submittedAt,
    ].join(':')
)

const mergeSubmissionLists = (...lists) => {
    const merged = new Map()

    lists.flat().forEach((submission) => {
        if (!submission) return
        merged.set(buildSubmissionIdentity(submission), submission)
    })

    return sortSubmissions(Array.from(merged.values())).slice(0, 250)
}

const shouldFallbackToLocalSubmission = (error) => {
    if (!error) return false
    if (!error.response) return true
    return [500, 502, 503, 504].includes(error.response.status)
}

const createLocalSubmissionFallback = (problem, payload, error) => {
    const submittedAt = new Date().toISOString()
    const detail = error?.response?.data?.detail || error?.message || 'Judge request failed'
    const normalizedProblem = problem || {}

    return {
        problem: {
            ...(normalizedProblem || {}),
            id: normalizedProblem.id ?? payload.problemId,
            status: 'attempted',
            lastSubmitted: submittedAt,
        },
        result: {
            status: 'Runtime Error',
            stdout: '',
            expected: '',
            stderr: detail,
            time: 'N/A',
            memory: 'N/A',
            allPassed: false,
            cases: [],
        },
        submission: {
            id: `offline-${normalizedProblem.id ?? payload.problemId}-${Date.now()}`,
            problemId: normalizedProblem.id ?? payload.problemId,
            problemTitle: normalizedProblem.title || 'Untitled problem',
            domain: normalizedProblem.domain || 'DSA',
            status: 'Runtime Error',
            language: payload.language || 'python',
            runtime: 'N/A',
            memory: 'N/A',
            stdout: '',
            expected: '',
            stderr: detail,
            allPassed: false,
            passedCases: 0,
            totalCases: 0,
            cases: [],
            submittedAt,
        },
    }
}

const initialLocalState = safeReadLocalState()

const mergeProblemIntoState = (state, problem) => {
    if (!problem) return state

    const problemId = String(problem.id)
    const existingDetail = state.problemDetailsById[problemId] || getSeedProblemDetail(problem.id)
    const nextDetail = {
        ...(existingDetail || {}),
        ...problem,
    }

    const existingIndex = state.problems.findIndex((entry) => String(entry.id) === problemId)
    const nextProblems = existingIndex >= 0
        ? state.problems.map((entry, index) => (index === existingIndex ? { ...entry, ...problem } : entry))
        : [...state.problems, problem]

    return {
        ...state,
        problems: nextProblems,
        problemDetailsById: {
            ...state.problemDetailsById,
            [problemId]: nextDetail,
        },
    }
}

const useProblemStore = create((set, get) => ({
    problems: seedProblemSummaries,
    problemDetailsById: seedProblemDetailsById,
    problemsByUsername: {},
    topics: seedProblemTopics,
    submissionsByUsername: initialLocalState.submissionsByUsername,
    isSyncing: false,
    syncError: null,
    hasSynced: false,

    syncProblems: async (username) => {
        set({ isSyncing: true, syncError: null })

        try {
            const response = await api.get('/problem/problems', {
                params: username ? { username } : undefined,
            })
            const problems = Array.isArray(response.data?.problems) ? response.data.problems : seedProblemSummaries
            const topics = Array.isArray(response.data?.topics) ? response.data.topics : seedProblemTopics

            set((state) => {
                const nextDetails = { ...state.problemDetailsById }
                problems.forEach((problem) => {
                    const fallback = getSeedProblemDetail(problem.id)
                    nextDetails[String(problem.id)] = {
                        ...(fallback || {}),
                        ...problem,
                    }
                })

                return {
                    problems,
                    topics,
                    problemsByUsername: username ? {
                        ...state.problemsByUsername,
                        [username]: problems,
                    } : state.problemsByUsername,
                    problemDetailsById: nextDetails,
                    isSyncing: false,
                    syncError: null,
                    hasSynced: true,
                }
            })
        } catch {
            set({
                problems: seedProblemSummaries,
                topics: seedProblemTopics,
                isSyncing: false,
                syncError: 'Unable to sync problems from the backend.',
                hasSynced: true,
            })
        }
    },

    syncProblemsForUser: async (username) => {
        if (!username) return []

        try {
            const response = await api.get('/problem/problems', {
                params: { username },
            })
            const problems = Array.isArray(response.data?.problems) ? response.data.problems : seedProblemSummaries
            set((state) => ({
                problemsByUsername: {
                    ...state.problemsByUsername,
                    [username]: problems,
                },
            }))
            return problems
        } catch {
            return get().problemsByUsername[username] || []
        }
    },

    fetchProblemDetail: async (problemId, username) => {
        try {
            const response = await api.get(`/problem/problems/${problemId}`, {
                params: username ? { username } : undefined,
            })
            const problem = response.data?.problem
            if (!problem) {
                return get().problemDetailsById[String(problemId)] || getSeedProblemDetail(problemId)
            }

            set((state) => mergeProblemIntoState(state, problem))
            return {
                ...(get().problemDetailsById[String(problemId)] || {}),
                ...problem,
            }
        } catch {
            return get().problemDetailsById[String(problemId)] || getSeedProblemDetail(problemId)
        }
    },

    syncUserSubmissions: async (username) => {
        if (!username) return []

        try {
            const response = await api.get(`/problem/users/${username}/submissions`)
            const submissions = Array.isArray(response.data?.submissions)
                ? mergeSubmissionLists(response.data.submissions, get().submissionsByUsername[username] || [])
                : sortSubmissions(get().submissionsByUsername[username] || [])
            set((state) => ({
                submissionsByUsername: (() => {
                    const nextSubmissionsByUsername = {
                        ...state.submissionsByUsername,
                        [username]: submissions,
                    }
                    persistLocalState({ submissionsByUsername: nextSubmissionsByUsername })
                    return nextSubmissionsByUsername
                })(),
            }))
            return submissions
        } catch {
            const submissions = sortSubmissions(get().submissionsByUsername[username] || [])
            set((state) => ({
                submissionsByUsername: (() => {
                    const nextSubmissionsByUsername = {
                    ...state.submissionsByUsername,
                    [username]: submissions,
                    }
                    persistLocalState({ submissionsByUsername: nextSubmissionsByUsername })
                    return nextSubmissionsByUsername
                })(),
            }))
            return submissions
        }
    },

    toggleBookmark: async (problemId, username) => {
        if (!username) return null

        const current = get().problemDetailsById[String(problemId)] || getSeedProblemDetail(problemId)
        const nextStarred = !current?.starred

        set((state) => mergeProblemIntoState(state, {
            ...(current || {}),
            id: current?.id ?? problemId,
            starred: nextStarred,
        }))
        set((state) => ({
            problemsByUsername: {
                ...state.problemsByUsername,
                [username]: (state.problemsByUsername[username] || state.problems).map((entry) =>
                    String(entry.id) === String(problemId)
                        ? { ...entry, starred: nextStarred }
                        : entry
                ),
            },
        }))

        try {
            const response = await api.post(`/problem/problems/${problemId}/bookmark`, {
                username,
                starred: nextStarred,
            })
            const problem = response.data?.problem
            if (problem) {
                set((state) => mergeProblemIntoState(state, problem))
                set((state) => ({
                    problemsByUsername: {
                        ...state.problemsByUsername,
                        [username]: (state.problemsByUsername[username] || state.problems).map((entry) =>
                            String(entry.id) === String(problem.id)
                                ? { ...entry, ...problem }
                                : entry
                        ),
                    },
                }))
                return problem
            }
        } catch {
            set((state) => mergeProblemIntoState(state, current))
            set((state) => ({
                problemsByUsername: {
                    ...state.problemsByUsername,
                    [username]: (state.problemsByUsername[username] || state.problems).map((entry) =>
                        String(entry.id) === String(problemId)
                            ? { ...entry, ...current }
                            : entry
                    ),
                },
            }))
        }

        return get().problemDetailsById[String(problemId)] || current
    },

    runProblem: async (problemId, payload = {}) => {
        const response = await api.post(`/problem/problems/${problemId}/run`, payload)
        return response.data?.result || null
    },

    submitProblem: async (problemId, payload = {}) => {
        const username = payload.username

        try {
            const response = await api.post(`/problem/problems/${problemId}/submit`, payload)
            const problem = response.data?.problem
            const submission = response.data?.submission
            const submissions = Array.isArray(response.data?.submissions)
                ? sortSubmissions(response.data.submissions)
                : null

            if (problem) {
                set((state) => mergeProblemIntoState(state, problem))
            }

            if (username) {
                set((state) => {
                    const previous = state.submissionsByUsername[username] || []
                    const next = submissions || mergeSubmissionLists(previous, submission ? [submission] : [])
                    const previousProblems = state.problemsByUsername[username] || state.problems
                    const nextProblems = problem
                        ? previousProblems.map((entry) => (String(entry.id) === String(problem.id) ? { ...entry, ...problem } : entry))
                        : previousProblems
                    const nextSubmissionsByUsername = {
                        ...state.submissionsByUsername,
                        [username]: next,
                    }
                    persistLocalState({ submissionsByUsername: nextSubmissionsByUsername })

                    return {
                        problemsByUsername: {
                            ...state.problemsByUsername,
                            [username]: nextProblems,
                        },
                        submissionsByUsername: nextSubmissionsByUsername,
                    }
                })
            }

            return {
                result: response.data?.result || null,
                submission,
                problem: problem || null,
            }
        } catch (error) {
            if (!username || !shouldFallbackToLocalSubmission(error)) {
                throw error
            }

            const fallbackProblem = get().problemDetailsById[String(problemId)] || getSeedProblemDetail(problemId)
            const fallback = createLocalSubmissionFallback(
                { ...fallbackProblem, id: fallbackProblem?.id ?? problemId },
                { ...payload, problemId },
                error
            )

            set((state) => {
                const mergedState = mergeProblemIntoState(state, fallback.problem)
                const previous = state.submissionsByUsername[username] || []
                const nextSubmissions = mergeSubmissionLists(previous, [fallback.submission])
                const currentProblems = state.problemsByUsername[username] || mergedState.problems
                const nextProblems = currentProblems.map((entry) =>
                    String(entry.id) === String(fallback.problem.id)
                        ? { ...entry, ...fallback.problem }
                        : entry
                )
                const nextSubmissionsByUsername = {
                    ...state.submissionsByUsername,
                    [username]: nextSubmissions,
                }
                persistLocalState({ submissionsByUsername: nextSubmissionsByUsername })

                return {
                    ...mergedState,
                    problemsByUsername: {
                        ...state.problemsByUsername,
                        [username]: nextProblems,
                    },
                    submissionsByUsername: nextSubmissionsByUsername,
                }
            })

            return fallback
        }
    },
}))

export default useProblemStore
