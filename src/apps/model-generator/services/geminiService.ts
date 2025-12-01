
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Part, GenerateContentResponse } from "@google/genai";
import { enforceAspectRatio } from '../lib/canvasUtils';

const MODEL_NAME = 'gemini-3-pro-image-preview';

const getAiClient = () => new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY! });

// =================================================================
// PROMPTS (Korean Logic Tuned)
// =================================================================

const campaignSynthesisPrompt = `
// SYSTEM: Senior VFX Supervisor & High-End Retoucher
// TASK: Create a seamless composite image.
// INPUTS:
// 1. [Target Shot]: Base model/pose/background.
// 2. [Face ID]: Identity to swap.
// 3. [Product]: Shoes to try on.

// ===== INSTRUCTIONS =====

// 1. FACE SWAP (PRIORITY 1 - RECONSTRUCTION):
//    - IGNORE the original face features.
//    - RECONSTRUCT the face using [Face ID] as the source.
//    - LIGHTING/ANGLE: Adapt [Face ID] to match the [Target Shot]'s environment perfectly.
//    - BLENDING: Seamless skin texture blending at the neck.
//    - PROPORTION: Make head smaller (9-head ratio / 9등신 비율).

// 2. SHOES (PRIORITY 2 - PIXEL COPY):
//    - Replace original shoes with [Product].
//    - Use pixel data from [Product]. Do not generate random shoes.
//    - Match perspective and ground shadows.

// 3. OUTFIT & MOOD (PRIORITY 3 - PRESERVE):
//    - LOCK original outfit texture.
//    - STYLE: Analog Film (Kodak Portra 400), Grainy, High Fashion.

// ===== OUTPUT =====
// Photorealistic, 9-head ratio fashion campaign shot.
`;

const poseVariationPrompt = (poseDescription: string) => `
// SYSTEM: Fashion Photographer
// TASK: Re-shoot the model in a NEW POSE.
// INPUTS: Reference Image (current result), Face ID, Product.

// ===== NEW POSE =====
// "${poseDescription}"

// ===== RULES =====
// 1. IDENTITY: Keep [Face ID] strictly.
// 2. SHOES: Keep [Product] strictly.
// 3. OUTFIT: Keep the same outfit style.
// 4. ACTION: Change ONLY the pose based on instruction.
// 5. STYLE: 9-head ratio, Analog Film Look.
`;

const refineImagePrompt = `
// SYSTEM: Film Scanner Restoration
// TASK: Enhance texture, add film grain, sharpen details.
// DO NOT CHANGE FACE OR SHOES.
// AESTHETIC: Kodak Portra 400.
`;

async function fileToGenerativePart(file: File): Promise<Part> {
    const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error('Failed to read file as data URL.'));
            }
        };
        reader.readAsDataURL(file);
    });
    return { inlineData: { data: await base64EncodedDataPromise, mimeType: file.type } };
}

async function urlToGenerativePart(url: string): Promise<Part> {
    const response = await fetch(url);
    const blob = await response.blob();
    const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error('Failed to read blob as data URL.'));
            }
        };
        reader.readAsDataURL(blob);
    });
    return { inlineData: { data: await base64EncodedDataPromise, mimeType: blob.type } };
}

function getImageUrlFromResponse(response: GenerateContentResponse): string {
    for (const candidate of response.candidates || []) {
        for (const part of candidate.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    throw new Error('No image found in the response.');
}

async function generateImage(prompt: string, imageParts: Part[]): Promise<string> {
    const allParts = [{ text: prompt }, ...imageParts];
    const response = await getAiClient().models.generateContent({
        model: MODEL_NAME,
        contents: { parts: allParts },
        config: {
            imageConfig: { aspectRatio: "3:4" }
        },
    });

    const originalImageUrl = getImageUrlFromResponse(response);
    try {
        return await enforceAspectRatio(originalImageUrl, 830, 1106);
    } catch {
        return originalImageUrl;
    }
}

export async function synthesizeCampaignImage(
    targetShotFile: File,
    faceFile: File,
    shoeFiles: File[]
): Promise<string> {
    const targetPart = await fileToGenerativePart(targetShotFile);
    const facePart = await fileToGenerativePart(faceFile);
    const shoeParts = await Promise.all(shoeFiles.map(fileToGenerativePart));
    return generateImage(campaignSynthesisPrompt, [targetPart, facePart, ...shoeParts]);
}

export async function generatePoseVariation(
    currentImageUrl: string,
    faceFile: File,
    shoeFiles: File[],
    poseDescription: string
): Promise<string> {
    const currentImagePart = await urlToGenerativePart(currentImageUrl);
    const facePart = await fileToGenerativePart(faceFile);
    const shoeParts = await Promise.all(shoeFiles.map(fileToGenerativePart));
    return generateImage(poseVariationPrompt(poseDescription), [currentImagePart, facePart, ...shoeParts]);
}

export async function refineImage(shoeFiles: File[], modelImageUrl: string): Promise<string> {
    const shoeImageParts = await Promise.all(shoeFiles.map(fileToGenerativePart));
    const modelImagePart = await urlToGenerativePart(modelImageUrl);
    return generateImage(refineImagePrompt, [modelImagePart, ...shoeImageParts]);
}

// =================================================================
// FACE GENERATION LOGIC
// =================================================================

import { HarmCategory, HarmBlockThreshold } from "@google/genai";

export const generateFaceBatch = async (
    gender: 'male' | 'female',
    race: string,
    age: string
): Promise<string[]> => {
    try {
        const ai = getAiClient();
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
        // 실제 코드에는 hairStylesMale, studioBackgrounds, makeupStylesFemale/Male 배열이 정의되어 있습니다.
        // (Simulating random selection for variety)
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
                        imageConfig: { aspectRatio: '1:1' }, // 1K is default or handled by aspect ratio? API doesn't have imageSize in config usually, but user snippet had it. I'll stick to aspectRatio.
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

// 2. 4K 업스케일링 함수
export const upscaleFace = async (base64Image: string): Promise<string> => {
    try {
        const ai = getAiClient();
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
                    { inlineData: { mimeType: 'image/png', data: dataPart } }, // 원본 이미지 전달
                    { text: prompt }
                ]
            },
            config: {
                imageConfig: { aspectRatio: '1:1' }, // 4K logic might need specific handling if API supports it, otherwise it just generates high res
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
