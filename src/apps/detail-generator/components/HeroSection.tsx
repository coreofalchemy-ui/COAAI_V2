import React from 'react';

interface HeroSectionProps {
    content: any;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ content }) => {
    const data = content || {};

    return (
        <div data-section="hero" className="hero-section" style={{ padding: '60px 40px', maxWidth: '1000px', margin: '0 auto', fontFamily: "'Noto Sans KR', sans-serif", color: '#333', backgroundColor: 'white' }}>
            {/* Brand Line */}
            <div style={{ fontSize: '11px', letterSpacing: '1px', color: '#888', marginBottom: '10px', fontWeight: 500 }}>
                {data.brandLine || 'BRAND NAME'}
            </div>

            {/* Product Name */}
            <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 30px 0', lineHeight: 1.2 }}>
                {data.productName || 'Sample Product'}
                <span style={{ fontWeight: 300, color: '#ccc', margin: '0 8px' }}>—</span>
                <span style={{ color: '#666' }}>{data.subName || 'Color / Model'}</span>
            </h1>

            {/* Paragraph 1 (Styling) */}
            <div style={{ marginBottom: '20px', fontSize: '14px', lineHeight: 1.7, color: '#444' }}>
                {data.stylingMatch || '스타일링 매치 설명이 들어갑니다.'}
            </div>

            {/* Paragraph 2 (Craftsmanship) */}
            <div style={{ marginBottom: '40px', fontSize: '14px', lineHeight: 1.7, color: '#444' }}>
                {data.craftsmanship || '제작 공정 및 소재 설명이 들어갑니다.'}
            </div>

            {/* Technology */}
            <div style={{ backgroundColor: '#f9fafb', borderLeft: '4px solid #111', padding: '20px', marginBottom: '40px', borderRadius: '0 8px 8px 0' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700, color: '#111' }}>Technology</h3>
                <p style={{ margin: '0', fontSize: '13px', color: '#555', lineHeight: 1.6 }}>
                    {data.technology || '핵심 기술 설명이 들어갑니다.'}
                </p>
            </div>

            {/* Product Spec */}
            <div style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', marginBottom: '16px', textTransform: 'uppercase', color: '#111' }}>Product Spec</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 30px', fontSize: '13px', borderTop: '2px solid #eee', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '6px' }}>
                        <span style={{ color: '#9ca3af' }}>Color</span>
                        <span style={{ fontWeight: 500 }}>{data.specColor || 'Matte Black'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '6px' }}>
                        <span style={{ color: '#9ca3af' }}>Upper</span>
                        <span style={{ fontWeight: 500 }}>{data.specUpper || 'Suede'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '6px' }}>
                        <span style={{ color: '#9ca3af' }}>Lining</span>
                        <span style={{ fontWeight: 500 }}>{data.specLining || 'Textile'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '6px' }}>
                        <span style={{ color: '#9ca3af' }}>Outsole</span>
                        <span style={{ fontWeight: 500 }}>{data.specOutsole || 'Rubber'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '6px' }}>
                        <span style={{ color: '#9ca3af' }}>Origin</span>
                        <span style={{ fontWeight: 500 }}>{data.specOrigin || 'Made in KOREA'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '6px' }}>
                        <span style={{ color: '#9ca3af' }}>굽 높이</span>
                        <span style={{ fontWeight: 500 }}>3.5cm</span>
                    </div>
                </div>
            </div>

            {/* Height Spec */}
            <div style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', marginBottom: '16px', textTransform: 'uppercase', color: '#111', borderBottom: '2px solid #111', paddingBottom: '6px', display: 'inlineBlock' }}>Height Spec</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#fff', border: '1px solid #e5e7eb', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>아웃솔 (Outsole)</div>
                        <div style={{ fontWeight: 700, fontSize: '16px', color: '#111' }}>{data.heightOutsole || '3'} CM</div>
                    </div>
                    <div style={{ textAlign: 'center', flex: 1, borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>인솔 (Insole)</div>
                        <div style={{ fontWeight: 700, fontSize: '16px', color: '#111' }}>{data.heightInsole || '1.5'} CM</div>
                    </div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '6px', fontWeight: 600 }}>총 키높이 (Total)</div>
                        <div style={{ fontWeight: 800, fontSize: '18px', color: '#ef4444' }}>{data.heightTotal || '4.5'} CM</div>
                    </div>
                </div>
            </div>

            {/* Size Guide */}
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'start' }}>
                <div style={{ background: '#ef4444', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '14px', flexShrink: 0, fontSize: '12px' }}>✓</div>
                <div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>Size Guide</h3>
                    <p style={{ margin: '0', fontSize: '13px', lineHeight: 1.6, color: '#4b5563' }}>
                        {data.sizeGuide ? data.sizeGuide.split('\n').map((line: string, i: number) => <React.Fragment key={i}>{line}<br /></React.Fragment>) : '사이즈 가이드 내용이 없습니다.'}
                    </p>
                </div>
            </div>
        </div>
    );
};
