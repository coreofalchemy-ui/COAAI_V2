import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { GoogleGenAI, type Part } from '@google/genai';

// ============================================================================
// [ANTI-GRAVITY ENGINE] CORE CONFIGURATION
// ============================================================================

// Type Definitions
export type Effect =
    | 'beautify'
    | 'studio_minimal_prop'
    | 'studio_natural_floor'
    | 'studio_texture_emphasis'
    | 'studio_cinematic'
    | 'custom';

// Helper: File to Base64 (Full Data URI)
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

// Helper: File to Raw Base64 (For API)
const fileToRawBase64 = async (file: File): Promise<string> => {
    const base64Url = await fileToBase64(file);
    return base64Url.split(',')[1];
};

// Helper: Get GenAI Client (New SDK)
const getGenAIClient = () => {
    // @ts-ignore
    return new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY });
};

/**
 * 효과(Effect) 및 포즈(Pose)에 따른 3D 렌더링 프롬프트를 생성합니다.
 * 이 함수가 엔진의 '두뇌' 역할을 합니다.
 */
const getPromptForEffect = (effect: Effect, poseId?: string): string => {

    // 1. SYSTEM PERSONA (핵심 역할 정의)
    // AI를 단순 편집자가 아닌 '3D 제품 시각화 엔진'으로 정의합니다.
    const SYSTEM_ROLE = `
**SYSTEM ROLE:** You are a "Technical 3D Product Visualization Engine" and "Master Retoucher".
**INPUT:** Raw reference photo of a shoe.
**OUTPUT:** A Photorealistic Commercial Asset (2K Resolution, Factory Fresh).

**[CRITICAL EXECUTION RULES]**
1.  **IDENTITY LOCK (Non-Negotiable):** 
    *   The shoe's LOGO, STITCHING, LACE PATTERN, and DESIGN LINES must be a 100% PERFECT CLONE of the reference.
    *   DO NOT hallucinate new features.
2.  **QUANTITY & GEOMETRY:**
    *   "SINGLE" mode = Render EXACTLY ONE shoe. Crop out or erase any partial second shoe.
    *   "PAIR" mode = Render EXACTLY TWO shoes.
    *   **ALIGNMENT:** The object must be visually CENTERED (X=50%, Y=50%). 
    *   **HORIZON:** The ground plane must be perfectly flat and horizontal.
3.  **SURFACE RE-SYNTHESIS (CGI MODE):**
    *   Treat the input as a "Geometry Reference Only".
    *   **DO NOT COPY PIXELS.** Re-render the surface to look "Factory Fresh".
    *   Remove all dust, wrinkles, glue marks, and scuffs.
    *   Fix lens distortion.
`;

    // 2. MODULE: BEAUTIFY (안티그래비티 아이솔레이션)
    if (effect === 'beautify') {
        let poseInstruction = '';

        // 포즈별 정밀 레이아웃 지시 (Strict Layout - Landscape)
        switch (poseId) {
            case 'left_profile_single':
                poseInstruction = `
                **[LAYOUT: SINGLE - LEFT PROFILE]**
                *   **QUANTITY:** ONLY 1 SHOE (Left Foot). [NEGATIVE: Pair, Double, Mirror].
                *   **ANGLE:** Perfect Side Profile (90 deg). Toe pointing Left.
                *   **COMPOSITION:** Horizontal Canvas. Shoe fills 85% width. Dead Center.
                `;
                break;
            case 'left_diagonal_single':
                poseInstruction = `
                **[LAYOUT: SINGLE - 3/4 ISOMETRIC]**
                *   **QUANTITY:** ONLY 1 SHOE (Left Foot). [NEGATIVE: Pair, Second shoe].
                *   **ANGLE:** 45-Degree Front-Left view. Best Angle.
                *   **COMPOSITION:** Horizontal Canvas. Shoe fills 85% width. Dead Center.
                `;
                break;
            case 'front_apart_pair':
                poseInstruction = `
                **[LAYOUT: PAIR - FRONT VIEW]**
                *   **QUANTITY:** 2 SHOES (Left & Right).
                *   **ARRANGEMENT:** Side-by-side. **GAP < 5% (Very Tight)**.
                *   **ANGLE:** Direct Front view.
                *   **COMPOSITION:** Horizontal Canvas. Pair fills 90% width.
                `;
                break;
            case 'rear_pair':
                poseInstruction = `
                **[LAYOUT: PAIR - REAR VIEW]**
                *   **QUANTITY:** 2 SHOES (Left & Right).
                *   **ARRANGEMENT:** Side-by-side, heels aligned. **GAP < 5% (Very Tight)**.
                *   **ANGLE:** Direct Rear view.
                `;
                break;
            case 'top_down_instep_pair':
                poseInstruction = `
                **[LAYOUT: PAIR - HIGH ANGLE]**
                *   **ANGLE:** 60-Degree Elevation (Looking down).
                *   **CRITICAL:** Hide the deep insole/heel cup. Focus on Laces and Vamp.
                *   **ARRANGEMENT:** **GAP < 5% (Very Tight)**.
                `;
                break;
            case 'left_diagonal_pair':
                poseInstruction = `
                **[LAYOUT: PAIR - DIAGONAL VIEW]**
                *   **QUANTITY:** 2 SHOES.
                *   **ANGLE:** Both angled 45 degrees left.
                *   **ARRANGEMENT:** One slightly forward. **GAP < 5% (Very Tight)**.
                `;
                break;
            default:
                poseInstruction = '**LAYOUT:** Standard Commercial Center.';
        }

        return `${SYSTEM_ROLE}
**[TASK: ANTI-GRAVITY ISOLATION RENDER]**

${poseInstruction}

**[RETOUCHING & LIGHTING ENGINE]**
1.  **LIGHTING RESET:** Delete original lighting. Use **"Softbox Studio Strobe"**. Even illumination.
2.  **COLOR GRADING:** 
    *   **White Balance:** FORCE NEUTRAL (5500K). Remove ALL yellow/orange indoor tints.
    *   **Blacks:** FORCE "JET BLACK" (#050505). Remove brown reflections.
    *   **Whites:** Crisp, clean white. No cream tint.
3.  **BACKGROUND:** PURE WHITE (#FFFFFF). No cast shadows (Floating).

**OUTPUT:** Generate an IMAGE. Do not output text.
`;
    }

    // 3. MODULE: STUDIO BASE (스튜디오 공통 설정 - 가로형)
    const studioBase = `${SYSTEM_ROLE}
**[TASK: HIGH-END EDITORIAL CAMPAIGN]**
**FORMAT:** Horizontal Landscape (4:3).
**COMPOSITION:** Product fills 85% width. 5% Padding. Perfectly Centered.
`;

    // 4. MODULE: MINIMAL PROP
    if (effect === 'studio_minimal_prop') {
        return `${studioBase}
**SCENE: "MODERN ARCHITECTURE"**
*   **Background:** Matte Off-White (#F0F0F0) wall, polished concrete floor.
*   **Prop:** Single geometric concrete cube or cylinder. Shoe leaning against it.
*   **Lighting:** Softbox Window Light (Top-Left). Soft, diffused shadows.
*   **Vibe:** Calm, museum-like, sophisticated.

**OUTPUT:** Generate an IMAGE. Do not output text.
`;
    }

    // 5. MODULE: NATURAL FLOOR
    if (effect === 'studio_natural_floor') {
        return `${studioBase}
**SCENE: "URBAN SUNLIGHT"**
*   **Background:** Rough textured pavement or bright concrete.
*   **Lighting:** Hard Sunlight (Direct Sun, 5500K). High contrast.
*   **Shadow:** Cast a "Gobo" shadow (Window frame or Plant leaf) across the floor.
*   **Vibe:** Energetic, organic, summer street.

**OUTPUT:** Generate an IMAGE. Do not output text.
`;
    }

    // 6. MODULE: TEXTURE EMPHASIS
    if (effect === 'studio_texture_emphasis') {
        return `${studioBase}
**SCENE: "DARK MODE DETAIL"**
*   **Background:** Dark Charcoal Grey (#333333) seamless infinity wall.
*   **Lighting:** Low-angle "Raking Light". Grazes the surface to pop texture depth (suede/mesh).
*   **Vibe:** Masculine, technical, heavy, premium.

**OUTPUT:** Generate an IMAGE. Do not output text.
`;
    }

    // 7. MODULE: CINEMATIC
    if (effect === 'studio_cinematic') {
        return `${studioBase}
**SCENE: "FUTURE RUNWAY"**
*   **Background:** Glossy wet black floor.
*   **Atmosphere:** Low-lying fog/mist/dry-ice.
*   **Action:** "Levitation" illusion (Shoe floating slightly above ground).
*   **Lighting:** Top-down "God Ray" spotlight. Rim lighting on edges.

**OUTPUT:** Generate an IMAGE. Do not output text.
`;
    }

    // 8. MODULE: CUSTOM BACKGROUND
    if (effect === 'custom') {
        return `${SYSTEM_ROLE}
**[TASK: COMPOSITE BLENDING]**
*   **Instruction:** Seamlessly integrate the shoe into the provided custom background.
*   **Match:** Perspective, Light direction, and Shadow casting.
*   **Output:** Photorealistic composite.

**OUTPUT:** Generate an IMAGE. Do not output text.
`;
    }

    return `${SYSTEM_ROLE} Photorealistic product shot. \n**OUTPUT:** Generate an IMAGE.`;
}

