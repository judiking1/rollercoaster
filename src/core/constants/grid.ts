/**
 * grid.ts — 그리드 및 지형 관련 상수
 */

import type { GridSize, MapSizePreset } from '../types/common.ts';

/** 1 그리드 = 1 미터 */
export const GRID_UNIT = 1;

/** 높이 변경 최소 단위 (미터) */
export const HEIGHT_STEP = 0.5;

/** 최대 높이 (미터) */
export const MAX_HEIGHT = 50;

/** 최소 높이 (미터) */
export const MIN_HEIGHT = -10;

/** 맵 크기 프리셋 */
export const MAP_SIZE_PRESETS: Record<MapSizePreset, GridSize> = {
  S: { x: 32, z: 32 },
  M: { x: 64, z: 64 },
  L: { x: 128, z: 128 },
} as const;

/** 기본 맵 크기 */
export const DEFAULT_MAP_SIZE: MapSizePreset = 'M';

// ─── 지형 편집 상수 ────────────────────────────────────────────

/** Undo 스택 최대 깊이 */
export const MAX_UNDO_DEPTH = 50;

/** 기본 브러시 크기 (NxN 격자 셀 단위) */
export const DEFAULT_BRUSH_SIZE = 1;
/** 최소 브러시 크기 */
export const MIN_BRUSH_SIZE = 1;
/** 최대 브러시 크기 */
export const MAX_BRUSH_SIZE = 5;

/** 드래그 편집 쓰로틀 간격 (ms) */
export const DRAG_THROTTLE_MS = 150;

/** 스컬프트 드래그 임계값 (화면 px, 이만큼 마우스 이동 시 1 HEIGHT_STEP 적용) */
export const SCULPT_DRAG_THRESHOLD = 20;

/** WASD 카메라 이동 속도 (units/초) */
export const CAMERA_PAN_SPEED = 30;

/** 그리드 오버레이 Y 오프셋 (z-fighting 방지) */
export const GRID_OVERLAY_Y_OFFSET = 0.02;
/** 커서 Y 오프셋 */
export const CURSOR_Y_OFFSET = 0.05;
