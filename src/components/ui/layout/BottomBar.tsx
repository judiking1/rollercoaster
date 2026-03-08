/**
 * BottomBar.tsx — 하단 컨텍스트 바
 * 게임 모드에 따라 지형 도구/트랙 빌더/테스트 운행 UI 표시
 */

import { useState, useCallback } from 'react';
import useGameStore from '../../../store/useGameStore.ts';
import useTerrainStore from '../../../store/useTerrainStore.ts';
import useTrackStore from '../../../store/useTrackStore.ts';
import useMapStore from '../../../store/useMapStore.ts';
import useTrackBuilder from '../../../hooks/useTrackBuilder.ts';
import useRideTestStore, { useLiveVehicleData } from '../../../store/useRideTestStore.ts';
import type { TerrainTool } from '../../../core/types/index.ts';
import { SEGMENT_TYPES, SPECIAL_TYPES } from '../../../core/types/index.ts';
import type { SegmentType, SpecialType } from '../../../core/types/index.ts';
import type { RideCameraMode } from '../../../core/types/ride.ts';
import { MIN_BRUSH_SIZE, MAX_BRUSH_SIZE } from '../../../core/constants/index.ts';
import IconButton from '../common/IconButton.tsx';
import ToolDivider from '../common/ToolDivider.tsx';
import {
  IconSculpt,
  IconFlatten,
  IconUndo,
  IconRedo,
  IconPlus,
  IconClose,
  IconStop,
  IconCamera,
  IconSave,
} from '../icons/index.tsx';

/* ───────────── 세그먼트/특수 타입 레이블 ───────────── */

const SEGMENT_LABELS: Record<SegmentType, string> = {
  straight: '직진',
  left_gentle: '좌완곡',
  left_sharp: '좌급곡',
  right_gentle: '우완곡',
  right_sharp: '우급곡',
  slope_up: '오르막',
  slope_down: '내리막',
};

const SEGMENT_SYMBOLS: Record<SegmentType, string> = {
  straight: '│',
  left_gentle: '╲',
  left_sharp: '◜',
  right_gentle: '╱',
  right_sharp: '◝',
  slope_up: '↗',
  slope_down: '↘',
};

const SPECIAL_LABELS: Record<SpecialType, string> = {
  normal: '일반',
  chain_lift: '체인',
  brake: '브레이크',
  booster: '부스터',
};

const SPECIAL_COLORS: Record<SpecialType, 'blue' | 'orange' | 'red' | 'emerald'> = {
  normal: 'blue',
  chain_lift: 'orange',
  brake: 'red',
  booster: 'emerald',
};

const CAMERA_MODES: { mode: RideCameraMode; label: string; key: string }[] = [
  { mode: 'free', label: '자유', key: '1' },
  { mode: 'firstPerson', label: '1인칭', key: '2' },
  { mode: 'thirdPerson', label: '3인칭', key: '3' },
];

/* ───────────── 컨텍스트 저장 버튼 ───────────── */

function BottomBarSaveButton() {
  const saveMap = useMapStore((s) => s.saveMap);
  const [showToast, setShowToast] = useState(false);

  const handleSave = useCallback(() => {
    saveMap();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }, [saveMap]);

  return (
    <>
      <ToolDivider />
      <IconButton
        icon={<IconSave />}
        label="저장"
        tooltip="맵 저장"
        accentColor="emerald"
        onClick={handleSave}
      />
      {showToast && (
        <div className="absolute -top-10 right-4 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
          저장 완료!
        </div>
      )}
    </>
  );
}

/* ───────────── BottomBar 본체 ───────────── */

export default function BottomBar() {
  const gameMode = useGameStore((s) => s.gameMode);
  const builderMode = useTrackStore((s) => s.builderMode);
  const activeTests = useRideTestStore((s) => s.activeTests);

  const hasActiveTests = Object.keys(activeTests).length > 0;

  // 표시 조건 결정
  if (hasActiveTests) return <RideTestTools />;
  if (gameMode === 'terrain') return <TerrainTools />;
  if (gameMode === 'track') {
    if (builderMode === 'placing_station') return <StationPlacingHint />;
    if (builderMode === 'building') return <TrackBuilderTools />;
  }

  return null;
}

/* ───────────── 지형 도구 ───────────── */

const TERRAIN_TOOLS: { tool: TerrainTool; label: string; icon: 'sculpt' | 'flatten' }[] = [
  { tool: 'sculpt', label: '편집', icon: 'sculpt' },
  { tool: 'flatten', label: '평탄화', icon: 'flatten' },
];

