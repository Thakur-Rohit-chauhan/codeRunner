import { create } from 'zustand'
import { mockProblems } from '../utils/mockData'

// Grab a deterministic set of problem ids to seed contests
const dsaIds  = mockProblems.filter(p => p.domain === 'DSA').map(p => p.id)
const ctfIds  = mockProblems.filter(p => p.domain === 'CTF').map(p => p.id)
const mlIds   = mockProblems.filter(p => p.domain === 'ML').map(p => p.id)

const seed = (ids, n) => ids.slice(0, n)

const initialContests = [
    {
        id: 'cr-weekly-142',
        title: 'CodeRunner Weekly #142',
        type: 'weekly',
        status: 'upcoming',
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString(),
        duration: 90,
        participants: 4812,
        problemIds: seed(dsaIds, 4),
        difficulty: 'Mixed',
        prizes: ['500 CR Coins', '250 CR Coins', '100 CR Coins'],
        tags: ['DSA', 'Algorithms'],
        createdBy: 'system',
        description: 'Our classic weekly contest. Four problems ranging from easy warm-ups to hard brain-teasers. Solve as many as possible within 90 minutes!',
        featured: true,
    },
    {
        id: 'cr-biweekly-68',
        title: 'Biweekly Contest #68',
        type: 'biweekly',
        status: 'upcoming',
        startTime: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 75,
        participants: 2341,
        problemIds: seed(dsaIds, 3),
        difficulty: 'Easy–Medium',
        prizes: ['250 CR Coins', '100 CR Coins', '50 CR Coins'],
        tags: ['Arrays', 'Strings'],
        createdBy: 'system',
        description: 'A more approachable contest — three problems for intermediate coders. Perfect for beginners looking to get their first rating.',
        featured: false,
    },
    {
        id: 'cr-cyber-cup-3',
        title: 'Cyber Security Cup III',
        type: 'special',
        status: 'upcoming',
        startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 180,
        participants: 1234,
        problemIds: seed(ctfIds, 3),
        difficulty: 'Hard',
        prizes: ['2000 CR Coins', '1000 CR Coins', '500 CR Coins'],
        tags: ['CTF', 'Cryptography', 'Binary'],
        createdBy: 'system',
        description: 'Push your binary exploitation and network forensics skills to the limit. A 3-hour CTF-style special event.',
        featured: true,
    },
    {
        id: 'cr-weekly-141',
        title: 'CodeRunner Weekly #141',
        type: 'weekly',
        status: 'past',
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 90,
        participants: 5120,
        problemIds: seed(dsaIds, 4),
        difficulty: 'Mixed',
        prizes: ['500 CR Coins', '250 CR Coins', '100 CR Coins'],
        tags: ['DSA', 'DP'],
        createdBy: 'system',
        description: 'Last week\'s contest. Dynamic programming and graph problems featured.',
        featured: false,
        results: { userRank: 143, userScore: 2100 },
    },
    {
        id: 'cr-biweekly-67',
        title: 'Biweekly Contest #67',
        type: 'biweekly',
        status: 'past',
        startTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 75,
        participants: 3876,
        problemIds: seed(dsaIds, 3),
        difficulty: 'Easy–Medium',
        prizes: ['250 CR Coins'],
        tags: ['Graphs', 'Trees'],
        createdBy: 'system',
        description: 'Biweekly #67 focused on tree traversals and BFS/DFS graph problems.',
        featured: false,
        results: { userRank: 88, userScore: 1850 },
    },
    {
        id: 'cr-ml-sprint-1',
        title: 'ML Sprint Challenge I',
        type: 'special',
        status: 'past',
        startTime: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 120,
        participants: 2210,
        problemIds: seed(mlIds, 2),
        difficulty: 'Medium–Hard',
        prizes: ['1500 CR Coins', '750 CR Coins', '300 CR Coins'],
        tags: ['ML', 'Statistics'],
        createdBy: 'system',
        description: 'Machine learning challenge covering regression models and neural network design patterns.',
        featured: false,
        results: null,
    },
]

