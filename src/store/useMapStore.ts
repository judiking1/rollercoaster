/**
 * useMapStore.ts — 맵 관리 Zustand 스토어
 * 맵 CRUD (생성/저장/불러오기/삭제/이름변경) 및 현재 맵 상태 관리
 */

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { MapFile } from '../core/types/index.ts';
import type { MapSizePreset } from '../core/types/index.ts';
import type { SavedMapEntry } from '../core/utils/storage.ts';
import {
  createEmptyMapFile,
  serializeMap,
  deserializeMap,
} from '../core/utils/serializer.ts';
import {
  loadMapList,
  saveMapList,
  loadMapData,
  saveMapData,
  removeMapData,
} from '../core/utils/storage.ts';
import useTerrainStore from './useTerrainStore.ts';
import useTrackStore from './useTrackStore.ts';

interface MapState {
  savedMaps: SavedMapEntry[];
  currentMapId: string | null;
  currentMapData: MapFile | null;
}

interface MapActions {
  /** localStorage에서 맵 목록 로드 */
  loadSavedMapList: () => void;
  /** 새 맵 생성 + 즉시 저장 */
  createMap: (name: string, sizePreset?: MapSizePreset) => string;
  /** 현재 맵을 localStorage에 저장 */
  saveMap: () => void;
  /** 맵 불러오기 */
  loadMap: (id: string) => boolean;
  /** 맵 삭제 */
  deleteMap: (id: string) => void;
  /** 맵 이름 변경 */
  renameMap: (id: string, newName: string) => void;
  /** 현재 맵 닫기 */
  closeMap: () => void;
}

const useMapStore = create<MapState & MapActions>()((set, get) => ({
  // --- State ---
  savedMaps: [],
  currentMapId: null,
  currentMapData: null,

  // --- Actions ---

  loadSavedMapList: () => {
    const entries = loadMapList();
    set({ savedMaps: entries });
  },

  createMap: (name, sizePreset) => {
    const id = uuidv4();
    const mapFile = createEmptyMapFile(name, sizePreset);

    // localStorage에 맵 데이터 저장
    const jsonString = serializeMap({
      meta: mapFile.meta,
      settings: mapFile.settings,
      terrain: mapFile.terrain,
      rides: mapFile.rides,
    });
    saveMapData(id, jsonString);

    // 맵 목록에 엔트리 추가
    const entry: SavedMapEntry = {
      id,
      name: mapFile.meta.name,
      createdAt: mapFile.meta.createdAt,
      updatedAt: mapFile.meta.updatedAt,
      gridSize: { ...mapFile.settings.gridSize },
    };
    const newList = [...get().savedMaps, entry];
    saveMapList(newList);

    set({
      savedMaps: newList,
      currentMapId: id,
      currentMapData: mapFile,
    });

    return id;
  },

  saveMap: () => {
    const { currentMapId, currentMapData } = get();
    if (!currentMapId || !currentMapData) return;

    // 게임 중 편집된 heightMap을 terrain 스토어에서 가져와 반영
    const terrainState = useTerrainStore.getState();
    const terrain = terrainState.isInitialized
      ? { heightMap: terrainState.heightMap }
      : currentMapData.terrain;

    // 트랙 스토어에서 현재 놀이기구 데이터 가져오기
    const trackState = useTrackStore.getState();
    const rides = Object.values(trackState.rides);

    const jsonString = serializeMap({
      meta: currentMapData.meta,
      settings: currentMapData.settings,
      terrain,
      rides,
    });
    saveMapData(currentMapId, jsonString);

    // 목록의 updatedAt 갱신
    const updatedAt = new Date().toISOString();
    const newList = get().savedMaps.map((entry) =>
      entry.id === currentMapId ? { ...entry, updatedAt } : entry,
    );
    saveMapList(newList);

    // currentMapData도 rides 동기화하여 갱신
    set({
      savedMaps: newList,
      currentMapData: {
        ...currentMapData,
        meta: { ...currentMapData.meta, updatedAt },
        rides,
      },
    });
  },

  loadMap: (id) => {
    const jsonString = loadMapData(id);
    if (!jsonString) return false;

    try {
      const mapFile = deserializeMap(jsonString);
      set({ currentMapId: id, currentMapData: mapFile });
      return true;
    } catch (e) {
      console.error('맵 로드 실패:', e);
      return false;
    }
  },

  deleteMap: (id) => {
    removeMapData(id);
    const newList = get().savedMaps.filter((entry) => entry.id !== id);
    saveMapList(newList);

    // 현재 열린 맵이 삭제 대상이면 닫기
    const updates: Partial<MapState> = { savedMaps: newList };
    if (get().currentMapId === id) {
      updates.currentMapId = null;
      updates.currentMapData = null;
    }
    set(updates);
  },

  renameMap: (id, newName) => {
    // 목록 업데이트
    const newList = get().savedMaps.map((entry) =>
      entry.id === id ? { ...entry, name: newName } : entry,
    );
    saveMapList(newList);

    // 맵 데이터 내부의 이름도 업데이트
    const jsonString = loadMapData(id);
    if (jsonString) {
      try {
        const mapFile = deserializeMap(jsonString);
        mapFile.meta.name = newName;
        mapFile.meta.updatedAt = new Date().toISOString();
        const updatedJson = serializeMap({
          meta: mapFile.meta,
          settings: mapFile.settings,
          terrain: mapFile.terrain,
          rides: mapFile.rides,
        });
        saveMapData(id, updatedJson);
      } catch (e) {
        console.error('맵 이름 변경 중 데이터 업데이트 실패:', e);
      }
    }

    // 현재 열린 맵이면 메모리 상태도 갱신
    const { currentMapId, currentMapData } = get();
    if (currentMapId === id && currentMapData) {
      set({
        savedMaps: newList,
        currentMapData: {
          ...currentMapData,
          meta: { ...currentMapData.meta, name: newName },
        },
      });
    } else {
      set({ savedMaps: newList });
    }
  },

  closeMap: () => {
    set({ currentMapId: null, currentMapData: null });
  },
}));

export default useMapStore;
