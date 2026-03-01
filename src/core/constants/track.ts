/**
 * track.ts — 트랙 시스템 상수
 */

/** 직선 세그먼트 기본 길이 (units) */
export const SEGMENT_LENGTH = 4;

/** 경사 세그먼트 높이 변화량 (units) */
export const SLOPE_HEIGHT_DELTA = 2;

/** 기본 정거장 길이 (세그먼트 수) */
export const DEFAULT_STATION_LENGTH = 4;

/** 스냅 판정 반경 (units) */
export const SNAP_RADIUS = 6;

/** 충돌 최소 거리 (units) */
export const COLLISION_MIN_DISTANCE = 2;

/** 놀이기구당 최대 세그먼트 수 */
export const MAX_SEGMENTS_PER_RIDE = 500;

/** 정거장 배치 방향 회전 단위 (degrees) */
export const STATION_ROTATION_STEP = 90;
