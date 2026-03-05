/**
 * PhysicsSystem.ts — 순수 함수 기반 차량 물리 엔진
 * React/Zustand 의존 없음. 에너지 보존 + 마찰 + 특수 구간 처리
 */

import type { SpecialType } from '../types/index.ts';
import type { VehicleFrameState } from '../types/ride.ts';
import {
  GRAVITY,
  CHAIN_LIFT_SPEED,
  BRAKE_DECELERATION,
  BRAKE_TARGET_SPEED,
  BOOSTER_ACCELERATION,
  BOOSTER_TARGET_SPEED,
  MIN_SPEED,
  MAX_SPEED,
} from '../constants/index.ts';

// ─── 아크 길이 테이블 ───────────────────────────────────

/** 누적 거리 테이블 */
export interface ArcLengthTable {
  /** 누적 거리 배열 (길이 = sampleCount + 1) */
  distances: Float64Array;
  /** 총 경로 길이 */
  totalLength: number;
  /** 샘플 수 */
  sampleCount: number;
}

/** 세그먼트별 거리-특수타입 매핑 */
export interface SegmentRange {
  startDist: number;
  endDist: number;
  specialType: SpecialType;
}

/**
 * 곡선 점 배열로부터 아크 길이 테이블 생성
 * @param points 3D 점 배열 [{x, y, z}, ...]
 * @param sampleCount 테이블 샘플 수
 */
export function buildArcLengthTable(
  points: readonly { x: number; y: number; z: number }[],
  sampleCount: number,
): ArcLengthTable {
  const distances = new Float64Array(sampleCount + 1);
  distances[0] = 0;

  const segCount = points.length - 1;

  for (let i = 1; i <= sampleCount; i++) {
    // 현재 샘플의 보간 위치
    const tCur = i / sampleCount;
    const tPrev = (i - 1) / sampleCount;

    const posCur = interpolatePoints(points, tCur, segCount);
    const posPrev = interpolatePoints(points, tPrev, segCount);

    const dx = posCur.x - posPrev.x;
    const dy = posCur.y - posPrev.y;
    const dz = posCur.z - posPrev.z;

    distances[i] = distances[i - 1] + Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  return {
    distances,
    totalLength: distances[sampleCount],
    sampleCount,
  };
}

/** 점 배열 사이를 선형 보간하여 t 위치의 좌표 반환 */
function interpolatePoints(
  points: readonly { x: number; y: number; z: number }[],
  t: number,
  segCount: number,
): { x: number; y: number; z: number } {
  const tClamped = Math.max(0, Math.min(1, t));
  const idx = tClamped * segCount;
  const i0 = Math.min(Math.floor(idx), segCount - 1);
  const i1 = i0 + 1;
  const frac = idx - i0;

  const p0 = points[i0];
  const p1 = points[i1];

  return {
    x: p0.x + (p1.x - p0.x) * frac,
    y: p0.y + (p1.y - p0.y) * frac,
    z: p0.z + (p1.z - p0.z) * frac,
  };
}

/**
 * 누적 거리 → t 값 변환 (이진 탐색)
 * @param distance 현재 누적 거리
 * @param table 아크 길이 테이블
 * @returns 0~1 사이의 t 파라미터
 */
export function distanceToT(distance: number, table: ArcLengthTable): number {
  const { distances, sampleCount } = table;

  // 경계 처리
  if (distance <= 0) return 0;
  if (distance >= table.totalLength) return 1;

  // 이진 탐색
  let low = 0;
  let high = sampleCount;

  while (low < high - 1) {
    const mid = (low + high) >> 1;
    if (distances[mid] <= distance) {
      low = mid;
    } else {
      high = mid;
    }
  }

  // low ~ high 사이에서 선형 보간
  const dLow = distances[low];
  const dHigh = distances[high];
  const range = dHigh - dLow;

  if (range < 1e-10) return low / sampleCount;

  const frac = (distance - dLow) / range;
  return (low + frac) / sampleCount;
}

/**
 * 현재 누적 거리에서의 특수 타입 조회
 * @param distance 현재 누적 거리
 * @param ranges 세그먼트 거리-타입 매핑 배열
 * @returns 해당 구간의 SpecialType
 */
export function getSpecialTypeAtDistance(
  distance: number,
  ranges: readonly SegmentRange[],
): SpecialType {
  // 이진 탐색
  let low = 0;
  let high = ranges.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const range = ranges[mid];

    if (distance < range.startDist) {
      high = mid - 1;
    } else if (distance > range.endDist) {
      low = mid + 1;
    } else {
      return range.specialType;
    }
  }

  return 'normal';
}