function TerrainTools() {
  const brush = useTerrainStore((s) => s.brush);
  const setBrushTool = useTerrainStore((s) => s.setBrushTool);
  const setBrushSize = useTerrainStore((s) => s.setBrushSize);
  const undoStackLength = useTerrainStore((s) => s.undoStack.length);
  const redoStackLength = useTerrainStore((s) => s.redoStack.length);

  const handleUndo = useCallback(() => {
    useTerrainStore.getState().undo();
  }, []);

  const handleRedo = useCallback(() => {
    useTerrainStore.getState().redo();
  }, []);

  const handleSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBrushSize(Number(e.target.value));
  }, [setBrushSize]);

  return (
    <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 flex h-14 items-center justify-center border-t border-slate-700/50 bg-slate-900/90 px-4 backdrop-blur-md">
      {/* 힌트 */}
      <div className="absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-black/60 px-3 py-1 text-[10px] text-slate-400">
        {brush.tool === 'sculpt'
          ? '좌클릭 후 마우스 ↑올리기 ↓내리기 · 우클릭: 회전'
          : '좌클릭: 영역 평탄화 · 우클릭: 회전'}
      </div>

      <div className="flex items-center gap-1">
        {/* 도구 버튼 */}
        {TERRAIN_TOOLS.map(({ tool, label, icon }) => (
          <IconButton
            key={tool}
            icon={icon === 'sculpt' ? <IconSculpt /> : <IconFlatten />}
            label={label}
            tooltip={label}
            isActive={brush.tool === tool}
            accentColor="amber"
            onClick={() => setBrushTool(tool)}
          />
        ))}

        <ToolDivider />

        {/* 브러시 크기 */}
        <div className="flex flex-col items-center gap-0.5 px-2">
          <span className="text-[9px] text-slate-400">브러시</span>
          <input
            type="range"
            min={MIN_BRUSH_SIZE}
            max={MAX_BRUSH_SIZE}
            step={1}
            value={brush.size}
            onChange={handleSizeChange}
            className="h-1 w-16 cursor-pointer accent-amber-500"
          />
          <span className="text-[9px] text-slate-300">{brush.size}x{brush.size}</span>
        </div>

        <ToolDivider />

        {/* Undo / Redo */}
        <IconButton
          icon={<IconUndo />}
          tooltip="되돌리기 (Ctrl+Z)"
          disabled={undoStackLength === 0}
          onClick={handleUndo}
        />
        <IconButton
          icon={<IconRedo />}
          tooltip="다시 실행 (Ctrl+Y)"
          disabled={redoStackLength === 0}
          onClick={handleRedo}
        />

        <BottomBarSaveButton />
      </div>
    </div>
  );
}

/* ───────────── 정거장 배치 힌트 ───────────── */

function StationPlacingHint() {
  const { cancelBuilder } = useTrackBuilder();

  return (
    <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 flex h-14 items-center justify-center border-t border-slate-700/50 bg-slate-900/90 px-4 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-200">지형을 클릭하여 정거장을 배치하세요</span>
        <span className="text-xs text-slate-400">Q/E: 방향 회전</span>
        <ToolDivider />
        <IconButton
          icon={<IconClose />}
          label="취소"
          tooltip="취소 (ESC)"
          accentColor="red"
          onClick={cancelBuilder}
        />
      </div>
    </div>
  );
}

/* ───────────── 트랙 빌더 도구 ───────────── */

function TrackBuilderTools() {
  const selectedSegmentType = useTrackStore((s) => s.selectedSegmentType);
  const selectedSpecialType = useTrackStore((s) => s.selectedSpecialType);
  const setSelectedSegmentType = useTrackStore((s) => s.setSelectedSegmentType);
  const setSelectedSpecialType = useTrackStore((s) => s.setSelectedSpecialType);
  const activeRideId = useTrackStore((s) => s.activeRideId);
  const rides = useTrackStore((s) => s.rides);

  const {
    cancelBuilder,
    handleAddSegment,
    handleUndo,
  } = useTrackBuilder();

  const ride = activeRideId ? rides[activeRideId] : null;
  const segmentCount = ride ? Object.keys(ride.segments).length - 1 : 0;

  return (
    <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 flex h-14 items-center justify-center border-t border-slate-700/50 bg-slate-900/90 px-4 backdrop-blur-md">
      <div className="flex items-center gap-1">
        {/* 세그먼트 타입 */}
        {SEGMENT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedSegmentType(type)}
            title={SEGMENT_LABELS[type]}
            className={`flex h-9 min-w-9 flex-col items-center justify-center rounded px-1.5 text-xs transition-colors ${
              selectedSegmentType === type
                ? 'bg-blue-500/20 text-blue-400 border-b-2 border-blue-500'
                : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
            }`}
          >
            <span className="text-sm leading-none">{SEGMENT_SYMBOLS[type]}</span>
            <span className="text-[8px] leading-none">{SEGMENT_LABELS[type]}</span>
          </button>
        ))}

        <ToolDivider />

        {/* 특수 타입 */}
        {SPECIAL_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedSpecialType(type)}
            title={SPECIAL_LABELS[type]}
            className={`flex h-9 items-center rounded px-2 text-xs transition-colors ${
              selectedSpecialType === type
                ? `bg-${SPECIAL_COLORS[type]}-500/20 text-${SPECIAL_COLORS[type]}-400 border-b-2 border-${SPECIAL_COLORS[type]}-500`
                : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
            }`}
          >
            {SPECIAL_LABELS[type]}
          </button>
        ))}

        <ToolDivider />

        {/* 액션 버튼 */}
        <IconButton
          icon={<IconPlus />}
          label="추가"
          tooltip="세그먼트 추가"
          accentColor="emerald"
          onClick={handleAddSegment}
        />
        <IconButton
          icon={<IconUndo />}
          label="되돌리기"
          tooltip="마지막 세그먼트 제거"
          onClick={handleUndo}
        />
        <IconButton
          icon={<IconClose />}
          label="취소"
          tooltip="빌더 취소 (ESC)"
          accentColor="red"
          onClick={cancelBuilder}
        />

        <ToolDivider />

        {/* 세그먼트 카운터 */}
        <span className="text-xs text-slate-400">
          세그먼트: <span className="text-slate-200">{segmentCount}</span>
        </span>

        <BottomBarSaveButton />
      </div>
    </div>
  );
}

