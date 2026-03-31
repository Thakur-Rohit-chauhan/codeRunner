import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Panel, Group, Separator } from 'react-resizable-panels'
import Editor from '@monaco-editor/react'
import { ArrowLeft, ChevronLeft, ChevronRight, Shuffle, Play, Pause, Square, Upload, Clock, Settings, Check, X, Tag, Code2, FileText, MessageSquare, History, Maximize2, Minimize2, RotateCcw, RotateCw, Terminal, Bookmark, Star, ThumbsUp, MessageCircle, ExternalLink, Lightbulb, ChevronUp, Search, ArrowUpDown, SlidersHorizontal, User, LogOut, Palette, BarChart3, Layout, BookOpen, ChevronDown, Filter, EyeOff, Plus, Minus } from 'lucide-react'
import useAuthStore from '../store/authStore'
import useSubmissionStore from '../store/submissionStore'
import { getProblemDetail, mockProblems } from '../utils/mockData'
import { buildStarterCodeMap, getDefaultLanguageForDomain, getLanguagesForDomain, getStarterCodeForLanguage, languageLabelMap } from '../utils/compilerLanguages'
import toast from 'react-hot-toast'

const COLORS = {
    bgMain: '#0b0f19',
    bgCard: '#1e242c',
    bgHover: '#2a323c',
    border: 'rgba(255,255,255,0.08)',
    textMain: '#e5e7eb',
    textMuted: '#9ca3af',
}

