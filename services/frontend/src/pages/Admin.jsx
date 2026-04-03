import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Crown, Shield, Trash2, Users, Wifi, WifiOff, FolderCog, Trophy, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar/Navbar'
import useAuthStore from '../store/authStore'
import useProblemStore from '../store/problemStore'
import useContestStore from '../store/contestStore'

const cardStyle = {
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'linear-gradient(180deg, rgba(20,24,33,0.92) 0%, rgba(12,16,24,0.96) 100%)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.28)',
}

const formatLastSeen = (value) => {
    if (!value) return 'No activity yet'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'No activity yet'
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export default function Admin() {
    const user = useAuthStore((state) => state.user)
    const usersMap = useAuthStore((state) => state.users)
    const syncUsersDirectory = useAuthStore((state) => state.syncUsersDirectory)
    const setUserAdminStatus = useAuthStore((state) => state.setUserAdminStatus)
    const deleteUserAccount = useAuthStore((state) => state.deleteUserAccount)
    const problems = useProblemStore((state) => state.problems)
    const contests = useContestStore((state) => state.contests)

    const [pendingAction, setPendingAction] = useState(null)
    const [busyKey, setBusyKey] = useState(null)

    useEffect(() => {
        syncUsersDirectory()
    }, [syncUsersDirectory])

    const users = useMemo(() => (
        Object.values(usersMap || {}).sort((left, right) => {
            if (left.username === user?.username) return -1
            if (right.username === user?.username) return 1
            if (left.isOnline !== right.isOnline) return left.isOnline ? -1 : 1
            if (left.isAdmin !== right.isAdmin) return left.isAdmin ? -1 : 1
            return left.username.localeCompare(right.username)
        })
    ), [user?.username, usersMap])

    const totalAdmins = users.filter((entry) => entry.isAdmin).length
    const totalOnline = users.filter((entry) => entry.isOnline).length
    const totalOffline = Math.max(users.length - totalOnline, 0)

    const handleConfirmAction = async () => {
        if (!pendingAction?.target) return
        const target = pendingAction.target
        const actionKey = `${pendingAction.type}:${target.username}`
        setBusyKey(actionKey)

        try {
            if (pendingAction.type === 'delete') {
                await deleteUserAccount(target.username)
                toast.success(`Removed ${target.displayName || target.username}`, {
                    style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
                })
            } else {
                const nextIsAdmin = !target.isAdmin
                await setUserAdminStatus(target.username, nextIsAdmin)
                toast.success(
                    nextIsAdmin
                        ? `${target.displayName || target.username} is now an admin`
                        : `${target.displayName || target.username} is no longer an admin`,
                    {
                        style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
                    }
                )
            }
            setPendingAction(null)
        } catch (error) {
            toast.error(error?.response?.data?.detail || 'Admin action failed', {
                style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
            })
        } finally {
            setBusyKey(null)
        }
    }

    const openAction = (type, target) => {
        if (!target) return
        setPendingAction({ type, target })
    }

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0b0f19 0%, #121826 45%, #0b0f19 100%)', color: '#e5e7eb', fontFamily: '"Inter", "Roboto", sans-serif' }}>
            <Navbar />

            <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '36px 28px 64px' }}>
                <div style={{ ...cardStyle, padding: '28px', marginBottom: '24px', display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 1fr)', gap: '18px' }}>
                    <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 14px', borderRadius: '999px', background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.20)', marginBottom: '18px' }}>
                            <Shield size={13} style={{ color: '#34d399' }} />
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#34d399', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Admin Control</span>
                        </div>
                        <h1 style={{ fontSize: '38px', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.03em', color: '#f8fafc', marginBottom: '12px' }}>
                            Manage users, roles, and the live workspace.
                        </h1>
                        <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#94a3b8', maxWidth: '680px' }}>
                            Admin access is enabled for <span style={{ color: '#f8fafc', fontWeight: 700 }}>{user?.email}</span>. From here you can promote other users to admin, remove accounts, and jump into the problem and contest management flows.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                        {[
                            { label: 'Users', value: users.length, icon: <Users size={16} style={{ color: '#60a5fa' }} /> },
                            { label: 'Admins', value: totalAdmins, icon: <Crown size={16} style={{ color: '#fbbf24' }} /> },
                            { label: 'Online', value: totalOnline, icon: <Wifi size={16} style={{ color: '#34d399' }} /> },
                            { label: 'Offline', value: totalOffline, icon: <WifiOff size={16} style={{ color: '#f87171' }} /> },
                        ].map((item) => (
                            <div key={item.label} style={{ borderRadius: '18px', padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ width: '38px', height: '38px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '10px' }}>
                                    {item.icon}
                                </div>
                                <div style={{ fontSize: '23px', fontWeight: 800, color: '#f8fafc' }}>{item.value}</div>
                                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <Link
                        to="/problems?domain=DSA"
                        style={{
                            ...cardStyle,
                            padding: '22px',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px',
                        }}
                    >
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(96,165,250,0.14)', border: '1px solid rgba(96,165,250,0.20)' }}>
                                    <FolderCog size={18} style={{ color: '#60a5fa' }} />
                                </div>
                                <span style={{ fontSize: '17px', fontWeight: 800, color: '#f8fafc' }}>Problem Management</span>
                            </div>
                            <p style={{ fontSize: '13px', lineHeight: 1.7, color: '#94a3b8' }}>
                                Add, edit, and delete problems directly from the problem list. Admins can also moderate solution posts from the solutions tab inside each problem.
                            </p>
                        </div>
                        <ArrowRight size={18} style={{ color: '#60a5fa', flexShrink: 0 }} />
                    </Link>

                    <Link
                        to="/contests"
                        style={{
                            ...cardStyle,
                            padding: '22px',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px',
                        }}
                    >
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.20)' }}>
                                    <Trophy size={18} style={{ color: '#34d399' }} />
                                </div>
                                <span style={{ fontSize: '17px', fontWeight: 800, color: '#f8fafc' }}>Contest Management</span>
                            </div>
                            <p style={{ fontSize: '13px', lineHeight: 1.7, color: '#94a3b8' }}>
                                The contest system currently holds <span style={{ color: '#f8fafc', fontWeight: 700 }}>{contests.length}</span> contests and <span style={{ color: '#f8fafc', fontWeight: 700 }}>{problems.length}</span> problems for use in events.
                            </p>
                        </div>
                        <ArrowRight size={18} style={{ color: '#34d399', flexShrink: 0 }} />
                    </Link>
                </div>

                <div style={{ ...cardStyle, padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '18px', flexWrap: 'wrap' }}>
                        <div>
                            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>Users Directory</h2>
                            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.7 }}>
                                Promote users to admin, monitor who is online, and remove accounts from the system.
                            </p>
                        </div>
                        <button
                            onClick={() => syncUsersDirectory()}
                            style={{
                                padding: '10px 14px',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: '#dbe4f0',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            Refresh Users
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {users.map((entry) => {
                            const isSelf = entry.username === user?.username
                            const isImmutableAdmin = entry.username === 'admin'
                            const actionDisabled = busyKey !== null && busyKey.includes(entry.username)

                            return (
                                <div
                                    key={entry.username}
                                    style={{
                                        borderRadius: '18px',
                                        padding: '18px 20px',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        background: 'rgba(255,255,255,0.025)',
                                        display: 'grid',
                                        gridTemplateColumns: 'minmax(0, 1.2fr) auto auto',
                                        gap: '18px',
                                        alignItems: 'center',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, color: '#071014', background: entry.isAdmin ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'linear-gradient(135deg, #34d399, #059669)' }}>
                                            {(entry.displayName || entry.username || 'U')[0]?.toUpperCase()}
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>
                                                    {entry.displayName || entry.username}
                                                </span>
                                                {entry.isAdmin && (
                                                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#fbbf24', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.18)', padding: '3px 8px', borderRadius: '999px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                                        Admin
                                                    </span>
                                                )}
                                                {isImmutableAdmin && (
                                                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#c4b5fd', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.18)', padding: '3px 8px', borderRadius: '999px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                                        Default
                                                    </span>
                                                )}
                                                <span style={{ fontSize: '11px', fontWeight: 800, color: entry.isOnline ? '#34d399' : '#f87171', background: entry.isOnline ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)', border: `1px solid ${entry.isOnline ? 'rgba(52,211,153,0.18)' : 'rgba(248,113,113,0.18)'}`, padding: '3px 8px', borderRadius: '999px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                                    {entry.isOnline ? 'Online' : 'Offline'}
                                                </span>
                                                {isSelf && (
                                                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#93c5fd', background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.18)', padding: '3px 8px', borderRadius: '999px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                                        You
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {entry.email}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                Last seen: {formatLastSeen(entry.lastSeenAt)}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        disabled={isSelf || isImmutableAdmin || actionDisabled}
                                        onClick={() => openAction('toggle-admin', entry)}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '12px',
                                            border: `1px solid ${entry.isAdmin ? 'rgba(245,158,11,0.22)' : 'rgba(52,211,153,0.22)'}`,
                                            background: entry.isAdmin ? 'rgba(245,158,11,0.10)' : 'rgba(52,211,153,0.10)',
                                            color: entry.isAdmin ? '#fbbf24' : '#6ee7b7',
                                            fontSize: '13px',
                                            fontWeight: 800,
                                            cursor: isSelf || isImmutableAdmin || actionDisabled ? 'default' : 'pointer',
                                            opacity: isSelf || isImmutableAdmin || actionDisabled ? 0.55 : 1,
                                            minWidth: '140px',
                                        }}
                                    >
                                        {entry.isAdmin ? 'Remove Admin' : 'Make Admin'}
                                    </button>

                                    <button
                                        disabled={isSelf || isImmutableAdmin || actionDisabled}
                                        onClick={() => openAction('delete', entry)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            padding: '10px 14px',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(248,113,113,0.22)',
                                            background: 'rgba(248,113,113,0.10)',
                                            color: '#fca5a5',
                                            fontSize: '13px',
                                            fontWeight: 800,
                                            cursor: isSelf || isImmutableAdmin || actionDisabled ? 'default' : 'pointer',
                                            opacity: isSelf || isImmutableAdmin || actionDisabled ? 0.55 : 1,
                                        }}
                                    >
                                        <Trash2 size={14} />
                                        Remove
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {pendingAction && (
                <div
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !busyKey) {
                            setPendingAction(null)
                        }
                    }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 100000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px 16px',
                        background: 'rgba(3, 7, 18, 0.72)',
                        backdropFilter: 'blur(10px)',
                    }}
                >
                    <div style={{ width: 'min(92vw, 460px)', borderRadius: '24px', padding: '24px', background: 'linear-gradient(180deg, rgba(21,26,35,0.98) 0%, rgba(12,16,24,0.98) 100%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.45)' }}>
                        <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', marginBottom: '18px', background: pendingAction.type === 'delete' ? 'rgba(248,113,113,0.12)' : 'rgba(245,158,11,0.12)', border: `1px solid ${pendingAction.type === 'delete' ? 'rgba(248,113,113,0.16)' : 'rgba(245,158,11,0.16)'}`, color: pendingAction.type === 'delete' ? '#fca5a5' : '#fbbf24' }}>
                            {pendingAction.type === 'delete' ? <Trash2 size={20} /> : <Crown size={20} />}
                        </div>

                        <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.04em', marginBottom: '10px' }}>
                            {pendingAction.type === 'delete'
                                ? 'Delete this user?'
                                : pendingAction.target.isAdmin
                                    ? 'Remove admin access?'
                                    : 'Promote this user to admin?'}
                        </h2>

                        <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#94a3b8', marginBottom: '22px' }}>
                            {pendingAction.type === 'delete'
                                ? <>This will remove <span style={{ color: '#f8fafc', fontWeight: 700 }}>{pendingAction.target.displayName || pendingAction.target.username}</span> from the current system.</>
                                : pendingAction.target.isAdmin
                                    ? <>This will remove admin rights from <span style={{ color: '#f8fafc', fontWeight: 700 }}>{pendingAction.target.displayName || pendingAction.target.username}</span>.</>
                                    : <>This will give <span style={{ color: '#f8fafc', fontWeight: 700 }}>{pendingAction.target.displayName || pendingAction.target.username}</span> the same admin UI and admin rights as you.</>}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setPendingAction(null)}
                                disabled={Boolean(busyKey)}
                                style={{ padding: '11px 16px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1', fontSize: '13px', fontWeight: 800, opacity: busyKey ? 0.6 : 1 }}
                            >
                                No
                            </button>
                            <button
                                onClick={handleConfirmAction}
                                disabled={Boolean(busyKey)}
                                style={{ padding: '11px 16px', borderRadius: '14px', background: pendingAction.type === 'delete' ? 'linear-gradient(135deg, rgba(248,113,113,0.18) 0%, rgba(220,38,38,0.18) 100%)' : 'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(217,119,6,0.18) 100%)', border: `1px solid ${pendingAction.type === 'delete' ? 'rgba(248,113,113,0.22)' : 'rgba(245,158,11,0.22)'}`, color: pendingAction.type === 'delete' ? '#fecaca' : '#fde68a', fontSize: '13px', fontWeight: 800, boxShadow: '0 12px 24px rgba(15,23,42,0.24)', opacity: busyKey ? 0.6 : 1 }}
                            >
                                Yes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
