/**
 * Terrain.tsx — 3D 지형 메쉬 렌더링
 * heightMap 기반 BufferGeometry + 높이별 vertex colors
 */

import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import useTerrainStore from '../../../store/useTerrainStore.ts';
import useTerrainEditor from '../../../hooks/useTerrainEditor.ts';
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
  const heightMap = useTerrainStore((s) => s.heightMap);
  const gridSize = useTerrainStore((s) => s.gridSize);
  const isInitialized = useTerrainStore((s) => s.isInitialized);

  const {
    subSelection,
    handlePointerMove,
    handlePointerDown,
    handlePointerUp,
    handlePointerLeave,
  } = useTerrainEditor();

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
  }, [heightMap, gridSize, indices, isInitialized]);

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
          vertexColors
          side={THREE.DoubleSide}
          roughness={0.9}
          metalness={0.0}
        />
      </mesh>
      <GridOverlay />
      <TerrainCursor subSelection={subSelection} />
    </group>
  );
}
