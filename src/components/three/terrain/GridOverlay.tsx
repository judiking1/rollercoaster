/**
 * GridOverlay.tsx — 편집 모드 그리드 오버레이
 * 지형 높이를 따르는 LineSegments, terrain 모드에서만 표시
 */

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import useTerrainStore from '../../../store/useTerrainStore.ts';
import useGameStore from '../../../store/useGameStore.ts';
import { generateGridLinePositions } from '../../../core/systems/TerrainSystem.ts';
import { GRID_UNIT, GRID_OVERLAY_Y_OFFSET } from '../../../core/constants/index.ts';

export default function GridOverlay() {
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const gameMode = useGameStore((s) => s.gameMode);
  const heightMap = useTerrainStore((s) => s.heightMap);
  const gridSize = useTerrainStore((s) => s.gridSize);
  const isInitialized = useTerrainStore((s) => s.isInitialized);

  useEffect(() => {
    const geo = geometryRef.current;
    if (!geo || !isInitialized || heightMap.length === 0) return;

    const positions = generateGridLinePositions(heightMap, gridSize, GRID_UNIT, GRID_OVERLAY_Y_OFFSET);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.computeBoundingSphere();
  }, [heightMap, gridSize, isInitialized]);

  if (gameMode !== 'terrain' || !isInitialized) return null;

  return (
    <lineSegments>
      <bufferGeometry ref={geometryRef} />
      <lineBasicMaterial
        color="#555555"
        transparent
        opacity={0.3}
        depthWrite={false}
      />
    </lineSegments>
  );
}
