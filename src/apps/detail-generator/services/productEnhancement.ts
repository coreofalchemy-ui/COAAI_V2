import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export type ProductEffect =
    'beautify' |
    'studio_minimal_prop' |
    'studio_natural_floor' |
    'studio_texture_emphasis' |
    'studio_cinematic';

export interface ProductEnhancementResult {
    id: string;
    originalFileName: string;
    status: 'pending' | 'loading' | 'done' | 'error';
    url?: string;
    error?: string;
    processingStep?: string;
    effect: ProductEffect;
    poseInfo?: { id: string; name: string; };
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export const beautifyPoses: { id: string; name: string; }[] = [
    { id: 'left_profile_single', name: '측면 (왼쪽, 외발)' },
    { id: 'left_diagonal_single', name: '사선 (왼쪽, 외발)' },
    { id: 'front_apart_pair', name: '정면 (양발, 초밀착)' },
    { id: 'left_diagonal_pair', name: '사선 (양발, 초밀착)' },
    { id: 'rear_pair', name: '후면 (양발, 초밀착)' },
    { id: 'top_down_instep_pair', name: '탑다운 (발등 위주)' },
];

const getPromptForEffect = (effect: ProductEffect, poseId?: string): string => {
    const SYSTEM_ROLE = `**SYSTEM ROLE:** You are a "Technical 3D Product Visualization Engine" and "Master Retoucher".
**INPUT:** Raw reference photo of a shoe.
**OUTPUT:** A Photorealistic Commercial Asset (2K Resolution, Factory Fresh).

**[CRITICAL EXECUTION RULES]**
1. **IDENTITY LOCK:** The shoe's LOGO, STITCHING, LACE PATTERN, and DESIGN LINES must be a 100% PERFECT CLONE of the reference.
2. **QUANTITY & GEOMETRY:** Render EXACTLY the specified number of shoes. CENTERED (X=50%, Y=50%). Perfectly flat and horizontal ground plane.
3. **SURFACE RE-SYNTHESIS:** Re-render the surface to look "Factory Fresh". Remove all dust, wrinkles, glue marks, and scuffs.`;

    if (effect === 'beautify') {
        let poseInstruction = '';
        switch (poseId) {
            case 'left_profile_single': poseInstruction = '**[LAYOUT: SINGLE - LEFT SHOE - LATERAL (OUTER) PROFILE]** ONE SINGLE SHOE (LEFT foot). LATERAL VIEW. TOE POINTS LEFT. Centered. Horizontal.'; break;
            case 'left_diagonal_single': poseInstruction = '**[LAYOUT: SINGLE - 3/4 ISOMETRIC]** ONLY 1 SHOE. 45-Degree Front-Left view. Centered.'; break;
            case 'front_apart_pair': poseInstruction = '**[LAYOUT: PAIR - FRONT VIEW]** 2 SHOES. Side-by-side. GAP < 5%. Front view. Centered.'; break;
            case 'rear_pair': poseInstruction = '**[LAYOUT: PAIR - REAR VIEW]** 2 SHOES. Side-by-side, heels aligned. GAP < 5%. Rear view.'; break;
            case 'top_down_instep_pair': poseInstruction = '**[LAYOUT: PAIR - HIGH ANGLE]** 60-Degree Elevation. Focus on Laces and Vamp. GAP < 5%.'; break;
            case 'left_diagonal_pair': poseInstruction = '**[LAYOUT: PAIR - DIAGONAL VIEW]** 2 SHOES. Both angled 45 degrees left. One slightly forward. GAP < 5%.'; break;
            default: poseInstruction = '**LAYOUT:** Standard Commercial Center.';
        }
        return `${SYSTEM_ROLE}\n**[TASK: ANTI-GRAVITY ISOLATION RENDER]**\n${poseInstruction}\n**[RETOUCHING]** LIGHTING: Softbox Studio Strobe. COLOR: FORCE NEUTRAL (5500K). Blacks = JET BLACK. Whites = Crisp white. BACKGROUND: PURE WHITE (#FFFFFF). No cast shadows.`;
    }

    const studioBase = `${SYSTEM_ROLE}\n**[TASK: HIGH-END EDITORIAL CAMPAIGN]**\nFORMAT: Horizontal Landscape (4:3). Product fills 85% width. Perfectly Centered.`;

    if (effect === 'studio_minimal_prop') return `${studioBase}\n**SCENE: HIGH-END COSMETIC STYLING** Shoe as luxury perfume. Props: Frosted Glass/Raw Stone BESIDE or BEHIND shoe (NEVER on top). Soft monochromatic background. Beauty Dish lighting.`;
    if (effect === 'studio_natural_floor') return `${studioBase}\n**SCENE: URBAN SUNLIGHT** Concrete floor. Hard Sunlight (5500K). Gobo shadow (window frame). Energetic vibe.`;
    if (effect === 'studio_texture_emphasis') return `${studioBase}\n**SCENE: DARK MODE DETAIL** Dark Charcoal Grey (#333333) background. Low-angle Raking Light. Premium vibe.`;
    if (effect === 'studio_cinematic') return `${studioBase}\n**SCENE: FUTURE RUNWAY** Glossy wet black floor. Low-lying fog. Levitation illusion. God Ray spotlight.`;

    return `${SYSTEM_ROLE} Photorealistic product shot.`;
};

export const applyProductEffect = async (
    files: File[],
    effect: ProductEffect,
    onProgressUpdate: (message: string) => void,
    poseId?: string
): Promise<string> => {
    onProgressUpdate('프롬프트 구성 중...');
    const prompt = getPromptForEffect(effect, poseId);

    const imageParts = [];
    for (const file of files) {
        imageParts.push({ inlineData: { data: await fileToBase64(file), mimeType: file.type } });
    }

    onProgressUpdate('AI 렌더링 실행 중...');
    const response = await genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' }).generateContent({
        contents: [{ role: 'user', parts: [...imageParts, { text: prompt }] }],
        generationConfig: {
            responseMimeType: 'image/png',
        }
    });

    onProgressUpdate('완료');

    const candidate = response.response.candidates?.[0];
    if (!candidate?.content?.parts?.[0]?.inlineData) {
        throw new Error('이미지 생성 실패');
    }

    const part = candidate.content.parts[0];
    return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
};
