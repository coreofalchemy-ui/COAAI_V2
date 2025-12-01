import React, { useState } from 'react';
import StartScreen from './components/StartScreen';
import { PreviewPanel } from './components/PreviewPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import NavigationMinimap from './components/NavigationMinimap';
import { generateTextContentOnly, generateStudioImageSet, generateInitialOriginalSet, LAYOUT_TEMPLATE_HTML, regenerateImageWithSpecificPose } from './services/geminiService';
import { fileToDataUrl } from './lib/utils';
import Spinner from './components/Spinner';

export const PLACEHOLDER_ASSET = { url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 133'%3E%3Crect width='100%25' height='100%25' fill='%23eee'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' font-size='12'%3EEmpty%3C/text%3E%3C/svg%3E", generatingParams: { pose: 'placeholder' } };

export function DetailGeneratorApp() {
    const [screen, setScreen] = useState('start');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedData, setGeneratedData] = useState<any>(null);
    const [imageZoomLevels, setImageZoomLevels] = useState({});
    const [activeSection, setActiveSection] = useState('hero');

    const handleGenerate = async (pFiles: File[], mFiles: File[], mode: string) => {
        setIsLoading(true);
        try {
            const productUrls = await Promise.all(pFiles.map(fileToDataUrl));
            let modelShots = [PLACEHOLDER_ASSET], closeupShots = [PLACEHOLDER_ASSET];
            let textData = { textContent: {}, specContent: {}, heroTextContent: {}, noticeContent: {} };

            if (mode === 'frame') {
                textData = await generateTextContentOnly(pFiles);
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
                imageUrls: { products: productUrls, modelShots, closeupShots, conceptShot: PLACEHOLDER_ASSET.url },
                layoutHtml: LAYOUT_TEMPLATE_HTML,
                productFiles: pFiles,
                modelFiles: mFiles
            });
            setScreen('result');
        } catch (e) {
            alert("생성 오류: " + e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = (action: string, type: any, index: any, arg?: any) => {
        if (!generatedData) return;
        if (action === 'delete') {
            setGeneratedData((prev: any) => {
                const list = [...prev.imageUrls[type]];
                if (list.length <= 1) list[index] = PLACEHOLDER_ASSET;
                else list.splice(index, 1);
                return { ...prev, imageUrls: { ...prev.imageUrls, [type]: list } };
            });
        }
        if (action === 'duplicate') {
            setGeneratedData((prev: any) => {
                const list = [...prev.imageUrls[type]];
                list.splice(index + 1, 0, { ...list[index], generatingParams: { pose: list[index].generatingParams.pose + ' (Copy)' } });
                return { ...prev, imageUrls: { ...prev.imageUrls, [type]: list } };
            });
        }
        if (action === 'regenerate') {
            alert(`재생성: ${type}[${index}]`);
        }
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
                        <div className="w-[480px] border-r bg-white hidden md:block overflow-y-auto shadow-lg relative z-10">
                            <AdjustmentPanel
                                data={generatedData}
                                onUpdate={(newData: any) => setGeneratedData(newData)}
                            />
                        </div>
                        <div className="flex-grow h-full bg-gray-100 overflow-hidden relative flex flex-col">
                            <PreviewPanel
                                data={generatedData}
                                imageZoomLevels={imageZoomLevels}
                                onAction={handleAction}
                                onZoom={(k: string, d: string) => setImageZoomLevels((p: any) => ({ ...p, [k]: Math.max(0.5, Math.min(3, (p[k] || 1) + (d === 'in' ? 0.1 : -0.1))) }))}
                                activeSection={activeSection}
                                onSectionVisible={setActiveSection}
                            />
                        </div>

                        {/* Right Navigation Panel */}
                        <div className="hidden lg:block h-full">
                            <NavigationMinimap
                                activeSection={activeSection}
                                data={generatedData}
                                onSectionClick={(section) => {
                                    setActiveSection(section);
                                    // Find the preview panel container
                                    const previewContainer = document.querySelector('.preview-scroll-container');
                                    const element = previewContainer?.querySelector(`[data-section="${section}"]`);
                                    if (element && previewContainer) {
                                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }}
                            />
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-50 backdrop-blur-sm">
                        <Spinner />
                    </div>
                )}
            </main>
        </div>
    );
}
