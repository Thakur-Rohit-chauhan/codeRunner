import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MapPin, Github, Linkedin, Edit, Eye, MessageSquare, ThumbsUp, Award, Flame, Calendar, Clock, FileText, CheckSquare, Star, Briefcase, GraduationCap, Twitter, Link2, Gift, X } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Navbar from '../components/Navbar/Navbar'
import useAuthStore from '../store/authStore'
import useContestStore from '../store/contestStore'
import useSocialStore, { computeFollowStats } from '../store/socialStore'
import useSubmissionStore from '../store/submissionStore'
import { mockProblems } from '../utils/mockData'

/* ── shared glassmorphism card style ── */
const glassCard = {
    background: 'rgba(20, 24, 32, 0.55)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
}

const glassCardHover = {
    ...glassCard,
    transition: 'all 0.3s ease',
}

function formatRelativeTime(isoString) {
    if (!isoString) return 'Not submitted'

    const diffMs = Date.now() - new Date(isoString).getTime()
    const minutes = Math.floor(diffMs / (1000 * 60))

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`

    const days = Math.floor(hours / 24)
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`

    const months = Math.floor(days / 30)
    if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`

    const years = Math.floor(months / 12)
    return `${years} year${years === 1 ? '' : 's'} ago`
}

const pad2 = (value) => String(value).padStart(2, '0')

const toLocalDateKey = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

const parseLocalDateKey = (key) => {
    if (!key) return null
    const parts = String(key).split('-').map((value) => Number(value))
    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null
    const [year, month, day] = parts
    return new Date(year, month - 1, day)
}

const buildHeatmapDataFromSubmissions = (submissions = []) => {
    // Use local noon to avoid DST boundaries and UTC date shifting.
    const today = new Date()
    today.setHours(12, 0, 0, 0)

    const countsByDate = {}
    submissions.forEach((submission) => {
        const timestamp = submission?.submittedAt
        if (!timestamp) return
        const date = new Date(timestamp)
        if (Number.isNaN(date.getTime())) return

        const key = toLocalDateKey(date)
        countsByDate[key] = (countsByDate[key] || 0) + 1
    })

    const data = []
    for (let i = 365; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const key = toLocalDateKey(d)
        data.push({ date: key, count: countsByDate[key] || 0 })
    }

    return data
}

/* ── Heatmap ── */
function ActivityHeatmap({ data }) {
    const [tooltip, setTooltip] = useState(null)

    const { weeks, monthLabels } = useMemo(() => {
        const w = []
        let week = new Array(7).fill(null)
        const labels = [] // { month, weekIndex }
        let lastMonth = -1

        // Pad so the first day lands on the correct weekday column
        const firstDay = parseLocalDateKey(data[0]?.date) || new Date()
        const firstDayOfWeek = firstDay.getDay() // 0=Sun

        // Fill leading nulls
        for (let d = 0; d < firstDayOfWeek; d++) {
            week[d] = null
        }

        let weekIdx = 0
        data.forEach((entry) => {
            const date = parseLocalDateKey(entry.date) || new Date()
            const dow = date.getDay()
            const month = date.getMonth()

            if (dow === 0 && week.some(x => x !== null)) {
                w.push(week)
                weekIdx++
                week = new Array(7).fill(null)
            }

            week[dow] = entry

            if (month !== lastMonth) {
                labels.push({ month: date.toLocaleString('default', { month: 'short' }), weekIndex: weekIdx })
                lastMonth = month
            }
        })
        if (week.some(x => x !== null)) w.push(week)

        return { weeks: w, monthLabels: labels }
    }, [data])

    const getColor = (count) => {
        if (!count || count === 0) return 'rgba(255,255,255,0.04)'
        if (count <= 2) return '#0e4429'
        if (count <= 4) return '#006d32'
        if (count <= 6) return '#26a641'
        return '#39d353'
    }

    const CELL = 11
    const GAP = 2

    return (
        <div style={{ position: 'relative' }}>
            {/* Tooltip */}
            {tooltip && (
                <div style={{
                    position: 'fixed',
                    left: tooltip.x + 12,
                    top: tooltip.y - 48,
                    backgroundColor: '#1e2330',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: '#e5e7eb',
                    zIndex: 9999,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                }}>
                    <div style={{ fontWeight: 600, color: tooltip.count > 0 ? '#39d353' : '#9ca3af' }}>
                        {tooltip.count} submission{tooltip.count !== 1 ? 's' : ''}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>{tooltip.date}</div>
                </div>
            )}

            <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 'max-content' }}>
                    {/* Month labels */}
                    <div style={{ marginBottom: '6px', position: 'relative', height: '16px' }}>
                        {monthLabels.map((ml, i) => (
                            <span key={i} style={{
                                position: 'absolute',
                                left: `${ml.weekIndex * (CELL + GAP)}px`,
                                top: 0,
                                fontSize: '11px',
                                color: '#6b7280',
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                            }}>{ml.month}</span>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: `${GAP}px` }}>
                        {weeks.map((week, wi) => (
                            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: `${GAP}px` }}>
                                {week.map((day, di) =>
                                    day ? (
                                        <div
                                            key={day.date}
                                            style={{
                                                width: `${CELL}px`, height: `${CELL}px`, borderRadius: '3px',
                                                backgroundColor: getColor(day.count),
                                                border: '1px solid rgba(255,255,255,0.03)',
                                                transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                                                cursor: 'pointer',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (day.count <= 0) return
                                                e.currentTarget.style.transform = 'scale(1.25)'
                                                e.currentTarget.style.borderColor = 'rgba(57, 211, 83, 0.35)'
                                                e.currentTarget.style.boxShadow = '0 0 10px rgba(57, 211, 83, 0.35)'
                                                const rect = e.currentTarget.getBoundingClientRect()
                                                const parsed = parseLocalDateKey(day.date) || new Date()
                                                setTooltip({
                                                    x: rect.left,
                                                    y: rect.top,
                                                    count: day.count,
                                                    date: parsed.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                                                })
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'scale(1)'
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)'
                                                e.currentTarget.style.boxShadow = 'none'
                                                setTooltip(null)
                                            }}
                                        />
                                    ) : (
                                        <div key={`empty-${wi}-${di}`} style={{ width: `${CELL}px`, height: `${CELL}px` }} />
                                    )
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ── Donut — LeetCode style ── */
function SolvedDonut({ difficultyStats, totalProblems, totalSolved }) {
    const data = [
        { name: 'Easy', color: '#34d399', solved: difficultyStats.Easy?.solved || 0, total: difficultyStats.Easy?.total || 0 },
        { name: 'Medium', color: '#fbbf24', solved: difficultyStats.Medium?.solved || 0, total: difficultyStats.Medium?.total || 0 },
        { name: 'Hard', color: '#f87171', solved: difficultyStats.Hard?.solved || 0, total: difficultyStats.Hard?.total || 0 },
    ]

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Donut */}
            <div style={{ position: 'relative', width: '140px', height: '140px', flexShrink: 0 }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={44} outerRadius={62} paddingAngle={3} dataKey="solved" stroke="none">
                            {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                }}>
                    <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{totalSolved}</span>
                    <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>/{totalProblems}</span>
                    <span style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>Solved</span>
                </div>
            </div>

            {/* Difficulty breakdown — LeetCode style */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {data.map(({ name, color, solved, total }) => {
                    const pct = total > 0 ? (solved / total) * 100 : 0
                    return (
                        <div key={name}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{
                                    fontSize: '12px', fontWeight: 600, color,
                                    padding: '2px 10px', borderRadius: '10px',
                                    backgroundColor: `${color}15`,
                                }}>{name}</span>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb' }}>
                                    {solved}<span style={{ color: '#6b7280', fontWeight: 400 }}>/{total}</span>
                                </span>
                            </div>
                            {/* Progress bar */}
                            <div style={{
                                height: '6px', borderRadius: '3px',
                                backgroundColor: 'rgba(255,255,255,0.06)',
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    height: '100%', borderRadius: '3px',
                                    backgroundColor: color,
                                    width: `${pct}%`,
                                    transition: 'width 0.6s ease',
                                }} />
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

/* ─── Public Profile Stub ─── */
function PublicProfile({ username }) {
    const navigate = useNavigate()
    const currentUser = useAuthStore((state) => state.user)
    const { profiles, followingByUser, syncProfile, followProfile, unfollowProfile } = useSocialStore()
    // Generate deterministic stats from the username string
    const seed = username.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const rating   = 1200 + (seed % 1400)
    const rank     = `#${1000 + (seed % 50000)}`
    const solved   = 50 + (seed % 400)
    const streak   = 5 + (seed % 60)
    const initials = username.slice(0, 2).toUpperCase()
    const gradients = [
        'linear-gradient(135deg,#34d399,#059669)',
        'linear-gradient(135deg,#60a5fa,#2563eb)',
        'linear-gradient(135deg,#f59e0b,#d97706)',
        'linear-gradient(135deg,#c084fc,#7c3aed)',
        'linear-gradient(135deg,#f87171,#dc2626)',
    ]
    const gradient = gradients[seed % gradients.length]
    const followStats = useMemo(
        () => computeFollowStats(username, profiles, followingByUser),
        [username, profiles, followingByUser]
    )
    const isFollowingProfile = !!currentUser?.username && (followingByUser[currentUser.username] || []).includes(username)

    useEffect(() => {
        syncProfile(username)
    }, [syncProfile, username])

    useEffect(() => {
        if (!currentUser?.username) return

        syncProfile(currentUser.username, {
            displayName: currentUser.displayName,
            avatar: currentUser.avatar || null,
            followersBase: currentUser.followers || 0,
            followingBase: currentUser.following || 0,
        })
    }, [currentUser?.avatar, currentUser?.displayName, currentUser?.followers, currentUser?.following, currentUser?.username, syncProfile])

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0b0f19,#161b22)', color: '#e5e7eb', fontFamily: '"Inter","Roboto",sans-serif' }}>
            <Navbar />
            <div style={{ maxWidth: '700px', margin: '0 auto', padding: '48px 32px' }}>
                <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '32px', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '13.5px', fontWeight: 600, fontFamily: 'inherit', padding: 0 }}>
                    ← Back
                </button>

                {/* Avatar + Name */}
                <div style={{ background: 'rgba(20,24,32,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '36px', textAlign: 'center', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: gradient }} />
                    <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 700, color: '#fff', margin: '0 auto 16px', boxShadow: '0 0 30px rgba(52,211,153,0.2)' }}>{initials}</div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f1f5f9', marginBottom: '4px' }}>{username}</h1>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>@{username}</p>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 14px', borderRadius: '20px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
                        <Award style={{ width: '13px', height: '13px', color: '#fbbf24' }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#fbbf24' }}>Coder</span>
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '14px',
                        marginTop: '18px',
                        flexWrap: 'wrap',
                    }}>
                        {[
                            { label: 'Followers', value: followStats.followers, tab: 'followers' },
                            { label: 'Following', value: followStats.following, tab: 'following' },
                        ].map((item) => (
                            <button
                                key={item.label}
                                onClick={() => navigate(`/profile/${encodeURIComponent(username)}/connections?tab=${item.tab}`)}
                                style={{
                                    border: 'none',
                                    background: 'rgba(255,255,255,0.04)',
                                    borderRadius: '12px',
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    color: '#d1d5db',
                                    fontFamily: 'inherit',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                                }}
                            >
                                <span style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>{item.value.toLocaleString()}</span>
                                <span style={{ color: '#6b7280', fontSize: '13px', marginLeft: '4px' }}>{item.label}</span>
                            </button>
                        ))}
                    </div>
                    {currentUser?.username && (
                        <button
                            onClick={() => {
                                if (isFollowingProfile) {
                                    unfollowProfile(currentUser.username, username)
                                } else {
                                    followProfile(currentUser.username, username)
                                }
                            }}
                            style={{
                                marginTop: '18px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '10px 18px',
                                borderRadius: '12px',
                                background: isFollowingProfile
                                    ? 'rgba(255,255,255,0.05)'
                                    : 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(59,130,246,0.16))',
                                border: `1px solid ${isFollowingProfile ? 'rgba(255,255,255,0.08)' : 'rgba(52,211,153,0.24)'}`,
                                color: isFollowingProfile ? '#d1d5db' : '#34d399',
                                fontSize: '13.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)'
                                e.currentTarget.style.boxShadow = isFollowingProfile
                                    ? '0 8px 20px rgba(255,255,255,0.05)'
                                    : '0 10px 24px rgba(52,211,153,0.12)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = 'none'
                            }}
                        >
                            {isFollowingProfile ? 'Following' : 'Follow'}
                        </button>
                    )}
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
                    {[
                        { label: 'Rating', value: rating.toLocaleString(), color: '#34d399' },
                        { label: 'Rank', value: rank, color: '#60a5fa' },
                        { label: 'Solved', value: solved, color: '#fbbf24' },
                        { label: 'Streak', value: `${streak}d`, color: '#f87171' },
                    ].map(({ label, value, color }) => (
                        <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '18px 12px', textAlign: 'center' }}>
                            <p style={{ fontSize: '22px', fontWeight: 700, color, marginBottom: '4px' }}>{value}</p>
                            <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>{label}</p>
                        </div>
                    ))}
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '20px 24px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                    <p>Full profile data is only available for registered users.</p>
                    <p style={{ marginTop: '6px', fontSize: '13px' }}>Challenge <strong style={{ color: '#e5e7eb' }}>{username}</strong> in a contest!</p>
                </div>
            </div>
        </div>
    )
}

