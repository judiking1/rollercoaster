/**
 * ride.ts — 놀이기구 관련 타입 정의
 * Phase 5: 차량/물리 시뮬레이션 지원 타입 추가
 */

import type { SegmentType, SpecialType } from './track.ts';

/** 놀이기구 카테고리 */
export type RideCategory = 'coaster' | 'flat' | 'water';

/** 놀이기구 정의 (데이터 주도 설계) */
export interface RideDefinition {
  name: string;
  category: RideCategory;
  availableSegments: readonly SegmentType[];
  availableSpecials: readonly SpecialType[];
  vehicleOptions: readonly string[];
  physics: {
    friction: number;
    airResistance: number;
    maxBankAngle: number;
  };
  cost?: number; // 예약: 재정 시스템 (Phase 8+)
}

/** 운행 통계 */
export interface RideStats {
  maxSpeed: number;
  maxHeight: number;
  maxGForce: number;
  maxLateralG: number;
  trackLength: number;
  rideTime: number;
}

/** 차량 설정 */
export interface VehicleConfig {
  type: string;
  trainCount: number;
  carsPerTrain: number;
}

/** 테스트 운행 카메라 모드 */
export type RideCameraMode = 'free' | 'firstPerson' | 'thirdPerson';

/** 테스트 운행 상태 */
export type RideTestStatus = 'idle' | 'running' | 'completed';

/** 차량 프레임별 물리 상태 (ref 기반 관리) */
export interface VehicleFrameState {
  distance: number;
  speed: number;
  elapsedTime: number;
  maxSpeed: number;
  maxHeight: number;
  maxGForce: number;
  maxLateralG: number;
  hasCompletedLap: boolean;
}

/** 놀이기구 정의 데이터 (데이터 주도) */
export const RIDE_DEFINITIONS = {
  steel_coaster: {
    name: '스틸 코스터',
    category: 'coaster',
    availableSegments: ['straight', 'left_gentle', 'left_sharp', 'right_gentle', 'right_sharp', 'slope_up', 'slope_down'],
    availableSpecials: ['normal', 'chain_lift', 'brake', 'booster'],
    vehicleOptions: ['standard_car'],
    physics: {
      friction: 0.02,
      airResistance: 0.001,
      maxBankAngle: 90,
    },
  },
  wooden_coaster: {
    name: '우드 코스터',
    category: 'coaster',
    availableSegments: ['straight', 'left_gentle', 'right_gentle', 'slope_up', 'slope_down'],
    availableSpecials: ['normal', 'chain_lift', 'brake'],
    vehicleOptions: ['wooden_car'],
    physics: {
      friction: 0.04,
      airResistance: 0.001,
      maxBankAngle: 60,
    },
  },
} as const satisfies Record<string, RideDefinition>;

/** 놀이기구 타입 키 */
export type RideTypeKey = keyof typeof RIDE_DEFINITIONS;

/** 주어진 rideType에 대한 기본 VehicleConfig 반환 */
export function getDefaultVehicleConfig(rideType: string): VehicleConfig {
  const def = RIDE_DEFINITIONS[rideType as RideTypeKey];
  return {
    type: def?.vehicleOptions[0] ?? 'standard_car',
    trainCount: 1,
    carsPerTrain: 4,
  };
}
