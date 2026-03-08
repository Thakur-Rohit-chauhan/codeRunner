import { useMemo } from 'react'
import { MapPin, Github, Linkedin, Edit, Eye, MessageSquare, ThumbsUp, Award, Flame, Calendar } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Navbar from '../components/Navbar/Navbar'
import useAuthStore from '../store/authStore'
import { mockContestRatingHistory, mockHeatmapData, mockRecentSubmissions } from '../utils/mockData'

/* ---------- Heatmap ---------- */
function ActivityHeatmap({ data }) {
    const weeks = useMemo(() => {
        const w = []
        let week = []
        data.forEach((d, i) => {
            const day = new Date(d.date).getDay()
            if (day === 0 && week.length > 0) { w.push(week); week = [] }
            week.push(d)
        })
        if (week.length) w.push(week)
        return w
    }, [data])

    const getColor = (count) => {
        if (count === 0) return '#1e1e1e'
        if (count <= 2) return '#0e4429'
        if (count <= 4) return '#006d32'
        if (count <= 6) return '#26a641'
        return '#39d353'
    }

    return (
        <div className="overflow-x-auto">
            <div className="flex gap-[3px]" style={{ minWidth: 'max-content' }}>
                {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[3px]">
                        {week.map((day) => (
                            <div
                                key={day.date}
                                className="w-[11px] h-[11px] rounded-[2px] transition-colors"
                                style={{ backgroundColor: getColor(day.count) }}
                                title={`${day.date}: ${day.count} submissions`}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ---------- Donut ---------- */
function SolvedDonut({ easy, medium, hard, total, solved }) {
    const data = [
        { name: 'Easy', value: easy, color: '#00b8a3' },
        { name: 'Medium', value: medium, color: '#ffa116' },
        { name: 'Hard', value: hard, color: '#ef4444' },
    ]
    return (
        <div className="flex items-center gap-8">
            <div className="relative w-36 h-36">
                <ResponsiveContainer>
                    <PieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={42} outerRadius={60} paddingAngle={3} dataKey="value" stroke="none">
                            {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-text-primary">{solved}</span>
                    <span className="text-[10px] text-text-secondary">/ {total}</span>
                </div>
            </div>
            <div className="space-y-3">
                {data.map(({ name, value, color }) => (
                    <div key={name} className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-sm text-text-secondary w-16">{name}</span>
                        <span className="text-sm font-semibold text-text-primary">{value}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ---------- Profile ---------- */
export default function Profile() {
    const { user } = useAuthStore()
    if (!user) return null

    const badges = [
        { name: '100 Day Streak', emoji: '🔥', earned: true },
        { name: 'Contest Winner', emoji: '🏆', earned: true },
        { name: 'Top Contributor', emoji: '⭐', earned: true },
        { name: 'Bug Hunter', emoji: '🐛', earned: false },
        { name: 'ML Master', emoji: '🧠', earned: false },
        { name: 'CTF Champion', emoji: '🛡️', earned: false },
    ]

    return (
        <div className="min-h-screen bg-bg-primary">
            <Navbar />
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* ===== Left Column ===== */}
                    <div className="lg:w-80 shrink-0 space-y-6">
                        {/* Avatar + Info */}
                        <div className="bg-bg-card rounded-2xl border border-border p-6 text-center">
                            <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-gradient-to-br from-accent via-accent-teal to-accent-blue flex items-center justify-center text-3xl font-bold text-bg-primary">
                                {user.displayName[0]}
                            </div>
                            <h1 className="text-xl font-bold text-text-primary">{user.displayName}</h1>
                            <p className="text-sm text-text-secondary">@{user.username}</p>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold mt-3">
                                <Award className="w-3.5 h-3.5" /> {user.rank}
                            </div>
                            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                                <div><span className="font-semibold text-text-primary">{user.followers}</span> <span className="text-text-secondary">Followers</span></div>
                                <div><span className="font-semibold text-text-primary">{user.following}</span> <span className="text-text-secondary">Following</span></div>
                            </div>
                            <button className="mt-4 w-full py-2 rounded-lg border border-success text-success text-sm font-medium hover:bg-success/10 transition-colors">
                                <Edit className="w-3.5 h-3.5 inline mr-1.5" /> Edit Profile
                            </button>
                        </div>

                        {/* Links */}
                        <div className="bg-bg-card rounded-2xl border border-border p-4 space-y-2">
                            <div className="flex items-center gap-2 text-sm text-text-secondary"><MapPin className="w-4 h-4" /> {user.location}</div>
                            <div className="flex items-center gap-2 text-sm text-text-secondary"><Github className="w-4 h-4" /> {user.github}</div>
                            <div className="flex items-center gap-2 text-sm text-text-secondary"><Linkedin className="w-4 h-4" /> {user.linkedin}</div>
                        </div>

                        {/* Community Stats */}
                        <div className="bg-bg-card rounded-2xl border border-border p-4">
                            <h3 className="text-sm font-semibold text-text-primary mb-3">Community Stats</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { icon: Eye, label: 'Views', value: user.views },
                                    { icon: MessageSquare, label: 'Solutions', value: user.solutions },
                                    { icon: MessageSquare, label: 'Discuss', value: user.discussions },
                                    { icon: ThumbsUp, label: 'Reputation', value: user.reputation },
                                ].map(({ icon: Icon, label, value }) => (
                                    <div key={label} className="flex items-center gap-2">
                                        <Icon className="w-3.5 h-3.5 text-text-secondary" />
                                        <div>
                                            <p className="text-xs text-text-secondary">{label}</p>
                                            <p className="text-sm font-semibold text-text-primary">{value.toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Languages */}
                        <div className="bg-bg-card rounded-2xl border border-border p-4">
                            <h3 className="text-sm font-semibold text-text-primary mb-3">Languages</h3>
                            <div className="space-y-2">
                                {user.languages.map((l) => (
                                    <div key={l.name} className="flex items-center justify-between text-sm">
                                        <span className="text-text-primary font-medium">{l.name}</span>
                                        <span className="text-text-secondary">{l.count} problems</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ===== Right Column ===== */}
                    <div className="flex-1 min-w-0 space-y-6">

                        {/* Top Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Contest Rating', value: user.rating, color: 'text-accent' },
                                { label: 'Global Ranking', value: `#${user.globalRanking.toLocaleString()}`, color: 'text-text-primary' },
                                { label: 'Contests Attended', value: user.contests, color: 'text-text-primary' },
                                { label: 'Top %', value: `${user.topPercent}%`, color: 'text-accent-teal' },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="bg-bg-card rounded-xl border border-border p-4">
                                    <p className="text-xs text-text-secondary mb-1">{label}</p>
                                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Contest Rating Chart */}
                        <div className="bg-bg-card rounded-2xl border border-border p-6">
                            <h3 className="text-sm font-semibold text-text-primary mb-4">Contest Rating</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={mockContestRatingHistory}>
                                    <XAxis dataKey="date" tick={{ fill: '#8d96a0', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#8d96a0', fontSize: 11 }} axisLine={false} tickLine={false} domain={['dataMin - 50', 'dataMax + 50']} />
                                    <Tooltip
                                        contentStyle={{ background: '#282828', border: '1px solid #3e3e3e', borderRadius: '8px', fontSize: '12px' }}
                                        labelStyle={{ color: '#8d96a0' }}
                                        itemStyle={{ color: '#ffa116' }}
                                    />
                                    <Line type="monotone" dataKey="rating" stroke="#ffa116" strokeWidth={2.5} dot={{ fill: '#ffa116', r: 3 }} activeDot={{ r: 5, fill: '#ffa116' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Solved + Badges row */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Donut */}
                            <div className="bg-bg-card rounded-2xl border border-border p-6">
                                <h3 className="text-sm font-semibold text-text-primary mb-4">Problems Solved</h3>
                                <SolvedDonut easy={user.easy} medium={user.medium} hard={user.hard} total={user.totalProblems} solved={user.solvedProblems} />
                            </div>

                            {/* Badges */}
                            <div className="bg-bg-card rounded-2xl border border-border p-6">
                                <h3 className="text-sm font-semibold text-text-primary mb-4">Badges</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {badges.map((b) => (
                                        <div
                                            key={b.name}
                                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors ${b.earned ? 'border-border bg-bg-panel' : 'border-border/30 opacity-40'
                                                }`}
                                        >
                                            <span className="text-2xl">{b.emoji}</span>
                                            <span className="text-[10px] text-text-secondary text-center leading-tight">{b.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Activity Heatmap */}
                        <div className="bg-bg-card rounded-2xl border border-border p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-text-primary">Activity</h3>
                                <div className="flex items-center gap-4 text-xs text-text-secondary">
                                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> 245 active days</span>
                                    <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-accent" /> 14 max streak</span>
                                </div>
                            </div>
                            <ActivityHeatmap data={mockHeatmapData} />
                            <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-text-secondary">
                                Less
                                {[0, 2, 4, 6, 8].map((v) => (
                                    <div key={v} className="w-[11px] h-[11px] rounded-[2px]" style={{ backgroundColor: v === 0 ? '#1e1e1e' : v <= 2 ? '#0e4429' : v <= 4 ? '#006d32' : v <= 6 ? '#26a641' : '#39d353' }} />
                                ))}
                                More
                            </div>
                        </div>

                        {/* Recent Submissions */}
                        <div className="bg-bg-card rounded-2xl border border-border p-6">
                            <h3 className="text-sm font-semibold text-text-primary mb-4">Recent Submissions</h3>
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        {['Problem', 'Language', 'Status', 'Runtime', 'Time'].map((h) => (
                                            <th key={h} className="text-left text-xs font-medium text-text-secondary py-2 px-3 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {mockRecentSubmissions.map((s) => (
                                        <tr key={s.id} className="border-b border-border/30 hover:bg-bg-panel/50 transition-colors">
                                            <td className="py-2.5 px-3 text-sm text-text-primary">{s.problem}</td>
                                            <td className="py-2.5 px-3 text-sm text-text-secondary font-mono">{s.language}</td>
                                            <td className="py-2.5 px-3">
                                                <span className={`text-xs font-medium ${s.status === 'Accepted' ? 'text-success' : 'text-hard'}`}>{s.status}</span>
                                            </td>
                                            <td className="py-2.5 px-3 text-sm text-text-secondary font-mono">{s.runtime}</td>
                                            <td className="py-2.5 px-3 text-xs text-text-secondary">{s.time}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
