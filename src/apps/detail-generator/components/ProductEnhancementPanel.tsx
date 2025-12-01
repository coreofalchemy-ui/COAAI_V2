import React, { useState } from 'react';
import { ProductEffect, ProductEnhancementResult, applyProductEffect, beautifyPoses } from '../services/productEnhancement';

interface ProductEnhancementPanelProps {
    productFiles: File[];
    onResultsUpdate: (results: ProductEnhancementResult[]) => void;
}

const effects: { id: ProductEffect; name: string; emoji: string; }[] = [
    { id: 'beautify', name: '미화 (누끼)', emoji: '✨' },
    { id: 'studio_minimal_prop', name: '미니멀 소품', emoji: '🎨' },
    { id: 'studio_natural_floor', name: '자연광', emoji: '☀️' },
    { id: 'studio_texture_emphasis', name: '텍스처 강조', emoji: '🔍' },
    { id: 'studio_cinematic', name: '시네마틱', emoji: '🎬' },
];

export default function ProductEnhancementPanel({ productFiles, onResultsUpdate }: ProductEnhancementPanelProps) {
    const [selectedEffect, setSelectedEffect] = useState<ProductEffect>('beautify');
    const [results, setResults] = useState<ProductEnhancementResult[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleGenerate = async () => {
        if (productFiles.length === 0) return;

        setIsProcessing(true);
        const newResults: ProductEnhancementResult[] = [];

        if (selectedEffect === 'beautify') {
            // 미화: 6장 생성 (6가지 포즈)
            const primaryFile = productFiles[0];
            beautifyPoses.forEach(pose => {
                newResults.push({
                    id: `${primaryFile.name}-${pose.id}-${Date.now()}`,
                    originalFileName: primaryFile.name,
                    status: 'loading',
                    effect: 'beautify',
                    poseInfo: pose,
                    processingStep: '대기 중...'
                });
            });
        } else {
            // 나머지 효과: 업로드한 제품 수만큼
            productFiles.forEach(file => {
                newResults.push({
                    id: `${file.name}-${selectedEffect}-${Date.now()}`,
                    originalFileName: file.name,
                    status: 'loading',
                    effect: selectedEffect,
                    processingStep: '대기 중...'
                });
            });
        }

        setResults(newResults);
        onResultsUpdate(newResults);

        // 순차 생성
        for (const result of newResults) {
            try {
                const onProgress = (msg: string) => {
                    setResults(prev => prev.map(r =>
                        r.id === result.id ? { ...r, processingStep: msg } : r
                    ));
                };

                const filesToProcess = result.effect === 'beautify' ? productFiles : [productFiles.find(f => f.name === result.originalFileName)!];
                const url = await applyProductEffect(
                    filesToProcess,
                    result.effect,
                    onProgress,
                    result.poseInfo?.id
                );

                setResults(prev => prev.map(r =>
                    r.id === result.id ? { ...r, status: 'done', url, processingStep: '완료' } : r
                ));
            } catch (error: any) {
                setResults(prev => prev.map(r =>
                    r.id === result.id ? { ...r, status: 'error', error: error.message, processingStep: '실패' } : r
                ));
            }
        }

        setIsProcessing(false);
    };

    return (
        <div className="space-y-6">
            {/* 업로드된 제품 썸네일 */}
            <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">업로드된 제품 ({productFiles.length}장)</h3>
                <div className="grid grid-cols-3 gap-2">
                    {productFiles.map((file, i) => (
                        <div key={i} className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                            <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt={file.name} />
                        </div>
                    ))}
                </div>
            </div>

            {/* 효과 선택 */}
            <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">효과 선택</h3>
                <div className="space-y-2">
                    {effects.map(effect => (
                        <button
                            key={effect.id}
                            onClick={() => setSelectedEffect(effect.id)}
                            className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all ${selectedEffect === effect.id
                                    ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <span className="mr-2">{effect.emoji}</span>
                            {effect.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* 생성 버튼 */}
            <button
                onClick={handleGenerate}
                disabled={isProcessing || productFiles.length === 0}
                className="w-full bg-green-600 text-white font-bold py-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
                {isProcessing ? '생성 중...' : `${selectedEffect === 'beautify' ? '6장' : `${productFiles.length}장`} 생성하기`}
            </button>

            {/* 결과 미리보기 */}
            {results.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-3">생성 결과 ({results.filter(r => r.status === 'done').length}/{results.length})</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {results.map(result => (
                            <div key={result.id} className="bg-white border-2 border-gray-200 rounded-lg p-3">
                                {result.poseInfo && (
                                    <div className="text-xs font-bold text-gray-600 mb-2">{result.poseInfo.name}</div>
                                )}
                                {result.status === 'loading' && (
                                    <div className="text-sm text-blue-600">{result.processingStep}</div>
                                )}
                                {result.status === 'done' && result.url && (
                                    <img src={result.url} className="w-full rounded" alt="Result" />
                                )}
                                {result.status === 'error' && (
                                    <div className="text-sm text-red-600">오류: {result.error}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
