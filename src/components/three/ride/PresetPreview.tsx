/**
 * PresetPreview.tsx — 프리셋 배치 프리뷰 3D 렌더링
 * 반투명 트랙 튜브 + 정거장 ghost 표시
 * valid=초록, invalid=빨강
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import usePresetStore from '../../../store/usePresetStore.ts';
import type { TrackNode } from '../../../core/types/track.ts';
import type { ResolvedNode } from '../../../core/types/index.ts';
import { buildCurvePoints } from '../track/trackCurveUtils.ts';

/** ResolvedNode를 buildCurvePoints가 받는 TrackNode 형태로 변환 */
function toTrackNode(node: ResolvedNode): TrackNode {
  return {
    id: '',
    position: node.position,
    direction: node.direction,
    type: node.type,
    nextSegmentId: null,
    prevSegmentId: null,
  };
}

export default function PresetPreview() {
  const resolvedNodes = usePresetStore((s) => s.resolvedNodes);
  const previewValid = usePresetStore((s) => s.previewValid);
  const activePresetId = usePresetStore((s) => s.activePresetId);
  const presets = usePresetStore((s) => s.presets);

  const preset = activePresetId ? presets[activePresetId] : null;

  // 트랙 프리뷰 튜브 geometry
  const tubeGeometry = useMemo(() => {
    if (!preset || resolvedNodes.length < 2) return null;

    const allPoints: THREE.Vector3[] = [];

    // 세그먼트 순서대로 곡선 포인트 수집
    for (const seg of preset.segments) {
      const startNode = resolvedNodes[seg.startNodeIndex];
      const endNode = resolvedNodes[seg.endNodeIndex];
      if (!startNode || !endNode) continue;

      const points = buildCurvePoints(toTrackNode(startNode), toTrackNode(endNode));

      // 첫 세그먼트가 아니면 첫 포인트 건너뛰기 (이전 세그먼트 끝과 중복)
      const startIdx = allPoints.length > 0 ? 1 : 0;
      for (let i = startIdx; i < points.length; i++) {
        allPoints.push(points[i]);
      }
    }

    if (allPoints.length < 2) return null;

    // CatmullRomCurve3로 부드러운 튜브 생성
    const curve = new THREE.CatmullRomCurve3(allPoints, false, 'centripetal', 0.5);
    const tubularSegments = Math.min(allPoints.length * 2, 600);
    return new THREE.TubeGeometry(curve, tubularSegments, 0.3, 6, false);
  }, [preset, resolvedNodes]);

  // 정거장 ghost box 데이터
  const stationData = useMemo(() => {
    if (!preset || resolvedNodes.length < 2) return null;

    const startNode = resolvedNodes[0]; // station_start
    const endNode = resolvedNodes.find((n) => n.type === 'station_end');
    if (!startNode || !endNode) return null;

    const cx = (startNode.position.x + endNode.position.x) / 2;
    const cy = (startNode.position.y + endNode.position.y) / 2;
    const cz = (startNode.position.z + endNode.position.z) / 2;

    const dx = endNode.position.x - startNode.position.x;
    const dz = endNode.position.z - startNode.position.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);

    return { cx, cy, cz, length, angle };
  }, [preset, resolvedNodes]);

  if (!tubeGeometry) return null;

  const color = previewValid ? '#22cc66' : '#cc2222';

  return (
    <group>
      {/* 트랙 프리뷰 (반투명 튜브) */}
      <mesh geometry={tubeGeometry} renderOrder={10}>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.5}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 정거장 ghost */}
      {stationData && (
        <mesh
          position={[stationData.cx, stationData.cy + 0.5, stationData.cz]}
          rotation={[0, -stationData.angle, 0]}
          renderOrder={11}
        >
          <boxGeometry args={[2.5, 1, stationData.length]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
