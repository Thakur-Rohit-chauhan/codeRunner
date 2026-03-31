import { create } from 'zustand'
import { mockProblems } from '../utils/mockData'
import { buildStarterCodeMap } from '../utils/compilerLanguages'

// Grab a deterministic set of problem ids to seed contests
const dsaIds  = mockProblems.filter(p => p.domain === 'DSA').map(p => p.id)
const ctfIds  = mockProblems.filter(p => p.domain === 'CTF').map(p => p.id)
const mlIds   = mockProblems.filter(p => p.domain === 'ML').map(p => p.id)

const seed = (ids, n) => ids.slice(0, n)

const scoreLeaderboard = (rows) => rows
    .slice()
    .sort((a, b) => {
        if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0)
        if ((b.solved || 0) !== (a.solved || 0)) return (b.solved || 0) - (a.solved || 0)
        return (a.timeSeconds ?? 0) - (b.timeSeconds ?? 0)
    })
    .map((row, index) => ({ ...row, rank: index + 1 }))

const accuracyLeaderboard = (rows) => rows
    .slice()
    .sort((a, b) => {
        if ((b.accuracy || 0) !== (a.accuracy || 0)) return (b.accuracy || 0) - (a.accuracy || 0)
        return (a.timeSeconds ?? 0) - (b.timeSeconds ?? 0)
    })
    .map((row, index) => ({ ...row, rank: index + 1 }))

const rankContestLeaderboard = (contest, rows) => {
    const ranking = contest.ranking || (contest.domain === 'ML' ? 'accuracy' : 'score')
    return ranking === 'accuracy' ? accuracyLeaderboard(rows) : scoreLeaderboard(rows)
}

const seededScoreRows = [
    { name: 'alex_coder', country: '🇺🇸', score: 4200, solved: 4, time: '1h 12m', timeSeconds: 4320 },
    { name: 'devMaster99', country: '🇮🇳', score: 3900, solved: 4, time: '1h 28m', timeSeconds: 5280 },
    { name: 'rushikesh_r', country: '🇮🇳', score: 3500, solved: 3, time: '58m', timeSeconds: 3480 },
    { name: 'codewizard22', country: '🇩🇪', score: 3200, solved: 3, time: '1h 05m', timeSeconds: 3900 },
    { name: 'algo_queen', country: '🇬🇧', score: 2800, solved: 3, time: '1h 20m', timeSeconds: 4800 },
]

const seededCyberRows = [
    { name: 'packetghost', country: '🇸🇬', score: 5100, solved: 3, time: '1h 18m', timeSeconds: 4680 },
    { name: 'hexhunter', country: '🇮🇳', score: 4700, solved: 3, time: '1h 32m', timeSeconds: 5520 },
    { name: 'root_kitten', country: '🇺🇸', score: 4200, solved: 2, time: '59m', timeSeconds: 3540 },
    { name: 'shellshift', country: '🇩🇪', score: 3900, solved: 2, time: '1h 11m', timeSeconds: 4260 },
]

const seededMlRows = [
    { name: 'visionary_ai', country: '🇺🇸', accuracy: 0.9342, submissions: 11, time: '47m', timeSeconds: 2820 },
    { name: 'tensortrail', country: '🇮🇳', accuracy: 0.9218, submissions: 9, time: '54m', timeSeconds: 3240 },
    { name: 'bertbuilder', country: '🇬🇧', accuracy: 0.9087, submissions: 8, time: '1h 09m', timeSeconds: 4140 },
    { name: 'gradboosted', country: '🇩🇪', accuracy: 0.8925, submissions: 7, time: '1h 16m', timeSeconds: 4560 },
]

