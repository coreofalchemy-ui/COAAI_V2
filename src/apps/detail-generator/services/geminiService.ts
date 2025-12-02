import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the client directly since @/lib/gemini is missing
const ai = new GoogleGenerativeAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const PLACEHOLDER_ASSET = { url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlZWUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxOCIgZmlsbD0iI2NjYyIKIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=' };

const urlToPart = (url: string) => ({
    inlineData: { mimeType: 'image/png', data: url.split(',')[1] || url }
});

const fileToPart = async (file: File) => ({
    inlineData: {
        mimeType: file.type, data: await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(file);
        })
    }
});

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function generateImage(prompt: string, parts: any[]): Promise<string> {
    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: { parts: [...parts, { text: prompt }] },
        config: { imageConfig: { aspectRatio: '3:4' } }
    });
    return `data:image/png;base64,${response.candidates[0].content.parts[0].inlineData?.data}`;
}

export async function regenerateShoesOnly(modelImageUrl: string, productFiles: File[]): Promise<string> {
    const basePart = urlToPart(modelImageUrl);
    const productParts = await Promise.all(productFiles.map(fileToPart));
    const prompt = `**TASK:** SHOE SWAP. Change ONLY shoes to new product. Keep EXACT pose/clothes/background/model/lighting. Product is a shoe. Show feet clearly.`;
    return generateImage(prompt, [{ text: "BASE:" }, basePart, { text: "NEW SHOES:" }, ...productParts]);
}

export async function regenerateImageWithSpecificPose(baseImageUrl: string, posePrompt: string): Promise<any> {
    const basePart = urlToPart(baseImageUrl);
    const prompt = `**TASK:** POSE CHANGE. New Pose: "${posePrompt}". KEEP Identity/Shoes/Clothes.`;
    const newUrl = await generateImage(prompt, [{ text: "BASE:" }, basePart]);
    return { url: newUrl, generatingParams: { pose: posePrompt } };
}

async function _bringModelToStudio(modelFile: File, productFiles: File[]): Promise<string> {
    const modelPart = await fileToPart(modelFile);
    const productParts = await Promise.all(productFiles.map(fileToPart));
    const prompt = `**TASK:** STUDIO SHOOT. Grey concrete background. Model wearing product. Portrait 3:4.`;
    return generateImage(prompt, [{ text: "MODEL:" }, modelPart, { text: "PRODUCT:" }, ...productParts]);
}

async function generateVariationsParallel(masterUrl: string, variants: { name: string, prompt: string }[]): Promise<any[]> {
    const promises = variants.map(v =>
        regenerateImageWithSpecificPose(masterUrl, v.prompt)
            .then(asset => ({ ...asset, generatingParams: { pose: v.name } }))
            .catch(() => null)
    );
    const results = await Promise.all(promises);
    return results.filter(r => r !== null);
}

