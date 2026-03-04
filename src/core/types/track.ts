/**
 * track.ts — 트랙 시스템 관련 타입 정의
 * Node-Segment 그래프 모델: 무효 연결 구조적 방지
 */

import type { Vector3Data } from './common.ts';

// ─── 세그먼트/특수 타입 유니언 ────────────────────────────

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

// ─── Node-Segment 그래프 모델 ─────────────────────────────

/** 노드 타입: station_start/end는 정거장 양 끝, normal은 일반 */
export type TrackNodeType = 'station_start' | 'station_end' | 'normal';

/** 트랙 노드: 그래프의 정점 */
export interface TrackNode {
  id: string;
  position: Vector3Data;
  /** 진행 방향 (degrees, 0=+Z, 시계방향) */
  direction: number;
  type: TrackNodeType;
  /** 이 노드에서 출발하는 세그먼트 ID (null이면 끝) */
  nextSegmentId: string | null;
  /** 이 노드로 도착하는 세그먼트 ID (null이면 시작) */
  prevSegmentId: string | null;
}

/** 트랙 세그먼트: 그래프의 간선 */
export interface TrackSegment {
  id: string;
  type: SegmentType;
  specialType: SpecialType;
  /** 시작 노드 ID */
  startNodeId: string;
  /** 끝 노드 ID */
  endNodeId: string;
  /** 세그먼트 길이 (units) */
  length: number;
}

// ─── 정거장 ─────────────────────────────────────────────

/** 정거장 정의 */
export interface Station {
  position: Vector3Data;
  /** 정거장 방향 (degrees, 0=+Z, 시계방향) */
  direction: number;
  /** 정거장 길이 (세그먼트 수) */
  length: number;
}

// ─── 놀이기구 (Ride) ────────────────────────────────────

/** ID 카운터 (ride별 고유 노드/세그먼트 ID 생성) */
export interface RideCounters {
  node: number;
  segment: number;
}

/** 놀이기구 전체 데이터 */
export interface Ride {
  id: string;
  name: string;
  rideType: string;
  station: Station;
  /** 노드 저장소 (Record for O(1) lookup) */
  nodes: Record<string, TrackNode>;
  /** 세그먼트 저장소 (Record for O(1) lookup) */
  segments: Record<string, TrackSegment>;
  /** 현재 빌딩 헤드 노드 ID (마지막 노드) */
  headNodeId: string;
  /** ID 생성 카운터 */
  counters: RideCounters;
  /** 트랙이 폐쇄되었는지 여부 */
  isComplete: boolean;
  /** 차량 설정 */
  vehicleConfig: import('./ride.ts').VehicleConfig;
}

// ─── 빌더 모드 ──────────────────────────────────────────

/** 트랙 빌더 모드 */
export type TrackBuilderMode = 'idle' | 'placing_station' | 'building';

/** 프리뷰 데이터 */
export interface TrackPreviewData {
  position: Vector3Data;
  direction: number;
  segmentType: SegmentType;
  isValid: boolean;
}