// ── Store ─────────────────────────────────────────────────────────────────────
const useContestStore = create((set, get) => ({
    contests: initialContests,

    // User-created problems bank: full problem objects
    customProblems: [],

    // Per-contest registration status { [id]: bool }
    registered: {
        'cr-weekly-142': true,
        'cr-weekly-141': true,
        'cr-biweekly-67': true,
    },

    // Active attempt: { contestId, startedAt (ISO), answers: { [problemId]: code } }
    activeAttempt: null,

    // ── Actions ───────────────────────────────────────────────────────────────

    registerContest: (id) => set(s => ({
        registered: { ...s.registered, [id]: true },
        contests: s.contests.map(c => c.id === id
            ? { ...c, participants: c.participants + 1 }
            : c
        ),
    })),

    unregisterContest: (id) => set(s => ({
        registered: { ...s.registered, [id]: false },
        contests: s.contests.map(c => c.id === id
            ? { ...c, participants: Math.max(0, c.participants - 1) }
            : c
        ),
    })),

    addCustomProblem: (problemData) => {
        const id = `cp-${Date.now()}`
        const problem = {
            id,
            title: problemData.title,
            difficulty: problemData.difficulty || 'Medium',
            tags: problemData.tags || [],
            domain: 'DSA',
            acceptance: 'N/A',
            status: null,
            starred: false,
            lastSubmitted: null,
            // Full detail fields
            description: problemData.description || '',
            examples: problemData.examples || [],
            constraints: problemData.constraints || [],
            companies: [],
            starterCode: {
                python: `# ${problemData.title}\nclass Solution:\n    def solve(self):\n        # Write your solution here\n        pass`,
                cpp: `// ${problemData.title}\nclass Solution {\npublic:\n    void solve() {\n        // Write your solution here\n    }\n};`,
                java: `// ${problemData.title}\nclass Solution {\n    public void solve() {\n        // Write your solution here\n    }\n}`,
                javascript: `// ${problemData.title}\nvar solve = function() {\n    // Write your solution here\n};`,
                go: `// ${problemData.title}\nfunc solve() {\n    // Write your solution here\n}`,
            },
            testCases: problemData.testCases || [{ input: 'sample input', expectedOutput: 'sample output' }],
            isCustom: true,
        }
        set(s => ({ customProblems: [...s.customProblems, problem] }))
        return id
    },

    createContest: (data) => {
        const id = `cr-custom-${Date.now()}`
        const contest = {
            id,
            ...data,
            status: new Date(data.startTime) > new Date() ? 'upcoming' : 'active',
            participants: 1,
            createdBy: 'user',
            featured: false,
        }
        set(s => ({
            contests: [contest, ...s.contests],
            registered: { ...s.registered, [id]: true },
        }))
        return id
    },

    startAttempt: (contestId) => set({
        activeAttempt: { contestId, startedAt: new Date().toISOString(), answers: {} },
    }),

    saveAnswer: (problemId, code) => set(s => ({
        activeAttempt: s.activeAttempt
            ? { ...s.activeAttempt, answers: { ...s.activeAttempt.answers, [problemId]: code } }
            : null,
    })),

    endAttempt: () => set({ activeAttempt: null }),

    getContest: (id) => get().contests.find(c => c.id === id),
    isRegistered: (id) => !!get().registered[id],

    // Resolve problem objects for a contest (mixing mockProblems + customProblems)
    getProblemsForContest: (contest) => {
        if (!contest) return []
        const { customProblems } = get()
        return (contest.problemIds || []).map(id => {
            const custom = customProblems.find(cp => cp.id === id)
            if (custom) return custom
            return mockProblems.find(p => p.id === id) || null
        }).filter(Boolean)
    },
}))

export default useContestStore