/* ─── Profile Page ─── */
export default function Profile() {
    const viewerUser = useAuthStore((state) => state.user)
    const userDirectory = useAuthStore((state) => state.users)
    const contests = useContestStore((state) => state.contests)
    const { profiles, followingByUser, syncProfile, followProfile, unfollowProfile } = useSocialStore()
    const submissionsByUser = useSubmissionStore((state) => state.submissionsByUser)
    const { username } = useParams()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('recent')
    const [isSubmissionPanelOpen, setIsSubmissionPanelOpen] = useState(false)
    const [profileData, setProfileData] = useState(viewerUser)

    const profileUsername = username || viewerUser?.username || ''
    const userSubmissions = submissionsByUser?.[profileUsername] || []
    const isOwnProfile = profileUsername === viewerUser?.username
    const profileUser = isOwnProfile ? viewerUser : (userDirectory?.[profileUsername] || null)

    useEffect(() => {
        if (!profileUser) return
        const heatmap = profileUser.heatmap !== undefined ? profileUser.heatmap : true
        const recentAC = profileUser.recentAC !== undefined ? profileUser.recentAC : true
        setProfileData({ ...profileUser, heatmap, recentAC })
    }, [profileUser])

    useEffect(() => {
        if (!profileUser?.username) return

        syncProfile(profileUser.username, {
            displayName: profileData?.displayName || profileUser.displayName,
            avatar: profileData?.avatar || profileUser.avatar || null,
        })
    }, [
        profileData?.avatar,
        profileData?.displayName,
        profileUser?.avatar,
        profileUser?.displayName,
        profileUser?.username,
        syncProfile,
    ])

    if (!profileUser || !profileData || !viewerUser) {
        return (
            <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0b0f19 0%, #161b22 100%)', color: '#e5e7eb', fontFamily: '"Inter", \"Roboto\", sans-serif' }}>
                <Navbar />
                <div style={{ maxWidth: '920px', margin: '0 auto', padding: '48px 32px' }}>
                    <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '18px', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '13.5px', fontWeight: 600, fontFamily: 'inherit', padding: 0 }}>
                        ← Back
                    </button>
                    <div style={{ ...glassCard, padding: '28px', textAlign: 'center' }}>
                        <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                            {profileUsername ? `User "${profileUsername}" was not found in the local user database.` : 'User not found.'}
                        </p>
                        <p style={{ marginTop: '10px', color: '#6b7280', fontSize: '13px' }}>
                            Create an account for this username (Register) to make it appear here.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    const directoryUsernameSet = useMemo(() => new Set(Object.keys(userDirectory || {})), [userDirectory])

    const ownFollowStats = useMemo(() => {
        const followers = Object.entries(followingByUser).reduce((count, [followerUsername, targets]) => {
            if (!directoryUsernameSet.has(followerUsername)) return count
            return targets.includes(profileUser.username) ? count + 1 : count
        }, 0)
        const following = (followingByUser[profileUser.username] || [])
            .filter((candidate) => directoryUsernameSet.has(candidate)).length
        const profile = profiles[profileUser.username] || {
            username: profileUser.username,
            displayName: profileUser.displayName,
            avatar: profileUser.avatar || null,
        }

        return { followers, following, profile }
    }, [directoryUsernameSet, followingByUser, profileUser.avatar, profileUser.displayName, profileUser.username, profiles])

    const isFollowingProfile = !isOwnProfile && (followingByUser[viewerUser.username] || []).includes(profileUser.username)

    const customSkillsArray = profileData.skills ? profileData.skills.split(',').map(s => s.trim()).filter(Boolean) : []
    const dynamicSkills = useMemo(() => {
        const counts = {}
        mockProblems.forEach(p => {
            if (p.status === 'solved') {
                p.tags.forEach(tag => {
                    counts[tag] = (counts[tag] || 0) + 1
                })
            }
        })
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
        const tiers = [
            { tier: 'Advanced', color: '#f87171', items: [] },
            { tier: 'Intermediate', color: '#fbbf24', items: [] },
            { tier: 'Fundamental', color: '#34d399', items: [] },
        ]
        sorted.forEach(([name, count], index) => {
            if (index < 3) tiers[2].items.push({ name, count }) // Fundamental
            else if (index < 6) tiers[1].items.push({ name, count }) // Intermediate
            else tiers[0].items.push({ name, count }) // Advanced
        })
        return tiers.filter(t => t.items.length > 0)
    }, [])

    const tabs = [
        { id: 'recent', label: 'Recent AC', icon: <Clock style={{ width: '14px', height: '14px' }} /> },
        { id: 'list', label: 'List', icon: <FileText style={{ width: '14px', height: '14px' }} /> },
        { id: 'solutions', label: 'Solutions', icon: <CheckSquare style={{ width: '14px', height: '14px' }} /> },
    ]

    // Generate heatmap data from the actual submission history for this profile.
    const heatmapData = useMemo(() => buildHeatmapDataFromSubmissions(userSubmissions), [userSubmissions])

    const problemSummary = useMemo(() => {
        const difficulties = {
            Easy: { total: 0, solved: 0 },
            Medium: { total: 0, solved: 0 },
            Hard: { total: 0, solved: 0 },
        }
        const domains = {}
        let solved = 0
        let attempted = 0

        mockProblems.forEach((problem) => {
            if (!difficulties[problem.difficulty]) {
                difficulties[problem.difficulty] = { total: 0, solved: 0 }
            }
            difficulties[problem.difficulty].total += 1

            if (!domains[problem.domain]) {
                domains[problem.domain] = { total: 0, solved: 0, attempted: 0 }
            }
            domains[problem.domain].total += 1

            if (problem.status === 'solved') {
                solved += 1
                difficulties[problem.difficulty].solved += 1
                domains[problem.domain].solved += 1
            }

            if (problem.status === 'attempted') {
                attempted += 1
                domains[problem.domain].attempted += 1
            }
        })

        return {
            total: mockProblems.length,
            solved,
            attempted,
            difficulties,
            domains,
        }
    }, [])

    const activeDays = heatmapData.filter(d => d.count > 0).length
    const totalSubmissions = heatmapData.reduce((acc, d) => acc + d.count, 0)

    // Compute max streak dynamically from heatmap data
    const maxStreak = useMemo(() => {
        let currentStreak = 0
        let best = 0
        heatmapData.forEach(d => {
            if (d.count > 0) {
                currentStreak++
                if (currentStreak > best) best = currentStreak
            } else {
                currentStreak = 0
            }
        })
        return best
    }, [heatmapData])

    const contestInsights = useMemo(() => {
        const participatedContests = [...contests]
            .filter((contest) => contest.status === 'past')
            .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))

        const summarizeContests = (items) => {
            if (items.length === 0) {
                return {
                    rating: 1200,
                    globalRanking: 0,
                    totalPopulation: 0,
                    attended: 0,
                    topPercent: 0,
                }
            }

            const performance = items.map((contest) => {
                const totalParticipants = Math.max(contest.participants || 0, contest.leaderboard?.length || 0, 1)
                const leaderboardRow = (contest.leaderboard || []).find((row) => row.name === profileUser.username) || null
                const rawRank = contest.results && isOwnProfile ? contest.results.userRank : leaderboardRow?.rank
                const userRank = Math.min(rawRank || totalParticipants, totalParticipants)
                const percentile = totalParticipants > 1
                    ? 1 - ((userRank - 1) / (totalParticipants - 1))
                    : 1

                let metricScore = 0
                if ((contest.ranking || 'score') === 'accuracy') {
                    const accuracy = contest.results && isOwnProfile ? contest.results.userAccuracy : leaderboardRow?.accuracy
                    metricScore = Math.round((accuracy || 0) * 100)
                } else {
                    const topScore = Math.max(contest.leaderboard?.[0]?.score || 0, 1)
                    const userScore = contest.results && isOwnProfile ? contest.results.userScore : leaderboardRow?.score
                    metricScore = Math.round(((userScore || 0) / topScore) * 100)
                }

                return {
                    contest,
                    totalParticipants,
                    percentile,
                    metricScore,
                    userRank,
                }
            })
                .filter((entry) => Number.isFinite(entry.userRank))

            if (performance.length === 0) {
                return {
                    rating: 1200,
                    globalRanking: 0,
                    totalPopulation: 0,
                    attended: 0,
                    topPercent: 0,
                    history: [{ date: 'Start', rating: 1200, title: 'No contests yet', rank: null }],
                }
            }

            const avgPercentile = performance.reduce((sum, item) => sum + item.percentile, 0) / performance.length
            const avgMetricScore = performance.reduce((sum, item) => sum + item.metricScore, 0) / performance.length
            const totalPopulation = performance.reduce((sum, item) => sum + item.totalParticipants, 0)
            const rating = Math.round(700 + avgPercentile * 1000 + items.length * 15 + avgMetricScore)
            const globalRanking = Math.max(1, Math.round((1 - avgPercentile) * totalPopulation))
            const topPercent = Number(((globalRanking / Math.max(totalPopulation, 1)) * 100).toFixed(1))

            return {
                rating,
                globalRanking,
                totalPopulation,
                attended: performance.length,
                topPercent,
            }
        }

        const participated = participatedContests.filter((contest) => {
            if (contest.results && isOwnProfile) return contest.results.userRank || contest.results.userScore || contest.results.userAccuracy
            return (contest.leaderboard || []).some((row) => row.name === profileUser.username)
        })

        const summary = summarizeContests(participated)
        const history = participated.map((contest, index) => {
            const snapshot = summarizeContests(participated.slice(0, index + 1))
            return {
                date: new Date(contest.startTime).toLocaleDateString('en-US', { month: 'short' }),
                rating: snapshot.rating,
                title: contest.title,
                rank: contest.results && isOwnProfile
                    ? contest.results.userRank || null
                    : (contest.leaderboard || []).find((row) => row.name === profileUser.username)?.rank || null,
            }
        })

        return {
            ...summary,
            history: history.length > 0 ? history : [{ date: 'Start', rating: summary.rating, title: 'No contests yet', rank: null }],
        }
    }, [contests, isOwnProfile, profileUser.username])

    const languageStats = useMemo(() => {
        const langs = profileUser.languages || []
        return [...langs].sort((a, b) => (b.count || 0) - (a.count || 0))
    }, [profileUser.languages])

    const problemLookup = useMemo(
        () => new Map(mockProblems.map((problem) => [problem.title, problem])),
        []
    )

    const recentSubmissionRows = useMemo(() => (
        userSubmissions.map((submission) => {
            const linkedProblem = submission.problemId
                ? { id: submission.problemId }
                : problemLookup.get(submission.problemTitle)
            const status = submission.status || 'Unknown'
            const runtime = submission.runtime || ''

            return {
                id: `recent-${submission.id}`,
                title: submission.problemTitle || 'Untitled problem',
                subtitle: `${submission.language || '—'} • ${status}${runtime ? ` • ${runtime}` : ''}`,
                time: formatRelativeTime(submission.submittedAt),
                dotColor: status.toLowerCase() === 'accepted' ? '#34d399' : '#f87171',
                href: linkedProblem ? `/problems/${linkedProblem.id}` : null,
            }
        })
    ), [problemLookup, userSubmissions])

    const bookmarkedRows = useMemo(() => (
        mockProblems
            .filter((problem) => problem.starred)
            .sort((a, b) => {
                if (!a.lastSubmitted && !b.lastSubmitted) return a.id - b.id
                if (!a.lastSubmitted) return 1
                if (!b.lastSubmitted) return -1
                return new Date(b.lastSubmitted) - new Date(a.lastSubmitted)
            })
            .map((problem) => ({
                id: `bookmark-${problem.id}`,
                title: `${problem.id}. ${problem.title}`,
                subtitle: `${problem.domain} • ${problem.difficulty} • ${problem.acceptance} acceptance`,
                time: problem.lastSubmitted ? formatRelativeTime(problem.lastSubmitted) : 'Bookmarked',
                dotColor: '#60a5fa',
                href: `/problems/${problem.id}`,
            }))
    ), [])

    const solutionRows = useMemo(() => (
        mockProblems
            .filter((problem) => problem.status === 'solved')
            .sort((a, b) => {
                if (!a.lastSubmitted && !b.lastSubmitted) return a.id - b.id
                if (!a.lastSubmitted) return 1
                if (!b.lastSubmitted) return -1
                return new Date(b.lastSubmitted) - new Date(a.lastSubmitted)
            })
            .map((problem) => ({
                id: `solution-${problem.id}`,
                title: `${problem.id}. ${problem.title}`,
                subtitle: `${problem.domain} • ${problem.difficulty} • ${problem.acceptance} acceptance`,
                time: problem.lastSubmitted ? formatRelativeTime(problem.lastSubmitted) : 'Solved',
                dotColor: '#34d399',
                href: `/problems/${problem.id}`,
            }))
    ), [])

    const tabContent = useMemo(() => ({
        recent: {
            heading: 'Recent submissions',
            noun: 'submission',
            emptyMessage: 'No recent submissions yet.',
            rows: recentSubmissionRows,
        },
        list: {
            heading: 'Bookmarked questions',
            noun: 'bookmark',
            emptyMessage: 'No bookmarked questions yet.',
            rows: bookmarkedRows,
        },
        solutions: {
            heading: 'Solved questions',
            noun: 'solution',
            emptyMessage: 'No solved questions yet.',
            rows: solutionRows,
        },
    }), [recentSubmissionRows, bookmarkedRows, solutionRows])

    const currentTabContent = tabContent[activeTab] || tabContent.recent
    const previewRows = currentTabContent.rows.slice(0, 5)
    const totalRows = currentTabContent.rows.length
    const actionLabel = `View all ${totalRows} ${currentTabContent.noun}${totalRows === 1 ? '' : 's'} →`

    const handleRowNavigation = (href) => {
        if (!href) return
        setIsSubmissionPanelOpen(false)
        navigate(href)
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0b0f19 0%, #161b22 100%)',
            color: '#e5e7eb',
            fontFamily: '"Inter", "Roboto", sans-serif',
        }}>
            <Navbar />
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 32px 64px' }}>
                <div style={{ display: 'flex', gap: '28px' }}>

                    {/* ═══ LEFT COLUMN ═══ */}
                    <div style={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Profile Card */}
                        <div style={{ ...glassCard, padding: '28px 24px', textAlign: 'center' }}>
                            {/* Avatar */}
                            {profileData.avatar ? (
                                <img src={profileData.avatar} alt="Profile" style={{
                                    width: '96px', height: '96px', borderRadius: '50%',
                                    margin: '0 auto 16px',
                                    objectFit: 'cover',
                                    boxShadow: '0 0 30px rgba(52, 211, 153, 0.2), 0 0 60px rgba(59, 130, 246, 0.1)',
                                    display: 'block'
                                }} />
                            ) : (
                                <div style={{
                                    width: '96px', height: '96px', borderRadius: '50%',
                                    margin: '0 auto 16px',
                                    background: 'linear-gradient(135deg, #34d399 0%, #3b82f6 50%, #a78bfa 100%)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '36px', fontWeight: 700, color: '#0b0f19',
                                    boxShadow: '0 0 30px rgba(52, 211, 153, 0.2), 0 0 60px rgba(59, 130, 246, 0.1)',
                                    position: 'relative',
                                }}>
                                    {(profileData.displayName || 'U')[0]}
                                </div>
                            )}

                            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{profileData.displayName}</h1>
                            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>@{profileUser.username}</p>

                            {/* Followers / Following */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '12px',
                                marginBottom: '16px',
                                flexWrap: 'wrap',
                            }}>
                                {[
                                    { label: 'Followers', value: ownFollowStats.followers, tab: 'followers' },
                                    { label: 'Following', value: ownFollowStats.following, tab: 'following' },
                                ].map((item) => (
                                    <button
                                        key={item.label}
                                        onClick={() => navigate(`/profile/${encodeURIComponent(profileUser.username)}/connections?tab=${item.tab}`)}
                                        style={{
                                            border: 'none',
                                            background: 'rgba(255,255,255,0.04)',
                                            borderRadius: '12px',
                                            padding: '10px 14px',
                                            cursor: 'pointer',
                                            color: '#d1d5db',
                                            fontFamily: 'inherit',
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                                        }}
                                    >
                                        <span style={{ fontWeight: 600, color: '#fff', fontSize: '15px' }}>{item.value.toLocaleString()}</span>
                                        <span style={{ color: '#6b7280', fontSize: '13px', marginLeft: '4px' }}>{item.label}</span>
                                    </button>
                                ))}
                            </div>

                            {isOwnProfile ? (
                                <button style={{
                                    width: '100%', padding: '10px 0', borderRadius: '12px',
                                    background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.15), rgba(59, 130, 246, 0.15))',
                                    border: '1px solid rgba(52, 211, 153, 0.25)',
                                    color: '#34d399', fontSize: '14px', fontWeight: 600,
                                    cursor: 'pointer', transition: 'all 0.25s ease',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                }}
                                    onClick={() => navigate('/settings')}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(52, 211, 153, 0.25), rgba(59, 130, 246, 0.25))'
                                        e.currentTarget.style.transform = 'translateY(-1px)'
                                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(52, 211, 153, 0.15)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(52, 211, 153, 0.15), rgba(59, 130, 246, 0.15))'
                                        e.currentTarget.style.transform = 'translateY(0)'
                                        e.currentTarget.style.boxShadow = 'none'
                                    }}
                                >
                                    <Edit style={{ width: '14px', height: '14px' }} />
                                    Edit Profile
                                </button>
                            ) : (
                                <button style={{
                                    width: '100%', padding: '10px 0', borderRadius: '12px',
                                    background: isFollowingProfile
                                        ? 'rgba(248,113,113,0.10)'
                                        : 'linear-gradient(135deg, rgba(52, 211, 153, 0.15), rgba(59, 130, 246, 0.15))',
                                    border: `1px solid ${isFollowingProfile ? 'rgba(248,113,113,0.22)' : 'rgba(52, 211, 153, 0.25)'}`,
                                    color: isFollowingProfile ? '#fecaca' : '#34d399',
                                    fontSize: '14px', fontWeight: 600,
                                    cursor: 'pointer', transition: 'all 0.25s ease',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                }}
                                    onClick={() => {
                                        if (isFollowingProfile) unfollowProfile(viewerUser.username, profileUser.username)
                                        else followProfile(viewerUser.username, profileUser.username)
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-1px)'
                                        e.currentTarget.style.boxShadow = isFollowingProfile
                                            ? '0 4px 20px rgba(248, 113, 113, 0.12)'
                                            : '0 4px 20px rgba(52, 211, 153, 0.15)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)'
                                        e.currentTarget.style.boxShadow = 'none'
                                    }}
                                >
                                    {isFollowingProfile ? 'Unfollow' : 'Follow'}
                                </button>
                            )}
                        </div>

                        {/* Bio / Links */}
                        <div style={{ ...glassCard, padding: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {profileData.readme && (
                                    <p style={{ fontSize: '13.5px', color: '#d1d5db', lineHeight: '1.6', marginBottom: '8px', whiteSpace: 'pre-wrap' }}>
                                        {profileData.readme}
                                    </p>
                                )}
                                {[
                                    profileData.location && { icon: <MapPin style={{ width: '15px', height: '15px', color: '#6b7280' }} />, text: profileData.location },
                                    profileData.work && { icon: <Briefcase style={{ width: '15px', height: '15px', color: '#6b7280' }} />, text: profileData.work },
                                    profileData.education && { icon: <GraduationCap style={{ width: '15px', height: '15px', color: '#6b7280' }} />, text: profileData.education },
                                    profileData.github && { icon: <Github style={{ width: '15px', height: '15px', color: '#6b7280' }} />, text: profileData.github, link: profileData.github },
                                    profileData.linkedin && { icon: <Linkedin style={{ width: '15px', height: '15px', color: '#6b7280' }} />, text: profileData.linkedin, link: profileData.linkedin },
                                    profileData.x && { icon: <Twitter style={{ width: '15px', height: '15px', color: '#6b7280' }} />, text: profileData.x, link: profileData.x },
                                    profileData.websites && { icon: <Link2 style={{ width: '15px', height: '15px', color: '#6b7280' }} />, text: profileData.websites, link: profileData.websites },
                                    profileData.birthday && { icon: <Gift style={{ width: '15px', height: '15px', color: '#6b7280' }} />, text: `Born ${profileData.birthday}` }
                                ].filter(Boolean).map((item, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '6px 0', fontSize: '13.5px', color: '#9ca3af',
                                    }}>
                                        {item.icon}
                                        {item.link ? (
                                            <a 
                                                href={item.link.startsWith('http') ? item.link : `https://${item.link}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                style={{ color: '#60a5fa', textDecoration: 'none', transition: 'color 0.2s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} 
                                                onMouseEnter={e => e.currentTarget.style.color = '#93c5fd'} 
                                                onMouseLeave={e => e.currentTarget.style.color = '#60a5fa'}
                                            >
                                                {item.text}
                                            </a>
                                        ) : (
                                            <span>{item.text}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Community Stats */}
                        <div style={{ ...glassCard, padding: '20px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb', marginBottom: '16px' }}>Community Stats</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {[
                                    { icon: <Eye style={{ width: '15px', height: '15px' }} />, label: 'Views', value: profileUser.views, color: '#60a5fa' },
                                    { icon: <CheckSquare style={{ width: '15px', height: '15px' }} />, label: 'Solution', value: profileUser.solutions, color: '#34d399' },
                                    { icon: <MessageSquare style={{ width: '15px', height: '15px' }} />, label: 'Discuss', value: profileUser.discussions, color: '#a78bfa' },
                                    { icon: <Star style={{ width: '15px', height: '15px' }} />, label: 'Reputation', value: profileUser.reputation, color: '#fbbf24' },
                                ].map(({ icon, label, value, color }) => (
                                    <div key={label} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ color }}>{icon}</div>
                                            <span style={{ fontSize: '13.5px', color: '#9ca3af' }}>{label}</span>
                                        </div>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb' }}>{value.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Languages */}
                        <div style={{ ...glassCard, padding: '20px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb', marginBottom: '16px' }}>Languages</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {languageStats.length > 0 ? languageStats.map((l) => (
                                    <div key={l.name} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    }}>
                                        <span style={{
                                            fontSize: '12.5px', fontWeight: 500,
                                            padding: '3px 12px', borderRadius: '8px',
                                            backgroundColor: 'rgba(255,255,255,0.06)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: '#d1d5db',
                                        }}>{l.name}</span>
                                        <span style={{ fontSize: '13px', color: '#9ca3af' }}>
                                            <span style={{ fontWeight: 600, color: '#e5e7eb' }}>{l.count}</span> problems solved
                                        </span>
                                    </div>
                                )) : (
                                    <span style={{ fontSize: '13px', color: '#6b7280' }}>No problems solved yet.</span>
                                )}
                            </div>
                        </div>

                        {/* Skills */}
                        <div style={{ ...glassCard, padding: '20px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb', marginBottom: '16px' }}>Skills</h3>
                            {customSkillsArray.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {customSkillsArray.map((skill, index) => (
                                        <span key={index} style={{
                                            padding: '6px 14px', borderRadius: '8px', fontSize: '13px',
                                            backgroundColor: 'rgba(52, 211, 153, 0.1)',
                                            border: '1px solid rgba(52, 211, 153, 0.2)',
                                            color: '#34d399', fontWeight: 500,
                                        }}>
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                    {dynamicSkills.map(({ tier, color, items }) => (
                                        <div key={tier}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                                <span style={{
                                                    width: '8px', height: '8px', borderRadius: '50%',
                                                    backgroundColor: color,
                                                }} />
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#d1d5db' }}>{tier}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {items.map((s) => (
                                                    <span key={s.name} onClick={() => navigate(`/topic/${encodeURIComponent(s.name)}`)} style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                        padding: '4px 12px', borderRadius: '8px', fontSize: '12px',
                                                        backgroundColor: 'rgba(255,255,255,0.04)',
                                                        border: '1px solid rgba(255,255,255,0.06)',
                                                        color: '#9ca3af', cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                    }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
                                                            e.currentTarget.style.color = '#e5e7eb'
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'
                                                            e.currentTarget.style.color = '#9ca3af'
                                                        }}
                                                    >
                                                        {s.name}
                                                        <span style={{
                                                            fontSize: '11px', fontWeight: 600,
                                                            color: '#6b7280', marginLeft: '2px',
                                                        }}>x{s.count}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ═══ RIGHT COLUMN ═══ */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Contest Stats Row */}
                        <div style={{ display: 'flex', gap: '16px' }}>
                            {/* Contest Rating + Chart card */}
                            <div style={{ ...glassCard, padding: '24px', flex: 1 }}>
                                <div style={{ display: 'flex', gap: '32px', marginBottom: '20px' }}>
                                    <div>
                                        <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Contest Rating</p>
                                        <p style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>{contestInsights.rating.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Global Ranking</p>
                                        <p style={{ fontSize: '18px', fontWeight: 600, color: '#d1d5db' }}>
                                            {contestInsights.globalRanking.toLocaleString()}<span style={{ color: '#6b7280', fontSize: '13px' }}>/{
                                                contestInsights.totalPopulation.toLocaleString()
                                            }</span>
                                        </p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Attended</p>
                                        <p style={{ fontSize: '18px', fontWeight: 600, color: '#d1d5db' }}>{contestInsights.attended}</p>
                                    </div>
                                </div>

                                {/* Mini Contest Chart */}
                                <ResponsiveContainer width="100%" height={80}>
                                    <LineChart data={contestInsights.history}>
                                        <Line type="monotone" dataKey="rating" stroke="#34d399" strokeWidth={2} dot={false} />
                                        <Tooltip
                                            contentStyle={{
                                                background: 'rgba(20,24,32,0.95)', border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '10px', fontSize: '12px', backdropFilter: 'blur(10px)',
                                            }}
                                            labelStyle={{ color: '#6b7280' }}
                                            itemStyle={{ color: '#34d399' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Top % card */}
                            <div style={{ ...glassCard, padding: '24px', width: '200px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Top</p>
                                <p style={{
                                    fontSize: '38px', fontWeight: 800,
                                    background: 'linear-gradient(135deg, #34d399, #3b82f6)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    lineHeight: 1.1,
                                }}>{contestInsights.topPercent}%</p>
                            </div>
                        </div>

                        {/* Problems Solved */}
                        <div style={{ ...glassCard, padding: '24px' }}>
                            <SolvedDonut
                                difficultyStats={problemSummary.difficulties}
                                totalProblems={problemSummary.total}
                                totalSolved={problemSummary.solved}
                            />
                        </div>

                        {/* Activity Heatmap */}
                        {profileData.heatmap && (
                            <div style={{ ...glassCard, padding: '24px' }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    marginBottom: '16px',
                                }}>
                                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#e5e7eb' }}>
                                        <span style={{ color: '#fff', fontWeight: 700 }}>{totalSubmissions}</span>
                                        <span style={{ color: '#9ca3af', fontWeight: 400 }}> submissions in the past one year</span>
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '12.5px', color: '#6b7280' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Calendar style={{ width: '14px', height: '14px' }} />
                                            Total active days: <span style={{ fontWeight: 600, color: '#d1d5db' }}>{activeDays}</span>
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Flame style={{ width: '14px', height: '14px', color: '#fbbf24' }} />
                                            Max streak: <span style={{ fontWeight: 600, color: '#d1d5db' }}>{maxStreak}</span>
                                        </span>
                                    </div>
                                </div>
                <ActivityHeatmap data={heatmapData} />
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                                    gap: '3px', marginTop: '8px', fontSize: '10px', color: '#6b7280',
                                }}>
                                    Less
                                    {[0, 2, 4, 6, 8].map((v) => (
                                        <div key={v} style={{
                                            width: '11px',
                                            height: '11px',
                                            borderRadius: '3px',
                                            border: '1px solid rgba(255,255,255,0.03)',
                                            backgroundColor: v === 0 ? 'rgba(255,255,255,0.04)' : v <= 2 ? '#0e4429' : v <= 4 ? '#006d32' : v <= 6 ? '#26a641' : '#39d353',
                                        }} />
                                    ))}
                                    More
                                </div>
                            </div>
                        )}

                        {/* Recent Submissions with Tabs */}
                        {profileData.recentAC && (
                            <div style={{ ...glassCard, padding: '0', overflow: 'hidden' }}>
                                {/* Tab bar */}
                                <div style={{
                                    display: 'flex', alignItems: 'center',
                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                    padding: '0 24px',
                                }}>
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                padding: '14px 20px', fontSize: '13.5px', fontWeight: 500,
                                                color: activeTab === tab.id ? '#fff' : '#6b7280',
                                                backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                                                borderBottom: activeTab === tab.id ? '2px solid #34d399' : '2px solid transparent',
                                                cursor: 'pointer', transition: 'all 0.2s',
                                                border: 'none', borderRadius: 0,
                                                fontFamily: 'inherit',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (activeTab !== tab.id) e.currentTarget.style.color = '#d1d5db'
                                            }}
                                            onMouseLeave={(e) => {
                                                if (activeTab !== tab.id) e.currentTarget.style.color = '#6b7280'
                                            }}
                                        >
                                            {tab.icon}
                                            {tab.label}
                                        </button>
                                    ))}
                                    <div style={{ flex: 1 }} />
                                    <button
                                        onClick={() => setIsSubmissionPanelOpen(true)}
                                        disabled={totalRows === 0}
                                        style={{
                                            fontSize: '12.5px',
                                            color: totalRows === 0 ? 'rgba(107,114,128,0.45)' : '#6b7280',
                                            cursor: totalRows === 0 ? 'default' : 'pointer',
                                            transition: 'color 0.2s',
                                            background: 'none',
                                            border: 'none',
                                            fontFamily: 'inherit',
                                            padding: 0,
                                        }}
                                        onMouseEnter={(e) => {
                                            if (totalRows > 0) e.currentTarget.style.color = '#d1d5db'
                                        }}
                                        onMouseLeave={(e) => {
                                            if (totalRows > 0) e.currentTarget.style.color = '#6b7280'
                                        }}
                                    >
                                        {actionLabel}
                                    </button>
                                </div>

                                {/* Submission rows */}
                                <div>
                                    {previewRows.length > 0 ? previewRows.map((row, i) => (
                                        <div
                                            key={row.id}
                                            style={{
                                                display: 'flex', alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '14px 24px',
                                                backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                                                borderBottom: i !== previewRows.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                                cursor: row.href ? 'pointer' : 'default', transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'
                                            }}
                                            onClick={() => handleRowNavigation(row.href)}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{
                                                    width: '6px', height: '6px', borderRadius: '50%',
                                                    backgroundColor: row.dotColor,
                                                }} />
                                                <span style={{
                                                    fontSize: '14px', fontWeight: 500, color: '#e5e7eb',
                                                }}>{row.title}</span>
                                            </div>
                                            <span style={{ fontSize: '13px', color: '#6b7280' }}>{row.time}</span>
                                        </div>
                                    )) : (
                                        <div style={{ padding: '20px 24px', color: '#6b7280', fontSize: '13.5px' }}>
                                            {currentTabContent.emptyMessage}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isSubmissionPanelOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1200,
                    background: 'rgba(4, 8, 16, 0.72)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                }}>
                    <div style={{
                        width: 'min(860px, 100%)',
                        maxHeight: 'min(80vh, 760px)',
                        overflow: 'hidden',
                        borderRadius: '24px',
                        background: 'linear-gradient(180deg, rgba(20,24,32,0.96) 0%, rgba(12,16,24,0.98) 100%)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
                        display: 'flex',
                        flexDirection: 'column',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '20px 24px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                                    {currentTabContent.heading}
                                </h3>
                                <p style={{ fontSize: '13px', color: '#6b7280' }}>
                                    {totalRows} {currentTabContent.noun}{totalRows === 1 ? '' : 's'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsSubmissionPanelOpen(false)}
                                style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    color: '#9ca3af',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                                    e.currentTarget.style.color = '#fff'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                                    e.currentTarget.style.color = '#9ca3af'
                                }}
                            >
                                <X style={{ width: '18px', height: '18px' }} />
                            </button>
                        </div>

                        <div style={{ overflowY: 'auto' }}>
                            {currentTabContent.rows.length > 0 ? currentTabContent.rows.map((row, index) => (
                                <div
                                    key={row.id}
                                    onClick={() => handleRowNavigation(row.href)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '16px',
                                        padding: '18px 24px',
                                        backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                                        borderBottom: index !== currentTabContent.rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                        cursor: row.href ? 'pointer' : 'default',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: 0 }}>
                                        <span style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            marginTop: '6px',
                                            flexShrink: 0,
                                            backgroundColor: row.dotColor,
                                        }} />
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb', marginBottom: '4px' }}>
                                                {row.title}
                                            </div>
                                            <div style={{ fontSize: '12.5px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {row.subtitle}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '12.5px', color: '#94a3b8', flexShrink: 0 }}>
                                        {row.time}
                                    </div>
                                </div>
                            )) : (
                                <div style={{ padding: '24px', color: '#6b7280', fontSize: '13.5px' }}>
                                    {currentTabContent.emptyMessage}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
