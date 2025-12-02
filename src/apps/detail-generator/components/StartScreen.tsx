import React, { useState } from 'react';
import { UploadCloudIcon, XIcon } from './icons';

export default function StartScreen({ onGenerate, isLoading }: any) {
    const [pFiles, setPFiles] = useState<File[]>([]);
    const [mFiles, setMFiles] = useState<File[]>([]);
    const [pPreviews, setPPreviews] = useState<string[]>([]);
    const [mPreviews, setMPreviews] = useState<string[]>([]);
    const [dragOver, setDragOver] = useState<'product' | 'model' | null>(null);

    const handleFiles = (files: FileList | null, type: 'product' | 'model') => {
        if (!files) return;
        const fileArray = Array.from(files);

        // Generate previews
        const previews: string[] = [];
        fileArray.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                previews.push(e.target?.result as string);
                if (previews.length === fileArray.length) {
                    if (type === 'product') {
                        setPFiles(prev => [...prev, ...fileArray]);
                        setPPreviews(prev => [...prev, ...previews]);
                    } else {
                        setMFiles(prev => [...prev, ...fileArray]);
                        setMPreviews(prev => [...prev, ...previews]);
                    }
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleDrop = (e: React.DragEvent, type: 'product' | 'model') => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(null);
        handleFiles(e.dataTransfer.files, type);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const removeFile = (index: number, type: 'product' | 'model') => {
        if (type === 'product') {
            setPFiles(prev => prev.filter((_, i) => i !== index));
            setPPreviews(prev => prev.filter((_, i) => i !== index));
        } else {
            setMFiles(prev => prev.filter((_, i) => i !== index));
            setMPreviews(prev => prev.filter((_, i) => i !== index));
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 md:py-12 md:px-6 space-y-8">
            <div className="text-center mb-8 md:mb-12">
                <h1 className="text-3xl md:text-6xl font-black text-gray-900 mb-4">AI 상세페이지 생성기</h1>
                <p className="text-sm md:text-xl text-gray-600">이미지 6장 병렬 생성 + 텍스트 자동 생성 + HTML 템플릿</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                {/* Product Images Drop Zone */}
                <div className="space-y-4">
                    <div
                        onDrop={(e) => handleDrop(e, 'product')}
                        onDragOver={handleDragOver}
                        onDragEnter={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOver('product');
                        }}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Only clear if we're actually leaving the drop zone
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX;
                            const y = e.clientY;
                            if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
                                setDragOver(null);
                            }
                        }}
                        className={`border-4 border-dashed rounded-3xl p-8 md:p-16 text-center transition-all cursor-pointer ${dragOver === 'product'
                            ? 'border-blue-500 bg-blue-50 scale-105'
                            : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'
                            }`}
                    >
                        <UploadCloudIcon className="w-24 h-24 mx-auto text-gray-400 mb-6" />
                        <p className="text-2xl font-bold text-gray-700 mb-3">제품 이미지 (필수)</p>
                        <p className="text-base text-gray-500 mb-6">신발, 의류 등 제품 사진<br />드래그 앤 드롭 또는 클릭하여 선택</p>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => handleFiles(e.target.files, 'product')}
                            className="hidden"
                            id="product-upload"
                        />
                        <label
                            htmlFor="product-upload"
                            className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-xl cursor-pointer transition-colors"
                        >
                            파일 선택
                        </label>
                    </div>

                    {/* Product Previews */}
                    {pPreviews.length > 0 && (
                        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">제품 이미지 ({pPreviews.length}개)</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {pPreviews.map((preview, idx) => (
                                    <div key={idx} className="relative group">
                                        <img
                                            src={preview}
                                            alt={`제품 ${idx + 1}`}
                                            className="w-full h-24 object-cover rounded-lg border border-gray-200"
                                        />
                                        <button
                                            onClick={() => removeFile(idx, 'product')}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                        >
                                            <XIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Model Images Drop Zone */}
                <div className="space-y-4">
                    <div
                        onDrop={(e) => handleDrop(e, 'model')}
                        onDragOver={handleDragOver}
                        onDragEnter={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOver('model');
                        }}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Only clear if we're actually leaving the drop zone
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX;
                            const y = e.clientY;
                            if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
                                setDragOver(null);
                            }
                        }}
                        className={`border-4 border-dashed rounded-3xl p-8 md:p-16 text-center transition-all cursor-pointer ${dragOver === 'model'
                            ? 'border-purple-500 bg-purple-50 scale-105'
                            : 'border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50/50'
                            }`}
                    >
                        <UploadCloudIcon className="w-24 h-24 mx-auto text-gray-400 mb-6" />
                        <p className="text-2xl font-bold text-gray-700 mb-3">모델 이미지</p>
                        <p className="text-base text-gray-500 mb-6">모델 착용컷 생성용<br />드래그 앤 드롭 또는 클릭하여 선택</p>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => handleFiles(e.target.files, 'model')}
                            className="hidden"
                            id="model-upload"
                        />
                        <label
                            htmlFor="model-upload"
                            className="inline-block px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white text-base font-semibold rounded-xl cursor-pointer transition-colors"
                        >
                            파일 선택
                        </label>
                    </div>

                    {/* Model Previews */}
                    {mPreviews.length > 0 && (
                        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">모델 이미지 ({mPreviews.length}개)</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {mPreviews.map((preview, idx) => (
                                    <div key={idx} className="relative group">
                                        <img
                                            src={preview}
                                            alt={`모델 ${idx + 1}`}
                                            className="w-full h-24 object-cover rounded-lg border border-gray-200"
                                        />
                                        <button
                                            onClick={() => removeFile(idx, 'model')}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                        >
                                            <XIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-6 justify-center pt-8">
                <button
                    onClick={() => onGenerate(pFiles, mFiles, 'original')}
                    disabled={isLoading || pFiles.length === 0}
                    className="px-12 py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xl font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                >
                    원본 생성
                </button>
                <button
                    onClick={() => onGenerate(pFiles, mFiles, 'studio')}
                    disabled={isLoading || pFiles.length === 0}
                    className="px-12 py-5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white text-xl font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                >
                    스튜디오 생성
                </button>
                <button
                    onClick={() => onGenerate(pFiles, mFiles, 'frame')}
                    disabled={isLoading}
                    className="px-12 py-5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-xl font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                >
                    프레임만 생성
                </button>
            </div>

            <div className="mt-12 p-8 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                <h3 className="font-bold text-blue-900 mb-4 text-xl flex items-center gap-2">
                    💡 사용 가이드
                </h3>
                <ul className="text-base text-blue-800 space-y-2">
                    <li>• <strong>원본 생성:</strong> 제품+모델 → 6장 컷 병렬 생성</li>
                    <li>• <strong>스튜디오 생성:</strong> 스튜디오 배경 → 6장 컷 생성</li>
                    <li>• <strong>프레임만 생성:</strong> HTML 템플릿 + 텍스트만 생성 (제품 이미지 선택 사항)</li>
                    <li>• <strong>드래그 앤 드롭:</strong> 파일을 직접 드래그하여 빠르게 업로드</li>
                </ul>
            </div>
        </div>
    );
}
