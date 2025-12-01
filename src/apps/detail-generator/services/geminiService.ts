import { GoogleGenAI } from "@google/genai";
import { fileToDataUrl } from "../lib/utils";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

const COMMON_CONFIG = {
    responseModalities: ['IMAGE'],
    imageConfig: { aspectRatio: '3:4' }
};

const fileToPart = async (file: File) => {
    const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return { inlineData: { data: base64, mimeType: file.type } };
};

const urlToPart = (url: string) => {
    const base64 = url.split(',')[1];
    const mimeType = url.match(/data:(.*?);base64/)?.[1] || 'image/png';
    return { inlineData: { data: base64, mimeType } };
};

async function generateImage(prompt: string, parts: any[]): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: { parts: [{ text: prompt }, ...parts] },
            config: COMMON_CONFIG as any,
        });
        const imgPart = response.candidates?.[0]?.content?.parts.find((p: any) => p.inlineData);
        if (!imgPart?.inlineData) throw new Error("No image generated");
        return `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
    } catch (e) {
        console.error("Gemini Error:", e);
        throw e;
    }
}

export async function regenerateShoesOnly(baseImageUrl: string, productFiles: File[]): Promise<string> {
    const basePart = urlToPart(baseImageUrl);
    const productParts = await Promise.all(productFiles.map(fileToPart));
    const prompt = `**TASK:** SHOE REPLACEMENT. ERASE old shoes. PAINT new product. KEEP everything else identical.`;
    return generateImage(prompt, [{ text: "BASE:" }, basePart, { text: "PRODUCT:" }, ...productParts]);
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
    heroTextColors: any, imageZoomLevels: any = {}
): string {
    let result = layoutHtml;

    // 1. Hero Section (Rich Text Content)
    const heroContent = data.heroTextContent || {};
    const heroHtml = `
        <div data-section="hero">
        <!-- 1. 헤더 섹션 -->
        <header style="margin-bottom: 40px; border-bottom: 1px solid #e4e4e7; padding-bottom: 32px; padding: 48px 48px 32px 48px;">
            <h2 style="font-size: 14px; font-weight: 700; color: #a1a1aa; letter-spacing: 0.1em; margin-bottom: 8px; text-transform: uppercase;">${heroContent.brandLine || 'COA ESSENTIAL LINE'}</h2>
            <h1 style="font-size: 48px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase; color: #18181b; line-height: 1.1; margin: 0;">
                ${heroContent.productName || 'COA 02'} <span style="color: #d4d4d8; font-weight: 300;">—</span> 
                <span style="color: #71717a; font-size: 0.8em;">${heroContent.subName || 'HYPER BLACK'}</span>
            </h1>
        </header>

        <!-- 2. 메인 설명 & 스타일링 제안 -->
        <section style="margin-bottom: 48px; padding: 0 48px;">
            <div style="margin-bottom: 32px; font-size: 16px; line-height: 1.7; color: #52525b;">
                <p style="white-space: pre-line; margin-bottom: 16px; font-weight: 500; color: #27272a;">${heroContent.descriptionMain || ''}</p>
                
                <!-- Craftsmanship (제작/소재) -->
                <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
                    <strong style="display: block; font-size: 14px; color: #18181b; margin-bottom: 8px;">DETAIL & CRAFTSMANSHIP</strong>
                    <p style="white-space: pre-line; margin: 0; font-size: 14px; color: #52525b;">${heroContent.craftsmanship || ''}</p>
                </div>
            </div>

            <!-- Styling Match (룩/매칭) -->
            <div style="position: relative; padding-left: 24px; border-left: 4px solid #d4d4d8; padding-top: 8px; padding-bottom: 8px; background-color: #fafafa; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <span style="position: absolute; top: -12px; left: 0; background-color: white; padding: 0 4px; font-size: 12px; font-weight: 700; color: #a1a1aa; letter-spacing: 0.05em; border: 1px solid #e4e4e7; border-radius: 4px;">STYLING & MATCH</span>
                <p style="color: #3f3f46; font-style: italic; white-space: pre-line; margin: 4px 0 0 0; font-size: 15px;">
                    "${heroContent.stylingMatch || 'AI가 스타일링 팁을 생성 중입니다...'}"
                </p>
            </div>
            
            <!-- Technology -->
            <div style="background-color: #fafafa; padding: 24px; border-radius: 8px; border-left: 4px solid #18181b; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <h3 style="font-weight: 700; color: #18181b; margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px; font-size: 18px;">
                    <span style="background-color: #18181b; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px;">T</span>
                    Technology
                </h3>
                <p style="font-size: 14px; color: #52525b; white-space: pre-line; line-height: 1.6; margin: 0;">
                    ${heroContent.technology || '오쏘라이트 인솔'}
                </p>
            </div>
        </section>

        <!-- 3. 스펙 정보 -->
        <section style="margin-bottom: 48px; padding: 0 48px;">
            <h3 style="font-size: 14px; font-weight: 700; color: #18181b; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 16px 0; border-bottom: 2px solid black; padding-bottom: 8px; display: inline-block;">Product Spec</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px 32px; font-size: 14px;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f4f4f5; padding-bottom: 8px;"><span style="color: #a1a1aa; font-weight: 500;">Color</span><span style="font-weight: 600; text-align: right;">${heroContent.specColor || ''}</span></div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f4f4f5; padding-bottom: 8px;"><span style="color: #a1a1aa; font-weight: 500;">Upper</span><span style="font-weight: 600; text-align: right;">${heroContent.specUpper || ''}</span></div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f4f4f5; padding-bottom: 8px;"><span style="color: #a1a1aa; font-weight: 500;">Lining</span><span style="font-weight: 600; text-align: right;">${heroContent.specLining || ''}</span></div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f4f4f5; padding-bottom: 8px;"><span style="color: #a1a1aa; font-weight: 500;">Outsole</span><span style="font-weight: 600; text-align: right;">${heroContent.specOutsole || ''}</span></div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f4f4f5; padding-bottom: 8px;"><span style="color: #a1a1aa; font-weight: 500;">Origin</span><span style="font-weight: 600; text-align: right;">${heroContent.specOrigin || ''}</span></div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f4f4f5; padding-bottom: 8px;"><span style="color: #a1a1aa; font-weight: 500;">Heel Height</span><span style="font-weight: 600; text-align: right;">${heroContent.heelHeight || '3.5cm'}</span></div>
            </div>
        </section>

        <!-- 4. 사이즈 가이드 -->
        <section style="padding: 0 48px 48px 48px;">
            <div style="position: relative; overflow: hidden; border-radius: 12px; border: 1px solid #fecaca; background: linear-gradient(to right, #fef2f2, #ffffff, #ffffff); padding: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <div style="position: absolute; top: -24px; left: -24px; width: 96px; height: 96px; border-radius: 50%; background-color: #fee2e2; opacity: 0.5; filter: blur(24px);"></div>
                <div style="position: relative; display: flex; align-items: flex-start; gap: 16px;">
                    <div style="flex-shrink: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background-color: #ef4444; color: white; box-shadow: 0 4px 6px -1px rgba(254, 202, 202, 0.5);">
                        <svg style="width: 20px; height: 20px;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                        <h3 style="font-size: 18px; font-weight: 700; color: #dc2626; margin: 0 0 8px 0;">SIZE GUIDE</h3>
                        <p style="color: #3f3f46; line-height: 1.6; font-size: 14px; margin: 0; white-space: pre-line;">
                            ${heroContent.sizeGuide || '여유 있는 핏으로 제작되었습니다.\n발볼이 넓거나 일반적인 착화를 원하시는 분은 정사이즈를 권장하며,\n타이트한 핏을 원하시면 0.5 사이즈 다운을 추천드립니다.'}
                        </p>
                    </div>
                </div>
            </div>
        </section>
        </div>
    `;
    result = result.replace('<!--HERO_SECTION-->', heroHtml);

    const renderGridItem = (url: string, type: string, index: number, isProduct: boolean) => {
        const key = isProduct ? `products-${index}` : `${type === 'model' ? 'modelShots' : 'closeupShots'}-${index}`;
        return `
            <div class="image-item">
                <img src="${url}" 
                     data-type="${isProduct ? 'products' : 'models'}" 
                     data-gallery-type="${isProduct ? 'products' : type === 'model' ? 'modelShots' : 'closeupShots'}" 
                     data-index="${index}" />
            </div>`;
    };

    result = result.replace('<!--PRODUCT_IMAGES-->', `<div data-section="products">${imageUrls.products.map((url: string, i: number) => renderGridItem(url, 'products', i, true)).join('')}</div>`);
    result = result.replace('<!--MODEL_SECTION_CONTENT-->', `<div data-section="models">${imageUrls.modelShots.map((asset: any, i: number) => renderGridItem(asset.url, 'model', i, false)).join('')}</div>`);
    result = result.replace('<!--CLOSEUP_SECTION_CONTENT-->', `<div data-section="closeup">${imageUrls.closeupShots.map((asset: any, i: number) => renderGridItem(asset.url, 'closeup', i, false)).join('')}</div>`);

    return result;
}

export const LAYOUT_TEMPLATE_HTML = `
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

        /* 단일 컬럼 이미지 컨테이너 */
        .image-item {
            width: 100%;
            margin-bottom: 0;
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
        }
    </style>
