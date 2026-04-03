const DEFAULT_STATUS_META = {
    color: '#94a3b8',
    bg: 'rgba(148,163,184,0.12)',
    border: 'rgba(148,163,184,0.18)',
    dotColor: '#94a3b8',
}

export function normalizeSubmissionStatus(status) {
    return String(status || '').trim()
}

export function isAcceptedSubmission(status) {
    return normalizeSubmissionStatus(status).toLowerCase() === 'accepted'
}

export function getSubmissionStatusMeta(status) {
    const normalized = normalizeSubmissionStatus(status).toLowerCase()

    if (normalized === 'accepted') {
        return {
            color: '#34d399',
            bg: 'rgba(52,211,153,0.12)',
            border: 'rgba(52,211,153,0.2)',
            dotColor: '#34d399',
        }
    }

    if (normalized === 'finished' || normalized === 'completed') {
        return {
            color: '#60a5fa',
            bg: 'rgba(96,165,250,0.12)',
            border: 'rgba(96,165,250,0.2)',
            dotColor: '#60a5fa',
        }
    }

    if (normalized.includes('wrong answer')) {
        return {
            color: '#f87171',
            bg: 'rgba(248,113,113,0.12)',
            border: 'rgba(248,113,113,0.2)',
            dotColor: '#f87171',
        }
    }

    if (normalized.includes('time limit')) {
        return {
            color: '#fbbf24',
            bg: 'rgba(251,191,36,0.12)',
            border: 'rgba(251,191,36,0.2)',
            dotColor: '#fbbf24',
        }
    }

    if (normalized.includes('memory limit')) {
        return {
            color: '#fb923c',
            bg: 'rgba(251,146,60,0.12)',
            border: 'rgba(251,146,60,0.2)',
            dotColor: '#fb923c',
        }
    }

    if (normalized.includes('compilation')) {
        return {
            color: '#f59e0b',
            bg: 'rgba(245,158,11,0.12)',
            border: 'rgba(245,158,11,0.2)',
            dotColor: '#f59e0b',
        }
    }

    if (normalized.includes('runtime') || normalized.includes('error')) {
        return {
            color: '#c084fc',
            bg: 'rgba(192,132,252,0.12)',
            border: 'rgba(192,132,252,0.2)',
            dotColor: '#c084fc',
        }
    }

    return DEFAULT_STATUS_META
}

export function buildCaseSummary(submission) {
    const totalCases = Number(submission?.totalCases)
    const passedCases = Number(submission?.passedCases)

    if (!Number.isFinite(totalCases) || totalCases <= 0) {
        return null
    }

    const safePassed = Number.isFinite(passedCases)
        ? Math.max(0, Math.min(totalCases, passedCases))
        : 0

    return `${safePassed}/${totalCases} cases passed`
}

export function countSubmissionStatuses(submissions = []) {
    const byStatus = {}

    submissions.forEach((submission) => {
        const status = normalizeSubmissionStatus(submission?.status) || 'Unknown'
        byStatus[status] = (byStatus[status] || 0) + 1
    })

    const entries = Object.entries(byStatus).sort((left, right) => {
        if (right[1] !== left[1]) return right[1] - left[1]
        return left[0].localeCompare(right[0])
    })

    return {
        total: submissions.length,
        accepted: submissions.filter((submission) => isAcceptedSubmission(submission?.status)).length,
        failed: submissions.filter((submission) => !isAcceptedSubmission(submission?.status)).length,
        entries,
    }
}
