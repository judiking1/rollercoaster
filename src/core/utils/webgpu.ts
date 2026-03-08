/**
 * webgpu.ts — WebGPU 감지 및 렌더러 팩토리
 * 브라우저의 WebGPU 지원 여부를 감지하고,
 * Three.js WebGPURenderer를 생성합니다 (WebGL2 자동 폴백 포함).
 */

import { WebGPURenderer } from 'three/webgpu';

/** 렌더러 백엔드 타입 */
export type RendererBackend = 'webgpu' | 'webgl';

/** WebGPU 감지 결과 */
interface WebGPUCapability {
  isSupported: boolean;
  adapterInfo: string | null;
}

/** 캐싱된 감지 결과 */
let cachedCapability: WebGPUCapability | null = null;

/**
 * 브라우저의 WebGPU 지원 여부를 감지합니다.
 * GPU 어댑터를 실제로 요청하여 확인하며, 결과를 캐싱합니다.
 */
export async function detectWebGPU(): Promise<WebGPUCapability> {
  if (cachedCapability) return cachedCapability;

  try {
    if (!navigator.gpu) {
      cachedCapability = { isSupported: false, adapterInfo: null };
      return cachedCapability;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      cachedCapability = { isSupported: false, adapterInfo: null };
      return cachedCapability;
    }

    const info = adapter.info;
    cachedCapability = {
      isSupported: true,
      adapterInfo: `${info.vendor} ${info.architecture}`.trim(),
    };
    return cachedCapability;
  } catch {
    cachedCapability = { isSupported: false, adapterInfo: null };
    return cachedCapability;
  }
}

/**
 * WebGPURenderer를 생성하고 초기화합니다.
 * WebGPU를 사용할 수 없는 환경에서는 자동으로 WebGL2 백엔드로 폴백됩니다.
 *
 * @param canvas - R3F Canvas에서 전달되는 HTMLCanvasElement
 * @returns 초기화된 렌더러와 실제 사용된 백엔드 정보
 */
export async function createWebGPURenderer(
  canvas: HTMLCanvasElement,
): Promise<{ renderer: WebGPURenderer; backend: RendererBackend }> {
  const renderer = new WebGPURenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });

  // WebGPURenderer는 비동기 초기화 필요
  await renderer.init();

  // 실제로 어떤 백엔드가 선택되었는지 판별
  const backend: RendererBackend =
    (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend
      ? 'webgpu'
      : 'webgl';

  return { renderer, backend };
}
