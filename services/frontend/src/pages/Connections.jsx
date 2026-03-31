import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Search, Check } from 'lucide-react'
import useAuthStore from '../store/authStore'
import useContestStore from '../store/contestStore'
import useSocialStore, {
    computeFollowStats,
    createSeedProfile,
    getFollowerUsernames,
    getFollowingUsernames,
} from '../store/socialStore'

const tabs = [
    { id: 'following', label: 'Following' },
    { id: 'followers', label: 'Followers' },
]

const sanitizeUsername = (value) =>
    value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')

const avatarGradient = (username = 'user') => {
    const seed = username.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
    const gradients = [
        'linear-gradient(135deg, #34d399 0%, #059669 100%)',
        'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
        'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
        'linear-gradient(135deg, #f87171 0%, #dc2626 100%)',
    ]
    return gradients[seed % gradients.length]
}

export default function Connections() {
    const navigate = useNavigate()
    const { username } = useParams()
    const { user } = useAuthStore()
    const contests = useContestStore((state) => state.contests)
    const { profiles, followingByUser, syncProfile, followProfile, unfollowProfile } = useSocialStore()
    const [searchParams, setSearchParams] = useSearchParams()
    const [searchQuery, setSearchQuery] = useState('')

    const activeTab = searchParams.get('tab') === 'followers' ? 'followers' : 'following'
    const profileUsername = username || user?.username || ''
    const viewerUsername = user?.username || ''

    useEffect(() => {
        if (viewerUsername) {
            syncProfile(viewerUsername, {
                displayName: user?.displayName,
                avatar: user?.avatar || null,
                followersBase: user?.followers || 0,
                followingBase: user?.following || 0,
            })
        }

        if (profileUsername) {
            syncProfile(profileUsername)
        }
    }, [profileUsername, syncProfile, user?.avatar, user?.displayName, user?.followers, user?.following, viewerUsername])

    const followerUsernames = useMemo(
        () => getFollowerUsernames(profileUsername, profiles, followingByUser),
        [profileUsername, profiles, followingByUser]
    )
    const followingUsernames = useMemo(
        () => getFollowingUsernames(profileUsername, profiles, followingByUser),
        [profileUsername, profiles, followingByUser]
    )
    const profileStats = useMemo(
        () => computeFollowStats(profileUsername, profiles, followingByUser),
        [profileUsername, profiles, followingByUser]
    )
    const viewerFollowing = followingByUser[viewerUsername] || []

    const discoverableUsernames = useMemo(() => {
        const set = new Set([
            profileUsername,
            viewerUsername,
            ...Object.keys(profiles),
            ...Object.keys(followingByUser),
            ...followerUsernames,
            ...followingUsernames,
        ])

        Object.values(followingByUser).forEach((targets) => {
            targets.forEach((target) => set.add(target))
        })

        contests.forEach((contest) => {
            ;(contest.leaderboard || []).forEach((entry) => set.add(entry.name))
        })

        const normalizedQuery = sanitizeUsername(searchQuery)
        if (normalizedQuery && !set.has(normalizedQuery)) {
            set.add(normalizedQuery)
        }

        return Array.from(set).filter(Boolean)
    }, [contests, followerUsernames, followingByUser, followingUsernames, profileUsername, profiles, searchQuery, viewerUsername])

    const directoryEntries = useMemo(() => (
        discoverableUsernames
            .filter((entryUsername) => entryUsername !== profileUsername || activeTab !== 'following' || searchQuery.trim().length > 0)
            .map((entryUsername) => {
                const stats = computeFollowStats(entryUsername, profiles, followingByUser)
                return {
                    username: entryUsername,
                    displayName: stats.profile.displayName || createSeedProfile(entryUsername).displayName,
                    avatar: stats.profile.avatar || null,
                    followers: stats.followers,
                    following: stats.following,
                }
            })
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
    ), [activeTab, discoverableUsernames, followingByUser, profileUsername, profiles, searchQuery])

    const activeUsernames = activeTab === 'followers' ? followerUsernames : followingUsernames
    const activeEntries = useMemo(() => (
        activeUsernames.map((entryUsername) => {
            const stats = computeFollowStats(entryUsername, profiles, followingByUser)
            return {
                username: entryUsername,
                displayName: stats.profile.displayName || createSeedProfile(entryUsername).displayName,
                avatar: stats.profile.avatar || null,
                followers: stats.followers,
                following: stats.following,
            }
        })
    ), [activeUsernames, followingByUser, profiles])

    const filteredSearchEntries = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase()
        if (!normalizedQuery) return []

        return directoryEntries.filter((entry) =>
            entry.username.toLowerCase().includes(normalizedQuery)
            || entry.displayName.toLowerCase().includes(normalizedQuery)
        )
    }, [directoryEntries, searchQuery])

    const visibleEntries = searchQuery.trim() ? filteredSearchEntries : activeEntries

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #111315 0%, #171a1f 100%)',
            color: '#f3f4f6',
            fontFamily: '"Inter", "Roboto", sans-serif',
            padding: '28px 20px 40px',
        }}>
            <div style={{ maxWidth: '920px', margin: '0 auto' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.04)',
                        color: '#d1d5db',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        marginBottom: '20px',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                        e.currentTarget.style.color = '#fff'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                        e.currentTarget.style.color = '#d1d5db'
                    }}
                >
                    <ArrowLeft size={18} />
                </button>

                <div style={{
                    marginBottom: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
                            {profiles[profileUsername]?.displayName || createSeedProfile(profileUsername).displayName}
                        </h1>
                        <p style={{ fontSize: '13.5px', color: '#8b92a4' }}>
                            @{profileUsername} • {profileStats.followers.toLocaleString()} followers • {profileStats.following.toLocaleString()} following
                        </p>
                    </div>

                    <div style={{
                        position: 'relative',
                        minWidth: '280px',
                        flex: '1 1 320px',
                        maxWidth: '420px',
                    }}>
                        <Search style={{
                            position: 'absolute',
                            left: '14px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '16px',
                            height: '16px',
                            color: '#6b7280',
                        }} />
                        <input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search users to follow"
                            style={{
                                width: '100%',
                                padding: '12px 14px 12px 42px',
                                borderRadius: '14px',
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(255,255,255,0.04)',
                                color: '#f3f4f6',
                                fontSize: '14px',
                                outline: 'none',
                                fontFamily: 'inherit',
                            }}
                        />
                    </div>
                </div>

                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px',
                    borderRadius: '16px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    marginBottom: '18px',
                }}>
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id
                        const count = tab.id === 'followers' ? followerUsernames.length : followingUsernames.length

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setSearchParams({ tab: tab.id })}
                                style={{
                                    border: 'none',
                                    background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    color: isActive ? '#fff' : '#9ca3af',
                                    padding: '10px 16px',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {tab.label} <span style={{ color: isActive ? '#e5e7eb' : '#6b7280' }}>{count}</span>
                            </button>
                        )
                    })}
                </div>

                <div style={{
                    borderRadius: '20px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                    minHeight: '480px',
                }}>
                    {visibleEntries.length > 0 ? visibleEntries.map((entry, index) => {
                        const isViewer = entry.username === viewerUsername
                        const isFollowingEntry = viewerFollowing.includes(entry.username)

                        return (
                            <div
                                key={`${activeTab}-${entry.username}`}
                                onClick={() => navigate(`/profile/${entry.username}`)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '16px',
                                    padding: '16px 18px',
                                    background: index % 2 === 0 ? 'rgba(255,255,255,0.018)' : 'transparent',
                                    borderBottom: index !== visibleEntries.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = index % 2 === 0 ? 'rgba(255,255,255,0.018)' : 'transparent'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                                    {entry.avatar ? (
                                        <img
                                            src={entry.avatar}
                                            alt={entry.displayName}
                                            style={{
                                                width: '48px',
                                                height: '48px',
                                                borderRadius: '50%',
                                                objectFit: 'cover',
                                                flexShrink: 0,
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '50%',
                                            background: avatarGradient(entry.username),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#0b0f19',
                                            fontWeight: 800,
                                            fontSize: '18px',
                                            flexShrink: 0,
                                        }}>
                                            {(entry.displayName || entry.username)[0]}
                                        </div>
                                    )}

                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', marginBottom: '3px' }}>
                                            {entry.displayName}
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#8b92a4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            @{entry.username} • {entry.followers.toLocaleString()} followers • {entry.following.toLocaleString()} following
                                        </div>
                                    </div>
                                </div>

                                {!isViewer ? (
                                    <button
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            if (isFollowingEntry) {
                                                unfollowProfile(viewerUsername, entry.username)
                                            } else {
                                                followProfile(viewerUsername, entry.username)
                                            }
                                        }}
                                        style={{
                                            minWidth: '118px',
                                            padding: '10px 14px',
                                            borderRadius: '12px',
                                            border: `1px solid ${isFollowingEntry ? 'rgba(255,255,255,0.08)' : 'rgba(52,211,153,0.24)'}`,
                                            background: isFollowingEntry
                                                ? 'rgba(255,255,255,0.06)'
                                                : 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(59,130,246,0.16))',
                                            color: isFollowingEntry ? '#d1d5db' : '#34d399',
                                            fontSize: '13.5px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                        }}
                                    >
                                        {isFollowingEntry ? <Check size={14} /> : null}
                                        {isFollowingEntry ? 'Following' : 'Follow'}
                                    </button>
                                ) : (
                                    <span style={{
                                        minWidth: '118px',
                                        textAlign: 'center',
                                        fontSize: '13px',
                                        color: '#6b7280',
                                        fontWeight: 600,
                                    }}>
                                        You
                                    </span>
                                )}
                            </div>
                        )
                    }) : (
                        <div style={{
                            minHeight: '420px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            padding: '24px',
                            color: '#7c8598',
                            fontSize: '14px',
                        }}>
                            {searchQuery.trim()
                                ? `No users found for "${searchQuery.trim()}".`
                                : `No ${activeTab} found yet.`}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
