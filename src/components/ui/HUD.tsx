/**
 * HUD.tsx — 게임 내 HUD 오버레이
 * Canvas 위에 표시되는 HTML UI (pointer-events-none/auto 패턴)
 */

import { useState, useCallback } from 'react';
import useGameStore from '../../store/useGameStore.ts';
import useMapStore from '../../store/useMapStore.ts';
import useTrackStore from '../../store/useTrackStore.ts';
import useTrackBuilder from '../../hooks/useTrackBuilder.ts';

export default function HUD() {
  const setScene = useGameStore((s) => s.setScene);
  const gameMode = useGameStore((s) => s.gameMode);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const currentMapData = useMapStore((s) => s.currentMapData);
  const saveMap = useMapStore((s) => s.saveMap);
  const closeMap = useMapStore((s) => s.closeMap);

  const { startBuilder, builderMode } = useTrackBuilder();
  const setSelectedRide = useTrackStore((s) => s.setSelectedRide);

  const [showSaveNotice, setShowSaveNotice] = useState(false);

  const handleSave = useCallback(() => {
    saveMap();
    setShowSaveNotice(true);
    setTimeout(() => setShowSaveNotice(false), 2000);
  }, [saveMap]);

  const handleMenu = useCallback(() => {
    closeMap();
    setScene('mainMenu');
  }, [closeMap, setScene]);

  const handleToggleTerrain = useCallback(() => {
    setSelectedRide(null);
    setGameMode(gameMode === 'terrain' ? 'view' : 'terrain');
  }, [gameMode, setGameMode, setSelectedRide]);

  const handleTrackBuilder = useCallback(() => {
    if (builderMode !== 'idle') return;
    setSelectedRide(null);
    startBuilder();
  }, [builderMode, startBuilder, setSelectedRide]);

  const mapName = currentMapData?.meta.name ?? '새 맵';
  const isTrackActive = gameMode === 'track';

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* 좌상단: 맵 이름 */}
      <div className="absolute left-4 top-4">
        <div className="pointer-events-auto rounded-lg bg-black/50 px-4 py-2 backdrop-blur-sm">
          <span className="text-sm font-medium text-white">{mapName}</span>
        </div>
      </div>

      {/* 우상단: 도구 + 저장/메뉴 버튼 */}
      <div className="absolute right-4 top-4 flex gap-2">
        <button
          onClick={handleToggleTerrain}
          disabled={isTrackActive}
          className={`pointer-events-auto rounded-lg px-4 py-2 text-sm font-medium backdrop-blur-sm transition ${
            gameMode === 'terrain'
              ? 'bg-amber-500 text-black'
              : isTrackActive
                ? 'cursor-not-allowed bg-slate-700/60 text-gray-500'
                : 'bg-slate-600/80 text-white hover:bg-slate-500'
          }`}
        >
          지형 편집
        </button>
        <button
          onClick={handleTrackBuilder}
          disabled={isTrackActive || gameMode === 'terrain'}
          className={`pointer-events-auto rounded-lg px-4 py-2 text-sm font-medium backdrop-blur-sm transition ${
            isTrackActive
              ? 'bg-blue-500 text-white'
              : gameMode === 'terrain'
                ? 'cursor-not-allowed bg-slate-700/60 text-gray-500'
                : 'bg-slate-600/80 text-white hover:bg-slate-500'
          }`}
        >
          트랙 빌더
        </button>
        <button
          onClick={handleSave}
          className="pointer-events-auto rounded-lg bg-emerald-600/80 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-emerald-500"
        >
          저장
        </button>
        <button
          onClick={handleMenu}
          className="pointer-events-auto rounded-lg bg-slate-600/80 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-slate-500"
        >
          메뉴
        </button>
      </div>

      {/* 저장 완료 알림 */}
      {showSaveNotice && (
        <div className="absolute left-1/2 top-12 -translate-x-1/2">
          <div className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
            저장 완료!
          </div>
        </div>
      )}
    </div>
  );
}
