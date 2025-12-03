import React, { useState } from 'react';
import { generateAICopywriting } from '../services/geminiAICopywriter';
import ModelChapterPanel from './ModelChapterPanel';
import ProductEnhancementPanel from './ProductEnhancementPanel';
import { TextElement } from './PreviewRenderer';

interface AdjustmentPanelProps {
    data: any;
    onUpdate: (newData: any) => void;
    showAIAnalysis?: boolean;
    onToggleAIAnalysis?: () => void;
    onAddSection?: () => void;
    activeSection?: string;
    textElements?: TextElement[];
    onAddTextElement?: (text: TextElement) => void;
    onUpdateTextElement?: (id: string, prop: keyof TextElement, value: any) => void;
    onDeleteTextElement?: (id: string) => void;
    onAddSpacerSection?: () => void;
}

type Section = 'hero' | 'products' | 'models' | 'closeup';

const generateStandaloneHeroHTML = (data: any): string => {
    const content = data.heroTextContent || {};
    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.productName || '제품'} - ${content.brandLine || '브랜드'}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Noto Sans KR', sans-serif; line-height: 1.6; color: #333; }
        .hero-section { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
        .brand { font-size: 12px; letter-spacing: 2px; color: #666; }
        .product-name { font-size: 48px; font-weight: bold; margin: 10px 0; }
        .sub-name { font-size: 24px; color: #666; }
        .styling-match { margin: 30px 0; padding: 20px; background: #f5f5f5; border-radius: 8px; }
        .craftsmanship { margin: 20px 0; padding: 20px; background: #e8f4f8; border-radius: 8px; }
        .technology { margin: 20px 0; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; }
       .product-spec { margin: 30px 0; }
        .spec-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px; }
        .spec-item { padding: 15px; background: white; border: 1px solid #ddd; border-radius: 4px; }
        .spec-label { font-size: 12px; color: #888; text-transform: uppercase; }
        .spec-value { font-size: 16px; font-weight: 600; margin-top: 5px; }
        .size-guide { margin: 30px 0; padding: 20px; background: #ffebee; border-radius: 8px; white-space: pre-line; }
    </style>
</head>
<body>
    <div class="hero-section">
        <div class="brand">${content.brandLine || 'HERITAGE'}</div>
        <h1 class="product-name">${content.productName || 'PRODUCT NAME'}</h1>
        <h2 class="sub-name">${content.subName || 'Subtitle'}</h2>
        
        <div class="styling-match">
            <strong>룩 & 매칭:</strong>
            <p>${content.stylingMatch || '스타일링 정보'}</p>
        </div>
        
        <div class="craftsmanship">
            <strong>제작 & 소재:</strong>
            <p>${content.craftsmanship || '제작 정보'}</p>
        </div>
        
        ${content.technology ? `<div class="technology"><strong>Technology:</strong> ${content.technology}</div>` : ''}
        
        <div class="product-spec">
            <h3>PRODUCT SPEC</h3>
            <div class="spec-grid">
                <div class="spec-item"><div class="spec-label">Color</div><div class="spec-value">${content.specColor || 'Black'}</div></div>
                <div class="spec-item"><div class="spec-label">Upper</div><div class="spec-value">${content.specUpper || 'Suede'}</div></div>
                <div class="spec-item"><div class="spec-label">Lining</div><div class="spec-value">${content.specLining || 'Textile'}</div></div>
                <div class="spec-item"><div class="spec-label">Outsole</div><div class="spec-value">${content.specOutsole || 'Rubber'}</div></div>
                <div class="spec-item"><div class="spec-label">Origin</div><div class="spec-value">${content.specOrigin || 'Made in KOREA'}</div></div>
                <div class="spec-item"><div class="spec-label">굽 높이</div><div class="spec-value">${content.heelHeight || '3.5cm'}</div></div>
            </div>
        </div>
        
        ${content.sizeGuide ? `<div class="size-guide"><strong>SIZE GUIDE</strong><br>${content.sizeGuide}</div>` : ''}
    </div>
</body>
</html>`;
};

export default function AdjustmentPanel({
    data,
    onUpdate,
    showAIAnalysis,
    onToggleAIAnalysis,
    onAddSection,
    activeSection: previewActiveSection,
    textElements = [],
    onAddTextElement,
    onUpdateTextElement,
    onDeleteTextElement,
    onAddSpacerSection
}: AdjustmentPanelProps) {
    const [activeSection, setActiveSection] = useState<Section>('hero');
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

    const updateHeroContent = (field: string, value: string) => {
        onUpdate({
            ...data,
            heroTextContent: {
                ...data.heroTextContent,
                [field]: value
            }
        });
    };

    const handleAIAnalysis = async () => {
        setIsGeneratingAI(true);
        try {
            const productImage = data.imageUrls?.products?.[0];
            if (!productImage) {
                alert('제품 이미지가 없습니다.');
                return;
            }
            const aiCopy = await generateAICopywriting(productImage);
            onUpdate({
                ...data,
                heroTextContent: {
                    ...data.heroTextContent,
                    ...aiCopy
                }
            });
        } catch (error) {
            console.error('AI 분석 실패:', error);
            alert('AI 분석에 실패했습니다.');
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleAddText = () => {
        if (!onAddTextElement) return;
        const newText: TextElement = {
            id: `text-${Date.now()}`,
            sectionId: previewActiveSection || 'hero',
            content: '텍스트를 입력하세요',
            top: 50,
            left: 50,
            width: 200,
            height: 50,
            fontSize: 16,
            fontFamily: 'Noto Sans KR',
            color: '#000000',
            fontWeight: 'normal',
            textAlign: 'left'
        };
        onAddTextElement(newText);
        setSelectedTextId(newText.id);
    };

    const selectedText = textElements.find(t => t.id === selectedTextId);

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
                <h2 className="text-lg font-bold">콘텐츠 편집 패널</h2>
            </div>

            {/* Navigation */}
            <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50">
                <nav className="grid grid-cols-4 gap-1 p-2">
                    {[
                        { id: 'hero' as Section, label: '히어로', emoji: '🎯' },
                        { id: 'products' as Section, label: '제품', emoji: '📦' },
                        { id: 'models' as Section, label: '모델', emoji: '👔' },
                        { id: 'closeup' as Section, label: '디테일', emoji: '🔍' },
                    ].map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeSection === section.id
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <div>{section.emoji}</div>
                            <div>{section.label}</div>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-grow overflow-y-auto p-4">
                {/* Hero Section */}
                {activeSection === 'hero' && (
                    <div className="space-y-4">
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-blue-900">🎯 히어로 섹션</h3>
                                <button
                                    onClick={handleAIAnalysis}
                                    disabled={isGeneratingAI}
                                    className={`px-3 py-1.5 text-white text-xs font-bold rounded transition-colors ${isGeneratingAI ? 'bg-gray-400 cursor-not-allowed' : 'bg-zinc-800 hover:bg-black'
                                        }`}
                                >
                                    {isGeneratingAI ? '분석 중...' : '🔄 AI 재분석'}
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">브랜드/라인명</label>
                                    <input
                                        className="w-full border p-2 rounded text-sm"
                                        value={data.heroTextContent?.brandLine || ''}
                                        onChange={(e) => updateHeroContent('brandLine', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">제품명</label>
                                        <input
                                            className="w-full border p-2 rounded text-sm"
                                            value={data.heroTextContent?.productName || ''}
                                            onChange={(e) => updateHeroContent('productName', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">서브네임</label>
                                        <input
                                            className="w-full border p-2 rounded text-sm"
                                            value={data.heroTextContent?.subName || ''}
                                            onChange={(e) => updateHeroContent('subName', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">룩/매칭 정보</label>
                                    <textarea
                                        rows={2}
                                        className="w-full border p-2 rounded text-sm resize-none"
                                        value={data.heroTextContent?.stylingMatch || ''}
                                        onChange={(e) => updateHeroContent('stylingMatch', e.target.value)}
                                        placeholder="어떤 룩/바지/자켓과 매칭, 색상, 굽 높이..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">제작/소재 정보</label>
                                    <textarea
                                        rows={2}
                                        className="w-full border p-2 rounded text-sm resize-none"
                                        value={data.heroTextContent?.craftsmanship || ''}
                                        onChange={(e) => updateHeroContent('craftsmanship', e.target.value)}
                                        placeholder="제작 방식, 소재, 기능, 아웃솔, 접지력..."
                                    />
                                </div>

                                {/* Technology */}
                                <div className="pt-3 mt-3 border-t border-blue-300">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">⚙️ 테크놀로지</label>
                                    <input
                                        className="w-full border p-2 rounded text-sm"
                                        value={data.heroTextContent?.technology || '오쏘라이트 인솔'}
                                        onChange={(e) => updateHeroContent('technology', e.target.value)}
                                        placeholder="예: 오쏘라이트 인솔"
                                    />
                                </div>

                                {/* Product Spec */}
                                <div className="pt-3 mt-3 border-t border-blue-300">
                                    <label className="block text-xs font-bold text-gray-700 mb-2">📋 Product Spec</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-gray-600">Color</label>
                                            <input
                                                className="w-full border p-1.5 rounded text-xs"
                                                value={data.heroTextContent?.specColor || 'Matte Black'}
                                                onChange={(e) => updateHeroContent('specColor', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-600">Upper</label>
                                            <input
                                                className="w-full border p-1.5 rounded text-xs"
                                                value={data.heroTextContent?.specUpper || 'Suede'}
                                                onChange={(e) => updateHeroContent('specUpper', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-600">Lining</label>
                                            <input
                                                className="w-full border p-1.5 rounded text-xs"
                                                value={data.heroTextContent?.specLining || 'Textile'}
                                                onChange={(e) => updateHeroContent('specLining', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-600">Outsole</label>
                                            <input
                                                className="w-full border p-1.5 rounded text-xs"
                                                value={data.heroTextContent?.specOutsole || 'Rubber'}
                                                onChange={(e) => updateHeroContent('specOutsole', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-600">Origin</label>
                                            <input
                                                className="w-full border p-1.5 rounded text-xs"
                                                value={data.heroTextContent?.specOrigin || 'Made in KOREA'}
                                                onChange={(e) => updateHeroContent('specOrigin', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-600">굽 높이</label>
                                            <input
                                                className="w-full border p-1.5 rounded text-xs"
                                                value={data.heroTextContent?.heelHeight || '3.5cm'}
                                                onChange={(e) => updateHeroContent('heelHeight', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Size Guide */}
                                <div className="pt-3 mt-3 border-t border-blue-300">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">📏 사이즈 가이드</label>
                                    <textarea
                                        rows={3}
                                        className="w-full border p-2 rounded text-sm resize-none"
                                        value={data.heroTextContent?.sizeGuide || ''}
                                        onChange={(e) => updateHeroContent('sizeGuide', e.target.value)}
                                        placeholder="사이즈 추천 안내..."
                                    />
                                </div>

                                {/* HTML Download Button */}
                                <div className="pt-3 mt-3 border-t border-blue-300">
                                    <button
                                        onClick={() => {
                                            const heroHtml = generateStandaloneHeroHTML(data);
                                            const blob = new Blob([heroHtml], { type: 'text/html' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `${data.heroTextContent?.productName || 'hero'}_section.html`;
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        }}
                                        className="w-full bg-green-600 text-white font-bold py-2 rounded hover:bg-green-700"
                                    >
                                        📥 히어로 섹션 HTML 다운로드
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Products Section */}
                {activeSection === 'products' && (
                    <div className="space-y-4">
                        <ProductEnhancementPanel
                            productFiles={data.productFiles || []}
                            onResultsUpdate={(results) => {
                                const doneResults = results.filter(r => r.status === 'done' && r.url);
                                if (doneResults.length > 0) {
                                    const newUrls = doneResults.map(r => r.url!);
                                    // Avoid duplicates
                                    const currentUrls = data.imageUrls?.products || [];
                                    const uniqueNewUrls = newUrls.filter(url => !currentUrls.includes(url));

                                    if (uniqueNewUrls.length > 0) {
                                        onUpdate({
                                            ...data,
                                            imageUrls: {
                                                ...data.imageUrls,
                                                products: [...currentUrls, ...uniqueNewUrls]
                                            }
                                        });
                                    }
                                }
                            }}
                        />
                    </div>
                )}

                {/* Models Section */}
                {activeSection === 'models' && (
                    <div className="space-y-4">
                        <ModelChapterPanel data={data} onUpdate={onUpdate} />
                    </div>
                )}
                {/* Closeup Section (Text Editor) */}
                {activeSection === 'closeup' && (
                    <div className="space-y-4">
                        <div className="bg-white border rounded-xl p-4 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-800">텍스트 편집</h3>
                                <button
                                    onClick={handleAddText}
                                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 flex items-center gap-1"
                                >
                                    <span>+</span> 텍스트 추가
                                </button>
                            </div>

                            <div className="text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded">
                                현재 선택된 섹션: <span className="font-bold text-blue-600">{previewActiveSection || '없음'}</span>
                                <br />텍스트를 추가하면 현재 보이는 섹션에 추가됩니다.
                            </div>

                            {/* Text List */}
                            <div className="space-y-2 mb-4 max-h-[200px] overflow-y-auto">
                                {textElements.map(text => (
                                    <div
                                        key={text.id}
                                        onClick={() => setSelectedTextId(text.id)}
                                        className={`p-2 border rounded cursor-pointer flex justify-between items-center ${selectedTextId === text.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <span className="text-xs truncate max-w-[150px]">{text.content}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDeleteTextElement?.(text.id); }}
                                            className="text-gray-400 hover:text-red-500"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))}
                                {textElements.length === 0 && (
                                    <div className="text-center text-gray-400 text-xs py-4">
                                        추가된 텍스트가 없습니다.
                                    </div>
                                )}
                            </div>

                            {/* Editor */}
                            {selectedText && onUpdateTextElement && (
                                <div className="border-t pt-4 space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">내용</label>
                                        <textarea
                                            className="w-full border p-2 rounded text-sm"
                                            rows={3}
                                            value={selectedText.content}
                                            onChange={(e) => onUpdateTextElement(selectedText.id, 'content', e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">크기 (px)</label>
                                            <input
                                                type="number"
                                                className="w-full border p-2 rounded text-sm"
                                                value={selectedText.fontSize}
                                                onChange={(e) => onUpdateTextElement(selectedText.id, 'fontSize', parseInt(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">색상</label>
                                            <input
                                                type="color"
                                                className="w-full h-[38px] border p-1 rounded"
                                                value={selectedText.color || '#000000'}
                                                onChange={(e) => onUpdateTextElement(selectedText.id, 'color', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">서체</label>
                                        <select
                                            className="w-full border p-2 rounded text-sm"
                                            value={selectedText.fontFamily}
                                            onChange={(e) => onUpdateTextElement(selectedText.id, 'fontFamily', e.target.value)}
                                        >
                                            <option value="Noto Sans KR">Noto Sans KR</option>
                                            <option value="Noto Serif KR">Noto Serif KR</option>
                                            <option value="Spoqa Han Sans Neo">Spoqa Han Sans Neo</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">굵기</label>
                                            <select
                                                className="w-full border p-2 rounded text-sm"
                                                value={selectedText.fontWeight || 'normal'}
                                                onChange={(e) => onUpdateTextElement(selectedText.id, 'fontWeight', e.target.value)}
                                            >
                                                <option value="normal">Normal</option>
                                                <option value="bold">Bold</option>
                                                <option value="100">Thin</option>
                                                <option value="900">Black</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">정렬</label>
                                            <select
                                                className="w-full border p-2 rounded text-sm"
                                                value={selectedText.textAlign || 'left'}
                                                onChange={(e) => onUpdateTextElement(selectedText.id, 'textAlign', e.target.value)}
                                            >
                                                <option value="left">Left</option>
                                                <option value="center">Center</option>
                                                <option value="right">Right</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}