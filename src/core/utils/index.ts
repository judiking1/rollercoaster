/**
 * index.ts — 유틸리티 barrel export
 */

export {
  serializeMap,
  deserializeMap,
  createEmptyMapFile,
} from './serializer.ts';
export type { SerializeInput } from './serializer.ts';

export {
  loadMapList,
  saveMapList,
  loadMapData,
  saveMapData,
  removeMapData,
  localStorageAdapter,
} from './storage.ts';
export type { SavedMapEntry, StorageAdapter } from './storage.ts';