/**
 * 물리 스텝: 에너지 보존 + 마찰 + 공기 저항 + 특수 구간
 * @param speed 현재 속도 (m/s)
 * @param curHeight 현재 높이 (m)
 * @param nextHeight 다음 높이 (m)
 * @param dt 시간 간격 (초)
 * @param friction 마찰 계수
 * @param airResist 공기 저항 계수
 * @param specialType 특수 구간 타입
 * @returns 다음 프레임 속도 (m/s)
 */
export function physicsStep(
  speed: number,
  curHeight: number,
  nextHeight: number,
  dt: number,
  friction: number,
  airResist: number,
  specialType: SpecialType,
): number {
  // 특수 구간 처리
  switch (specialType) {
    case 'chain_lift':
      // 체인 리프트: 상수 속도로 끌어올림
      return CHAIN_LIFT_SPEED;

    case 'brake': {
      // 브레이크: 목표 속도까지 감속
      if (speed <= BRAKE_TARGET_SPEED) return speed;
      const braked = speed - BRAKE_DECELERATION * dt;
      return Math.max(braked, BRAKE_TARGET_SPEED);
    }

    case 'booster': {
      // 부스터: 목표 속도까지 가속
      if (speed >= BOOSTER_TARGET_SPEED) return speed;
      const boosted = speed + BOOSTER_ACCELERATION * dt;
      return Math.min(boosted, BOOSTER_TARGET_SPEED);
    }

    default:
      break;
  }

  // 에너지 보존: v² = v₀² + 2g·ΔH
  const dh = curHeight - nextHeight; // 내려갈 때 양수
  let vSquared = speed * speed + 2 * GRAVITY * dh;

  // v²가 음수이면 (에너지 부족) 최소 속도로 클램프
  if (vSquared < 0) {
    vSquared = MIN_SPEED * MIN_SPEED;
  }

  let newSpeed = Math.sqrt(vSquared);

  // 마찰: v -= μ · g · dt
  newSpeed -= friction * GRAVITY * dt;

  // 공기 저항: v -= c · v² · dt
  newSpeed -= airResist * newSpeed * newSpeed * dt;

  // 속도 클램프
  return Math.max(MIN_SPEED, Math.min(MAX_SPEED, newSpeed));
}

/**
 * 세 점 사이의 곡률 반경 계산 (Menger curvature)
 * 세 점이 일직선이면 Infinity 반환
 */
export function calculateCurvatureRadius(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  c: { x: number; y: number; z: number },
): number {
  // 벡터 AB, BC
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;

  const bcx = c.x - b.x;
  const bcy = c.y - b.y;
  const bcz = c.z - b.z;

  // 외적 |AB × BC|
  const crossX = aby * bcz - abz * bcy;
  const crossY = abz * bcx - abx * bcz;
  const crossZ = abx * bcy - aby * bcx;
  const crossMag = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);

  if (crossMag < 1e-10) return Infinity; // 일직선

  const abLen = Math.sqrt(abx * abx + aby * aby + abz * abz);
  const bcLen = Math.sqrt(bcx * bcx + bcy * bcy + bcz * bcz);
  const acx = c.x - a.x;
  const acy = c.y - a.y;
  const acz = c.z - a.z;
  const acLen = Math.sqrt(acx * acx + acy * acy + acz * acz);

  // R = |AB| · |BC| · |AC| / (4 · |AB × BC|)
  // Menger curvature의 역수 → 반경
  return (abLen * bcLen * acLen) / (4 * crossMag) || Infinity;
}

/**
 * 경사각 계산 (라디안)
 * prev → next 사이의 기울기
 */
