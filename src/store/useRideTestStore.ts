/**
 * useRideTestStore.ts — 테스트 운행 상태 관리
 * 다중 동시 테스트 지원: 각 라이드 독립 실행, 카메라는 포커스 라이드 추적
 */

import { create } from 'zustand';
import type { RideCameraMode, RideStats, SavedCameraState } from '../core/types/ride.ts';

/** 개별 라이드 테스트 실시간 데이터 */
interface RideTestEntry {
  /** 현재 속도 (m/s) */
  currentSpeed: number;
  /** 현재 높이 (m) */
  currentHeight: number;
  /** 현재 수직 G-Force */
  currentVerticalG: number;
  /** 현재 횡 G-Force */
  currentLateralG: number;
}

interface RideTestState {
  /** 활성 테스트 맵 (rideId → 실시간 데이터) */
  activeTests: Record<string, RideTestEntry>;
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
  /** Vehicle에서 주기적으로 호출하여 UI 상태 동기화 */
  syncFromVehicle: (rideId: string, speed: number, height: number, verticalG: number, lateralG: number) => void;
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

  startTest: (rideId) => set((s) => ({
    activeTests: {
      ...s.activeTests,
      [rideId]: {
        currentSpeed: 0,
        currentHeight: 0,
        currentVerticalG: 1,
        currentLateralG: 0,
      },
    },
    focusedRideId: rideId,
  })),

  stopTest: (rideId) => set((s) => {
    const newTests = { ...s.activeTests };
    delete newTests[rideId];
    const remainingIds = Object.keys(newTests);
    return {
      activeTests: newTests,
      // 포커스된 라이드가 중지되면 다른 활성 테스트로 전환
      focusedRideId: s.focusedRideId === rideId
        ? (remainingIds.length > 0 ? remainingIds[0] : null)
        : s.focusedRideId,
      cameraMode: remainingIds.length === 0 ? 'free' : s.cameraMode,
    };
  }),

  stopAllTests: () => set({
    activeTests: {},
    focusedRideId: null,
    cameraMode: 'free',
  }),

  setFocusedRide: (rideId) => set({ focusedRideId: rideId }),

  setCameraMode: (mode) => set({ cameraMode: mode }),

  syncFromVehicle: (rideId, speed, height, verticalG, lateralG) => set((s) => {
    if (!s.activeTests[rideId]) return s;
    return {
      activeTests: {
        ...s.activeTests,
        [rideId]: {
          currentSpeed: speed,
          currentHeight: height,
          currentVerticalG: verticalG,
          currentLateralG: lateralG,
        },
      },
    };
  }),

  setCompletedStats: (rideId, stats) => set((s) => {
    // 통계 저장 + 테스트 종료
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
  }),

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
