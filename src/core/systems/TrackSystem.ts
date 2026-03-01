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

// ─── 터널 시스템 ─────────────────────────────────────────

/** 지하 구간 정보 */
export interface UndergroundSection {
  startIdx: number;
  endIdx: number;
}

/**
 * 곡선 포인트 배열에서 지형 아래 구간 감지
 * 각 포인트의 y가 대응하는 terrainHeight - margin보다 낮으면 지하로 판정
 * 연속된 지하 포인트를 구간으로 묶음 (확장 없음 — 터널은 지하에만 존재)
 */
export function detectUndergroundSections(
  curvePoints: readonly Vector3Data[],
  terrainHeights: readonly number[],
  margin: number,
): UndergroundSection[] {
  const n = curvePoints.length;
  if (n === 0) return [];

  const isUnder: boolean[] = [];
  for (let i = 0; i < n; i++) {
    isUnder.push(curvePoints[i].y < terrainHeights[i] - margin);
  }

  const sections: UndergroundSection[] = [];
  let inSection = false;
  let startIdx = 0;

  for (let i = 0; i < n; i++) {
    if (isUnder[i] && !inSection) {
      startIdx = i;
      inSection = true;
    } else if (!isUnder[i] && inSection) {
      sections.push({ startIdx, endIdx: i - 1 });
      inSection = false;
    }
  }
  // 마지막 구간이 끝까지 이어지는 경우
  if (inSection) {
    sections.push({ startIdx, endIdx: n - 1 });
  }

  return sections;
}

/** 2D 프로필 점 */
export interface ProfilePoint {
  x: number;
  y: number;
}

/**
 * 터널 아치 단면 2D 프로필 생성 (D자 형태: 바닥 직선 + 반원 아치)
 * 바닥 Y = -0.5 (레일 아래 여유), 아치 꼭대기 Y = radius - 0.5
 * 점 순서: 왼쪽 바닥 → 오른쪽 바닥 → 오른쪽 아치 → 꼭대기 → 왼쪽 아치 (닫힌 루프)
 */
export function generateArchProfile(
  radius: number,
  archSegments: number,
): ProfilePoint[] {
  const points: ProfilePoint[] = [];
  const bottomY = -0.5;

  // 왼쪽 바닥
  points.push({ x: -radius, y: bottomY });
  // 오른쪽 바닥
  points.push({ x: radius, y: bottomY });

  // 오른쪽 바닥 → 꼭대기 → 왼쪽 바닥 (반원 아치)
  // 각도: 0 (오른쪽) → π (왼쪽), 중심은 (0, bottomY)
  for (let i = 0; i <= archSegments; i++) {
    const angle = (i / archSegments) * Math.PI; // 0 → π
    const px = radius * Math.cos(angle);   // +R → -R
    const py = bottomY + radius * Math.sin(angle); // bottomY → bottomY+R → bottomY
    points.push({ x: px, y: py });
  }

  return points;
}

/**
 * Frenet 프레임 계산 헬퍼 (터널 본체/포탈에서 공유)
 * @returns {fx, fy, fz, rx, ry, rz, ux, uy, uz} 정규화된 forward, right, up 벡터 성분
 */
export function computeFrenetFrame(fwd: Vector3Data): {
  fx: number; fy: number; fz: number;
  rx: number; ry: number; rz: number;
  ux: number; uy: number; uz: number;
} {
  const fwdLen = Math.sqrt(fwd.x * fwd.x + fwd.y * fwd.y + fwd.z * fwd.z);
  const fx = fwd.x / fwdLen;
  const fy = fwd.y / fwdLen;
  const fz = fwd.z / fwdLen;

  // right = cross(up, forward), up = (0, 1, 0)
  let rx = -fz;
  let ry = 0;
  let rz = fx;
  const rLen = Math.sqrt(rx * rx + ry * ry + rz * rz);
  if (rLen > 0.001) {
    rx /= rLen; ry /= rLen; rz /= rLen;
  } else {
    rx = 1; ry = 0; rz = 0;
  }

  // realUp = cross(forward, right)
  const ux = fy * rz - fz * ry;
  const uy = fz * rx - fx * rz;
  const uz = fx * ry - fy * rx;

  return { fx, fy, fz, rx, ry, rz, ux, uy, uz };
}

/**
 * 지하 구간 포인트와 프로필로 터널 tube BufferGeometry 데이터 생성
 * terrainHeights가 주어지면 지형 위로 튀어나오는 정점을 지형 높이로 클램핑
 */
