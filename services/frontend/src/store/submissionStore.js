import { create } from 'zustand'

const STORAGE_KEY = 'coderunner_submissions_v1'

const defaultState = {
    submissionsByUser: {},
}

const safeReadState = () => {
    if (typeof window === 'undefined') return defaultState

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return defaultState
        const parsed = JSON.parse(raw)
        return {
            submissionsByUser: parsed.submissionsByUser || {},
        }
    } catch {
        return defaultState
    }
}

const persistState = (state) => {
    if (typeof window === 'undefined') return

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            submissionsByUser: state.submissionsByUser,
        }))
    } catch {
        // ignore persistence failures
    }
}

const generateId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const initialState = safeReadState()

const useSubmissionStore = create((set, get) => ({
    submissionsByUser: initialState.submissionsByUser,

    addSubmission: (username, submission) => {
        if (!username) return

        set((state) => {
            const prev = state.submissionsByUser[username] || []
            const nextSubmission = {
                id: submission.id || generateId(),
                submittedAt: submission.submittedAt || new Date().toISOString(),
                ...submission,
            }
            const next = [nextSubmission, ...prev].slice(0, 250)
            const nextState = {
                submissionsByUser: {
                    ...state.submissionsByUser,
                    [username]: next,
                },
            }
            persistState(nextState)
            return nextState
        })
    },

    clearUserSubmissions: (username) => {
        if (!username) return

        set((state) => {
            const nextState = {
                submissionsByUser: {
                    ...state.submissionsByUser,
                    [username]: [],
                },
            }
            persistState(nextState)
            return nextState
        })
    },
}))

export default useSubmissionStore

