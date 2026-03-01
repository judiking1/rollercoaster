/**
 * useTrackBuilder.ts — 트랙 빌더 인터랙션 훅
 * placing_station: 지형 클릭 → 그리드 스냅, Q/E 중심 기준 회전, ESC 취소
 * building: 세그먼트 추가/삭제, ESC 취소
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Vector3Data, Station } from '../core/types/index.ts';
import useTrackStore from '../store/useTrackStore.ts';
import useTerrainStore from '../store/useTerrainStore.ts';
import useGameStore from '../store/useGameStore.ts';
import {
  GRID_UNIT,
  DEFAULT_STATION_LENGTH,
  SEGMENT_LENGTH,
  STATION_ROTATION_STEP,
  COLLISION_MIN_DISTANCE,
} from '../core/constants/index.ts';
import { directionToVector, distance3D } from '../core/systems/TrackSystem.ts';

/** 지형 위 월드 좌표를 그리드 스냅 */
function snapToGrid(worldX: number, worldZ: number): { x: number; z: number } {
  return {
    x: Math.round(worldX / GRID_UNIT) * GRID_UNIT,
    z: Math.round(worldZ / GRID_UNIT) * GRID_UNIT,
  };
}

/** 정거장 중심 좌표로부터 시작점 위치 계산 */
function centerToStartPosition(
  centerX: number,
  centerZ: number,
  centerY: number,
  direction: number,
): Vector3Data {
  const vec = directionToVector(direction);
  const halfLen = (DEFAULT_STATION_LENGTH * SEGMENT_LENGTH) / 2;
  return {
    x: centerX - vec.x * halfLen,
    y: centerY,
    z: centerZ - vec.z * halfLen,
  };
}

/** 정거장 배치 유효성 검사: 지형 평탄성 + 기존 트랙 충돌 */
function checkStationValid(
  centerX: number,
  centerZ: number,
  centerY: number,
  direction: number,
): boolean {
  const { gridSize } = useTerrainStore.getState();
  const getHeight = useTerrainStore.getState().getVertexHeight;
  const vec = directionToVector(direction);
  const halfLen = (DEFAULT_STATION_LENGTH * SEGMENT_LENGTH) / 2;
  const threshold = 0.5; // HEIGHT_STEP 이내

  // 정거장 양 끝 + 중간 지점의 높이 수집
  const sampleCount = DEFAULT_STATION_LENGTH + 1;
  const heights: number[] = [];
  const samplePositions: Array<{ x: number; y: number; z: number }> = [];

  for (let i = 0; i <= sampleCount; i++) {
    const t = i / sampleCount;
    const wx = (centerX - vec.x * halfLen) + vec.x * halfLen * 2 * t;
    const wz = (centerZ - vec.z * halfLen) + vec.z * halfLen * 2 * t;

    const gx = Math.round(wx / GRID_UNIT);
    const gz = Math.round(wz / GRID_UNIT);

    if (gx < 0 || gx > gridSize.x || gz < 0 || gz > gridSize.z) {
      return false;
    }

    const h = getHeight(gx, gz);
    heights.push(h);
    samplePositions.push({ x: wx, y: h, z: wz });
  }

  // 높이 편차 검사
  const minH = Math.min(...heights);
  const maxH = Math.max(...heights);
  if ((maxH - minH) > threshold) return false;

  // 기존 트랙 충돌 검사
  const { rides } = useTrackStore.getState();
  for (const ride of Object.values(rides)) {
    for (const node of Object.values(ride.nodes)) {
      for (const sp of samplePositions) {
        if (distance3D(sp, node.position) < COLLISION_MIN_DISTANCE) {
          return false;
        }
      }
    }
  }

  // 정거장 시작/끝 위치도 검사
  const startPos = { x: centerX - vec.x * halfLen, y: centerY, z: centerZ - vec.z * halfLen };
  const endPos = { x: centerX + vec.x * halfLen, y: centerY, z: centerZ + vec.z * halfLen };
  for (const ride of Object.values(rides)) {
    for (const node of Object.values(ride.nodes)) {
      if (distance3D(startPos, node.position) < COLLISION_MIN_DISTANCE ||
          distance3D(endPos, node.position) < COLLISION_MIN_DISTANCE) {
        return false;
      }
    }
  }

  return true;
}

export interface StationPreviewData {
  centerPosition: Vector3Data;
  direction: number;
  isValid: boolean;
}