// ============================================================================
// [ANTI-GRAVITY ENGINE] API HANDLERS
// ============================================================================

/**
 * 메인 이미지 생성 함수
 */
export const applyShoeEffect = async (
    files: File[],
    effect: Effect,
    onProgressUpdate: (message: string) => void,
    customBackground: File | null,
    poseId?: string
): Promise<string> => {
    // 1. Init
    // @ts-ignore
    const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY });

    onProgressUpdate('Anti-Gravity: 프롬프트 구성 및 시나리오 로드...');
    const prompt = getPromptForEffect(effect, poseId);

    // 2. Payload Construction
    const imageParts: Part[] = [];

    // 배경 이미지가 있으면 먼저 추가 (참조용)
    if (effect === 'custom' && customBackground) {
        imageParts.push({ inlineData: { data: await fileToRawBase64(customBackground), mimeType: customBackground.type } });
    }

    // 원본 신발 이미지 추가
    for (const file of files) {
        imageParts.push({ inlineData: { data: await fileToRawBase64(file), mimeType: file.type } });
    }

    const parts = [...imageParts, { text: prompt }];

    // 3. Gemini 2.0 Flash Call (Multimodal)
    onProgressUpdate('Anti-Gravity: 3D 렌더링 및 리터칭 실행...');
    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp', // Reverted to Gemini 2.0 Flash
        contents: { parts },
        config: {
            // responseModalities: [Modality.IMAGE], // Removed to avoid INVALID_ARGUMENT
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
            ]
        },
    });

    onProgressUpdate('최종 후처리 중...');

    // 4. Response Handling
    if (response.promptFeedback?.blockReason) {
        throw new Error(`생성 차단됨 (사유: ${response.promptFeedback.blockReason})`);
    }

    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts?.[0]) {
        console.error('Generation failed. Full response:', JSON.stringify(response, null, 2));
        throw new Error('오류: 이미지가 생성되지 않았습니다.');
    }

    for (const part of candidate.content.parts) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
    }

    // If we get here, we have parts but no inlineData (likely text)
    const textPart = candidate.content.parts.find(p => p.text);
    console.error('Image data missing. Response text:', textPart?.text);
    console.error('Full response:', JSON.stringify(response, null, 2));

    throw new Error(`이미지 데이터 누락. 모델 응답: ${textPart?.text?.slice(0, 100) || '없음'}`);
};

