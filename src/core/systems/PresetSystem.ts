/**
 * PresetSystem.ts — 프리셋 시스템 순수 함수
 * React, Zustand 무의존. 단위 테스트 가능.
 *
 * 프리셋 저장: Ride → station_start 기준 상대 좌표로 변환
 * 프리셋 배치: 상대 좌표 → 회전+이동으로 절대 좌표 복원 → 유효성 검사 → Ride 생성
 */

import type {
  Vector3Data,
  Ride,
  TrackNode,
  TrackSegment,
  Station,
  RidePreset,
  PresetNode,
  PresetSegment,
  ResolvedNode,
} from '../types/index.ts';
import {
  checkCollision,
  stationToOBB,
  obbOverlap,
  normalizeDirection,
} from './TrackSystem.ts';
import { COLLISION_MIN_DISTANCE, SEGMENT_LENGTH } from '../constants/index.ts';

// ─── Y축 회전 ─────────────────────────────────────────────

/** XZ 평면에서 Y축 회전 (degrees) */
export function rotatePositionY(pos: Vector3Data, angleDeg: number): Vector3Data {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: pos.x * cos - pos.z * sin,
    y: pos.y,
    z: pos.x * sin + pos.z * cos,
  };
}

// ─── 정거장 중심 → 시작 위치 변환 ─────────────────────────

/** 정거장 중심 좌표로부터 시작점 위치 계산 */
export function centerToStationStart(
  centerX: number,
  centerZ: number,
  centerY: number,
  direction: number,
  stationLength: number,
): Vector3Data {
  const rad = (direction * Math.PI) / 180;
  const halfLen = (stationLength * SEGMENT_LENGTH) / 2;
  return {
    x: centerX - Math.sin(rad) * halfLen,
    y: centerY,
    z: centerZ - Math.cos(rad) * halfLen,
  };
}

// ─── Ride → Preset 변환 ──────────────────────────────────

/** 완성된 Ride를 프리셋으로 변환 (station_start 기준 상대 좌표) */
export function rideToPreset(ride: Ride, presetName: string): RidePreset {
  if (!ride.isComplete) throw new Error('Only complete rides can be saved as presets');

  // station_start 노드 찾기
  const startNode = Object.values(ride.nodes).find((n) => n.type === 'station_start');
  if (!startNode) throw new Error('station_start node not found');

  const origin = startNode.position;
  const baseDir = startNode.direction;

  // 그래프 순회: station_start → segment → node → ... → station_start
  const orderedNodes: TrackNode[] = [];
  const orderedSegments: TrackSegment[] = [];
  const nodeIdToIndex = new Map<string, number>();

  let currentNode: TrackNode = startNode;
  orderedNodes.push(currentNode);
  nodeIdToIndex.set(currentNode.id, 0);

  while (currentNode.nextSegmentId) {
    const seg = ride.segments[currentNode.nextSegmentId];
    if (!seg) break;
    orderedSegments.push(seg);

    const nextNode = ride.nodes[seg.endNodeId];
    if (!nextNode) break;

    // 다시 station_start에 도달하면 (폐쇄 루프) 순회 종료
    if (nextNode.id === startNode.id) break;

    orderedNodes.push(nextNode);
    nodeIdToIndex.set(nextNode.id, orderedNodes.length - 1);
    currentNode = nextNode;
  }

  // 상대 좌표 변환 (원점=station_start, baseDir만큼 역회전)
  const presetNodes: PresetNode[] = orderedNodes.map((node, idx) => {
    const relPos = {
      x: node.position.x - origin.x,
      y: node.position.y - origin.y,
      z: node.position.z - origin.z,
    };
    const rotated = rotatePositionY(relPos, -baseDir);
    const relDir = normalizeDirection(node.direction - baseDir);

    return {
      localIndex: idx,
      relativePosition: rotated,
      relativeDirection: relDir,
      type: node.type,
    };
  });

  const presetSegments: PresetSegment[] = orderedSegments.map((seg, idx) => ({
    localIndex: idx,
    type: seg.type,
    specialType: seg.specialType,
    startNodeIndex: nodeIdToIndex.get(seg.startNodeId) ?? 0,
    // 폐쇄 세그먼트의 endNode는 station_start (index 0)
    endNodeIndex: seg.endNodeId === startNode.id ? 0 : (nodeIdToIndex.get(seg.endNodeId) ?? 0),
    length: seg.length,
  }));

  return {
    id: `preset-${Date.now()}`,
    name: presetName,
    rideType: ride.rideType,
    stationLength: ride.station.length,
    nodes: presetNodes,
    segments: presetSegments,
    vehicleConfig: { ...ride.vehicleConfig },
    createdAt: new Date().toISOString(),
    segmentCount: presetSegments.length - 1, // 정거장 세그먼트 제외
  };
}

