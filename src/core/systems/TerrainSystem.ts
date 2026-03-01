/**
 * TerrainSystem.ts — 지형 관련 순수 계산 함수
 * React/Zustand 의존 없음. 단위 테스트 가능한 순수 함수만 포함.
 *
 * 모든 편집은 격자 셀(cell) 단위로 작동합니다.
 * cell(cx, cz)은 정점 (cx,cz), (cx+1,cz), (cx,cz+1), (cx+1,cz+1)로 구성됩니다.
 */

import type { GridPosition, GridSize, SubSelection } from '../types/index.ts';
import { MAX_HEIGHT, MIN_HEIGHT, GRID_UNIT, HEIGHT_STEP } from '../constants/index.ts';

/** 꼭지점 감지 임계값 (격자 단위, 0~0.5 사이) */
const CORNER_THRESHOLD = 0.3;

// ─── heightMap 인덱스 유틸 ──────────────────────────────────────

/** row-major 인덱스: z * (gridSize.x + 1) + x */
function vertexIndex(x: number, z: number, gridSize: GridSize): number {
  return z * (gridSize.x + 1) + x;
}

// ─── 좌표 변환 ──────────────────────────────────────────────────

/** 월드 좌표 → 격자 셀 좌표 (셀 = 4개 정점으로 이루어진 면) */
export function worldToCell(
  worldX: number,
  worldZ: number,
  gridSize: GridSize,
  gridUnit: number = GRID_UNIT,
): GridPosition {
  const x = Math.floor(worldX / gridUnit);
  const z = Math.floor(worldZ / gridUnit);
  return {
    x: Math.max(0, Math.min(gridSize.x - 1, x)),
    z: Math.max(0, Math.min(gridSize.z - 1, z)),
  };
}

/** 브러시 영역 내 격자 셀 목록 (NxN 정사각형) */
export function getCellsInBrush(
  centerCellX: number,
  centerCellZ: number,
  brushSize: number,
  gridSize: GridSize,
): GridPosition[] {
  const halfSize = Math.floor(brushSize / 2);
  const cells: GridPosition[] = [];

  for (let dz = -halfSize; dz < brushSize - halfSize; dz++) {
    for (let dx = -halfSize; dx < brushSize - halfSize; dx++) {
      const cx = centerCellX + dx;
      const cz = centerCellZ + dz;
      if (cx >= 0 && cx < gridSize.x && cz >= 0 && cz < gridSize.z) {
        cells.push({ x: cx, z: cz });
      }
    }
  }

  return cells;
}

/** 셀 목록으로부터 고유 정점 목록 추출 (중복 제거) */
export function getUniqueVerticesForCells(
  cells: readonly GridPosition[],
  gridSize: GridSize,
): GridPosition[] {
  const seen = new Set<number>();
  const vertices: GridPosition[] = [];

  for (const cell of cells) {
    // 셀의 4꼭짓점
    const corners = [
      { x: cell.x, z: cell.z },
      { x: cell.x + 1, z: cell.z },
      { x: cell.x, z: cell.z + 1 },
      { x: cell.x + 1, z: cell.z + 1 },
    ];
    for (const v of corners) {
      const key = vertexIndex(v.x, v.z, gridSize);
      if (!seen.has(key)) {
        seen.add(key);
        vertices.push(v);
      }
    }
  }

  return vertices;
}

// ─── 높이 편집 함수 (격자 셀 기반, 균일 HEIGHT_STEP) ─────────────

/**
 * 격자 셀 기반 높이 조절 (raise/lower)
 * 모든 영향 정점을 HEIGHT_STEP만큼 균일하게 증감
 */
export function adjustHeightGrid(
  heightMap: readonly number[],
  centerCellX: number,
  centerCellZ: number,
  brushSize: number,
  direction: 1 | -1,
  gridSize: GridSize,
): number[] {
  const newMap = [...heightMap];
  const cells = getCellsInBrush(centerCellX, centerCellZ, brushSize, gridSize);
  const vertices = getUniqueVerticesForCells(cells, gridSize);
  const delta = direction * HEIGHT_STEP;

  for (const v of vertices) {
    const idx = vertexIndex(v.x, v.z, gridSize);
    const newHeight = newMap[idx] + delta;
    newMap[idx] = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));
  }

  return newMap;
}