/**
 * 색상 변경 (Color Change) 함수
 */
export const applyColorChange = async (
    baseImageFile: File,
    onProgressUpdate: (message: string) => void,
    selectedColor: string | null,
    customColorImage: File | null,
): Promise<string> => {
    // @ts-ignore
    const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY });
    onProgressUpdate('소재 분석 및 마스킹 영역 계산...');

    const colorInstruction = customColorImage
        ? `**Target Color:** Extract dominant color from the reference image.`
        : `**Target Color:** HEX ${selectedColor}.`;

    const colorChangePrompt = `
**SYSTEM ROLE:** Expert Digital Retoucher.
**TASK:** Recolor the UPPER material only.
**CONSTRAINT:** Keep OUTSOLE and LOGO 100% UNTOUCHED.
**OUTPUT FORMAT:** Generate an IMAGE. Do not output text.

**EXECUTION:**
1.  **Masking:** Isolate 'Upper' material.
2.  **Color:** Apply ${colorInstruction}.
3.  **Realism:** Preserve stitching, grain, and highlights.
4.  **Lighting:** Blend naturally with existing light.
`;

    const parts = [
        { inlineData: { data: await fileToRawBase64(baseImageFile), mimeType: baseImageFile.type } },
        { text: colorChangePrompt }
    ];

    if (customColorImage) {
        parts.push({ inlineData: { data: await fileToRawBase64(customColorImage), mimeType: customColorImage.type } });
    }

    onProgressUpdate('Anti-Gravity: 색상 적용 렌더링...');
    const colorResponse = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp', // Reverted to Gemini 2.0 Flash
        contents: { parts },
        config: {
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
            ]
        },
    });

    onProgressUpdate('완료');

    const finalCandidate = colorResponse.candidates?.[0];
    if (!finalCandidate?.content?.parts?.[0]) {
        throw new Error('색상 변경 실패');
    }

    for (const part of finalCandidate.content.parts) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
    }
    throw new Error('이미지 데이터 반환 실패');
};

