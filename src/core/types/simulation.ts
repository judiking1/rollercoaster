/**
 * simulation.ts — 시뮬레이션 시스템 타입 정의 (예약)
 * Phase 8+에서 구현 예정. 현재는 인터페이스만 정의합니다.
 */

/** 시뮬레이션 속도 */
export type SimulationSpeed = 'paused' | 'normal' | 'fast' | 'ultra';

/** 시뮬레이션 상태 */
export interface SimulationState {
  tick: number;
  speed: SimulationSpeed;
  time: string; // "HH:MM" 형식
}

/** 손님(NPC) 데이터 */
export interface Guest {
  id: string;
  position: { x: number; y: number; z: number };
  satisfaction: number;
  hunger: number;
  targetRideId: string | null;
}
