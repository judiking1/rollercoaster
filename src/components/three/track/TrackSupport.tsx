/**
 * TrackSupport.tsx — 트랙 지지대(기둥) 렌더링
 * 각 노드 위치에서 지형까지 수직 기둥을 InstancedMesh로 렌더링
 */

import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Ride } from '../../../core/types/index.ts';
import useTerrainStore from '../../../store/useTerrainStore.ts';
import useTrackStore from '../../../store/useTrackStore.ts';
import { GRID_UNIT, SUPPORT_MIN_HEIGHT, SUPPORT_RADIUS } from '../../../core/constants/index.ts';

interface TrackSupportProps {
  ride: Ride;
}

interface SupportPillar {
  x: number;
  z: number;
  topY: number;
  bottomY: number;
}

/** 지형 높이를 그리드 보간으로 조회 */
function getTerrainHeightAt(x: number, z: number): number {
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

/** 다른 라이드의 세그먼트와 교차하는지 확인, 교차 시 기둥 하단을 조정 */
function adjustPillarForInterference(
  pillar: SupportPillar,
  currentRideId: string,
): SupportPillar {
  const { rides } = useTrackStore.getState();
  let adjustedBottom = pillar.bottomY;

  for (const [rideId, ride] of Object.entries(rides)) {
    if (rideId === currentRideId) continue;

    for (const node of Object.values(ride.nodes)) {
      const dx = pillar.x - node.position.x;
      const dz = pillar.z - node.position.z;
      const horizDist = Math.sqrt(dx * dx + dz * dz);

      // 기둥이 다른 트랙 노드 근처를 관통하는 경우
      if (horizDist < 1.5) {
        const trackY = node.position.y;
        // 기둥이 이 트랙을 관통하면 트랙 위에서부터 시작
        if (trackY > adjustedBottom && trackY < pillar.topY) {
          adjustedBottom = trackY + 0.3; // 클리어런스 여유
        }
      }
    }
  }

  return { ...pillar, bottomY: adjustedBottom };
}

export default function TrackSupport({ ride }: TrackSupportProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const heightMap = useTerrainStore((s) => s.heightMap);
  const rides = useTrackStore((s) => s.rides);

  // 기둥 데이터 계산
  const pillars = useMemo(() => {
    const result: SupportPillar[] = [];

    for (const node of Object.values(ride.nodes)) {
      const terrainY = getTerrainHeightAt(node.position.x, node.position.z);
      const heightAboveTerrain = node.position.y - terrainY;

      if (heightAboveTerrain >= SUPPORT_MIN_HEIGHT) {
        const raw: SupportPillar = {
          x: node.position.x,
          z: node.position.z,
          topY: node.position.y,
          bottomY: terrainY,
        };
        // 다른 트랙과의 간섭 방지 (Step 7)
        const adjusted = adjustPillarForInterference(raw, ride.id);

        // 조정 후에도 기둥이 충분히 높은지 확인
        if (adjusted.topY - adjusted.bottomY >= SUPPORT_MIN_HEIGHT) {
          result.push(adjusted);
        }
      }
    }

    return result;
  // heightMap, rides: getState()로 접근하지만 변경 시 재계산 트리거 필요
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride.nodes, ride.id, heightMap, rides]);

  const geometry = useMemo(() => new THREE.CylinderGeometry(SUPPORT_RADIUS, SUPPORT_RADIUS, 1, 8), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#888888',
    metalness: 0.5,
    roughness: 0.5,
  }), []);

  // InstancedMesh 매트릭스 업데이트
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || pillars.length === 0) return;

    const dummy = new THREE.Object3D();

    for (let i = 0; i < pillars.length; i++) {
      const p = pillars[i];
      const height = p.topY - p.bottomY;
      const centerY = p.bottomY + height / 2;

      dummy.position.set(p.x, centerY, p.z);
      dummy.scale.set(1, height, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = pillars.length;
    // InstancedMesh의 바운딩을 인스턴스 범위에 맞게 확장
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }, [pillars]);

  if (pillars.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, pillars.length]}
      castShadow
      receiveShadow
    />
  );
}
