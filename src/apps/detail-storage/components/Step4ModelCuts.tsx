import React, { useState } from 'react';
import { generateFaceBatch, swapFace } from '../services/geminiService';

interface UploadedImage {
    file: File;
    previewUrl: string;
    base64: string;
    mimeType: string;
}

interface Step4ModelCutsProps {
    productImages: UploadedImage[];
    onAddToPreview: (content: string, type: 'section' | 'image') => void;
}

type ModelGender = 'male' | 'female';
type ModelAge = '18' | '21' | '25' | '28' | '31' | '35' | '40';
type ModelEthnicity = '한국인' | '아시아인' | '백인' | '흑인' | '히스패닉' | '중동인' | '혼혈';

const Step4ModelCuts: React.FC<Step4ModelCutsProps> = ({ productImages, onAddToPreview }) => {
    // Face Source State
    const [uploadedFace, setUploadedFace] = useState<UploadedImage | null>(null);
    const [faceSource, setFaceSource] = useState<'upload' | 'generate'>('upload');

    // AI Generation State
    const [gender, setGender] = useState<ModelGender>('female');
    const [age, setAge] = useState<ModelAge>('25');
    const [ethnicity, setEthnicity] = useState<ModelEthnicity>('한국인');
    const [generatedFaces, setGeneratedFaces] = useState<string[]>([]);
    const [previewFace, setPreviewFace] = useState<string | null>(null);
    const [selectedFace, setSelectedFace] = useState<string | null>(null);

    // Reference Photos State
    const [referencePhotos, setReferencePhotos] = useState<UploadedImage[]>([]);

    // Swap Results State
    const [swappedResults, setSwappedResults] = useState<string[]>([]);
    const [modalImage, setModalImage] = useState<string | null>(null);

    // Loading States
    const [isGenerating, setIsGenerating] = useState(false);

    const [isSwapping, setIsSwapping] = useState(false);

    // Face Gallery Modal State
    const [showFaceGallery, setShowFaceGallery] = useState(false);

    const races: ModelEthnicity[] = ["한국인", "아시아인", "백인", "흑인", "히스패닉", "중동인", "혼혈"];
    const ages: ModelAge[] = ["18", "21", "25", "28", "31", "35", "40"];

    // Handle Face Upload
    const handleFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64String = (event.target?.result as string).split(',')[1];
                setUploadedFace({
                    file,
                    previewUrl: URL.createObjectURL(file),
                    base64: base64String,
                    mimeType: file.type
                });
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle Reference Photos Upload
    const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newImages: UploadedImage[] = [];
            const filesToProcess = Array.from(e.target.files).slice(0, 5 - referencePhotos.length);

            let processedCount = 0;
            filesToProcess.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64String = (event.target?.result as string).split(',')[1];
                    newImages.push({
                        file,
                        previewUrl: URL.createObjectURL(file),
                        base64: base64String,
                        mimeType: file.type
                    });
                    processedCount++;
                    if (processedCount === filesToProcess.length) {
                        setReferencePhotos(prev => [...prev, ...newImages]);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeReferencePhoto = (index: number) => {
        setReferencePhotos(prev => prev.filter((_, i) => i !== index));
    };

    // AI Face Generation
    const handleGenerateBatch = async () => {
        setIsGenerating(true);
        setGeneratedFaces([]);
        setSelectedFace(null);
        setSelectedFace(null);

        try {
            const images = await generateFaceBatch(gender, ethnicity, age);
            if (images && images.length > 0) {
                setGeneratedFaces(images);
            } else {
                alert("이미지 생성 결과가 없습니다.");
            }
        } catch (error: any) {
            console.error(error);
            alert(`생성 오류: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };



    // Face Swap Process
    const handleFaceSwap = async () => {
        const sourceFace = faceSource === 'upload' ? uploadedFace?.previewUrl : selectedFace;

        console.log('=== Face Swap Debug ===');
        console.log('faceSource:', faceSource);
        console.log('uploadedFace:', uploadedFace);
        console.log('selectedFace:', selectedFace);

        console.log('sourceFace:', sourceFace);
        console.log('referencePhotos:', referencePhotos);

        if (!sourceFace) {
            alert("먼저 얼굴을 선택하거나 업로드해주세요.");
            return;
        }

        if (referencePhotos.length === 0) {
            alert("레퍼런스 모델 사진을 업로드해주세요.");
            return;
        }

        setIsSwapping(true);
        setSwappedResults([]);

        try {
            const results = await Promise.all(
                referencePhotos.map(async (refPhoto, index) => {
                    console.log(`Processing reference photo ${index + 1}/${referencePhotos.length}`);

                    // Convert source face to base64 if needed
                    let sourceFaceBase64 = sourceFace;
                    if (faceSource === 'upload' && uploadedFace) {
                        sourceFaceBase64 = `data:${uploadedFace.mimeType};base64,${uploadedFace.base64}`;
                    }

                    const result = await swapFace(sourceFaceBase64, refPhoto.file);
                    console.log(`Result ${index + 1} generated successfully`);
                    return result;
                })
            );

            console.log('All results:', results);
            setSwappedResults(results);

            if (results.length > 0) {
                alert(`✅ ${results.length}개의 합성 이미지가 생성되었습니다!`);
            } else {
                alert('⚠️ 이미지 생성에 실패했습니다.');
            }
        } catch (error: any) {
            console.error('Face swap error:', error);
            alert(`❌ 페이스 스왑 오류: ${error.message}`);
        } finally {
            setIsSwapping(false);
        }
    };

    const handleAddToPreview = (imageUrl: string) => {
        onAddToPreview(imageUrl, 'image');
        alert("프리뷰에 추가되었습니다!");
    };

    const downloadImage = (url: string, filename: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-gray-900">Model Lookbook</h3>
                <p className="text-xs text-gray-500 mt-0.5">K-pop 스타일 AI 모델 얼굴을 생성합니다</p>
            </div>

            {/* SECTION 1: 얼굴 소스 선택 */}
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 space-y-3">
                <h4 className="text-sm font-bold text-gray-900">1단계: 얼굴 소스 선택</h4>

                <div className="flex gap-2">
                    <button
                        onClick={() => setFaceSource('upload')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${faceSource === 'upload' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        📤 얼굴 업로드
                    </button>
                    <button
                        onClick={() => setFaceSource('generate')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${faceSource === 'generate' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        ✨ AI 생성
                    </button>
                </div>

                {/* Upload Mode */}
                {faceSource === 'upload' && (
                    <div className="space-y-3 pt-2">
                        <label className="block">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 cursor-pointer transition-colors">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFaceUpload}
                                    className="hidden"
                                />
                                {uploadedFace ? (
                                    <div>
                                        <img src={uploadedFace.previewUrl} alt="Uploaded Face" className="w-32 h-32 object-cover rounded-lg mx-auto mb-2" />
                                        <p className="text-xs text-green-600">✓ 얼굴 업로드 완료</p>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="text-4xl mb-2">👤</div>
                                        <p className="text-sm font-medium text-gray-700">얼굴 사진을 업로드하세요</p>
                                        <p className="text-xs text-gray-500 mt-1">클릭하여 파일 선택</p>
                                    </div>
                                )}
                            </div>
                        </label>
                    </div>
                )}

                {/* Generate Mode */}
                {faceSource === 'generate' && (
                    <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setGender('female')}
                                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${gender === 'female' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                여성 모델
                            </button>
                            <button
                                onClick={() => setGender('male')}
                                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${gender === 'male' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                남성 모델
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">인종</label>
                                <select
                                    value={ethnicity}
                                    onChange={(e) => setEthnicity(e.target.value as ModelEthnicity)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                                >
                                    {races.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">나이</label>
                                <select
                                    value={age}
                                    onChange={(e) => setAge(e.target.value as ModelAge)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                                >
                                    {ages.map(a => <option key={a} value={a}>{a}세</option>)}
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleGenerateBatch}
                            disabled={isGenerating}
                            className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold rounded-lg disabled:opacity-50 transition-all text-sm"
                        >
                            {isGenerating ? '생성 중...' : '얼굴 4개 생성하기'}
                        </button>
                    </div>
                )}
            </div>

            {/* GENERATED FACES SECTION - Modal Trigger */}
            {faceSource === 'generate' && (
                <div className="bg-gradient-to-br from-pink-50 to-purple-50 p-4 rounded-lg border-2 border-pink-200 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-gray-900">✨ 생성된 얼굴</h4>
                        {generatedFaces.length > 0 && (
                            <span className="bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                {generatedFaces.length}개
                            </span>
                        )}
                    </div>

                    {/* Loading State */}
                    {isGenerating && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-200 border-t-pink-600 mb-3"></div>
                            <p className="text-sm font-medium text-gray-700">AI 얼굴 생성 중...</p>
                            <p className="text-xs text-gray-500 mt-1">4개의 얼굴을 만들고 있습니다</p>
                        </div>
                    )}

                    {/* Empty State */}
                    {!isGenerating && generatedFaces.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-pink-200 rounded-lg">
                            <div className="text-5xl mb-3">👤</div>
                            <p className="text-sm font-medium text-gray-700">생성된 얼굴 없음</p>
                            <p className="text-xs text-gray-500 mt-1">위 설정을 선택하고 "얼굴 4개 생성하기" 버튼을 눌러주세요</p>
                        </div>
                    )}

                    {/* View Faces Button */}
                    {!isGenerating && generatedFaces.length > 0 && (
                        <button
                            onClick={() => setShowFaceGallery(true)}
                            className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            생성된 얼굴 크게 보기 ({generatedFaces.length}개)
                        </button>
                    )}


                </div>
            )}

            {/* SECTION 2: 레퍼런스 모델 사진 업로드 */}
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 space-y-3">
                <h4 className="text-sm font-bold text-gray-900">2단계: 레퍼런스 모델 사진 업로드 (최대 5장)</h4>

                {referencePhotos.length < 5 && (
                    <label className="block">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 cursor-pointer transition-colors">
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleReferenceUpload}
                                className="hidden"
                            />
                            <div className="text-3xl mb-2">📸</div>
                            <p className="text-sm font-medium text-gray-700">레퍼런스 사진 업로드</p>
                            <p className="text-xs text-gray-500 mt-1">{referencePhotos.length}/5 업로드됨</p>
                        </div>
                    </label>
                )}

                {referencePhotos.length > 0 && (
                    <div className="grid grid-cols-5 gap-2">
                        {referencePhotos.map((photo, idx) => (
                            <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                                <img src={photo.previewUrl} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover" />
                                <button
                                    onClick={() => removeReferencePhoto(idx)}
                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* SECTION 3: 얼굴 합성 생성 */}
            <button
                onClick={handleFaceSwap}
                disabled={
                    isSwapping ||
                    referencePhotos.length === 0 ||
                    (faceSource === 'upload' && !uploadedFace) ||
                    (faceSource === 'generate' && !selectedFace)
                }
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg disabled:opacity-50 transition-all text-base"
            >
                {isSwapping ? '합성 중...' : '🎭 얼굴 합성해서 생성'}
            </button>

            {/* SECTION 4: 합성 결과물 */}
            {swappedResults.length > 0 && (
                <div className="bg-white p-4 rounded-lg border-2 border-green-200 space-y-3">
                    <h4 className="text-sm font-bold text-gray-900">합성 결과 ({swappedResults.length}개)</h4>
                    <div className="flex flex-col space-y-8">
                        {swappedResults.map((result, idx) => (
                            <div key={idx} className="relative group">
                                <img
                                    src={result}
                                    alt={`Result ${idx + 1}`}
                                    onClick={() => setModalImage(result)}
                                    className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity border-2 border-gray-200"
                                />
                                <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); downloadImage(result, `swapped-${idx + 1}.png`); }}
                                        className="p-1.5 bg-black/70 text-white rounded-full hover:bg-black"
                                        title="다운로드"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleAddToPreview(result); }}
                                        className="p-1.5 bg-purple-600 text-white rounded-full hover:bg-purple-700"
                                        title="프리뷰에 추가"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal for Full Image View - Enhanced */}
            {modalImage && (
                <div
                    className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-8 backdrop-blur-sm"
                    onClick={() => setModalImage(null)}
                >
                    {/* Modal Content */}
                    <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
                        {/* Close Button */}
                        <button
                            onClick={() => setModalImage(null)}
                            className="absolute -top-12 right-0 p-3 bg-white text-gray-800 rounded-full hover:bg-gray-100 transition-all shadow-xl z-10"
                            aria-label="닫기"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Image Container */}
                        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                            <img
                                src={modalImage}
                                alt="Full View"
                                className="w-full h-auto max-h-[85vh] object-contain"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 justify-center mt-6">
                            <button
                                onClick={() => downloadImage(modalImage, `face-${Date.now()}.png`)}
                                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all shadow-lg flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                다운로드
                            </button>
                            <button
                                onClick={() => {
                                    handleAddToPreview(modalImage);
                                    setModalImage(null);
                                }}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition-all shadow-lg flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                프리뷰에 추가
                            </button>
                        </div>

                        {/* Hint Text */}
                        <p className="text-center text-white/70 text-sm mt-4">
                            배경을 클릭하거나 ESC 키를 눌러 닫기
                        </p>
                    </div>
                </div>
            )}

            {/* Face Gallery Modal - Full Screen Popup */}
            {showFaceGallery && generatedFaces.length > 0 && (
                <div
                    className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-8"
                    onClick={() => setShowFaceGallery(false)}
                >
                    <div className="relative w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-3xl font-bold text-white">생성된 얼굴</h2>
                                <p className="text-white/70 mt-1">클릭하여 선택하고 "선택 완료" 버튼을 눌러주세요</p>
                            </div>
                            <button
                                onClick={() => setShowFaceGallery(false)}
                                className="p-3 bg-white text-gray-800 rounded-full hover:bg-gray-100 shadow-xl"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-8">
                            {generatedFaces.map((face, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        setPreviewFace(face);
                                    }}
                                    className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all ${selectedFace === face ? 'ring-8 ring-pink-500 shadow-2xl' : 'ring-4 ring-white/20 hover:ring-white/40'
                                        }`}
                                >
                                    <img src={face} alt={`Face ${idx + 1}`} className="w-full aspect-square object-cover" />
                                    {selectedFace === face && (
                                        <div className="absolute inset-0 bg-pink-500/30 flex items-center justify-center">
                                            <div className="bg-pink-500 rounded-full p-4">
                                                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3 bg-black/70 text-white text-sm font-bold px-3 py-2 rounded-full">
                                        #{idx + 1}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => setShowFaceGallery(false)}
                                disabled={!selectedFace}
                                className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-2xl flex items-center gap-3"
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                선택 완료
                            </button>
                            <button
                                onClick={() => setShowFaceGallery(false)}
                                className="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl shadow-xl"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Single Face Preview Modal */}
            {previewFace && (
                <div
                    className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60] p-8"
                    onClick={() => setPreviewFace(null)}
                >
                    <div className="relative w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">이 모델 사용하기</h3>
                            <div className="aspect-square rounded-xl overflow-hidden mb-6 border-2 border-gray-100">
                                <img src={previewFace} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setSelectedFace(previewFace);
                                        setPreviewFace(null);
                                        setShowFaceGallery(false);
                                        // Trigger synthesis immediately if references exist
                                        if (referencePhotos.length > 0) {
                                            // We need to set selectedFace state first, but state updates are async.
                                            // So we pass the face directly to a modified handleFaceSwap or handle it here.
                                            // Since handleFaceSwap uses state, we might need to wait or pass args.
                                            // Let's modify handleFaceSwap to accept an optional face override.
                                            // For now, I'll just set it and alert the user to click synthesize, OR
                                            // I can call the synthesis logic directly here.
                                            // But handleFaceSwap is complex.
                                            // Let's try to call handleFaceSwap with the face.
                                            // But handleFaceSwap reads from state.
                                            // I will refactor handleFaceSwap to accept an argument in a separate step or just rely on state?
                                            // State update won't be immediate.
                                            // I will modify handleFaceSwap to take an optional argument.
                                            // Wait, I can't modify handleFaceSwap in this chunk easily without replacing it.
                                            // I'll just set the state and click the button programmatically? No, that's hacky.
                                            // I'll just set the state and close the modal, and the user can click synthesize?
                                            // User said: "Use model -> Synthesized and output".
                                            // So it MUST be automatic.
                                            // I will use a setTimeout or useEffect? No.
                                            // I will copy the logic of handleFaceSwap here or refactor handleFaceSwap.
                                            // Refactoring handleFaceSwap is safer.
                                            // But I am in a multi_replace.
                                            // I will just implement the synthesis call here directly using the service.
                                            // Or better: I will update handleFaceSwap to accept an override.
                                            // I'll do that in a separate replace call if needed, or just assume I can pass it?
                                            // No, handleFaceSwap signature is () => void.
                                            // I will add a hidden button to trigger it? No.
                                            // I will just set the state and let the user click?
                                            // "합성이 되어서 출력이 되어야지" implies automatic.
                                            // I will try to call the service directly here.
                                            // Actually, I can just call `swapFace` here loop over referencePhotos.
                                            // It duplicates logic but ensures it works immediately.
                                            // Let's duplicate the loop logic for now to be safe and fast.

                                            setIsSwapping(true);
                                            setSwappedResults([]);

                                            (async () => {
                                                try {
                                                    const results = await Promise.all(
                                                        referencePhotos.map(async (refPhoto) => {
                                                            return await swapFace(previewFace, refPhoto.file);
                                                        })
                                                    );
                                                    setSwappedResults(results);
                                                    alert(`✅ ${results.length}개의 합성 이미지가 생성되었습니다!`);
                                                } catch (error: any) {
                                                    alert(`❌ 페이스 스왑 오류: ${error.message}`);
                                                } finally {
                                                    setIsSwapping(false);
                                                }
                                            })();
                                        } else {
                                            alert("레퍼런스 모델 사진을 먼저 업로드해주세요!");
                                        }
                                    }}
                                    className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all"
                                >
                                    이 모델로 합성하기
                                </button>
                                <button
                                    onClick={() => setPreviewFace(null)}
                                    className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-all"
                                >
                                    취소
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Step4ModelCuts;
