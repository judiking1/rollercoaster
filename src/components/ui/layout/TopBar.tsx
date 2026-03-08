/**
 * TopBar.tsx — 상단 툴바
 * 맵 이름(클릭→맵 리스트) + 도구 아이콘 + 시계 + 저장/메뉴(클릭→드롭다운)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import useGameStore from '../../../store/useGameStore.ts';
import useMapStore from '../../../store/useMapStore.ts';
import useTrackStore from '../../../store/useTrackStore.ts';
import useRendererStore from '../../../store/useRendererStore.ts';
import useTrackBuilder from '../../../hooks/useTrackBuilder.ts';
import IconButton from '../common/IconButton.tsx';
import ToolDivider from '../common/ToolDivider.tsx';
import {
  IconEye,
  IconMountain,
  IconTrack,
  IconXRay,
  IconRoad,
  IconTree,
  IconSave,
  IconMenu,
  IconLoad,
  IconExit,
  IconChevronDown,
  IconRideList,
} from '../icons/index.tsx';

/* ───────────── 시계 표시 ───────────── */

function ClockDisplay() {
  const [time, setTime] = useState(() => formatTime());

  useEffect(() => {
    const timer = setInterval(() => setTime(formatTime()), 30_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="text-xs tabular-nums text-slate-400">{time}</span>
  );
}

function formatTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/* ───────────── 렌더러 백엔드 배지 ───────────── */

function RendererBadge() {
  const backend = useRendererStore((s) => s.backend);
  const isInitialized = useRendererStore((s) => s.isInitialized);

  if (!isInitialized) return null;

  const isWebGPU = backend === 'webgpu';
  const label = isWebGPU ? 'GPU' : 'GL';
  const colorClass = isWebGPU
    ? 'bg-emerald-500/20 text-emerald-400'
    : 'bg-slate-500/20 text-slate-400';

  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${colorClass}`}
      title={isWebGPU ? 'WebGPU 렌더러 활성' : 'WebGL 폴백 렌더러'}
    >
      {label}
    </span>
  );
}

/* ───────────── 메뉴 드롭다운 ───────────── */

interface MenuDropdownProps {
  onClose: () => void;
}

function MenuDropdown({ onClose }: MenuDropdownProps) {
  const setScene = useGameStore((s) => s.setScene);
  const saveMap = useMapStore((s) => s.saveMap);
  const closeMap = useMapStore((s) => s.closeMap);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose]);

  const handleLoad = useCallback(() => {
    saveMap();
    closeMap();
    setScene('mapSelect');
    onClose();
  }, [saveMap, closeMap, setScene, onClose]);

  const handleExit = useCallback(() => {
    saveMap();
    closeMap();
    setScene('mainMenu');
    onClose();
  }, [saveMap, closeMap, setScene, onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-lg border border-slate-700/50 bg-slate-900/95 shadow-xl backdrop-blur-md"
    >
      <button
        onClick={handleLoad}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-200 transition-colors hover:bg-slate-700/60"
      >
        <IconLoad className="h-4 w-4 text-slate-400" />
        불러오기
      </button>
      <div className="mx-2 h-px bg-slate-700/50" />
      <button
        onClick={handleExit}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-200 transition-colors hover:bg-slate-700/60"
      >
        <IconExit className="h-4 w-4 text-slate-400" />
        나가기
      </button>
    </div>
  );
}

/* ───────────── 맵 리스트 드롭다운 ───────────── */

interface MapListDropdownProps {
  onClose: () => void;
}

function MapListDropdown({ onClose }: MapListDropdownProps) {
  const savedMaps = useMapStore((s) => s.savedMaps);
  const currentMapId = useMapStore((s) => s.currentMapId);
  const saveMap = useMapStore((s) => s.saveMap);
  const closeMap = useMapStore((s) => s.closeMap);
  const loadMap = useMapStore((s) => s.loadMap);
  const loadSavedMapList = useMapStore((s) => s.loadSavedMapList);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSavedMapList();
  }, [loadSavedMapList]);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose]);

  const handleSelectMap = useCallback((mapId: string) => {
    if (mapId === currentMapId) return;
    saveMap();
    closeMap();
    loadMap(mapId);
    onClose();
  }, [currentMapId, saveMap, closeMap, loadMap, onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-30 mt-1 w-64 overflow-hidden rounded-lg border border-slate-700/50 bg-slate-900/95 shadow-xl backdrop-blur-md"
    >
      <div className="max-h-80 overflow-y-auto">
        {savedMaps.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-slate-500">
            저장된 맵이 없습니다
          </div>
        ) : (
          savedMaps.map((entry) => {
            const isCurrent = entry.id === currentMapId;
            return (
              <button
                key={entry.id}
                onClick={() => handleSelectMap(entry.id)}
                disabled={isCurrent}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                  isCurrent
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'text-slate-200 hover:bg-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {isCurrent && <span className="text-xs">✓</span>}
                  <span className="truncate">{entry.name}</span>
                </div>
                <span className="ml-2 shrink-0 text-[10px] text-slate-500">
                  {entry.gridSize.x}×{entry.gridSize.z}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ───────────── 놀이기구 목록 드롭다운 ───────────── */

interface RideListDropdownProps {
  onClose: () => void;
}

function RideListDropdown({ onClose }: RideListDropdownProps) {
  const rides = useTrackStore((s) => s.rides);
  const setSelectedRide = useTrackStore((s) => s.setSelectedRide);
  const openPanel = useTrackStore((s) => s.openPanel);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose]);

  const rideList = Object.values(rides);

  const handleSelectRide = useCallback((rideId: string) => {
    setSelectedRide(rideId);
    openPanel(rideId);
    onClose();
  }, [setSelectedRide, openPanel, onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-lg border border-slate-700/50 bg-slate-900/95 shadow-xl backdrop-blur-md"
    >
      <div className="max-h-80 overflow-y-auto">
        {rideList.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-slate-500">
            놀이기구가 없습니다
          </div>
        ) : (
          rideList.map((ride) => {
            const segCount = Object.keys(ride.segments).length - 1;
            return (
              <button
                key={ride.id}
                onClick={() => handleSelectRide(ride.id)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-200 transition-colors hover:bg-slate-700/60"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                      ride.isComplete ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span className="truncate">{ride.name}</span>
                </div>
                <span className="ml-2 shrink-0 text-[10px] text-slate-500">
                  {segCount}seg
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ───────────── TopBar 본체 ───────────── */

export default function TopBar() {
  const gameMode = useGameStore((s) => s.gameMode);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const isXRayMode = useGameStore((s) => s.isXRayMode);
  const toggleXRay = useGameStore((s) => s.toggleXRay);
  const currentMapData = useMapStore((s) => s.currentMapData);
  const saveMap = useMapStore((s) => s.saveMap);
  const setSelectedRide = useTrackStore((s) => s.setSelectedRide);
  const closeAllPanels = useTrackStore((s) => s.closeAllPanels);
  const { startBuilder, builderMode } = useTrackBuilder();

  const rides = useTrackStore((s) => s.rides);
  const rideCount = Object.keys(rides).length;

  const [showSaveNotice, setShowSaveNotice] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMapListOpen, setIsMapListOpen] = useState(false);
  const [isRideListOpen, setIsRideListOpen] = useState(false);

  const isTrackActive = gameMode === 'track';
  const mapName = currentMapData?.meta.name ?? '새 맵';

  const handleView = useCallback(() => {
    if (gameMode === 'view') return;
    setSelectedRide(null);
    closeAllPanels();
    setGameMode('view');
  }, [gameMode, setGameMode, setSelectedRide, closeAllPanels]);

  const handleTerrain = useCallback(() => {
    if (isTrackActive) return;
    setSelectedRide(null);
    closeAllPanels();
    setGameMode(gameMode === 'terrain' ? 'view' : 'terrain');
  }, [gameMode, isTrackActive, setGameMode, setSelectedRide, closeAllPanels]);

  const handleTrack = useCallback(() => {
    if (builderMode !== 'idle') return;
    if (gameMode === 'terrain') return;
    setSelectedRide(null);
    closeAllPanels();
    startBuilder();
  }, [builderMode, gameMode, startBuilder, setSelectedRide, closeAllPanels]);

  const handleXRay = useCallback(() => {
    if (isTrackActive || gameMode === 'terrain') return;
    toggleXRay();
  }, [isTrackActive, gameMode, toggleXRay]);

  const handleSave = useCallback(() => {
    saveMap();
    setShowSaveNotice(true);
    setTimeout(() => setShowSaveNotice(false), 2000);
  }, [saveMap]);

  const handleMenuToggle = useCallback(() => {
    setIsMenuOpen((prev) => {
      if (!prev) { setIsMapListOpen(false); setIsRideListOpen(false); }
      return !prev;
    });
  }, []);

  const handleMapListToggle = useCallback(() => {
    setIsMapListOpen((prev) => {
      if (!prev) { setIsMenuOpen(false); setIsRideListOpen(false); }
      return !prev;
    });
  }, []);

  const handleRideListToggle = useCallback(() => {
    setIsRideListOpen((prev) => {
      if (!prev) { setIsMenuOpen(false); setIsMapListOpen(false); }
      return !prev;
    });
  }, []);

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const closeMapList = useCallback(() => setIsMapListOpen(false), []);
  const closeRideList = useCallback(() => setIsRideListOpen(false), []);

  return (
    <>
      <div className="pointer-events-auto absolute left-0 right-0 top-0 z-20 flex h-11 items-center justify-between border-b border-slate-700/50 bg-slate-900/90 px-3 backdrop-blur-md">
        {/* 좌측: 맵 이름 (클릭→맵 리스트) */}
        <div className="relative flex items-center">
          <button
            onClick={handleMapListToggle}
            className="flex cursor-pointer items-center gap-1 rounded bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700"
          >
            {mapName}
            <IconChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${isMapListOpen ? 'rotate-180' : ''}`} />
          </button>
          {isMapListOpen && <MapListDropdown onClose={closeMapList} />}
        </div>

        {/* 중앙: 도구 아이콘 */}
        <div className="flex items-center gap-0.5">
          <IconButton
            icon={<IconEye />}
            label="관찰"
            tooltip="관찰 모드"
            isActive={gameMode === 'view' && !isXRayMode}
            accentColor="blue"
            onClick={handleView}
          />
          <IconButton
            icon={<IconMountain />}
            label="지형"
            tooltip="지형 편집"
            isActive={gameMode === 'terrain'}
            accentColor="amber"
            disabled={isTrackActive}
            onClick={handleTerrain}
          />
          <IconButton
            icon={<IconTrack />}
            label="트랙"
            tooltip="트랙 빌더 (새 코스터)"
            isActive={isTrackActive}
            accentColor="blue"
            disabled={isTrackActive || gameMode === 'terrain'}
            onClick={handleTrack}
          />
          <IconButton
            icon={<IconXRay />}
            label="X-Ray"
            tooltip="X-Ray 모드"
            isActive={isXRayMode}
            accentColor="purple"
            disabled={isTrackActive || gameMode === 'terrain'}
            onClick={handleXRay}
          />

          {/* 놀이기구 목록 */}
          <div className="relative">
            <IconButton
              icon={
                <span className="relative">
                  <IconRideList />
                  {rideCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[8px] font-bold leading-none text-white">
                      {rideCount}
                    </span>
                  )}
                </span>
              }
              label="목록"
              tooltip="놀이기구 목록"
              onClick={handleRideListToggle}
            />
            {isRideListOpen && <RideListDropdown onClose={closeRideList} />}
          </div>

          <ToolDivider />

          {/* 미래 확장: 비활성 */}
          <IconButton
            icon={<IconRoad />}
            label="도로"
            tooltip="도로 (준비 중)"
            disabled
            onClick={() => {}}
          />
          <IconButton
            icon={<IconTree />}
            label="장식"
            tooltip="장식 (준비 중)"
            disabled
            onClick={() => {}}
          />
        </div>

        {/* 우측: 시계 + 저장 + 메뉴 */}
        <div className="relative flex items-center gap-1.5">
          <RendererBadge />
          <ClockDisplay />
          <ToolDivider />
          <IconButton
            icon={<IconSave />}
            label="저장"
            tooltip="맵 저장"
            accentColor="emerald"
            onClick={handleSave}
          />
          <IconButton
            icon={<IconMenu />}
            label="메뉴"
            tooltip="메뉴"
            onClick={handleMenuToggle}
          />
          {isMenuOpen && <MenuDropdown onClose={closeMenu} />}
        </div>
      </div>

      {/* 저장 완료 알림 */}
      {showSaveNotice && (
        <div className="pointer-events-none absolute left-1/2 top-14 z-30 -translate-x-1/2">
          <div className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
            저장 완료!
          </div>
        </div>
      )}
    </>
  );
}
