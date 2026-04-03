function parseVerificationFlag(value) {
    if (value === undefined || value === null || value === '') return true
    return !['0', 'false', 'off', 'no'].includes(String(value).trim().toLowerCase())
}

export function isContestVerificationMode() {
    return parseVerificationFlag(import.meta.env?.VITE_FORCE_LIVE_CONTESTS)
}

export function getContestScheduledPhase(contest, now = Date.now()) {
    if (!contest?.startTime) return contest?.status || 'upcoming'

    const startTime = new Date(contest.startTime).getTime()
    if (Number.isNaN(startTime)) return contest?.status || 'upcoming'

    const durationMinutes = Math.max(Number(contest.duration) || 0, 0)
    const endTime = startTime + durationMinutes * 60 * 1000

    if (now < startTime) return 'upcoming'
    if (durationMinutes > 0 && now < endTime) return 'active'
    return 'past'
}

export function getContestPhase(contest, now = Date.now()) {
    if (!contest) return 'upcoming'
    if (isContestVerificationMode()) return 'active'
    return getContestScheduledPhase(contest, now)
}

export function isAccuracyContest(contest) {
    return contest?.ranking === 'accuracy' || contest?.domain === 'ML'
}

export function getContestStatusLabel(contest, now = Date.now()) {
    const phase = getContestPhase(contest, now)
    if (phase === 'past') return 'Ended'
    if (phase === 'active') return 'Live Now'
    return 'Upcoming'
}

export function getContestUserStats(contest, username) {
    if (!contest || !username) {
        return {
            rank: null,
            score: null,
            solved: null,
            accuracy: null,
            submissions: null,
            time: null,
            timeSeconds: null,
        }
    }

    const leaderboardRow = (contest.leaderboard || []).find((row) => row.name === username) || null
    const ownResults = contest.resultsUserName === username ? contest.results : null

    return {
        rank: leaderboardRow?.rank ?? ownResults?.userRank ?? null,
        score: leaderboardRow?.score ?? ownResults?.userScore ?? null,
        solved: leaderboardRow?.solved ?? ownResults?.userSolved ?? null,
        accuracy: leaderboardRow?.accuracy ?? ownResults?.userAccuracy ?? null,
        submissions: leaderboardRow?.submissions ?? ownResults?.userSubmissions ?? null,
        time: leaderboardRow?.time ?? ownResults?.userTime ?? null,
        timeSeconds: leaderboardRow?.timeSeconds ?? ownResults?.userTimeSeconds ?? null,
    }
}

export function parsePrizeValue(prize) {
    if (!prize || typeof prize !== 'string') return null
    const match = prize.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/)
    return match ? Number(match[1]) : null
}

export function getAggregatePrizePool(contests) {
    const prizeValues = (contests || [])
        .flatMap((contest) => contest.prizes || [])
        .map(parsePrizeValue)
        .filter((value) => Number.isFinite(value))

    return prizeValues.reduce((total, value) => total + value, 0)
}

export function getPrizeUnit(contests) {
    const prize = (contests || []).flatMap((contest) => contest.prizes || []).find(Boolean) || ''
    if (prize.includes('$')) return 'USD'
    if (/coin/i.test(prize)) return 'CR Coins'
    return ''
}