/**
 * 격자 셀 기반 평탄화 (flatten)
 * 영역 내 모든 정점을 평균 높이로 맞춤
 */
export function flattenAreaGrid(
  heightMap: readonly number[],
  centerCellX: number,
  centerCellZ: number,
  brushSize: number,
  gridSize: GridSize,
): number[] {
  const newMap = [...heightMap];
  const cells = getCellsInBrush(centerCellX, centerCellZ, brushSize, gridSize);
  const vertices = getUniqueVerticesForCells(cells, gridSize);

  if (vertices.length === 0) return newMap;

  // 평균 높이 계산 → HEIGHT_STEP 단위로 반올림
  let sum = 0;
  for (const v of vertices) {
    sum += heightMap[vertexIndex(v.x, v.z, gridSize)];
  }
  const avg = sum / vertices.length;
  const targetHeight = Math.round(avg / HEIGHT_STEP) * HEIGHT_STEP;

  for (const v of vertices) {
    const idx = vertexIndex(v.x, v.z, gridSize);
    newMap[idx] = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, targetHeight));
  }

  return newMap;
}

/**
 * 격자 셀 기반 수평화 (level)
 * 영역 내 모든 정점을 중심 셀 높이로 맞춤
 */
export function levelAreaGrid(
  heightMap: readonly number[],
  centerCellX: number,
  centerCellZ: number,
  brushSize: number,
  gridSize: GridSize,
): number[] {
  const newMap = [...heightMap];
  const cells = getCellsInBrush(centerCellX, centerCellZ, brushSize, gridSize);
  const vertices = getUniqueVerticesForCells(cells, gridSize);

  // 중심 셀 4정점의 평균 높이 → HEIGHT_STEP으로 반올림
  const centerVertices = [
    heightMap[vertexIndex(centerCellX, centerCellZ, gridSize)],
    heightMap[vertexIndex(centerCellX + 1, centerCellZ, gridSize)],
    heightMap[vertexIndex(centerCellX, centerCellZ + 1, gridSize)],
    heightMap[vertexIndex(centerCellX + 1, centerCellZ + 1, gridSize)],
  ];
  const centerAvg = centerVertices.reduce((a, b) => a + b, 0) / 4;
  const targetHeight = Math.round(centerAvg / HEIGHT_STEP) * HEIGHT_STEP;

  for (const v of vertices) {
    const idx = vertexIndex(v.x, v.z, gridSize);
    newMap[idx] = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, targetHeight));
  }

  return newMap;
}

/** 셀 중심의 평균 높이 계산 (힌트 표시용) */
export function getCellAverageHeight(
  heightMap: readonly number[],
  cellX: number,
  cellZ: number,
  gridSize: GridSize,
): number {
  const h00 = heightMap[vertexIndex(cellX, cellZ, gridSize)];
  const h10 = heightMap[vertexIndex(cellX + 1, cellZ, gridSize)];
  const h01 = heightMap[vertexIndex(cellX, cellZ + 1, gridSize)];
  const h11 = heightMap[vertexIndex(cellX + 1, cellZ + 1, gridSize)];
  return (h00 + h10 + h01 + h11) / 4;
}

// ─── 서브 셀렉션 (RCT 스타일 꼭지점/전체 모드) ─────────────────

/**
 * 마우스 월드 좌표로부터 서브 셀렉션을 결정
 * - 마우스가 격자 꼭지점(정점) 근처 → corner 모드: 단일 정점만 편집
 * - 마우스가 면 중앙 → full 모드: 브러시 영역 전체 편집
 */