export async function generateTextContentOnly(productFiles: File[]): Promise<any> {
    const productParts = (await Promise.all(productFiles.map(fileToPart))).flatMap((p, i) => [{ text: `Img ${i}` }, p]);
    const prompt = `Generate JSON for shoe product page. Keys: textContent, specContent, heroTextContent, noticeContent.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: { parts: [...productParts, { text: prompt }] },
        config: { responseMimeType: 'application/json' }
    });
    try { return JSON.parse(response.text?.trim() || "{}"); } catch { return { textContent: {}, specContent: {}, heroTextContent: {}, noticeContent: {} }; }
}

export async function generateInitialOriginalSet(p: File[], m: File[], onProgress?: (m: string) => void): Promise<any> {
    onProgress?.("1/3: 마스터 생성...");
    const masterUrl = await regenerateShoesOnly(await fileToDataUrl(m[0]), p);
    const masterAsset = { url: masterUrl, generatingParams: { pose: "Master" } };

    onProgress?.("2/3: 변형 동시 생성...");
    const [modelVars, closeupVars] = await Promise.all([
        generateVariationsParallel(masterUrl, [{ name: "Walk", prompt: "Walking" }, { name: "Cross", prompt: "Legs Crossed" }]),
        generateVariationsParallel(masterUrl, [{ name: "Side", prompt: "Side view feet" }, { name: "Angle", prompt: "Low angle feet" }, { name: "Top", prompt: "Top down feet" }])
    ]);
    return { modelShots: [masterAsset, ...modelVars], closeupShots: closeupVars };
}

export async function generateStudioImageSet(p: File[], m: File[], onProgress?: (m: string) => void): Promise<any> {
    onProgress?.("1/3: 스튜디오 생성...");
    const masterUrl = await _bringModelToStudio(m[0], p);
    const masterAsset = { url: masterUrl, generatingParams: { pose: "Studio Master" } };

    onProgress?.("2/3: 변형 동시 생성...");
    const [modelVars, closeupVars] = await Promise.all([
        generateVariationsParallel(masterUrl, [{ name: "Walk", prompt: "Studio Walk" }, { name: "Lean", prompt: "Leaning against wall" }]),
        generateVariationsParallel(masterUrl, [{ name: "Detail", prompt: "Waist down" }, { name: "Focus", prompt: "Extreme closeup" }, { name: "Back", prompt: "Back view" }])
    ]);
    return { modelShots: [masterAsset, ...modelVars], closeupShots: closeupVars };
}

export function populateTemplate(
    data: any, imageUrls: any, fontSizes: any, fontStyles: any, layoutHtml: string,
    imageZoomLevels: any = {}, sectionOrder: string[] = ['hero', 'products', 'models'],
    showAIAnalysis: boolean = true, showSubHero1: boolean = false, showSubHero2: boolean = false
): string {
    // Section labels that can be customized
    const sectionLabels = data.sectionLabels || {
        products: 'PRODUCT DETAILS',
        models: 'MODEL STYLING',
        closeups: 'DETAIL VIEW'
    };

    // Build sections map
    const sectionsMap: { [key: string]: string } = {};

    // 1. Hero Section (Rich Text Content)
    const heroContent = data.heroTextContent || {};
    sectionsMap['hero'] = `
        <div data-section="hero" style="padding: 60px 40px; max-width: 1000px; margin: 0 auto; font-family: 'Noto Sans KR', sans-serif; color: #333;">
            <!-- Brand Line -->
            <div style="font-size: 11px; letter-spacing: 1px; color: #888; margin-bottom: 10px; font-weight: 500;">
                ${heroContent.brandLine || 'PRODUCT LINE'}
            </div>
            
            <!-- Product Name -->
            <h1 style="font-size: 28px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 30px 0; line-height: 1.2;">
                ${heroContent.productName || 'PRODUCT NAME'} <span style="font-weight: 300; color: #ccc; margin: 0 8px;">—</span> <span style="color: #666;">${heroContent.subName || 'COLOR / MODEL'}</span>
            </h1>

            <!-- Paragraph 1 (Styling) -->
            <div style="margin-bottom: 20px; font-size: 14px; line-height: 1.7; color: #444;">
                ${heroContent.stylingMatch || '제품의 스타일링 매치와 착용 시나리오에 대한 설명이 들어갑니다. 어떤 스타일과 잘 어울리는지 안내합니다.'}
            </div>

            <!-- Paragraph 2 (Craftsmanship) -->
            <div style="margin-bottom: 40px; font-size: 14px; line-height: 1.7; color: #444;">
                ${heroContent.craftsmanship || '제품의 디자인 철학, 제작 방식, 사용된 소재의 기능과 특성에 대한 설명이 들어갑니다.'}
            </div>

            <!-- Technology -->
            <div style="background-color: #f9fafb; border-left: 4px solid #111; padding: 20px; margin-bottom: 40px; border-radius: 0 8px 8px 0;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #111;">Technology</h3>
                <p style="margin: 0; font-size: 13px; color: #555; line-height: 1.6;">
                    ${heroContent.technology || '제품에 적용된 핵심 기술과 그 기술이 제공하는 기능 및 이점에 대한 설명이 들어갑니다.'}
                </p>
            </div>

            <!-- Product Spec -->
            <div style="margin-bottom: 40px;">
                <h3 style="font-size: 11px; font-weight: 800; letter-spacing: 1px; margin-bottom: 16px; text-transform: uppercase; color: #111;">Product Spec</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px 30px; font-size: 13px; border-top: 2px solid #eee; padding-top: 16px;">
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px;">
                        <span style="color: #9ca3af;">Color</span>
                        <span style="font-weight: 500;">${heroContent.specColor || '컬러명'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px;">
                        <span style="color: #9ca3af;">Upper</span>
                        <span style="font-weight: 500;">${heroContent.specUpper || '어퍼 소재'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px;">
                        <span style="color: #9ca3af;">Lining</span>
                        <span style="font-weight: 500;">${heroContent.specLining || '안감 소재'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px;">
                        <span style="color: #9ca3af;">Outsole</span>
                        <span style="font-weight: 500;">${heroContent.specOutsole || '아웃솔 소재'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px;">
                        <span style="color: #9ca3af;">Origin</span>
                        <span style="font-weight: 500;">${heroContent.specOrigin || '제조국'}</span>
                    </div>
                </div>
            </div>

            <!-- Height Spec -->
            <div style="margin-bottom: 40px;">
                <h3 style="font-size: 11px; font-weight: 800; letter-spacing: 1px; margin-bottom: 16px; text-transform: uppercase; color: #111; border-bottom: 2px solid #111; padding-bottom: 6px; display: inline-block;">Height Spec</h3>
                <div style="display: flex; justify-content: space-between; background: #fff; border: 1px solid #e5e7eb; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <div style="text-align: center; flex: 1;">
                        <div style="font-size: 11px; color: #6b7280; margin-bottom: 6px;">아웃솔 (Outsole)</div>
                        <div style="font-weight: 700; font-size: 16px; color: #111;">${heroContent.heightOutsole || '3'} CM</div>
                    </div>
                    <div style="text-align: center; flex: 1; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                        <div style="font-size: 11px; color: #6b7280; margin-bottom: 6px;">인솔 (Insole)</div>
                        <div style="font-weight: 700; font-size: 16px; color: #111;">${heroContent.heightInsole || '1.5'} CM</div>
                    </div>
                    <div style="text-align: center; flex: 1;">
                        <div style="font-size: 11px; color: #ef4444; margin-bottom: 6px; font-weight: 600;">총 키높이 (Total)</div>
                        <div style="font-weight: 800; font-size: 18px; color: #ef4444;">${heroContent.heightTotal || '4.5'} CM</div>
                    </div>
                </div>
            </div>

            <!-- Size Guide -->
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; display: flex; align-items: start;">
                <div style="background: #ef4444; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 14px; flex-shrink: 0; font-size: 12px;">✓</div>
                <div>
                    <h3 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #ef4444; text-transform: uppercase;">Size Guide</h3>
                    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #4b5563;">
                        ${heroContent.sizeGuide ? heroContent.sizeGuide.replace(/\n/g, '<br/>') : '사이즈 가이드 내용이 없습니다.'}
                    </p>
                </div>
            </div>
        </div>
    `;

    // Add Sub Heroes right after hero
    if (showSubHero1 && imageUrls.subHero1 && imageUrls.subHero1.length > 100) {
        sectionsMap['hero'] += `
            <!-- Sub Hero 1 -->
            <div style="margin-top: 40px; margin-bottom: 40px;">
                <img src="${imageUrls.subHero1}" style="width: 100%;" />
            </div>
        `;
    }

    if (showSubHero2 && imageUrls.subHero2 && imageUrls.subHero2.length > 100) {
        sectionsMap['hero'] += `
            <!-- Sub Hero 2 -->
            <div style="margin-top: 40px; margin-bottom: 40px;">
                <img src="${imageUrls.subHero2}" style="width: 100%;" />
            </div>
        `;
    }

    // 2. Products Section
    const productImages = (imageUrls.products || []).filter((url: string) => url && url.length > 100 && !url.includes('placeholder'));
    if (productImages.length > 0) {
        let productsHtml = sectionLabels.products ? `<span class="section-label" contenteditable="true" data-section-label="products">${sectionLabels.products}</span>` : '';
        productsHtml += `<div data-section="products" style="margin-top: 48px;">`;
        productImages.forEach((url: string, index: number) => {
            productsHtml += `
                <div style="margin-bottom: 24px;">
                    <img src="${url}" style="width: 100%;" data-gallery-type="products" data-index="${index}" />
                </div>
            `;
        });
        productsHtml += `</div>`;
        sectionsMap['products'] = productsHtml;
    }

    // 3. Models Section - Always show even when empty
    const modelImages = (imageUrls.modelShots || []).filter((url: any) => {
        const imageUrl = typeof url === 'string' ? url : url?.url;
        return imageUrl && imageUrl.length > 100 && !imageUrl.includes('placeholder');
    });

    // Always create models section
    let modelsHtml = sectionLabels.models ? `<span class="section-label" contenteditable="true" data-section-label="models">${sectionLabels.models}</span>` : '';
    modelsHtml += `<div data-section="models" style="margin-top: 48px;">`;

    if (modelImages.length > 0) {
        // Show actual images
        modelImages.forEach((url: any, index: number) => {
            const imageUrl = typeof url === 'string' ? url : url?.url;
            modelsHtml += `
                <div style="margin-bottom: 24px;">
                    <img src="${imageUrl}" style="width: 100%;" data-gallery-type="modelShots" data-index="${index}" />
                </div>
            `;
        });
    } else {
        // Show gradient placeholder when no images
        modelsHtml += `
            <div class="model-drop-zone" style="
                min-height: 400px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 8px;
                margin-bottom: 24px;
            ">
                <div style="text-align: center; color: white;">
                    <div style="
                        font-size: 72px;
                        font-weight: 900;
                        letter-spacing: 8px;
                        margin-bottom: 16px;
                        text-transform: uppercase;
                        opacity: 0.9;
                    ">MODEL</div>
                    <div style="font-size: 18px; opacity: 0.8;">드래그하여 모델 이미지를 추가하세요</div>
                </div>
            </div>
        `;
    }
    modelsHtml += `</div>`;
    sectionsMap['models'] = modelsHtml;

    // 4. Closeups Section (optional, based on sectionOrder)
    const closeupImages = (imageUrls.closeupShots || []).filter((url: any) => {
        const imageUrl = typeof url === 'string' ? url : url?.url;
        return imageUrl && imageUrl.length > 100 && !imageUrl.includes('placeholder');
    });
    if (closeupImages.length > 0 && sectionOrder.includes('closeups')) {
        let closeupHtml = sectionLabels.closeups ? `<span class="section-label" contenteditable="true" data-section-label="closeups">${sectionLabels.closeups}</span>` : '';
        closeupHtml += `<div data-section="closeups" style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 48px;">`;
        closeupImages.forEach((url: any, index: number) => {
            const imageUrl = typeof url === 'string' ? url : url?.url;
            closeupHtml += `
                <div>
                    <img src="${imageUrl}" style="width: 100%;" data-gallery-type="closeupShots" data-index="${index}" />
                </div>
            `;
        });
        closeupHtml += `</div>`;
        sectionsMap['closeups'] = closeupHtml;
    }

    // Build final HTML based on sectionOrder
    let sectionsHtml = '';
    sectionOrder.forEach(sectionKey => {
        if (sectionsMap[sectionKey]) {
            sectionsHtml += sectionsMap[sectionKey];
        }
    });

    // Create complete HTML
    const completeHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1000">
    <style>
        /* 기본 리셋 및 폰트 */
        body { margin: 0; padding: 0; background-color: #ffffff; font-family: sans-serif; min-width: 1000px; }
        img { display: block; width: 100%; height: auto; }
        
        /* 메인 컨테이너 */
        .product-page-container {
            width: 1000px;
            margin: 0 auto;
            background-color: white;
            padding: 0;
            box-sizing: border-box;
        }

        /* 섹션 제목 스타일 */
        .section-label {
            font-size: 12px;
            font-weight: 700;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0;
            padding: 15px 20px;
            background-color: #f9f9f9;
            display: block;
            cursor: text;
            outline: none;
        }
        .section-label:hover {
            background-color: #f3f4f6;
        }
        .section-label:focus {
            background-color: #e5e7eb;
            border-left: 3px solid #3b82f6;
        }
    </style>
</head>
<body>
    <div class="product-page-container">
        ${sectionsHtml}
    </div>
</body>
</html>
    `;

    return completeHtml;
}

export const LAYOUT_TEMPLATE_HTML = `<!DOCTYPE html><html></html>`;

// Face generation functions
const MODEL_NAME = 'gemini-3-pro-image-preview';

function getImageUrlFromResponse(response: any): string {
    for (const candidate of response.candidates || []) {
        for (const part of candidate.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    throw new Error('No image found in the response.');
}

export const generateFaceBatch = async (gender: 'male' | 'female', race: string, age: string): Promise<string[]> => {
    // Face generation implementation
    return [];
};

export const upscaleFace = async (base64Image: string): Promise<string> => {
    return base64Image;
};
