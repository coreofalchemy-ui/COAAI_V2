import React from 'react';
import { Reorder } from 'framer-motion';

interface NavigationMinimapProps {
    activeSection: string;
    onSectionClick: (section: string) => void;
    data: any;
    sectionOrder: string[];
    onReorder: (newOrder: string[]) => void;
}

export const NavigationMinimap: React.FC<NavigationMinimapProps> = ({ activeSection, data, onSectionClick, sectionOrder, onReorder }) => {
    const getPreviewImage = (section: string) => {
        if (!data?.imageUrls) return null;
        if (section === 'products') return data.imageUrls.products?.[0];
        if (section === 'models') return data.imageUrls.modelShots?.[0]?.url;
        return null;
    };

    const getSectionLabel = (section: string) => {
        switch (section) {
            case 'hero': return 'HERO';
            case 'products': return 'PRODUCT';
            case 'models': return 'MODEL';
            default: return section.toUpperCase();
        }
    };

    return (
        <div className="w-full h-full bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-white z-10">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Mini Map</h3>
            </div>

            <div className="flex-grow overflow-y-auto p-2 custom-scrollbar">
                <Reorder.Group axis="y" values={sectionOrder} onReorder={onReorder} className="flex flex-col gap-3">
                    {sectionOrder.map((section: string) => (
                        <Reorder.Item key={section} value={section} className="cursor-grab active:cursor-grabbing">
                            <div
                                className={`
                                    relative aspect-[3/4] rounded border transition-all duration-200 overflow-hidden group bg-white
                                    ${activeSection === section
                                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}
                                `}
                                onClick={() => onSectionClick(section)}
                            >
                                {/* Preview Content */}
                                {section === 'hero' ? (
                                    <div className="w-full h-full p-2 flex flex-col gap-1 bg-white">
                                        <div className="h-2 w-1/3 bg-gray-800 rounded-sm mb-1"></div>
                                        <div className="h-4 w-3/4 bg-gray-900 rounded-sm mb-2"></div>
                                        <div className="flex-grow flex flex-col gap-1">
                                            <div className="h-1.5 w-full bg-gray-100 rounded-sm"></div>
                                            <div className="h-1.5 w-full bg-gray-100 rounded-sm"></div>
                                            <div className="h-1.5 w-2/3 bg-gray-100 rounded-sm"></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                                        {getPreviewImage(section) ? (
                                            <img
                                                src={getPreviewImage(section)}
                                                alt={section}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-xs text-gray-400 font-medium">Empty</span>
                                        )}
                                    </div>
                                )}

                                {/* Hover Overlay */}
                                <div className={`
                                    absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors
                                    ${activeSection === section ? 'bg-blue-500/5' : ''}
                                `} />

                                {/* Label */}
                                <div className="absolute top-2 right-2 bg-black/70 text-white text-[8px] px-1.5 py-0.5 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                    {getSectionLabel(section)}
                                </div>
                            </div>
                        </Reorder.Item>
                    ))}
                </Reorder.Group>
            </div>
        </div>
    );
};
