import { create } from 'zustand'

const STORAGE_KEY = 'coderunner_social_graph_v1'

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

export const createSeedProfile = (username) => {
    return {
        username,
        displayName: formatDisplayName(username),
        avatar: null,
    }
}

export const getFollowingUsernames = (username, profiles, followingByUser) => {
    return followingByUser[username] || []
}

export const getFollowerUsernames = (username, profiles, followingByUser) => {
    return Object.entries(followingByUser)
        .filter(([, targets]) => targets.includes(username))
        .map(([followerUsername]) => followerUsername)
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