</head>
<body>
    <div class="product-page-container">
        <!-- 1. 히어로 섹션 (메인 배너) -->
        <!--HERO_SECTION-->
        
        <!-- 2. 제품 상세 (누끼 컷) -->
        <span class="section-label">Product Details</span>
        <!--PRODUCT_IMAGES-->
        
        <!-- 3. 모델 스타일링 (전신 컷) -->
        <span class="section-label">Model Styling</span>
        <!--MODEL_SECTION_CONTENT-->
        
        <!-- 4. 디테일 뷰 (클로즈업 컷) -->
        <span class="section-label">Detail View</span>
        <!--CLOSEUP_SECTION_CONTENT-->
    </div>
</body>
</html>
`;

// =================================================================
// FACE GENERATION LOGIC
// =================================================================

import { HarmCategory, HarmBlockThreshold } from "@google/genai";

const MODEL_NAME = 'gemini-3-pro-image-preview'; // Ensure this constant is available or reused

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

export const generateFaceBatch = async (
    gender: 'male' | 'female',
    race: string,
    age: string
): Promise<string[]> => {
    try {
        const genderTerm = gender === 'male' ? 'male' : 'female';
        const isKorean = race === '한국인' || race === '코리안';

        // 1. 인종 매핑
        const raceMapping: Record<string, string> = {
            "한국인": "Korean",
            "코리안": "Korean",
            "동아시아인": "East Asian",
            "아시아인": "East Asian",
            "백인": "Caucasian",
            "흑인": "Black / African American",
            "히스패닉": "Hispanic / Latino",
            "중동인": "Middle Eastern",
            "혼혈": "Mixed race"
        };
        const englishRace = raceMapping[race] || "Korean";

        // 2. 나이 → 피부 디테일 (공통: 관리받은 연예인 피부)
        const numericAge = parseInt(age, 10);
        let ageDetails = "";

        if (Number.isNaN(numericAge)) {
            ageDetails =
                "Flawless celebrity skin texture, well-managed pores, glass skin effect but realistic.";
        } else if (numericAge <= 25) {
            ageDetails =
                "Youthful high-end model skin, bursting with collagen, natural glow, perfect complexion with realistic micro-texture.";
        } else if (numericAge <= 35) {
            ageDetails =
                "Peak visual skin condition, sophisticated texture, absolutely tight jawline, zero sagging, high-end skincare look.";
        } else {
            ageDetails =
                "Legendary celebrity visual who aged gracefully, extremely well-managed skin, tight facial contours, sharp jawline, charismatic eye wrinkles only, looking much younger than actual age, aristocratic aura.";
        }

        // 3. 무드 및 스타일 (국적/성별에 따라 분기)
        let vibeKeywords = "";

        if (gender === 'female') {
            if (isKorean) {
                vibeKeywords = "Top-tier K-pop female idol visual, center position vibe, trend-setting beauty, distinct and sharp features, charismatic aura, Seoul fashion editorial.";
            } else {
                vibeKeywords = "World-class supermodel, Hollywood actress visual, Exotic and distinctive beauty, High-fashion magazine cover vibe, Sophisticated and elegant, Unique charisma.";
            }
        } else { // Male
            if (isKorean) {
                vibeKeywords = "Top-tier K-pop male idol visual, center position vibe, sharp and chic, sculpture-like face, distinct T-zone, charismatic aura, Seoul fashion editorial.";
            } else {
                vibeKeywords = "Global top male model, Hollywood heartthrob vibe, Razor-sharp masculine features, 'Prince' like elegance, High-end luxury brand campaign look, Intense gaze.";
            }
        }

        // 4. 텍스처: AI 인형 느낌 제거하되 고급스럽게
        const textureKeywords =
            "hyper-detailed expensive skin texture, visible fine pores, subtle peach fuzz, realistic but perfect complexion, sharp facial structure, distinct lighting on cheekbones";

        // 5. 헤어스타일 및 배경, 메이크업 배열 (랜덤 선택용)
        const hairStyles = [
            "long straight hair with soft layers and natural shine",
            "medium length trendy cut, clean but modern",
            "soft wavy hair with natural volume, goddess vibe",
            "low ponytail with loose front pieces framing the face",
            "chic bob cut with sophisticated styling"
        ];

        const promises = Array(4) // Generate 4 images
            .fill(null)
            .map(async (_, idx) => {
                const prompt = `