export function calculateSlopeAngle(
  prev: { x: number; y: number; z: number },
  next: { x: number; y: number; z: number },
): number {
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  const dz = next.z - prev.z;
  const horizontalDist = Math.sqrt(dx * dx + dz * dz);

  if (horizontalDist < 1e-10) return dy > 0 ? Math.PI / 2 : dy < 0 ? -Math.PI / 2 : 0;

  return Math.atan2(dy, horizontalDist);
}

/**
 * 수직 G-Force 계산
 * 원심력 + 중력의 수직 성분
 * @param speed 속도 (m/s)
 * @param radius 수직면 곡률 반경 (m)
 * @param slopeAngle 경사각 (라디안)
 * @returns 수직 G (1G = 중력)
 */
export function calculateVerticalGForce(
  speed: number,
  radius: number,
  slopeAngle: number,
): number {
  if (!isFinite(radius) || radius <= 0) {
    // 직선 구간: 경사면에서의 중력 성분만
    return Math.cos(slopeAngle);
  }

  // 원심 가속도: v² / R
  const centripetalG = (speed * speed) / (radius * GRAVITY);

  // 중력의 법선 성분 + 원심력
  return Math.cos(slopeAngle) + centripetalG;
}

/**
 * 횡 G-Force 계산
 * 수평면 곡선에서의 원심력
 * @param speed 속도 (m/s)
 * @param horizontalRadius 수평 곡률 반경 (m)
 * @returns 횡 G (절대값)
 */
export function calculateLateralGForce(
  speed: number,
  horizontalRadius: number,
): number {
  if (!isFinite(horizontalRadius) || horizontalRadius <= 0) return 0;
  return (speed * speed) / (horizontalRadius * GRAVITY);
}

/**
 * 수평면 곡률 반경 계산 (XZ 평면만)
 * 수직 G와 분리하여 횡 G 계산에 사용
 */
export function calculateHorizontalCurvatureRadius(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  c: { x: number; y: number; z: number },
): number {
  // XZ 평면 투영
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const bcx = c.x - b.x;
  const bcz = c.z - b.z;

  // 2D 외적 (스칼라)
  const crossMag = Math.abs(abx * bcz - abz * bcx);

  if (crossMag < 1e-10) return Infinity;

  const abLen = Math.sqrt(abx * abx + abz * abz);
  const bcLen = Math.sqrt(bcx * bcx + bcz * bcz);
  const acx = c.x - a.x;
  const acz = c.z - a.z;
  const acLen = Math.sqrt(acx * acx + acz * acz);

  return (abLen * bcLen * acLen) / (4 * crossMag) || Infinity;
}

// ─── SampledPath (빌드타임 1회 샘플링, 런타임 O(log n) lerp) ──

/**
 * 빌드타임에 곡선 전체를 균등 u 간격으로 샘플링한 테이블.
 * SoA 레이아웃: position(px,py,pz) + tangent(tx,ty,tz) + 누적 아크길이.
 * 런타임에는 이진탐색 1회 + lerp만 수행, THREE curve 호출 완전 제거.
 */
export interface SampledPath {
  distances: Float64Array;  // 누적 아크길이 [sampleCount+1]
  px: Float64Array;         // X 위치
  py: Float64Array;         // Y 위치
  pz: Float64Array;         // Z 위치
  tx: Float64Array;         // X tangent (정규화됨)
  ty: Float64Array;         // Y tangent
  tz: Float64Array;         // Z tangent
  totalLength: number;
  sampleCount: number;
}

/**
 * THREE.CatmullRomCurve3에서 균등 u 간격으로 position+tangent 샘플링.
 * 빌드타임 전용 (useMemo 내 1회 호출).
 * @param curve CatmullRomCurve3 인스턴스
 * @param sampleCount 샘플 수 (기본 1000)
 */
