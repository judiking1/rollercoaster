/**
 * TrackSystem.ts — 트랙 계산 순수 함수
 * React, Zustand 무의존. 단위 테스트 가능.
 */

import type { Vector3Data, TrackNode, TrackSegment, Station, SegmentType } from '../types/index.ts';
import { SEGMENT_LENGTH, SLOPE_HEIGHT_DELTA } from '../constants/index.ts';

// ─── 기본 유틸 ─────────────────────────────────────────

/** 두 3D 점 사이 거리 */
export function distance3D(a: Vector3Data, b: Vector3Data): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** degrees를 단위 방향 벡터 {x, z}로 변환 (0°=+Z, 시계방향) */
export function directionToVector(degrees: number): { x: number; z: number } {
  const rad = (degrees * Math.PI) / 180;
  return {
    x: Math.sin(rad),
    z: Math.cos(rad),
  };
}

/** 방향 정규화 (0~360) */
export function normalizeDirection(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

// ─── 세그먼트별 방향 변화량 (degrees) ───────────────────

const DIRECTION_DELTAS: Record<SegmentType, number> = {
  straight: 0,
  left_gentle: 15,
  left_sharp: 45,
  right_gentle: -15,
  right_sharp: -45,
  slope_up: 0,
  slope_down: 0,
};

// ─── 위치/방향 계산 ──────────────────────────────────────

/** 현재 위치/방향으로부터 세그먼트 타입에 따라 다음 위치/방향 계산 */
export function calculateNextPosition(
  pos: Vector3Data,
  direction: number,
  segmentType: SegmentType,
): { position: Vector3Data; direction: number } {
  const dirDelta = DIRECTION_DELTAS[segmentType];
  const nextDir = normalizeDirection(direction + dirDelta);

  // 곡선의 경우 시작/끝 방향 중간으로 이동
  const avgDir = direction + dirDelta / 2;
  const vec = directionToVector(avgDir);

  let heightDelta = 0;
  if (segmentType === 'slope_up') heightDelta = SLOPE_HEIGHT_DELTA;
  if (segmentType === 'slope_down') heightDelta = -SLOPE_HEIGHT_DELTA;

  return {
    position: {
      x: pos.x + vec.x * SEGMENT_LENGTH,
      y: pos.y + heightDelta,
      z: pos.z + vec.z * SEGMENT_LENGTH,
    },
    direction: nextDir,
  };
}

// ─── 정거장 노드/세그먼트 생성 ──────────────────────────

/** 정거장의 시작/끝 노드 생성 */
export function createStationNodes(
  station: Station,
  rideId: string,
  startCounter: number,
): { startNode: TrackNode; endNode: TrackNode; nextCounter: number } {
  const vec = directionToVector(station.direction);
  const totalLength = station.length * SEGMENT_LENGTH;

  const startNode: TrackNode = {
    id: `${rideId}-node-${startCounter}`,
    position: { ...station.position },
    direction: station.direction,
    type: 'station_start',
    nextSegmentId: null,
    prevSegmentId: null,
  };

  const endNode: TrackNode = {
    id: `${rideId}-node-${startCounter + 1}`,
    position: {
      x: station.position.x + vec.x * totalLength,
      y: station.position.y,
      z: station.position.z + vec.z * totalLength,
    },
    direction: station.direction,
    type: 'station_end',
    nextSegmentId: null,
    prevSegmentId: null,
  };

  return { startNode, endNode, nextCounter: startCounter + 2 };
}

/** 정거장 세그먼트 생성 (시작~끝 노드를 잇는 세그먼트) */
export function createStationSegment(
  rideId: string,
  segmentCounter: number,
  startNodeId: string,
  endNodeId: string,
  stationLength: number,
): TrackSegment {
  return {
    id: `${rideId}-seg-${segmentCounter}`,
    type: 'straight',
    specialType: 'normal',
    startNodeId,
    endNodeId,
    length: stationLength * SEGMENT_LENGTH,
  };
}

// ─── 충돌 검사 ──────────────────────────────────────────

/** 새 위치가 기존 노드들과 충돌하는지 검사 */
export function checkCollision(
  newPos: Vector3Data,
  nodes: Record<string, TrackNode>,
  excludeIds: readonly string[],
  minDist: number,
): boolean {
  const excludeSet = new Set(excludeIds);
  for (const node of Object.values(nodes)) {
    if (excludeSet.has(node.id)) continue;
    if (distance3D(newPos, node.position) < minDist) {
      return true;
    }
  }
  return false;
}

// ─── 정거장 OBB 충돌 ─────────────────────────────────────

/** 2D Oriented Bounding Box (XZ 평면) */
export interface OBB2D {
  cx: number; cz: number;  // 중심
  hw: number; hd: number;  // half-width, half-depth
  axisX: { x: number; z: number };  // 로컬 X축
  axisZ: { x: number; z: number };  // 로컬 Z축 (진행 방향)
}

/** 정거장 정보로부터 2D OBB 생성 */
export function stationToOBB(station: Station): OBB2D {
  const vec = directionToVector(station.direction);
  const totalLength = station.length * SEGMENT_LENGTH;

  // 중심 = 시작점 + 방향 * 길이/2
  const cx = station.position.x + vec.x * totalLength / 2;
  const cz = station.position.z + vec.z * totalLength / 2;

  // 진행 방향축 (Z축)
  const axisZ = { x: vec.x, z: vec.z };
  // 직교 방향축 (X축): forward × up
  const axisX = { x: vec.z, z: -vec.x };

  return {
    cx, cz,
    hw: 1.25, // 정거장 반폭 (platformWidth / 2)
    hd: totalLength / 2, // 정거장 반깊이
    axisX,
    axisZ,
  };
}

/** 2D SAT(Separating Axis Theorem)로 두 OBB 겹침 검사 */
export function obbOverlap(a: OBB2D, b: OBB2D): boolean {
  const axes = [a.axisX, a.axisZ, b.axisX, b.axisZ];
  const dx = b.cx - a.cx;
  const dz = b.cz - a.cz;

  for (const axis of axes) {
    const projD = Math.abs(dx * axis.x + dz * axis.z);
    const projA =
      Math.abs(a.hw * (a.axisX.x * axis.x + a.axisX.z * axis.z)) +
      Math.abs(a.hd * (a.axisZ.x * axis.x + a.axisZ.z * axis.z));
    const projB =
      Math.abs(b.hw * (b.axisX.x * axis.x + b.axisX.z * axis.z)) +
      Math.abs(b.hd * (b.axisZ.x * axis.x + b.axisZ.z * axis.z));

    if (projD > projA + projB) return false; // 분리축 발견
  }
  return true; // 분리축 없음 → 겹침
}

/** 새 위치가 정거장 시작 노드에 스냅 가능한지 검사 */
export function checkSnapToStation(
  newPos: Vector3Data,
  stationStartNode: TrackNode,
  snapRadius: number,
): boolean {
  return distance3D(newPos, stationStartNode.position) < snapRadius;
}

// ─── 클리어런스 검사 ─────────────────────────────────────

/** 두 점 사이에 샘플 포인트 생성 */
function samplePoints(a: Vector3Data, b: Vector3Data, count: number): Vector3Data[] {
  const pts: Vector3Data[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    pts.push({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    });
  }
  return pts;
}

/** 새 세그먼트 경로가 기존 세그먼트들과 클리어런스 위반인지 검사 */
export function checkClearanceViolation(
  newStartPos: Vector3Data,
  newEndPos: Vector3Data,
  existingSegments: ReadonlyArray<{ startPos: Vector3Data; endPos: Vector3Data }>,
  clearanceRadius: number,
): boolean {
  const newSamples = samplePoints(newStartPos, newEndPos, 4);

  for (const seg of existingSegments) {
    const existSamples = samplePoints(seg.startPos, seg.endPos, 4);

    for (const np of newSamples) {
      for (const ep of existSamples) {
        const dx = np.x - ep.x;
        const dz = np.z - ep.z;
        const horizDist = Math.sqrt(dx * dx + dz * dz);

        // 수평 거리가 가까운 경우에만 높이 차이 검사
        if (horizDist < clearanceRadius) {
          const dy = Math.abs(np.y - ep.y);
          if (dy < clearanceRadius) {
            return true; // 클리어런스 위반
          }
        }
      }
    }
  }

  return false; // 위반 없음
}
