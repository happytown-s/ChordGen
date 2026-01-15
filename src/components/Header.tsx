export function Header() {
  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          Chord Gen
        </h1>
        <p className="text-slate-400 text-sm">
          Generate chord progressions for your DAW
        </p>
      </div>
    </header>
  );
}
