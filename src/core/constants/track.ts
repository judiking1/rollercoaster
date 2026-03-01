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

/** 지지대 기둥 최소 높이 (이하면 기둥 생략) */
export const SUPPORT_MIN_HEIGHT = 0.5;

/** 지지대 기둥 반지름 */
export const SUPPORT_RADIUS = 0.15;

/** 트랙 클리어런스 반경 (units) */
export const TRACK_CLEARANCE_RADIUS = 1.5;

/** 터널 아치 반지름 (units) */
export const TUNNEL_RADIUS = 2.0;

/** 터널 아치 단면 분할 수 */
export const TUNNEL_ARCH_SEGMENTS = 8;

/** 지형보다 이만큼 아래여야 터널 생성 (units) */
export const TUNNEL_DETECTION_MARGIN = 0.3;
