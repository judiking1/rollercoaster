/**
 * track.ts — 트랙 시스템 관련 타입 정의
 * Phase 4에서 구체적으로 확장 예정
 */

import type { Vector3Data } from './common.ts';

/** 트랙 세그먼트 타입 */
export const SEGMENT_TYPES = [
  'straight',
  'left_gentle',
  'left_sharp',
  'right_gentle',
  'right_sharp',
  'slope_up',
  'slope_down',
] as const;
export type SegmentType = typeof SEGMENT_TYPES[number];

/** 특수 트랙 타입 */
export const SPECIAL_TYPES = ['normal', 'chain_lift', 'brake', 'booster'] as const;
export type SpecialType = typeof SPECIAL_TYPES[number];

/** 트랙 세그먼트 */
export interface TrackSegment {
  id: string;
  type: SegmentType;
  specialType: SpecialType;
  bankAngle: number;
  heightDelta: number;
  position: Vector3Data;
  direction: number; // degrees
}

/** 정거장 */
export interface Station {
  position: Vector3Data;
  rotation: number;
  entranceOffset: { x: number; z: number };
  exitOffset: { x: number; z: number };
}
