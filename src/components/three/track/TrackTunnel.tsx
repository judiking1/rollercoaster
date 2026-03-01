/**
 * TrackTunnel.tsx — 트랙 터널 렌더링
 * 트랙이 지형 아래를 관통하는 구간에 아치형 터널 tube와 포탈(입구/출구) 프레임을 렌더링
 * 지형 메쉬는 수정하지 않고, 별도 터널 메쉬를 덧씌우는 방식
 * 터널 정점은 지형 높이로 클램핑되어 지형 위로 튀어나오지 않음
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import type { Ride } from '../../../core/types/index.ts';
import useTerrainStore from '../../../store/useTerrainStore.ts';
import {
  TUNNEL_RADIUS,
  TUNNEL_ARCH_SEGMENTS,
  TUNNEL_DETECTION_MARGIN,
} from '../../../core/constants/index.ts';
import { buildCurvePoints, getTerrainHeightAt } from './trackCurveUtils.ts';
import {
  detectUndergroundSections,
  generateArchProfile,
  buildTunnelGeometryData,
  buildPortalGeometryData,
} from '../../../core/systems/TrackSystem.ts';
import type { Vector3Data } from '../../../core/types/index.ts';

interface TrackTunnelProps {
  ride: Ride;
}

/** 터널 렌더 데이터 */
interface TunnelRenderData {
  bodyGeo: { positions: Float32Array; normals: Float32Array; indices: Uint32Array };
  entryPortal: { positions: Float32Array; normals: Float32Array; indices: Uint32Array };
  exitPortal: { positions: Float32Array; normals: Float32Array; indices: Uint32Array };
}

/** THREE.Vector3 배열에서 forward 벡터 배열 계산 */
function computeForwardVectors(points: THREE.Vector3[]): Vector3Data[] {
  const forwards: Vector3Data[] = [];
  for (let i = 0; i < points.length; i++) {
    let fwd: THREE.Vector3;
    if (i < points.length - 1) {
      fwd = new THREE.Vector3().subVectors(points[i + 1], points[i]).normalize();
    } else if (i > 0) {
      fwd = new THREE.Vector3().subVectors(points[i], points[i - 1]).normalize();
    } else {
      fwd = new THREE.Vector3(0, 0, 1);
    }
    forwards.push({ x: fwd.x, y: fwd.y, z: fwd.z });
  }
  return forwards;
}

/** BufferGeometry를 Float32Array/Uint32Array 데이터로부터 생성 */
function createBufferGeometry(
  data: { positions: Float32Array; normals: Float32Array; indices: Uint32Array },
): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
  geo.setIndex(new THREE.BufferAttribute(data.indices, 1));
  return geo;
}

export default function TrackTunnel({ ride }: TrackTunnelProps) {
  const heightMap = useTerrainStore((s) => s.heightMap);
  const gridSize = useTerrainStore((s) => s.gridSize);

  const tunnelData = useMemo(() => {
    const profile = generateArchProfile(TUNNEL_RADIUS, TUNNEL_ARCH_SEGMENTS);
    const result: TunnelRenderData[] = [];

    // 정거장 세그먼트 제외
    const stationSegIds = new Set<string>();
    for (const node of Object.values(ride.nodes)) {
      if (node.type === 'station_start' && node.nextSegmentId) {
        stationSegIds.add(node.nextSegmentId);
      }
    }

    for (const seg of Object.values(ride.segments)) {
      if (stationSegIds.has(seg.id)) continue;
      const startNode = ride.nodes[seg.startNodeId];
      const endNode = ride.nodes[seg.endNodeId];
      if (!startNode || !endNode) continue;

      // 1. 곡선 포인트 생성
      const curvePoints = buildCurvePoints(startNode, endNode);

      // 2. 각 포인트의 지형 높이 조회
      const terrainHeights = curvePoints.map((p) => getTerrainHeightAt(p.x, p.z));

      // 3. 지하 구간 감지
      const pointsAsV3Data: Vector3Data[] = curvePoints.map((p) => ({
        x: p.x,
        y: p.y,
        z: p.z,
      }));
      const sections = detectUndergroundSections(
        pointsAsV3Data,
        terrainHeights,
        TUNNEL_DETECTION_MARGIN,
      );

      // 4. 각 구간에 대해 geometry 생성
      for (const section of sections) {
        const sectionPts = curvePoints.slice(section.startIdx, section.endIdx + 1);
        if (sectionPts.length < 2) continue;

        const sectionTerrainHeights = terrainHeights.slice(section.startIdx, section.endIdx + 1);
        const forwards = computeForwardVectors(sectionPts);
        const sectionV3Data: Vector3Data[] = sectionPts.map((p) => ({
          x: p.x,
          y: p.y,
          z: p.z,
        }));

        // 터널 본체: 지형 높이 전달하여 클램핑
        const bodyGeo = buildTunnelGeometryData(sectionV3Data, forwards, profile, sectionTerrainHeights);

        // 포탈: 입구는 forward 반전 (바깥을 향하도록), 출구는 forward 그대로
        const entryFwd = forwards[0];
        const exitFwd = forwards[forwards.length - 1];
        const entryTerrainY = sectionTerrainHeights[0];
        const exitTerrainY = sectionTerrainHeights[sectionTerrainHeights.length - 1];

        const entryPortal = buildPortalGeometryData(
          sectionV3Data[0],
          { x: -entryFwd.x, y: -entryFwd.y, z: -entryFwd.z },
          profile,
          entryTerrainY,
        );
        const exitPortal = buildPortalGeometryData(
          sectionV3Data[sectionV3Data.length - 1],
          exitFwd,
          profile,
          exitTerrainY,
        );

        result.push({ bodyGeo, entryPortal, exitPortal });
      }
    }
    return result;
  // heightMap, gridSize: getTerrainHeightAt()가 내부적으로 store에서 읽지만 deps에 포함해야 변경 시 재계산
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride.nodes, ride.segments, heightMap, gridSize]);

  // geometry 객체 생성 (useMemo로 캐싱)
  const geometries = useMemo(() => {
    return tunnelData.map((t) => ({
      body: createBufferGeometry(t.bodyGeo),
      entry: createBufferGeometry(t.entryPortal),
      exit: createBufferGeometry(t.exitPortal),
    }));
  }, [tunnelData]);

  // 공유 머티리얼
  const bodyMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: '#666655',
      roughness: 0.9,
      side: THREE.BackSide,
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 2,
    }),
    [],
  );
  const portalMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: '#555544',
      roughness: 0.8,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 2,
    }),
    [],
  );

  if (geometries.length === 0) return null;

  return (
    <group>
      {geometries.map((geo, i) => (
        <group key={i}>
          <mesh geometry={geo.body} material={bodyMaterial} />
          <mesh geometry={geo.entry} material={portalMaterial} />
          <mesh geometry={geo.exit} material={portalMaterial} />
        </group>
      ))}
    </group>
  );
}