export function buildTunnelGeometryData(
  sectionPoints: readonly Vector3Data[],
  forwardVectors: readonly Vector3Data[],
  profile: readonly ProfilePoint[],
  terrainHeights?: readonly number[],
): { positions: Float32Array; normals: Float32Array; indices: Uint32Array } {
  const numRings = sectionPoints.length;
  const profileLen = profile.length;
  const vertCount = numRings * profileLen;
  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);

  for (let r = 0; r < numRings; r++) {
    const pt = sectionPoints[r];
    const frame = computeFrenetFrame(forwardVectors[r]);
    const terrainY = terrainHeights ? terrainHeights[r] : Infinity;

    for (let p = 0; p < profileLen; p++) {
      const px = profile[p].x;
      const py = profile[p].y;

      const vi = (r * profileLen + p) * 3;
      const worldX = pt.x + frame.rx * px + frame.ux * py;
      let worldY = pt.y + frame.ry * px + frame.uy * py;
      const worldZ = pt.z + frame.rz * px + frame.uz * py;

      // 지형 위로 돌출되는 정점을 클램핑 (약간 아래로)
      if (worldY > terrainY - 0.05) {
        worldY = terrainY - 0.05;
      }

      positions[vi] = worldX;
      positions[vi + 1] = worldY;
      positions[vi + 2] = worldZ;

      const nx = frame.rx * px + frame.ux * py;
      const ny = frame.ry * px + frame.uy * py;
      const nz = frame.rz * px + frame.uz * py;
      const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (nLen > 0.001) {
        normals[vi] = nx / nLen;
        normals[vi + 1] = ny / nLen;
        normals[vi + 2] = nz / nLen;
      }
    }
  }

  // 인덱스: 인접 링 사이를 삼각형으로 연결
  const quads = (numRings - 1) * (profileLen - 1);
  const indices = new Uint32Array(quads * 6);
  let idx = 0;

  for (let r = 0; r < numRings - 1; r++) {
    for (let p = 0; p < profileLen - 1; p++) {
      const a = r * profileLen + p;
      const b = r * profileLen + p + 1;
      const c = (r + 1) * profileLen + p;
      const d = (r + 1) * profileLen + p + 1;

      indices[idx++] = a;
      indices[idx++] = b;
      indices[idx++] = c;

      indices[idx++] = b;
      indices[idx++] = d;
      indices[idx++] = c;
    }
  }

  return { positions, normals, indices };
}

/**
 * 터널 포탈(입구/출구) 아치형 면 geometry 데이터 생성
 * Fan triangulation: 중심점에서 프로필 각 점으로 삼각형 생성
 * terrainY로 상단 정점을 클램핑하여 지형 위로 튀어나오지 않게 함
 */
export function buildPortalGeometryData(
  position: Vector3Data,
  forward: Vector3Data,
  profile: readonly ProfilePoint[],
  terrainY: number,
): { positions: Float32Array; normals: Float32Array; indices: Uint32Array } {
  const profileLen = profile.length;
  const frame = computeFrenetFrame(forward);

  // 정점: 중심(0번) + 프로필 점들(1~profileLen)
  const vertCount = 1 + profileLen;
  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);

  // 중심점
  positions[0] = position.x;
  positions[1] = position.y;
  positions[2] = position.z;
  normals[0] = frame.fx;
  normals[1] = frame.fy;
  normals[2] = frame.fz;

  // 프로필 점들을 월드 좌표로 변환
  for (let i = 0; i < profileLen; i++) {
    const px = profile[i].x;
    const py = profile[i].y;
    const vi = (1 + i) * 3;
    const worldX = position.x + frame.rx * px + frame.ux * py;
    let worldY = position.y + frame.ry * px + frame.uy * py;
    const worldZ = position.z + frame.rz * px + frame.uz * py;

    // 지형 위로 돌출되는 정점 클램핑
    if (worldY > terrainY - 0.05) {
      worldY = terrainY - 0.05;
    }

    positions[vi] = worldX;
    positions[vi + 1] = worldY;
    positions[vi + 2] = worldZ;
    normals[vi] = frame.fx;
    normals[vi + 1] = frame.fy;
    normals[vi + 2] = frame.fz;
  }

  // Fan triangulation: 중심 → 프로필[i] → 프로필[i+1]
  const triCount = profileLen - 1;
  const indices = new Uint32Array(triCount * 3);
  for (let i = 0; i < triCount; i++) {
    indices[i * 3] = 0;
    indices[i * 3 + 1] = 1 + i;
    indices[i * 3 + 2] = 1 + i + 1;
  }

  return { positions, normals, indices };
}
