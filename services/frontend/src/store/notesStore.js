import { create } from 'zustand'

const NOTES_STORAGE_KEY = 'coderunner_notes_v1'
const ACTIVE_NOTE_STORAGE_KEY = 'coderunner_active_note_id_v1'
const LEGACY_NOTE_STORAGE_KEY = 'user_notes'
const LEGACY_NOTE_TITLE_STORAGE_KEY = 'user_notes_title'

const nowIso = () => new Date().toISOString()

const buildNoteId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }

    return `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const safeReadArray = (key) => {
    if (typeof window === 'undefined') return []

    try {
        const raw = window.localStorage.getItem(key)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

const safeReadString = (key) => {
    if (typeof window === 'undefined') return ''
    return window.localStorage.getItem(key) || ''
}

const safeWrite = (key, value) => {
    if (typeof window === 'undefined') return

    try {
        window.localStorage.setItem(key, value)
    } catch {
        // ignore storage write failures
    }
}

const normalizeNote = (note) => {
    const createdAt = note?.createdAt || nowIso()
    const updatedAt = note?.updatedAt || createdAt

    return {
        id: note?.id || buildNoteId(),
        title: (note?.title || 'Untitled Note').trim() || 'Untitled Note',
        content: typeof note?.content === 'string' ? note.content : '',
        createdAt,
        updatedAt,
    }
}

const createNoteRecord = (seed = {}) => {
    const timestamp = nowIso()

    return normalizeNote({
        title: 'Personal Notes',
        content: '',
        createdAt: timestamp,
        updatedAt: timestamp,
        ...seed,
    })
}

const sortNotes = (notes) =>
    [...notes].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())

const readLegacyNote = () => {
    const title = safeReadString(LEGACY_NOTE_TITLE_STORAGE_KEY).trim()
    const content = safeReadString(LEGACY_NOTE_STORAGE_KEY)

    if (!title && !content.trim()) {
        return null
    }

    return createNoteRecord({
        title: title || 'Personal Notes',
        content,
    })
}

const persistNotesState = (notes, activeNoteId) => {
    const orderedNotes = sortNotes(notes.map((note) => normalizeNote(note)))
    const resolvedActiveNoteId =
        orderedNotes.find((note) => note.id === activeNoteId)?.id ||
        orderedNotes[0]?.id ||
        null

    safeWrite(NOTES_STORAGE_KEY, JSON.stringify(orderedNotes))

    if (resolvedActiveNoteId) {
        safeWrite(ACTIVE_NOTE_STORAGE_KEY, resolvedActiveNoteId)
    }

    const activeNote = orderedNotes.find((note) => note.id === resolvedActiveNoteId) || orderedNotes[0] || null
    if (activeNote) {
        safeWrite(LEGACY_NOTE_STORAGE_KEY, activeNote.content)
        safeWrite(LEGACY_NOTE_TITLE_STORAGE_KEY, activeNote.title)
    }

    return {
        notes: orderedNotes,
        activeNoteId: resolvedActiveNoteId,
    }
}

const loadNotesState = () => {
    const storedNotes = safeReadArray(NOTES_STORAGE_KEY).map((note) => normalizeNote(note))
    const migratedLegacyNote = readLegacyNote()
    let notes = storedNotes

    if (notes.length === 0 && migratedLegacyNote) {
        notes = [migratedLegacyNote]
    }

    if (notes.length === 0) {
        notes = [createNoteRecord()]
    }

    const storedActiveNoteId = safeReadString(ACTIVE_NOTE_STORAGE_KEY)
    return persistNotesState(notes, storedActiveNoteId)
}

const initialState = loadNotesState()

export const selectActiveNote = (state) =>
    state.notes.find((note) => note.id === state.activeNoteId) || state.notes[0] || null

const useNotesStore = create((set, get) => ({
    notes: initialState.notes,
    activeNoteId: initialState.activeNoteId,

    selectNote: (noteId) => {
        set((state) => {
            const next = persistNotesState(state.notes, noteId)
            return next
        })
    },

    createNote: (seed = {}) => {
        const note = createNoteRecord(seed)

        set((state) => {
            const next = persistNotesState([note, ...state.notes], note.id)
            return next
        })

        return note.id
    },

    updateNote: (noteId, patch) => {
        set((state) => {
            const nextNotes = state.notes.map((note) =>
                note.id === noteId
                    ? normalizeNote({
                        ...note,
                        ...patch,
                        updatedAt: nowIso(),
                    })
                    : note
            )

            return persistNotesState(nextNotes, state.activeNoteId)
        })
    },

    updateActiveNote: (patch) => {
        const activeNoteId = get().activeNoteId
        if (!activeNoteId) return
        get().updateNote(activeNoteId, patch)
    },

    deleteNote: (noteId) => {
        set((state) => {
            let nextNotes = state.notes.filter((note) => note.id !== noteId)

            if (nextNotes.length === 0) {
                nextNotes = [createNoteRecord({ title: 'Untitled Note' })]
            }

            const nextActiveNoteId = state.activeNoteId === noteId ? nextNotes[0].id : state.activeNoteId
            return persistNotesState(nextNotes, nextActiveNoteId)
        })
    },
}))

export default useNotesStore
