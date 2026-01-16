// InsertButton - コードブロック間に表示される挿入ボタン
// PC: ホバーで表示、スマホ: 常時表示（小サイズ）

interface InsertButtonProps {
    progressionId: string;
    insertIndex: number;
    onInsertChord: (progressionId: string, insertIndex: number) => void;
}

export function InsertButton({ progressionId, insertIndex, onInsertChord }: InsertButtonProps) {
    const handleClick = () => {
        onInsertChord(progressionId, insertIndex);
    };

    return (
        <div className="insert-button-container flex items-center justify-center h-full px-1">
            <button
                onClick={handleClick}
                className="insert-button bg-slate-600 hover:bg-blue-500 active:bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg transition-all duration-200
                    w-5 h-5 text-sm opacity-50
                    md:w-6 md:h-6 md:text-lg md:opacity-0 md:hover:opacity-100"
                title="パッシングコードを挿入"
            >
                +
            </button>
            <style>{`
                /* PC: ホバーで表示 */
                @media (hover: hover) and (pointer: fine) {
                    .insert-button-container:hover .insert-button {
                        opacity: 1 !important;
                    }
                }
                /* タッチデバイス: 常時表示（薄め） */
                @media (hover: none) or (pointer: coarse) {
                    .insert-button {
                        opacity: 0.6 !important;
                    }
                    .insert-button:active {
                        opacity: 1 !important;
                    }
                }
            `}</style>
        </div>
    );
}
