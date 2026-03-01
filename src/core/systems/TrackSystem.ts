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

/** 새 위치가 정거장 시작 노드에 스냅 가능한지 검사 */
export function checkSnapToStation(
  newPos: Vector3Data,
  stationStartNode: TrackNode,
  snapRadius: number,
): boolean {
  return distance3D(newPos, stationStartNode.position) < snapRadius;
}
