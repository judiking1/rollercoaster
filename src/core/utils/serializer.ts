/**
 * serializer.ts — MapFile <-> JSON 직렬화/역직렬화
 * 순수 함수만 포함, React/Zustand 의존 없음
 */

import type { MapFile, MapSettings, MapMeta } from '../types/index.ts';
import {
  GRID_UNIT,
  HEIGHT_STEP,
  MAX_HEIGHT,
  MIN_HEIGHT,
  MAP_SIZE_PRESETS,
  DEFAULT_MAP_SIZE,
} from '../constants/index.ts';
import type { MapSizePreset } from '../types/index.ts';

/** 현재 맵 파일 버전 */
const CURRENT_VERSION = '1.0.0';

/** serializeMap에 전달할 입력 타입 */
export interface SerializeInput {
  meta: MapMeta;
  settings: MapSettings;
  terrain: { heightMap: number[] };
  rides: MapFile['rides'];
}

/**
 * 스토어 데이터를 JSON 문자열로 변환
 */
export function serializeMap(input: SerializeInput): string {
  const mapFile: MapFile = {
    version: CURRENT_VERSION,
    meta: {
      ...input.meta,
      updatedAt: new Date().toISOString(),
    },
    settings: input.settings,
    terrain: { heightMap: [...input.terrain.heightMap] },
    rides: [...input.rides],
  };
  return JSON.stringify(mapFile);
}

/**
 * JSON 문자열을 MapFile로 파싱 + 구조 검증
 */
export function deserializeMap(jsonString: string): MapFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('맵 데이터를 파싱할 수 없습니다. 유효한 JSON이 아닙니다.');
  }

  if (!isValidMapFile(parsed)) {
    throw new Error('맵 데이터 구조가 올바르지 않습니다.');
  }

  return parsed;
}

/**
 * 빈 맵 파일 생성 헬퍼
 */
export function createEmptyMapFile(
  name: string,
  sizePreset: MapSizePreset = DEFAULT_MAP_SIZE,
): MapFile {
  const gridSize = MAP_SIZE_PRESETS[sizePreset];
  const now = new Date().toISOString();
  const vertexCount = (gridSize.x + 1) * (gridSize.z + 1);

  return {
    version: CURRENT_VERSION,
    meta: {
      name,
      author: 'Player',
      createdAt: now,
      updatedAt: now,
      description: '',
    },
    settings: {
      gridSize: { ...gridSize },
      gridUnit: GRID_UNIT,
      heightStep: HEIGHT_STEP,
      maxHeight: MAX_HEIGHT,
      minHeight: MIN_HEIGHT,
    },
    terrain: {
      heightMap: new Array<number>(vertexCount).fill(0),
    },
    rides: [],
  };
}

// ─── 타입 가드 ───────────────────────────────────────────────

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidMapMeta(value: unknown): value is MapMeta {
  if (!isObject(value)) return false;
  return (
    typeof value.name === 'string' &&
    typeof value.author === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    typeof value.description === 'string'
  );
}

function isValidMapSettings(value: unknown): value is MapSettings {
  if (!isObject(value)) return false;
  const gs = value.gridSize;
  if (!isObject(gs) || typeof gs.x !== 'number' || typeof gs.z !== 'number') return false;
  return (
    typeof value.gridUnit === 'number' &&
    typeof value.heightStep === 'number' &&
    typeof value.maxHeight === 'number' &&
    typeof value.minHeight === 'number'
  );
}

function isValidMapFile(value: unknown): value is MapFile {
  if (!isObject(value)) return false;
  if (typeof value.version !== 'string') return false;
  if (!isValidMapMeta(value.meta)) return false;
  if (!isValidMapSettings(value.settings)) return false;

  // terrain
  const terrain = value.terrain;
  if (!isObject(terrain)) return false;
  if (!Array.isArray(terrain.heightMap)) return false;

  // rides
  if (!Array.isArray(value.rides)) return false;

  return true;
}