const domainColors = {
    DSA: { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa', border: 'rgba(59,130,246,0.2)' },
    ML: { bg: 'rgba(0,184,163,0.12)', text: '#34d399', border: 'rgba(0,184,163,0.2)' },
    CTF: { bg: 'rgba(239,68,68,0.12)', text: '#f87171', border: 'rgba(239,68,68,0.2)' },
}

const diffColors = {
    Easy: '#34d399',
    Medium: '#fbbf24',
    Hard: '#f87171',
}

const diffBg = {
    Easy: 'rgba(52,211,153,0.1)',
    Medium: 'rgba(251,191,36,0.1)',
    Hard: 'rgba(248,113,113,0.1)',
}

const domainLabelMap = {
    DSA: 'DSA',
    ML: 'Machine Learning',
    CTF: 'Cyber Security',
}

function getRunToast(problem) {
    if (problem.domain === 'ML') return 'Evaluation run finished'
    if (problem.domain === 'CTF') return 'Challenge run finished'
    return 'Test passed!'
}

function getSubmitToast(problem) {
    if (problem.domain === 'ML') return 'Model accepted for evaluation'
    if (problem.domain === 'CTF') return 'Finding verified'
    return 'Solution Accepted! 🎉'
}

function getInputLabel(problem) {
    if (problem.domain === 'ML') return 'Validation Input'
    if (problem.domain === 'CTF') return 'Payload / Artifact'
    return 'Custom Input'
}

function getMockRunResult(problem, lang) {
    if (problem.domain === 'ML') {
        if (problem.id === 15) {
            return {
                status: 'Accepted',
                stdout: `[${languageLabelMap[lang]}] val_accuracy=73.4%\ntrain_loss=0.61\ncheckpoint=cnn_epoch5.pt`,
                expected: 'Accuracy >= 70%',
                time: '2m 18s',
                memory: '1.3 GB',
            }
        }

        if (problem.id === 16) {
            return {
                status: 'Accepted',
                stdout: `[${languageLabelMap[lang]}] precision=0.92\nrecall=0.89\nmacro_f1=0.90`,
                expected: 'precision / recall / f1 reported',
                time: '1m 42s',
                memory: '824 MB',
            }
        }

        if (problem.id === 17) {
            return {
                status: 'Accepted',
                stdout: `[${languageLabelMap[lang]}] m=0.61\nb=2.18\nmse=0.48`,
                expected: 'm ≈ 0.6, b ≈ 2.2',
                time: '0.8 s',
                memory: '96 MB',
            }
        }

        return {
            status: 'Accepted',
            stdout: `[${languageLabelMap[lang]}] benchmark run completed`,
            expected: problem.testCases[0]?.expectedOutput || 'Benchmark cleared',
            time: '1m 12s',
            memory: '512 MB',
        }
    }

    if (problem.domain === 'CTF') {
        if (problem.id === 18) {
            return {
                status: 'Accepted',
                stdout: `[${languageLabelMap[lang]}] suspicious_host=198.51.100.42\nflag=FLAG{covert_http_channel}`,
                expected: 'FLAG{...}',
                time: '1.1 s',
                memory: '44 MB',
            }
        }

        if (problem.id === 19) {
            return {
                status: 'Accepted',
                stdout: `[${languageLabelMap[lang]}] offset=72\nsecret=0x080491d6\noutput=You got the flag!`,
                expected: 'You got the flag!',
                time: '0.9 s',
                memory: '28 MB',
            }
        }

        if (problem.id === 20) {
            return {
                status: 'Accepted',
                stdout: `[${languageLabelMap[lang]}] bypass=ok\ntable=users\nadmin_hash=5f4dcc3b5aa765d61d8327deb882cf99`,
                expected: 'Login bypassed',
                time: '0.6 s',
                memory: '24 MB',
            }
        }

        return {
            status: 'Accepted',
            stdout: `[${languageLabelMap[lang]}] challenge verification completed`,
            expected: problem.testCases[0]?.expectedOutput || 'Flag recovered',
            time: '1.0 s',
            memory: '32 MB',
        }
    }

    return {
        status: 'Accepted',
        stdout: '[0, 1]',
        expected: '[0,1]',
        time: '4ms',
        memory: '8.2 MB',
    }
}

function getMockSubmitResult(problem, lang) {
    if (problem.domain === 'ML') {
        if (problem.id === 15) {
            return {
                status: 'Accepted',
                stdout: `[${languageLabelMap[lang]}] hidden_test_accuracy=72.8%\nartifacts=model.pt, metrics.json`,
                expected: 'Hidden benchmark passed',
                time: '2m 44s',
                memory: '1.4 GB',
                allPassed: true,
            }
        }

        if (problem.id === 16) {
            return {
                status: 'Accepted',
                stdout: `[${languageLabelMap[lang]}] holdout_macro_f1=0.91\nreport_schema=pass`,
                expected: 'Hidden benchmark passed',
                time: '1m 58s',
                memory: '880 MB',
                allPassed: true,
            }
        }

        if (problem.id === 17) {
            return {
                status: 'Accepted',
                stdout: `[${languageLabelMap[lang]}] recovered_m=0.60\nrecovered_b=2.20\nplot_artifact=pass`,
                expected: 'Hidden benchmark passed',
                time: '1.0 s',
                memory: '102 MB',
                allPassed: true,
            }
        }

        return {
            status: 'Accepted',
            stdout: `[${languageLabelMap[lang]}] model package accepted`,
            expected: 'Hidden benchmark passed',
            time: '1m 30s',
            memory: '640 MB',
            allPassed: true,
        }
    }

    if (problem.domain === 'CTF') {
        if (problem.id === 18) {
            return {
                status: 'Accepted',
                stdout: `[${languageLabelMap[lang]}] flag verified\nFLAG{covert_http_channel}`,
                expected: 'Flag verified',
                time: '1.2 s',
                memory: '44 MB',
                allPassed: true,
            }
        }

        if (problem.id === 19) {
            return {
                status: 'Accepted',
                stdout: `[${languageLabelMap[lang]}] replay succeeded\nYou got the flag!`,
                expected: 'Exploit replayed',
                time: '1.0 s',
                memory: '29 MB',
                allPassed: true,
            }
        }

        if (problem.id === 20) {
            return {
                status: 'Accepted',
                stdout: `[${languageLabelMap[lang]}] injection chain replayed\nadmin secret extracted`,
                expected: 'Verifier accepted finding',
                time: '0.7 s',
                memory: '25 MB',
                allPassed: true,
            }
        }

        return {
            status: 'Accepted',
            stdout: `[${languageLabelMap[lang]}] challenge solved`,
            expected: 'Verifier accepted finding',
            time: '1.1 s',
            memory: '32 MB',
            allPassed: true,
        }
    }

    return {
        status: 'Accepted',
        stdout: 'All test cases passed',
        expected: '—',
        time: '4ms',
        memory: '8.2 MB',
        allPassed: true,
    }
}

function getMockSubmissions(problem) {
    if (problem.domain === 'ML') {
        return [
            { id: 1, status: 'Accepted', language: 'Python', runtime: '2m 44s', memory: '1.4 GB', timestamp: '2026-03-28 22:14', beats: 'top 18%' },
            { id: 2, status: 'Wrong Answer', language: 'R', runtime: '—', memory: '—', timestamp: '2026-03-28 21:50', beats: null },
            { id: 3, status: 'Accepted', language: 'SQL', runtime: '1m 58s', memory: '880 MB', timestamp: '2026-03-27 14:32', beats: 'top 24%' },
            { id: 4, status: 'Time Limit Exceeded', language: 'Julia', runtime: '—', memory: '—', timestamp: '2026-03-26 11:05', beats: null },
        ]
    }

    if (problem.domain === 'CTF') {
        return [
            { id: 1, status: 'Accepted', language: 'Python', runtime: '1.2 s', memory: '44 MB', timestamp: '2026-03-28 22:14', beats: 'top 12%' },
            { id: 2, status: 'Wrong Answer', language: 'Bash', runtime: '—', memory: '—', timestamp: '2026-03-28 21:50', beats: null },
            { id: 3, status: 'Accepted', language: 'C', runtime: '0.9 s', memory: '29 MB', timestamp: '2026-03-27 14:32', beats: 'top 21%' },
            { id: 4, status: 'Time Limit Exceeded', language: 'PowerShell', runtime: '—', memory: '—', timestamp: '2026-03-26 11:05', beats: null },
        ]
    }

    return [
        { id: 1, status: 'Accepted', language: 'C++', runtime: '4 ms', memory: '8.2 MB', timestamp: '2026-03-28 22:14', beats: '95.3%' },
        { id: 2, status: 'Wrong Answer', language: 'Python', runtime: '—', memory: '—', timestamp: '2026-03-28 21:50', beats: null },
        { id: 3, status: 'Accepted', language: 'C++', runtime: '8 ms', memory: '9.1 MB', timestamp: '2026-03-27 14:32', beats: '82.1%' },
        { id: 4, status: 'Time Limit Exceeded', language: 'Java', runtime: '—', memory: '—', timestamp: '2026-03-26 11:05', beats: null },
        { id: 5, status: 'Accepted', language: 'JavaScript', runtime: '12 ms', memory: '10.4 MB', timestamp: '2026-03-25 09:18', beats: '74.6%' },
    ]
}

export default function ProblemSolver() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const topicParam = searchParams.get('topic')
    const listParam = searchParams.get('list')
    const domainParam = searchParams.get('domain')

    const { user, logout } = useAuthStore()
    const addSubmission = useSubmissionStore((state) => state.addSubmission)
    const problem = useMemo(() => getProblemDetail(id) || getProblemDetail(1), [id])
    const availableLanguages = useMemo(() => getLanguagesForDomain(problem.domain), [problem.domain])

    const [lang, setLang] = useState(getDefaultLanguageForDomain(problem.domain))
    const [codes, setCodes] = useState(
        buildStarterCodeMap(problem)
    )
    const [descTab, setDescTab] = useState('description')

    const mockSubmissions = useMemo(() => getMockSubmissions(problem), [problem])
    const [bottomTab, setBottomTab] = useState('testcase')
    const [testInput, setTestInput] = useState(problem.testCases[0]?.input || '')
    const [testResult, setTestResult] = useState(null)

    // Reset code and test input when problem changes
    useEffect(() => {
        setLang(getDefaultLanguageForDomain(problem.domain))
        setCodes(buildStarterCodeMap(problem))
        setTestInput(problem.testCases[0]?.input || '')
        setTestResult(null)
        setDescTab('description')
        setBottomTab('testcase')
    }, [problem])
    const [running, setRunning] = useState(false)
    const [timer, setTimer] = useState(0)
    const [timerRunning, setTimerRunning] = useState(false)
    const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 })
    const [saved, setSaved] = useState(true)
    const [langDropdownOpen, setLangDropdownOpen] = useState(false)
    const [showProblemList, setShowProblemList] = useState(false)
    const [problemSearch, setProblemSearch] = useState('')
    const [starred, setStarred] = useState(false)
    const [bookmarked, setBookmarked] = useState(false)
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
    const [editorFullscreen, setEditorFullscreen] = useState(false)
    const langRef = useRef(null)
    const sidebarRef = useRef(null)
    const profileDropdownRef = useRef(null)
    const editorRef = useRef(null)

    // Determine the list of problems based on topic or list context
    const contextProblems = useMemo(() => {
        if (listParam === 'bookmarks') return mockProblems.filter(p => p.starred)
        if (topicParam) return mockProblems.filter(p => (p.tags || []).includes(decodeURIComponent(topicParam)))
        if (domainParam) return mockProblems.filter(p => p.domain === domainParam)
        return mockProblems
    }, [topicParam, listParam, domainParam])

    const solvedCount = useMemo(() => contextProblems.filter(p => p.status === 'solved').length, [contextProblems])

    // Advanced Sort & Filter State for Sidebar
    const [sortConfig, setSortConfig] = useState({ key: 'custom', direction: 'asc' })
    const [filterMatchMode, setFilterMatchMode] = useState('All')
    const [filterRules, setFilterRules] = useState([])
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)

    // Helper for filter options
    const FILTER_FIELDS = {
        'Status': ['Solved', 'Attempted', 'Unsolved'],
        'Difficulty': ['Easy', 'Medium', 'Hard'],
        'List': ['Starred', 'Not Starred'],
    }
    const FILTER_OPERATORS = ['is', 'is not']

    const addRule = () => {
        if (filterRules.length >= 6) return toast.error('Maximum of 6 filter rules allowed')
        const newId = filterRules.length > 0 ? Math.max(...filterRules.map(r => r.id)) + 1 : 1
        setFilterRules([...filterRules, { id: newId, active: true, field: 'Status', operator: 'is', value: 'Solved' }])
    }
    const updateRule = (id, updates) => setFilterRules(filterRules.map(r => r.id === id ? { ...r, ...updates } : r))
    const removeRule = id => setFilterRules(filterRules.filter(r => r.id !== id))
    const resetRules = () => setFilterRules([])

    const filteredProblems = useMemo(() => {
        let result = [...contextProblems]
        if (problemSearch) {
            const lowerQ = problemSearch.toLowerCase()
            result = result.filter(p => p.title.toLowerCase().includes(lowerQ) || String(p.id).includes(lowerQ))
        }

        if (filterRules.length > 0) {
            const activeRules = filterRules.filter(r => r.active && r.field && r.operator && r.value)
            if (activeRules.length > 0) {
                result = result.filter(p => {
                    const ruleEvals = activeRules.map(rule => {
                        let fieldVal = ''
                        if (rule.field === 'Status') {
                            fieldVal = p.status === 'solved' ? 'Solved' : p.status === 'attempted' ? 'Attempted' : 'Unsolved'
                        } else if (rule.field === 'Difficulty') {
                            fieldVal = p.difficulty
                        } else if (rule.field === 'List') {
                            fieldVal = p.starred ? 'Starred' : 'Not Starred'
                        }
                        if (rule.operator === 'is') return fieldVal === rule.value
                        if (rule.operator === 'is not') return fieldVal !== rule.value
                        return true
                    })
                    return filterMatchMode === 'All' ? ruleEvals.every(Boolean) : ruleEvals.some(Boolean)
                })
            }
        }

        result.sort((a, b) => {
            if (sortConfig.key === 'custom') return 0
            let valA, valB
            if (sortConfig.key === 'id') {
                valA = a.id
                valB = b.id
            } else if (sortConfig.key === 'acceptance') {
                valA = parseFloat(a.acceptance) || 0
                valB = parseFloat(b.acceptance) || 0
            } else if (sortConfig.key === 'difficulty') {
                const diffMap = { Easy: 1, Medium: 2, Hard: 3 }
                valA = diffMap[a.difficulty] || 0
                valB = diffMap[b.difficulty] || 0
            } else if (sortConfig.key === 'lastSubmitted') {
                valA = a.lastSubmitted ? new Date(a.lastSubmitted).getTime() : 0
                valB = b.lastSubmitted ? new Date(b.lastSubmitted).getTime() : 0
            }
            if (valA !== undefined && valB !== undefined) {
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
            }
            return 0
        })

        return result
    }, [problemSearch, contextProblems, filterRules, filterMatchMode, sortConfig])

    // Helper to preserve context when navigating
    const navigateWithContext = (newId) => {
        if (listParam) {
            navigate(`/problems/${newId}?list=${listParam}`)
        } else if (topicParam) {
            navigate(`/problems/${newId}?topic=${topicParam}`)
        } else if (domainParam) {
            navigate(`/problems/${newId}?domain=${domainParam}`)
        } else {
            navigate(`/problems/${newId}`)
        }
    }

    // Timer
    useEffect(() => {
        if (!timerRunning) return
        const interval = setInterval(() => setTimer(t => t + 1), 1000)
        return () => clearInterval(interval)
    }, [timerRunning])

    // Close lang dropdown on outside click
    useEffect(() => {
        const handler = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setLangDropdownOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Close profile dropdown on outside click
    useEffect(() => {
        const handler = (e) => { if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) setProfileDropdownOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Sync fullscreen state with native fullscreen API
    useEffect(() => {
        const handler = () => setEditorFullscreen(!!document.fullscreenElement)
        document.addEventListener('fullscreenchange', handler)
        return () => document.removeEventListener('fullscreenchange', handler)
    }, [])

    const handleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => { })
        } else {
            document.exitFullscreen().catch(() => { })
        }
    }

    const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

    const handleCodeChange = useCallback((value) => {
        setCodes((prev) => ({ ...prev, [lang]: value || '' }))
        setSaved(false)
        setTimeout(() => setSaved(true), 800)
    }, [lang])

    const handleEditorMount = (editor, monaco) => {
        editorRef.current = editor
        editor.onDidChangeCursorPosition((e) => {
            setCursorPos({ line: e.position.lineNumber, col: e.position.column })
        })
    }

    const handleReset = () => {
        const starter = getStarterCodeForLanguage(problem, lang)
        setCodes((prev) => ({ ...prev, [lang]: starter }))
        toast('Code reset to starter template', {
            icon: '↺',
            style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
        })
    }

    const handleRedo = () => {
        if (editorRef.current) {
            editorRef.current.trigger('keyboard', 'redo', null)
        }
    }

    const handleEditorBeforeMount = (monaco) => {
        monaco.editor.defineTheme('coderunner-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'c792ea' },
                { token: 'string', foreground: 'c3e88d' },
                { token: 'number', foreground: 'f78c6c' },
                { token: 'type', foreground: 'ffcb6b' },
                { token: 'function', foreground: '82aaff' },
                { token: 'variable', foreground: 'e5e7eb' },
            ],
            colors: {
                'editor.background': '#0d1117',
                'editor.foreground': '#e5e7eb',
                'editor.lineHighlightBackground': '#161b2205',
                'editor.lineHighlightBorder': '#ffffff06',
                'editor.selectionBackground': '#264f7833',
                'editor.inactiveSelectionBackground': '#264f7822',
                'editorLineNumber.foreground': '#3b4252',
                'editorLineNumber.activeForeground': '#6b7280',
                'editorCursor.foreground': '#34d399',
                'editor.selectionHighlightBackground': '#264f7822',
                'editorIndentGuide.background': '#ffffff08',
                'editorIndentGuide.activeBackground': '#ffffff15',
                'editorWidget.background': '#0d1117',
                'editorWidget.border': '#ffffff10',
                'editorSuggestWidget.background': '#0d1117',
                'editorSuggestWidget.border': '#ffffff10',
                'editorSuggestWidget.selectedBackground': '#ffffff0a',
                'editorHoverWidget.background': '#0d1117',
                'editorHoverWidget.border': '#ffffff10',
                'scrollbar.shadow': '#00000000',
                'scrollbarSlider.background': '#ffffff10',
                'scrollbarSlider.hoverBackground': '#ffffff18',
                'scrollbarSlider.activeBackground': '#ffffff22',
            }
        })
    }

    const handleRun = () => {
        setRunning(true)
        setBottomTab('result')
        setTimeout(() => {
            setTestResult(getMockRunResult(problem, lang))
            setRunning(false)
            toast.success(getRunToast(problem), {
                style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
            })
        }, 1500)
    }

    const handleSubmit = () => {
        setRunning(true)
        setBottomTab('result')
        setTimeout(() => {
            const result = getMockSubmitResult(problem, lang)
            setTestResult(result)
            setRunning(false)

            if (user?.username) {
                addSubmission(user.username, {
                    problemId: problem.id,
                    problemTitle: problem.title,
                    domain: problem.domain,
                    status: result.status,
                    language: languageLabelMap[lang] || lang,
                    runtime: result.time,
                    memory: result.memory,
                    submittedAt: new Date().toISOString(),
                })
            }

            toast.success(getSubmitToast(problem), {
                style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
            })
        }, 2000)
    }

    const descTabs = [
        { key: 'description', label: 'Description', icon: FileText },
        { key: 'solutions', label: 'Solutions', icon: MessageSquare },
        { key: 'submissions', label: 'Submissions', icon: History },
    ]

    const currentLang = availableLanguages.find(l => l.key === lang) || availableLanguages[0]

    return (
        <div style={{
            height: '100vh', display: 'flex', flexDirection: 'column',
            background: 'linear-gradient(180deg, #0d1117 0%, #0b0f19 100%)',
            fontFamily: "'Inter', system-ui, sans-serif",
            color: '#e5e7eb',
        }}>
            {/* ━━━ Top Bar ━━━ */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 16px', height: '42px', flexShrink: 0,
                background: 'linear-gradient(to right, rgba(30,36,44,0.6) 0%, rgba(20,24,30,0.8) 100%)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(12px)',
                position: 'relative', overflow: 'visible', zIndex: 100,
            }}>
                {/* Left: Navigation */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {/* Back arrow — navigates to /problems */}
                    <button
                        onClick={() => navigate(domainParam ? `/problems?domain=${encodeURIComponent(domainParam)}` : '/problems')}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '28px', height: '28px', borderRadius: '6px',
                            color: '#9ca3af', backgroundColor: 'transparent',
                            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#e5e7eb'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.backgroundColor = 'transparent' }}
                        title="Back to Problems"
                    >
                        <ArrowLeft style={{ width: '14px', height: '14px' }} />
                    </button>

                    {/* Problem List — toggles sidebar */}
                    <button
                        onClick={() => setShowProblemList(!showProblemList)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                            color: showProblemList ? '#e5e7eb' : '#9ca3af',
                            backgroundColor: showProblemList ? 'rgba(255,255,255,0.06)' : 'transparent',
                            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#e5e7eb'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                        onMouseLeave={(e) => { if (!showProblemList) { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.backgroundColor = 'transparent' } }}
                    >
                        Problem List
                        <ChevronRight style={{ width: '12px', height: '12px', opacity: 0.5 }} />
                    </button>
                    <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
                    {[
                        {
                            icon: ChevronLeft, title: 'Previous problem', onClick: () => {
                                const idx = contextProblems.findIndex(p => String(p.id) === String(id))
                                if (idx > 0) navigateWithContext(contextProblems[idx - 1].id)
                                else if (contextProblems.length > 0) navigateWithContext(contextProblems[contextProblems.length - 1].id)
                            }
                        },
                        {
                            icon: ChevronRight, title: 'Next problem', onClick: () => {
                                const idx = contextProblems.findIndex(p => String(p.id) === String(id))
                                if (idx < contextProblems.length - 1 && idx !== -1) navigateWithContext(contextProblems[idx + 1].id)
                                else if (contextProblems.length > 0) navigateWithContext(contextProblems[0].id)
                            }
                        },
                        {
                            icon: Shuffle, title: 'Random problem', onClick: () => {
                                const others = contextProblems.filter(p => String(p.id) !== String(id))
                                if (others.length > 0) {
                                    const random = others[Math.floor(Math.random() * others.length)]
                                    navigateWithContext(random.id)
                                }
                            }
                        },
                    ].map((btn, i) => (
                        <button key={i} onClick={btn.onClick} title={btn.title} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '28px', height: '28px', borderRadius: '6px', color: '#6b7280',
                            background: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#e5e7eb'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                            <btn.icon style={{ width: '14px', height: '14px' }} />
                        </button>
                    ))}
                </div>

                {/* Center: Title */}
                <span style={{
                    fontSize: '13px', fontWeight: 600, color: '#e5e7eb',
                    position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap', letterSpacing: '0.01em'
                }}>
                    {problem.title}
                </span>

                {/* Right: Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={handleRun} disabled={running} style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '5px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600,
                        backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        color: '#d1d5db', cursor: running ? 'default' : 'pointer', opacity: running ? 0.5 : 1,
                        transition: 'all 0.2s', letterSpacing: '0.02em'
                    }}
                        onMouseEnter={(e) => { if (!running) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)' }}
                        onMouseLeave={(e) => { if (!running) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)' }}
                    >
                        <Play style={{ width: '12px', height: '12px', fill: '#34d399', color: '#34d399' }} /> Run
                    </button>

                    <button onClick={handleSubmit} disabled={running} style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '5px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600,
                        background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
                        border: '1px solid rgba(52,211,153,0.3)', color: '#0b0f19',
                        cursor: running ? 'default' : 'pointer', opacity: running ? 0.5 : 1,
                        transition: 'all 0.2s', letterSpacing: '0.02em',
                        boxShadow: '0 2px 8px rgba(52,211,153,0.15)'
                    }}
                        onMouseEnter={(e) => { if (!running) e.currentTarget.style.boxShadow = '0 4px 16px rgba(52,211,153,0.25)' }}
                        onMouseLeave={(e) => { if (!running) e.currentTarget.style.boxShadow = '0 2px 8px rgba(52,211,153,0.15)' }}
                    >
                        <Upload style={{ width: '12px', height: '12px' }} /> Submit
                    </button>

                    <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255,255,255,0.08)', margin: '0 2px' }} />

                    {/* Timer with start/stop/reset */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '2px',
                        borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        overflow: 'hidden'
                    }}>
                        <button
                            onClick={() => setTimerRunning(!timerRunning)}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '28px', height: '28px', border: 'none', cursor: 'pointer',
                                backgroundColor: 'transparent', color: timerRunning ? '#34d399' : '#6b7280',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title={timerRunning ? 'Pause timer' : 'Start timer'}
                        >
                            {timerRunning ? <Pause style={{ width: '11px', height: '11px' }} /> : <Play style={{ width: '11px', height: '11px' }} />}
                        </button>
                        <span style={{
                            fontSize: '12px', fontWeight: 600, color: timerRunning ? '#e5e7eb' : '#6b7280',
                            fontFamily: "'JetBrains Mono', monospace", minWidth: '38px', textAlign: 'center',
                            letterSpacing: '0.04em', transition: 'color 0.2s'
                        }}>
                            {formatTime(timer)}
                        </span>
                        {timer > 0 && (
                            <button
                                onClick={() => { setTimer(0); setTimerRunning(false) }}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: '28px', height: '28px', border: 'none', cursor: 'pointer',
                                    backgroundColor: 'transparent', color: '#6b7280',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#f87171' }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6b7280' }}
                                title="Reset timer"
                            >
                                <RotateCcw style={{ width: '10px', height: '10px' }} />
                            </button>
                        )}
                    </div>

                    {/* Profile Avatar + Dropdown */}
                    <div style={{ position: 'relative' }} ref={profileDropdownRef}>
                        <button
                            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                                borderRadius: '50%'
                            }}
                            title={user?.displayName || 'Profile'}
                        >
                            <div style={{
                                width: '26px', height: '26px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #34d399, #059669)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '11px', fontWeight: 700, color: '#0b0f19',
                                boxShadow: profileDropdownOpen ? '0 0 0 2px rgba(52,211,153,0.5)' : '0 0 12px rgba(52,211,153,0.2)',
                                border: '1px solid rgba(52,211,153,0.3)',
                                transition: 'box-shadow 0.2s'
                            }}>
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-emerald-500/50 shadow-[0_0_10px_rgba(74,222,128,0.2)]" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-sm font-bold text-slate-900 shadow-[0_0_10px_rgba(74,222,128,0.3)]">
                                        {user?.displayName?.[0] || 'U'}
                                    </div>
                                )}
                            </div>
                        </button>

                        {profileDropdownOpen && (
                            <div style={{
                                position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 200,
                                width: '280px', borderRadius: '20px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'linear-gradient(to bottom, rgba(30,36,44,0.85) 0%, rgba(15,20,25,0.98) 100%)',
                                backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
                                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.8), 0 0 20px rgba(52,211,153,0.05)',
                                padding: '10px 8px',
                                animation: 'slideInDown 0.18s ease-out',
                            }}>
                                {/* User info */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '12px 14px', marginBottom: '8px',
                                    borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.04)',
                                }}>
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="Large Avatar" style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            flexShrink: 0,
                                            boxShadow: '0 0 16px rgba(52,211,153,0.35)',
                                            border: '1px solid rgba(52,211,153,0.3)',
                                        }} />
                                    ) : (
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #34d399, #059669)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '20px',
                                            fontWeight: 700,
                                            color: '#0b0f19',
                                            flexShrink: 0,
                                            boxShadow: '0 0 16px rgba(52,211,153,0.35)',
                                            border: '1px solid rgba(52,211,153,0.25)',
                                        }}>
                                            {user?.displayName?.[0] || 'U'}
                                        </div>
                                    )}
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {user?.displayName || 'User'}
                                        </p>
                                        <p style={{ fontSize: '11.5px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {user?.email || ''}
                                        </p>
                                    </div>
                                </div>

                                {/* Quick stats */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '8px', padding: '0 4px' }}>
                                    {[
                                        { icon: BookOpen, label: 'Lists' },
                                        { icon: Layout, label: 'Notes' },
                                        { icon: BarChart3, label: 'Stats' },
                                    ].map(({ icon: Icon, label }) => (
                                        <button key={label} style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            gap: '6px', padding: '10px 4px', borderRadius: '12px',
                                            background: 'rgba(255,255,255,0.02)', border: '1px solid transparent',
                                            cursor: 'pointer', transition: 'all 0.2s',
                                        }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(52,211,153,0.08)'; e.currentTarget.style.borderColor = 'rgba(52,211,153,0.2)' }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'transparent' }}
                                        >
                                            <Icon style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                                        </button>
                                    ))}
                                </div>

                                <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '4px 12px 6px' }} />

                                {/* Menu items */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 4px 4px' }}>
                                    {[
                                        { icon: User, label: 'View Profile', onClick: () => { setProfileDropdownOpen(false); navigate(`/profile/${user?.username}`) } },
                                        { icon: Settings, label: 'Settings', onClick: () => setProfileDropdownOpen(false) },
                                        { icon: Palette, label: 'Appearance', onClick: () => setProfileDropdownOpen(false) },
                                    ].map(({ icon: Icon, label, onClick }) => (
                                        <button key={label} onClick={onClick} style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            width: '100%', padding: '9px 14px', borderRadius: '10px',
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            fontSize: '13.5px', fontWeight: 500, color: '#d1d5db',
                                            transition: 'all 0.15s', textAlign: 'left',
                                        }}
                                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff' }}
                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#d1d5db' }}
                                        >
                                            <Icon style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                                            {label}
                                        </button>
                                    ))}

                                    <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '4px 8px' }} />

                                    <button
                                        onClick={() => { logout(); setProfileDropdownOpen(false); navigate('/') }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            width: '100%', padding: '9px 14px', borderRadius: '10px',
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            fontSize: '13.5px', fontWeight: 500, color: '#f87171',
                                            transition: 'all 0.15s', textAlign: 'left',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.08)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <LogOut style={{ width: '16px', height: '16px', color: 'rgba(248,113,113,0.7)' }} />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ━━━ Main IDE Layout ━━━ */}
            <Group orientation="horizontal" className="flex-1">
                {/* ━━━ Left Pane — Description ━━━ */}
                <Panel defaultSize={45} minSize={25}>
                    <div style={{
                        height: '100%', display: 'flex', flexDirection: 'column',
                        background: 'linear-gradient(180deg, rgba(13,17,23,0.95) 0%, rgba(11,15,25,1) 100%)',
                        position: 'relative',
                    }}>

                        {/* ━━━ Problem List Sidebar Overlay ━━━ */}
                        {showProblemList && (
                            <div ref={sidebarRef} style={{
                                position: 'absolute', inset: 0, zIndex: 50,
                                display: 'flex', flexDirection: 'column',
                                background: 'linear-gradient(180deg, #0d1117 0%, #0b0f19 100%)',
                                animation: 'slideInLeft 0.2s ease-out',
                            }}>
                                {/* Sidebar Header */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 14px', flexShrink: 0,
                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#e5e7eb' }}>
                                            {listParam === 'bookmarks' ? 'Bookmarked Questions' : topicParam ? `${decodeURIComponent(topicParam)} Problems` : 'Problem List'}
                                        </span>
                                        <ChevronRight style={{ width: '14px', height: '14px', color: '#6b7280' }} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{
                                            display: 'flex', alignItems: 'center', gap: '5px',
                                            fontSize: '11.5px', fontWeight: 600, color: '#9ca3af',
                                        }}>
                                            <Check style={{ width: '12px', height: '12px', color: '#34d399' }} />
                                            {solvedCount}/{contextProblems.length} Solved
                                        </span>
                                        <button
                                            onClick={() => setShowProblemList(false)}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                width: '24px', height: '24px', borderRadius: '6px',
                                                background: 'transparent', border: 'none', cursor: 'pointer',
                                                color: '#6b7280', transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.color = '#e5e7eb'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)' }}
                                            onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.backgroundColor = 'transparent' }}
                                        >
                                            <X style={{ width: '14px', height: '14px' }} />
                                        </button>
                                    </div>
                                </div>

                                {(isSortMenuOpen || isFilterMenuOpen) && (
                                    <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => { setIsSortMenuOpen(false); setIsFilterMenuOpen(false); }} />
                                )}

                                {/* Search + Filter Row */}
                                <div style={{
                                    padding: '10px 14px', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 95
                                }}>
                                    <div style={{
                                        flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '6px 10px', borderRadius: '8px',
                                        backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                    }}>
                                        <Search style={{ width: '13px', height: '13px', color: '#6b7280', flexShrink: 0 }} />
                                        <input
                                            type="text"
                                            placeholder="Search questions"
                                            value={problemSearch}
                                            onChange={(e) => setProblemSearch(e.target.value)}
                                            style={{
                                                flex: 1, background: 'none', border: 'none', outline: 'none',
                                                color: '#e5e7eb', fontSize: '12.5px', fontFamily: 'inherit',
                                            }}
                                        />
                                    </div>
                                    {/* Sort & Filter Menus */}
                                    <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
                                        {/* Sort Menu */}
                                        <div style={{ position: 'relative' }}>
                                            <button onClick={() => { setIsSortMenuOpen(!isSortMenuOpen); setIsFilterMenuOpen(false); }} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                width: '30px', height: '30px', borderRadius: '8px',
                                                backgroundColor: isSortMenuOpen ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                color: isSortMenuOpen ? '#3b82f6' : '#6b7280',
                                                cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0
                                            }} onMouseEnter={e => { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)' }} onMouseLeave={e => { e.currentTarget.style.color = isSortMenuOpen ? '#3b82f6' : '#6b7280'; e.currentTarget.style.backgroundColor = isSortMenuOpen ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)' }}>
                                                <ArrowUpDown style={{ width: '13px', height: '13px' }} />
                                                {(sortConfig.key !== 'custom') && (
                                                    <span style={{ position: 'absolute', top: '2px', right: '2px', width: '6px', height: '6px', backgroundColor: '#3b82f6', borderRadius: '50%' }} />
                                                )}
                                            </button>
                                            {isSortMenuOpen && (
                                                <div style={{
                                                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                                                    width: '220px', backgroundColor: '#1a1d24', border: `1px solid ${COLORS.border}`,
                                                    borderRadius: '12px', zIndex: 100, padding: '4px 0',
                                                    boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                                                }}>
                                                    {[
                                                        { label: 'Custom', key: 'custom' },
                                                        { label: 'Difficulty', key: 'difficulty' },
                                                        { label: 'Acceptance', key: 'acceptance' },
                                                        { label: 'Question ID', key: 'id' }
                                                    ].map((opt, idx) => {
                                                        const isActive = sortConfig.key === opt.key
                                                        return (
                                                            <React.Fragment key={opt.key}>
                                                                <button onClick={() => {
                                                                    if (isActive && opt.key !== 'custom') setSortConfig({ key: opt.key, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })
                                                                    else setSortConfig({ key: opt.key, direction: opt.key === 'acceptance' ? 'desc' : 'asc' })
                                                                }} style={{
                                                                    padding: '8px 16px', background: 'transparent', border: 'none',
                                                                    cursor: 'pointer', width: '100%',
                                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                    transition: 'all 0.15s'
                                                                }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                                    <span style={{ fontWeight: isActive ? 600 : 400, color: isActive && opt.key !== 'custom' ? '#3b82f6' : COLORS.textMain, fontSize: '13px' }}>{opt.label}</span>
                                                                    <div style={{ width: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                                                        {opt.key === 'custom' && isActive && <Check style={{ width: '14px', height: '14px', color: '#10b981' }} />}
                                                                        {opt.key !== 'custom' && isActive && <ArrowUpDown style={{ width: '12px', height: '12px', color: '#3b82f6', transform: sortConfig.direction === 'asc' ? 'rotate(0deg)' : 'rotate(180deg)' }} />}
                                                                    </div>
                                                                </button>
                                                                {idx === 0 && <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.06)', margin: '4px 16px' }} />}
                                                            </React.Fragment>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Filter Menu */}
                                        <div style={{ position: 'relative' }}>
                                            <button onClick={() => { setIsFilterMenuOpen(!isFilterMenuOpen); setIsSortMenuOpen(false); }} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                width: '30px', height: '30px', borderRadius: '8px',
                                                backgroundColor: isFilterMenuOpen ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                color: filterRules.length > 0 ? '#3b82f6' : '#6b7280',
                                                cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0
                                            }} onMouseEnter={e => { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)' }} onMouseLeave={e => { e.currentTarget.style.color = filterRules.length > 0 ? '#3b82f6' : '#6b7280'; e.currentTarget.style.backgroundColor = isFilterMenuOpen ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)' }}>
                                                <SlidersHorizontal style={{ width: '13px', height: '13px' }} />
                                                {filterRules.length > 0 && (
                                                    <span style={{ position: 'absolute', top: '2px', right: '2px', width: '6px', height: '6px', backgroundColor: '#3b82f6', borderRadius: '50%' }} />
                                                )}
                                            </button>
                                            {isFilterMenuOpen && (
                                                <div style={{
                                                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                                                    width: '320px', backgroundColor: '#1a1d24', border: `1px solid ${COLORS.border}`,
                                                    borderRadius: '12px', padding: '16px', zIndex: 100,
                                                    boxShadow: '0 12px 40px rgba(0,0,0,0.8)'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb' }}>Advanced Filters</span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {['All', 'Any'].map(mode => (
                                                                <button key={mode} onClick={() => setFilterMatchMode(mode)} style={{
                                                                    fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '6px',
                                                                    backgroundColor: filterMatchMode === mode ? '#3b82f6' : 'rgba(255,255,255,0.04)',
                                                                    color: filterMatchMode === mode ? '#fff' : '#9ca3af',
                                                                    border: 'none', cursor: 'pointer'
                                                                }}>
                                                                    Match {mode}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                                        {filterRules.map(rule => (
                                                            <div key={rule.id} style={{ display: 'flex', gap: '6px', alignItems: 'center', opacity: rule.active ? 1 : 0.5 }}>
                                                                <button onClick={() => updateRule(rule.id, { active: !rule.active })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                                                                    {rule.active ? <Check style={{ width: '14px', height: '14px', color: '#10b981' }} /> : <div style={{ width: '14px', height: '14px', border: '1px solid #6b7280', borderRadius: '3px' }} />}
                                                                </button>
                                                                <select value={rule.field} onChange={e => updateRule(rule.id, { field: e.target.value, value: FILTER_FIELDS[e.target.value][0] })} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px', color: '#e5e7eb', fontSize: '12px', outline: 'none' }}>
                                                                    {Object.keys(FILTER_FIELDS).map(f => <option key={f} value={f}>{f}</option>)}
                                                                </select>
                                                                <select value={rule.operator} onChange={e => updateRule(rule.id, { operator: e.target.value })} style={{ width: '60px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px', color: '#e5e7eb', fontSize: '12px', outline: 'none' }}>
                                                                    {FILTER_OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
                                                                </select>
                                                                <select value={rule.value} onChange={e => updateRule(rule.id, { value: e.target.value })} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px', color: '#e5e7eb', fontSize: '12px', outline: 'none' }}>
                                                                    {FILTER_FIELDS[rule.field].map(v => <option key={v} value={v}>{v}</option>)}
                                                                </select>
                                                                <button onClick={() => removeRule(rule.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: '4px' }}>
                                                                    <Minus style={{ width: '12px', height: '12px' }} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {filterRules.length === 0 && (
                                                            <div style={{ textAlign: 'center', padding: '12px', color: '#6b7280', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                                                                No active filters.
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <button onClick={addRule} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                                            <Plus style={{ width: '12px', height: '12px' }} /> Add Filter
                                                        </button>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button onClick={resetRules} style={{ fontSize: '12px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>Reset</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Problem List */}
                                <div style={{ flex: 1, overflowY: 'auto' }}>
                                    {filteredProblems.map((p) => {
                                        const isActive = String(p.id) === String(id)
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => { navigateWithContext(p.id); setShowProblemList(false) }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    width: '100%', padding: '10px 14px',
                                                    background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
                                                    border: 'none', borderLeft: isActive ? '2px solid #fbbf24' : '2px solid transparent',
                                                    cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                                                }}
                                                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)' }}
                                                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                                    <div style={{ width: '18px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {p.status === 'solved' && <Check style={{ width: '14px', height: '14px', color: '#34d399' }} />}
                                                    </div>
                                                    <span style={{
                                                        fontSize: '13px', fontWeight: isActive ? 600 : 400,
                                                        color: isActive ? '#e5e7eb' : '#d1d5db',
                                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                    }}>
                                                        {p.id}. {p.title}
                                                    </span>
                                                </div>
                                                <span style={{
                                                    fontSize: '11px', fontWeight: 600, flexShrink: 0, marginLeft: '10px',
                                                    color: diffColors[p.difficulty],
                                                }}>
                                                    {p.difficulty === 'Medium' ? 'Med.' : p.difficulty}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Tabs */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 12px', flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                {descTabs.map((tab) => {
                                    const Icon = tab.icon
                                    const isActive = descTab === tab.key
                                    return (
                                        <button
                                            key={tab.key}
                                            onClick={() => setDescTab(tab.key)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                padding: '10px 14px', fontSize: '12.5px', fontWeight: isActive ? 600 : 500,
                                                color: isActive ? '#e5e7eb' : '#6b7280',
                                                borderBottom: isActive ? '2px solid #fbbf24' : '2px solid transparent',
                                                background: 'none', border: 'none',
                                                borderBottomStyle: 'solid',
                                                cursor: 'pointer', transition: 'all 0.2s',
                                                letterSpacing: '0.01em'
                                            }}
                                            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = '#d1d5db' }}
                                            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#6b7280' }}
                                        >
                                            <Icon style={{ width: '13px', height: '13px' }} />
                                            {tab.label}
                                        </button>
                                    )
                                })}
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: '26px', height: '26px', borderRadius: '6px', color: '#6b7280',
                                    background: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.15s'
                                }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.backgroundColor = 'transparent' }}
                                >
                                    <Maximize2 style={{ width: '13px', height: '13px' }} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            {descTab === 'description' && (
                                <div className="animate-fade-in">
                                    {/* Title */}
                                    <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#f0f2f5', marginBottom: '12px', letterSpacing: '-0.01em' }}>
                                        {problem.id}. {problem.title}
                                    </h1>

                                    {/* Tags Row */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                        <span style={{
                                            fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px',
                                            color: diffColors[problem.difficulty],
                                            backgroundColor: diffBg[problem.difficulty],
                                            border: `1px solid ${diffColors[problem.difficulty]}22`,
                                            letterSpacing: '0.02em'
                                        }}>
                                            {problem.difficulty}
                                        </span>
                                        <span style={{
                                            fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px',
                                            color: domainColors[problem.domain].text,
                                            backgroundColor: domainColors[problem.domain].bg,
                                            border: `1px solid ${domainColors[problem.domain].border}`,
                                        }}>
                                            {domainLabelMap[problem.domain] || problem.domain}
                                        </span>
                                        {problem.tags.map((t) => (
                                            <span key={t} style={{
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '8px',
                                                color: '#9ca3af', backgroundColor: 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                            }}>
                                                <Tag style={{ width: '10px', height: '10px' }} /> {t}
                                            </span>
                                        ))}
                                        <span style={{
                                            display: 'flex', alignItems: 'center', gap: '4px',
                                            fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '8px',
                                            color: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.08)',
                                            border: '1px solid rgba(251,191,36,0.15)', cursor: 'pointer',
                                        }}>
                                            <Lightbulb style={{ width: '10px', height: '10px' }} /> Hint
                                        </span>
                                    </div>

                                    {/* Description */}
                                    <div style={{ fontSize: '13.5px', lineHeight: '1.75', color: '#d1d5db' }}>
                                        {problem.description.split('\n\n').map((p, i) => (
                                            <p key={i} style={{ marginBottom: '14px' }}>
                                                {p.split('`').map((part, j) =>
                                                    j % 2 === 1 ? (
                                                        <code key={j} style={{
                                                            padding: '2px 6px', borderRadius: '4px',
                                                            backgroundColor: 'rgba(255,255,255,0.06)',
                                                            color: '#fbbf24', fontFamily: "'JetBrains Mono', monospace",
                                                            fontSize: '12px', border: '1px solid rgba(255,255,255,0.06)'
                                                        }}>{part}</code>
                                                    ) : part
                                                )}
                                            </p>
                                        ))}
                                    </div>

                                    {/* Examples */}
                                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        {problem.examples.map((ex, i) => (
                                            <div key={i} style={{
                                                borderRadius: '12px', overflow: 'hidden',
                                                backgroundColor: 'rgba(255,255,255,0.02)',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                            }}>
                                                <div style={{
                                                    padding: '10px 16px',
                                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                    fontSize: '13px', fontWeight: 600, color: '#e5e7eb'
                                                }}>
                                                    Example {i + 1}:
                                                </div>
                                                <div style={{
                                                    padding: '12px 16px',
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    fontSize: '12px', lineHeight: '1.8',
                                                    backgroundColor: 'rgba(255,255,255,0.01)',
                                                }}>
                                                    <p><span style={{ color: '#6b7280' }}>Input: </span><span style={{ color: '#e5e7eb' }}>{ex.input}</span></p>
                                                    <p><span style={{ color: '#6b7280' }}>Output: </span><span style={{ color: '#e5e7eb' }}>{ex.output}</span></p>
                                                    {ex.explanation && (
                                                        <p style={{ marginTop: '4px' }}>
                                                            <span style={{ color: '#6b7280' }}>Explanation: </span>
                                                            <span style={{ color: '#d1d5db', fontFamily: "'Inter', sans-serif" }}>{ex.explanation}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Constraints */}
                                    <div style={{ marginTop: '20px' }}>
                                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb', marginBottom: '8px' }}>Constraints:</p>
                                        <ul style={{ listStyle: 'disc', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {problem.constraints.map((c, i) => (
                                                <li key={i} style={{
                                                    fontSize: '12.5px', color: '#9ca3af',
                                                    fontFamily: "'JetBrains Mono', monospace", lineHeight: '1.6'
                                                }}>{c}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Companies */}
                                    <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Companies:</span>
                                        {problem.companies.map((c) => (
                                            <span key={c} style={{
                                                fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '8px',
                                                color: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.08)',
                                                border: '1px solid rgba(96,165,250,0.15)', cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}>{c}</span>
                                        ))}
                                    </div>

                                    {/* Bottom Stats */}
                                    <div style={{
                                        marginTop: '24px', paddingTop: '16px',
                                        borderTop: '1px solid rgba(255,255,255,0.05)',
                                        display: 'flex', alignItems: 'center', gap: '16px',
                                    }}>
                                        {[
                                            { icon: ThumbsUp, label: '410', active: false, onClick: () => toast('Liked!', { icon: '👍', style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }) },
                                            { icon: MessageCircle, label: '106', active: false, onClick: () => setDescTab('solutions') },
                                            { icon: Star, label: '', active: starred, activeColor: '#fbbf24', onClick: () => { setStarred(!starred); toast(starred ? 'Removed star' : 'Starred!', { icon: starred ? '☆' : '⭐', style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }) } },
                                            { icon: Bookmark, label: '', active: bookmarked, activeColor: '#60a5fa', onClick: () => { setBookmarked(!bookmarked); toast(bookmarked ? 'Removed bookmark' : 'Bookmarked!', { icon: bookmarked ? '🔖' : '📑', style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }) } },
                                            { icon: ExternalLink, label: '', active: false, onClick: () => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!', { style: { background: 'rgba(30,36,44,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }) } },
                                        ].map((item, i) => (
                                            <button key={i} onClick={item.onClick} style={{
                                                display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500,
                                                color: item.active ? item.activeColor : '#6b7280',
                                                background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: '4px'
                                            }}
                                                onMouseEnter={(e) => e.currentTarget.style.color = item.active ? item.activeColor : '#d1d5db'}
                                                onMouseLeave={(e) => e.currentTarget.style.color = item.active ? item.activeColor : '#6b7280'}
                                            >
                                                <item.icon style={{ width: '14px', height: '14px', fill: item.active ? item.activeColor : 'none' }} /> {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {descTab === 'solutions' && (
                                <div style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    height: '260px', gap: '12px', color: '#4b5563',
                                }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '12px',
                                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <MessageSquare style={{ width: '22px', height: '22px', color: '#374151' }} />
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>Community Solutions</p>
                                        <p style={{ fontSize: '12px', color: '#4b5563' }}>Coming soon — stay tuned!</p>
                                    </div>
                                </div>
                            )}

                            {descTab === 'submissions' && (
                                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                    {/* Header */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 90px 90px 90px 110px',
                                        padding: '8px 0 8px 0',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        marginBottom: '4px',
                                    }}>
                                        {['Status', 'Language', 'Runtime', 'Memory', 'Submitted'].map((h) => (
                                            <span key={h} style={{ fontSize: '11px', fontWeight: 600, color: '#4b5563', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</span>
                                        ))}
                                    </div>

                                    {mockSubmissions.length === 0 ? (
                                        <div style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                                            justifyContent: 'center', height: '200px', gap: '10px',
                                        }}>
                                            <History style={{ width: '28px', height: '28px', color: '#374151' }} />
                                            <p style={{ fontSize: '13px', color: '#6b7280' }}>No submissions yet</p>
                                        </div>
                                    ) : (
                                        mockSubmissions.map((sub) => {
                                            const isAccepted = sub.status === 'Accepted'
                                            const statusColor = isAccepted ? '#34d399'
                                                : sub.status === 'Wrong Answer' ? '#f87171'
                                                    : sub.status === 'Time Limit Exceeded' ? '#fbbf24'
                                                        : '#9ca3af'
                                            const statusBg = isAccepted ? 'rgba(52,211,153,0.08)'
                                                : sub.status === 'Wrong Answer' ? 'rgba(248,113,113,0.08)'
                                                    : sub.status === 'Time Limit Exceeded' ? 'rgba(251,191,36,0.08)'
                                                        : 'rgba(255,255,255,0.04)'
                                            return (
                                                <div key={sub.id} style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '1fr 90px 90px 90px 110px',
                                                    padding: '12px 0',
                                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                    alignItems: 'center',
                                                    transition: 'background 0.15s',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                            fontSize: '12.5px', fontWeight: 600, color: statusColor,
                                                            padding: '3px 10px', borderRadius: '20px',
                                                            backgroundColor: statusBg,
                                                        }}>
                                                            {isAccepted && <Check style={{ width: '11px', height: '11px' }} />}
                                                            {sub.status}
                                                        </span>
                                                        {isAccepted && sub.beats && (
                                                            <span style={{ fontSize: '11px', color: '#6b7280' }}>Beats {sub.beats}</span>
                                                        )}
                                                    </div>
                                                    <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>{sub.language}</span>
                                                    <span style={{
                                                        fontSize: '12px',
                                                        color: isAccepted ? '#d1d5db' : '#6b7280',
                                                        fontFamily: "'JetBrains Mono', monospace"
                                                    }}>{sub.runtime}</span>
                                                    <span style={{
                                                        fontSize: '12px',
                                                        color: isAccepted ? '#d1d5db' : '#6b7280',
                                                        fontFamily: "'JetBrains Mono', monospace"
                                                    }}>{sub.memory}</span>
                                                    <span style={{ fontSize: '11.5px', color: '#6b7280' }}>{sub.timestamp}</span>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </Panel>

                {/* Resize Handle */}
                <Separator className="w-[3px] bg-transparent hover:bg-[rgba(52,211,153,0.3)] transition-colors cursor-col-resize" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />

                {/* ━━━ Right Pane — Editor + Tests ━━━ */}
                <Panel defaultSize={55} minSize={30}>
                    <Group orientation="vertical">
                        {/* Code Editor */}
                        <Panel defaultSize={65} minSize={30}>
                            <div style={{
                                height: '100%', display: 'flex', flexDirection: 'column',
                                background: 'linear-gradient(180deg, rgba(17,21,28,0.98) 0%, rgba(13,17,23,1) 100%)',
                            }}>
                                {/* Editor toolbar */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0 12px', height: '38px', flexShrink: 0,
                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {/* Code header */}
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            fontSize: '13px', fontWeight: 600, color: '#d1d5db',
                                        }}>
                                            <Code2 style={{ width: '14px', height: '14px', color: '#34d399' }} /> Code
                                        </div>

                                        <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />

                                        {/* Language Selector */}
                                        <div ref={langRef} style={{ position: 'relative' }}>
                                            <button
                                                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    padding: '4px 10px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 500,
                                                    color: '#d1d5db', backgroundColor: 'rgba(255,255,255,0.04)',
                                                    border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
                                                    transition: 'all 0.15s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
                                            >
                                                {currentLang?.label}
                                                <ChevronLeft style={{ width: '11px', height: '11px', transform: 'rotate(-90deg)', color: '#6b7280' }} />
                                            </button>
                                            {langDropdownOpen && (
                                                <div className="animate-slide-down" style={{
                                                    position: 'absolute', top: '100%', left: 0, zIndex: 60,
                                                    marginTop: '4px', padding: '4px', borderRadius: '10px', minWidth: '140px',
                                                    background: 'linear-gradient(to bottom, rgba(30,36,44,0.98) 0%, rgba(15,20,25,0.99) 100%)',
                                                    backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)',
                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                                }}>
                                                    {availableLanguages.map((l) => (
                                                        <button key={l.key} onClick={() => { setLang(l.key); setLangDropdownOpen(false) }}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                                width: '100%', padding: '7px 12px', borderRadius: '6px',
                                                                fontSize: '12.5px', fontWeight: lang === l.key ? 600 : 400,
                                                                color: lang === l.key ? '#e5e7eb' : '#9ca3af',
                                                                backgroundColor: lang === l.key ? 'rgba(255,255,255,0.06)' : 'transparent',
                                                                border: 'none', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left'
                                                            }}
                                                            onMouseEnter={(e) => { if (lang !== l.key) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)' }}
                                                            onMouseLeave={(e) => { if (lang !== l.key) e.currentTarget.style.backgroundColor = 'transparent' }}
                                                        >
                                                            {l.label}
                                                            {lang === l.key && <Check style={{ width: '12px', height: '12px', color: '#34d399' }} />}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <span style={{
                                            fontSize: '11px', color: '#6b7280', fontWeight: 500,
                                            padding: '2px 8px', borderRadius: '4px',
                                            backgroundColor: 'rgba(255,255,255,0.02)',
                                        }}>
                                            Auto
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                        {/* Fullscreen */}
                                        <button
                                            onClick={handleFullscreen}
                                            title={editorFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                width: '26px', height: '26px', borderRadius: '6px',
                                                color: editorFullscreen ? '#34d399' : '#6b7280',
                                                background: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.color = editorFullscreen ? '#34d399' : '#d1d5db'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                                            onMouseLeave={(e) => { e.currentTarget.style.color = editorFullscreen ? '#34d399' : '#6b7280'; e.currentTarget.style.backgroundColor = 'transparent' }}
                                        >
                                            {editorFullscreen ? <Minimize2 style={{ width: '13px', height: '13px' }} /> : <Maximize2 style={{ width: '13px', height: '13px' }} />}
                                        </button>
                                        {/* Reset code */}
                                        <button
                                            onClick={handleReset}
                                            title="Reset to starter code"
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                width: '26px', height: '26px', borderRadius: '6px', color: '#6b7280',
                                                background: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.color = '#fbbf24'; e.currentTarget.style.backgroundColor = 'rgba(251,191,36,0.08)' }}
                                            onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.backgroundColor = 'transparent' }}
                                        >
                                            <RotateCcw style={{ width: '13px', height: '13px' }} />
                                        </button>
                                        {/* Redo */}
                                        <button
                                            onClick={handleRedo}
                                            title="Redo (Ctrl+Y)"
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                width: '26px', height: '26px', borderRadius: '6px', color: '#6b7280',
                                                background: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                                            onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.backgroundColor = 'transparent' }}
                                        >
                                            <RotateCw style={{ width: '13px', height: '13px' }} />
                                        </button>
                                    </div>
                                </div>

                                {/* Monaco Editor */}
                                <div style={{ flex: 1 }}>
                                    <Editor
                                        height="100%"
                                        language={currentLang?.monaco || 'plaintext'}
                                        value={codes[lang]}
                                        onChange={handleCodeChange}
                                        onMount={handleEditorMount}
                                        beforeMount={handleEditorBeforeMount}
                                        theme="coderunner-dark"
                                        options={{
                                            fontSize: 14,
                                            fontFamily: "'JetBrains Mono', monospace",
                                            minimap: { enabled: false },
                                            padding: { top: 16, bottom: 16 },
                                            scrollBeyondLastLine: false,
                                            lineNumbers: 'on',
                                            renderLineHighlight: 'line',
                                            bracketPairColorization: { enabled: true },
                                            automaticLayout: true,
                                            cursorBlinking: 'smooth',
                                            cursorSmoothCaretAnimation: 'on',
                                            smoothScrolling: true,
                                            lineNumbersMinChars: 3,
                                            glyphMargin: false,
                                            folding: true
                                        }}
                                    />
                                </div>

                                {/* Status Bar */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0 12px', height: '24px', flexShrink: 0,
                                    borderTop: '1px solid rgba(255,255,255,0.04)',
                                    backgroundColor: 'rgba(255,255,255,0.01)',
                                    fontSize: '11px', color: '#6b7280',
                                }}>
                                    <span style={{ color: saved ? '#34d399' : '#fbbf24', fontWeight: 500 }}>
                                        {saved ? 'Saved' : 'Saving...'}
                                    </span>
                                    <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
                                </div>
                            </div>
                        </Panel>

                        {/* Resize Handle */}
                        <Separator className="h-[3px] bg-transparent hover:bg-[rgba(52,211,153,0.3)] transition-colors cursor-row-resize" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />

                        {/* ━━━ Bottom Panel — Testcase / Results ━━━ */}
                        <Panel defaultSize={35} minSize={15}>
                            <div style={{
                                height: '100%', display: 'flex', flexDirection: 'column',
                                background: 'linear-gradient(180deg, rgba(13,17,23,0.95) 0%, rgba(11,15,25,1) 100%)',
                            }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 12px', flexShrink: 0,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        {[
                                            { key: 'testcase', label: 'Testcase', icon: Terminal },
                                            { key: 'result', label: 'Test Result', icon: Check },
                                        ].map((tab) => {
                                            const Icon = tab.icon
                                            const isActive = bottomTab === tab.key
                                            return (
                                                <button
                                                    key={tab.key}
                                                    onClick={() => setBottomTab(tab.key)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                        padding: '10px 14px', fontSize: '12.5px', fontWeight: isActive ? 600 : 500,
                                                        color: isActive ? '#e5e7eb' : '#6b7280',
                                                        borderBottom: isActive ? '2px solid #fbbf24' : '2px solid transparent',
                                                        background: 'none', border: 'none',
                                                        borderBottomStyle: 'solid',
                                                        cursor: 'pointer', transition: 'all 0.2s',
                                                    }}
                                                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = '#d1d5db' }}
                                                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#6b7280' }}
                                                >
                                                    <Icon style={{ width: '13px', height: '13px' }} />
                                                    {tab.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
                                    {bottomTab === 'testcase' && (
                                        <div>
                                            <p style={{ fontSize: '11.5px', fontWeight: 600, color: '#9ca3af', marginBottom: '8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{getInputLabel(problem)}:</p>
                                            <textarea
                                                value={testInput}
                                                onChange={(e) => setTestInput(e.target.value)}
                                                spellCheck={false}
                                                style={{
                                                    width: '100%', height: '80px', padding: '10px 12px', borderRadius: '10px',
                                                    backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                                                    color: '#e5e7eb', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace",
                                                    resize: 'none', outline: 'none', transition: 'border 0.2s',
                                                }}
                                                onFocus={(e) => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.15)'}
                                                onBlur={(e) => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.06)'}
                                            />
                                        </div>
                                    )}

                                    {bottomTab === 'result' && (
                                        <div className="animate-fade-in">
                                            {running ? (
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                                    padding: '40px 0', color: '#9ca3af', fontSize: '13px'
                                                }}>
                                                    <div style={{
                                                        width: '16px', height: '16px', border: '2px solid #34d399',
                                                        borderTopColor: 'transparent', borderRadius: '50%',
                                                        animation: 'spin 0.8s linear infinite'
                                                    }} />
                                                    Running...
                                                </div>
                                            ) : testResult ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                                    {/* Status */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{
                                                            width: '22px', height: '22px', borderRadius: '50%', display: 'flex',
                                                            alignItems: 'center', justifyContent: 'center',
                                                            backgroundColor: testResult.status === 'Accepted' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
                                                        }}>
                                                            {testResult.status === 'Accepted' ? (
                                                                <Check style={{ width: '13px', height: '13px', color: '#34d399' }} />
                                                            ) : (
                                                                <X style={{ width: '13px', height: '13px', color: '#f87171' }} />
                                                            )}
                                                        </div>
                                                        <span style={{
                                                            fontSize: '16px', fontWeight: 700,
                                                            color: testResult.status === 'Accepted' ? '#34d399' : '#f87171'
                                                        }}>
                                                            {testResult.status}
                                                        </span>
                                                    </div>

                                                    {/* Stats */}
                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                        {[{ label: 'Runtime', value: testResult.time }, { label: 'Memory', value: testResult.memory }].map((stat, i) => (
                                                            <div key={i} style={{
                                                                flex: 1, padding: '12px 14px', borderRadius: '10px',
                                                                backgroundColor: 'rgba(255,255,255,0.02)',
                                                                border: '1px solid rgba(255,255,255,0.05)',
                                                            }}>
                                                                <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: 500 }}>{stat.label}</p>
                                                                <p style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb', fontFamily: "'JetBrains Mono', monospace" }}>{stat.value}</p>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Output */}
                                                    {testResult.stdout && (
                                                        <div style={{
                                                            padding: '12px 14px', borderRadius: '10px',
                                                            backgroundColor: 'rgba(255,255,255,0.02)',
                                                            border: '1px solid rgba(255,255,255,0.05)',
                                                        }}>
                                                            <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', fontWeight: 500 }}>Output</p>
                                                            <pre style={{ fontSize: '13px', fontFamily: "'JetBrains Mono', monospace", color: '#e5e7eb', margin: 0 }}>{testResult.stdout}</pre>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p style={{
                                                    textAlign: 'center', padding: '40px 0',
                                                    fontSize: '13px', color: '#6b7280'
                                                }}>
                                                    You must run your code first
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Panel>
                    </Group>
                </Panel>
            </Group>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes slideInLeft {
                    from { opacity: 0; transform: translateX(-12px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes slideInDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .problem-list-sidebar::-webkit-scrollbar {
                    width: 4px;
                }
                .problem-list-sidebar::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.08);
                    border-radius: 4px;
                }
                .problem-list-sidebar::-webkit-scrollbar-track {
                    background: transparent;
                }
            `}</style>
        </div>
    )
}
