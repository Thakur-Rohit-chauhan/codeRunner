import { useMemo, useState } from 'react'
import { Clock3, Download, FileText, Plus, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar/Navbar'
import useAuthStore from '../store/authStore'
import useNotesStore, { selectActiveNote } from '../store/notesStore'

const formatTimestamp = (value) =>
    new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value))

const buildPreview = (content = '') => {
    const normalized = content.replace(/\s+/g, ' ').trim()
    return normalized || 'No content yet'
}

const exportNoteToFile = (note) => {
    if (!note) return

    const blob = new Blob([note.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${(note.title || 'note').trim() || 'note'}.txt`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
}

export default function Notes() {
    const user = useAuthStore((state) => state.user)
    const notes = useNotesStore((state) => state.notes)
    const activeNote = useNotesStore(selectActiveNote)
    const selectNote = useNotesStore((state) => state.selectNote)
    const createNote = useNotesStore((state) => state.createNote)
    const updateActiveNote = useNotesStore((state) => state.updateActiveNote)
    const deleteNote = useNotesStore((state) => state.deleteNote)
    const [search, setSearch] = useState('')
    const [notePendingDelete, setNotePendingDelete] = useState(null)

    const filteredNotes = useMemo(() => {
        const query = search.trim().toLowerCase()
        if (!query) return notes

        return notes.filter((note) =>
            note.title.toLowerCase().includes(query) ||
            note.content.toLowerCase().includes(query)
        )
    }, [notes, search])

    const handleCreateNote = () => {
        createNote({
            title: `Note ${notes.length + 1}`,
        })
        toast.success('New note created', {
            style: {
                background: 'rgba(30,36,44,0.95)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
            },
        })
    }

    const handleDeleteNote = () => {
        if (!activeNote) return

        setNotePendingDelete(activeNote)
    }

    const handleConfirmDelete = () => {
        if (!notePendingDelete) return

        deleteNote(notePendingDelete.id)
        setNotePendingDelete(null)
        toast.success('Note deleted', {
            style: {
                background: 'rgba(30,36,44,0.95)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
            },
        })
    }

    return (
        <div
            className="min-h-screen"
            style={{
                background: 'linear-gradient(135deg, #0b0f19 0%, #161b22 100%)',
                color: '#e5e7eb',
                fontFamily: '"Inter", "Roboto", sans-serif',
            }}
        >
            <Navbar />

            <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '28px 32px 48px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '20px',
                        flexWrap: 'wrap',
                        marginBottom: '28px',
                    }}
                >
                    <div style={{ minWidth: 0 }}>
                        <p
                            style={{
                                fontSize: '12px',
                                fontWeight: 800,
                                color: '#6ee7b7',
                                textTransform: 'uppercase',
                                letterSpacing: '0.16em',
                                marginBottom: '10px',
                            }}
                        >
                            Notes Workspace
                        </p>
                        <h1
                            style={{
                                fontSize: '40px',
                                fontWeight: 900,
                                color: '#f8fafc',
                                letterSpacing: '-0.05em',
                                marginBottom: '10px',
                            }}
                        >
                            Saved Notes
                        </h1>
                        <p style={{ fontSize: '15px', color: '#94a3b8', maxWidth: '760px', lineHeight: 1.7 }}>
                            Keep all of your quick references, formulas, debugging steps, and reminders in one place.
                            Your notes are saved locally in this browser and remain accessible from the project.
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'stretch', gap: '12px', flexWrap: 'wrap' }}>
                        <div
                            style={{
                                minWidth: '170px',
                                padding: '16px 18px',
                                borderRadius: '18px',
                                background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                                border: '1px solid rgba(255,255,255,0.06)',
                            }}
                        >
                            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>
                                Total Notes
                            </div>
                            <div style={{ fontSize: '28px', fontWeight: 900, color: '#f8fafc' }}>{notes.length}</div>
                        </div>
                        <div
                            style={{
                                minWidth: '220px',
                                padding: '16px 18px',
                                borderRadius: '18px',
                                background: 'linear-gradient(180deg, rgba(52,211,153,0.12) 0%, rgba(5,150,105,0.08) 100%)',
                                border: '1px solid rgba(52,211,153,0.14)',
                                boxShadow: '0 16px 32px rgba(16,185,129,0.08)',
                            }}
                        >
                            <div style={{ fontSize: '12px', color: '#a7f3d0', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>
                                Active Note
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#ecfdf5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {activeNote?.title || 'Personal Notes'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#bbf7d0', marginTop: '8px' }}>
                                {user?.displayName ? `For ${user.displayName}` : 'Ready to edit'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                    <aside
                        style={{
                            borderRadius: '24px',
                            padding: '20px',
                            background: 'linear-gradient(180deg, rgba(18,22,30,0.96) 0%, rgba(11,15,25,0.98) 100%)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            boxShadow: '0 18px 40px rgba(0,0,0,0.18)',
                            minHeight: '640px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                        }}
                    >
                        <button
                            onClick={handleCreateNote}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, rgba(52,211,153,0.18) 0%, rgba(5,150,105,0.16) 100%)',
                                border: '1px solid rgba(52,211,153,0.24)',
                                color: '#d1fae5',
                                fontSize: '13px',
                                fontWeight: 800,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                boxShadow: '0 14px 28px rgba(16,185,129,0.12)',
                            }}
                        >
                            <Plus size={16} />
                            New Note
                        </button>

                        <div style={{ position: 'relative' }}>
                            <Search
                                style={{
                                    position: 'absolute',
                                    left: '14px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '16px',
                                    height: '16px',
                                    color: '#64748b',
                                }}
                            />
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search notes"
                                style={{
                                    width: '100%',
                                    paddingLeft: '40px',
                                    paddingRight: '14px',
                                    paddingTop: '12px',
                                    paddingBottom: '12px',
                                    borderRadius: '14px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    color: '#d1d5db',
                                    fontSize: '14px',
                                    outline: 'none',
                                }}
                            />
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                padding: '0 2px',
                            }}
                        >
                            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                                Note Library
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                                {filteredNotes.length} shown
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', paddingRight: '4px' }}>
                            {filteredNotes.map((note) => {
                                const isActive = note.id === activeNote?.id

                                return (
                                    <button
                                        key={note.id}
                                        onClick={() => selectNote(note.id)}
                                        style={{
                                            width: '100%',
                                            textAlign: 'left',
                                            padding: '16px',
                                            borderRadius: '18px',
                                            background: isActive
                                                ? 'linear-gradient(135deg, rgba(52,211,153,0.14) 0%, rgba(5,150,105,0.1) 100%)'
                                                : 'rgba(255,255,255,0.02)',
                                            border: `1px solid ${isActive ? 'rgba(52,211,153,0.22)' : 'rgba(255,255,255,0.04)'}`,
                                            boxShadow: isActive ? '0 14px 28px rgba(16,185,129,0.08)' : 'none',
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                                            <div style={{ minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        fontSize: '15px',
                                                        fontWeight: 800,
                                                        color: isActive ? '#ecfdf5' : '#f8fafc',
                                                        marginBottom: '6px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {note.title}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: isActive ? '#a7f3d0' : '#64748b' }}>
                                                    <Clock3 size={12} />
                                                    {formatTimestamp(note.updatedAt)}
                                                </div>
                                            </div>
                                            <FileText size={16} color={isActive ? '#6ee7b7' : '#64748b'} />
                                        </div>

                                        <p
                                            style={{
                                                fontSize: '13px',
                                                lineHeight: 1.6,
                                                color: isActive ? '#d1fae5' : '#94a3b8',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {buildPreview(note.content)}
                                        </p>
                                    </button>
                                )
                            })}

                            {filteredNotes.length === 0 && (
                                <div
                                    style={{
                                        padding: '24px 18px',
                                        borderRadius: '18px',
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px dashed rgba(255,255,255,0.08)',
                                        textAlign: 'center',
                                    }}
                                >
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                                        No notes match your search
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                                        Try a different keyword or create a fresh note.
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>

                    <section
                        style={{
                            borderRadius: '24px',
                            padding: '24px',
                            background: 'linear-gradient(180deg, rgba(18,22,30,0.96) 0%, rgba(11,15,25,0.98) 100%)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            boxShadow: '0 18px 40px rgba(0,0,0,0.18)',
                            minHeight: '640px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '18px',
                        }}
                    >
                        {activeNote && (
                            <>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        justifyContent: 'space-between',
                                        gap: '16px',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ fontSize: '12px', color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '10px' }}>
                                            Active Note
                                        </div>
                                        <input
                                            type="text"
                                            value={activeNote.title}
                                            onChange={(event) => updateActiveNote({ title: event.target.value })}
                                            placeholder="Untitled Note"
                                            style={{
                                                width: '100%',
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#f8fafc',
                                                fontSize: '34px',
                                                fontWeight: 900,
                                                letterSpacing: '-0.04em',
                                                outline: 'none',
                                                marginBottom: '10px',
                                            }}
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '12px', color: '#64748b' }}>
                                            <span>Created {formatTimestamp(activeNote.createdAt)}</span>
                                            <span style={{ color: '#334155' }}>•</span>
                                            <span>Updated {formatTimestamp(activeNote.updatedAt)}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                        <button
                                            onClick={() => exportNoteToFile(activeNote)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '11px 16px',
                                                borderRadius: '14px',
                                                background: '#f8fafc',
                                                color: '#0f172a',
                                                fontSize: '13px',
                                                fontWeight: 800,
                                                boxShadow: '0 12px 24px rgba(15,23,42,0.14)',
                                            }}
                                        >
                                            <Download size={15} />
                                            Export
                                        </button>
                                        <button
                                            onClick={handleDeleteNote}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '11px 16px',
                                                borderRadius: '14px',
                                                background: 'rgba(248,113,113,0.08)',
                                                border: '1px solid rgba(248,113,113,0.14)',
                                                color: '#fca5a5',
                                                fontSize: '13px',
                                                fontWeight: 800,
                                            }}
                                        >
                                            <Trash2 size={15} />
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                <textarea
                                    value={activeNote.content}
                                    onChange={(event) => updateActiveNote({ content: event.target.value })}
                                    placeholder="Write your notes here. They are saved automatically."
                                    style={{
                                        width: '100%',
                                        flex: 1,
                                        minHeight: '460px',
                                        background: 'linear-gradient(180deg, rgba(9,13,20,0.98) 0%, rgba(15,23,33,0.98) 100%)',
                                        border: '1px solid rgba(148,163,184,0.18)',
                                        borderRadius: '22px',
                                        padding: '22px 24px',
                                        color: '#e2e8f0',
                                        fontSize: '14px',
                                        lineHeight: '1.8',
                                        resize: 'vertical',
                                        outline: 'none',
                                        fontFamily: '"JetBrains Mono", monospace',
                                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                                    }}
                                />

                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '14px',
                                        flexWrap: 'wrap',
                                        padding: '16px 18px',
                                        borderRadius: '18px',
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '6px' }}>
                                            Autosave Enabled
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                                            This note updates instantly in local browser storage.
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                                        {activeNote.content.trim() ? `${activeNote.content.length} characters saved` : 'Start typing to save your note'}
                                    </div>
                                </div>
                            </>
                        )}
                    </section>
                </div>
            </div>

            {notePendingDelete && (
                <div
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setNotePendingDelete(null)
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
                        WebkitBackdropFilter: 'blur(10px)',
                    }}
                >
                    <div
                        style={{
                            width: 'min(92vw, 440px)',
                            borderRadius: '24px',
                            padding: '24px',
                            background: 'linear-gradient(180deg, rgba(21,26,35,0.98) 0%, rgba(12,16,24,0.98) 100%)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
                        }}
                    >
                        <div
                            style={{
                                width: '48px',
                                height: '48px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '16px',
                                marginBottom: '18px',
                                background: 'rgba(248,113,113,0.12)',
                                border: '1px solid rgba(248,113,113,0.16)',
                                color: '#fca5a5',
                            }}
                        >
                            <Trash2 size={20} />
                        </div>

                        <h2
                            style={{
                                fontSize: '24px',
                                fontWeight: 900,
                                color: '#f8fafc',
                                letterSpacing: '-0.04em',
                                marginBottom: '10px',
                            }}
                        >
                            Delete this note?
                        </h2>

                        <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#94a3b8', marginBottom: '22px' }}>
                            You are about to delete <span style={{ color: '#f8fafc', fontWeight: 700 }}>"{notePendingDelete.title}"</span>.
                            This action cannot be undone.
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setNotePendingDelete(null)}
                                style={{
                                    padding: '11px 16px',
                                    borderRadius: '14px',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#cbd5e1',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                }}
                            >
                                No
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                style={{
                                    padding: '11px 16px',
                                    borderRadius: '14px',
                                    background: 'linear-gradient(135deg, rgba(248,113,113,0.18) 0%, rgba(220,38,38,0.18) 100%)',
                                    border: '1px solid rgba(248,113,113,0.22)',
                                    color: '#fecaca',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    boxShadow: '0 12px 24px rgba(127,29,29,0.16)',
                                }}
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
