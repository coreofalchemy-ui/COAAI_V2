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
    onContextMenu: (e: React.MouseEvent, type: string, index: number, section: string) => void;
    lockedImages: Set<string>;
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
    onUpdateAllTextElements,
    onContextMenu,
    lockedImages
}, ref) => {
    const [htmlContent, setHtmlContent] = useState('');
    const [overlays, setOverlays] = useState<any[]>([]);
    const contentRef = useRef<HTMLDivElement>(null);

    // Text Dragging State
    const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizingTextId, setResizingTextId] = useState<string | null>(null);
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

    useEffect(() => {
        console.log('PreviewPanel: data', data);
        if (data.layoutHtml) {
            // ... (HTML generation logic remains same)
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
        // Check if clicking on an image (or inside one, though unlikely for img tags)
        const target = e.target as HTMLElement;
        const img = target.closest('img[data-gallery-type]');

        if (img) {
            e.preventDefault();
            e.stopPropagation();
            const type = img.getAttribute('data-gallery-type') || '';
            const index = parseInt(img.getAttribute('data-index') || '0');
            onContextMenu(e, type, index, type);
        }
    };

    // ... (Text dragging/resizing logic remains same)
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

    // Image upload handlers
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

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const target = e.target as HTMLElement;
        const sectionEl = target.closest('.drop-zone');
        if (sectionEl) {
            sectionEl.classList.add('drag-over');
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const target = e.target as HTMLElement;
        const sectionEl = target.closest('.drop-zone');
        // Only remove if we are leaving the element, not entering a child
        if (sectionEl && !sectionEl.contains(e.relatedTarget as Node)) {
            sectionEl.classList.remove('drag-over');
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Ensure visual feedback stays if moving within the zone
        const target = e.target as HTMLElement;
        const sectionEl = target.closest('.drop-zone');
        if (sectionEl && !sectionEl.classList.contains('drag-over')) {
            sectionEl.classList.add('drag-over');
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Clean up visual feedback
        document.querySelectorAll('.drop-zone.drag-over').forEach(el => el.classList.remove('drag-over'));

        const target = e.target as HTMLElement;
        // Try to find section from image or section container
        let sectionEl = target.closest('[data-section]');

        // If dropped on an image, use its gallery type to determine section
        if (!sectionEl) {
            const img = target.closest('img[data-gallery-type]');
            if (img) {
                const galleryType = img.getAttribute('data-gallery-type');
                sectionEl = document.querySelector(`[data-section="${galleryType}"]`);
            }
        }

        if (sectionEl && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const sectionKey = sectionEl.getAttribute('data-section');
            if (sectionKey) {
                handleImageUpload(e.dataTransfer.files[0], sectionKey);
            }
        }
    }, [handleImageUpload]);

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
    }, [handleImageUpload]);

    return (
        <div
            className="relative w-full flex flex-col items-center bg-white"
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
        >
            <style>{`
                @keyframes pulse-border {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
                .drop-zone {
                    min-height: 600px !important;
                    transition: all 0.2s ease;
                }
                .drop-zone.drag-over {
                    border-color: #6b7280 !important; /* Gray-500 */
                    background-color: #f3f4f6 !important; /* Gray-100 */
                    transform: scale(1.02);
                }
                img[data-gallery-type] {
                    margin: 0 !important;
                    display: block !important;
                    user-select: none !important;
                    -webkit-user-select: none !important;
                    -webkit-touch-callout: none !important;
                }
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&family=Noto+Serif+KR:wght@400;700&display=swap');
                @import url('https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/css/SpoqaHanSansNeo.css');
            `}</style>

            <div
                ref={ref}
                className="preview-scroll-container w-full relative flex justify-center py-8"
                onContextMenu={(e) => {
                    console.log('🖱️ PreviewPanel onContextMenu', e.target);
                    const target = e.target as HTMLElement;
                    const img = target.closest('img[data-gallery-type]');

                    if (img) {
                        console.log('🖱️ 이미지 우클릭 감지!');
                        e.preventDefault();
                        e.stopPropagation();
                        const type = img.getAttribute('data-gallery-type') || '';
                        const index = parseInt(img.getAttribute('data-index') || '0');
                        onContextMenu(e, type, index, type);
                    }
                }}
            >
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
                    onContextMenu={onContextMenu}
                />

                {/* Lock Indicators */}
                {overlays.map((o, i) => {
                    const key = `${o.type}-${o.index}`;
                    if (lockedImages.has(key)) {
                        return (
                            <div
                                key={`lock-${i}`}
                                className="absolute z-30 pointer-events-none flex items-center justify-center bg-black/30 rounded-full p-2 backdrop-blur-sm"
                                style={{ top: o.top + 10, right: 10 + (1000 - (o.left + o.width)) }} // Approximate positioning
                            >
                                <span className="text-xl">🔒</span>
                            </div>
                        );
                    }
                    return null;
                })}
            </div>
        </div>
    );
});

PreviewPanel.displayName = 'PreviewPanel';