export function detectSubSelection(
  worldX: number,
  worldZ: number,
  centerCell: GridPosition,
  brushSize: number,
  heightMap: readonly number[],
  gridSize: GridSize,
  gridUnit: number = GRID_UNIT,
): SubSelection {
  const brushCells = getCellsInBrush(centerCell.x, centerCell.z, brushSize, gridSize);

  // 마우스 위치에서 가장 가까운 정점 좌표
  const nearestVX = Math.round(worldX / gridUnit);
  const nearestVZ = Math.round(worldZ / gridUnit);

  // 정점까지의 거리
  const distX = Math.abs(worldX / gridUnit - nearestVX);
  const distZ = Math.abs(worldZ / gridUnit - nearestVZ);
  const dist = Math.sqrt(distX * distX + distZ * distZ);

  if (dist < CORNER_THRESHOLD) {
    const vx = Math.max(0, Math.min(gridSize.x, nearestVX));
    const vz = Math.max(0, Math.min(gridSize.z, nearestVZ));

    // 이 정점이 브러시 영역의 셀과 인접한지 확인
    const isAdjacentToBrush = brushCells.some(
      (cell) =>
        (vx === cell.x || vx === cell.x + 1) &&
        (vz === cell.z || vz === cell.z + 1),
    );

    if (isAdjacentToBrush) {
      // corner 모드: 이 정점에 인접한 셀들 중 브러시 안에 있는 것만 하이라이트
      const adjacentCells = brushCells.filter(
        (cell) =>
          (vx === cell.x || vx === cell.x + 1) &&
          (vz === cell.z || vz === cell.z + 1),
      );

      const vertexHeight = heightMap[vertexIndex(vx, vz, gridSize)] ?? 0;

      return {
        mode: 'corner',
        cornerVertex: { x: vx, z: vz },
        highlightCells: adjacentCells,
        affectedVertices: [{ x: vx, z: vz }],
        hintHeight: vertexHeight,
        hintPosition: {
          x: vx * gridUnit,
          y: vertexHeight + 1.5,
          z: vz * gridUnit,
        },
      };
    }
  }

  // full 모드: 전체 브러시 영역
  const allVertices = getUniqueVerticesForCells(brushCells, gridSize);
  const centerHeight = getCellAverageHeight(heightMap, centerCell.x, centerCell.z, gridSize);

  return {
    mode: 'full',
    cornerVertex: null,
    highlightCells: brushCells,
    affectedVertices: allVertices,
    hintHeight: centerHeight,
    hintPosition: {
      x: (centerCell.x + 0.5) * gridUnit,
      y: centerHeight + 1.5,
      z: (centerCell.z + 0.5) * gridUnit,
    },
  };
}

/**
 * 단일 정점 높이 조절 (corner 모드용)
 */
export function adjustSingleVertex(
  heightMap: readonly number[],
  vertex: GridPosition,
  direction: 1 | -1,
  gridSize: GridSize,
): number[] {
  const newMap = [...heightMap];
  const idx = vertexIndex(vertex.x, vertex.z, gridSize);
  const delta = direction * HEIGHT_STEP;
  const newHeight = newMap[idx] + delta;
  newMap[idx] = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));
  return newMap;
}

/**
 * 꼭지점에 인접한 삼각형들의 하이라이트 geometry 생성
 * 셀의 삼각형 분할: T1(tl,bl,tr), T2(tr,bl,br) 중 해당 정점을 포함하는 것만
 */
export function generateCornerHighlightGeometry(
  vertex: GridPosition,
  adjacentCells: readonly GridPosition[],
  heightMap: readonly number[],
  gridSize: GridSize,
  gridUnit: number = GRID_UNIT,
  yOffset: number = 0.03,
): Float32Array {
  const cols = gridSize.x + 1;
  const triangles: number[] = [];

  for (const cell of adjacentCells) {
    const cx = cell.x;
    const cz = cell.z;

    // 셀의 4정점 좌표
    const tl = { x: cx, z: cz };
    const tr = { x: cx + 1, z: cz };
    const bl = { x: cx, z: cz + 1 };
    const br = { x: cx + 1, z: cz + 1 };

    // T1: tl, bl, tr — 이 삼각형에 vertex가 포함되는지
    const t1Verts = [tl, bl, tr];
    const t1Contains = t1Verts.some(
      (v) => v.x === vertex.x && v.z === vertex.z,
    );

    // T2: tr, bl, br
    const t2Verts = [tr, bl, br];
    const t2Contains = t2Verts.some(
      (v) => v.x === vertex.x && v.z === vertex.z,
    );

    if (t1Contains) {
      for (const v of t1Verts) {
        triangles.push(
          v.x * gridUnit,
          heightMap[v.z * cols + v.x] + yOffset,
          v.z * gridUnit,
        );
      }
    }
    if (t2Contains) {
      for (const v of t2Verts) {
        triangles.push(
          v.x * gridUnit,
          heightMap[v.z * cols + v.x] + yOffset,
          v.z * gridUnit,
        );
      }
    }
  }

  return new Float32Array(triangles);
}

