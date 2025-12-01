import React, { useState, useRef } from 'react';
import { generateFaceBatch, upscaleFace } from '../services/geminiService';
import { SparklesIcon, DownloadIcon, Loader2Icon, MoveHorizontalIcon, CheckIcon } from './icons';

interface FaceGeneratorProps {
    onFaceSelected: (file: File, url: string) => void;
}

export const FaceGenerator: React.FC<FaceGeneratorProps> = ({ onFaceSelected }) => {
    const [gender, setGender] = useState<'male' | 'female'>('female');
    const [race, setRace] = useState<string>('한국인');
    const [age, setAge] = useState<string>('25');

    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [upscaledImage, setUpscaledImage] = useState<string | null>(null);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isUpscaling, setIsUpscaling] = useState(false);

    // Slider State
    const [sliderPosition, setSliderPosition] = useState(50);
    const imageContainerRef = useRef<HTMLDivElement>(null);

    const handleGenerateBatch = async () => {
        setIsGenerating(true);
        setGeneratedImages([]);
        setSelectedImage(null);
        setUpscaledImage(null);
        try {
            const images = await generateFaceBatch(gender, race, age);
            setGeneratedImages(images);
        } catch (error) {
            console.error(error);
            alert('얼굴 생성 중 오류가 발생했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUpscale = async () => {
        if (!selectedImage || isUpscaling) return;
        setIsUpscaling(true);
        try {
            const result = await upscaleFace(selectedImage);
            setUpscaledImage(result);
        } catch (error) {
            console.error(error);
            alert('업스케일링 중 오류가 발생했습니다.');
        } finally {
            setIsUpscaling(false);
        }
    };

    const handleSelectFinal = async () => {
        const finalUrl = upscaledImage || selectedImage;
        if (!finalUrl) return;

        try {
            const response = await fetch(finalUrl);
            const blob = await response.blob();
            const file = new File([blob], `generated-face-${Date.now()}.png`, { type: 'image/png' });
            onFaceSelected(file, finalUrl);
        } catch (e) {
            console.error(e);
        }
    };

    // Slider Logic
    const handleSliderMove = (clientX: number) => {
        if (imageContainerRef.current) {
            const { left, width } = imageContainerRef.current.getBoundingClientRect();
            const position = ((clientX - left) / width) * 100;
            setSliderPosition(Math.min(100, Math.max(0, position)));
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
            <div className="flex flex-1 min-h-0">
                {/* Left: Controls & List */}
                <div className="w-[320px] border-r border-gray-200 flex flex-col bg-gray-50">
                    <div className="p-5 space-y-4 border-b border-gray-200 bg-white">
                        <h3 className="font-bold text-lg">AI 모델 얼굴 생성</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">성별</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setGender('female')}
                                        className={`flex-1 py-2 text-sm rounded border ${gender === 'female' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300'}`}
                                    >
                                        여성
                                    </button>
                                    <button
                                        onClick={() => setGender('male')}
                                        className={`flex-1 py-2 text-sm rounded border ${gender === 'male' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300'}`}
                                    >
                                        남성
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">인종</label>
                                <select
                                    value={race}
                                    onChange={(e) => setRace(e.target.value)}
                                    className="w-full p-2 text-sm border border-gray-300 rounded bg-white"
                                >
                                    <option value="한국인">한국인</option>
                                    <option value="동아시아인">동아시아인</option>
                                    <option value="백인">백인</option>
                                    <option value="흑인">흑인</option>
                                    <option value="히스패닉">히스패닉</option>
                                    <option value="혼혈">혼혈</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">나이 ({age}세)</label>
                                <input
                                    type="range"
                                    min="18"
                                    max="60"
                                    value={age}
                                    onChange={(e) => setAge(e.target.value)}
                                    className="w-full"
                                />
                            </div>

                            <button
                                onClick={handleGenerateBatch}
                                disabled={isGenerating}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                {isGenerating ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                                {isGenerating ? '생성 중...' : '얼굴 생성하기'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-2 gap-2">
                            {generatedImages.map((url, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => { setSelectedImage(url); setUpscaledImage(null); }}
                                    className={`aspect-square rounded overflow-hidden cursor-pointer border-2 ${selectedImage === url ? 'border-blue-600 ring-2 ring-blue-100' : 'border-transparent hover:border-gray-300'}`}
                                >
                                    <img src={url} className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                        {generatedImages.length === 0 && !isGenerating && (
                            <div className="text-center text-gray-400 text-xs mt-10">
                                생성된 이미지가 없습니다.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Viewer */}
                <div className="flex-1 bg-gray-100 flex flex-col relative overflow-hidden">
                    {selectedImage ? (
                        <div className="flex-1 flex flex-col h-full">
                            <div
                                ref={imageContainerRef}
                                className={`flex-1 relative bg-gray-900 flex items-center justify-center overflow-hidden ${upscaledImage ? 'cursor-col-resize touch-none' : ''}`}
                                onMouseMove={(e) => upscaledImage && handleSliderMove(e.clientX)}
                                onTouchMove={(e) => upscaledImage && handleSliderMove(e.touches[0].clientX)}
                            >
                                {/* Original */}
                                <div className="absolute inset-0 flex items-center justify-center p-8">
                                    <img src={selectedImage} className="max-h-full max-w-full object-contain shadow-2xl" />
                                </div>

                                {/* Upscaled (Clipped) */}
                                {upscaledImage && (
                                    <div
                                        className="absolute inset-0 flex items-center justify-center p-8"
                                        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                                    >
                                        <img src={upscaledImage} className="max-h-full max-w-full object-contain shadow-2xl" />
                                    </div>
                                )}

                                {/* Slider Handle */}
                                {upscaledImage && (
                                    <div
                                        className="absolute top-0 bottom-0 w-0.5 bg-white cursor-col-resize z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                                        style={{ left: `${sliderPosition}%` }}
                                    >
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-lg text-black">
                                            <MoveHorizontalIcon className="w-4 h-4" />
                                        </div>
                                    </div>
                                )}

                                {/* Labels */}
                                {upscaledImage && (
                                    <>
                                        <div className="absolute top-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">Original</div>
                                        <div className="absolute top-4 right-4 bg-blue-600/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">Upscaled (4K)</div>
                                    </>
                                )}
                            </div>

                            <div className="p-4 bg-white border-t border-gray-200 flex justify-between items-center">
                                <div className="text-sm text-gray-500">
                                    {upscaledImage ? '슬라이더를 움직여 비교해보세요' : '선택된 이미지'}
                                </div>
                                <div className="flex gap-3">
                                    {!upscaledImage && (
                                        <button
                                            onClick={handleUpscale}
                                            disabled={isUpscaling}
                                            className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-black transition-colors text-sm font-medium flex items-center gap-2"
                                        >
                                            {isUpscaling ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                                            4K 업스케일링
                                        </button>
                                    )}
                                    <button
                                        onClick={handleSelectFinal}
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                                    >
                                        <CheckIcon className="w-4 h-4" />
                                        이 얼굴 사용하기
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-4">
                            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                                <SparklesIcon className="w-8 h-8 text-gray-400" />
                            </div>
                            <p>이미지를 생성하고 선택해주세요</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
