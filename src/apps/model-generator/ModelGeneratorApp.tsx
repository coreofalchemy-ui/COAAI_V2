
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { synthesizeCampaignImage, refineImage, generatePoseVariation } from './services/geminiService';
import { getFriendlyErrorMessage } from './lib/utils';
import Spinner from './components/Spinner';
import { DragDropUpload } from '../../components/shared/DragDropUpload';
import { Navigation } from '../../components/shared/Navigation';
import { Trash2Icon, DownloadIcon, SparklesIcon, XIcon, StarIcon, CheckSquareIcon, FileDownIcon, ChevronRightIcon } from './components/icons';
import { FaceLibrarySelector } from './components/FaceLibrarySelector';
import { FaceGenerator } from './components/FaceGenerator';

type GeneratedModel = {
    id: string;
    url: string;
    type: 'campaign' | 'detail' | 'pose-variation';
};

const POSE_PRESETS = [
    { id: 'runway', label: '런웨이 워킹 (Runway)', prompt: 'Model walking confidently on a fashion runway, full body shot, dynamic movement.' },
    { id: 'sitting', label: '다리 꼬고 앉기 (Sitting)', prompt: 'Model sitting on a chair with legs crossed, elegant pose, looking at camera.' },
    { id: 'leaning', label: '벽에 기대기 (Leaning)', prompt: 'Model leaning casually against a wall, relaxed yet stylish posture.' },
    { id: 'low_angle', label: '로우 앵글 (Low Angle)', prompt: 'Low angle shot looking up at the model, empowering and tall stance.' },
    { id: 'back_view', label: '뒤돌아보기 (Looking Back)', prompt: 'Model standing with back to camera, looking back over shoulder, highlighting shoes.' },
    { id: 'front', label: '정면 클로즈업 (Front Full)', prompt: 'Straight on front view, symmetrical standing pose, arms at sides.' },
    { id: 'kneeling', label: '한쪽 무릎 꿇기 (Kneeling)', prompt: 'Model kneeling on one knee, fashion editorial style pose.' },
    { id: 'dynamic', label: '역동적인 점프 (Dynamic)', prompt: 'Model mid-air or in a dynamic motion pose, hair moving, energetic.' },
    { id: 'pockets', label: '주머니 손 (Hands in Pockets)', prompt: 'Model standing coolly with hands in pockets, casual chic vibe.' },
    { id: 'stroll', label: '자연스러운 걷기 (Stroll)', prompt: 'Model walking naturally on a street, candid style paparazzi shot.' },
];

