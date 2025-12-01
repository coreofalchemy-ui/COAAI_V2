import React, { useState, useRef } from 'react';
import { generateFaceBatch, upscaleFace } from '../services/geminiService';
import { SparklesIcon, DownloadIcon, Loader2Icon, MoveHorizontalIcon, CheckIcon, UploadCloudIcon } from '../components/icons';

interface ModelChapterPanelProps {
    data: any;
    onUpdate: (newData: any) => void;
}

export default function ModelChapterPanel({ data, onUpdate }: ModelChapterPanelProps) {
    // Reference Model Upload State
    const [referenceFile, setReferenceFile] = useState<File | null>(null);
    const [referencePreview, setReferencePreview] = useState<string | null>(null);

    // Face Generator State
    const [gender, setGender] = useState<'male' | 'female'>('female');
    const [race, setRace] = useState('한국인');
    const [age, setAge] = useState('23');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedFaces, setGeneratedFaces] = useState<string[]>([]);
    const [selectedFace, setSelectedFace] = useState<string | null>(null);
    const [upscaledFace, setUpscaledFace] = useState<string | null>(null);
    const [isUpscaling, setIsUpscaling] = useState(false);
    const [compareSlider, setCompareSlider] = useState(50);
    const sliderRef = useRef<HTMLDivElement>(null);

    // Handlers for Reference Upload
    const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setReferenceFile(file);
            const reader = new FileReader();
            reader.onload = (e) => setReferencePreview(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    // Handlers for Face Generator
    const handleGenerate = async () => {
        setIsGenerating(true);
        setGeneratedFaces([]);
        setSelectedFace(null);
        setUpscaledFace(null);
        try {
            const faces = await generateFaceBatch(gender, race, age);
            setGeneratedFaces(faces);
        } catch (e) {
            alert('얼굴 생성 실패: ' + e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSelectFace = async (faceUrl: string) => {
        setSelectedFace(faceUrl);
        setUpscaledFace(null);
        setIsUpscaling(true);
        try {
            const upscaled = await upscaleFace(faceUrl);
            setUpscaledFace(upscaled);
        } catch (e) {
            console.error(e);
            alert('업스케일링 실패');
        } finally {
            setIsUpscaling(false);
        }
    };

    const handleSliderMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!sliderRef.current) return;
        const rect = sliderRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        setCompareSlider((x / rect.width) * 100);
    };

    const handleUseFace = async () => {
        if (!upscaledFace) return;

        // Convert base64 to File object
        const res = await fetch(upscaledFace);
        const blob = await res.blob();
        const file = new File([blob], `generated_face_${Date.now()}.png`, { type: 'image/png' });

        // Update parent data (assuming we store model files in data.modelFiles)
        // Note: This logic depends on how DetailGeneratorApp handles model files. 
        // We might need to append to modelFiles or replace. For now, let's assume appending.
        const currentModelFiles = data.modelFiles || [];
        onUpdate({
            ...data,
            modelFiles: [...currentModelFiles, file],
            // Also update imageUrls.modelShots if needed, but usually that comes from generation.
            // If this is just a reference face for generation, maybe we store it differently?
            // The prompt implies this is "Model Chapter", so maybe it's for the model pool.
        });

        alert('모델 리스트에 추가되었습니다!');
    };

    return (
        <div className="space-y-6">
            {/* 1. Reference Model Upload */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                <h3 className="font-bold text-lg mb-3 text-purple-900 flex items-center gap-2">
                    <UploadCloudIcon className="w-5 h-5" /> 레퍼런스 모델 업로드
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                    원하는 포즈나 분위기의 모델 사진을 업로드하세요. AI가 이를 참고하여 촬영합니다.
                </p>

                <div className="relative border-2 border-dashed border-purple-300 rounded-lg p-4 hover:bg-purple-100 transition-colors text-center cursor-pointer">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleReferenceUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {referencePreview ? (
                        <div className="relative h-48 w-full">
                            <img src={referencePreview} alt="Reference" className="w-full h-full object-contain rounded" />
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    setReferenceFile(null);
                                    setReferencePreview(null);
                                }}
                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-purple-400">
                            <UploadCloudIcon className="w-12 h-12 mb-2" />
                            <span className="text-sm font-medium">클릭하여 이미지 업로드</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. AI Face Studio */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 text-white shadow-xl">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-700 pb-3">
                    <SparklesIcon className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-bold text-lg">AI Face Studio</h3>
                </div>

                {/* Controls */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as any)}
                        className="bg-gray-700 border-none rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="female">여성</option>
                        <option value="male">남성</option>
                    </select>
                    <select
                        value={race}
                        onChange={(e) => setRace(e.target.value)}
                        className="bg-gray-700 border-none rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="한국인">한국인</option>
                        <option value="백인">백인</option>
                        <option value="동아시아인">동아시아인</option>
                        <option value="혼혈">혼혈</option>
                    </select>
                    <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="나이"
                        className="bg-gray-700 border-none rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${isGenerating
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 shadow-lg hover:shadow-blue-500/30'
                        }`}
                >
                    {isGenerating ? (
                        <><Loader2Icon className="w-4 h-4 animate-spin" /> 생성 중...</>
                    ) : (
                        <><SparklesIcon className="w-4 h-4" /> 새로운 얼굴 생성하기</>
                    )}
                </button>

                {/* Generated Grid */}
                {generatedFaces.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        {generatedFaces.map((face, idx) => (
                            <div
                                key={idx}
                                onClick={() => handleSelectFace(face)}
                                className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${selectedFace === face ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-transparent hover:border-gray-500'
                                    }`}
                            >
                                <img src={face} alt={`Face ${idx}`} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Upscale & Compare */}
                {selectedFace && (
                    <div className="mt-4 pt-4 border-t border-gray-700 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                            {isUpscaling ? '4K 업스케일링 중...' : '4K 업스케일링 완료'}
                        </h4>

                        <div
                            ref={sliderRef}
                            className="relative w-full aspect-square rounded-lg overflow-hidden cursor-col-resize touch-none select-none shadow-2xl"
                            onMouseMove={!isUpscaling && upscaledFace ? handleSliderMove : undefined}
                            onTouchMove={!isUpscaling && upscaledFace ? handleSliderMove : undefined}
                        >
                            {/* Before Image (Original) */}
                            <img src={selectedFace} className="absolute inset-0 w-full h-full object-cover" alt="Original" />

                            {/* After Image (Upscaled) */}
                            {upscaledFace && (
                                <div
                                    className="absolute inset-0 w-full h-full overflow-hidden border-r-2 border-white/80 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                                    style={{ width: `${compareSlider}%` }}
                                >
                                    <img src={upscaledFace} className="absolute top-0 left-0 max-w-none h-full w-[100%] object-cover" style={{ width: sliderRef.current?.offsetWidth }} alt="Upscaled" />
                                </div>
                            )}

                            {/* Loading Overlay */}
                            {isUpscaling && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                                    <Loader2Icon className="w-8 h-8 text-blue-400 animate-spin mb-2" />
                                    <span className="text-xs font-medium text-blue-200">디테일 향상 중...</span>
                                </div>
                            )}

                            {/* Slider Handle */}
                            {upscaledFace && !isUpscaling && (
                                <div
                                    className="absolute top-0 bottom-0 w-1 bg-white/0 z-10 flex items-center justify-center pointer-events-none"
                                    style={{ left: `${compareSlider}%` }}
                                >
                                    <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center transform -translate-x-1/2">
                                        <MoveHorizontalIcon className="w-5 h-5 text-gray-800" />
                                    </div>
                                </div>
                            )}

                            {/* Labels */}
                            {upscaledFace && !isUpscaling && (
                                <>
                                    <div className="absolute top-3 left-3 bg-black/50 backdrop-blur px-2 py-1 rounded text-[10px] font-bold border border-white/10">4K UPSCALE</div>
                                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur px-2 py-1 rounded text-[10px] font-bold border border-white/10">ORIGINAL</div>
                                </>
                            )}
                        </div>

                        {/* Action Button */}
                        {upscaledFace && !isUpscaling && (
                            <button
                                onClick={handleUseFace}
                                className="w-full mt-3 bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-bold text-sm shadow-lg hover:shadow-green-500/30 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckIcon className="w-4 h-4" />
                                이 얼굴 사용하기
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