[SUBJECT]
Ultra-detailed close-up portrait of a ${age}-year-old ${englishRace} ${genderTerm}.
Target Look: Global Top Tier Visual / High-End Fashion Icon.
Facial Features: Extremely photogenic, Celebrity visual, Distinctive beauty.

[VIBE]
${vibeKeywords}

[FACE AND SKIN]
${textureKeywords}
${ageDetails}
Natural skin tone, slight variation between forehead, cheeks, and nose.
Subtle highlight on nose bridge and cheekbones, natural shadow under jawline to emphasize sharp contours.
Under-eye area stays realistic but bright.

[HAIR]
Clean hair styling, ${hairStyles[idx % hairStyles.length]}.

[MAKEUP/GROOMING]
Natural high-end look.

[CROP AND FRAMING]
Framed from shoulders and neck up, focus on the face.
No visible clothing logos.
Neutral, non-sexual presentation.

[BACKGROUND]
Simple studio background.
Clean, and even lighting.

[STYLE]
High-end fashion photoshoot / Album concept photo.
Shot on a professional digital camera or high-end film camera.
Direct or semi-direct soft flash to give trendy high-fashion look.
Full color only.
Minimal retouching, keep skin texture and pores visible but maintain celebrity perfection.

[AVOID]
Do not make the face look like an AI-generated doll.
Do not over-smooth the skin.
No anime style, no illustration, no 3D render.
No uncanny valley eyes, no extreme symmetry, no plastic shine.
          `;

                const response = await ai.models.generateContent({
                    model: MODEL_NAME,
                    contents: { parts: [{ text: prompt }] },
                    config: {
                        imageConfig: { aspectRatio: '1:1' },
                        safetySettings: [
                            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                        ]
                    }
                });

                return getImageUrlFromResponse(response);
            });

        return Promise.all(promises);
    } catch (e) {
        throw e;
    }
};

export const upscaleFace = async (base64Image: string): Promise<string> => {
    try {
        const dataPart = base64Image.split(',')[1] || base64Image;

        const prompt = `
      [TASK: UPSCALE & ENHANCE]
      Re-generate this portrait in 4K resolution.
      Maintain the exact same face, identity, pose, lighting, and composition.
      Significantly improve skin texture, hair details, and eye sharpness.
      Make it look like a high-end commercial beauty shot.
      Output: High-fidelity 4K photograph.
    `;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/png', data: dataPart } },
                    { text: prompt }
                ]
            },
            config: {
                imageConfig: { aspectRatio: '1:1' },
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                ]
            }
        });
        return getImageUrlFromResponse(response);
    } catch (e) {
        throw e;
    }
};