export function buildSampledPath(
  curve: { getPointAt: (u: number) => { x: number; y: number; z: number }; getTangentAt: (u: number) => { x: number; y: number; z: number } },
  sampleCount: number,
): SampledPath {
  const n = sampleCount + 1;
  const distances = new Float64Array(n);
  const px = new Float64Array(n);
  const py = new Float64Array(n);
  const pz = new Float64Array(n);
  const tx = new Float64Array(n);
  const ty = new Float64Array(n);
  const tz = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const u = i / sampleCount;
    // 빌드타임이므로 매번 새 Vector3 반환 — 할당 무관
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);

    px[i] = p.x;
    py[i] = p.y;
    pz[i] = p.z;

    // tangent 정규화
    const len = Math.sqrt(t.x * t.x + t.y * t.y + t.z * t.z);
    if (len > 1e-10) {
      tx[i] = t.x / len;
      ty[i] = t.y / len;
      tz[i] = t.z / len;
    } else {
      tx[i] = 0;
      ty[i] = 0;
      tz[i] = 1;
    }

    // 누적 아크길이
    if (i > 0) {
      const dx = px[i] - px[i - 1];
      const dy = py[i] - py[i - 1];
      const dz = pz[i] - pz[i - 1];
      distances[i] = distances[i - 1] + Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  }

  return { distances, px, py, pz, tx, ty, tz, totalLength: distances[sampleCount], sampleCount };
}

/**
 * SampledPath에서 distance → 구간 인덱스(low) + 보간 비율(frac)
 * 이진탐색 1회. 내부 헬퍼.
 */
function spFindSegment(path: SampledPath, distance: number): [low: number, frac: number] {
  const { distances, sampleCount } = path;

  if (distance <= 0) return [0, 0];
  if (distance >= path.totalLength) return [sampleCount - 1, 1];

  let lo = 0;
  let hi = sampleCount;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (distances[mid] <= distance) lo = mid;
    else hi = mid;
  }

  const dLo = distances[lo];
  const dHi = distances[hi];
  const range = dHi - dLo;
  const frac = range > 1e-10 ? (distance - dLo) / range : 0;
  return [lo, frac];
}

/**
 * 런타임 핫패스: position + tangent 보간.
 * 이진탐색 1회 + lerp, tangent renormalize.
 * 0 allocation, Math.pow 0회.
 */
export function samplePositionAndTangent(
  path: SampledPath,
  distance: number,
  outPos: { x: number; y: number; z: number },
  outTan: { x: number; y: number; z: number },
): void {
  const [lo, frac] = spFindSegment(path, distance);
  const hi = lo + 1;

  outPos.x = path.px[lo] + (path.px[hi] - path.px[lo]) * frac;
  outPos.y = path.py[lo] + (path.py[hi] - path.py[lo]) * frac;
  outPos.z = path.pz[lo] + (path.pz[hi] - path.pz[lo]) * frac;

  // tangent lerp + renormalize
  let lx = path.tx[lo] + (path.tx[hi] - path.tx[lo]) * frac;
  let ly = path.ty[lo] + (path.ty[hi] - path.ty[lo]) * frac;
  let lz = path.tz[lo] + (path.tz[hi] - path.tz[lo]) * frac;
  const len = Math.sqrt(lx * lx + ly * ly + lz * lz);
  if (len > 1e-10) { lx /= len; ly /= len; lz /= len; }
  outTan.x = lx;
  outTan.y = ly;
  outTan.z = lz;
}

/**
 * Y 좌표만 빠르게 보간 (물리 높이 체크용).
 * 이진탐색 1회 + 스칼라 lerp.
 */
export function sampleY(path: SampledPath, distance: number): number {
  const [lo, frac] = spFindSegment(path, distance);
  return path.py[lo] + (path.py[lo + 1] - path.py[lo]) * frac;
}

/**
 * Position만 보간 (G-Force 3점 쿼리용).
 */
export function samplePosition(
  path: SampledPath,
  distance: number,
  out: { x: number; y: number; z: number },
): void {
  const [lo, frac] = spFindSegment(path, distance);
  const hi = lo + 1;
  out.x = path.px[lo] + (path.px[hi] - path.px[lo]) * frac;
  out.y = path.py[lo] + (path.py[hi] - path.py[lo]) * frac;
  out.z = path.pz[lo] + (path.pz[hi] - path.pz[lo]) * frac;
}

/** 초기 차량 프레임 상태 생성 */
export function createInitialFrameState(): VehicleFrameState {
  return {
    distance: 0,
    speed: 0,
    elapsedTime: 0,
    maxSpeed: 0,
    maxHeight: 0,
    maxGForce: 0,
    maxLateralG: 0,
    hasCompletedLap: false,
  };
}
