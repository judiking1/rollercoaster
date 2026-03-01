/**
 * terrain.ts — 지형 시스템 관련 타입 정의
 */

import type { GridPosition, GridSize } from './common.ts';

/**
 * 지형 편집 도구
 * - sculpt: 드래그 방향으로 지형 편집 (위로 드래그 = 올리기, 아래로 = 내리기)
 * - flatten: 영역 내 정점을 평균 높이로 맞춤
 */
export type TerrainTool = 'sculpt' | 'flatten';

/** 지형 상태 */
export interface TerrainState {
  heightMap: number[];
  gridSize: GridSize;
}

/** 지형 브러시 설정 (격자 셀 기반) */
export interface TerrainBrush {
  tool: TerrainTool;
  /** 브러시 크기: NxN 격자 셀 (1~5) */
  size: number;
}

/**
 * 서브 셀렉션 모드 (RCT 스타일)
 * - corner: 마우스가 꼭지점 근처 → 단일 정점만 편집, 인접 삼각형 하이라이트
 * - full: 마우스가 면 중앙 → 브러시 영역 전체 편집
 */
export type SubSelectionMode = 'corner' | 'full';

/** 서브 셀렉션 결과 */
export interface SubSelection {
  mode: SubSelectionMode;
  /** corner 모드일 때 대상 정점 */
  cornerVertex: GridPosition | null;
  /** 하이라이트할 셀 목록 */
  highlightCells: GridPosition[];
  /** 편집 시 영향받는 정점 목록 */
  affectedVertices: GridPosition[];
  /** 높이 힌트 표시할 높이 (m) */
  hintHeight: number;
  /** 힌트 라벨 월드 좌표 */
  hintPosition: { x: number; y: number; z: number };
}
