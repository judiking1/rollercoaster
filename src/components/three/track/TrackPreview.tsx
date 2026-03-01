/**
 * TrackPreview.tsx — 다음 세그먼트 배치 전 반투명 프리뷰
 * 곡선 기반 렌더링 (TrackPath와 동일한 CubicBezier)
 * 초록=배치 가능, 빨강=충돌/불가
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import useTrackStore from '../../../store/useTrackStore.ts';
import {
  calculateNextPosition,
  checkCollision,
  directionToVector,
} from '../../../core/systems/TrackSystem.ts';
import { COLLISION_MIN_DISTANCE } from '../../../core/constants/index.ts';

const CURVE_DIVISIONS = 12;
const RAIL_OFFSET = 0.5;
const RAIL_HEIGHT = 0.15;

function dirToVec3(direction: number): THREE.Vector3 {
  const v = directionToVector(direction);
  return new THREE.Vector3(v.x, 0, v.z);
}

export default function TrackPreview() {
  const activeRideId = useTrackStore((s) => s.activeRideId);
  const rides = useTrackStore((s) => s.rides);
  const builderMode = useTrackStore((s) => s.builderMode);
  const selectedSegmentType = useTrackStore((s) => s.selectedSegmentType);

  const preview = useMemo(() => {
    if (builderMode !== 'building' || !activeRideId) return null;

    const ride = rides[activeRideId];
    if (!ride || ride.isComplete) return null;

    const headNode = ride.nodes[ride.headNodeId];
    if (!headNode) return null;

    const { position: nextPos, direction: nextDir } = calculateNextPosition(
      headNode.position, headNode.direction, selectedSegmentType,
    );

    const isColliding = checkCollision(
      nextPos, ride.nodes, [headNode.id], COLLISION_MIN_DISTANCE,
    );

    return {
      startPos: headNode.position,
      startDir: headNode.direction,
      endPos: nextPos,
      endDir: nextDir,
      isValid: !isColliding,
    };
  }, [activeRideId, rides, builderMode, selectedSegmentType]);

  const renderData = useMemo(() => {
    if (!preview) return null;

    const { startPos, startDir, endPos, endDir, isValid } = preview;
    const color = isValid ? '#22CC44' : '#CC2222';

    const p0 = new THREE.Vector3(startPos.x, startPos.y, startPos.z);
    const p3 = new THREE.Vector3(endPos.x, endPos.y, endPos.z);
    const dist = p0.distanceTo(p3);
    if (dist < 0.01) return null;

    const tangentScale = dist * 0.4;
    const sd = dirToVec3(startDir);
    const ed = dirToVec3(endDir);

    const p1 = p0.clone().add(sd.multiplyScalar(tangentScale));
    p1.y = p0.y + (p3.y - p0.y) * 0.33;
    const p2 = p3.clone().sub(ed.multiplyScalar(tangentScale));
    p2.y = p0.y + (p3.y - p0.y) * 0.67;

    const curve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
    const points = curve.getPoints(CURVE_DIVISIONS);

    // 레일 세그먼트
    const railSegs: Array<{
      leftMid: THREE.Vector3; leftLen: number; leftQ: THREE.Quaternion;
      rightMid: THREE.Vector3; rightLen: number; rightQ: THREE.Quaternion;
    }> = [];

    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const fwd = new THREE.Vector3().subVectors(next, curr).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(fwd, up).normalize();

      const currCenter = curr.clone(); currCenter.y += RAIL_HEIGHT / 2;
      const nextCenter = next.clone(); nextCenter.y += RAIL_HEIGHT / 2;

      const ls = currCenter.clone().add(right.clone().multiplyScalar(-RAIL_OFFSET));
      const le = nextCenter.clone().add(right.clone().multiplyScalar(-RAIL_OFFSET));
      const rs = currCenter.clone().add(right.clone().multiplyScalar(RAIL_OFFSET));
      const re = nextCenter.clone().add(right.clone().multiplyScalar(RAIL_OFFSET));

      const leftDir = new THREE.Vector3().subVectors(le, ls).normalize();
      const rightDir = new THREE.Vector3().subVectors(re, rs).normalize();

      railSegs.push({
        leftMid: new THREE.Vector3().lerpVectors(ls, le, 0.5),
        leftLen: ls.distanceTo(le),
        leftQ: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), leftDir),
        rightMid: new THREE.Vector3().lerpVectors(rs, re, 0.5),
        rightLen: rs.distanceTo(re),
        rightQ: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), rightDir),
      });
    }

    return { railSegs, endPos, endDir, color, isValid };
  }, [preview]);

  if (!renderData) return null;

  const { railSegs, endPos, endDir, color, isValid } = renderData;

  return (
    <group>
      {railSegs.map((rs, i) => (
        <group key={i}>
          <mesh position={rs.leftMid} quaternion={rs.leftQ}>
            <boxGeometry args={[0.15, RAIL_HEIGHT, rs.leftLen]} />
            <meshStandardMaterial color={color} transparent opacity={0.5} />
          </mesh>
          <mesh position={rs.rightMid} quaternion={rs.rightQ}>
            <boxGeometry args={[0.15, RAIL_HEIGHT, rs.rightLen]} />
            <meshStandardMaterial color={color} transparent opacity={0.5} />
          </mesh>
        </group>
      ))}

      {/* 끝 위치 마커 */}
      <mesh position={[endPos.x, endPos.y + 0.5, endPos.z]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color={color} transparent opacity={0.6} />
      </mesh>

      {/* 높이 힌트 */}
      <Html
        position={[endPos.x, endPos.y + 2, endPos.z]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: isValid ? 'rgba(0,0,0,0.7)' : 'rgba(180,30,30,0.8)',
            color: 'white',
            padding: '3px 6px',
            borderRadius: '3px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
          }}
        >
          {endPos.y.toFixed(1)}m | {endDir}°
          {!isValid && ' (충돌)'}
        </div>
      </Html>
    </group>
  );
}
