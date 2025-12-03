import React, { useState, useEffect, useRef } from 'react';
import StartScreen from './components/StartScreen';
import AdjustmentPanel from './components/AdjustmentPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { NavigationMinimap } from './components/NavigationMinimap';
import { generateTextContentOnly, generateInitialOriginalSet, generateStudioImageSet, LAYOUT_TEMPLATE_HTML, populateTemplate, synthesizeCampaignImage } from './services/geminiService';
import { TextElement } from './components/PreviewRenderer';
import { SimpleContextMenu } from './components/SimpleContextMenu';

// Constants
const PLACEHOLDER_ASSET = { url: 'https://via.placeholder.com/400x600?text=Waiting+for+Image', id: 'placeholder' };


// Helper
const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export default function DetailGeneratorApp() {
    const [screen, setScreen] = useState<'start' | 'result'>('start');
    const [isLoading, setLoading] = useState(false);
    const [generatedData, setGeneratedData] = useState<any>(null);
    const [imageZoomLevels, setImageZoomLevels] = useState<any>({});
    const [activeSection, setActiveSection] = useState<string>('hero');
    const [sectionOrder, setSectionOrder] = useState(['hero']);
    const [showAIAnalysis, setShowAIAnalysis] = useState(true);
    // SubHero states removed

    // Text Elements State (Lifted from PreviewPanel)
    const [textElements, setTextElements] = useState<TextElement[]>([]);

    const handleAddTextElement = (newText: TextElement) => {
        setTextElements(prev => [...prev, newText]);
    };

    const handleUpdateTextElement = (textId: string, property: keyof TextElement, value: any) => {
        setTextElements(prev => prev.map(text =>
            text.id === textId ? { ...text, [property]: value } : text
        ));
    };

    const handleDeleteTextElement = (textId: string) => {
        setTextElements(prev => prev.filter(t => t.id !== textId));
    };

    const handleUpdateAllTextElements = (newElements: TextElement[]) => {
        setTextElements(newElements);
    };

    // Responsive Preview State
    const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop' | 'responsive'>('desktop');
    const [previewWidth, setPreviewWidth] = useState<string>('100%');
    const previewRef = useRef<HTMLDivElement>(null);
    const [previewHtml, setPreviewHtml] = useState<string>('');

    useEffect(() => {
        console.log('Section Order Updated:', sectionOrder);
    }, [sectionOrder]);

    // Generate HTML for Minimap Thumbnail
    useEffect(() => {
        if (generatedData && generatedData.layoutHtml) {
            try {
                const html = populateTemplate(
                    generatedData,
                    generatedData.imageUrls,
                    { heroBrandName: 48, slogan: 20 },
                    {},
                    generatedData.layoutHtml,
                    imageZoomLevels || {},
                    sectionOrder || ['hero'],
                    showAIAnalysis
                );

                // Inject styles
                const styleBlock = `
                    <style>
                        @import url('https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/css/SpoqaHanSansNeo.css');
                        img { max-width: 100%; }
                        body { margin: 0; padding: 0; overflow-x: hidden; }
                    </style>
                `;
                setPreviewHtml(styleBlock + html);
            } catch (e) {
                console.error('Error generating HTML for minimap:', e);
            }
        }
    }, [generatedData, sectionOrder, showAIAnalysis, imageZoomLevels]);

    const handleDeviceChange = (device: 'mobile' | 'tablet' | 'desktop' | 'responsive') => {
        setPreviewDevice(device);
        if (device === 'mobile') setPreviewWidth('640px');
        else if (device === 'tablet') setPreviewWidth('768px');
        else if (device === 'desktop') setPreviewWidth('100%');
        else setPreviewWidth('100%');
    };

    const [sectionHeights, setSectionHeights] = useState<{ [key: string]: number }>({});

    const handleAddSection = () => {
        const newSectionId = `custom-${Date.now()}`;
        setSectionOrder(prev => [...prev, newSectionId]);
        setGeneratedData((prev: any) => ({
            ...prev,
            imageUrls: {
                ...prev.imageUrls,
                [newSectionId]: PLACEHOLDER_ASSET.url
            }
        }));
    };

    const handleAddSpacerSection = () => {
        const newSectionId = `spacer-${Date.now()}`;
        // Insert after hero
        setSectionOrder(prev => {
            const newOrder = [...prev];
            const heroIndex = newOrder.indexOf('hero');
            if (heroIndex !== -1) {
                newOrder.splice(heroIndex + 1, 0, newSectionId);
            } else {
                newOrder.push(newSectionId);
            }
            return newOrder;
        });
        setSectionHeights(prev => ({ ...prev, [newSectionId]: 100 })); // Default 100px
        setGeneratedData((prev: any) => ({
            ...prev,
            imageUrls: {
                ...prev.imageUrls,
                [newSectionId]: '' // Empty for spacer
            }
        }));
    };

    const handleUpdateSectionHeight = (sectionId: string, height: number) => {
        setSectionHeights(prev => ({ ...prev, [sectionId]: height }));
    };

    // Image Transform State (Scale, X, Y)
    const [imageTransforms, setImageTransforms] = useState<{ [key: string]: { scale: number, x: number, y: number } }>({});

    const handleUpdateImageTransform = (sectionId: string, transform: { scale: number, x: number, y: number }) => {
        setImageTransforms(prev => ({
            ...prev,
            [sectionId]: transform
        }));
    };

    // Model Hold State
    const [heldSections, setHeldSections] = useState<Set<string>>(new Set());

    const handleToggleHold = (sectionId: string) => {
        setHeldSections(prev => {
            const next = new Set(prev);
            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }
            return next;
        });
    };

    // AI Composite Image Handler
    const handleCompositeImage = async (sectionId: string, droppedFile: File) => {
        console.log('Composite Image:', sectionId, droppedFile);

        // 1. Get Base Image URL (from current section)
        const baseImageUrl = generatedData.imageUrls[sectionId];
        if (!baseImageUrl) {
            alert("베이스 이미지가 없습니다.");
            return;
        }

        setLoading(true);
        try {
            // 2. Convert Dropped File to Data URL
            const referenceImageUrl = await fileToDataUrl(droppedFile);

            // 3. Call Gemini Service
            const compositeImageUrl = await synthesizeCampaignImage(baseImageUrl, referenceImageUrl);

            // 4. Update Section with New Image
            handleAction('updateImage', sectionId, 0, compositeImageUrl);

            // Optional: Notify success
            // alert("AI 합성이 완료되었습니다.");
        } catch (e) {
            console.error(e);
            alert("합성 오류: " + e);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (pFiles: File[], mFiles: File[], mode: string) => {
        setLoading(true);
        try {
            let productUrls: string[] = [];
            // Text data structure
            let textData = {
                textContent: {},
                specContent: {},
                heroTextContent: {
                    productName: 'Sample Product',
                    brandLine: 'BRAND NAME',
                    subName: 'Color / Model',
                    stylingMatch: '스타일링 매치 설명이 들어갑니다.',
                    craftsmanship: '제작 공정 및 소재 설명이 들어갑니다.',
                    technology: '핵심 기술 설명이 들어갑니다.'
                },
                noticeContent: {}
            };

            // Process images if any (just to have them available if needed, though we are simplifying)
            if (pFiles.length > 0) {
                productUrls = await Promise.all(pFiles.map(fileToDataUrl));
            }

            // Initial section order - ONLY HERO
            const initialSections = ['hero'];

            setGeneratedData({
                ...textData,
                imageUrls: {
                    // Only keep necessary placeholders or empty arrays
                    products: [],
                    modelShots: [],
                    closeupShots: [],
                    // Custom sections will be added dynamically
                },
                layoutHtml: LAYOUT_TEMPLATE_HTML,
                productFiles: pFiles,
                modelFiles: mFiles,
                sectionOrder: initialSections
            });
            setScreen('result');
            setSectionOrder(initialSections);
        } catch (e) {
            alert("생성 오류: " + e);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = (action: string, type: any, index: any, arg?: any) => {
        if (action === 'updateImage') {
            const sectionKey = type;
            const newUrl = arg;

            setGeneratedData((prev: any) => {
                const newData = { ...prev };
                const targetSection = newData.imageUrls[sectionKey];

                if (Array.isArray(targetSection)) {
                    // Handle array-based sections (products, modelShots, closeupShots)
                    const newArray = [...targetSection];
                    if (typeof newArray[index] === 'string') {
                        newArray[index] = newUrl;
                    } else {
                        newArray[index] = { ...newArray[index], url: newUrl };
                    }
                    newData.imageUrls[sectionKey] = newArray;
                } else {
                    // Handle single string sections (hero, custom sections)
                    newData.imageUrls[sectionKey] = newUrl;
                }
                return newData;
            });
        }
        console.log('Action:', action, type, index, arg);
    };

    // Responsive Auto-Scale Logic
    const middlePanelRef = React.useRef<HTMLDivElement>(null);
    const [autoScale, setAutoScale] = useState(1);

    useEffect(() => {
        if (previewDevice === 'desktop' || previewDevice === 'responsive') {
            const updateScale = () => {
                if (middlePanelRef.current) {
                    const containerWidth = middlePanelRef.current.clientWidth;
                    const contentWidth = 1000; // Fixed content width
                    const padding = 40;
                    const availableWidth = containerWidth - padding;

                    if (availableWidth < contentWidth) {
                        setAutoScale(availableWidth / contentWidth);
                    } else {
                        setAutoScale(1);
                    }
                }
            };

            window.addEventListener('resize', updateScale);
            updateScale(); // Initial call

            // Observer for container resize
            const observer = new ResizeObserver(updateScale);
            if (middlePanelRef.current) observer.observe(middlePanelRef.current);

            return () => {
                window.removeEventListener('resize', updateScale);
                observer.disconnect();
            };
        } else {
            setAutoScale(1);
        }
    }, [previewDevice]);

    const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, targetId: string | null }>({ visible: false, x: 0, y: 0, targetId: null });
    const [isProcessing, setIsProcessing] = useState(false);



    const handleDeleteSection = (sectionId: string) => {
        if (confirm('정말 이 섹션을 삭제하시겠습니까?')) {
            setSectionOrder(prev => prev.filter(id => id !== sectionId));
            // Optional: Cleanup data associated with the section
            setGeneratedData(prev => {
                const newData = { ...prev };
                if (newData.imageUrls) {
                    delete newData.imageUrls[sectionId];
                }
                return newData;
            });
        }
    };

    return (
        <div
            className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans pt-[60px]"
            onClick={() => setContextMenu({ visible: false, x: 0, y: 0, targetId: null })}
        >
            <div className="h-16 bg-white border-b flex items-center justify-between px-8 shadow-sm relative z-50">
                <div className="flex items-center gap-4">
                    <button onClick={() => setScreen('start')} className="text-2xl font-black text-gray-900">📄 AI 상세페이지 생성기</button>
                    {screen === 'result' && (
                        <div className="flex gap-2 ml-6">
                            <button className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">저장</button>
                            <button className="px-4 py-2 bg-gray-600 text-white text-sm font-semibold rounded-lg hover:bg-gray-700">HTML 다운로드</button>
                        </div>
                    )}
                </div>
            </div>

            <main className="flex-grow overflow-hidden relative">
                {screen === 'start' && (
                    <div className="h-full overflow-y-auto p-4">
                        <StartScreen onGenerate={handleGenerate} isLoading={isLoading} />
                    </div>
                )}

                {screen === 'result' && generatedData && (
                    <div className="flex h-full">
                        {/* Left Panel Wrapper */}
                        <div className="w-[420px] border-r bg-white hidden md:flex flex-col relative z-10 flex-shrink-0 h-full shadow-xl">
                            <div className="flex-grow overflow-y-auto custom-scrollbar">
                                <AdjustmentPanel
                                    data={generatedData}
                                    onUpdate={(newData: any) => setGeneratedData(newData)}
                                    showAIAnalysis={showAIAnalysis}
                                    onToggleAIAnalysis={() => setShowAIAnalysis(prev => !prev)}
                                    activeSection={activeSection}
                                    textElements={textElements}
                                    onAddTextElement={handleAddTextElement}
                                    onUpdateTextElement={handleUpdateTextElement}
                                    onDeleteTextElement={handleDeleteTextElement}
                                    onAddSpacerSection={handleAddSpacerSection}
                                />
                            </div>
                        </div>

                        {/* Middle Panel */}
                        <div ref={middlePanelRef} className="flex-grow h-full bg-gray-100 overflow-hidden relative flex flex-col">
                            {/* Responsive Toolbar */}
                            <div className="h-12 bg-white border-b flex items-center justify-center gap-4 px-4 shadow-sm z-20">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Preview Mode:</span>
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                    <button
                                        onClick={() => handleDeviceChange('mobile')}
                                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${previewDevice === 'mobile' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                    >
                                        📱 Mobile L (640px)
                                    </button>
                                    <button
                                        onClick={() => handleDeviceChange('tablet')}
                                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${previewDevice === 'tablet' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                    >
                                        Tablet (768px)
                                    </button>
                                    <button
                                        onClick={() => handleDeviceChange('desktop')}
                                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${previewDevice === 'desktop' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                    >
                                        💻 Desktop (Full)
                                    </button>
                                </div>
                                {previewDevice === 'responsive' && (
                                    <div className="flex items-center gap-2 border-l pl-4 ml-2">
                                        <span className="text-xs text-gray-500">Width:</span>
                                        <input
                                            type="text"
                                            value={previewWidth}
                                            onChange={(e) => setPreviewWidth(e.target.value)}
                                            className="w-20 border rounded px-2 py-1 text-xs text-center"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Preview Area */}
                            <div
                                className={`flex-grow flex justify-center overflow-y-auto bg-gray-100 p-8 custom-scrollbar`}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            >
                                <div
                                    className={`bg-white transition-all duration-300 ease-in-out origin-top ${previewDevice === 'desktop' ? 'shadow-lg my-8' : 'shadow-2xl'}`}
                                    style={{
                                        width: '1000px', // Always fixed base width
                                        minHeight: '100%',
                                        transform: `scale(${previewWidth === '100%' ? autoScale : parseInt(previewWidth) / 1000})`,
                                        transformOrigin: 'top center',
                                    }}
                                >
                                    <PreviewPanel
                                        ref={previewRef}
                                        data={generatedData}
                                        imageZoomLevels={imageZoomLevels}
                                        onAction={handleAction}
                                        onZoom={(k: string, d: string) => setImageZoomLevels((p: any) => ({ ...p, [k]: Math.max(0.5, Math.min(3, (p[k] || 1) + (d === 'in' ? 0.1 : -0.1))) }))}
                                        activeSection={activeSection}
                                        onSectionVisible={setActiveSection}
                                        sectionOrder={sectionOrder}
                                        showAIAnalysis={showAIAnalysis}
                                        onHtmlUpdate={setPreviewHtml}
                                        textElements={textElements}
                                        onAddTextElement={handleAddTextElement}
                                        onUpdateTextElement={handleUpdateTextElement}
                                        onDeleteTextElement={handleDeleteTextElement}
                                        onUpdateAllTextElements={handleUpdateAllTextElements}
                                        onContextMenu={(e, type, index, section) => {
                                            // Handle custom context menu in PreviewPanel directly
                                        }}
                                        lockedImages={new Set()}
                                        sectionHeights={sectionHeights}
                                        onUpdateSectionHeight={handleUpdateSectionHeight}
                                        imageTransforms={imageTransforms}
                                        onUpdateImageTransform={handleUpdateImageTransform}
                                        onDeleteSection={handleDeleteSection}
                                        heldSections={heldSections}
                                        onToggleHold={handleToggleHold}
                                        onCompositeImage={handleCompositeImage}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Panel (Mini Map) - Now with drag to reorder */}
                        <div className="w-[100px] border-l bg-white hidden lg:flex flex-col relative z-10 flex-shrink-0 h-full">
                            <NavigationMinimap
                                activeSection={activeSection}
                                onSectionClick={(section) => {
                                    const el = document.querySelector(`[data-section="${section}"]`);
                                    el?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                data={generatedData}
                                sectionOrder={sectionOrder}
                                onReorder={(newOrder) => {
                                    console.log('New minimap order:', newOrder);
                                    setSectionOrder(newOrder);
                                    // Also update in generatedData if needed
                                    setGeneratedData((prev: any) => ({
                                        ...prev,
                                        sectionOrder: newOrder
                                    }));
                                }}
                                onAddSection={handleAddSection}
                                previewRef={previewRef}
                                previewHtml={previewHtml}
                                textElements={textElements}
                                onAction={handleAction}
                            />
                        </div>
                    </div>
                )}
            </main>

            {/* Simple Context Menu */}
            <SimpleContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                visible={contextMenu.visible}
                onDelete={() => {
                    if (!contextMenu.targetId) return;
                    // Fix parsing for sections with hyphens (e.g. custom-123-0)
                    const lastDashIndex = contextMenu.targetId.lastIndexOf('-');
                    const section = contextMenu.targetId.substring(0, lastDashIndex);
                    const indexStr = contextMenu.targetId.substring(lastDashIndex + 1);
                    const index = parseInt(indexStr);

                    setGeneratedData((prev: any) => {
                        const newData = { ...prev };
                        if (section === 'products' && newData.imageUrls.products) {
                            newData.imageUrls.products = newData.imageUrls.products.filter((_: any, i: number) => i !== index);
                        } else if (section === 'modelShots' && newData.imageUrls.modelShots) {
                            newData.imageUrls.modelShots = newData.imageUrls.modelShots.filter((_: any, i: number) => i !== index);
                        } else if (section === 'closeupShots' && newData.imageUrls.closeupShots) {
                            newData.imageUrls.closeupShots = newData.imageUrls.closeupShots.filter((_: any, i: number) => i !== index);
                        } else if (section.startsWith('custom-')) {
                            // Delete custom section
                            delete newData.imageUrls[section];
                            setSectionOrder(prevOrder => prevOrder.filter(s => s !== section));
                        }
                        return newData;
                    });
                    setContextMenu({ visible: false, x: 0, y: 0, targetId: null });
                }}
            />

            {/* Loading Overlay */}
            {isProcessing && (
                <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mb-4"></div>
                        <p className="text-lg font-bold text-gray-800">AI 신발 합성 중...</p>
                        <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
