import { useState, useMemo } from 'react'
import { MapPin, Github, Linkedin, Edit, Eye, MessageSquare, ThumbsUp, Award, Flame, Calendar, Clock, FileText, CheckSquare, Star } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Navbar from '../components/Navbar/Navbar'
import useAuthStore from '../store/authStore'
import { mockContestRatingHistory, mockHeatmapData, mockRecentSubmissions } from '../utils/mockData'

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

/* ── Heatmap ── */
function ActivityHeatmap({ data }) {
    const weeks = useMemo(() => {
        const w = []
        let week = []
        data.forEach((d) => {
            const day = new Date(d.date).getDay()
            if (day === 0 && week.length > 0) { w.push(week); week = [] }
            week.push(d)
        })
        if (week.length) w.push(week)
        return w
    }, [data])

    const getColor = (count) => {
        if (count === 0) return 'rgba(255,255,255,0.03)'
        if (count <= 2) return '#0e4429'
        if (count <= 4) return '#006d32'
        if (count <= 6) return '#26a641'
        return '#39d353'
    }

    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']

    return (
        <div>
            {/* Month labels */}
            <div style={{ display: 'flex', paddingLeft: '0px', marginBottom: '6px', gap: '0px' }}>
                {months.map((m, i) => (
                    <span key={i} style={{
                        flex: 1, fontSize: '11px', color: '#6b7280',
                        textAlign: 'center', fontWeight: 400,
                    }}>{m}</span>
                ))}
            </div>
            <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'flex', gap: '3px', minWidth: 'max-content' }}>
                    {weeks.map((week, wi) => (
                        <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {week.map((day) => (
                                <div
                                    key={day.date}
                                    style={{
                                        width: '12px', height: '12px', borderRadius: '3px',
                                        backgroundColor: getColor(day.count),
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer',
                                    }}
                                    title={`${day.date}: ${day.count} submissions`}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.3)'
                                        e.currentTarget.style.boxShadow = '0 0 6px rgba(57, 211, 83, 0.4)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)'
                                        e.currentTarget.style.boxShadow = 'none'
                                    }}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

/* ── Donut — LeetCode style ── */
function SolvedDonut({ easy, medium, hard, total, solved }) {
    const data = [
        { name: 'Easy', value: easy, color: '#34d399' },
        { name: 'Medium', value: medium, color: '#fbbf24' },
        { name: 'Hard', value: hard, color: '#f87171' },
    ]
    const totalsByDiff = {
        Easy: { solved: easy, total: 934 },
        Medium: { solved: medium, total: 2032 },
        Hard: { solved: hard, total: 917 },
    }
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Donut */}
            <div style={{ position: 'relative', width: '140px', height: '140px', flexShrink: 0 }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={44} outerRadius={62} paddingAngle={3} dataKey="value" stroke="none">
                            {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                }}>
                    <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{solved}</span>
                    <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>/{total}</span>
                    <span style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>Solved</span>
                </div>
            </div>

            {/* Difficulty breakdown — LeetCode style */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {data.map(({ name, color }) => {
                    const { solved: s, total: t } = totalsByDiff[name]
                    const pct = (s / t) * 100
                    return (
                        <div key={name}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{
                                    fontSize: '12px', fontWeight: 600, color,
                                    padding: '2px 10px', borderRadius: '10px',
                                    backgroundColor: `${color}15`,
                                }}>{name}</span>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb' }}>
                                    {s}<span style={{ color: '#6b7280', fontWeight: 400 }}>/{t}</span>
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

/* ─────────── Profile Page ─────────── */
export default function Profile() {
    const { user } = useAuthStore()
    const [activeTab, setActiveTab] = useState('recent')
    if (!user) return null

    const badges = [
        { name: '100 Day Streak', emoji: '🔥', earned: true },
        { name: 'Contest Winner', emoji: '🏆', earned: true },
        { name: 'Top Contributor', emoji: '⭐', earned: true },
        { name: 'Bug Hunter', emoji: '🐛', earned: false },
        { name: 'ML Master', emoji: '🧠', earned: false },
        { name: 'CTF Champion', emoji: '🛡️', earned: false },
    ]

    const skills = [
        { tier: 'Advanced', color: '#f87171', items: [{ name: 'Dynamic Programming', count: 13 }, { name: 'Divide and Conquer', count: 5 }, { name: 'Backtracking', count: 3 }] },
        { tier: 'Intermediate', color: '#fbbf24', items: [{ name: 'Hash Table', count: 37 }, { name: 'Math', count: 31 }, { name: 'Binary Search', count: 30 }] },
        { tier: 'Fundamental', color: '#34d399', items: [{ name: 'Array', count: 100 }, { name: 'Two Pointers', count: 40 }, { name: 'Linked List', count: 29 }] },
    ]

    const tabs = [
        { id: 'recent', label: 'Recent AC', icon: <Clock style={{ width: '14px', height: '14px' }} /> },
        { id: 'list', label: 'List', icon: <FileText style={{ width: '14px', height: '14px' }} /> },
        { id: 'solutions', label: 'Solutions', icon: <CheckSquare style={{ width: '14px', height: '14px' }} /> },
    ]

    const activeDays = mockHeatmapData.filter(d => d.count > 0).length
    const totalSubmissions = mockHeatmapData.reduce((acc, d) => acc + d.count, 0)

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
                            {user.avatar ? (
                                <img src={user.avatar} alt="Profile" style={{
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
                                    {user.displayName[0] || 'U'}
                                </div>
                            )}

                            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{user.displayName}</h1>
                            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>@{user.username}</p>

                            {/* Rank badge */}
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '4px 14px', borderRadius: '20px',
                                background: 'rgba(251, 191, 36, 0.1)',
                                border: '1px solid rgba(251, 191, 36, 0.2)',
                                marginTop: '8px', marginBottom: '16px',
                            }}>
                                <Award style={{ width: '14px', height: '14px', color: '#fbbf24' }} />
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#fbbf24' }}>{user.rank}</span>
                            </div>

                            {/* Followers / Following */}
                            <div style={{
                                display: 'flex', justifyContent: 'center', gap: '24px',
                                marginBottom: '16px',
                            }}>
                                <div>
                                    <span style={{ fontWeight: 600, color: '#fff', fontSize: '15px' }}>{user.followers}</span>
                                    <span style={{ color: '#6b7280', fontSize: '13px', marginLeft: '4px' }}>Followers</span>
                                </div>
                                <div>
                                    <span style={{ fontWeight: 600, color: '#fff', fontSize: '15px' }}>{user.following}</span>
                                    <span style={{ color: '#6b7280', fontSize: '13px', marginLeft: '4px' }}>Following</span>
                                </div>
                            </div>

                            {/* Edit Profile button */}
                            <button style={{
                                width: '100%', padding: '10px 0', borderRadius: '12px',
                                background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.15), rgba(59, 130, 246, 0.15))',
                                border: '1px solid rgba(52, 211, 153, 0.25)',
                                color: '#34d399', fontSize: '14px', fontWeight: 600,
                                cursor: 'pointer', transition: 'all 0.25s ease',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            }}
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
                        </div>

                        {/* Bio / Links */}
                        <div style={{ ...glassCard, padding: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[
                                    { icon: <MapPin style={{ width: '15px', height: '15px', color: '#6b7280' }} />, text: user.location },
                                    { icon: <Github style={{ width: '15px', height: '15px', color: '#6b7280' }} />, text: user.github },
                                    { icon: <Linkedin style={{ width: '15px', height: '15px', color: '#6b7280' }} />, text: user.linkedin },
                                ].map((item, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '6px 0', fontSize: '13.5px', color: '#9ca3af',
                                    }}>
                                        {item.icon}
                                        <span>{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Community Stats */}
                        <div style={{ ...glassCard, padding: '20px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb', marginBottom: '16px' }}>Community Stats</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {[
                                    { icon: <Eye style={{ width: '15px', height: '15px' }} />, label: 'Views', value: user.views, color: '#60a5fa' },
                                    { icon: <CheckSquare style={{ width: '15px', height: '15px' }} />, label: 'Solution', value: user.solutions, color: '#34d399' },
                                    { icon: <MessageSquare style={{ width: '15px', height: '15px' }} />, label: 'Discuss', value: user.discussions, color: '#a78bfa' },
                                    { icon: <Star style={{ width: '15px', height: '15px' }} />, label: 'Reputation', value: user.reputation, color: '#fbbf24' },
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
                                {user.languages.map((l) => (
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
                                ))}
                            </div>
                        </div>

                        {/* Skills */}
                        <div style={{ ...glassCard, padding: '20px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb', marginBottom: '16px' }}>Skills</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                {skills.map(({ tier, color, items }) => (
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
                                                <span key={s.name} style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                    padding: '4px 12px', borderRadius: '8px', fontSize: '12px',
                                                    backgroundColor: 'rgba(255,255,255,0.04)',
                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                    color: '#9ca3af', cursor: 'default',
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
                                        <p style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>{user.rating.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Global Ranking</p>
                                        <p style={{ fontSize: '18px', fontWeight: 600, color: '#d1d5db' }}>
                                            {user.globalRanking.toLocaleString()}<span style={{ color: '#6b7280', fontSize: '13px' }}>/858,485</span>
                                        </p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Attended</p>
                                        <p style={{ fontSize: '18px', fontWeight: 600, color: '#d1d5db' }}>{user.contests}</p>
                                    </div>
                                </div>

                                {/* Mini Contest Chart */}
                                <ResponsiveContainer width="100%" height={80}>
                                    <LineChart data={mockContestRatingHistory}>
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
                                }}>{user.topPercent}%</p>
                            </div>
                        </div>

                        {/* Problems Solved + Badges row */}
                        <div style={{ display: 'flex', gap: '16px' }}>
                            {/* Donut */}
                            <div style={{ ...glassCard, padding: '24px', flex: 1 }}>
                                <SolvedDonut easy={user.easy} medium={user.medium} hard={user.hard} total={user.totalProblems} solved={user.solvedProblems} />
                            </div>

                            {/* Badges */}
                            <div style={{ ...glassCard, padding: '24px', width: '280px' }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    marginBottom: '16px',
                                }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb' }}>Badges</h3>
                                    <span style={{
                                        fontSize: '20px', fontWeight: 700, color: '#fff',
                                    }}>{badges.filter(b => b.earned).length}</span>
                                </div>
                                <div style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '8px',
                                }}>
                                    {badges.map((b) => (
                                        <div
                                            key={b.name}
                                            style={{
                                                display: 'flex', flexDirection: 'column',
                                                alignItems: 'center', gap: '4px',
                                                padding: '10px 6px', borderRadius: '12px',
                                                backgroundColor: b.earned ? 'rgba(255,255,255,0.04)' : 'transparent',
                                                border: b.earned ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
                                                opacity: b.earned ? 1 : 0.35,
                                                cursor: 'default',
                                                transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (b.earned) {
                                                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
                                                    e.currentTarget.style.transform = 'translateY(-2px)'
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (b.earned) {
                                                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'
                                                    e.currentTarget.style.transform = 'translateY(0)'
                                                }
                                            }}
                                        >
                                            <span style={{ fontSize: '22px' }}>{b.emoji}</span>
                                            <span style={{
                                                fontSize: '10px', color: '#9ca3af',
                                                textAlign: 'center', lineHeight: '1.3',
                                            }}>{b.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Activity Heatmap */}
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
                                        Max streak: <span style={{ fontWeight: 600, color: '#d1d5db' }}>{user.streak}</span>
                                    </span>
                                </div>
                            </div>
                            <ActivityHeatmap data={mockHeatmapData} />
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                                gap: '3px', marginTop: '8px', fontSize: '10px', color: '#6b7280',
                            }}>
                                Less
                                {[0, 2, 4, 6, 8].map((v) => (
                                    <div key={v} style={{
                                        width: '12px', height: '12px', borderRadius: '3px',
                                        backgroundColor: v === 0 ? 'rgba(255,255,255,0.03)' : v <= 2 ? '#0e4429' : v <= 4 ? '#006d32' : v <= 6 ? '#26a641' : '#39d353',
                                    }} />
                                ))}
                                More
                            </div>
                        </div>

                        {/* Recent Submissions with Tabs */}
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
                                <span style={{
                                    fontSize: '12.5px', color: '#6b7280', cursor: 'pointer',
                                    transition: 'color 0.2s',
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#d1d5db'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                                >
                                    View all submissions &rarr;
                                </span>
                            </div>

                            {/* Submission rows */}
                            <div>
                                {mockRecentSubmissions.map((s, i) => (
                                    <div
                                        key={s.id}
                                        style={{
                                            display: 'flex', alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '14px 24px',
                                            backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                                            borderBottom: i !== mockRecentSubmissions.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                            cursor: 'pointer', transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{
                                                width: '6px', height: '6px', borderRadius: '50%',
                                                backgroundColor: s.status === 'Accepted' ? '#34d399' : '#f87171',
                                            }} />
                                            <span style={{
                                                fontSize: '14px', fontWeight: 500, color: '#e5e7eb',
                                            }}>{s.problem}</span>
                                        </div>
                                        <span style={{ fontSize: '13px', color: '#6b7280' }}>{s.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
