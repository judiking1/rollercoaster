/**
 * useGameStore.ts — 게임 전역 상태 관리
 * 현재 씬, 게임 모드 등 전역적으로 사용되는 상태
 */

import { create } from 'zustand';
import type { SceneType, GameMode } from '../core/types/index.ts';

interface GameState {
  currentScene: SceneType;
  gameMode: GameMode;
}

interface GameActions {
  setScene: (scene: SceneType) => void;
  setGameMode: (mode: GameMode) => void;
}

const useGameStore = create<GameState & GameActions>()((set) => ({
  // --- State ---
  currentScene: 'mainMenu',
  gameMode: 'view',

  // --- Actions ---
  setScene: (scene) => set({ currentScene: scene }),
  setGameMode: (mode) => set({ gameMode: mode }),
}));

export default useGameStore;
