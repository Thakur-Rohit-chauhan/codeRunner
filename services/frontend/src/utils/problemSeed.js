import problemSeed from '../data/problemSeed.json'

const seedRecords = Array.isArray(problemSeed?.problems) ? problemSeed.problems : []
const seedTopics = Array.isArray(problemSeed?.topics) ? problemSeed.topics : []
const recordById = Object.fromEntries(seedRecords.map((problem) => [String(problem.id), problem]))

const clone = (value) => JSON.parse(JSON.stringify(value))

export const mergeProblemState = (problem, state = {}) => {
    if (!problem) return null

    return {
        id: problem.id,
        title: problem.title,
        domain: problem.domain,
        difficulty: problem.difficulty,
        acceptance: problem.acceptance,
        tags: Array.isArray(problem.tags) ? [...problem.tags] : [],
        companies: Array.isArray(problem.companies) ? [...problem.companies] : [],
        description: typeof problem.description === 'string' ? problem.description : '',
        examples: Array.isArray(problem.examples) ? clone(problem.examples) : [],
        constraints: Array.isArray(problem.constraints) ? [...problem.constraints] : [],
        starterCode: problem.starterCode && typeof problem.starterCode === 'object' ? clone(problem.starterCode) : {},
        testCases: Array.isArray(problem.testCases) ? clone(problem.testCases) : [],
        status: state.status ?? problem.defaultStatus ?? null,
        starred: state.starred ?? Boolean(problem.defaultStarred),
        lastSubmitted: state.lastSubmitted ?? problem.defaultLastSubmitted ?? null,
    }
}

export const seedProblemRecords = seedRecords
export const seedProblemTopics = seedTopics
export const seedProblemSummaries = seedRecords.map((problem) => mergeProblemState(problem))
export const seedProblemDetailsById = Object.fromEntries(
    seedRecords.map((problem) => [String(problem.id), mergeProblemState(problem)])
)

export const getSeedProblemRecord = (id) => recordById[String(id)] || null

export const getSeedProblemSummary = (id, state = {}) => {
    const problem = getSeedProblemRecord(id)
    if (!problem) return null

    const merged = mergeProblemState(problem, state)
    return {
        id: merged.id,
        title: merged.title,
        domain: merged.domain,
        difficulty: merged.difficulty,
        acceptance: merged.acceptance,
        tags: merged.tags,
        status: merged.status,
        starred: merged.starred,
        lastSubmitted: merged.lastSubmitted,
    }
}

export const getSeedProblemDetail = (id, state = {}) => mergeProblemState(getSeedProblemRecord(id), state)

export const getSeedProblemIdsByDomain = (domain) =>
    seedProblemSummaries.filter((problem) => problem.domain === domain).map((problem) => problem.id)