/**
 * DetailStorageApp 호환성 래퍼 함수 (Legacy Support)
 */
export const enhanceProductImage = async (file: File, effect: string, pose: string): Promise<Blob> => {
    // 'standard' 효과를 'beautify'로 매핑
    const targetEffect: Effect = effect === 'standard' ? 'beautify' : (effect as Effect);

    // applyShoeEffect 호출
    const base64 = await applyShoeEffect([file], targetEffect, (msg) => console.log(msg), null, pose);

    // Base64 -> Blob 변환
    const response = await fetch(base64);
    return await response.blob();
};

/**
 * 텍스트 채팅 함수 (Gemini Chat)
 */
export const chatWithGemini = async (
    message: string,
    history: { role: 'user' | 'model', parts: { text: string }[] }[]
): Promise<string> => {
    // Use GoogleGenerativeAI (Old SDK) for chat functionality as it supports startChat
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error("API key not found");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const chat = model.startChat({
        history: history,
        generationConfig: {
            maxOutputTokens: 1000,
        },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text();
};

/**
 * Generate a batch of 5 realistic K-pop style faces
 */
export const generateFaceBatch = async (
    gender: 'male' | 'female',
    race: string,
    age: string
): Promise<string[]> => {
    try {
        const ai = getGenAIClient();
        const genderTerm = gender === 'male' ? 'male' : 'female';

        // 1. Race mapping
        const raceMapping: Record<string, string> = {
            "한국인": "Korean",
            "코리안": "Korean",
            "동아시아인": "East Asian",
            "아시아인": "East Asian",
            "백인": "White",
            "흑인": "Black",
            "히스패닉": "Hispanic/Latino",
            "중동인": "Middle Eastern",
            "혼혈": "Mixed race"
        };
        const englishRace = raceMapping[race] || "Korean";

        // 2. Age-based skin details
        const numericAge = parseInt(age, 10);
        let ageDetails = "";

        if (Number.isNaN(numericAge)) {
            ageDetails = "Realistic Korean skin texture for their age range, visible pores, subtle redness, very light imperfections, no beauty filter.";
        } else if (numericAge <= 25) {
            ageDetails = "Youthful Korean skin with visible but fine pores, natural glow, slight redness around nose and cheeks, tiny blemishes, no heavy smoothing.";
        } else if (numericAge <= 35) {
            ageDetails = "Fresh but mature Korean skin texture with micropores, very faint fine lines, natural tone variation, realistic under-eye texture.";
        } else {
            ageDetails = "Mature Korean skin texture with fine lines, slight wrinkles, sunspots, realistic pores and unevenness, still elegant and healthy.";
        }

        // 3. Vibe and texture keywords
        const vibeKeywords = gender === 'female'
            ? "realistic K-pop female idol vibe, Seoul street casting, trendy but approachable, natural charm, modern K-beauty mood"
            : "realistic K-pop male idol vibe, Seoul street casting, chic but approachable, calm charisma, modern K-beauty mood";

        const textureKeywords = "hyper-detailed Korean skin texture, visible fine pores, subtle peach fuzz, small imperfections, realistic under-eye area, natural nasolabial folds, slight asymmetry, no plastic smooth skin, no filter-like beauty effect";

        // 4. Style variations
        const hairStylesFemale = [
            "long straight black hair with soft layers and natural shine",
            "medium length hime cut inspired style, clean but modern",
            "soft wavy hair with see-through bangs, natural volume",
            "low ponytail with loose front pieces framing the face",
            "short chic bob cut with slight C-curl at the ends"
        ];
        const hairStylesMale = [
            "short clean cut Korean men's hairstyle",
            "medium two-block style with textured top",
            "classic Korean side-parted hair",
            "soft messy fringe hairstyle",
            "clean undercut with natural volume"
        ];
        const hairStyles = gender === 'female' ? hairStylesFemale : hairStylesMale;

        const studioBackgrounds = [
            "solid light grey Korean studio backdrop with soft gradient",
            "clean warm beige backdrop used in beauty editorials",
            "cool pale blue seamless studio background",
            "subtle pastel mint studio wall with very soft texture",
            "solid off-white background with slight falloff in light"
        ];

        const makeupStylesFemale = [
            "Natural Korean makeup with soft peach tones",
            "Fresh dewy look with minimal color",
            "Elegant makeup with defined eyes",
            "Soft pink tones with glossy lips",
            "Clean beauty look with natural brows"
        ];
        const makeupStylesMale = [
            "Natural grooming, clean skin, no makeup",
            "Light BB cream for even tone only",
            "Fresh clean look, natural eyebrows",
            "Minimal grooming, natural appearance",
            "Clean skin with subtle enhancement"
        ];
        const makeupStyles = gender === 'female' ? makeupStylesFemale : makeupStylesMale;

        const targetLook = gender === 'male' ? "Handsome K-Pop Idol / Actor Visual" : "Beautiful K-Pop Idol / Actress Visual";
        const faceDescription = gender === 'male' ? "Sharp jawline, symmetrical features, masculine but clean" : "Small face, symmetrical features, feminine and elegant";
        const sectionTitle = gender === 'male' ? "[GROOMING & STYLING]" : "[MAKEUP]";

        // 5. Generate 4 images in parallel
        const promises = Array(4)
            .fill(null)
            .map(async (_, idx) => {
                try {
                    const hairStyle = hairStyles[idx % hairStyles.length] || "Clean hair";
                    const bg = studioBackgrounds[idx % studioBackgrounds.length] || "Studio background";
                    const makeup = makeupStyles[idx % makeupStyles.length] || "Natural look";

                    const prompt = `
[SUBJECT]
Ultra-detailed close-up portrait of a ${age}-year-old ${englishRace} ${genderTerm},
inspired by realistic K-pop idol photography in Seoul.
Target Look: ${targetLook}.
Facial Features: ${faceDescription}.
Casting style: street-casting K-pop idol, natural but charismatic.

[VIBE]
${vibeKeywords}

[FACE AND SKIN]
${textureKeywords}
${ageDetails}
Natural Korean skin tone, slight variation between forehead, cheeks, and nose.
Subtle highlight on nose bridge and cheekbones, natural shadow under jawline.
Under-eye area stays realistic, not overly brightened.
Slight natural asymmetry is allowed and preferred.

[HAIR]
${hairStyle}

${sectionTitle}
${makeup}

[CROP AND FRAMING]
Framed from shoulders and neck up, focus on the face.
No visible clothing logos.
Neutral, non-sexual presentation.

[BACKGROUND]
${bg}
Simple, clean, and even lighting on the background to make the face stand out.
Easy to cut out for design use.

[STYLE]
High-end Korean idol photoshoot for an album concept photo.
Shot on a professional digital camera or high-end film camera.
Direct or semi-direct soft flash to give trendy K-pop look.
Full color only, no black and white, no monochrome.
Minimal retouching, keep skin texture and pores visible.

[AVOID]
Do not make the face look like an AI-generated doll.
Do not over-smooth the skin.
No anime style, no illustration, no 3D render.

[OUTPUT]
Generate an IMAGE. Do not output text.
`;
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.0-flash-exp', // Reverted to Gemini 2.0 Flash
                        contents: { parts: [{ text: prompt }] },
                        config: {
                            safetySettings: [
                                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
                            ]
                        }
                    });

                    const candidate = response.candidates?.[0];
                    if (candidate?.content?.parts) {
                        for (const part of candidate.content.parts) {
                            if (part.inlineData) {
                                return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                            }
                        }
                    }
                    return null;
                } catch (e) {
                    console.error('Face generation error:', e);
                    return null;
                }
            });

        const results = await Promise.all(promises);
        return results.filter((r): r is string => r !== null);
    } catch (e) {
        console.error('generateFaceBatch error:', e);
        throw e;
    }
};

