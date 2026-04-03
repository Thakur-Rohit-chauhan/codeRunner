import { useEffect, useMemo, useState } from 'react'
import { LogOut, RefreshCw, Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import useAuthStore from '../store/authStore'

const modeMeta = {
    code: { endpoint: '/submit/code', title: 'Code', accent: '#38bdf8' },
    ml: { endpoint: '/submit/ml', title: 'ML', accent: '#34d399' },
    packet: { endpoint: '/submit/packet', title: 'Packet', accent: '#f97316' },
}

const defaultDrafts = {
    code: { language: 'python', source_code: "def solve(data):\n    nums = list(map(int, data.split())) if data else []\n    return str(sum(nums))\n" },
    ml: { entrypoint: 'train', notebook_payload: "def train(dataset):\n    accuracy = 0.87\n    hidden_test_accuracy=0.87\n    return accuracy\n" },
    packet: { topology: 'namespace-demo', packet_script: "from scapy.all import IP, TCP\npacket = IP(dst='10.0.0.42')/TCP(flags='S')\n" },
}

function statusColor(status = '') {
    const normalized = status.toLowerCase()
    if (normalized === 'accepted') return '#34d399'
    if (normalized === 'running') return '#fbbf24'
    if (normalized === 'queued') return '#60a5fa'
    return '#f87171'
}

function buildPayload(mode, competitionId, drafts) {
    if (mode === 'code') return { competition_id: competitionId, language: drafts.code.language, source_code: drafts.code.source_code }
    if (mode === 'ml') return { competition_id: competitionId, entrypoint: drafts.ml.entrypoint, notebook_payload: drafts.ml.notebook_payload }
    return { competition_id: competitionId, topology: drafts.packet.topology, packet_script: drafts.packet.packet_script }
}

export default function IntegratedConsole() {
    const navigate = useNavigate()
    const user = useAuthStore((state) => state.user)
    const logout = useAuthStore((state) => state.logout)

    const [competitions, setCompetitions] = useState([])
    const [selectedId, setSelectedId] = useState(null)
    const [leaderboard, setLeaderboard] = useState(null)
    const [drafts, setDrafts] = useState(defaultDrafts)
    const [submissions, setSubmissions] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const selectedCompetition = useMemo(
        () => competitions.find((competition) => competition.id === selectedId) || competitions[0] || null,
        [competitions, selectedId]
    )
    const selectedMode = selectedCompetition?.mode || 'code'
    const meta = modeMeta[selectedMode]

    const loadCompetitions = async () => {
        const response = await api.get('/competitions')
        const items = response.data || []
        setCompetitions(items)
        if (!selectedId && items.length) setSelectedId(items[0].id)
        return items
    }

    const loadLeaderboard = async (competitionId) => {
        const response = await api.get('/leaderboard', { params: { competition_id: competitionId, limit: 10 } })
        setLeaderboard(response.data)
        return response.data
    }

    useEffect(() => {
        let cancelled = false
        const boot = async () => {
            setLoading(true)
            try {
                const items = await loadCompetitions()
                const firstId = items[0]?.id
                if (!cancelled && firstId) await loadLeaderboard(firstId)
            } catch (error) {
                if (!cancelled) toast.error(error.response?.data?.detail || 'Unable to load workspace')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        boot()
        return () => { cancelled = true }
    }, [])

    useEffect(() => {
        if (!selectedId) return
        loadLeaderboard(selectedId).catch((error) => {
            toast.error(error.response?.data?.detail || 'Unable to load leaderboard')
        })
    }, [selectedId])

    const updateDraft = (mode, field, value) => {
        setDrafts((current) => ({
            ...current,
            [mode]: { ...current[mode], [field]: value },
        }))
    }

    const mergeSubmission = (submissionId, nextValues) => {
        setSubmissions((current) => current.map((item) => (item.submissionId === submissionId ? { ...item, ...nextValues } : item)))
    }

    const pollSubmission = async (submissionId) => {
        for (let attempt = 0; attempt < 25; attempt += 1) {
            const response = await api.get(`/submission-status/${submissionId}`)
            const payload = response.data
            mergeSubmission(submissionId, payload)
            if (payload.status === 'accepted' || payload.status === 'failed') {
                await loadLeaderboard(payload.competitionId)
                return
            }
            await new Promise((resolve) => window.setTimeout(resolve, 1200))
        }
    }

    const handleRefresh = async () => {
        if (!selectedCompetition) return
        setRefreshing(true)
        try {
            await loadCompetitions()
            await loadLeaderboard(selectedCompetition.id)
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Unable to refresh data')
        } finally {
            setRefreshing(false)
        }
    }

    const handleSubmit = async () => {
        if (!selectedCompetition) return
        setSubmitting(true)
        try {
            const payload = buildPayload(selectedMode, selectedCompetition.id, drafts)
            const response = await api.post(meta.endpoint, payload)
            const queued = { ...response.data, competitionTitle: selectedCompetition.title, stdout: '', stderr: '', score: null }
            setSubmissions((current) => [queued, ...current].slice(0, 8))
            toast.success(`${meta.title} submission queued`)
            await pollSubmission(response.data.submissionId)
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Submission failed')
        } finally {
            setSubmitting(false)
        }
    }

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    if (loading) {
        return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0f172a', color: '#e2e8f0' }}>Loading integrated workspace...</div>
    }

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)', color: '#e2e8f0', padding: '28px 18px 40px' }}>
            <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'grid', gap: '20px' }}>
                <section style={{ padding: '24px', borderRadius: '24px', background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.16)', display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        <div style={{ fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#94a3b8' }}>Integrated Platform</div>
                        <div style={{ fontSize: '30px', fontWeight: 800 }}>Unified login, queueing, judging, and leaderboard flow</div>
                        <div style={{ color: '#cbd5e1', lineHeight: 1.7 }}>Signed in as <strong>{user?.displayName || user?.username}</strong>. Pick a competition, submit work, then watch Redis-driven workers update PostgreSQL results and the live leaderboard.</div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'start', flexWrap: 'wrap' }}>
                        <button onClick={handleRefresh} disabled={refreshing} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.62)', color: '#e2e8f0', cursor: refreshing ? 'default' : 'pointer' }}><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />Refresh</button>
                        <button onClick={handleLogout} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #f97316, #ef4444)', color: '#fff', cursor: 'pointer' }}><LogOut size={15} />Logout</button>
                    </div>
                </section>

                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    {competitions.map((competition) => (
                        <button
                            key={competition.id}
                            onClick={() => setSelectedId(competition.id)}
                            style={{
                                textAlign: 'left',
                                padding: '18px',
                                borderRadius: '20px',
                                border: competition.id === selectedCompetition?.id ? `1px solid ${modeMeta[competition.mode].accent}` : '1px solid rgba(148,163,184,0.14)',
                                background: 'rgba(15,23,42,0.84)',
                                color: '#e2e8f0',
                                display: 'grid',
                                gap: '8px',
                                cursor: 'pointer',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                <strong>{competition.title}</strong>
                                <span style={{ color: modeMeta[competition.mode].accent, fontSize: '12px', textTransform: 'uppercase' }}>{competition.mode}</span>
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.6 }}>{competition.description}</div>
                            <div style={{ fontSize: '12px', color: '#cbd5e1' }}>Difficulty: {competition.difficulty} · Max {competition.maxScore}</div>
                        </button>
                    ))}
                </section>

                {selectedCompetition && (
                    <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(320px, 0.9fr)', gap: '20px' }}>
                        <div style={{ padding: '22px', borderRadius: '24px', background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.16)', display: 'grid', gap: '14px' }}>
                            <div style={{ fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase', color: meta.accent }}>{meta.title} queue</div>
                            {selectedMode === 'code' && <input value={drafts.code.language} onChange={(event) => updateDraft('code', 'language', event.target.value)} style={{ padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(148,163,184,0.14)', background: '#020617', color: '#e2e8f0' }} />}
                            {selectedMode === 'ml' && <input value={drafts.ml.entrypoint} onChange={(event) => updateDraft('ml', 'entrypoint', event.target.value)} style={{ padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(148,163,184,0.14)', background: '#020617', color: '#e2e8f0' }} />}
                            {selectedMode === 'packet' && <input value={drafts.packet.topology} onChange={(event) => updateDraft('packet', 'topology', event.target.value)} style={{ padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(148,163,184,0.14)', background: '#020617', color: '#e2e8f0' }} />}
                            <textarea
                                value={selectedMode === 'code' ? drafts.code.source_code : selectedMode === 'ml' ? drafts.ml.notebook_payload : drafts.packet.packet_script}
                                onChange={(event) => updateDraft(selectedMode, selectedMode === 'code' ? 'source_code' : selectedMode === 'ml' ? 'notebook_payload' : 'packet_script', event.target.value)}
                                spellCheck={false}
                                rows={18}
                                style={{ width: '100%', minHeight: '360px', padding: '16px', borderRadius: '18px', border: '1px solid rgba(148,163,184,0.14)', background: '#020617', color: '#e2e8f0', fontFamily: '"JetBrains Mono", monospace', fontSize: '13px', lineHeight: 1.6 }}
                            />
                            <button onClick={handleSubmit} disabled={submitting} style={{ justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 18px', borderRadius: '16px', border: 'none', background: `linear-gradient(135deg, ${meta.accent}, #22c55e)`, color: '#04111d', fontWeight: 800, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1 }}><Trophy size={15} />{submitting ? 'Submitting...' : `Submit to ${selectedCompetition.title}`}</button>
                        </div>

                        <div style={{ display: 'grid', gap: '18px' }}>
                            <div style={{ padding: '22px', borderRadius: '24px', background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.16)', display: 'grid', gap: '12px' }}>
                                <div style={{ fontSize: '22px', fontWeight: 800 }}>Leaderboard</div>
                                {(leaderboard?.entries || []).map((entry) => (
                                    <div key={entry.userId} style={{ display: 'grid', gridTemplateColumns: '44px minmax(0, 1fr) auto', gap: '12px', alignItems: 'center', padding: '12px 14px', borderRadius: '16px', background: '#020617' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '12px', display: 'grid', placeItems: 'center', background: 'rgba(56,189,248,0.12)', color: '#38bdf8', fontWeight: 800 }}>#{entry.rank}</div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 700 }}>{entry.displayName}</div>
                                            <div style={{ color: '#94a3b8', fontSize: '13px' }}>@{entry.username} · {entry.submissions} submissions</div>
                                        </div>
                                        <div style={{ fontWeight: 800 }}>{entry.score.toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ padding: '22px', borderRadius: '24px', background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.16)', display: 'grid', gap: '12px' }}>
                                <div style={{ fontSize: '22px', fontWeight: 800 }}>Submission Status</div>
                                {submissions.length === 0 && <div style={{ color: '#94a3b8', lineHeight: 1.7 }}>No live submissions yet. Queue work from the left panel to watch the end-to-end pipeline update here.</div>}
                                {submissions.map((submission) => (
                                    <div key={submission.submissionId} style={{ padding: '14px', borderRadius: '18px', background: '#020617', display: 'grid', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                                            <strong>{submission.competitionTitle || selectedCompetition.title}</strong>
                                            <span style={{ color: statusColor(submission.status), textTransform: 'uppercase', fontWeight: 800 }}>{submission.status}</span>
                                        </div>
                                        <div style={{ color: '#94a3b8', fontSize: '13px' }}>{submission.submissionId}</div>
                                        {submission.score !== null && submission.score !== undefined && <div style={{ fontWeight: 700 }}>Score: {Number(submission.score).toFixed(2)}</div>}
                                        {submission.stdout && <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#cbd5e1', fontSize: '12px', fontFamily: '"JetBrains Mono", monospace' }}>{submission.stdout}</pre>}
                                        {submission.stderr && <div style={{ color: '#fca5a5', fontSize: '13px' }}>{submission.stderr}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </div>
    )
}
