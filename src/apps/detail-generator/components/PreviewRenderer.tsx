import React from 'react';
import { RefreshCwIcon, Trash2Icon, CopyIcon, PlusIcon, MinusIcon } from './icons';

export interface TextElement {
    id: string;
    content: string;
    top: number;
    left: number;
    width: number;
    height: number;
    fontSize: number;
    fontFamily: string;
}

interface PreviewRendererProps {
    htmlContent: string;
    textElements: TextElement[];
    overlays?: any[];
    onAction?: (action: string, type: any, index: any, arg?: any) => void;
    onZoom?: (key: string, direction: string) => void;
    interactive?: boolean;
    // Handlers for interactive mode
    onTextMouseDown?: (e: React.MouseEvent, textId: string) => void;
    onResizeMouseDown?: (e: React.MouseEvent, textId: string) => void;
    onTextChange?: (textId: string, content: string) => void;
    contentRef?: React.RefObject<HTMLDivElement | null>;
}

export const PreviewRenderer: React.FC<PreviewRendererProps> = ({
    htmlContent,
    textElements,
    overlays = [],
    onAction,
    onZoom,
    interactive = false,
    onTextMouseDown,
    onResizeMouseDown,
    onTextChange,
    contentRef
}) => {
    return (
        <div className="relative w-full h-full">
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

            <div ref={contentRef} className="relative w-[1000px] bg-white shadow-2xl" dangerouslySetInnerHTML={{ __html: htmlContent }} />

            {/* Text Elements */}
            {textElements.map(text => (
                <div
                    key={text.id}
                    data-text-id={text.id}
                    className={`absolute ${interactive ? 'border-2 border-blue-400 bg-blue-50/10' : ''}`}
                    style={{
                        top: text.top,
                        left: text.left,
                        width: text.width,
                        height: text.height,
                        zIndex: 9999,
                        cursor: interactive ? 'grab' : 'default',
                        pointerEvents: interactive ? 'auto' : 'none'
                    }}
                    onMouseDown={(e) => interactive && onTextMouseDown?.(e, text.id)}
                >
                    <textarea
                        value={text.content}
                        onChange={(e) => interactive && onTextChange?.(text.id, e.target.value)}
                        className="w-full h-full bg-transparent border-0 outline-none resize-none p-2"
                        style={{
                            fontSize: text.fontSize,
                            fontFamily: text.fontFamily,
                            cursor: interactive ? 'text' : 'default',
                            pointerEvents: interactive ? 'auto' : 'none'
                        }}
                        placeholder={interactive ? "텍스트 입력..." : ""}
                        readOnly={!interactive}
                        onClick={(e) => e.stopPropagation()}
                    />
                    {/* Resize handle - only visible in interactive mode */}
                    {interactive && (
                        <div
                            className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-nwse-resize"
                            onMouseDown={(e) => onResizeMouseDown?.(e, text.id)}
                        />
                    )}
                </div>
            ))}

            {/* Overlays - only visible in interactive mode */}
            {interactive && overlays.map((o, i) => (
                <div key={i} className="absolute group z-20 hover:ring-4 ring-blue-500/50 rounded-lg transition-all" style={{ top: o.top, left: o.left, width: o.width, height: o.height }}>
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 bg-black/60 transition-opacity backdrop-blur-sm rounded-lg">
                        <div className="flex gap-2 mb-2">
                            <button onClick={() => onAction?.('regenerate', o.type, o.index)} className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all shadow-lg hover:scale-110">
                                <RefreshCwIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => onAction?.('duplicate', o.type, o.index)} className="p-2.5 bg-green-600 hover:bg-green-700 text-white rounded-full transition-all shadow-lg hover:scale-110">
                                <CopyIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => onAction?.('delete', o.type, o.index)} className="p-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all shadow-lg hover:scale-110">
                                <Trash2Icon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => onZoom?.(`${o.type}-${o.index}`, 'in')} className="p-1.5 bg-white/30 hover:bg-white/40 text-white rounded transition-all">
                                <PlusIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => onZoom?.(`${o.type}-${o.index}`, 'out')} className="p-1.5 bg-white/30 hover:bg-white/40 text-white rounded transition-all">
                                <MinusIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