/* ───────────── 테스트 운행 ───────────── */

/** m/s → km/h 변환 */
function msToKmh(ms: number): number {
  return ms * 3.6;
}

/** G-Force 값에 따른 색상 클래스 */
function getGColor(g: number): string {
  const absG = Math.abs(g);
  if (absG > 4) return 'text-red-400';
  if (absG > 2.5) return 'text-amber-400';
  return 'text-emerald-400';
}

function RideTestTools() {
  const activeTests = useRideTestStore((s) => s.activeTests);
  const focusedRideId = useRideTestStore((s) => s.focusedRideId);
  const cameraMode = useRideTestStore((s) => s.cameraMode);
  const setCameraMode = useRideTestStore((s) => s.setCameraMode);
  const stopTest = useRideTestStore((s) => s.stopTest);
  const setFocusedRide = useRideTestStore((s) => s.setFocusedRide);
  const rides = useTrackStore((s) => s.rides);

  const activeIds = Object.keys(activeTests);
  // 뮤터블 버퍼 폴링 (Zustand 리렌더 대신 자체 setInterval)
  const focusedData = useLiveVehicleData(focusedRideId);
  const focusedRide = focusedRideId ? rides[focusedRideId] : null;

  return (
    <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 flex h-14 items-center justify-between border-t border-slate-700/50 bg-slate-900/90 px-4 backdrop-blur-md">
      {/* 좌: 운행 목록 + 실시간 stats */}
      <div className="flex items-center gap-3">
        {/* 운행 중 라이드 탭 */}
        <div className="flex items-center gap-1">
          {activeIds.map((rideId) => {
            const ride = rides[rideId];
            const isFocused = rideId === focusedRideId;
            return (
              <button
                key={rideId}
                onClick={() => setFocusedRide(rideId)}
                className={`rounded px-2 py-1 text-xs transition-colors ${
                  isFocused
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
                }`}
              >
                {ride?.name ?? rideId}
              </button>
            );
          })}
        </div>

        {focusedData && focusedRide && (
          <>
            <ToolDivider />
            {/* 속도 */}
            <div className="text-center">
              <div className="text-[9px] text-slate-400">속도</div>
              <div className="text-sm font-bold text-cyan-400">
                {msToKmh(focusedData.currentSpeed).toFixed(0)}
                <span className="ml-0.5 text-[9px] font-normal text-slate-400">km/h</span>
              </div>
            </div>
            {/* 높이 */}
            <div className="text-center">
              <div className="text-[9px] text-slate-400">높이</div>
              <div className="text-sm font-bold text-emerald-400">
                {focusedData.currentHeight.toFixed(1)}
                <span className="ml-0.5 text-[9px] font-normal text-slate-400">m</span>
              </div>
            </div>
            {/* 수직 G */}
            <div className="text-center">
              <div className="text-[9px] text-slate-400">수직G</div>
              <div className={`text-sm font-bold ${getGColor(focusedData.currentVerticalG)}`}>
                {focusedData.currentVerticalG.toFixed(2)}
              </div>
            </div>
            {/* 횡 G */}
            <div className="text-center">
              <div className="text-[9px] text-slate-400">횡G</div>
              <div className={`text-sm font-bold ${getGColor(focusedData.currentLateralG)}`}>
                {focusedData.currentLateralG.toFixed(2)}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 우: 카메라 모드 + 중지 */}
      <div className="flex items-center gap-1">
        {CAMERA_MODES.map(({ mode, label, key }) => (
          <button
            key={mode}
            onClick={() => setCameraMode(mode)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
              cameraMode === mode
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
            }`}
          >
            <IconCamera className="h-3.5 w-3.5" />
            {label} ({key})
          </button>
        ))}

        <ToolDivider />

        {focusedRideId && (
          <IconButton
            icon={<IconStop />}
            label="중지"
            tooltip="테스트 중지 (ESC)"
            accentColor="red"
            onClick={() => stopTest(focusedRideId)}
          />
        )}
      </div>
    </div>
  );
}
