/**
 * useTerrainStore.ts — 지형 상태 관리 Zustand 스토어
 * heightMap, 브러시 설정, Undo/Redo 스택
 */

import { create } from 'zustand';
import type { GridSize, TerrainBrush, TerrainTool } from '../core/types/index.ts';
import { MAX_UNDO_DEPTH, DEFAULT_BRUSH_SIZE } from '../core/constants/index.ts';

interface TerrainStoreState {
  heightMap: number[];
  gridSize: GridSize;
  isInitialized: boolean;
  brush: TerrainBrush;
  undoStack: number[][];
  redoStack: number[][];
}

interface TerrainStoreActions {
  initTerrain: (sizeX: number, sizeZ: number) => void;
  initFromMapData: (heightMap: number[], gridSize: GridSize) => void;
  setHeightMap: (heightMap: number[]) => void;
  setVertexHeight: (x: number, z: number, h: number) => void;
  getVertexHeight: (x: number, z: number) => number;

  setBrushTool: (tool: TerrainTool) => void;
  setBrushSize: (size: number) => void;

  pushUndoSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  resetTerrain: () => void;
}

const initialState: TerrainStoreState = {
  heightMap: [],
  gridSize: { x: 0, z: 0 },
  isInitialized: false,
  brush: {
    tool: 'sculpt',
    size: DEFAULT_BRUSH_SIZE,
  },
  undoStack: [],
  redoStack: [],
};

const useTerrainStore = create<TerrainStoreState & TerrainStoreActions>()((set, get) => ({
  ...initialState,

  // --- 초기화 ---

  initTerrain: (sizeX, sizeZ) => {
    const vertexCount = (sizeX + 1) * (sizeZ + 1);
    set({
      heightMap: new Array<number>(vertexCount).fill(0),
      gridSize: { x: sizeX, z: sizeZ },
      isInitialized: true,
      undoStack: [],
      redoStack: [],
    });
  },

  initFromMapData: (heightMap, gridSize) => {
    set({
      heightMap: [...heightMap],
      gridSize: { ...gridSize },
      isInitialized: true,
      undoStack: [],
      redoStack: [],
    });
  },

  // --- heightMap 조작 ---

  setHeightMap: (heightMap) => set({ heightMap }),

  setVertexHeight: (x, z, h) => set((state) => {
    const idx = z * (state.gridSize.x + 1) + x;
    if (idx < 0 || idx >= state.heightMap.length) return state;
    const newMap = [...state.heightMap];
    newMap[idx] = h;
    return { heightMap: newMap };
  }),

  getVertexHeight: (x, z) => {
    const s = get();
    const idx = z * (s.gridSize.x + 1) + x;
    return s.heightMap[idx] ?? 0;
  },

  // --- 브러시 설정 ---

  setBrushTool: (tool) => set((state) => ({
    brush: { ...state.brush, tool },
  })),

  setBrushSize: (size) => set((state) => ({
    brush: { ...state.brush, size },
  })),

  // --- Undo / Redo ---

  pushUndoSnapshot: () => set((state) => {
    const newStack = [...state.undoStack, [...state.heightMap]];
    if (newStack.length > MAX_UNDO_DEPTH) {
      newStack.shift();
    }
    return {
      undoStack: newStack,
      redoStack: [],
    };
  }),

  undo: () => set((state) => {
    if (state.undoStack.length === 0) return state;
    const newUndoStack = [...state.undoStack];
    const snapshot = newUndoStack.pop()!;
    return {
      undoStack: newUndoStack,
      redoStack: [...state.redoStack, [...state.heightMap]],
      heightMap: snapshot,
    };
  }),

  redo: () => set((state) => {
    if (state.redoStack.length === 0) return state;
    const newRedoStack = [...state.redoStack];
    const snapshot = newRedoStack.pop()!;
    return {
      redoStack: newRedoStack,
      undoStack: [...state.undoStack, [...state.heightMap]],
      heightMap: snapshot,
    };
  }),

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  // --- 리셋 ---

  resetTerrain: () => set(initialState),
}));

export default useTerrainStore;
