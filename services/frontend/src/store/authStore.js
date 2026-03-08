import { create } from 'zustand'

const useAuthStore = create((set) => ({
    user: null,
    token: null,
    isAuthenticated: false,

    login: (userData, token) => set({
        user: userData,
        token,
        isAuthenticated: true,
    }),

    logout: () => set({
        user: null,
        token: null,
        isAuthenticated: false,
    }),

    // Mock login for development
    mockLogin: () => set({
        user: {
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
        },
        token: 'mock-jwt-token-xyz',
        isAuthenticated: true,
    }),
}))

export default useAuthStore
