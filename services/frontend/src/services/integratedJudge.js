import api from './api'

const MODE_BY_DOMAIN = {
    DSA: 'code',
    ML: 'ml',
    CTF: 'packet',
}

const ENDPOINT_BY_MODE = {
    code: '/submit/code',
    ml: '/submit/ml',
    packet: '/submit/packet',
}

const TERMINAL_STATUSES = new Set(['accepted', 'failed'])

let competitionCache = null
let competitionCachePromise = null

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

export function modeForDomain(domain = 'DSA') {
    return MODE_BY_DOMAIN[domain] || 'code'
}

async function loadCompetitionCache(refresh = false) {
    if (competitionCache && !refresh) return competitionCache
    if (competitionCachePromise && !refresh) return competitionCachePromise

    competitionCachePromise = api
        .get('/competitions')
        .then((response) => {
            const competitions = Array.isArray(response.data) ? response.data : []
            competitionCache = competitions
            competitionCachePromise = null
            return competitions
        })
        .catch((error) => {
            competitionCachePromise = null
            throw error
        })

    return competitionCachePromise
}

export async function resolveCompetitionForDomain(domain, { refresh = false } = {}) {
    const mode = modeForDomain(domain)
    const competitions = await loadCompetitionCache(refresh)
    const exactMatch = competitions.find((competition) => competition.mode === mode && competition.isActive)
        || competitions.find((competition) => competition.mode === mode)

    if (!exactMatch) {
        throw new Error(`No active ${mode} competition is available right now.`)
    }

    return exactMatch
}

function buildSubmitPayload({ mode, competitionId, sourceText, language, entrypoint, topology }) {
    if (mode === 'code') {
        return {
            competition_id: competitionId,
            language: language || 'python',
            source_code: sourceText,
        }
    }

    if (mode === 'ml') {
        return {
            competition_id: competitionId,
            entrypoint: entrypoint || 'train',
            notebook_payload: sourceText,
        }
    }

    return {
        competition_id: competitionId,
        topology: topology || 'namespace-demo',
        packet_script: sourceText,
    }
}

export async function waitForSubmission(submissionId, { intervalMs = 1200, timeoutMs = 45000 } = {}) {
    const startedAt = Date.now()

    while (Date.now() - startedAt < timeoutMs) {
        const response = await api.get(`/submission-status/${submissionId}`)
        const payload = response.data
        const normalizedStatus = String(payload?.status || '').toLowerCase()

        if (TERMINAL_STATUSES.has(normalizedStatus)) {
            return payload
        }

        await sleep(intervalMs)
    }

    throw new Error('Timed out while waiting for the judge to finish processing the submission.')
}

function formatRuntime(runtimeMs = 0) {
    if (!Number.isFinite(runtimeMs) || runtimeMs <= 0) return 'N/A'
    if (runtimeMs < 1000) return `${runtimeMs} ms`
    return `${(runtimeMs / 1000).toFixed(2)} s`
}

function formatMemory(memoryKb = 0) {
    if (!Number.isFinite(memoryKb) || memoryKb <= 0) return 'N/A'
    if (memoryKb >= 1024 * 1024) return `${(memoryKb / (1024 * 1024)).toFixed(2)} GB`
    if (memoryKb >= 1024) return `${(memoryKb / 1024).toFixed(1)} MB`
    return `${memoryKb} KB`
}

function buildCaseCounts(statusPayload) {
    const normalizedStatus = String(statusPayload?.status || '').toLowerCase()
    const passed = normalizedStatus === 'accepted'

    if (statusPayload?.submissionType === 'code') {
        const totalCases = 10
        const rawPassedCases = Number(statusPayload?.metrics?.tests_passed)
        const passedCases = Number.isFinite(rawPassedCases)
            ? Math.max(0, Math.min(totalCases, rawPassedCases))
            : (passed ? totalCases : 0)

        return { passedCases, totalCases }
    }

    if (statusPayload?.submissionType === 'ml' || statusPayload?.submissionType === 'packet') {
        const rawTotalCases = Number(statusPayload?.metrics?.tests_total)
        const totalCases = Number.isFinite(rawTotalCases) && rawTotalCases > 0 ? rawTotalCases : 1
        const rawPassedCases = Number(statusPayload?.metrics?.tests_passed)
        const passedCases = Number.isFinite(rawPassedCases)
            ? Math.max(0, Math.min(totalCases, rawPassedCases))
            : (passed ? totalCases : 0)
        return { passedCases, totalCases }
    }

    return { passedCases: 0, totalCases: 0 }
}

function buildStatusLabel(statusPayload) {
    const normalizedStatus = String(statusPayload?.status || '').toLowerCase()
    if (normalizedStatus === 'accepted') return 'Accepted'

    const detail = `${statusPayload?.stderr || ''} ${statusPayload?.lastError || ''}`.toLowerCase()

    if (detail.includes('time limit')) return 'Time Limit Exceeded'
    if (detail.includes('visible tests failed') || detail.includes('wrong answer') || detail.includes('validation failed')) {
        return 'Wrong Answer'
    }
    if (detail.includes('compilation')) return 'Compilation Error'
    return 'Runtime Error'
}

export function toJudgeResult(statusPayload) {
    const { passedCases, totalCases } = buildCaseCounts(statusPayload)
    const status = buildStatusLabel(statusPayload)

    return {
        status,
        stdout: statusPayload?.stdout || '',
        expected: '',
        stderr: statusPayload?.stderr || statusPayload?.lastError || '',
        time: formatRuntime(statusPayload?.runtimeMs),
        memory: formatMemory(statusPayload?.memoryKb),
        allPassed: String(status).toLowerCase() === 'accepted',
        passedCases,
        totalCases,
        cases: [],
    }
}

export async function submitIntegratedChallenge({
    domain,
    submissionType,
    sourceText,
    language = 'python',
    entrypoint,
    topology,
    problemId,
}) {
    const competition = await resolveCompetitionForDomain(domain)
    const mode = submissionType || competition.mode
    const endpoint = ENDPOINT_BY_MODE[mode]

    if (!endpoint) {
        throw new Error(`Unsupported competition mode: ${mode}`)
    }

    const payload = buildSubmitPayload({
        mode,
        competitionId: competition.id,
        sourceText,
        language,
        entrypoint,
        topology,
    })
    if (problemId) {
        payload.problem_id = problemId
    }
    const accepted = (await api.post(endpoint, payload)).data
    const statusPayload = await waitForSubmission(accepted.submissionId)

    return {
        competition,
        accepted,
        statusPayload,
        judgeResult: toJudgeResult(statusPayload),
    }
}

export async function fetchLeaderboardForDomain(domain, { limit = 10 } = {}) {
    const competition = await resolveCompetitionForDomain(domain)
    const response = await api.get('/leaderboard', {
        params: {
            competition_id: competition.id,
            limit,
        },
    })
    return response.data
}