const initialContests = [
    {
        id: 'cr-weekly-142',
        title: 'CodeRunner Weekly #142',
        domain: 'DSA',
        ranking: 'score',
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
        leaderboard: rankContestLeaderboard({ domain: 'DSA', ranking: 'score' }, seededScoreRows),
    },
    {
        id: 'cr-biweekly-68',
        title: 'Biweekly Contest #68',
        domain: 'DSA',
        ranking: 'score',
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
        leaderboard: rankContestLeaderboard({ domain: 'DSA', ranking: 'score' }, seededScoreRows.slice(0, 4)),
    },
    {
        id: 'cr-cyber-cup-3',
        title: 'Cyber Security Cup III',
        domain: 'CTF',
        ranking: 'score',
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
        leaderboard: rankContestLeaderboard({ domain: 'CTF', ranking: 'score' }, seededCyberRows),
    },
    {
        id: 'cr-weekly-141',
        title: 'CodeRunner Weekly #141',
        domain: 'DSA',
        ranking: 'score',
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
        leaderboard: rankContestLeaderboard({ domain: 'DSA', ranking: 'score' }, seededScoreRows),
    },
    {
        id: 'cr-biweekly-67',
        title: 'Biweekly Contest #67',
        domain: 'DSA',
        ranking: 'score',
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
        leaderboard: rankContestLeaderboard({ domain: 'DSA', ranking: 'score' }, seededScoreRows.slice(0, 4)),
    },
    {
        id: 'cr-ml-sprint-1',
        title: 'ML Sprint Challenge I',
        domain: 'ML',
        ranking: 'accuracy',
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
        results: { userRank: 19, userAccuracy: 0.8842 },
        leaderboard: rankContestLeaderboard({ domain: 'ML', ranking: 'accuracy' }, seededMlRows),
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
        const domain = problemData.domain || 'DSA'
        const problem = {
            id,
            title: problemData.title,
            difficulty: problemData.difficulty || 'Medium',
            tags: problemData.tags || [],
            domain,
            acceptance: 'N/A',
            status: null,
            starred: false,
            lastSubmitted: null,
            // Full detail fields
            description: problemData.description || '',
            examples: problemData.examples || [],
            constraints: problemData.constraints || [],
            companies: [],
            starterCode: buildStarterCodeMap({ title: problemData.title, domain }),
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
            ranking: data.ranking || (data.domain === 'ML' ? 'accuracy' : 'score'),
            status: new Date(data.startTime) > new Date() ? 'upcoming' : 'active',
            participants: 1,
            createdBy: 'user',
            featured: false,
            leaderboard: [],
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

    recordContestResult: (contestId, submission) => set(s => ({
        contests: s.contests.map(contest => {
            if (contest.id !== contestId) return contest

            const ranking = contest.ranking || (contest.domain === 'ML' ? 'accuracy' : 'score')
            const leaderboard = [...(contest.leaderboard || [])]
            const existingIndex = leaderboard.findIndex(row => row.name === submission.name)
            const existing = existingIndex >= 0 ? leaderboard[existingIndex] : null

            let nextRow
            if (ranking === 'accuracy') {
                const candidateAccuracy = submission.accuracy || 0
                const keepExistingMetric = existing && (existing.accuracy || 0) > candidateAccuracy
                const keepExistingTime = existing && (existing.accuracy || 0) === candidateAccuracy && (existing.timeSeconds ?? Infinity) <= (submission.timeSeconds ?? Infinity)
                nextRow = keepExistingMetric || keepExistingTime
                    ? { ...existing, submissions: Math.max(existing?.submissions || 0, submission.submissions || 0) }
                    : {
                        name: submission.name,
                        country: submission.country || existing?.country || '🌍',
                        accuracy: candidateAccuracy,
                        submissions: submission.submissions || existing?.submissions || 0,
                        time: submission.time,
                        timeSeconds: submission.timeSeconds ?? 0,
                    }
            } else {
                const candidateScore = submission.score || 0
                const keepExistingMetric = existing && (existing.score || 0) > candidateScore
                const keepExistingTime = existing && (existing.score || 0) === candidateScore && (existing.timeSeconds ?? Infinity) <= (submission.timeSeconds ?? Infinity)
                nextRow = keepExistingMetric || keepExistingTime
                    ? { ...existing, solved: Math.max(existing?.solved || 0, submission.solved || 0) }
                    : {
                        name: submission.name,
                        country: submission.country || existing?.country || '🌍',
                        score: candidateScore,
                        solved: submission.solved || 0,
                        time: submission.time,
                        timeSeconds: submission.timeSeconds ?? 0,
                    }
            }

            if (existingIndex >= 0) leaderboard.splice(existingIndex, 1, nextRow)
            else leaderboard.push(nextRow)

            const ranked = rankContestLeaderboard(contest, leaderboard)
            const userRow = ranked.find(row => row.name === submission.name)

            return {
                ...contest,
                leaderboard: ranked,
                results: ranking === 'accuracy'
                    ? { ...contest.results, userRank: userRow?.rank, userAccuracy: userRow?.accuracy }
                    : { ...contest.results, userRank: userRow?.rank, userScore: userRow?.score },
            }
        }),
    })),

    getContest: (id) => get().contests.find(c => c.id === id),
    isRegistered: (id) => !!get().registered[id],
    getLeaderboard: (id) => get().contests.find(c => c.id === id)?.leaderboard || [],

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
