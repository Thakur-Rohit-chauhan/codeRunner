import { Link } from 'react-router-dom'
import { Code2, Users, Trophy, Zap, Github, Mail, Play } from 'lucide-react'
import Navbar from '../components/Navbar/Navbar'

/* ═══════════════════════════════════════════════
   SVG Illustrations for each domain card
   ═══════════════════════════════════════════════ */

function CPIllustration() {
    return (
        <div className="flex items-center gap-6 w-full mt-4">
            {/* Code Editor mockup */}
            <div className="flex-shrink-0 rounded-lg border border-green-500/30 bg-[#0d0d0d] px-4 py-3" style={{ minWidth: '120px' }}>
                <div className="flex gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500/70" />
                    <span className="w-2 h-2 rounded-full bg-green-500/70" />
                    <span className="w-2 h-2 rounded-full bg-red-500/70" />
                </div>
                <div className="space-y-1.5">
                    <div className="h-2 w-20 bg-green-500/25 rounded-sm" />
                    <div className="h-2 w-16 bg-green-400/40 rounded-sm" />
                    <div className="h-2 w-24 bg-green-500/20 rounded-sm" />
                    <div className="h-2 w-14 bg-green-400/35 rounded-sm" />
                    <div className="h-2 w-20 bg-green-500/25 rounded-sm" />
                </div>
            </div>

            {/* Graph / Tree visualization */}
            <svg viewBox="0 0 160 140" className="w-48 h-36 flex-shrink-0">
                {/* Edges */}
                <line x1="80" y1="30" x2="45" y2="70" stroke="#4ade80" strokeWidth="1.5" opacity="0.4" />
                <line x1="80" y1="30" x2="115" y2="70" stroke="#4ade80" strokeWidth="1.5" opacity="0.4" />
                <line x1="45" y1="70" x2="20" y2="110" stroke="#4ade80" strokeWidth="1.5" opacity="0.4" />
                <line x1="45" y1="70" x2="65" y2="110" stroke="#4ade80" strokeWidth="1.5" opacity="0.4" />
                <line x1="115" y1="70" x2="100" y2="110" stroke="#4ade80" strokeWidth="1.5" opacity="0.4" />
                {/* Nodes */}
                {[
                    [80, 25, 'A'], [45, 65, 'B'], [115, 65, 'C'],
                    [20, 105, 'D'], [65, 105, 'E'],
                ].map(([x, y, label]) => (
                    <g key={label}>
                        <circle cx={x} cy={y} r="14" fill="#0f1a0f" stroke="#4ade80" strokeWidth="2" />
                        <text x={x} y={Number(y) + 5} textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="bold">{label}</text>
                    </g>
                ))}
            </svg>

            {/* Scoreboard table */}
            <div className="flex-1 min-w-0 rounded-lg border border-green-500/25 bg-[#0d0d0d] px-4 py-3">
                <p className="text-sm font-bold text-green-400 mb-3 tracking-wider text-center">Scoreboard</p>
                <div className="space-y-3">
                    {[
                        { rank: 1, score: 10 },
                        { rank: 2, score: 9 },
                        { rank: 3, score: 0 },
                    ].map((r) => (
                        <div key={r.rank} className="flex items-center justify-between text-sm font-mono">
                            <span className="text-green-400/60 w-4">{r.rank}</span>
                            <div className="flex-1 mx-3 h-[1px] bg-green-400/20" />
                            <span className="text-green-400 font-bold">{r.score}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function MLIllustration() {
    return (
        <div className="flex items-center gap-6 w-full mt-4">
            {/* Neural Network — bigger */}
            <svg viewBox="0 0 140 120" className="w-40 h-32 flex-shrink-0">
                {/* Connections input → hidden */}
                {[20, 50, 80, 110].map((iy) =>
                    [15, 42, 70, 98].map((hy) => (
                        <line key={`i${iy}-h${hy}`} x1="18" y1={iy} x2="65" y2={hy} stroke="#38bdf8" strokeWidth="0.7" opacity="0.2" />
                    ))
                )}
                {/* Connections hidden → output */}
                {[15, 42, 70, 98].map((hy) =>
                    [40, 80].map((oy) => (
                        <line key={`h${hy}-o${oy}`} x1="75" y1={hy} x2="122" y2={oy} stroke="#38bdf8" strokeWidth="0.7" opacity="0.2" />
                    ))
                )}
                {/* Input nodes */}
                {[20, 50, 80, 110].map((y, i) => (
                    <circle key={`in${i}`} cx="15" cy={y} r="8" fill="#0a1628" stroke="#38bdf8" strokeWidth="1.5" />
                ))}
                {/* Hidden nodes */}
                {[15, 42, 70, 98].map((y, i) => (
                    <circle key={`hd${i}`} cx="70" cy={y} r="8" fill="#0a1628" stroke="#38bdf8" strokeWidth="1.5" />
                ))}
                {/* Output nodes */}
                {[40, 80].map((y, i) => (
                    <circle key={`out${i}`} cx="125" cy={y} r="8" fill="#0a1628" stroke="#38bdf8" strokeWidth="1.5" />
                ))}
            </svg>

            {/* Scatter Plot — bigger */}
            <svg viewBox="0 0 120 100" className="w-36 h-28 flex-shrink-0">
                <line x1="15" y1="85" x2="110" y2="85" stroke="#38bdf8" strokeWidth="0.6" opacity="0.25" />
                <line x1="15" y1="8" x2="15" y2="85" stroke="#38bdf8" strokeWidth="0.6" opacity="0.25" />
                {/* Trend arrow */}
                <polyline points="20,72 35,58 50,48 65,35 80,28 95,18" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
                <polygon points="95,14 100,22 91,20" fill="#38bdf8" opacity="0.5" />
                {[[25, 68], [32, 55], [30, 62], [52, 40], [58, 45], [65, 52], [48, 38], [75, 25], [42, 58], [78, 30], [88, 18], [40, 65], [70, 35]].map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r="4" fill="#38bdf8" opacity={0.45 + (i % 3) * 0.15} />
                ))}
            </svg>

            {/* Loss curve — bigger */}
            <svg viewBox="0 0 110 85" className="w-32 h-24 flex-shrink-0">
                <text x="90" y="60" textAnchor="end" fill="#38bdf8" fontSize="10" opacity="0.5">Loss</text>
                <line x1="10" y1="75" x2="100" y2="75" stroke="#38bdf8" strokeWidth="0.5" opacity="0.2" />
                <line x1="10" y1="10" x2="10" y2="75" stroke="#38bdf8" strokeWidth="0.5" opacity="0.2" />
                <polyline
                    points="12,15 22,28 32,38 42,48 52,55 62,60 72,63 82,65 92,67"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                />
            </svg>
        </div>
    )
}

function CTFIllustration() {
    return (
        <div className="flex items-center gap-6 w-full mt-4">
            {/* Terminal — bigger */}
            <div className="flex-shrink-0 rounded-lg border border-amber-500/30 bg-[#0d0d0d] px-5 py-4" style={{ minWidth: '140px' }}>
                <div className="flex gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500/70" />
                    <span className="w-2 h-2 rounded-full bg-green-500/70" />
                    <span className="w-2 h-2 rounded-full bg-red-500/70" />
                </div>
                <p className="text-xs font-mono text-amber-500/50 mb-1">&gt;_</p>
                <p className="text-base font-mono text-amber-400 font-bold whitespace-nowrap">FLAG&#123;...&#125;</p>
            </div>

            {/* Lock icon — bigger */}
            <svg viewBox="0 0 60 75" className="w-20 h-24 flex-shrink-0">
                <rect x="8" y="30" width="44" height="36" rx="5" fill="#1a1400" stroke="#f59e0b" strokeWidth="2.5" />
                <path d="M16 30V22a14 14 0 0 1 28 0v8" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="30" cy="48" r="5" fill="#f59e0b" />
                <line x1="30" y1="53" x2="30" y2="60" stroke="#f59e0b" strokeWidth="2.5" />
            </svg>

            {/* Network / Flow diagram — bigger */}
            <svg viewBox="0 0 140 100" className="w-40 h-28 flex-shrink-0">
                {/* Connection lines with arrows */}
                <line x1="15" y1="50" x2="40" y2="20" stroke="#f59e0b" strokeWidth="1.2" opacity="0.4" />
                <line x1="40" y1="20" x2="70" y2="35" stroke="#f59e0b" strokeWidth="1.2" opacity="0.4" />
                <line x1="15" y1="50" x2="40" y2="80" stroke="#f59e0b" strokeWidth="1.2" opacity="0.4" />
                <line x1="40" y1="80" x2="70" y2="65" stroke="#f59e0b" strokeWidth="1.2" opacity="0.4" />
                <line x1="70" y1="35" x2="100" y2="25" stroke="#f59e0b" strokeWidth="1.2" opacity="0.4" />
                <line x1="70" y1="65" x2="100" y2="75" stroke="#f59e0b" strokeWidth="1.2" opacity="0.4" />
                <line x1="100" y1="25" x2="125" y2="50" stroke="#f59e0b" strokeWidth="1.2" opacity="0.4" />
                <line x1="100" y1="75" x2="125" y2="50" stroke="#f59e0b" strokeWidth="1.2" opacity="0.4" />
                {/* Nodes */}
                {[[15, 50], [40, 20], [40, 80], [70, 35], [70, 65], [100, 25], [100, 75], [125, 50]].map(([x, y], i) => (
                    <g key={i}>
                        <circle cx={x} cy={y} r="8" fill="#1a1400" stroke="#f59e0b" strokeWidth="1.5" />
                        {i === 0 && <rect x={Number(x) - 3} y={Number(y) - 3} width="6" height="6" fill="#f59e0b" rx="1" />}
                    </g>
                ))}
                {/* Arrow tips */}
                {[[28, 35], [55, 28], [28, 65], [55, 72], [85, 30], [85, 70], [112, 38], [112, 62]].map(([x, y], i) => (
                    <circle key={`d${i}`} cx={x} cy={y} r="2" fill="#f59e0b" opacity="0.4" />
                ))}
            </svg>
        </div>
    )
}

/* ═══════════════════════════════════════════════
   Domain Card Data
   ═══════════════════════════════════════════════ */

const domainCards = [
    {
        title: 'COMPETITIVE PROGRAMMING (DSA)',
        borderColor: 'border-green-500/50',
        titleColor: '#4ade80',
        badgeColor: '#4ade80',
        Illustration: CPIllustration,
    },
    {
        title: 'MACHINE LEARNING (DATA SCIENCE)',
        borderColor: 'border-sky-400/50',
        titleColor: '#38bdf8',
        badgeColor: '#38bdf8',
        Illustration: MLIllustration,
    },
    {
        title: 'CYBERSECURITY (CTF)',
        borderColor: 'border-amber-500/50',
        titleColor: '#f59e0b',
        badgeColor: '#f59e0b',
        Illustration: CTFIllustration,
    },
]

const stats = [
    { icon: Code2, value: '500+', label: 'Problems' },
    { icon: Users, value: '10,000+', label: 'Users' },
    { icon: Zap, value: '3', label: 'Domains' },
    { icon: Trophy, value: 'Live', label: 'Contests' },
]

function ConnectionLines() {
    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden lg:block">
            <line x1="50%" y1="50%" x2="16%" y2="28%" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
            <line x1="50%" y1="50%" x2="84%" y2="26%" stroke="rgba(56,189,248,0.3)" strokeWidth="1" />
            <line x1="50%" y1="50%" x2="20%" y2="70%" stroke="rgba(56,189,248,0.3)" strokeWidth="1" />
            <line x1="50%" y1="50%" x2="80%" y2="68%" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
        </svg>
    )
}

/* ═══════════════════════════════════════════════
   Landing Page
   ═══════════════════════════════════════════════ */

export default function Landing() {
    return (
        <div 
            className="min-h-screen relative overflow-hidden"
            style={{ backgroundColor: '#161a20' }}
        >
            <div className="relative z-50">
                <Navbar />
            </div>

            {/* Background Base */}
            <div className="absolute inset-0" style={{ backgroundColor: '#161a20', zIndex: -2 }}></div>

            {/* ═══ Glowing X-Ray Effects ═══ */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[-1] overflow-hidden">
                <div
                    className="absolute"
                    style={{
                        width: '150%', height: 40,
                        background: 'linear-gradient(to right, transparent, #38bdf8, transparent)',
                        filter: 'blur(40px)', opacity: 0.2,
                        transform: 'rotate(20deg) translateY(-100px)',
                    }}
                />
                <div
                    className="absolute"
                    style={{
                        width: '200%', height: 120,
                        background: 'linear-gradient(to right, transparent, #4ade80, transparent)',
                        filter: 'blur(60px)', opacity: 0.1,
                        transform: 'rotate(-25deg) translateY(100px)',
                    }}
                />
                <div
                    className="absolute"
                    style={{
                        width: '200%', height: 30,
                        background: 'linear-gradient(to right, transparent, #4ade80, transparent)',
                        filter: 'blur(20px)', opacity: 0.2,
                        transform: 'rotate(-25deg) translateY(100px)',
                    }}
                />
                <div
                    className="absolute"
                    style={{
                        right: '-10%', top: '30%',
                        width: 500, height: 500,
                        background: 'radial-gradient(circle, rgba(74,222,128,0.08), transparent)',
                        borderRadius: '50%', filter: 'blur(150px)',
                    }}
                />
            </div>

            <ConnectionLines />

            {/* ══════ Hero Section — Full viewport ══════ */}
            <section className="relative min-h-[calc(100vh-60px)] flex items-center z-10">
                <div className="relative w-full flex flex-col lg:flex-row items-start gap-10 lg:gap-12 py-12 lg:py-0" style={{ paddingLeft: 'clamp(32px, 6vw, 96px)', paddingRight: 'clamp(32px, 4vw, 64px)' }}>

                    {/* ── Left Column: Text Content ── */}
                    <div className="flex-1 lg:max-w-[640px] lg:pt-[6vh]">
                        <h1
                            className="text-[3rem] sm:text-[3.5rem] md:text-[4.2rem] lg:text-[4.5rem] xl:text-[5rem] font-black leading-[1.05] text-white uppercase"
                            style={{ letterSpacing: '-0.03em' }}
                        >
                            One Platform.
                            <br />
                            Infinite Technical
                            <br />
                            Challenges.
                        </h1>

                        <p className="mt-10 text-[16px] md:text-[18px] text-[#9ca3af] leading-[1.75] max-w-[480px]">
                            A unified, microservices-powered ecosystem for Competitive
                            Programming, Machine Learning, and Cybersecurity
                            assessments.{' '} Break down silos, streamline administration,
                            and challenge your breadth of knowledge.
                        </p>

                        <Link
                            to="/problems"
                            className="inline-flex items-center justify-center mt-10 bg-[#22c55e] font-bold uppercase hover:bg-[#16a34a] transition-all duration-200 hover:shadow-lg hover:shadow-green-500/25"
                            style={{
                                padding: '20px 56px',
                                borderRadius: '10px',
                                fontSize: '18px',
                                letterSpacing: '0.08em',
                                color: '#0a0a0a',
                            }}
                        >
                            Start Exploring
                        </Link>
                    </div>

                    {/* ── Right Column: Domain Cards with Connecting Lines ── */}
                    <div className="flex-1 w-full lg:max-w-[580px] relative lg:pt-[2vh]">
                        {/* Vertical connecting line on the left side */}
                        <div className="absolute left-6 top-[calc(2vh+80px)] bottom-[80px] w-[2px] bg-gradient-to-b from-green-500/30 via-sky-400/30 to-amber-500/30 hidden lg:block" />

                        <div className="flex flex-col gap-5">
                            {domainCards.map(({ title, borderColor, titleColor, badgeColor, Illustration }, idx) => {
                                const glowMap = {
                                    'Competitive Programming (DSA)': '0 0 30px rgba(34,197,94,0.15), 0 0 60px rgba(34,197,94,0.05)',
                                    'Machine Learning (Data Science)': '0 0 30px rgba(56,189,248,0.12), 0 0 60px rgba(56,189,248,0.04)',
                                    'Cybersecurity (CTF)': '0 0 30px rgba(245,158,11,0.15), 0 0 60px rgba(245,158,11,0.05)',
                                }
                                return (
                                    <div key={title} className="relative">
                                        {/* Horizontal connector from vertical line to card */}
                                        {idx > 0 && (
                                            <div className="absolute left-6 top-1/2 w-8 h-[2px] hidden lg:block" style={{ background: titleColor, opacity: 0.3 }} />
                                        )}
                                        <div
                                            className={`relative rounded-xl border ${borderColor} px-6 py-6 md:px-8 md:py-8 transition-all duration-300 hover:scale-[1.01]`}
                                            style={{
                                                background: 'linear-gradient(180deg, rgba(30,36,44,0.7) 0%, rgba(20,25,31,0.9) 100%)',
                                                backdropFilter: 'blur(16px)',
                                                boxShadow: `0 0 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1), ${glowMap[title] || 'none'}`,
                                            }}
                                        >
                                            <div
                                                className="absolute inset-0 pointer-events-none rounded-xl"
                                                style={{
                                                    boxShadow: `inset 0 0 90px ${
                                                        title.includes('COMPETITIVE') ? 'rgba(74,222,128,0.06)' :
                                                        title.includes('MACHINE') ? 'rgba(56,189,248,0.06)' :
                                                        'rgba(245,158,11,0.06)'
                                                    }`,
                                                }}
                                            />
                                            {/* Problems Solved / Global Rank badge */}
                                            <div className="absolute top-4 right-5 md:top-5 md:right-6 text-right flex items-start gap-1.5">
                                                <svg viewBox="0 0 16 16" className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: badgeColor, opacity: 0.6 }}>
                                                    <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                                    <text x="8" y="11" textAnchor="middle" fill="currentColor" fontSize="9" fontWeight="bold">i</text>
                                                </svg>
                                                <div>
                                                    <p className="text-[10px] font-medium tracking-wider leading-relaxed" style={{ color: badgeColor, opacity: 0.7 }}>Problems Solved:</p>
                                                    <p className="text-[10px] font-medium tracking-wider leading-relaxed" style={{ color: badgeColor, opacity: 0.7 }}>Global Rank:</p>
                                                </div>
                                            </div>

                                            {/* Title — larger and centered */}
                                            <h3
                                                className="text-base md:text-lg font-bold tracking-[0.12em] uppercase text-center"
                                                style={{ color: titleColor }}
                                            >
                                                {title}
                                            </h3>

                                            {/* Illustration */}
                                            <Illustration />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </section>

        </div>
    )
}