export default function useTrackBuilder() {
  const builderMode = useTrackStore((s) => s.builderMode);
  const setBuilderMode = useTrackStore((s) => s.setBuilderMode);
  const activeRideId = useTrackStore((s) => s.activeRideId);
  const createRide = useTrackStore((s) => s.createRide);
  const addSegment = useTrackStore((s) => s.addSegment);
  const removeLastSegment = useTrackStore((s) => s.removeLastSegment);
  const deleteRide = useTrackStore((s) => s.deleteRide);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const getVertexHeight = useTerrainStore((s) => s.getVertexHeight);
  const gridSize = useTerrainStore((s) => s.gridSize);

  // 정거장 배치 프리뷰 상태 (중심점 기준)
  const [stationPreview, setStationPreview] = useState<StationPreviewData | null>(null);

  const stationDirectionRef = useRef(0);

  // ─── 빌더 시작 ─────────────────────────────────────────

  const startBuilder = useCallback(() => {
    setGameMode('track');
    setBuilderMode('placing_station');
    setStationPreview(null);
    stationDirectionRef.current = 0;
  }, [setGameMode, setBuilderMode]);

  // ─── 빌더 취소 ─────────────────────────────────────────

  const cancelBuilder = useCallback(() => {
    if (builderMode === 'building' && activeRideId) {
      // 정거장만 있는 신규 라이드면 삭제, 세그먼트가 추가된 기존 라이드면 유지
      const ride = useTrackStore.getState().rides[activeRideId];
      if (ride && Object.keys(ride.segments).length <= 1) {
        deleteRide(activeRideId);
      }
    }
    setBuilderMode('idle');
    setGameMode('view');
    setStationPreview(null);
  }, [builderMode, activeRideId, deleteRide, setBuilderMode, setGameMode]);

  // ─── 정거장 배치 모드: 지형 호버 ─────────────────────────

  const handleTerrainHover = useCallback((worldX: number, worldZ: number) => {
    if (builderMode !== 'placing_station') return;

    const snapped = snapToGrid(worldX, worldZ);

    // 맵 범위 내 확인
    if (snapped.x < 0 || snapped.x >= gridSize.x * GRID_UNIT ||
        snapped.z < 0 || snapped.z >= gridSize.z * GRID_UNIT) return;

    const gx = Math.round(snapped.x / GRID_UNIT);
    const gz = Math.round(snapped.z / GRID_UNIT);
    const height = getVertexHeight(gx, gz);

    const direction = stationDirectionRef.current;
    const isValid = checkStationValid(snapped.x, snapped.z, height, direction);

    setStationPreview({
      centerPosition: { x: snapped.x, y: height, z: snapped.z },
      direction,
      isValid,
    });
  }, [builderMode, gridSize, getVertexHeight]);

  // ─── 정거장 배치 확정 ─────────────────────────────────────

  const handleTerrainClick = useCallback((worldX: number, worldZ: number) => {
    if (builderMode !== 'placing_station') return;

    const snapped = snapToGrid(worldX, worldZ);
    const gx = Math.round(snapped.x / GRID_UNIT);
    const gz = Math.round(snapped.z / GRID_UNIT);
    const height = getVertexHeight(gx, gz);

    const direction = stationDirectionRef.current;

    // 유효성 검사 (지형 + 충돌)
    if (!checkStationValid(snapped.x, snapped.z, height, direction)) {
      return; // 배치 불가
    }

    // 중심점 → 시작점으로 변환하여 정거장 생성
    const startPos = centerToStartPosition(snapped.x, snapped.z, height, direction);

    const station: Station = {
      position: startPos,
      direction,
      length: DEFAULT_STATION_LENGTH,
    };

    createRide(station);
    setStationPreview(null);
  }, [builderMode, getVertexHeight, createRide]);

  // ─── 세그먼트 추가/삭제 ────────────────────────────────

  const handleAddSegment = useCallback(() => {
    if (builderMode !== 'building' || !activeRideId) return;
    addSegment(activeRideId);
  }, [builderMode, activeRideId, addSegment]);

  const handleUndo = useCallback(() => {
    if (builderMode !== 'building' || !activeRideId) return;
    removeLastSegment(activeRideId);
  }, [builderMode, activeRideId, removeLastSegment]);

  // ─── 키보드: Q/E 회전 + ESC 취소 ──────────────────────

  useEffect(() => {
    if (builderMode !== 'placing_station' && builderMode !== 'building') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC: 취소
      if (e.key === 'Escape') {
        e.preventDefault();
        const state = useTrackStore.getState();
        if (state.builderMode === 'building' && state.activeRideId) {
          // 정거장만 있는 신규 라이드면 삭제, 기존 라이드면 유지
          const ride = state.rides[state.activeRideId];
          if (ride && Object.keys(ride.segments).length <= 1) {
            useTrackStore.getState().deleteRide(state.activeRideId);
          }
        }
        useTrackStore.getState().setBuilderMode('idle');
        useGameStore.getState().setGameMode('view');
        setStationPreview(null);
        return;
      }

      // Q/E: 정거장 방향 회전 (placing_station 모드에서만)
      if (builderMode !== 'placing_station') return;
      const key = e.key.toLowerCase();
      if (key === 'q') {
        stationDirectionRef.current = ((stationDirectionRef.current - STATION_ROTATION_STEP) % 360 + 360) % 360;
        setStationPreview((prev) => {
          if (!prev) return null;
          const newDir = stationDirectionRef.current;
          const isValid = checkStationValid(
            prev.centerPosition.x, prev.centerPosition.z, prev.centerPosition.y, newDir,
          );
          return { ...prev, direction: newDir, isValid };
        });
      } else if (key === 'e') {
        stationDirectionRef.current = (stationDirectionRef.current + STATION_ROTATION_STEP) % 360;
        setStationPreview((prev) => {
          if (!prev) return null;
          const newDir = stationDirectionRef.current;
          const isValid = checkStationValid(
            prev.centerPosition.x, prev.centerPosition.z, prev.centerPosition.y, newDir,
          );
          return { ...prev, direction: newDir, isValid };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [builderMode]);

  return {
    builderMode,
    stationPreview,
    startBuilder,
    cancelBuilder,
    handleTerrainHover,
    handleTerrainClick,
    handleAddSegment,
    handleUndo,
  };
}
