import { create } from 'zustand'
import api from '../services/api'
import { buildStarterCodeMap } from '../utils/compilerLanguages'

const LOCAL_SUBMISSIONS_STORAGE_KEY = 'coderunner_problem_submissions_v1'
const LOCAL_PROBLEM_CATALOG_STORAGE_KEY = 'coderunner_problem_catalog_v2'

const defaultLocalState = {
    submissionsByUsername: {},
}

const defaultLocalCatalogState = {
    overridesById: {},
    deletedIds: [],
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

const safeReadLocalCatalogState = () => {
    if (typeof window === 'undefined') return defaultLocalCatalogState

    try {
        const raw = window.localStorage.getItem(LOCAL_PROBLEM_CATALOG_STORAGE_KEY)
        if (!raw) return defaultLocalCatalogState
        const parsed = JSON.parse(raw)
        return {
            overridesById: parsed?.overridesById && typeof parsed.overridesById === 'object' ? parsed.overridesById : {},
            deletedIds: Array.isArray(parsed?.deletedIds) ? parsed.deletedIds.map((id) => String(id)) : [],
        }
    } catch {
        return defaultLocalCatalogState
    }
}

const persistLocalCatalogState = (state) => {
    if (typeof window === 'undefined') return

    try {
        window.localStorage.setItem(LOCAL_PROBLEM_CATALOG_STORAGE_KEY, JSON.stringify({
            overridesById: state?.overridesById || {},
            deletedIds: state?.deletedIds || [],
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

const shouldFallbackToLocalProblemMutation = (error) => {
    if (!error) return false
    if (!error.response) return true
    return [404, 405, 500, 502, 503, 504].includes(error.response.status)
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
const initialLocalCatalogState = safeReadLocalCatalogState()
const initialProblemCatalog = applyLocalProblemMutations({
    problems: [],
    problemDetailsById: {},
    overridesById: initialLocalCatalogState.overridesById,
    deletedIds: initialLocalCatalogState.deletedIds,
})

const mergeProblemIntoState = (state, problem) => {
    if (!problem) return state

    const problemId = String(problem.id)
    const existingDetail = state.problemDetailsById[problemId] || {}
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

function applyLocalProblemMutations({ problems = [], problemDetailsById = {}, overridesById = {}, deletedIds = [] }) {
    const deletedSet = new Set((deletedIds || []).map((id) => String(id)))
    const nextProblemDetailsById = { ...problemDetailsById }
    const seenIds = new Set()

    deletedSet.forEach((problemId) => {
        delete nextProblemDetailsById[problemId]
    })

    const nextProblems = problems.reduce((accumulator, problem) => {
        const problemId = String(problem.id)
        if (deletedSet.has(problemId)) return accumulator

        const override = overridesById[problemId]
        const mergedProblem = override ? { ...problem, ...override } : problem
        seenIds.add(problemId)
        nextProblemDetailsById[problemId] = {
            ...(nextProblemDetailsById[problemId] || {}),
            ...mergedProblem,
        }
        accumulator.push(mergedProblem)
        return accumulator
    }, [])

    Object.entries(overridesById || {}).forEach(([problemId, override]) => {
        if (!override || deletedSet.has(problemId) || seenIds.has(problemId)) return
        nextProblems.unshift(override)
        nextProblemDetailsById[problemId] = {
            ...(nextProblemDetailsById[problemId] || {}),
            ...override,
        }
    })

    return {
        problems: nextProblems,
        problemDetailsById: nextProblemDetailsById,
    }
}

const removeProblemFromState = (state, problemId) => {
    const normalizedProblemId = String(problemId)
    const nextProblemDetailsById = { ...state.problemDetailsById }
    delete nextProblemDetailsById[normalizedProblemId]

    return {
        ...state,
        problems: state.problems.filter((entry) => String(entry.id) !== normalizedProblemId),
        problemDetailsById: nextProblemDetailsById,
        problemsByUsername: Object.fromEntries(
            Object.entries(state.problemsByUsername).map(([username, entries]) => [
                username,
                (entries || []).filter((entry) => String(entry.id) !== normalizedProblemId),
            ])
        ),
    }
}

const buildProblemMutationPayload = (problem = {}, current = null) => {
    const title = String(problem.title || current?.title || '').trim()
    const domain = problem.domain || current?.domain || 'DSA'
    const exampleInput = problem.exampleInput ?? problem.exInput ?? current?.examples?.[0]?.input ?? ''
    const exampleOutput = problem.exampleOutput ?? problem.exOutput ?? current?.examples?.[0]?.output ?? ''
    const rawTags = problem.tags ?? current?.tags ?? []
    const tags = Array.isArray(rawTags)
        ? rawTags
        : String(rawTags).split(',').map((tag) => tag.trim()).filter(Boolean)
    const rawConstraints = problem.constraints ?? problem.constraint ?? current?.constraints ?? []
    const constraints = Array.isArray(rawConstraints)
        ? rawConstraints
        : String(rawConstraints)
            .split('\n')
            .map((constraint) => constraint.trim())
            .filter(Boolean)

    return {
        title,
        domain,
        difficulty: problem.difficulty || current?.difficulty || 'Medium',
        acceptance: problem.acceptance || current?.acceptance || '0.0%',
        tags,
        description: problem.description ?? current?.description ?? '',
        examples: exampleInput || exampleOutput
            ? [{ input: exampleInput, output: exampleOutput, explanation: null }]
            : (current?.examples || []),
        constraints,
        starterCode: problem.starterCode || current?.starterCode || buildStarterCodeMap({ title, domain }),
        testCases: problem.testCases || current?.testCases || (
            exampleInput || exampleOutput
                ? [{ input: exampleInput, expectedOutput: exampleOutput || 'sample output' }]
                : [{ input: 'sample input', expectedOutput: 'sample output' }]
        ),
        companies: problem.companies || current?.companies || [],
    }
}

const buildLocalProblemRecord = (problemId, payload, current = null) => ({
    ...(current || {}),
    id: current?.id ?? problemId,
    title: payload.title,
    domain: payload.domain,
    difficulty: payload.difficulty,
    acceptance: payload.acceptance,
    tags: payload.tags,
    description: payload.description,
    examples: payload.examples,
    constraints: payload.constraints,
    starterCode: payload.starterCode,
    testCases: payload.testCases,
    companies: payload.companies,
    status: current?.status ?? null,
    starred: current?.starred ?? false,
    lastSubmitted: current?.lastSubmitted ?? null,
    isCustom: current?.isCustom ?? true,
})

const nextLocalProblemId = (state) => {
    const numericIds = [
        ...state.problems.map((problem) => Number(problem.id)),
        ...Object.keys(state.localProblemOverridesById || {}).map((problemId) => Number(problemId)),
    ].filter((value) => Number.isFinite(value))

    return (numericIds.length > 0 ? Math.max(...numericIds) : 0) + 1
}

const useProblemStore = create((set, get) => ({
    problems: initialProblemCatalog.problems,
    problemDetailsById: initialProblemCatalog.problemDetailsById,
    problemsByUsername: {},
    topics: [],
    localProblemOverridesById: initialLocalCatalogState.overridesById,
    localDeletedProblemIds: initialLocalCatalogState.deletedIds,
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
            const problems = Array.isArray(response.data?.problems) ? response.data.problems : []
            const topics = Array.isArray(response.data?.topics) ? response.data.topics : []

            set((state) => {
                const nextDetails = { ...state.problemDetailsById }
                problems.forEach((problem) => {
                    nextDetails[String(problem.id)] = {
                        ...(nextDetails[String(problem.id)] || {}),
                        ...problem,
                    }
                })

                const mutatedCatalog = applyLocalProblemMutations({
                    problems,
                    problemDetailsById: nextDetails,
                    overridesById: state.localProblemOverridesById,
                    deletedIds: state.localDeletedProblemIds,
                })

                return {
                    problems: mutatedCatalog.problems,
                    topics,
                    problemsByUsername: username ? {
                        ...state.problemsByUsername,
                        [username]: mutatedCatalog.problems,
                    } : state.problemsByUsername,
                    problemDetailsById: mutatedCatalog.problemDetailsById,
                    isSyncing: false,
                    syncError: null,
                    hasSynced: true,
                }
            })
        } catch {
            set({
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
            const baseProblems = Array.isArray(response.data?.problems) ? response.data.problems : []
            const mutatedProblems = applyLocalProblemMutations({
                problems: baseProblems,
                problemDetailsById: get().problemDetailsById,
                overridesById: get().localProblemOverridesById,
                deletedIds: get().localDeletedProblemIds,
            }).problems
            set((state) => ({
                problemsByUsername: {
                    ...state.problemsByUsername,
                    [username]: mutatedProblems,
                },
            }))
            return mutatedProblems
        } catch {
            return get().problemsByUsername[username] || []
        }
    },

    fetchProblemDetail: async (problemId, username) => {
        const normalizedProblemId = String(problemId)
        if (get().localDeletedProblemIds.includes(normalizedProblemId)) {
            return null
        }

        try {
            const response = await api.get(`/problem/problems/${problemId}`, {
                params: username ? { username } : undefined,
            })
            const localOverride = get().localProblemOverridesById[normalizedProblemId]
            const problem = response.data?.problem ? {
                ...response.data.problem,
                ...(localOverride || {}),
            } : null
            if (!problem) {
                return get().problemDetailsById[normalizedProblemId] || localOverride || null
            }

            set((state) => mergeProblemIntoState(state, problem))
            return {
                ...(get().problemDetailsById[normalizedProblemId] || {}),
                ...problem,
            }
        } catch {
            return get().problemDetailsById[normalizedProblemId]
                || get().localProblemOverridesById[normalizedProblemId]
                || null
        }
    },

    createProblem: async (problemData = {}) => {
        const payload = buildProblemMutationPayload(problemData)
        try {
            const response = await api.post('/problem/problems', payload)
            const problem = response.data?.problem
            if (!problem) return null

            set((state) => {
                const nextOverridesById = {
                    ...state.localProblemOverridesById,
                    [String(problem.id)]: problem,
                }
                const nextDeletedProblemIds = state.localDeletedProblemIds.filter((id) => id !== String(problem.id))
                persistLocalCatalogState({
                    overridesById: nextOverridesById,
                    deletedIds: nextDeletedProblemIds,
                })
                return {
                    ...mergeProblemIntoState(state, problem),
                    localProblemOverridesById: nextOverridesById,
                    localDeletedProblemIds: nextDeletedProblemIds,
                }
            })
            return problem
        } catch (error) {
            if (!shouldFallbackToLocalProblemMutation(error)) {
                throw error
            }

            const problemId = nextLocalProblemId(get())
            const fallbackProblem = buildLocalProblemRecord(problemId, payload)
            set((state) => {
                const nextOverridesById = {
                    ...state.localProblemOverridesById,
                    [String(problemId)]: fallbackProblem,
                }
                const nextDeletedProblemIds = state.localDeletedProblemIds.filter((id) => id !== String(problemId))
                persistLocalCatalogState({
                    overridesById: nextOverridesById,
                    deletedIds: nextDeletedProblemIds,
                })
                return {
                    ...mergeProblemIntoState(state, fallbackProblem),
                    localProblemOverridesById: nextOverridesById,
                    localDeletedProblemIds: nextDeletedProblemIds,
                }
            })
            return fallbackProblem
        }
    },

    updateProblem: async (problemId, updates = {}) => {
        const current = get().problemDetailsById[String(problemId)] || null
        const payload = buildProblemMutationPayload(updates, current)
        try {
            const response = await api.put(`/problem/problems/${problemId}`, payload)
            const problem = response.data?.problem
            if (!problem) return current

            set((state) => {
                const nextOverridesById = {
                    ...state.localProblemOverridesById,
                    [String(problem.id)]: problem,
                }
                const nextDeletedProblemIds = state.localDeletedProblemIds.filter((id) => id !== String(problem.id))
                persistLocalCatalogState({
                    overridesById: nextOverridesById,
                    deletedIds: nextDeletedProblemIds,
                })
                return {
                    ...mergeProblemIntoState(state, problem),
                    localProblemOverridesById: nextOverridesById,
                    localDeletedProblemIds: nextDeletedProblemIds,
                }
            })
            return problem
        } catch (error) {
            if (!shouldFallbackToLocalProblemMutation(error)) {
                throw error
            }

            const fallbackProblem = buildLocalProblemRecord(problemId, payload, current)
            set((state) => {
                const nextOverridesById = {
                    ...state.localProblemOverridesById,
                    [String(problemId)]: fallbackProblem,
                }
                const nextDeletedProblemIds = state.localDeletedProblemIds.filter((id) => id !== String(problemId))
                persistLocalCatalogState({
                    overridesById: nextOverridesById,
                    deletedIds: nextDeletedProblemIds,
                })
                return {
                    ...mergeProblemIntoState(state, fallbackProblem),
                    localProblemOverridesById: nextOverridesById,
                    localDeletedProblemIds: nextDeletedProblemIds,
                }
            })
            return fallbackProblem
        }
    },

    deleteProblem: async (problemId) => {
        try {
            await api.delete(`/problem/problems/${problemId}`)
        } catch (error) {
            if (!shouldFallbackToLocalProblemMutation(error)) {
                throw error
            }
        }

        set((state) => {
            const nextOverridesById = { ...state.localProblemOverridesById }
            delete nextOverridesById[String(problemId)]
            const nextDeletedProblemIds = Array.from(new Set([
                ...state.localDeletedProblemIds,
                String(problemId),
            ]))
            persistLocalCatalogState({
                overridesById: nextOverridesById,
                deletedIds: nextDeletedProblemIds,
            })
            return {
                ...removeProblemFromState(state, problemId),
                localProblemOverridesById: nextOverridesById,
                localDeletedProblemIds: nextDeletedProblemIds,
            }
        })
        return true
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

        const current = get().problemDetailsById[String(problemId)] || { id: problemId }
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

            const fallbackProblem = get().problemDetailsById[String(problemId)] || { id: problemId, title: 'Untitled problem', domain: 'DSA' }
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