/**
 * Upscale a face image using Gemini 2.0 Flash (Client-side)
 */
export const upscaleFace = async (
    faceBase64: string
): Promise<string> => {
    try {
        const ai = getGenAIClient();
        const faceData = faceBase64.split(',')[1] || faceBase64;

        const prompt = `
[TASK]
Upscale this face image to 4K resolution.
Enhance skin texture, eye details, and hair strands.
Keep the identity 100% same.
Do not change the face. Just improve quality.
OUTPUT: Generate an IMAGE.
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp', // Reverted to Gemini 2.0 Flash
            contents: {
                parts: [
                    { inlineData: { data: faceData, mimeType: 'image/png' } },
                    { text: prompt }
                ]
            },
            config: {
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
                ]
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data: ${part.inlineData.mimeType}; base64, ${part.inlineData.data} `;
            }
        }
        throw new Error("Upscaling failed: No image returned");
    } catch (e) {
        console.error('upscaleFace error:', e);
        throw e;
    }
};

/**
 * Extract product info from images using Gemini 2.0 Flash (Client-side)
 */
export const extractProductInfoFromImages = async (
    images: { base64: string; mimeType: string }[],
    promptText: string
): Promise<any> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error("API key not found");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: { responseMimeType: "application/json" }
    });

    const parts = [
        ...images.map(img => ({
            inlineData: {
                mimeType: img.mimeType,
                data: img.base64.split(',')[1] || img.base64 // Ensure raw base64
            }
        })),
        { text: promptText }
    ];

    const result = await model.generateContent(parts);
    const response = result.response;
    const text = response.text();

    try {
        // Robust JSON extraction: Find the first '{' and last '}'
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}');

        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            const jsonString = text.substring(startIndex, endIndex + 1);
            return JSON.parse(jsonString);
        }

        // Fallback: Try parsing the whole text if no braces found (unlikely for JSON)
        return JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse JSON response:", text);
        throw new Error("AI 응답을 분석할 수 없습니다. (JSON 파싱 실패)");
    }
};

