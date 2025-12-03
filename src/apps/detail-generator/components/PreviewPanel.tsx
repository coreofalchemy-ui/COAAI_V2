import React, { forwardRef, useCallback } from 'react';
import { HeroSection } from './HeroSection';
import { TextElement } from './PreviewRenderer';

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
}

export const PreviewPanel = forwardRef<HTMLDivElement, PreviewPanelProps>(({
    data,
    sectionOrder,
    onAction,
    onContextMenu
}, ref) => {

    const handleDrop = useCallback((e: React.DragEvent, sectionKey: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                const result = ev.target?.result as string;
                if (result) {
                    onAction('updateImage', sectionKey, 0, result);
                }
            };
            reader.readAsDataURL(file);
        }
    }, [onAction]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleClickUpload = (sectionKey: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (ev: any) => {
            if (ev.target.files && ev.target.files.length > 0) {
                const file = ev.target.files[0];
                const reader = new FileReader();
                reader.onload = (e) => {
                    const result = e.target?.result as string;
                    if (result) {
                        onAction('updateImage', sectionKey, 0, result);
                    }
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    return (
        <div
            ref={ref}
            className="preview-panel bg-white shadow-lg min-h-[1000px] relative"
            style={{ width: '1000px', margin: '0 auto' }}
        >
            {sectionOrder.map((sectionKey) => {
                if (sectionKey === 'hero') {
                    return (
                        <div key={sectionKey} onClick={(e) => { e.stopPropagation(); }}>
                            <HeroSection content={data.heroTextContent} />
                        </div>
                    );
                }

                // Custom Sections (Images)
                const imageUrl = data.imageUrls?.[sectionKey];
                const isPlaceholder = !imageUrl || imageUrl.includes('placeholder') || imageUrl.includes('via.placeholder');

                return (
                    <div
                        key={sectionKey}
                        data-section={sectionKey}
                        className="relative group"
                        style={{ minHeight: '100px' }}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, sectionKey)}
                        onClick={() => isPlaceholder && handleClickUpload(sectionKey)}
                        onContextMenu={(e) => onContextMenu(e, sectionKey, 0, sectionKey)}
                    >
                        {isPlaceholder ? (
                            <div className="w-full h-[600px] border-4 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer box-border">
                                <div className="text-6xl mb-6">📷</div>
                                <div className="text-gray-500 font-bold text-xl">이미지를 드래그하여 업로드하세요</div>
                                <div className="text-gray-400 text-base mt-3">또는 클릭하여 선택</div>
                            </div>
                        ) : (
                            <div className="relative w-full">
                                <img
                                    src={imageUrl}
                                    alt="Section"
                                    className="w-full block"
                                    draggable={false}
                                />
                                {/* Hover Overlay for Image Change */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                    <div className="bg-white/90 px-6 py-3 rounded-full shadow-lg text-base font-bold text-gray-700 pointer-events-auto cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-all" onClick={() => handleClickUpload(sectionKey)}>
                                        이미지 변경
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
});

PreviewPanel.displayName = 'PreviewPanel';