export const ModelGeneratorApp: React.FC = () => {
    const [shoeFiles, setShoeFiles] = useState<File[]>([]);
    const [shoeImageUrls, setShoeImageUrls] = useState<string[]>([]);
    const [faceFile, setFaceFile] = useState<File | null>(null);
    const [faceImageUrl, setFaceImageUrl] = useState<string | null>(null);
    const [baseModelFiles, setBaseModelFiles] = useState<File[]>([]);
    const [baseModelImageUrls, setBaseModelImageUrls] = useState<string[]>([]);
    const [generatedModels, setGeneratedModels] = useState<GeneratedModel[]>([]);
    const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
    const [viewingModel, setViewingModel] = useState<GeneratedModel | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [showFaceGenerator, setShowFaceGenerator] = useState(false);

    const handleShoeSelect = (files: File[]) => {
        if (files.length === 0) return;
        setShoeFiles(prev => [...prev, ...files].slice(0, 10));
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = () => setShoeImageUrls(prev => [...prev, reader.result as string]);
            reader.readAsDataURL(file);
        });
    };

    const handleFaceSelect = (files: File[]) => {
        if (files.length === 0) return;
        const file = files[0];
        setFaceFile(file);
        const reader = new FileReader();
        reader.onload = () => setFaceImageUrl(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleFaceFromLibrary = async (imageUrl: string) => {
        try {
            // Convert data URL to File
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const file = new File([blob], 'face-library.jpg', { type: blob.type });
            setFaceFile(file);
            setFaceImageUrl(imageUrl);
        } catch (error) {
            console.error('Error setting face from library:', error);
        }
    };

    const handleModelSelect = (files: File[]) => {
        if (files.length === 0) return;
        setBaseModelFiles(prev => [...prev, ...files].slice(0, 10));
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = () => setBaseModelImageUrls(prev => [...prev, reader.result as string]);
            reader.readAsDataURL(file);
        });
    };

    const removeShoe = (index: number) => {
        setShoeFiles(prev => prev.filter((_, i) => i !== index));
        setShoeImageUrls(prev => prev.filter((_, i) => i !== index));
    };
    const removeModel = (index: number) => {
        setBaseModelFiles(prev => prev.filter((_, i) => i !== index));
        setBaseModelImageUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleGenerateCampaign = async () => {
        if (isGenerating) return;
        if (shoeFiles.length === 0 || !faceFile || baseModelFiles.length === 0) {
            setError("세 가지 요소를 모두 업로드해주세요: 신발, 얼굴, 모델");
            return;
        }
        setIsGenerating(true);
        setError(null);
        setGeneratedModels([]);
        const total = baseModelFiles.length;
        setProgress({ current: 0, total });

        try {
            for (let i = 0; i < baseModelFiles.length; i++) {
                setLoadingMessage(`${i + 1}/${total} 컷 생성 중 | 얼굴 합성 및 조명 계산...`);
                setProgress({ current: i + 1, total });
                const targetShot = baseModelFiles[i];
                const newUrl = await synthesizeCampaignImage(targetShot, faceFile, shoeFiles);
                setGeneratedModels(prev => [...prev, { id: `campaign-${Date.now()}-${i}`, url: newUrl, type: 'campaign' }]);
            }
            setLoadingMessage("최종 렌더링 완료...");
        } catch (err) {
            setError(getFriendlyErrorMessage(err, '캠페인 생성 실패'));
        } finally {
            setIsGenerating(false);
            setLoadingMessage('');
            setProgress({ current: 0, total: 0 });
        }
    };

    const handleRefine = async () => {
        if (isRefining || selectedImageIds.length === 0) {
            if (selectedImageIds.length === 0) setError("보정할 이미지를 선택해주세요.");
            return;
        }
        setIsRefining(true);
        setError(null);
        setLoadingMessage("필름 그레인 추가 및 디테일 보정 중...");
        try {
            const selectedModels = generatedModels.filter(m => selectedImageIds.includes(m.id));
            for (const model of selectedModels) {
                const refinedUrl = await refineImage(shoeFiles, model.url);
                setGeneratedModels(prev => prev.map(m => m.id === model.id ? { ...m, url: refinedUrl } : m));
            }
        } catch (err) {
            setError(getFriendlyErrorMessage(err, '보정 실패'));
        } finally {
            setIsRefining(false);
            setLoadingMessage('');
        }
    };

    const handlePoseVariation = async (pose: { id: string, label: string, prompt: string }) => {
        if (!viewingModel || !faceFile) return;
        setIsGenerating(true);
        setLoadingMessage(`'${pose.label}' 포즈로 재생성 중...`);
        try {
            const newUrl = await generatePoseVariation(viewingModel.url, faceFile, shoeFiles, pose.prompt);
            const newModel: GeneratedModel = { id: `pose-${pose.id}-${Date.now()}`, url: newUrl, type: 'pose-variation' };
            setGeneratedModels(prev => [newModel, ...prev]);
            setViewingModel(newModel);
        } catch (err) {
            setError(getFriendlyErrorMessage(err, '자세 변경 실패'));
        } finally {
            setIsGenerating(false);
            setLoadingMessage('');
        }
    };

    const downloadImage = (url: string, filename: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadSelected = () => {
        generatedModels.filter(m => selectedImageIds.includes(m.id)).forEach((model, i) => {
            setTimeout(() => downloadImage(model.url, `campaign-shot-${i}.png`), i * 200);
        });
    };

    const toggleSelection = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setSelectedImageIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const openModal = (model: GeneratedModel) => setViewingModel(model);
    const closeModal = () => setViewingModel(null);

    const isLoading = isGenerating || isRefining;
    const canGenerate = shoeFiles.length > 0 && faceFile !== null && baseModelFiles.length > 0 && !isLoading;

    return (
        <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A] font-primary">
            <Navigation />

            <div className="flex flex-col lg:flex-row h-screen pt-[60px]">
                {/* Sidebar */}
                <aside className="w-full lg:w-[400px] bg-white border-r border-[#E5E5E5] flex flex-col z-30 overflow-y-auto custom-scrollbar">
                    <div className="p-8 border-b border-[#F0F0F0]">
                        <h1 className="font-display text-2xl font-[700] mb-2">모델 생성기</h1>
                        <p className="text-sm text-[#666666]">
                            신발, 얼굴, 모델 사진을 업로드하여<br />나만의 캠페인 이미지를 생성하세요.
                        </p>
                    </div>

                    <div className="p-6 space-y-8 flex-1">
                        {/* 1. Shoe Upload */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-display text-lg font-[600]">01. 신발 제품</h2>
                                <span className="text-xs text-[#999999]">{shoeFiles.length}/10</span>
                            </div>

                            {shoeImageUrls.length > 0 ? (
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    {shoeImageUrls.map((url, i) => (
                                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden group border border-[#E5E5E5]">
                                            <img src={url} className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => removeShoe(i)}
                                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2Icon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : null}

                            <DragDropUpload
                                onFilesSelected={handleShoeSelect}
                                multiple={true}
                                label="신발 사진 업로드"
                                description="제품 누끼 또는 스튜디오 컷"
                            />
                        </section>

                        {/* 2. Face Upload */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-display text-lg font-[600]">02. 모델 얼굴</h2>
                            </div>

                            {faceImageUrl ? (
                                <div className="relative aspect-[3/4] rounded-lg overflow-hidden group border border-[#E5E5E5] mb-4 w-1/2">
                                    <img src={faceImageUrl} className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => { setFaceFile(null); setFaceImageUrl(null); }}
                                        className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2Icon className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <DragDropUpload
                                        onFilesSelected={handleFaceSelect}
                                        multiple={false}
                                        label="얼굴 사진 업로드"
                                        description="정면 고해상도 사진 권장"
                                    />

                                    <div className="mt-4 pt-4 border-t border-[#F0F0F0]">
                                        <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">AI Tools</div>
                                        <button
                                            onClick={() => setShowFaceGenerator(true)}
                                            className="w-full py-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
                                        >
                                            <SparklesIcon className="w-4 h-4" />
                                            AI 얼굴 생성기 열기
                                        </button>
                                        <div className="mt-2">
                                            <FaceLibrarySelector
                                                gender="w"
                                                onSelectFace={handleFaceFromLibrary}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </section>

                        {/* Face Generator Modal */}
                        <AnimatePresence>
                            {showFaceGenerator && (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
                                >
                                    <div className="bg-white w-full max-w-6xl h-[80vh] rounded-xl overflow-hidden shadow-2xl relative flex flex-col">
                                        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white z-10">
                                            <h2 className="font-display text-xl font-bold flex items-center gap-2">
                                                <SparklesIcon className="w-5 h-5 text-blue-600" />
                                                AI Face Studio
                                            </h2>
                                            <button
                                                onClick={() => setShowFaceGenerator(false)}
                                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                            >
                                                <XIcon className="w-6 h-6" />
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <FaceGenerator
                                                onFaceSelected={(file, url) => {
                                                    setFaceFile(file);
                                                    setFaceImageUrl(url);
                                                    setShowFaceGenerator(false);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* 3. Model Upload */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-display text-lg font-[600]">03. 모델 포즈</h2>
                                <span className="text-xs text-[#999999]">{baseModelFiles.length}/10</span>
                            </div>

                            {baseModelImageUrls.length > 0 ? (
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    {baseModelImageUrls.map((url, i) => (
                                        <div key={i} className="relative aspect-[3/4] rounded-lg overflow-hidden group border border-[#E5E5E5]">
                                            <img src={url} className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => removeModel(i)}
                                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2Icon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : null}

                            <DragDropUpload
                                onFilesSelected={handleModelSelect}
                                multiple={true}
                                label="전신 사진 업로드"
                                description="원하는 포즈의 모델 사진"
                            />
                        </section>
                    </div>

                    <div className="p-6 border-t border-[#F0F0F0] bg-white sticky bottom-0">
                        <button
                            onClick={handleGenerateCampaign}
                            disabled={!canGenerate}
                            className={`w-full py-4 rounded-lg font-display text-lg font-[600] transition-all flex items-center justify-center gap-3
                                ${canGenerate
                                    ? 'bg-black text-white hover:bg-[#333333] shadow-lg hover:shadow-xl'
                                    : 'bg-[#F0F0F0] text-[#999999] cursor-not-allowed'}`}
                        >
                            {isGenerating ? (
                                <>
                                    <Spinner />
                                    <span>생성 중...</span>
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-5 h-5" />
                                    <span>캠페인 생성 시작</span>
                                </>
                            )}
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 relative bg-[#FAFAFA] overflow-hidden flex flex-col">
                    <header className="h-20 px-8 flex items-center justify-between border-b border-[#F0F0F0] bg-white">
                        <div>
                            <h2 className="font-display text-xl font-[700]">생성 결과</h2>
                            <p className="text-xs text-[#999999] mt-1">{generatedModels.length} 장 생성됨</p>
                        </div>

                        <AnimatePresence>
                            {selectedImageIds.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex items-center gap-3"
                                >
                                    <button
                                        onClick={handleRefine}
                                        disabled={isRefining}
                                        className="px-4 py-2 bg-white border border-[#E5E5E5] text-black rounded-lg hover:bg-[#F9F9F9] transition-colors text-sm font-[600] flex items-center gap-2"
                                    >
                                        <StarIcon className="w-4 h-4" />
                                        필름 질감 보정
                                    </button>
                                    <button
                                        onClick={handleDownloadSelected}
                                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-[#333333] transition-colors text-sm font-[600] flex items-center gap-2"
                                    >
                                        <FileDownIcon className="w-4 h-4" />
                                        다운로드 ({selectedImageIds.length})
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </header>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-lg border border-red-100 flex items-center justify-between"
                                >
                                    <span className="text-sm font-medium">{error}</span>
                                    <button onClick={() => setError(null)}><XIcon className="w-4 h-4" /></button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {isLoading && generatedModels.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center">
                                <Spinner />
                                <p className="mt-6 font-display text-xl font-[600] text-black animate-pulse">{loadingMessage}</p>
                                <div className="w-64 h-1 bg-[#F0F0F0] mt-6 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-black"
                                        initial={{ width: "0%" }}
                                        animate={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ) : generatedModels.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {generatedModels.map((model) => {
                                    const isSelected = selectedImageIds.includes(model.id);
                                    return (
                                        <div key={model.id} className="group relative">
                                            <div
                                                onClick={() => openModal(model)}
                                                className={`aspect-[3/4] bg-white rounded-lg overflow-hidden cursor-pointer transition-all duration-300 relative border
                                                    ${isSelected ? 'border-black ring-1 ring-black shadow-lg' : 'border-[#E5E5E5] hover:border-[#999999] hover:shadow-md'}`}
                                            >
                                                <img src={model.url} alt="Generated" className="w-full h-full object-cover" />
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="bg-black/80 text-white text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider">
                                                        {model.type === 'pose-variation' ? '자세 변경' : '캠페인'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between px-1">
                                                <button
                                                    onClick={(e) => toggleSelection(e, model.id)}
                                                    className={`flex items-center gap-2 text-xs font-[600] transition-colors
                                                        ${isSelected ? 'text-black' : 'text-[#999999] hover:text-black'}`}
                                                >
                                                    {isSelected ? <CheckSquareIcon className="w-4 h-4" /> : <div className="w-4 h-4 border border-current rounded-sm" />}
                                                    {isSelected ? '선택됨' : '선택'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-40">
                                <div className="w-20 h-20 rounded-full bg-[#F0F0F0] flex items-center justify-center mb-6">
                                    <SparklesIcon className="w-8 h-8 text-[#999999]" />
                                </div>
                                <h3 className="font-display text-xl font-[600] text-black mb-2">스튜디오가 준비되었습니다</h3>
                                <p className="text-sm text-[#666666] text-center max-w-xs">
                                    좌측 사이드바에서 이미지를 업로드하여<br />캠페인 생성을 시작하세요.
                                </p>
                            </div>
                        )}
                    </div>
                </main>

                {/* Modal */}
                <AnimatePresence>
                    {viewingModel && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal}
                            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex"
                        >
                            <div className="flex-1 flex items-center justify-center p-8 relative">
                                <img
                                    src={viewingModel.url}
                                    alt="Detail View"
                                    onClick={(e) => e.stopPropagation()}
                                    className="max-w-full max-h-full object-contain shadow-2xl"
                                />
                                <button onClick={(e) => { e.stopPropagation(); closeModal(); }} className="absolute top-6 left-6 text-white/50 hover:text-white transition-colors">
                                    <XIcon className="w-8 h-8" />
                                </button>
                            </div>

                            <motion.div
                                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} onClick={(e) => e.stopPropagation()}
                                className="w-[360px] bg-white border-l border-[#E5E5E5] flex flex-col overflow-hidden"
                            >
                                <div className="p-6 border-b border-[#F0F0F0]">
                                    <h3 className="font-display text-xl font-[700]">자세 변경</h3>
                                    <p className="text-sm text-[#666666] mt-1">현재 모델을 유지하며 포즈만 변경합니다.</p>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                    <div className="space-y-2">
                                        {POSE_PRESETS.map((pose) => (
                                            <button
                                                key={pose.id}
                                                onClick={() => handlePoseVariation(pose)}
                                                disabled={isGenerating}
                                                className="w-full text-left p-4 rounded-lg bg-[#FAFAFA] hover:bg-[#F0F0F0] border border-transparent hover:border-[#E5E5E5] transition-all flex items-center justify-between group"
                                            >
                                                <span className="text-sm font-[500] text-[#333333]">{pose.label}</span>
                                                <ChevronRightIcon className="w-4 h-4 text-[#999999] group-hover:text-black transition-colors" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-6 border-t border-[#F0F0F0]">
                                    <button
                                        onClick={() => downloadImage(viewingModel!.url, `vfx-campaign-${viewingModel!.id}.png`)}
                                        className="w-full py-3 bg-black text-white rounded-lg font-[600] hover:bg-[#333333] transition-colors flex items-center justify-center gap-2"
                                    >
                                        <DownloadIcon className="w-4 h-4" />
                                        다운로드
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