// ─── Preset → 절대 좌표 복원 ─────────────────────────────

/** 프리셋의 상대 좌표를 절대 좌표로 복원 */
export function resolvePresetPositions(
  preset: RidePreset,
  targetPos: Vector3Data,
  targetDir: number,
): ResolvedNode[] {
  return preset.nodes.map((node) => {
    // targetDir만큼 회전 후 targetPos만큼 이동
    const rotated = rotatePositionY(node.relativePosition, targetDir);
    return {
      localIndex: node.localIndex,
      position: {
        x: targetPos.x + rotated.x,
        y: targetPos.y + rotated.y,
        z: targetPos.z + rotated.z,
      },
      direction: normalizeDirection(node.relativeDirection + targetDir),
      type: node.type,
    };
  });
}

// ─── 배치 유효성 검사 ─────────────────────────────────────

/** 프리셋 배치 유효성 검사 */
export function validatePresetPlacement(
  resolvedNodes: readonly ResolvedNode[],
  station: Station,
  existingRides: Record<string, Ride>,
  getTerrainHeight: (x: number, z: number) => number,
): boolean {
  // 1. 정거장 노드가 지형 위인지 검사
  for (const node of resolvedNodes) {
    if (node.type === 'station_start' || node.type === 'station_end') {
      const terrainH = getTerrainHeight(node.position.x, node.position.z);
      if (node.position.y < terrainH - 0.5) return false;
    }
  }

  // 2. 기존 라이드 노드와 충돌 검사
  const allExistingNodes: Record<string, TrackNode> = {};
  for (const ride of Object.values(existingRides)) {
    for (const [nid, node] of Object.entries(ride.nodes)) {
      allExistingNodes[nid] = node;
    }
  }

  for (const rNode of resolvedNodes) {
    if (checkCollision(rNode.position, allExistingNodes, [], COLLISION_MIN_DISTANCE)) {
      return false;
    }
  }

  // 3. 정거장 OBB 겹침 검사
  const newOBB = stationToOBB(station);
  for (const ride of Object.values(existingRides)) {
    if (obbOverlap(newOBB, stationToOBB(ride.station))) {
      return false;
    }
  }

  return true;
}

// ─── Preset → Ride 생성 ──────────────────────────────────

/** 프리셋을 새로운 Ride로 변환 */
export function presetToRide(
  preset: RidePreset,
  resolvedNodes: readonly ResolvedNode[],
  station: Station,
  rideId: string,
  rideName: string,
): Ride {
  const nodes: Record<string, TrackNode> = {};
  const segments: Record<string, TrackSegment> = {};
  const indexToNodeId = new Map<number, string>();

  // 노드 생성
  for (const rNode of resolvedNodes) {
    const nodeId = `${rideId}-node-${rNode.localIndex}`;
    indexToNodeId.set(rNode.localIndex, nodeId);
    nodes[nodeId] = {
      id: nodeId,
      position: { ...rNode.position },
      direction: rNode.direction,
      type: rNode.type,
      nextSegmentId: null,
      prevSegmentId: null,
    };
  }

  // 세그먼트 생성 + 노드 링크 설정
  for (const pSeg of preset.segments) {
    const segId = `${rideId}-seg-${pSeg.localIndex}`;
    const startNodeId = indexToNodeId.get(pSeg.startNodeIndex)!;
    const endNodeId = indexToNodeId.get(pSeg.endNodeIndex)!;

    segments[segId] = {
      id: segId,
      type: pSeg.type,
      specialType: pSeg.specialType,
      startNodeId,
      endNodeId,
      length: pSeg.length,
    };

    // 양방향 링크
    nodes[startNodeId].nextSegmentId = segId;
    nodes[endNodeId].prevSegmentId = segId;
  }

  return {
    id: rideId,
    name: rideName,
    rideType: preset.rideType,
    station,
    nodes,
    segments,
    headNodeId: indexToNodeId.get(0)!, // station_start (폐쇄 루프)
    counters: {
      node: resolvedNodes.length,
      segment: preset.segments.length,
    },
    isComplete: true,
    vehicleConfig: { ...preset.vehicleConfig },
  };
}
