import React from "react";

type Props = {
    x: number;
    y: number;
    visible: boolean;
    onDelete?: () => void;
};

export const SimpleContextMenu: React.FC<Props> = ({
    x,
    y,
    visible,
    onDelete,
}) => {
    if (!visible) return null;

    return (
        <div
            className="fixed z-[99999] min-w-[160px] rounded-xl border border-slate-200 bg-white shadow-2xl text-sm py-1"
            style={{ top: y, left: x }}
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            onClick={(e) => {
                e.stopPropagation();
            }}
        >
            {onDelete && (
                <button
                    className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 font-semibold flex items-center gap-2"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                >
                    <span>🗑️</span>
                    <span>삭제</span>
                </button>
            )}
        </div>
    );
};