/**
 * Swap face in target image with source face
 */
export const swapFace = async (
    sourceFaceBase64: string,
    targetImageFile: File
): Promise<string> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error("API key not found");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
            temperature: 0.4,
            topP: 0.95,
        }
    });

    const sourceData = sourceFaceBase64.split(',')[1] || sourceFaceBase64;
    const sourceMimeMatch = sourceFaceBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
    const sourceMime = sourceMimeMatch ? sourceMimeMatch[1] : 'image/png';

    const targetBase64 = await fileToBase64(targetImageFile);
    const targetData = targetBase64.split(',')[1] || targetBase64;

    const prompt = `
**SYSTEM ROLE:** "NanoBanana 3.0" - Advanced Photorealistic Compositing Engine.
**TASK:** Synthesize the [SOURCE FACE] onto the [BASE MODEL BODY].

**[CRITICAL ALGORITHM: SKULL CLAMPING]**
1.  **GEOMETRY LOCK:** The [BASE MODEL]'s head shape, skull size, and jawline width are the **IMMUTABLE CONTAINER**.
2.  **FIT:** You MUST warp/shrink/resize the [SOURCE FACE] to fit *inside* the [BASE MODEL]'s original head boundaries.
    *   *Strict Rule:* The resulting head size MUST NOT exceed the original base model's head size.
3.  **ALIGNMENT:** Align eyes and mouth to the [BASE MODEL]'s original facial landmarks.

**[LIGHTING MAP TRANSFER]**
1.  **ANALYSIS:** Analyze the lighting direction, shadow hardness, and color temperature on the [BASE MODEL]'s neck and shoulders.
2.  **TRANSFER:** Apply this *exact* lighting map to the new face.
    *   *Shadows:* If the neck has a hard shadow on the left, the face MUST have a matching hard shadow on the left.
    *   *Tone:* Match the skin undertone (Cool/Warm) of the body exactly.

**[RESOLUTION MATCHING & GRAIN]**
1.  **DOWNSAMPLING:** The [SOURCE FACE] is likely higher resolution than the body. You MUST **degrade** the face quality to match the body.
2.  **GRAIN MATCHING:** Analyze the ISO noise/film grain of the [BASE MODEL]'s clothing. Apply the SAME noise pattern to the face.
3.  **NO "GLOW":** The face should NOT look brighter or smoother than the body. It must look like it was shot with the same camera, same lens, at the same time.

**[EXPRESSION & MANNER]**
1.  **EXPRESSION:** Ignore the [SOURCE FACE]'s expression. **COPY THE [BASE MODEL]'s ORIGINAL EXPRESSION.**
    *   If Base Model is smiling, the result must smile.
    *   If Base Model is serious, the result must be serious.
2.  **VIBE:** The final image must retain the exact "Mood" and "Atmosphere" of the [BASE MODEL] photo.

**[OUTPUT RULES]**
*   **SHOES:** The shoes in the [BASE MODEL] photo must be preserved 100% pixel-perfect.
*   **CLOTHING:** Do not change the clothing.
*   **FORMAT:** Generate a high-quality PHOTOGRAPH. Do not output text.
`;

    const result = await model.generateContent([
        { text: "SOURCE FACE (High Res Identity):" },
        { inlineData: { mimeType: sourceMime, data: sourceData } },
        { text: "BASE MODEL (Geometry & Lighting Reference):" },
        { inlineData: { mimeType: targetImageFile.type, data: targetData } },
        { text: prompt }
    ]);
    const response = result.response;

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("Face swap failed: No image returned");
};

