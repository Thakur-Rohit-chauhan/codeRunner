import { useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Panel, Group, Separator } from 'react-resizable-panels'
import Editor from '@monaco-editor/react'
import { ArrowLeft, ChevronLeft, ChevronRight, Shuffle, Play, Upload, Clock, Settings, Check, X, Tag } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { mockProblemDetail } from '../utils/mockData'
import toast from 'react-hot-toast'

const languages = [
    { key: 'cpp', label: 'C++', monaco: 'cpp' },
    { key: 'python', label: 'Python', monaco: 'python' },
    { key: 'java', label: 'Java', monaco: 'java' },
    { key: 'javascript', label: 'JavaScript', monaco: 'javascript' },
    { key: 'go', label: 'Go', monaco: 'go' },
]

const domainColors = {
    DSA: { bg: 'bg-accent-blue/10', text: 'text-accent-blue' },
    ML: { bg: 'bg-accent-teal/10', text: 'text-accent-teal' },
    CTF: { bg: 'bg-accent-red/10', text: 'text-accent-red' },
}

const diffColors = { Easy: 'text-easy', Medium: 'text-medium', Hard: 'text-hard' }

export default function ProblemSolver() {
    const { id } = useParams()
    const { user } = useAuthStore()
    const problem = mockProblemDetail

    const [lang, setLang] = useState('cpp')
    const [codes, setCodes] = useState(
        languages.reduce((acc, l) => ({ ...acc, [l.key]: problem.starterCode[l.key] || '' }), {})
    )
    const [descTab, setDescTab] = useState('description')
    const [bottomTab, setBottomTab] = useState('testcase')
    const [testInput, setTestInput] = useState(problem.testCases[0]?.input || '')
    const [testResult, setTestResult] = useState(null)
    const [running, setRunning] = useState(false)
    const [timer, setTimer] = useState(0)

    const handleCodeChange = useCallback((value) => {
        setCodes((prev) => ({ ...prev, [lang]: value || '' }))
    }, [lang])

    const handleRun = () => {
        setRunning(true)
        setBottomTab('result')
        setTimeout(() => {
            setTestResult({
                status: 'Accepted',
                stdout: '[0, 1]',
                expected: '[0,1]',
                time: '4ms',
                memory: '8.2 MB',
            })
            setRunning(false)
            toast.success('Test passed!')
        }, 1500)
    }

    const handleSubmit = () => {
        setRunning(true)
        setBottomTab('result')
        setTimeout(() => {
            setTestResult({
                status: 'Accepted',
                stdout: 'All test cases passed',
                expected: '—',
                time: '4ms',
                memory: '8.2 MB',
                allPassed: true,
            })
            setRunning(false)
            toast.success('Solution Accepted! 🎉')
        }, 2000)
    }

    return (
        <div className="h-screen flex flex-col bg-bg-primary">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-secondary/50 shrink-0">
                <div className="flex items-center gap-3">
                    <Link to="/problems" className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Problem List
                    </Link>
                    <div className="flex items-center gap-1 ml-2">
                        <button className="p-1.5 rounded hover:bg-bg-card text-text-secondary hover:text-text-primary transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded hover:bg-bg-card text-text-secondary hover:text-text-primary transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded hover:bg-bg-card text-text-secondary hover:text-text-primary transition-colors">
                            <Shuffle className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <span className="text-sm font-medium text-text-primary hidden md:block">{problem.title}</span>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRun}
                        disabled={running}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-bg-card border border-border text-sm font-medium text-text-primary hover:bg-bg-panel transition-colors disabled:opacity-50"
                    >
                        <Play className="w-3.5 h-3.5" /> Run
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={running}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-success text-bg-primary text-sm font-medium hover:bg-success/90 transition-colors disabled:opacity-50"
                    >
                        <Upload className="w-3.5 h-3.5" /> Submit
                    </button>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary">
                        <Clock className="w-3.5 h-3.5" /> 0:00
                    </div>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-accent-teal flex items-center justify-center text-xs font-bold text-bg-primary">
                        {user?.displayName?.[0] || 'U'}
                    </div>
                </div>
            </div>

            {/* Main IDE Layout */}
            <Group direction="horizontal" className="flex-1">
                {/* Left Pane — Description */}
                <Panel defaultSize={45} minSize={25}>
                    <div className="h-full flex flex-col bg-bg-primary">
                        {/* Tabs */}
                        <div className="flex items-center border-b border-border px-4 shrink-0">
                            {['description', 'editorial', 'solutions', 'submissions'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setDescTab(tab)}
                                    className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${descTab === tab
                                        ? 'text-text-primary border-accent'
                                        : 'text-text-secondary border-transparent hover:text-text-primary'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {descTab === 'description' && (
                                <div className="animate-fade-in">
                                    <div className="flex items-center gap-3 mb-4">
                                        <h1 className="text-xl font-bold text-text-primary">
                                            {problem.id}. {problem.title}
                                        </h1>
                                    </div>
                                    <div className="flex items-center gap-2 mb-6">
                                        <span className={`text-sm font-medium ${diffColors[problem.difficulty]}`}>{problem.difficulty}</span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${domainColors[problem.domain].bg} ${domainColors[problem.domain].text}`}>
                                            {problem.domain}
                                        </span>
                                        {problem.tags.map((t) => (
                                            <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-bg-card text-text-secondary border border-border">
                                                <Tag className="w-3 h-3" /> {t}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="prose prose-invert max-w-none text-sm leading-relaxed text-text-primary/90">
                                        {problem.description.split('\n\n').map((p, i) => (
                                            <p key={i} className="mb-4">{p.split('`').map((part, j) =>
                                                j % 2 === 1 ? <code key={j} className="px-1.5 py-0.5 rounded bg-bg-card text-accent font-mono text-xs">{part}</code> : part
                                            )}</p>
                                        ))}
                                    </div>

                                    {/* Examples */}
                                    <div className="mt-6 space-y-4">
                                        {problem.examples.map((ex, i) => (
                                            <div key={i} className="bg-bg-card rounded-lg border border-border p-4">
                                                <p className="text-sm font-semibold text-text-primary mb-2">Example {i + 1}:</p>
                                                <div className="font-mono text-xs space-y-1.5">
                                                    <p><span className="text-text-secondary">Input: </span><span className="text-text-primary">{ex.input}</span></p>
                                                    <p><span className="text-text-secondary">Output: </span><span className="text-text-primary">{ex.output}</span></p>
                                                    {ex.explanation && <p><span className="text-text-secondary">Explanation: </span><span className="text-text-primary">{ex.explanation}</span></p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Constraints */}
                                    <div className="mt-6">
                                        <p className="text-sm font-semibold text-text-primary mb-2">Constraints:</p>
                                        <ul className="list-disc pl-5 space-y-1">
                                            {problem.constraints.map((c, i) => (
                                                <li key={i} className="text-sm text-text-secondary font-mono">{c}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Companies */}
                                    <div className="mt-6 flex items-center gap-2">
                                        <span className="text-xs text-text-secondary">Companies:</span>
                                        {problem.companies.map((c) => (
                                            <span key={c} className="px-2 py-0.5 rounded text-xs bg-bg-card text-text-secondary border border-border">{c}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {descTab !== 'description' && (
                                <div className="flex items-center justify-center h-64 text-text-secondary text-sm">
                                    {descTab.charAt(0).toUpperCase() + descTab.slice(1)} — coming soon
                                </div>
                            )}
                        </div>
                    </div>
                </Panel>

                {/* Resize Handle */}
                <Separator className="w-1.5 bg-border hover:bg-accent/30 transition-colors cursor-col-resize" />

                {/* Right Pane — Editor + Tests */}
                <Panel defaultSize={55} minSize={30}>
                    <Group direction="vertical">
                        {/* Code Editor */}
                        <Panel defaultSize={65} minSize={30}>
                            <div className="h-full flex flex-col bg-bg-panel">
                                {/* Editor toolbar */}
                                <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
                                    <select
                                        value={lang}
                                        onChange={(e) => setLang(e.target.value)}
                                        className="px-3 py-1.5 rounded-lg bg-bg-card border border-border text-sm text-text-primary focus:outline-none focus:border-accent/50 cursor-pointer"
                                    >
                                        {languages.map((l) => (
                                            <option key={l.key} value={l.key}>{l.label}</option>
                                        ))}
                                    </select>
                                    <button className="p-1.5 rounded hover:bg-bg-card text-text-secondary hover:text-text-primary transition-colors">
                                        <Settings className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Monaco Editor */}
                                <div className="flex-1">
                                    <Editor
                                        height="100%"
                                        language={languages.find((l) => l.key === lang)?.monaco || 'plaintext'}
                                        value={codes[lang]}
                                        onChange={handleCodeChange}
                                        theme="vs-dark"
                                        options={{
                                            fontSize: 14,
                                            fontFamily: "'JetBrains Mono', monospace",
                                            minimap: { enabled: false },
                                            padding: { top: 16 },
                                            scrollBeyondLastLine: false,
                                            lineNumbers: 'on',
                                            renderLineHighlight: 'line',
                                            bracketPairColorization: { enabled: true },
                                            automaticLayout: true,
                                        }}
                                    />
                                </div>
                            </div>
                        </Panel>

                        {/* Resize Handle */}
                        <Separator className="h-1.5 bg-border hover:bg-accent/30 transition-colors cursor-row-resize" />

                        {/* Bottom Panel — Testcase / Results */}
                        <Panel defaultSize={35} minSize={15}>
                            <div className="h-full flex flex-col bg-bg-primary">
                                <div className="flex items-center border-b border-border px-4 shrink-0">
                                    {['testcase', 'result'].map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setBottomTab(tab)}
                                            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${bottomTab === tab
                                                ? 'text-text-primary border-accent'
                                                : 'text-text-secondary border-transparent hover:text-text-primary'
                                                }`}
                                        >
                                            {tab === 'result' ? 'Test Result' : 'Testcase'}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex-1 overflow-y-auto p-4">
                                    {bottomTab === 'testcase' && (
                                        <div>
                                            <p className="text-xs font-medium text-text-secondary mb-2">Custom Input:</p>
                                            <textarea
                                                value={testInput}
                                                onChange={(e) => setTestInput(e.target.value)}
                                                className="w-full h-24 px-3 py-2 rounded-lg bg-bg-card border border-border text-sm font-mono text-text-primary resize-none focus:outline-none focus:border-accent/50"
                                            />
                                        </div>
                                    )}
                                    {bottomTab === 'result' && (
                                        <div className="animate-fade-in">
                                            {running ? (
                                                <div className="flex items-center gap-2 text-text-secondary text-sm py-8 justify-center">
                                                    <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                                                    Running...
                                                </div>
                                            ) : testResult ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        {testResult.status === 'Accepted' ? (
                                                            <Check className="w-5 h-5 text-success" />
                                                        ) : (
                                                            <X className="w-5 h-5 text-hard" />
                                                        )}
                                                        <span className={`text-lg font-bold ${testResult.status === 'Accepted' ? 'text-success' : 'text-hard'}`}>
                                                            {testResult.status}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-bg-card rounded-lg p-3 border border-border">
                                                            <p className="text-xs text-text-secondary mb-1">Runtime</p>
                                                            <p className="text-sm font-mono font-medium text-text-primary">{testResult.time}</p>
                                                        </div>
                                                        <div className="bg-bg-card rounded-lg p-3 border border-border">
                                                            <p className="text-xs text-text-secondary mb-1">Memory</p>
                                                            <p className="text-sm font-mono font-medium text-text-primary">{testResult.memory}</p>
                                                        </div>
                                                    </div>
                                                    {testResult.stdout && (
                                                        <div className="bg-bg-card rounded-lg p-3 border border-border">
                                                            <p className="text-xs text-text-secondary mb-1">Output</p>
                                                            <pre className="text-sm font-mono text-text-primary">{testResult.stdout}</pre>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-text-secondary text-center py-8">Run your code to see results</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Panel>
                    </Group>
                </Panel>
            </Group>
        </div>
    )
}
