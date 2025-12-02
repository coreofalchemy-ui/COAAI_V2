import React, { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { populateTemplate } from '../services/geminiService';
import { PreviewRenderer, TextElement } from './PreviewRenderer';

interface PreviewPanelProps {
    data: any;
    imageZoomLevels: any;
    onAction: any;
    onZoom: any;
    activeSection: string;
    onSectionVisible: any;
    sectionOrder: string[];
    showAIAnalysis: boolean;
    onHtmlUpdate: (html: string) => void;
    textElements: TextElement[];
    onAddTextElement: (text: TextElement) => void;
    onUpdateTextElement: (id: string, prop: keyof TextElement, value: any) => void;
    onDeleteTextElement: (id: string) => void;
    onUpdateAllTextElements: (elements: TextElement[]) => void;
    showSubHero1?: boolean; // Optional to prevent error if passed
    showSubHero2?: boolean; // Optional to prevent error if passed
}

export const PreviewPanel = forwardRef<HTMLDivElement, PreviewPanelProps>(({
    data,
    imageZoomLevels,
    onAction,
    onZoom,
    activeSection,
    onSectionVisible,
    sectionOrder,
    showAIAnalysis,
    onHtmlUpdate,
    textElements,
    onAddTextElement,
    onUpdateTextElement,
    onDeleteTextElement,
    onUpdateAllTextElements
}, ref) => {
    const [htmlContent, setHtmlContent] = useState('');
    const [overlays, setOverlays] = useState<any[]>([]);
    const contentRef = useRef<HTMLDivElement>(null);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, textId?: string } | null>(null);
    const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizingTextId, setResizingTextId] = useState<string | null>(null);
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

    useEffect(() => {
        console.log('PreviewPanel: data', data);
        if (data.layoutHtml) {
            console.log('PreviewPanel: layoutHtml found, length:', data.layoutHtml.length);
            try {
                const html = populateTemplate(
                    data,
                    data.imageUrls,
                    { heroBrandName: 48, slogan: 20 },
                    {},
                    data.layoutHtml,
                    imageZoomLevels || {},
                    sectionOrder || ['hero', 'products', 'models'],
                    showAIAnalysis !== undefined ? showAIAnalysis : true
                );
                console.log('PreviewPanel: Generated HTML length:', html.length);

                // Inject styles into HTML for minimap
                const styleBlock = `
                    <style>
                        @import url('https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/css/SpoqaHanSansNeo.css');
                        img { max-width: 100%; }
                        body { margin: 0; padding: 0; overflow-x: hidden; }
                    </style>
                `;
                const finalHtml = styleBlock + html;

                setHtmlContent(finalHtml);
                if (onHtmlUpdate) {
                    onHtmlUpdate(finalHtml);
                }
            } catch (e) {
                console.error('PreviewPanel: Error generating HTML', e);
            }
        }
    }, [data, imageZoomLevels, sectionOrder, showAIAnalysis]);

    const calculateOverlays = useCallback(() => {
        if (!contentRef.current) return;

        const images = contentRef.current.querySelectorAll<HTMLImageElement>('img[data-gallery-type]');
        const newOverlays: any[] = [];

        images.forEach((img) => {
            // Use offsetTop/Left for stable positioning relative to the container
            let top = img.offsetTop;
            let left = img.offsetLeft;
            let parent = img.offsetParent as HTMLElement;

            // Traverse up until we hit the contentRef or null
            while (parent && parent !== contentRef.current) {
                top += parent.offsetTop;
                left += parent.offsetLeft;
                parent = parent.offsetParent as HTMLElement;
            }

            if (img.offsetWidth === 0) return;

            newOverlays.push({
                top,
                left,
                width: img.offsetWidth,
                height: img.offsetHeight,
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

        // Scroll event listener
        if (ref && typeof ref !== 'function' && ref.current) {
            ref.current.addEventListener('scroll', calculateOverlays);
        }

        return () => {
            obs.disconnect();
            window.removeEventListener('resize', calculateOverlays);
            if (ref && typeof ref !== 'function' && ref.current) {
                ref.current.removeEventListener('scroll', calculateOverlays);
            }
        };
    }, [htmlContent, calculateOverlays, ref]);

    // Handle right click
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();

        // Check if clicking on a text element
        const target = e.target as HTMLElement;
        const textBox = target.closest('[data-text-id]');

        if (textBox) {
            const textId = textBox.getAttribute('data-text-id');
            setContextMenu({ x: e.clientX, y: e.clientY, textId: textId || undefined });
        } else {
            setContextMenu({ x: e.clientX, y: e.clientY });
        }
    };

    // Add text
    const handleAddText = () => {
        if (!contextMenu) return;

        const newText: TextElement = {
            id: `text-${Date.now()}`,
            content: '',
            top: contextMenu.y,
            left: contextMenu.x,
            width: 200,
            height: 100,
            fontSize: 16,
            fontFamily: 'Pretendard'
        };

        onAddTextElement(newText);
        setContextMenu(null);
    };

    // Text dragging
    const handleTextMouseDown = (e: React.MouseEvent, textId: string) => {
        if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
        e.stopPropagation();
        setDraggingTextId(textId);
        const text = textElements.find(t => t.id === textId);
        if (text) {
            setDragOffset({ x: e.clientX - text.left, y: e.clientY - text.top });
        }
    };

    // Text resizing
    const handleResizeMouseDown = (e: React.MouseEvent, textId: string) => {
        e.stopPropagation();
        e.preventDefault();
        setResizingTextId(textId);
        const text = textElements.find(t => t.id === textId);
        if (text) {
            setResizeStart({ x: e.clientX, y: e.clientY, width: text.width, height: text.height });
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (draggingTextId) {
                const newElements = textElements.map(text =>
                    text.id === draggingTextId
                        ? { ...text, left: e.clientX - dragOffset.x, top: e.clientY - dragOffset.y }
                        : text
                );
                onUpdateAllTextElements(newElements);
            } else if (resizingTextId) {
                const deltaX = e.clientX - resizeStart.x;
                const deltaY = e.clientY - resizeStart.y;

                const newElements = textElements.map(text =>
                    text.id === resizingTextId
                        ? {
                            ...text,
                            width: Math.max(100, resizeStart.width + deltaX),
                            height: Math.max(50, resizeStart.height + deltaY)
                        }
                        : text
                );
                onUpdateAllTextElements(newElements);
            }
        };

        const handleMouseUp = () => {
            setDraggingTextId(null);
            setResizingTextId(null);
        };

        if (draggingTextId || resizingTextId) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingTextId, resizingTextId, dragOffset, resizeStart, textElements, onUpdateAllTextElements]);

    // Image Upload Handler
    const handleImageUpload = useCallback((file: File, sectionKey: string) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            if (result) {
                onAction('updateImage', sectionKey, 0, result);
            }
        };
        reader.readAsDataURL(file);
    }, [onAction]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const target = e.target as HTMLElement;
        const sectionEl = target.closest('[data-section]');

        if (sectionEl && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const sectionKey = sectionEl.getAttribute('data-section');
            if (sectionKey) {
                handleImageUpload(e.dataTransfer.files[0], sectionKey);
            }
        }
    }, [handleImageUpload]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleClick = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const sectionEl = target.closest('.drop-zone');

        if (sectionEl) {
            const sectionKey = sectionEl.getAttribute('data-section');
            if (sectionKey) {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (ev: any) => {
                    if (ev.target.files && ev.target.files.length > 0) {
                        handleImageUpload(ev.target.files[0], sectionKey);
                    }
                };
                input.click();
            }
        }
        setContextMenu(null);
    }, [handleImageUpload]);

    const FONT_FAMILIES = [
        'Pretendard',
        'Noto Sans KR',
        'Noto Serif KR',
        'Spoqa Han Sans Neo',
        'IBM Plex Sans KR',
        'Gowun Batang',
        'Gowun Dodum',
        'Nanum Gothic',
        'Nanum Myeongjo',
        'Black Han Sans'
    ];

    return (
        <div
            className="relative w-full h-full flex flex-col items-center overflow-hidden bg-white"
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onContextMenu={handleContextMenu}
        >
            <style>{`
                @keyframes pulse-border {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
                .drop-zone {
                    min-height: 600px !important;
                }
                img[data-gallery-type] {
                    margin: 0 !important;
                    display: block !important;
                }
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&family=Noto+Serif+KR:wght@400;700&display=swap');
                @import url('https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/css/SpoqaHanSansNeo.css');
            `}</style>

            <div ref={ref} className="preview-scroll-container w-full h-full overflow-y-auto relative scroll-smooth flex justify-center py-8">
                <PreviewRenderer
                    htmlContent={htmlContent}
                    textElements={textElements}
                    overlays={overlays}
                    onAction={onAction}
                    onZoom={onZoom}
                    interactive={true}
                    onTextMouseDown={handleTextMouseDown}
                    onResizeMouseDown={handleResizeMouseDown}
                    onTextChange={(id, content) => onUpdateTextElement(id, 'content', content)}
                    contentRef={contentRef}
                />

                {/* Context Menu */}
                {contextMenu && (
                    <div
                        className="fixed bg-white shadow-xl rounded-lg border border-gray-200 py-2 z-[10000]"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                    >
                        {contextMenu.textId ? (
                            <>
                                <div className="px-3 py-1 text-xs font-bold text-gray-500 border-b mb-1">서체 선택</div>
                                {FONT_FAMILIES.map(font => (
                                    <button
                                        key={font}
                                        onClick={() => {
                                            onUpdateTextElement(contextMenu.textId!, 'fontFamily', font);
                                            setContextMenu(null);
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                                        style={{ fontFamily: font }}
                                    >
                                        {font}
                                    </button>
                                ))}
                                <div className="border-t mt-1 pt-1">
                                    <button
                                        onClick={() => {
                                            onDeleteTextElement(contextMenu.textId!);
                                            setContextMenu(null);
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600"
                                    >
                                        삭제
                                    </button>
                                </div>
                            </>
                        ) : (
                            <button
                                onClick={handleAddText}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                            >
                                텍스트 추가
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

PreviewPanel.displayName = 'PreviewPanel';
