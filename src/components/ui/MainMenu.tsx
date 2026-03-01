/**
 * MainMenu.tsx — 메인 메뉴 UI
 * 게임 시작, 불러오기 등 진입점 제공
 */

import useGameStore from '../../store/useGameStore.ts';

export default function MainMenu() {
  const setScene = useGameStore((s) => s.setScene);

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-800 via-indigo-900 to-purple-900">
      <div className="flex flex-col items-center gap-8">
        {/* 타이틀 */}
        <div className="text-center">
          <h1 className="text-6xl font-extrabold tracking-tight text-white drop-shadow-lg">
            Rollercoaster
          </h1>
          <p className="mt-2 text-lg text-sky-300">
            놀이공원 시뮬레이션
          </p>
        </div>

        {/* 메뉴 버튼 */}
        <div className="flex w-72 flex-col gap-3">
          <button
            onClick={() => setScene('mapSelect')}
            className="rounded-xl bg-emerald-500 px-6 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-emerald-400 hover:shadow-xl active:scale-95"
          >
            자유 모드
          </button>
          <button
            onClick={() => setScene('mapSelect')}
            className="rounded-xl bg-sky-500 px-6 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-sky-400 hover:shadow-xl active:scale-95"
          >
            불러오기
          </button>
          <button
            disabled
            className="rounded-xl bg-gray-600 px-6 py-4 text-lg font-bold text-gray-400 shadow-lg opacity-50 cursor-not-allowed"
          >
            퀘스트 모드 (준비 중)
          </button>
          <button
            disabled
            className="rounded-xl bg-gray-600 px-6 py-4 text-lg font-bold text-gray-400 shadow-lg opacity-50 cursor-not-allowed"
          >
            설정 (준비 중)
          </button>
        </div>
      </div>
    </div>
  );
}