// ─── BufferGeometry 생성 함수 ───────────────────────────────────

/** 정점 위치 배열 생성 (position attribute) */
export function generatePositions(
  heightMap: readonly number[],
  gridSize: GridSize,
  gridUnit: number = GRID_UNIT,
): Float32Array {
  const cols = gridSize.x + 1;
  const rows = gridSize.z + 1;
  const positions = new Float32Array(cols * rows * 3);

  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      const i = z * cols + x;
      const i3 = i * 3;
      positions[i3] = x * gridUnit;
      positions[i3 + 1] = heightMap[i];
      positions[i3 + 2] = z * gridUnit;
    }
  }

  return positions;
}

/** 법선 벡터 배열 생성 (normal attribute) */
export function calculateNormals(
  heightMap: readonly number[],
  gridSize: GridSize,
  gridUnit: number = GRID_UNIT,
): Float32Array {
  const cols = gridSize.x + 1;
  const rows = gridSize.z + 1;
  const normals = new Float32Array(cols * rows * 3);

  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      const i = z * cols + x;

      const hL = x > 0 ? heightMap[vertexIndex(x - 1, z, gridSize)] : heightMap[i];
      const hR = x < gridSize.x ? heightMap[vertexIndex(x + 1, z, gridSize)] : heightMap[i];
      const hD = z > 0 ? heightMap[vertexIndex(x, z - 1, gridSize)] : heightMap[i];
      const hU = z < gridSize.z ? heightMap[vertexIndex(x, z + 1, gridSize)] : heightMap[i];

      const nx = (hL - hR) / (2 * gridUnit);
      const ny = 1.0;
      const nz = (hD - hU) / (2 * gridUnit);

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const i3 = i * 3;
      normals[i3] = nx / len;
      normals[i3 + 1] = ny / len;
      normals[i3 + 2] = nz / len;
    }
  }

  return normals;
}

/** 인덱스 배열 생성 (index attribute) */
export function generateIndices(gridSize: GridSize): Uint32Array {
  const cols = gridSize.x + 1;
  const indexCount = gridSize.x * gridSize.z * 6;
  const indices = new Uint32Array(indexCount);
  let idx = 0;

  for (let z = 0; z < gridSize.z; z++) {
    for (let x = 0; x < gridSize.x; x++) {
      const topLeft = z * cols + x;
      const topRight = topLeft + 1;
      const bottomLeft = (z + 1) * cols + x;
      const bottomRight = bottomLeft + 1;

      indices[idx++] = topLeft;
      indices[idx++] = bottomLeft;
      indices[idx++] = topRight;

      indices[idx++] = topRight;
      indices[idx++] = bottomLeft;
      indices[idx++] = bottomRight;
    }
  }

  return indices;
}

/**
 * 높이 기반 정점 컬러 생성 (color attribute, RGB)
 * 낮은 곳: 어두운 초록 → 높은 곳: 밝은 초록/갈색
 */
export function generateVertexColors(
  heightMap: readonly number[],
  minH: number = MIN_HEIGHT,
  maxH: number = MAX_HEIGHT,
): Float32Array {
  const count = heightMap.length;
  const colors = new Float32Array(count * 3);
  const range = maxH - minH || 1;

  for (let i = 0; i < count; i++) {
    const t = (heightMap[i] - minH) / range;
    const i3 = i * 3;

    if (t < 0.5) {
      const s = t * 2;
      colors[i3] = 0.15 + s * 0.3;
      colors[i3 + 1] = 0.35 + s * 0.3;
      colors[i3 + 2] = 0.1 + s * 0.1;
    } else {
      const s = (t - 0.5) * 2;
      colors[i3] = 0.45 + s * 0.1;
      colors[i3 + 1] = 0.65 - s * 0.25;
      colors[i3 + 2] = 0.2;
    }
  }

  return colors;
}

