/**
 * useRideTestStore.ts — 테스트 운행 상태 관리
 * 다중 동시 테스트 지원: 각 라이드 독립 실행, 카메라는 포커스 라이드 추적
 *
 * 실시간 차량 데이터(속도, 높이, G-Force)는 모듈 레벨 뮤터블 버퍼에 저장하여
 * useFrame → Zustand set() 호출을 제거함 (리렌더 방지).
 * UI는 useLiveVehicleData() 훅으로 폴링.
 */

import { create } from 'zustand';
import { useState, useEffect } from 'react';
import type { RideCameraMode, RideStats, SavedCameraState } from '../core/types/ride.ts';

/** 개별 라이드 테스트 실시간 데이터 */
export interface RideTestEntry {
  /** 현재 속도 (m/s) */
  currentSpeed: number;
  /** 현재 높이 (m) */
  currentHeight: number;
  /** 현재 수직 G-Force */
  currentVerticalG: number;
  /** 현재 횡 G-Force */
  currentLateralG: number;
}

/* ============================================
 * 모듈 레벨 뮤터블 버퍼 — Zustand 외부
 * Vehicle.tsx의 useFrame에서 직접 기록,
 * UI는 useLiveVehicleData() 훅으로 폴링.
 * ============================================ */
const liveVehicleStats: Record<string, RideTestEntry> = {};

/** useFrame 내에서 호출 — Zustand set() 없이 뮤터블 쓰기 */
export function writeLiveVehicleStats(
  rideId: string,
  speed: number,
  height: number,
  verticalG: number,
  lateralG: number,
): void {
  let entry = liveVehicleStats[rideId];
  if (!entry) {
    entry = { currentSpeed: 0, currentHeight: 0, currentVerticalG: 1, currentLateralG: 0 };
    liveVehicleStats[rideId] = entry;
  }
  entry.currentSpeed = speed;
  entry.currentHeight = height;
  entry.currentVerticalG = verticalG;
  entry.currentLateralG = lateralG;
}

/** 뮤터블 버퍼 읽기 (스냅샷 아님, 참조 반환) */
export function readLiveVehicleStats(rideId: string): RideTestEntry | null {
  return liveVehicleStats[rideId] ?? null;
}

/** 뮤터블 버퍼 항목 삭제 */
export function clearLiveVehicleStats(rideId: string): void {
  delete liveVehicleStats[rideId];
}

/** 뮤터블 버퍼 전체 삭제 */
function clearAllLiveStats(): void {
  for (const key of Object.keys(liveVehicleStats)) {
    delete liveVehicleStats[key];
  }
}

/**
 * UI용 폴링 훅 — 뮤터블 버퍼에서 주기적으로 읽어 React 상태로 전달
 * @param rideId 추적할 라이드 ID (null이면 null 반환)
 * @param intervalMs 폴링 주기 (기본 100ms — 10 FPS UI 갱신)
 */
export function useLiveVehicleData(
  rideId: string | null,
  intervalMs = 100,
): RideTestEntry | null {
  const [data, setData] = useState<RideTestEntry | null>(null);

  useEffect(() => {
    if (!rideId) return;

    const tick = () => {
      const live = liveVehicleStats[rideId];
      if (live) {
        // 얕은 복사로 새 객체 생성 → React가 변경 감지
        setData({ ...live });
      }
    };

    // 즉시 1회 읽기
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [rideId, intervalMs]);

  // rideId가 null이면 stale data 무시
  if (!rideId) return null;
  return data;
}

interface RideTestState {
  /** 활성 테스트 셋 (rideId → true). 실시간 데이터는 뮤터블 버퍼에 저장. */
  activeTests: Record<string, true>;
  /** 카메라가 추적하는 라이드 ID */
  focusedRideId: string | null;
  /** 카메라 모드 */
  cameraMode: RideCameraMode;
  /** 라이드별 완주 통계 (영구 보관) */
  completedStatsMap: Record<string, RideStats>;
  /** 테스트 시작 전 카메라 상태 (복원용) */
  savedCameraState: SavedCameraState | null;
}

interface RideTestActions {
  /** 테스트 운행 시작 (해당 라이드를 포커스) */
  startTest: (rideId: string) => void;
  /** 특정 라이드 테스트 중지 */
  stopTest: (rideId: string) => void;
  /** 모든 테스트 중지 */
  stopAllTests: () => void;
  /** 카메라 포커스 변경 */
  setFocusedRide: (rideId: string | null) => void;
  /** 카메라 모드 변경 */
  setCameraMode: (mode: RideCameraMode) => void;
  /** 1바퀴 완주 시 통계 저장 + 테스트 종료 */
  setCompletedStats: (rideId: string, stats: RideStats) => void;
  /** 맵 로드 시 저장된 통계 복원 */
  restoreStats: (statsMap: Record<string, RideStats>) => void;
  /** 테스트 시작 전 카메라 상태 저장 */
  saveCameraState: (state: SavedCameraState) => void;
  /** 저장된 카메라 상태 꺼내기 (반환 후 null로 클리어) */
  popCameraState: () => SavedCameraState | null;
  /** 라이드가 테스트 중인지 확인 */
  isTestRunning: (rideId: string) => boolean;
  /** 활성 테스트 수 */
  getActiveCount: () => number;
}

const useRideTestStore = create<RideTestState & RideTestActions>()((set, get) => ({
  activeTests: {},
  focusedRideId: null,
  cameraMode: 'free',
  completedStatsMap: {},
  savedCameraState: null,

  startTest: (rideId) => {
    // 뮤터블 버퍼 초기화
    writeLiveVehicleStats(rideId, 0, 0, 1, 0);
    set((s) => ({
      activeTests: { ...s.activeTests, [rideId]: true },
      focusedRideId: rideId,
    }));
  },

  stopTest: (rideId) => {
    clearLiveVehicleStats(rideId);
    set((s) => {
      const newTests = { ...s.activeTests };
      delete newTests[rideId];
      const remainingIds = Object.keys(newTests);
      return {
        activeTests: newTests,
        focusedRideId: s.focusedRideId === rideId
          ? (remainingIds.length > 0 ? remainingIds[0] : null)
          : s.focusedRideId,
        cameraMode: remainingIds.length === 0 ? 'free' : s.cameraMode,
      };
    });
  },

  stopAllTests: () => {
    clearAllLiveStats();
    set({
      activeTests: {},
      focusedRideId: null,
      cameraMode: 'free',
    });
  },

  setFocusedRide: (rideId) => set({ focusedRideId: rideId }),

  setCameraMode: (mode) => set({ cameraMode: mode }),

  setCompletedStats: (rideId, stats) => {
    clearLiveVehicleStats(rideId);
    set((s) => {
      const newTests = { ...s.activeTests };
      delete newTests[rideId];
      const remainingIds = Object.keys(newTests);
      return {
        completedStatsMap: { ...s.completedStatsMap, [rideId]: stats },
        activeTests: newTests,
        focusedRideId: s.focusedRideId === rideId
          ? (remainingIds.length > 0 ? remainingIds[0] : null)
          : s.focusedRideId,
        cameraMode: remainingIds.length === 0 ? 'free' : s.cameraMode,
      };
    });
  },

  restoreStats: (statsMap) => set({ completedStatsMap: statsMap }),

  saveCameraState: (state) => set({ savedCameraState: state }),

  popCameraState: () => {
    const saved = get().savedCameraState;
    if (saved) set({ savedCameraState: null });
    return saved;
  },

  isTestRunning: (rideId) => !!get().activeTests[rideId],

  getActiveCount: () => Object.keys(get().activeTests).length,
}));

export default useRideTestStore;
