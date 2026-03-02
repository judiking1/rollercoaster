/**
 * TrackPath.tsx — 트랙 경로 전체 3D 렌더링
 * 곡선 세그먼트: 노드의 direction으로 접선을 계산하여 CubicBezierCurve3 생성
 * 레일 간격 0.5, 침목 2unit 간격
 * 색상: normal=회색, chain_lift=주황, brake=빨강, booster=초록
 */

import { useMemo, useCallback } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { Ride, TrackSegment, TrackNode } from '../../../core/types/index.ts';
import useTrackStore from '../../../store/useTrackStore.ts';
import useGameStore from '../../../store/useGameStore.ts';
import { buildCurvePoints } from './trackCurveUtils.ts';

interface TrackPathProps {
  ride: Ride;
}

/** specialType별 레일 색상 */
const RAIL_COLORS: Record<string, string> = {
  normal: '#AAAAAA',
  chain_lift: '#FF8C00',
  brake: '#CC2222',
  booster: '#22CC22',
};

const RAIL_OFFSET = 0.5;
const RAIL_HEIGHT = 0.15;
const TIE_INTERVAL = 2; // units

/** 곡선 위의 t 지점에서 좌/우 레일 위치 및 침목 방향 계산 */
function computeRailPositions(
  points: THREE.Vector3[],
  index: number,
): { center: THREE.Vector3; right: THREE.Vector3; forward: THREE.Vector3 } {
  const center = points[index].clone();
  center.y += RAIL_HEIGHT / 2;

  // 전방 벡터 (인접 포인트 기반)
  let forward: THREE.Vector3;
  if (index < points.length - 1) {
    forward = new THREE.Vector3().subVectors(points[index + 1], points[index]).normalize();
  } else if (index > 0) {
    forward = new THREE.Vector3().subVectors(points[index], points[index - 1]).normalize();
  } else {
    forward = new THREE.Vector3(0, 0, 1);
  }

  // 수평 직교 벡터
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(forward, up).normalize();

  return { center, right, forward };
}

/** 단일 곡선 세그먼트 렌더링 컴포넌트 */
function CurveSegment({ segment, startNode, endNode, colorOverride }: {
  segment: TrackSegment;
  startNode: TrackNode;
  endNode: TrackNode;
  colorOverride?: string;
}) {
  const renderData = useMemo(() => {
    const points = buildCurvePoints(startNode, endNode);
    const color = colorOverride ?? RAIL_COLORS[segment.specialType] ?? RAIL_COLORS.normal;

    // 구간별 레일 위치 계산
    const railSegments: Array<{
      leftStart: THREE.Vector3;
      leftEnd: THREE.Vector3;
      rightStart: THREE.Vector3;
      rightEnd: THREE.Vector3;
      forward: THREE.Vector3;
      midPoint: THREE.Vector3;
      length: number;
    }> = [];

    for (let i = 0; i < points.length - 1; i++) {
      const curr = computeRailPositions(points, i);
      const next = computeRailPositions(points, i + 1);

      railSegments.push({
        leftStart: curr.center.clone().add(curr.right.clone().multiplyScalar(-RAIL_OFFSET)),
        leftEnd: next.center.clone().add(next.right.clone().multiplyScalar(-RAIL_OFFSET)),
        rightStart: curr.center.clone().add(curr.right.clone().multiplyScalar(RAIL_OFFSET)),
        rightEnd: next.center.clone().add(next.right.clone().multiplyScalar(RAIL_OFFSET)),
        forward: curr.forward,
        midPoint: new THREE.Vector3().lerpVectors(points[i], points[i + 1], 0.5),
        length: points[i].distanceTo(points[i + 1]),
      });
    }

    // 침목 위치 (곡선 경로를 따라 일정 간격)
    let accumulatedDist = 0;
    let nextTieDist = TIE_INTERVAL / 2; // 첫 침목은 중간부터
    const ties: Array<{ position: THREE.Vector3; quaternion: THREE.Quaternion }> = [];

    for (let i = 0; i < points.length - 1; i++) {
      const segLen = points[i].distanceTo(points[i + 1]);
      const startDist = accumulatedDist;
      accumulatedDist += segLen;

      while (nextTieDist <= accumulatedDist && nextTieDist > startDist) {
        const t = (nextTieDist - startDist) / segLen;
        const pos = new THREE.Vector3().lerpVectors(points[i], points[i + 1], t);
        pos.y -= 0.05;

        const q = new THREE.Quaternion();
        const tieForward = new THREE.Vector3().subVectors(points[i + 1], points[i]).normalize();
        // 우측 = up × forward (right-handed basis)
        const tieRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tieForward).normalize();
        // 실제 up = forward × right (경사 반영)
        const realUp = new THREE.Vector3().crossVectors(tieForward, tieRight).normalize();
        const mat = new THREE.Matrix4().makeBasis(tieRight, realUp, tieForward);
        q.setFromRotationMatrix(mat);

        ties.push({ position: pos, quaternion: q });
        nextTieDist += TIE_INTERVAL;
      }
    }

    return { railSegments, ties, color, points };
  }, [startNode, endNode, segment.specialType, colorOverride]);

  const { railSegments, ties, color } = renderData;

  return (
    <group>
      {/* 레일 세그먼트별 렌더링 */}
      {railSegments.map((rs, i) => {
        // 좌측 레일
        const leftMid = new THREE.Vector3().lerpVectors(rs.leftStart, rs.leftEnd, 0.5);
        const leftLen = rs.leftStart.distanceTo(rs.leftEnd);
        const leftDir = new THREE.Vector3().subVectors(rs.leftEnd, rs.leftStart).normalize();
        const leftQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), leftDir);

        // 우측 레일
        const rightMid = new THREE.Vector3().lerpVectors(rs.rightStart, rs.rightEnd, 0.5);
        const rightLen = rs.rightStart.distanceTo(rs.rightEnd);
        const rightDir = new THREE.Vector3().subVectors(rs.rightEnd, rs.rightStart).normalize();
        const rightQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), rightDir);

        return (
          <group key={i}>
            <mesh position={leftMid} quaternion={leftQ} castShadow renderOrder={1}>
              <boxGeometry args={[0.15, RAIL_HEIGHT, leftLen]} />
              <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} depthWrite />
            </mesh>
            <mesh position={rightMid} quaternion={rightQ} castShadow renderOrder={1}>
              <boxGeometry args={[0.15, RAIL_HEIGHT, rightLen]} />
              <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} depthWrite />
            </mesh>
          </group>
        );
      })}

      {/* 침목 */}
      {ties.map((tie, i) => (
        <mesh key={i} position={tie.position} quaternion={tie.quaternion} receiveShadow renderOrder={1}>
          <boxGeometry args={[RAIL_OFFSET * 2 + 0.3, 0.08, 0.2]} />
          <meshStandardMaterial color="#555555" depthWrite />
        </mesh>
      ))}
    </group>
  );
}

