/**
 * TerrainCursor.tsx — RCT 스타일 격자 하이라이트 + 높이 힌트
 *
 * corner 모드: 꼭지점에 인접한 삼각형만 하이라이트 + 정점 마커
 * full 모드: 브러시 영역 전체 셀 하이라이트
 * 모든 모드에서 높이 힌트를 m 단위로 표시
 */

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { SubSelection } from '../../../core/types/index.ts';
import useGameStore from '../../../store/useGameStore.ts';
import useTerrainStore from '../../../store/useTerrainStore.ts';
import {
  generateCellHighlightGeometry,
  generateCornerHighlightGeometry,
} from '../../../core/systems/TerrainSystem.ts';
import { GRID_UNIT } from '../../../core/constants/index.ts';

interface TerrainCursorProps {
  subSelection: SubSelection;
}

export default function TerrainCursor({ subSelection }: TerrainCursorProps) {
  const fullGeoRef = useRef<THREE.BufferGeometry>(null);
  const cornerGeoRef = useRef<THREE.BufferGeometry>(null);
  const gameMode = useGameStore((s) => s.gameMode);
  const heightMap = useTerrainStore((s) => s.heightMap);
  const gridSize = useTerrainStore((s) => s.gridSize);

  const { mode, cornerVertex, highlightCells, hintHeight, hintPosition } = subSelection;

  // full 모드: 셀 하이라이트 geometry 업데이트
  useEffect(() => {
    const geo = fullGeoRef.current;
    if (!geo || mode !== 'full' || highlightCells.length === 0) return;

    const { positions, indices } = generateCellHighlightGeometry(
      highlightCells, heightMap, gridSize, GRID_UNIT, 0.03,
    );

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeBoundingSphere();
  }, [mode, highlightCells, heightMap, gridSize]);

  // corner 모드: 삼각형 하이라이트 geometry 업데이트
  useEffect(() => {
    const geo = cornerGeoRef.current;
    if (!geo || mode !== 'corner' || !cornerVertex) return;

    const positions = generateCornerHighlightGeometry(
      cornerVertex, highlightCells, heightMap, gridSize, GRID_UNIT, 0.03,
    );

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.deleteAttribute('index'); // non-indexed geometry
    geo.computeBoundingSphere();
  }, [mode, cornerVertex, highlightCells, heightMap, gridSize]);

  if (gameMode !== 'terrain' || highlightCells.length === 0) return null;

  return (
    <group>
      {/* full 모드: 셀 전체 하이라이트 */}
      {mode === 'full' && (
        <mesh>
          <bufferGeometry ref={fullGeoRef} />
          <meshBasicMaterial
            color="#ffcc00"
            transparent
            opacity={0.25}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* corner 모드: 인접 삼각형 하이라이트 */}
      {mode === 'corner' && (
        <>
          <mesh>
            <bufferGeometry ref={cornerGeoRef} />
            <meshBasicMaterial
              color="#ff8800"
              transparent
              opacity={0.35}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          {/* 꼭지점 마커 */}
          {cornerVertex && (
            <mesh position={[
              cornerVertex.x * GRID_UNIT,
              (heightMap[cornerVertex.z * (gridSize.x + 1) + cornerVertex.x] ?? 0) + 0.05,
              cornerVertex.z * GRID_UNIT,
            ]}>
              <sphereGeometry args={[0.12, 12, 12]} />
              <meshBasicMaterial color="#ff8800" />
            </mesh>
          )}
        </>
      )}

      {/* 높이 힌트 라벨 */}
      <Html
        position={[hintPosition.x, hintPosition.y, hintPosition.z]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(0,0,0,0.75)',
            color: mode === 'corner' ? '#ff8800' : '#ffcc00',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          {hintHeight.toFixed(1)}m
          {mode === 'corner' && (
            <span style={{ fontSize: '9px', marginLeft: '4px', opacity: 0.7 }}>
              vertex
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}
