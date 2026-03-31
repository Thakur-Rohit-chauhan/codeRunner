import { create } from 'zustand'

const STORAGE_KEY = 'coderunner_social_graph_v1'
const HANDLE_PARTS = {
    adjectives: ['rapid', 'silent', 'neon', 'pixel', 'cyber', 'ghost', 'quantum', 'brave', 'lunar', 'matrix', 'swift', 'vector', 'alpha', 'crimson', 'silver', 'frost', 'rocket', 'turbo', 'logic', 'stellar'],
    nouns: ['coder', 'falcon', 'stack', 'byte', 'nexus', 'orbit', 'kernel', 'shadow', 'solver', 'phoenix', 'hunter', 'signal', 'runner', 'forge', 'pilot', 'circuit', 'titan', 'vision', 'graph', 'warden'],
}

const defaultState = {
    profiles: {},
    followingByUser: {},
}

const safeReadState = () => {
    if (typeof window === 'undefined') return defaultState

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return defaultState

        const parsed = JSON.parse(raw)
        return {
            profiles: parsed.profiles || {},
            followingByUser: parsed.followingByUser || {},
        }
    } catch {
        return defaultState
    }
}

const persistState = (state) => {
    if (typeof window === 'undefined') return

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            profiles: state.profiles,
            followingByUser: state.followingByUser,
        }))
    } catch {
        // Ignore persistence failures and keep the in-memory state usable.
    }
}

const usernameSeed = (username = 'user') =>
    username.split('').reduce((total, char) => total + char.charCodeAt(0), 0)

const formatDisplayName = (username = 'user') =>
    username
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())

const buildSeedUsernames = (username, count, kind) => {
    const baseSeed = usernameSeed(`${kind}:${username}`)
    const handles = []
    const seen = new Set()
    let index = 0

    while (handles.length < count && index < count * 6 + 60) {
        const adjective = HANDLE_PARTS.adjectives[(baseSeed + index * 5) % HANDLE_PARTS.adjectives.length]
        const noun = HANDLE_PARTS.nouns[(baseSeed * 3 + index * 7) % HANDLE_PARTS.nouns.length]
        const suffix = 10 + ((baseSeed + index * 11) % 990)
        const handle = `${adjective}_${noun}${suffix}`

        if (handle !== username && !seen.has(handle)) {
            seen.add(handle)
            handles.push(handle)
        }

        index += 1
    }

    return handles
}

export const createSeedProfile = (username) => {
    const seed = usernameSeed(username)

    return {
        username,
        displayName: formatDisplayName(username),
        avatar: null,
        followersBase: 24 + (seed % 180),
        followingBase: 8 + ((seed * 3) % 90),
    }
}

export const getFollowingUsernames = (username, profiles, followingByUser) => {
    const profile = profiles[username] || createSeedProfile(username)
    const manualFollowing = followingByUser[username] || []
    const seedFollowing = buildSeedUsernames(username, profile.followingBase || 0, 'following')
    return [...new Set([...manualFollowing, ...seedFollowing])]
}

export const getFollowerUsernames = (username, profiles, followingByUser) => {
    const profile = profiles[username] || createSeedProfile(username)
    const manualFollowers = Object.entries(followingByUser)
        .filter(([, targets]) => targets.includes(username))
        .map(([followerUsername]) => followerUsername)
    const seedFollowers = buildSeedUsernames(username, profile.followersBase || 0, 'followers')
    return [...new Set([...manualFollowers, ...seedFollowers])]
}

export const computeFollowStats = (username, profiles, followingByUser) => {
    const followers = getFollowerUsernames(username, profiles, followingByUser).length
    const following = getFollowingUsernames(username, profiles, followingByUser).length
    const profile = profiles[username] || createSeedProfile(username)

    return {
        followers,
        following,
        profile,
    }
}

const initialState = safeReadState()

const useSocialStore = create((set, get) => ({
    profiles: initialState.profiles,
    followingByUser: initialState.followingByUser,

    syncProfile: (username, overrides = {}) => {
        if (!username) return

        set((state) => {
            const nextProfiles = {
                ...state.profiles,
                [username]: {
                    ...(state.profiles[username] || createSeedProfile(username)),
                    ...overrides,
                },
            }

            const nextState = {
                profiles: nextProfiles,
                followingByUser: state.followingByUser,
            }

            persistState(nextState)
            return { profiles: nextProfiles }
        })
    },

    followProfile: (viewerUsername, targetUsername) => {
        if (!viewerUsername || !targetUsername || viewerUsername === targetUsername) return

        set((state) => {
            const currentFollowing = state.followingByUser[viewerUsername] || []
            if (currentFollowing.includes(targetUsername)) return state

            const nextFollowingByUser = {
                ...state.followingByUser,
                [viewerUsername]: [...currentFollowing, targetUsername],
            }

            const nextProfiles = {
                ...state.profiles,
                [viewerUsername]: state.profiles[viewerUsername] || createSeedProfile(viewerUsername),
                [targetUsername]: state.profiles[targetUsername] || createSeedProfile(targetUsername),
            }

            const nextState = {
                profiles: nextProfiles,
                followingByUser: nextFollowingByUser,
            }

            persistState(nextState)
            return nextState
        })
    },

    unfollowProfile: (viewerUsername, targetUsername) => {
        if (!viewerUsername || !targetUsername || viewerUsername === targetUsername) return

        set((state) => {
            const currentFollowing = state.followingByUser[viewerUsername] || []
            if (!currentFollowing.includes(targetUsername)) return state

            const nextFollowingByUser = {
                ...state.followingByUser,
                [viewerUsername]: currentFollowing.filter((username) => username !== targetUsername),
            }

            const nextState = {
                profiles: state.profiles,
                followingByUser: nextFollowingByUser,
            }

            persistState(nextState)
            return { followingByUser: nextFollowingByUser }
        })
    },
}))

export default useSocialStore
