import React, { useState, useEffect } from 'react';
import StartScreen from './components/StartScreen';
import AdjustmentPanel from './components/AdjustmentPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { NavigationMinimap } from './components/NavigationMinimap';
import { generateTextContentOnly, generateInitialOriginalSet, generateStudioImageSet, LAYOUT_TEMPLATE_HTML } from './services/geminiService';

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
    const [sectionOrder, setSectionOrder] = useState(['hero', 'products', 'models', 'closeups']);
    const [showAIAnalysis, setShowAIAnalysis] = useState(true);
    const [showSubHero1, setShowSubHero1] = useState(false);
    const [showSubHero2, setShowSubHero2] = useState(false);

    // Responsive Preview State
    const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop' | 'responsive'>('desktop');
    const [previewWidth, setPreviewWidth] = useState<string>('100%');

    useEffect(() => {
        console.log('Section Order Updated:', sectionOrder);
    }, [sectionOrder]);

    const handleDeviceChange = (device: 'mobile' | 'tablet' | 'desktop' | 'responsive') => {
        setPreviewDevice(device);
        if (device === 'mobile') setPreviewWidth('640px');
        else if (device === 'tablet') setPreviewWidth('768px');
        else if (device === 'desktop') setPreviewWidth('100%');
        else setPreviewWidth('100%');
    };

    const handleGenerate = async (pFiles: File[], mFiles: File[], mode: string) => {
        setLoading(true);
        try {
            const productUrls = await Promise.all(pFiles.map(fileToDataUrl));
            let modelShots = [PLACEHOLDER_ASSET], closeupShots = [PLACEHOLDER_ASSET];
            let textData = { textContent: {}, specContent: {}, heroTextContent: {}, noticeContent: {} };

            if (mode === 'frame') {
                if (pFiles.length === 0) {
                    // Skip AI if no images, use default placeholders
                    textData = {
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
                } else {
                    textData = await generateTextContentOnly(pFiles);
                }
            } else {
                const textPromise = generateTextContentOnly(pFiles);
                const imgPromise = mode === 'studio' ? generateStudioImageSet(pFiles, mFiles) : generateInitialOriginalSet(pFiles, mFiles);
                const [txt, img] = await Promise.all([textPromise, imgPromise]);
                textData = txt;
                modelShots = img.modelShots;
                closeupShots = img.closeupShots;
            }

            setGeneratedData({
                ...textData,
                imageUrls: {
                    products: productUrls,
                    modelShots,
                    closeupShots,
                    conceptShot: PLACEHOLDER_ASSET.url,
                    subHero1: PLACEHOLDER_ASSET.url,
                    subHero2: PLACEHOLDER_ASSET.url
                },
                layoutHtml: LAYOUT_TEMPLATE_HTML,
                productFiles: pFiles,
                modelFiles: mFiles,
                sectionOrder // Store initial order
            });
            setScreen('result');
        } catch (e) {
            alert("생성 오류: " + e);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = (action: string, type: any, index: any, arg?: any) => {
        // Implement action handling if needed
        console.log('Action:', action, type, index, arg);
    };



    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans pt-[60px]">
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
                                    showSubHero1={showSubHero1}
                                    onToggleSubHero1={() => setShowSubHero1(prev => !prev)}
                                    showSubHero2={showSubHero2}
                                    onToggleSubHero2={() => setShowSubHero2(prev => !prev)}
                                />
                            </div>
                        </div>

                        {/* Middle Panel */}
                        <div className="flex-grow h-full bg-gray-100 overflow-hidden relative flex flex-col">
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
                            <div className={`flex-grow flex justify-center overflow-hidden ${previewDevice === 'desktop' ? 'bg-white' : 'bg-gray-50 p-8'}`}>
                                <div
                                    className={`bg-white transition-all duration-300 ease-in-out origin-top ${previewDevice === 'desktop' ? '' : 'shadow-2xl'}`}
                                    style={{
                                        width: previewWidth === '100%' ? '100%' : '1000px', // Keep 1000px width for scaling
                                        minHeight: '100%',
                                        maxWidth: previewDevice === 'desktop' ? '100%' : undefined,
                                        zoom: previewWidth === '100%' ? 1 : parseInt(previewWidth) / 1000 // Scale down
                                    }}
                                >
                                    <PreviewPanel
                                        data={generatedData}
                                        imageZoomLevels={imageZoomLevels}
                                        onAction={handleAction}
                                        onZoom={(k: string, d: string) => setImageZoomLevels((p: any) => ({ ...p, [k]: Math.max(0.5, Math.min(3, (p[k] || 1) + (d === 'in' ? 0.1 : -0.1))) }))}
                                        activeSection={activeSection}
                                        onSectionVisible={setActiveSection}
                                        sectionOrder={sectionOrder}
                                        showAIAnalysis={showAIAnalysis}
                                        showSubHero1={showSubHero1}
                                        showSubHero2={showSubHero2}
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
                            />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
