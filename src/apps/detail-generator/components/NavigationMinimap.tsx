import React, { useEffect, useRef, useState } from 'react';
import { populateTemplate } from '../services/geminiService';

interface NavigationMinimapProps {
    activeSection: string;
    onSectionClick: (section: string) => void;
    data: any;
}

export default function NavigationMinimap({ activeSection, onSectionClick, data }: NavigationMinimapProps) {
    const [minimapHtml, setMinimapHtml] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.12); // 120px / 1000px

    useEffect(() => {
        if (data && data.layoutHtml) {
            // Generate HTML for minimap (no zoom levels needed for minimap)
            let html = populateTemplate(
                data,
                data.imageUrls,
                { heroBrandName: 48, slogan: 20 },
                {},
                data.layoutHtml,
                { brandName: '#000', slogan: '#fff' }
            );

            setMinimapHtml(html);
        }
    }, [data]);

    // Auto-scroll minimap to keep active section in view
    useEffect(() => {
        if (!containerRef.current) return;
        const activeEl = containerRef.current.querySelector(`[data-section="${activeSection}"]`) as HTMLElement;

        if (activeEl) {
            // Scroll minimap container to show active element
            activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [activeSection]);

    const handleMinimapClick = (e: React.MouseEvent) => {
        // Find closest section
        const target = e.target as HTMLElement;
        const sectionEl = target.closest('[data-section]');
        if (sectionEl) {
            const sectionId = sectionEl.getAttribute('data-section');
            if (sectionId) onSectionClick(sectionId);
        }
    };

    return (
        <div className="w-[140px] h-full bg-gray-100 border-l border-gray-200 flex flex-col shadow-sm z-10 relative">
            <div className="p-3 border-b border-gray-200 bg-white z-20 shadow-sm">
                <h3 className="text-[10px] font-bold text-gray-500 text-center uppercase tracking-wider">Mini Map</h3>
            </div>

            <div className="flex-1 overflow-hidden relative bg-gray-50">
                <div
                    ref={containerRef}
                    className="absolute top-0 left-0 w-full h-full overflow-y-auto custom-scrollbar"
                    onClick={handleMinimapClick}
                >
                    <div className="relative origin-top-left minimap-container" style={{ transform: `scale(${scale})`, width: '1000px' }}>
                        {/* Render Full HTML */}
                        <div
                            dangerouslySetInnerHTML={{ __html: minimapHtml }}
                            className="bg-white shadow-lg pointer-events-auto"
                        />

                        {/* Active Section Overlay (Highlighter) */}
                        <div className="absolute inset-0 pointer-events-none">
                            <style>{`
                                .minimap-container [data-section="${activeSection}"] {
                                    position: relative;
                                }
                                .minimap-container [data-section="${activeSection}"]::after {
                                    content: '';
                                    position: absolute;
                                    top: 0;
                                    left: 0;
                                    right: 0;
                                    bottom: 0;
                                    border: 20px solid #3B82F6;
                                    background-color: rgba(59, 130, 246, 0.1);
                                    z-index: 50;
                                    pointer-events: none;
                                }
                            `}</style>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
