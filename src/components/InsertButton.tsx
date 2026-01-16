// InsertButton - コードブロック間に表示される挿入ボタン
// ホバーで表示され、クリックでパッシングコードを挿入

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
        <div className="insert-button-container flex items-center justify-center h-full">
            <button
                onClick={handleClick}
                className="insert-button opacity-0 hover:opacity-100 transition-opacity duration-200 bg-slate-600 hover:bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-lg font-bold shadow-lg"
                title="パッシングコードを挿入"
            >
                +
            </button>
            <style>{`
        .insert-button-container:hover .insert-button {
          opacity: 1;
        }
      `}</style>
        </div>
    );
}
