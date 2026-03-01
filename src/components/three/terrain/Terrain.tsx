/**
 * Terrain.tsx — 3D 지형 메쉬 렌더링
 * heightMap 기반 BufferGeometry + 높이별 vertex colors
 * terrain 모드: 지형 편집 인터랙션
 * track 모드: 트랙 빌더 정거장 배치 인터랙션
 */

import { useRef, useEffect, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import useTerrainStore from '../../../store/useTerrainStore.ts';
import useGameStore from '../../../store/useGameStore.ts';
import useTrackStore from '../../../store/useTrackStore.ts';
import useTerrainEditor from '../../../hooks/useTerrainEditor.ts';
import useTrackBuilder from '../../../hooks/useTrackBuilder.ts';
import {
  generatePositions,
  calculateNormals,
  generateIndices,
  generateVertexColors,
} from '../../../core/systems/TerrainSystem.ts';
import { GRID_UNIT } from '../../../core/constants/index.ts';
import GridOverlay from './GridOverlay.tsx';
import TerrainCursor from './TerrainCursor.tsx';

export default function Terrain() {
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const heightMap = useTerrainStore((s) => s.heightMap);
  const gridSize = useTerrainStore((s) => s.gridSize);
  const isInitialized = useTerrainStore((s) => s.isInitialized);
  const gameMode = useGameStore((s) => s.gameMode);
  const isXRayMode = useGameStore((s) => s.isXRayMode);
  const rides = useTrackStore((s) => s.rides);
  const builderMode = useTrackStore((s) => s.builderMode);

  const {
    subSelection,
    handlePointerMove: terrainPointerMove,
    handlePointerDown: terrainPointerDown,
    handlePointerUp: terrainPointerUp,
    handlePointerLeave: terrainPointerLeave,
  } = useTerrainEditor();

  const {
    handleTerrainHover,
    handleTerrainClick,
    stationPreview,
  } = useTrackBuilder();

  // 트랙 존재 여부 (X-Ray 모드 판단용)
  const hasTrack = useMemo(() => Object.keys(rides).length > 0, [rides]);

  const indices = useMemo(() => {
    if (!isInitialized) return null;
    return generateIndices(gridSize);
  }, [gridSize, isInitialized]);

  useEffect(() => {
    const geo = geometryRef.current;
    if (!geo || !isInitialized || heightMap.length === 0) return;

    const positions = generatePositions(heightMap, gridSize, GRID_UNIT);
    const normals = calculateNormals(heightMap, gridSize, GRID_UNIT);
    const colors = generateVertexColors(heightMap);

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    if (indices) {
      geo.setIndex(new THREE.BufferAttribute(indices, 1));
    }

    geo.computeBoundingSphere();

    // X-Ray 모드: 전체 지형 반투명 (빌딩 중이거나 수동 토글)
    const mat = materialRef.current;
    if (mat) {
      const shouldXRay = (isXRayMode || builderMode === 'building') && hasTrack;
      mat.transparent = shouldXRay;
      mat.opacity = shouldXRay ? 0.35 : 1.0;
      mat.needsUpdate = true;
    }
  }, [heightMap, gridSize, indices, isInitialized, hasTrack, isXRayMode, builderMode]);

  // 통합 포인터 핸들러
  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (gameMode === 'terrain') {
      terrainPointerMove(e);
    } else if (gameMode === 'track') {
      handleTerrainHover(e.point.x, e.point.z);
    }
  }, [gameMode, terrainPointerMove, handleTerrainHover]);

  const setSelectedRide = useTrackStore((s) => s.setSelectedRide);

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (gameMode === 'terrain') {
      terrainPointerDown(e);
    } else if (gameMode === 'track' && e.button === 0) {
      e.stopPropagation();
      handleTerrainClick(e.point.x, e.point.z);
    } else if (gameMode === 'view' && e.button === 0) {
      // view 모드에서 지형 클릭 시 선택 해제
      setSelectedRide(null);
    }
  }, [gameMode, terrainPointerDown, handleTerrainClick, setSelectedRide]);

  const handlePointerUp = useCallback(() => {
    if (gameMode === 'terrain') {
      terrainPointerUp();
    }
  }, [gameMode, terrainPointerUp]);

  const handlePointerLeave = useCallback(() => {
    if (gameMode === 'terrain') {
      terrainPointerLeave();
    }
  }, [gameMode, terrainPointerLeave]);

  if (!isInitialized) return null;

  return (
    <group>
      <mesh
        receiveShadow
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        <bufferGeometry ref={geometryRef} />
        <meshStandardMaterial
          ref={materialRef}
          vertexColors
          side={THREE.DoubleSide}
          roughness={0.9}
          metalness={0.0}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      <GridOverlay />
      <TerrainCursor subSelection={subSelection} />

      {/* 정거장 배치 프리뷰 (중심점 기준, 유효성 색상) */}
      {stationPreview && (
        <StationGhost
          centerPosition={stationPreview.centerPosition}
          direction={stationPreview.direction}
          isValid={stationPreview.isValid}
        />
      )}
    </group>
  );
}

/** 정거장 배치 전 반투명 프리뷰 (중심점 기준) + 높이 힌트 */
function StationGhost({ centerPosition, direction, isValid }: {
  centerPosition: { x: number; y: number; z: number };
  direction: number;
  isValid: boolean;
}) {
  const platformLength = 4 * 4; // DEFAULT_STATION_LENGTH * SEGMENT_LENGTH
  const platformWidth = 2.5;
  const rad = (direction * Math.PI) / 180;
  const color = isValid ? '#22CC44' : '#CC2222';

  const dirLabel = `${direction}°`;
  const heightLabel = `${centerPosition.y.toFixed(1)}m`;
  const statusLabel = isValid ? '배치 가능' : '지형 불균형';

  return (
    <group>
      <mesh
        position={[centerPosition.x, centerPosition.y + 0.15, centerPosition.z]}
        rotation={[0, -rad, 0]}
      >
        <boxGeometry args={[platformWidth, 0.3, platformLength]} />
        <meshStandardMaterial color={color} transparent opacity={0.4} />
      </mesh>

      {/* 높이/방향/상태 힌트 */}
      <Html
        position={[centerPosition.x, centerPosition.y + 2.5, centerPosition.z]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: isValid ? 'rgba(0,0,0,0.7)' : 'rgba(180,30,30,0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}
        >
          <div>{heightLabel} | {dirLabel}</div>
          <div style={{ fontSize: '10px', opacity: 0.8 }}>{statusLabel}</div>
        </div>
      </Html>
    </group>
  );
}