export default function TrackPath({ ride }: TrackPathProps) {
  const selectedRideId = useTrackStore((s) => s.selectedRideId);
  const builderMode = useTrackStore((s) => s.builderMode);
  const setSelectedRide = useTrackStore((s) => s.setSelectedRide);
  const openPanel = useTrackStore((s) => s.openPanel);
  const resumeBuilding = useTrackStore((s) => s.resumeBuilding);
  const gameMode = useGameStore((s) => s.gameMode);
  const setGameMode = useGameStore((s) => s.setGameMode);

  const isSelected = selectedRideId === ride.id;

  const renderedSegments = useMemo(() => {
    const result: Array<{
      segment: TrackSegment;
      startNode: TrackNode;
      endNode: TrackNode;
    }> = [];

    // 정거장 세그먼트 식별: station_start → station_end
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
      if (startNode && endNode) {
        result.push({ segment: seg, startNode, endNode });
      }
    }

    return result;
  }, [ride.nodes, ride.segments]);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    if (builderMode !== 'idle') return;
    e.stopPropagation();
    if (gameMode === 'terrain') return;

    // 미완성 라이드 클릭 → 자동 빌더 진입
    if (!ride.isComplete) {
      setGameMode('track');
      resumeBuilding(ride.id);
      openPanel(ride.id);
      return;
    }

    // 완성 라이드: 정거장 클릭과 동일하게 패널 열기
    if (isSelected) {
      setSelectedRide(null);
    } else {
      setSelectedRide(ride.id);
      openPanel(ride.id);
      if (gameMode !== 'view') setGameMode('view');
    }
  }, [builderMode, gameMode, isSelected, ride.id, ride.isComplete, setSelectedRide, setGameMode, openPanel, resumeBuilding]);

  // 선택 시 레일 색상 오버라이드
  const colorOverride = isSelected ? '#FFD700' : undefined;

  return (
    <group onClick={handleClick}>
      {renderedSegments.map(({ segment, startNode, endNode }) => (
        <CurveSegment
          key={segment.id}
          segment={segment}
          startNode={startNode}
          endNode={endNode}
          colorOverride={colorOverride}
        />
      ))}
    </group>
  );
}
