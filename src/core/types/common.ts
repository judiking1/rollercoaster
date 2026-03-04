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

/** 놀이기구 저장 데이터 — Ride의 직렬화 가능 서브셋 */
export interface RideData {
  id: string;
  name: string;
  rideType: string;
  station: {
    position: { x: number; y: number; z: number };
    direction: number;
    length: number;
  };
  nodes: Record<string, {
    id: string;
    position: { x: number; y: number; z: number };
    direction: number;
    type: string;
    nextSegmentId: string | null;
    prevSegmentId: string | null;
  }>;
  segments: Record<string, {
    id: string;
    type: string;
    specialType: string;
    startNodeId: string;
    endNodeId: string;
    length: number;
  }>;
  headNodeId: string;
  counters: { node: number; segment: number };
  isComplete: boolean;
  /** 차량 설정 (옵셔널 — 기존 맵 호환) */
  vehicleConfig?: {
    type: string;
    trainCount: number;
    carsPerTrain: number;
  };
  /** 테스트 운행 완주 통계 (옵셔널 — 기존 맵 호환) */
  stats?: {
    maxSpeed: number;
    maxHeight: number;
    maxGForce: number;
    maxLateralG: number;
    trackLength: number;
    rideTime: number;
  };
}

/** 게임 씬 */
export type SceneType = 'mainMenu' | 'mapSelect' | 'game';

/** 게임 모드 */
export type GameMode = 'view' | 'terrain' | 'track' | 'ride';
