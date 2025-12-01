/**
 * DraggablePreview Component (Compact Version)
 * Draggable preview with multi-selection, compact UI matching SectionOrderPanel style
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom';

export interface PreviewItem {
    id: string;
    type: 'section' | 'image';
    sectionType?: string;
    content: string;
    imageUrl?: string;
    title?: string;
    fontSize?: number;
    fontFamily?: string;
    textAlign?: 'left' | 'center' | 'right';
    isSelected?: boolean;
    // Resize & Crop Props
    height?: number; // Container height in px
    imageScale?: number; // 1 = 100%
    imagePosition?: { x: number; y: number };
}

interface DraggablePreviewProps {
    items: PreviewItem[];
    onReorder: (newOrder: PreviewItem[]) => void;
    onSelectionChange?: (selectedIds: string[]) => void;
    onToggleSelection?: (id: string) => void;
    onDeleteItem?: (id: string) => void;
    onDuplicateItem?: (id: string) => void;
    onUpdateItem?: (id: string, updates: Partial<PreviewItem>) => void; // NEW: For resize updates
    onMoveToStaging?: (id: string) => void; // NEW: For "moving out"
    onBeautifyItem?: (id: string) => void; // NEW: For "Beautify"
}

const DraggablePreview: React.FC<DraggablePreviewProps> = ({
    items,
    onReorder,
    onToggleSelection,
    onDeleteItem,
    onDuplicateItem,
    onUpdateItem,
    onMoveToStaging,
    onBeautifyItem
}) => {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [resizingItemId, setResizingItemId] = useState<string | null>(null); // Track item being resized

    // Effect: Clear resizing state if the item is deselected (e.g. by clicking background)
    React.useEffect(() => {
        if (resizingItemId) {
            const item = items.find(i => i.id === resizingItemId);
            if (!item || !item.isSelected) {
                setResizingItemId(null);
            }
        }
    }, [items, resizingItemId]);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; itemId: string; type: 'section' | 'image' } | null>(null);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (draggedIndex !== null && draggedIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();

        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const newItems = [...items];
        const [draggedItem] = newItems.splice(draggedIndex, 1);
        newItems.splice(dropIndex, 0, draggedItem);

        onReorder(newItems);
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleSelectionToggle = (id: string, e: React.MouseEvent) => {
        // Don't stop propagation - allows clicking anywhere while keeping selections
        if (onToggleSelection) {
            onToggleSelection(id);
        }
    };

    // Context Menu Handlers
    const handleContextMenu = (e: React.MouseEvent, itemId: string, type: 'section' | 'image') => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            itemId,
            type
        });
    };

    const closeContextMenu = () => {
        setContextMenu(null);
    };

    const handleDeleteFromContext = () => {
        if (contextMenu && onDeleteItem) {
            onDeleteItem(contextMenu.itemId);
        }
        closeContextMenu();
    };

    const handleDuplicateFromContext = () => {
        if (contextMenu && onDuplicateItem) {
            onDuplicateItem(contextMenu.itemId);
        }
        closeContextMenu();
    };

    const handleSelectFromContext = () => {
        if (contextMenu && onToggleSelection) {
            onToggleSelection(contextMenu.itemId);
        }
        closeContextMenu();
    };

    const handleResizeFromContext = () => {
        if (contextMenu) {
            setResizingItemId(contextMenu.itemId);
        }
        closeContextMenu();
    };

    const handleBeautifyFromContext = () => {
        if (contextMenu && onBeautifyItem) {
            onBeautifyItem(contextMenu.itemId);
        }
        closeContextMenu();
    };

    const handleMoveToStagingFromContext = () => {
        if (contextMenu && onMoveToStaging) {
            onMoveToStaging(contextMenu.itemId);
        }
        closeContextMenu();
    };

    // Text Styling Handlers
    const handleFontSizeChange = (delta: number) => {
        if (contextMenu && onUpdateItem) {
            const item = items.find(i => i.id === contextMenu.itemId);
            if (item) {
                const currentSize = item.fontSize || 100;
                onUpdateItem(contextMenu.itemId, { fontSize: Math.max(50, currentSize + delta) });
            }
        }
    };

    const handleFontFamilyChange = (font: string) => {
        if (contextMenu && onUpdateItem) {
            onUpdateItem(contextMenu.itemId, { fontFamily: font });
        }
        closeContextMenu();
    };

    // --- Resize Logic ---
    const handleResizeStart = (e: React.MouseEvent, item: PreviewItem, type: 'height' | 'image') => {
        e.preventDefault();
        e.stopPropagation();

        const startY = e.clientY;
        const startX = e.clientX;
        const startHeight = item.height || 300; // Default height
        const startScale = item.imageScale || 1;
        const startPos = item.imagePosition || { x: 0, y: 0 };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (type === 'height') {
                const deltaY = moveEvent.clientY - startY;
                const newHeight = Math.max(100, startHeight + deltaY);
                if (onUpdateItem) onUpdateItem(item.id, { height: newHeight });
            } else if (type === 'image') {
                // Simple drag to pan
                const deltaX = moveEvent.clientX - startX;
                const deltaY = moveEvent.clientY - startY;
                if (onUpdateItem) onUpdateItem(item.id, {
                    imagePosition: { x: startPos.x + deltaX, y: startPos.y + deltaY }
                });
            }
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleWheelResize = (e: React.WheelEvent, item: PreviewItem) => {
        if (resizingItemId !== item.id) return;
        e.stopPropagation();
        // Zoom image
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newScale = Math.max(0.1, (item.imageScale || 1) + delta);
        if (onUpdateItem) onUpdateItem(item.id, { imageScale: newScale });
    };

    // Close context menu when clicking outside
    React.useEffect(() => {
        const handleClick = () => closeContextMenu();
        if (contextMenu) {
            document.addEventListener('click', handleClick);
            return () => document.removeEventListener('click', handleClick);
        }
    }, [contextMenu]);

    const applyTypography = (content: string, fontSize: number, fontFamily?: string, textAlign?: string): string => {
        let processedContent = content;

        // 1. Scale inline font-sizes if fontSize is not 100%
        if (fontSize !== 100) {
            const ratio = fontSize / 100;
            // Replace font-size: XXpx with scaled value
            processedContent = processedContent.replace(/font-size:\s*([\d.]+)px/gi, (match, size) => {
                const newSize = parseFloat(size) * ratio;
                return `font-size:${newSize.toFixed(1)}px`;
            });
        }

        // 2. Apply font-family and text-align wrapper
        const styles: string[] = [];
        if (fontFamily && fontFamily !== 'default') styles.push(`font-family: ${fontFamily} !important`);
        if (textAlign) styles.push(`text-align: ${textAlign} !important`);

        // Also apply a general font-size scale for relative units (em, rem, %) or text without inline styles
        if (fontSize !== 100) styles.push(`font-size: ${fontSize}%`);

        if (styles.length === 0 && fontSize === 100) return processedContent;

        return `<div style="${styles.join('; ')};">${processedContent}</div>`;
    };

    return (
        <div className="space-y-2">
            {items.map((item, index) => (
                <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    onContextMenu={(e) => handleContextMenu(e, item.id, item.type)}
                    className={`group relative cursor-move transition-all ${draggedIndex === index
                        ? 'opacity-50 scale-95'
                        : dragOverIndex === index
                            ? 'border-t-2 border-blue-500'
                            : ''
                        }`}
                >
                    {/* Compact Selection Checkbox */}
                    <div className="absolute top-1 left-1 z-20">
                        <label
                            className="flex items-center gap-1 bg-white bg-opacity-90 px-1.5 py-0.5 rounded shadow cursor-pointer hover:bg-opacity-100"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <input
                                type="checkbox"
                                checked={item.isSelected || false}
                                onChange={(e) => handleSelectionToggle(item.id, e as any)}
                                className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-xs font-semibold text-gray-700">선택</span>
                        </label>
                    </div>

                    {/* Compact Drag Handle */}
                    <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-blue-600 text-white px-2 py-0.5 rounded shadow flex items-center gap-1 text-xs font-semibold">
                            <span className="text-xs">⋮⋮</span>
                        </div>
                    </div>

                    {/* Compact Section Title */}
                    {item.type === 'section' && item.title && (
                        <div className="absolute top-8 left-1 z-10 bg-gray-800 bg-opacity-75 text-white px-1.5 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
                            <span>{item.title}</span>
                            {(item.fontSize && item.fontSize !== 100) || (item.fontFamily && item.fontFamily !== 'default') ? (
                                <span className="bg-purple-500 px-1 rounded text-xs">
                                    {item.fontSize && item.fontSize !== 100 && `${item.fontSize}%`}
                                    {item.fontFamily && item.fontFamily !== 'default' && ' 🔤'}
                                </span>
                            ) : null}
                        </div>
                    )}

                    {/* Compact Image Badge */}
                    {item.type === 'image' && (
                        <div className="absolute top-8 left-1 z-10 bg-purple-600 text-white px-1.5 py-0.5 rounded text-xs font-semibold">
                            📸 이미지 {index + 1}
                        </div>
                    )}

                    {/* Compact Selected Highlight */}
                    {item.isSelected && (
                        <div className="absolute inset-0 border-2 border-green-500 rounded pointer-events-none z-5" />
                    )}

                    {/* Compact Border */}
                    <div
                        className={`border rounded overflow-hidden transition-all bg-white relative ${draggedIndex === index
                            ? 'border-blue-400'
                            : item.isSelected
                                ? 'border-green-400 border-2'
                                : resizingItemId === item.id
                                    ? 'border-purple-500 border-2 shadow-lg z-30'
                                    : 'border-gray-200 group-hover:border-blue-300'
                            }`}
                        style={{
                            height: item.type === 'image' && item.height ? `${item.height}px` : 'auto',
                            minHeight: item.type === 'image' ? '100px' : 'auto'
                        }}
                        onWheel={(e) => item.type === 'image' && handleWheelResize(e, item)}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onToggleSelection) onToggleSelection(item.id);
                        }}
                    >
                        {item.type === 'image' && item.imageUrl ? (
                            <div
                                className="w-full h-full relative overflow-hidden bg-white"
                                onMouseDown={(e) => resizingItemId === item.id && handleResizeStart(e, item, 'image')}
                                style={{ cursor: resizingItemId === item.id ? 'move' : 'default' }}
                            >
                                <img
                                    src={item.imageUrl}
                                    alt={`Product ${index + 1}`}
                                    className="block select-none pointer-events-none"
                                    style={{
                                        width: '100%',
                                        transform: `scale(${item.imageScale || 1}) translate(${item.imagePosition?.x || 0}px, ${item.imagePosition?.y || 0}px)`,
                                        transformOrigin: 'center center'
                                    }}
                                    draggable={false}
                                />
                                {resizingItemId === item.id && (
                                    <div className="absolute inset-0 border-2 border-purple-500 border-dashed pointer-events-none opacity-50" />
                                )}
                            </div>
                        ) : (
                            <div className="text-sm p-2" style={{ minHeight: '50px' }} />
                        )}

                        {/* Resize Handle */}
                        {resizingItemId === item.id && item.type === 'image' && (
                            <div
                                className="absolute bottom-0 left-0 right-0 h-6 bg-purple-500 cursor-ns-resize flex items-center justify-center z-40 hover:bg-purple-600 transition-colors"
                                onMouseDown={(e) => handleResizeStart(e, item, 'height')}
                            >
                                <span className="text-white text-xs font-bold">↕ 높이 조절 (휠: 확대/축소, 드래그: 이동)</span>
                            </div>
                        )}
                    </div>

                    {/* Compact Drop Indicator */}
                    {
                        dragOverIndex === index && draggedIndex !== index && (
                            <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-blue-500 rounded-full shadow" />
                        )
                    }
                </div >
            ))}

            {/* Context Menu - Rendered via Portal to avoid transform issues */}
            {contextMenu && ReactDOM.createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: contextMenu.y,
                        left: contextMenu.x,
                        zIndex: 99999, // High z-index to be on top of everything
                        minWidth: '220px'
                    }}
                    className="bg-white rounded-lg shadow-2xl border border-gray-200 py-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Common: Select/Deselect */}
                    <button
                        onClick={handleSelectFromContext}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 text-sm font-medium text-gray-700"
                    >
                        <span className="text-lg">☑️</span>
                        선택/해제
                    </button>

                    {/* IMAGE ONLY Options */}
                    {contextMenu.type === 'image' && (
                        <>
                            <button
                                onClick={handleResizeFromContext}
                                className="w-full text-left px-4 py-2 hover:bg-purple-50 flex items-center gap-3 text-sm font-medium text-gray-700"
                            >
                                <span className="text-lg">📐</span>
                                사이즈 수정
                            </button>

                            {onBeautifyItem && (
                                <button
                                    onClick={handleBeautifyFromContext}
                                    className="w-full text-left px-4 py-2 hover:bg-pink-50 flex items-center gap-3 text-sm font-medium text-gray-700"
                                >
                                    <span className="text-lg">✨</span>
                                    미화 기능
                                </button>
                            )}
                        </>
                    )}

                    {/* TEXT ONLY Options */}
                    {contextMenu.type === 'section' && (
                        <>
                            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                텍스트 스타일
                            </div>
                            <div className="flex items-center justify-between px-4 py-1 hover:bg-gray-50">
                                <span className="text-sm text-gray-600">크기</span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleFontSizeChange(-10); }}
                                        className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded hover:bg-gray-200 text-gray-600"
                                    >
                                        -
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleFontSizeChange(10); }}
                                        className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded hover:bg-gray-200 text-gray-600"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                            <div className="px-4 py-2">
                                <select
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => handleFontFamilyChange(e.target.value)}
                                    defaultValue="default"
                                >
                                    <option value="default">기본 폰트</option>
                                    <optgroup label="Sans-serif (고딕)">
                                        <option value="'Inter', sans-serif">Inter</option>
                                        <option value="'Noto Sans KR', sans-serif">Noto Sans KR</option>
                                        <option value="'Pretendard', sans-serif">Pretendard</option>
                                        <option value="Arial, sans-serif">Arial</option>
                                        <option value="'Malgun Gothic', sans-serif">맑은 고딕</option>
                                    </optgroup>
                                    <optgroup label="Serif (명조)">
                                        <option value="'Noto Serif KR', serif">Noto Serif KR</option>
                                        <option value="'Merriweather', serif">Merriweather</option>
                                        <option value="'Playfair Display', serif">Playfair Display</option>
                                        <option value="'Times New Roman', serif">Times New Roman</option>
                                    </optgroup>
                                    <optgroup label="Display (제목용)">
                                        <option value="'Black Han Sans', sans-serif">Black Han Sans</option>
                                        <option value="'Impact', sans-serif">Impact</option>
                                        <option value="'GmarketSansMedium', sans-serif">Gmarket Sans</option>
                                    </optgroup>
                                    <optgroup label="Monospace">
                                        <option value="'Courier New', monospace">Courier New</option>
                                    </optgroup>
                                </select>
                            </div>
                        </>
                    )}

                    {/* Common: Duplicate */}
                    {onDuplicateItem && (
                        <button
                            onClick={handleDuplicateFromContext}
                            className="w-full text-left px-4 py-2 hover:bg-green-50 flex items-center gap-3 text-sm font-medium text-gray-700"
                        >
                            <span className="text-lg">📋</span>
                            복제하기
                        </button>
                    )}

                    {/* Common: Move to Staging */}
                    {onMoveToStaging && (
                        <button
                            onClick={handleMoveToStagingFromContext}
                            className="w-full text-left px-4 py-2 hover:bg-orange-50 flex items-center gap-3 text-sm font-medium text-gray-700"
                        >
                            <span className="text-lg">📦</span>
                            보관함으로 이동
                        </button>
                    )}

                    <div className="border-t border-gray-200 my-1"></div>

                    {/* Common: Delete */}
                    {onDeleteItem && (
                        <button
                            onClick={handleDeleteFromContext}
                            className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-3 text-sm font-medium text-red-600"
                        >
                            <span className="text-lg">🗑️</span>
                            삭제하기
                        </button>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

export default DraggablePreview;
