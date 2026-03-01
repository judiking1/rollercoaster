/**
 * trackCurveUtils.ts — 트랙 곡선 공유 유틸리티
 * TrackPath, TrackSupport, TrackTunnel 등에서 공통으로 사용하는 함수들
 */

import * as THREE from 'three';
import type { TrackNode } from '../../../core/types/index.ts';
import useTerrainStore from '../../../store/useTerrainStore.ts';
import { GRID_UNIT } from '../../../core/constants/index.ts';

/** 곡선 세그먼트 분할 수 (많을수록 부드러움) */
export const CURVE_DIVISIONS = 12;

/** 노드의 direction(degrees)으로부터 3D 방향 벡터 생성 */
export function dirToVec3(direction: number): THREE.Vector3 {
  const rad = (direction * Math.PI) / 180;
  return new THREE.Vector3(Math.sin(rad), 0, Math.cos(rad));
}

/** 두 노드 사이의 곡선 포인트 생성 */
export function buildCurvePoints(startNode: TrackNode, endNode: TrackNode): THREE.Vector3[] {
  const p0 = new THREE.Vector3(startNode.position.x, startNode.position.y, startNode.position.z);
  const p3 = new THREE.Vector3(endNode.position.x, endNode.position.y, endNode.position.z);

  // 방향이 같으면 직선 보간 (bezier 아티팩트 방지)
  if (startNode.direction === endNode.direction) {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= CURVE_DIVISIONS; i++) {
      const t = i / CURVE_DIVISIONS;
      points.push(new THREE.Vector3().lerpVectors(p0, p3, t));
    }
    return points;
  }

  const dist = p0.distanceTo(p3);
  const tangentScale = dist * 0.4;

  const startDir = dirToVec3(startNode.direction);
  const endDir = dirToVec3(endNode.direction);

  // 제어점: 시작/끝 접선 방향으로 dist*0.4 만큼 연장
  const p1 = p0.clone().add(startDir.clone().multiplyScalar(tangentScale));
  // 높이 보간
  p1.y = p0.y + (p3.y - p0.y) * 0.33;

  const p2 = p3.clone().sub(endDir.clone().multiplyScalar(tangentScale));
  p2.y = p0.y + (p3.y - p0.y) * 0.67;

  const curve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
  return curve.getPoints(CURVE_DIVISIONS);
}

/** 지형 높이를 그리드 보간으로 조회 (이중선형보간) */
export function getTerrainHeightAt(x: number, z: number): number {
  const state = useTerrainStore.getState();
  const { gridSize, heightMap } = state;
  const gxf = x / GRID_UNIT;
  const gzf = z / GRID_UNIT;

  const gx0 = Math.max(0, Math.min(gridSize.x - 1, Math.floor(gxf)));
  const gz0 = Math.max(0, Math.min(gridSize.z - 1, Math.floor(gzf)));
  const gx1 = Math.min(gridSize.x, gx0 + 1);
  const gz1 = Math.min(gridSize.z, gz0 + 1);

  const tx = gxf - gx0;
  const tz = gzf - gz0;

  const w = gridSize.x + 1;
  const h00 = heightMap[gz0 * w + gx0] ?? 0;
  const h10 = heightMap[gz0 * w + gx1] ?? 0;
  const h01 = heightMap[gz1 * w + gx0] ?? 0;
  const h11 = heightMap[gz1 * w + gx1] ?? 0;

  // 이중 선형 보간
  const h0 = h00 + (h10 - h00) * tx;
  const h1 = h01 + (h11 - h01) * tx;
  return h0 + (h1 - h0) * tz;
}
