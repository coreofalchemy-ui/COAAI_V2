import React, { useState, useEffect, useRef, useCallback } from 'react';
import { populateTemplate } from '../services/geminiService';
import { RefreshCwIcon, Trash2Icon, CopyIcon, PlusIcon, MinusIcon } from './icons';

export const PreviewPanel: React.FC<any> = ({ data, imageZoomLevels, onAction, onZoom, activeSection, onSectionVisible }) => {
    const [htmlContent, setHtmlContent] = useState('');
    const [overlays, setOverlays] = useState<any[]>([]);
    const contentRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (data.layoutHtml) {
            const html = populateTemplate(
                data,
                data.imageUrls,
                { heroBrandName: 48, slogan: 20 },
                {},
                data.layoutHtml,
                { brandName: '#000', slogan: '#fff' },
                imageZoomLevels
            );

            setHtmlContent(html);
        }
    }, [data, imageZoomLevels]);

    const calculateOverlays = useCallback(() => {
        if (!contentRef.current || !wrapperRef.current) return;
        const images = contentRef.current.querySelectorAll<HTMLImageElement>('img[data-type]');
        const newOverlays: any[] = [];
        const containerRect = wrapperRef.current.getBoundingClientRect();

        images.forEach((img) => {
            const rect = img.getBoundingClientRect();
            if (rect.width === 0) return;
            newOverlays.push({
                top: rect.top - containerRect.top + wrapperRef.current!.scrollTop,
                left: rect.left - containerRect.left + wrapperRef.current!.scrollLeft,
                width: rect.width,
                height: rect.height,
                type: img.dataset.galleryType,
                index: parseInt(img.dataset.index || '0')
            });
        });
        setOverlays(newOverlays);
    }, []);

    useEffect(() => {
        calculateOverlays();
        const obs = new ResizeObserver(calculateOverlays);
        if (contentRef.current) obs.observe(contentRef.current);
        window.addEventListener('resize', calculateOverlays);
        const imgHandler = () => calculateOverlays();
        contentRef.current?.addEventListener('load', imgHandler, true);
        return () => { obs.disconnect(); window.removeEventListener('resize', calculateOverlays); };
    }, [htmlContent, calculateOverlays]);

    // ... (previous code)

    // Text Interaction State
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, targetId: string } | null>(null);
    const [snapLines, setSnapLines] = useState<{ x?: number, type: 'left' | 'center' | 'right' } | null>(null);

    // Remove Blue Border Logic (Deleted useEffect)

    // Text Element Identification & Event Binding
    useEffect(() => {
        if (!contentRef.current) return;

        const textElements = contentRef.current.querySelectorAll('h1, h2, h3, p, span, div[data-editable="true"]');
        textElements.forEach((el, index) => {
            const htmlEl = el as HTMLElement;
            if (!htmlEl.id) htmlEl.id = `text-el-${index}`;
            htmlEl.style.cursor = 'text';
            htmlEl.style.position = 'relative'; // Ensure relative positioning for movement

            // Mouse Down for Dragging (only if not editing)
            htmlEl.onmousedown = (e) => {
                if (e.button !== 0) return; // Only left click
                e.stopPropagation();
                const rect = htmlEl.getBoundingClientRect();
                setDraggingId(htmlEl.id);
                setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            };

            // Context Menu
            htmlEl.oncontextmenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({ x: e.clientX, y: e.clientY, targetId: htmlEl.id });
            };
        });
    }, [htmlContent]);

    // Global Drag & Snap Logic
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!draggingId || !contentRef.current) return;

            const el = document.getElementById(draggingId);
            if (!el) return;

            const containerRect = contentRef.current.getBoundingClientRect();
            let newX = e.clientX - containerRect.left - dragOffset.x;

            // Grid Snapping Logic
            const elWidth = el.offsetWidth;
            const containerWidth = containerRect.width;
            const center = containerWidth / 2 - elWidth / 2;
            const right = containerWidth - elWidth - 20; // 20px padding
            const left = 20;

            let snapped = false;
            let snapLineInfo = null;

            // Snap Threshold
            const threshold = 10;

            if (Math.abs(newX - center) < threshold) {
                newX = center;
                snapLineInfo = { x: containerWidth / 2, type: 'center' as const };
                snapped = true;
            } else if (Math.abs(newX - left) < threshold) {
                newX = left;
                snapLineInfo = { x: 20, type: 'left' as const };
                snapped = true;
            } else if (Math.abs(newX - right) < threshold) {
                newX = right;
                snapLineInfo = { x: containerWidth - 20, type: 'right' as const };
                snapped = true;
            }

            setSnapLines(snapLineInfo);
            el.style.left = `${newX}px`;
            // el.style.top is handled by flow usually, but if we want full drag we need absolute. 
            // For now, let's assume horizontal alignment adjustment within the flow or absolute if needed.
            // If the element is static, setting left might not work without position: relative/absolute.
            // We set position relative in the init.
        };

        const handleMouseUp = () => {
            setDraggingId(null);
            setSnapLines(null);
        };

        if (draggingId) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingId, dragOffset]);

    // Context Menu Actions
    const updateTextStyle = (key: string, value: string) => {
        if (!contextMenu) return;
        const el = document.getElementById(contextMenu.targetId);
        if (el) {
            el.style[key as any] = value;
        }
        setContextMenu(null);
    };

    return (
        <div className="relative w-full h-full flex flex-col items-center overflow-hidden bg-gray-100" onClick={() => setContextMenu(null)}>
            <style>{`
                @keyframes pulse-border {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
            `}</style>

            <div ref={wrapperRef} className="preview-scroll-container w-full h-full overflow-y-auto relative scroll-smooth flex justify-center py-8">
                <div ref={contentRef} className="relative w-[1000px] bg-white shadow-2xl" dangerouslySetInnerHTML={{ __html: htmlContent }} />

                {/* Snap Lines */}
                {snapLines && (
                    <div
                        className="absolute top-0 bottom-0 border-l border-dashed border-red-500 z-50 pointer-events-none"
                        style={{ left: contentRef.current ? contentRef.current.getBoundingClientRect().left + snapLines.x : 0 }}
                    />
                )}

                {/* Context Menu */}
                {contextMenu && (
                    <div
                        className="fixed bg-white shadow-xl rounded-lg border border-gray-200 py-2 z-50 w-48"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                    >
                        <div className="px-3 py-1 text-xs font-bold text-gray-500 border-b border-gray-100 mb-1">텍스트 스타일 수정</div>
                        <div className="px-2">
                            <div className="text-xs text-gray-600 mb-1">크기</div>
                            <div className="flex gap-1 mb-2">
                                {['12px', '16px', '24px', '32px', '48px', '64px'].map(size => (
                                    <button key={size} onClick={() => updateTextStyle('fontSize', size)} className="flex-1 py-1 text-[10px] border rounded hover:bg-gray-50">{size}</button>
                                ))}
                            </div>
                            <div className="text-xs text-gray-600 mb-1">서체</div>
                            <div className="flex flex-col gap-1">
                                <button onClick={() => updateTextStyle('fontFamily', 'Pretendard, sans-serif')} className="text-left px-2 py-1 text-xs hover:bg-gray-50 rounded">Pretendard (기본)</button>
                                <button onClick={() => updateTextStyle('fontFamily', 'serif')} className="text-left px-2 py-1 text-xs hover:bg-gray-50 rounded font-serif">Serif (명조)</button>
                                <button onClick={() => updateTextStyle('fontFamily', 'monospace')} className="text-left px-2 py-1 text-xs hover:bg-gray-50 rounded font-mono">Mono (고정폭)</button>
                            </div>
                        </div>
                    </div>
                )}

                {overlays.map((o, i) => (
                    <div key={i} className="absolute group z-20 hover:ring-4 ring-blue-500/50 rounded-lg transition-all" style={{ top: o.top, left: o.left, width: o.width, height: o.height }}>
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 bg-black/60 transition-opacity backdrop-blur-sm rounded-lg">
                            <div className="flex gap-2 mb-2">
                                <button onClick={() => onAction('regenerate', o.type, o.index)} className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all shadow-lg hover:scale-110">
                                    <RefreshCwIcon className="w-5 h-5" />
                                </button>
                                <button onClick={() => onAction('duplicate', o.type, o.index)} className="p-2.5 bg-green-600 hover:bg-green-700 text-white rounded-full transition-all shadow-lg hover:scale-110">
                                    <CopyIcon className="w-5 h-5" />
                                </button>
                                <button onClick={() => onAction('delete', o.type, o.index)} className="p-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all shadow-lg hover:scale-110">
                                    <Trash2Icon className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => onZoom(`${o.type}-${o.index}`, 'in')} className="p-1.5 bg-white/30 hover:bg-white/40 text-white rounded transition-all">
                                    <PlusIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => onZoom(`${o.type}-${o.index}`, 'out')} className="p-1.5 bg-white/30 hover:bg-white/40 text-white rounded transition-all">
                                    <MinusIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
