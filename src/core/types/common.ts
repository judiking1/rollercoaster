/**
 * common.ts — 프로젝트 전역에서 사용되는 공통 타입 정의
 */

/** 3D 좌표 (x, y, z) */
export interface Vector3Data {
  x: number;
  y: number;
  z: number;
}

/** 2D 그리드 좌표 (x, z) — y축은 높이이므로 그리드에서 제외 */
export interface GridPosition {
  x: number;
  z: number;
}

/** 그리드 크기 */
export interface GridSize {
  x: number;
  z: number;
}

/** 맵 크기 프리셋 */
export type MapSizePreset = 'S' | 'M' | 'L';

/** 맵 메타데이터 */
export interface MapMeta {
  name: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  description: string;
}

/** 맵 설정 */
export interface MapSettings {
  gridSize: GridSize;
  gridUnit: number;
  heightStep: number;
  maxHeight: number;
  minHeight: number;
}

/** 맵 파일 최상위 구조 */
export interface MapFile {
  version: string;
  meta: MapMeta;
  settings: MapSettings;
  terrain: {
    heightMap: number[];
  };
  rides: RideData[];
}

/** 놀이기구 데이터 (Phase 4+ 에서 확장) */
export interface RideData {
  id: string;
  type: string;
  name: string;
}

/** 게임 씬 */
export type SceneType = 'mainMenu' | 'mapSelect' | 'game';

/** 게임 모드 */
export type GameMode = 'view' | 'terrain' | 'track' | 'ride';