/**
 * 그리드 오버레이용 라인 위치 배열 생성
 */
export function generateGridLinePositions(
  heightMap: readonly number[],
  gridSize: GridSize,
  gridUnit: number = GRID_UNIT,
  yOffset: number = 0.02,
): Float32Array {
  const cols = gridSize.x + 1;
  const horizontalSegments = gridSize.x * (gridSize.z + 1);
  const verticalSegments = gridSize.z * (gridSize.x + 1);
  const totalSegments = horizontalSegments + verticalSegments;
  const positions = new Float32Array(totalSegments * 2 * 3);
  let offset = 0;

  for (let z = 0; z <= gridSize.z; z++) {
    for (let x = 0; x < gridSize.x; x++) {
      const h1 = heightMap[z * cols + x] + yOffset;
      const h2 = heightMap[z * cols + x + 1] + yOffset;
      positions[offset++] = x * gridUnit;
      positions[offset++] = h1;
      positions[offset++] = z * gridUnit;
      positions[offset++] = (x + 1) * gridUnit;
      positions[offset++] = h2;
      positions[offset++] = z * gridUnit;
    }
  }

  for (let x = 0; x <= gridSize.x; x++) {
    for (let z = 0; z < gridSize.z; z++) {
      const h1 = heightMap[z * cols + x] + yOffset;
      const h2 = heightMap[(z + 1) * cols + x] + yOffset;
      positions[offset++] = x * gridUnit;
      positions[offset++] = h1;
      positions[offset++] = z * gridUnit;
      positions[offset++] = x * gridUnit;
      positions[offset++] = h2;
      positions[offset++] = (z + 1) * gridUnit;
    }
  }

  return positions;
}

/**
 * 브러시 영역 하이라이트용 셀 오버레이 geometry 생성
 * 각 셀을 지형 높이에 맞춘 2개 삼각형으로 생성
 */
export function generateCellHighlightGeometry(
  cells: readonly GridPosition[],
  heightMap: readonly number[],
  gridSize: GridSize,
  gridUnit: number = GRID_UNIT,
  yOffset: number = 0.03,
): { positions: Float32Array; indices: Uint32Array } {
  const vertCount = cells.length * 4; // 셀당 4정점
  const positions = new Float32Array(vertCount * 3);
  const indices = new Uint32Array(cells.length * 6); // 셀당 2삼각형
  const cols = gridSize.x + 1;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const baseVert = i * 4;
    const baseIdx = i * 6;

    // 4정점 (좌상, 우상, 좌하, 우하)
    const h00 = heightMap[cell.z * cols + cell.x] + yOffset;
    const h10 = heightMap[cell.z * cols + cell.x + 1] + yOffset;
    const h01 = heightMap[(cell.z + 1) * cols + cell.x] + yOffset;
    const h11 = heightMap[(cell.z + 1) * cols + cell.x + 1] + yOffset;

    const x0 = cell.x * gridUnit;
    const x1 = (cell.x + 1) * gridUnit;
    const z0 = cell.z * gridUnit;
    const z1 = (cell.z + 1) * gridUnit;

    const p = baseVert * 3;
    positions[p] = x0;     positions[p + 1] = h00;  positions[p + 2] = z0;
    positions[p + 3] = x1; positions[p + 4] = h10;  positions[p + 5] = z0;
    positions[p + 6] = x0; positions[p + 7] = h01;  positions[p + 8] = z1;
    positions[p + 9] = x1; positions[p + 10] = h11; positions[p + 11] = z1;

    indices[baseIdx] = baseVert;
    indices[baseIdx + 1] = baseVert + 2;
    indices[baseIdx + 2] = baseVert + 1;
    indices[baseIdx + 3] = baseVert + 1;
    indices[baseIdx + 4] = baseVert + 2;
    indices[baseIdx + 5] = baseVert + 3;
  }

  return { positions, indices };
}
