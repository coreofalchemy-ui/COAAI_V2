import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export interface CopywritingOutput {
    brandLine: string;        // e.g., "PREMIUM ESSENTIALS"
    productName: string;      // e.g., "URBAN STRIDE"
    subName: string;          // e.g., "MINIMAL BLACK"
    descriptionMain: string;  // 메인 설명
    stylingMatch: string;     // 룩/매칭 정보
    craftsmanship: string;    // 제작/소재 정보
    technology: string;       // 테크놀로지 (예: 오쏘라이트 인솔)
    specColor: string;
    specUpper: string;
    specLining: string;
    specOutsole: string;
    specOrigin: string;
    heelHeight: string;       // 굽 높이
    sizeGuide: string;        // 사이즈 추천 안내
}

/**
 * 5단계 설득형 카피라이팅 구조로 제품 이미지를 분석합니다.
 */
export async function generateAICopywriting(imageDataUrl: string): Promise<CopywritingOutput> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `당신은 패션/라이프스타일 브랜드를 위한 전문 카피라이터입니다.
아래 제품 이미지를 분석하여 **구매 전환 유도형 상세페이지 카피**를 작성해주세요.

# 분석 포인트
1. **Identity**: 브랜드/제품명/컨셉 (고급스러운 라인명 제안)
2. **Styling & Match**: 어떤 룩(고프코어, 미니멀 등), 어떤 하의(와이드 슬랙스, 데님 등)와 어울리는지 구체적으로 제안.
3. **Craftsmanship**: 소재의 질감, 마감 방식, 내구성 등 제작 디테일 설명.
4. **Technology**: 제품에 적용된 핵심 기술이나 소재 이름 (예: 오쏘라이트 인솔, 비브람 아웃솔 등). 없으면 그럴듯한 기술명 제안.
5. **Specs**: 색상, 소재, 굽 높이 등 스펙 추정.

---

# 출력 형식 (JSON)
아래 JSON 형식으로만 응답해주세요. 다른 설명은 포함하지 마세요.

{
  "brandLine": "브랜드/라인명 (영문 대문자, 10자 이내)",
  "productName": "제품명 (영문 또는 한글, 15자 이내)",
  "subName": "서브네임/컨셉 (영문 대문자, 15자 이내)",
  "descriptionMain": "제품의 매력을 어필하는 메인 설명 (200-300자, 한글)",
  "stylingMatch": "어떤 룩/바지/자켓과 매칭하면 좋은지, 색상 조합 등 스타일링 팁 (100-150자, 한글)",
  "craftsmanship": "제작 방식, 소재의 특성, 마감 퀄리티, 기능성 등 설명 (100-150자, 한글)",
  "technology": "핵심 기술명 (예: 오쏘라이트 인솔, 에어 쿠션 등) - 짧게",
  "specColor": "색상명 (예: Matte Black)",
  "specUpper": "겉감 소재 (예: Suede, Leather)",
  "specLining": "안감 소재 (예: Textile)",
  "specOutsole": "밑창 소재 (예: Rubber)",
  "specOrigin": "원산지 (예: Made in KOREA)",
  "heelHeight": "굽 높이 추정 (예: 3.5cm)",
  "sizeGuide": "사이즈 추천 안내 (100자 이내, 핏감 및 사이즈 선택 가이드)"
}
`;

    try {
        // 이미지 데이터 준비
        const base64Data = imageDataUrl.split(',')[1];
        const mimeType = imageDataUrl.match(/data:([^;]+);/)?.[1] || 'image/jpeg';

        const result = await model.generateContent([
            { text: prompt },
            {
                inlineData: {
                    mimeType,
                    data: base64Data
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();

        // JSON 파싱
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');
        }

        const copyData: CopywritingOutput = JSON.parse(jsonMatch[0]);
        return copyData;

    } catch (error) {
        console.error('AI 카피라이팅 생성 오류:', error);

        // 기본값 반환 (에러 시 fallback)
        return {
            brandLine: "HERITAGE LINE",
            productName: "TREK MASTER",
            subName: "EARTH BROWN",
            descriptionMain: "주말마다 가벼운 트레킹을 즐기는 당신을 위해 탄생한 TREK MASTER. 부드러운 스웨이드 갑피는 편안한 착화감을 선사하며, 섬세한 스티치 디테일은 견고함을 더합니다.",
            stylingMatch: "카고 팬츠와 아웃도어 재킷을 매치하여 고프코어룩을 연출하거나, 데님 팬츠와 톤온톤 니트를 코디하여 캐주얼한 스타일을 완성해보세요.",
            craftsmanship: "이중 스티치 공법으로 내구성을 극대화했으며, 통기성이 우수한 메쉬 안감을 사용하여 쾌적함을 유지합니다.",
            technology: "오쏘라이트 인솔",
            specColor: "Earth Brown",
            specUpper: "Suede",
            specLining: "Textile",
            specOutsole: "Rubber",
            specOrigin: "Made in KOREA",
            heelHeight: "3.5cm",
            sizeGuide: "정사이즈로 출시되었으며, 발볼이 넓거나 두꺼운 양말을 착용할 경우 반 사이즈 크게 선택하는 것을 추천합니다."
        };
    }
}
