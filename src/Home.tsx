import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

export function Home() {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="min-h-screen relative overflow-hidden bg-[#E5E5E5]">
            {/* Mouse spotlight */}
            <div
                className="fixed w-[800px] h-[800px] rounded-full pointer-events-none blur-3xl opacity-20"
                style={{
                    background: 'radial-gradient(circle, rgba(100,100,100,0.6) 0%, transparent 70%)',
                    left: mousePosition.x - 400,
                    top: mousePosition.y - 400,
                }}
            />

            {/* Top Nav */}
            <div className="border-b border-gray-300/60 bg-white/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-[1600px] mx-auto px-12 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-12">
                        <div className="text-lg font-black tracking-tight">🎨 AI HUB</div>
                        <nav className="hidden md:flex gap-8 text-base font-medium">
                            <button className="hover:text-[#FF6B35] transition-colors">Portfolio</button>
                            <button className="hover:text-[#FF6B35] transition-colors">Blog</button>
                        </nav>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="px-5 py-2 text-sm font-semibold hover:bg-gray-100 rounded-lg transition-colors">
                            로그인
                        </button>
                        <button className="px-8 py-3 bg-[#FF6B35] hover:bg-[#FF5722] text-white text-base font-bold rounded-xl transition-all hover:shadow-lg">
                            APPLY NOW
                        </button>
                    </div>
                </div>
            </div>

            {/* Hero */}
            <div className="max-w-[1600px] mx-auto px-12 pt-28 pb-16">
                <h1 className="font-display text-[140px] font-black leading-[0.88] tracking-[-0.05em] mb-10 text-black">
                    PORT_FOLIO
                </h1>
                <p className="text-xl text-gray-700 max-w-[700px] mb-4 font-semibold">
                    • Meet our recent foundations
                </p>
                <p className="text-base text-gray-500 max-w-[700px]">
                    프리미엄 패션 AI 통합 플랫폼
                </p>
            </div>

            {/* Projects Grid */}
            <div className="max-w-[1600px] mx-auto px-12 pb-32">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Detail Generator - Featured */}
                    <Link to="/detail-generator" className="group md:col-span-3 bg-white rounded-2xl border border-gray-300/70 shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-1">
                        <div className="p-12">
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-6">
                                    <div className="text-7xl">📄</div>
                                    <div>
                                        <h2 className="font-display text-4xl font-black text-black mb-2">상세페이지 생성기</h2>
                                        <p className="text-sm text-gray-500 font-medium">moderator</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-lg">
                                    <span className="font-bold text-black text-2xl">$4.4B</span>
                                    <span className="text-gray-400 text-xl">700%</span>
                                    <button className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-black group-hover:translate-x-1 transition-transform text-2xl">→</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-base">
                                {[
                                    { label: 'AI 생성', value: '41x' },
                                    { label: '완성도', value: '84' },
                                    { label: '프로젝트', value: '9x' },
                                    { label: '사용자', value: '87' }
                                ].map((stat, i) => (
                                    <div key={i}>
                                        <div className="text-gray-500 mb-2 font-medium">{stat.label}</div>
                                        <div className="font-bold text-black text-xl">{stat.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Link>

                    {/* Other Apps */}
                    {[
                        { to: '/detail-storage', icon: '📦', name: '상세페이지 스토리지', value: '$5.3B', perf: '2000%', stat1: '18x', stat2: '78' },
                        { to: '/model-generator', icon: '👗', name: '모델 생성기', value: '$6.2B', perf: '1000%', stat1: '9x', stat2: '92' },
                        { to: '/shoe-editor', icon: '👟', name: '신발 이미지 AI 에디터', value: '$2.1B', perf: '800%', stat1: '16x', stat2: '65' },
                    ].map((app, i) => (
                        <Link key={i} to={app.to} className="group bg-white rounded-2xl border border-gray-300/70 shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-1">
                            <div className="p-8">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="text-6xl">{app.icon}</div>
                                    <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black group-hover:translate-x-1 transition-transform text-xl">→</button>
                                </div>
                                <h2 className="font-display text-2xl font-black text-black mb-2">{app.name}</h2>
                                <p className="text-sm text-gray-500 mb-6 font-medium">moderator</p>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <div className="text-gray-500 font-medium">{app.value}</div>
                                        <div className="font-bold text-black text-lg">{app.stat1}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 font-medium">{app.perf}</div>
                                        <div className="font-bold text-black text-lg">{app.stat2}</div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {/* Content Generator - Wide */}
                    <Link to="/content-generator" className="group md:col-span-2 bg-white rounded-2xl border border-gray-300/70 shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-1">
                        <div className="p-8">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-5">
                                    <div className="text-6xl">✨</div>
                                    <div>
                                        <h2 className="font-display text-2xl font-black text-black mb-1">패션 콘텐츠 생성기</h2>
                                        <p className="text-sm text-gray-500 font-medium">moderator</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-base">
                                    <span className="font-bold text-black text-xl">$7.2B</span>
                                    <span className="text-gray-400">200%</span>
                                    <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black group-hover:translate-x-1 transition-transform text-xl">→</button>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* CTA */}
                <div className="mt-20 flex items-center justify-between bg-white rounded-2xl border border-gray-300/70 p-10">
                    <div>
                        <p className="text-lg font-bold mb-2">• READY TO DISCUSS</p>
                        <p className="text-base text-gray-500">Click the button</p>
                    </div>
                    <button className="px-12 py-4 bg-[#FF6B35] hover:bg-[#FF5722] text-white text-lg font-bold rounded-xl transition-all hover:shadow-xl">
                        APPLY FOR FUNDING
                    </button>
                </div>
            </div>
        </div>
    );
}
