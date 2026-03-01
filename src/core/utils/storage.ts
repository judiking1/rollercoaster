/**
 * storage.ts — localStorage 어댑터
 * 인터페이스 분리로 추후 IndexedDB/서버 교체 가능
 */

/** 저장된 맵 목록 표시용 경량 메타데이터 */
export interface SavedMapEntry {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  gridSize: { x: number; z: number };
}

/** 스토리지 어댑터 인터페이스 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// ─── 키 관리 ────────────────────────────────────────────────

const KEY_PREFIX = 'rct_';
const MAP_LIST_KEY = `${KEY_PREFIX}map_list`;
const mapDataKey = (id: string) => `${KEY_PREFIX}map_${id}`;

// ─── 기본 localStorage 어댑터 ──────────────────────────────

export const localStorageAdapter: StorageAdapter = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};

// ─── 맵 목록 헬퍼 ──────────────────────────────────────────

/**
 * 저장된 맵 목록(메타데이터) 로드
 */
export function loadMapList(adapter: StorageAdapter = localStorageAdapter): SavedMapEntry[] {
  const raw = adapter.getItem(MAP_LIST_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedMapEntry[];
  } catch {
    return [];
  }
}

/**
 * 맵 목록 저장
 */
export function saveMapList(
  entries: readonly SavedMapEntry[],
  adapter: StorageAdapter = localStorageAdapter,
): void {
  adapter.setItem(MAP_LIST_KEY, JSON.stringify(entries));
}

// ─── 개별 맵 데이터 헬퍼 ───────────────────────────────────

/**
 * 개별 맵 데이터(JSON 문자열) 로드
 */
export function loadMapData(
  id: string,
  adapter: StorageAdapter = localStorageAdapter,
): string | null {
  return adapter.getItem(mapDataKey(id));
}

/**
 * 개별 맵 데이터 저장
 */
export function saveMapData(
  id: string,
  jsonString: string,
  adapter: StorageAdapter = localStorageAdapter,
): void {
  adapter.setItem(mapDataKey(id), jsonString);
}

/**
 * 개별 맵 데이터 삭제
 */
export function removeMapData(
  id: string,
  adapter: StorageAdapter = localStorageAdapter,
): void {
  adapter.removeItem(mapDataKey(id));
}
