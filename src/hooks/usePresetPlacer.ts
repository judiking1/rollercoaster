/**
 * usePresetPlacer.ts — 프리셋 배치 인터랙션 훅
 * 지형 호버 → 프리뷰 업데이트, 클릭 → 배치 확정
 * Q/E: 90° 회전, ESC: 취소
 */

import { useCallback, useEffect, useRef } from 'react';
import usePresetStore from '../store/usePresetStore.ts';
import useTrackStore from '../store/useTrackStore.ts';
import useTerrainStore from '../store/useTerrainStore.ts';
import useGameStore from '../store/useGameStore.ts';
import type { Station } from '../core/types/index.ts';
import {
  resolvePresetPositions,
  validatePresetPlacement,
  presetToRide,
  centerToStationStart,
} from '../core/systems/PresetSystem.ts';
import { getTerrainHeightAt } from '../components/three/track/trackCurveUtils.ts';
import { GRID_UNIT, STATION_ROTATION_STEP } from '../core/constants/index.ts';

/** 월드 좌표를 그리드 스냅 */
function snapToGrid(worldX: number, worldZ: number): { x: number; z: number } {
  return {
    x: Math.round(worldX / GRID_UNIT) * GRID_UNIT,
    z: Math.round(worldZ / GRID_UNIT) * GRID_UNIT,
  };
}

export default function usePresetPlacer() {
  const activePresetId = usePresetStore((s) => s.activePresetId);
  const presets = usePresetStore((s) => s.presets);
  const updatePreview = usePresetStore((s) => s.updatePreview);
  const resetPlacement = usePresetStore((s) => s.resetPlacement);

  const addPresetRide = useTrackStore((s) => s.addPresetRide);
  const setSelectedRide = useTrackStore((s) => s.setSelectedRide);
  const openPanel = useTrackStore((s) => s.openPanel);

  const setGameMode = useGameStore((s) => s.setGameMode);

  const gridSize = useTerrainStore((s) => s.gridSize);
  const getVertexHeight = useTerrainStore((s) => s.getVertexHeight);

  const activePreset = activePresetId ? presets[activePresetId] : null;

  // 방향 ref (키보드 이벤트에서 최신 값 참조)
  const directionRef = useRef(0);

  // 프리뷰 방향과 ref 동기화
  const previewDirection = usePresetStore((s) => s.previewDirection);
  useEffect(() => {
    directionRef.current = previewDirection;
  }, [previewDirection]);

  // 프리뷰 계산 공통 함수
  const computePreview = useCallback((centerX: number, centerZ: number, direction: number) => {
    if (!activePreset) return;

    const gx = Math.round(centerX / GRID_UNIT);
    const gz = Math.round(centerZ / GRID_UNIT);
    const height = getVertexHeight(gx, gz);

    // 중심 → 정거장 시작 위치
    const startPos = centerToStationStart(
      centerX, centerZ, height, direction, activePreset.stationLength,
    );

    // 프리셋 노드 절대 좌표 복원
    const resolved = resolvePresetPositions(activePreset, startPos, direction);

    // 정거장 정보
    const station: Station = {
      position: startPos,
      direction,
      length: activePreset.stationLength,
    };

    // 유효성 검사
    const rides = useTrackStore.getState().rides;
    const isValid = validatePresetPlacement(resolved, station, rides, getTerrainHeightAt);

    updatePreview({ x: centerX, y: height, z: centerZ }, direction, isValid, resolved);
  }, [activePreset, getVertexHeight, updatePreview]);

  // ─── 지형 호버: 프리뷰 업데이트 ────────────────────────

  const handleTerrainHover = useCallback((worldX: number, worldZ: number) => {
    if (!activePreset) return;

    const snapped = snapToGrid(worldX, worldZ);
    if (snapped.x < 0 || snapped.x >= gridSize.x * GRID_UNIT ||
        snapped.z < 0 || snapped.z >= gridSize.z * GRID_UNIT) return;

    computePreview(snapped.x, snapped.z, directionRef.current);
  }, [activePreset, gridSize, computePreview]);

  // ─── 지형 클릭: 배치 확정 ──────────────────────────────

  const handleTerrainClick = useCallback((worldX: number, worldZ: number) => {
    if (!activePreset) return;

    const snapped = snapToGrid(worldX, worldZ);
    const gx = Math.round(snapped.x / GRID_UNIT);
    const gz = Math.round(snapped.z / GRID_UNIT);
    const height = getVertexHeight(gx, gz);
    const direction = directionRef.current;

    const startPos = centerToStationStart(
      snapped.x, snapped.z, height, direction, activePreset.stationLength,
    );

    const resolved = resolvePresetPositions(activePreset, startPos, direction);

    const station: Station = {
      position: startPos,
      direction,
      length: activePreset.stationLength,
    };

    const rides = useTrackStore.getState().rides;
    if (!validatePresetPlacement(resolved, station, rides, getTerrainHeightAt)) {
      return; // 배치 불가
    }

    // 새 Ride 생성
    const rideNum = useTrackStore.getState().rideCounter + 1;
    const rideId = `ride-${rideNum}`;
    const rideName = `${activePreset.name} #${rideNum}`;

    const newRide = presetToRide(activePreset, resolved, station, rideId, rideName);
    addPresetRide(newRide);

    // 선택 + 패널 열기
    setSelectedRide(rideId);
    openPanel(rideId);

    // 배치 완료 → view 모드로
    resetPlacement();
    setGameMode('view');
  }, [activePreset, getVertexHeight, addPresetRide, setSelectedRide, openPanel, resetPlacement, setGameMode]);

  // ─── 취소 ─────────────────────────────────────────────

  const cancelPlacement = useCallback(() => {
    resetPlacement();
    setGameMode('view');
  }, [resetPlacement, setGameMode]);

  // ─── 키보드: Q/E 회전, ESC 취소 ──────────────────────

  useEffect(() => {
    if (!activePreset) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelPlacement();
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'q' || key === 'e') {
        const delta = key === 'q' ? -STATION_ROTATION_STEP : STATION_ROTATION_STEP;
        const newDir = ((directionRef.current + delta) % 360 + 360) % 360;
        directionRef.current = newDir;

        // 현재 프리뷰 위치로 재계산 (마우스 안 움직여도 프리뷰 갱신)
        const state = usePresetStore.getState();
        if (state.previewPosition) {
          computePreview(state.previewPosition.x, state.previewPosition.z, newDir);
        } else {
          usePresetStore.getState().rotatePreview(delta);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePreset, cancelPlacement, computePreview]);

  return {
    activePreset,
    handleTerrainHover,
    handleTerrainClick,
    cancelPlacement,
  };
}