// ============================================================================
// [ANTI-GRAVITY ENGINE] SHOE REPLACEMENT
// ============================================================================

/**
 * Replace shoes in a model image with a reference product.
 */
export const replaceShoesInImage = async (
    sourceImageFile: File,
    productImageFiles: File[]
): Promise<string> => {
    const client = getGenAIClient();

    // Fix: Ensure raw base64
    const srcBase64Full = await fileToBase64(sourceImageFile);
    const srcBase64 = srcBase64Full.split(',')[1] || srcBase64Full;

    // Limit to 2 reference images for speed
    const refs = await Promise.all(productImageFiles.slice(0, 2).map(async f => {
        const b64 = await fileToBase64(f);
        return {
            inlineData: { data: b64.split(',')[1] || b64, mimeType: f.type }
        };
    }));

    const EDITING_PROMPT = `
                    [TASK] Precise Object Replacement
                    [INSTRUCTION] Replace the shoes in Image 1 with the Reference Product.
    [CRITICAL RULES]
                    1. Target: Change ONLY the shoes.
    2. Preservation: The model's face, skin, legs, clothing, and background MUST remain pixel-perfect.
                    3. Integration: Match lighting and perspective.
    [OUTPUT]
    Generate an IMAGE. Do not output text.
    `;

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.0-flash-exp', // Reverted to Gemini 2.0 Flash
            contents: [
                { text: "Edit Image 1 using references." },
                { inlineData: { data: srcBase64, mimeType: sourceImageFile.type } },
                ...refs,
                { text: EDITING_PROMPT }
            ],
            config: {
                // responseMimeType: 'application/json' 
            }
        });

        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part && part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }

        throw new Error("Shoe replacement failed: No image returned");
    } catch (e) {
        console.error('replaceShoesInImage error:', e);
        throw e;
    }
};
