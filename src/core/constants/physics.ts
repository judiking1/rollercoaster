/**
 * physics.ts — 차량 물리 시뮬레이션 상수
 * 에너지 보존 기반 롤러코스터 물리 파라미터
 */

/** 중력 가속도 (m/s²) */
export const GRAVITY = 9.81;

/** 초기 발사 속도 (m/s) — 정거장에서 출발 시 */
export const INITIAL_LAUNCH_SPEED = 8;

/** 체인 리프트 속도 (m/s) — 상수 속도 유지 */
export const CHAIN_LIFT_SPEED = 3;

/** 브레이크 감속도 (m/s²) */
export const BRAKE_DECELERATION = 8;

/** 브레이크 목표 속도 (m/s) */
export const BRAKE_TARGET_SPEED = 2;

/** 부스터 가속도 (m/s²) */
export const BOOSTER_ACCELERATION = 12;

/** 부스터 목표 속도 (m/s) */
export const BOOSTER_TARGET_SPEED = 25;

/** 최소 속도 (m/s) — 골짜기 정지 방지 */
export const MIN_SPEED = 0.5;

/** 최대 속도 (m/s) — 안전 상한 */
export const MAX_SPEED = 50;

/** 아크 길이 테이블 샘플 수 */
export const ARC_LENGTH_SAMPLES = 1000;

/** 스토어 동기화 간격 (ms) — UI 표시용 */
export const SPEED_SYNC_INTERVAL_MS = 100;

/** 프레임 delta 최대값 (초) — 탭 전환 스파이크 방지 */
export const MAX_DELTA_TIME = 0.05;

/** 차량 높이 오프셋 (카메라 1인칭 시선 높이) */
export const FIRST_PERSON_HEIGHT = 1.5;

/** 3인칭 카메라 후방 거리 */
export const THIRD_PERSON_BEHIND = 8;

/** 3인칭 카메라 상단 높이 */
export const THIRD_PERSON_ABOVE = 5;
