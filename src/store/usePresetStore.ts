/**
 * usePresetStore.ts — 프리셋 상태 관리
 * 프리셋 목록 + 배치 모드 상태 + localStorage 연동
 */

import { create } from 'zustand';
import type { Vector3Data, RidePreset, ResolvedNode } from '../core/types/index.ts';

const STORAGE_KEY = 'rollercoaster-presets';

function loadFromStorage(): Record<string, RidePreset> {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return {};
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function saveToStorage(presets: Record<string, RidePreset>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    console.error('Failed to save presets to localStorage');
  }
}

interface PresetStoreState {
  presets: Record<string, RidePreset>;
  activePresetId: string | null;
  previewPosition: Vector3Data | null;
  previewDirection: number;
  previewValid: boolean;
  resolvedNodes: ResolvedNode[];
}

interface PresetStoreActions {
  /** localStorage에서 프리셋 목록 로드 */
  loadPresets: () => void;
  /** 프리셋 저장 (localStorage + 스토어) */
  savePreset: (preset: RidePreset) => void;
  /** 프리셋 삭제 */
  deletePreset: (presetId: string) => void;
  /** 배치 모드 활성화 (프리셋 선택) */
  setActivePreset: (presetId: string | null) => void;
  /** 프리뷰 상태 업데이트 (호버 시) */
  updatePreview: (
    position: Vector3Data | null,
    direction: number,
    valid: boolean,
    nodes: ResolvedNode[],
  ) => void;
  /** 프리뷰 방향 회전 (delta degrees) */
  rotatePreview: (delta: number) => void;
  /** 배치 모드 초기화 */
  resetPlacement: () => void;
}

const usePresetStore = create<PresetStoreState & PresetStoreActions>()((set, get) => ({
  presets: {},
  activePresetId: null,
  previewPosition: null,
  previewDirection: 0,
  previewValid: false,
  resolvedNodes: [],

  loadPresets: () => {
    set({ presets: loadFromStorage() });
  },

  savePreset: (preset) => {
    const newPresets = { ...get().presets, [preset.id]: preset };
    set({ presets: newPresets });
    saveToStorage(newPresets);
  },

  deletePreset: (presetId) => {
    const newPresets = { ...get().presets };
    delete newPresets[presetId];
    set({
      presets: newPresets,
      activePresetId: get().activePresetId === presetId ? null : get().activePresetId,
    });
    saveToStorage(newPresets);
  },

  setActivePreset: (presetId) => set({
    activePresetId: presetId,
    previewPosition: null,
    previewDirection: 0,
    previewValid: false,
    resolvedNodes: [],
  }),

  updatePreview: (position, direction, valid, nodes) => set({
    previewPosition: position,
    previewDirection: direction,
    previewValid: valid,
    resolvedNodes: nodes,
  }),

  rotatePreview: (delta) => set((s) => ({
    previewDirection: ((s.previewDirection + delta) % 360 + 360) % 360,
  })),

  resetPlacement: () => set({
    activePresetId: null,
    previewPosition: null,
    previewDirection: 0,
    previewValid: false,
    resolvedNodes: [],
  }),
}));

export default usePresetStore;
