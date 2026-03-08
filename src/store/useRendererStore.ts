/**
 * useRendererStore.ts — 렌더러 백엔드 상태 관리
 * 현재 활성화된 렌더링 백엔드(WebGPU 또는 WebGL)를 추적합니다.
 */

import { create } from 'zustand';
import type { RendererBackend } from '../core/utils/webgpu.ts';

interface RendererState {
  /** 현재 활성 렌더러 백엔드 */
  backend: RendererBackend | 'unknown';
  /** 렌더러 초기화 완료 여부 */
  isInitialized: boolean;
}

interface RendererActions {
  setBackend: (backend: RendererBackend) => void;
  setInitialized: (initialized: boolean) => void;
}

const useRendererStore = create<RendererState & RendererActions>()((set) => ({
  // --- State ---
  backend: 'unknown',
  isInitialized: false,

  // --- Actions ---
  setBackend: (backend) => set({ backend }),
  setInitialized: (initialized) => set({ isInitialized: initialized }),
}));

export default useRendererStore;
