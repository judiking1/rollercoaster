/**
 * ride.ts — 놀이기구 관련 타입 정의
 * Phase 4+에서 구체적으로 확장 예정
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
  trackLength: number;
  rideTime: number;
}

/** 차량 설정 */
export interface VehicleConfig {
  type: string;
  trainCount: number;
  carsPerTrain: number;
}
