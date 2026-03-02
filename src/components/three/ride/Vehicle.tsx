/**
 * Vehicle.tsx — 차량 3D 렌더링 + 물리 시뮬레이션
 * 각 라이드별 독립 실행. useFrame 내 ref 기반 물리, 주기적 스토어 동기화.
 * 포커스된 차량만 vehicleRef에 트랜스폼 기록 (카메라 연동).
 * 3가지 모드: parked (정차), running (운행중), hidden (미완성)
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Ride } from '../../../core/types/index.ts';
import type { VehicleFrameState } from '../../../core/types/ride.ts';
import { RIDE_DEFINITIONS } from '../../../core/types/ride.ts';
import type { SegmentRange } from '../../../core/systems/PhysicsSystem.ts';
import {
  buildArcLengthTable,
  distanceToT,
  getSpecialTypeAtDistance,
  physicsStep,
  calculateCurvatureRadius,
  calculateSlopeAngle,
  calculateVerticalGForce,
  calculateLateralGForce,
  calculateHorizontalCurvatureRadius,
  createInitialFrameState,
} from '../../../core/systems/PhysicsSystem.ts';
import {
  ARC_LENGTH_SAMPLES,
  INITIAL_LAUNCH_SPEED,
  MAX_DELTA_TIME,
  SPEED_SYNC_INTERVAL_MS,
} from '../../../core/constants/index.ts';
import { buildCurvePoints } from '../track/trackCurveUtils.ts';
import useRideTestStore from '../../../store/useRideTestStore.ts';
import { vehicleTransform } from './vehicleRef.ts';

/** 레일 간격 (TrackPath의 RAIL_OFFSET과 동일) */
const RAIL_OFFSET = 0.5;
/** 바퀴 반경 */
const WHEEL_RADIUS = 0.12;
/** 바퀴 두께 */
const WHEEL_WIDTH = 0.08;
/** 차량 본체 위쪽 오프셋 (바퀴 위) */
const BODY_Y = WHEEL_RADIUS + 0.05;
/** 바퀴 앞뒤 간격 */
const WHEEL_Z_OFFSET = 0.6;

interface VehicleProps {
  ride: Ride;
}

/** Node-Segment 그래프를 station_start부터 순회하여 전체 곡선 점 배열 생성 */
function buildFullCurvePoints(ride: Ride): {
  points: THREE.Vector3[];
  segmentRanges: SegmentRange[];
} {
  const points: THREE.Vector3[] = [];
  const segmentRanges: SegmentRange[] = [];

  const startNode = Object.values(ride.nodes).find((n) => n.type === 'station_start');
  if (!startNode) return { points: [], segmentRanges: [] };

  let currentNode = startNode;
  let cumulativePointIndex = 0;

  while (currentNode.nextSegmentId) {
    const seg = ride.segments[currentNode.nextSegmentId];
    if (!seg) break;

    const endNode = ride.nodes[seg.endNodeId];
    if (!endNode) break;

    const curvePoints = buildCurvePoints(currentNode, endNode);

    const startIdx = points.length > 0 ? 1 : 0;
    for (let i = startIdx; i < curvePoints.length; i++) {
      points.push(curvePoints[i]);
    }

    const endPointIndex = cumulativePointIndex + curvePoints.length - 1;
    segmentRanges.push({
      startDist: cumulativePointIndex,
      endDist: endPointIndex,
      specialType: seg.specialType,
    });

    cumulativePointIndex = endPointIndex;

    if (endNode.id === startNode.id) break;
    currentNode = endNode;
  }

  return { points, segmentRanges };
}

/** 바퀴 geometry/material (공유 인스턴스) */
const wheelGeometry = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_WIDTH, 12);
const wheelMaterial = new THREE.MeshStandardMaterial({ color: '#333333', metalness: 0.6, roughness: 0.3 });
/** 바퀴 플랜지 (레일 위 걸림부) */
const flangeGeometry = new THREE.CylinderGeometry(WHEEL_RADIUS + 0.03, WHEEL_RADIUS + 0.03, 0.02, 12);
const flangeMaterial = new THREE.MeshStandardMaterial({ color: '#444444', metalness: 0.7, roughness: 0.3 });

export default function Vehicle({ ride }: VehicleProps) {
  const groupRef = useRef<THREE.Group>(null);
  const frameState = useRef<VehicleFrameState>(createInitialFrameState());
  const lastSyncTime = useRef(0);

  // 이 라이드가 활성 테스트 중인지 확인
  const isActive = useRideTestStore((s) => !!s.activeTests[ride.id]);

  // 경로 데이터 생성: ride가 완성되었을 때만
  const pathData = useMemo(() => {
    if (!ride.isComplete) return null;

    const { points, segmentRanges: rawRanges } = buildFullCurvePoints(ride);
    if (points.length < 2) return null;

    const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');

    const samplePoints: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i <= ARC_LENGTH_SAMPLES; i++) {
      const t = i / ARC_LENGTH_SAMPLES;
      const p = curve.getPointAt(t);
      samplePoints.push({ x: p.x, y: p.y, z: p.z });
    }
    const arcTable = buildArcLengthTable(samplePoints, ARC_LENGTH_SAMPLES);

    const totalPoints = points.length;
    const segmentRanges: SegmentRange[] = rawRanges.map((r) => {
      const startT = r.startDist / (totalPoints - 1);
      const endT = r.endDist / (totalPoints - 1);
      const startPos = curve.getPointAt(Math.min(startT, 1));
      const endPos = curve.getPointAt(Math.min(endT, 1));
      const startDist = findClosestDistance(startPos, samplePoints, arcTable);
      const endDist = findClosestDistance(endPos, samplePoints, arcTable);
      return {
        startDist: Math.min(startDist, endDist),
        endDist: Math.max(startDist, endDist),
        specialType: r.specialType,
      };
    });

    return { curve, arcTable, segmentRanges };
  }, [ride]);

  // 테스트 시작 시 상태 초기화
  useEffect(() => {
    if (isActive) {
      frameState.current = createInitialFrameState();
      frameState.current.speed = INITIAL_LAUNCH_SPEED;
      lastSyncTime.current = 0;
    }
  }, [isActive]);

  // 정차(parked) 모드: 테스트 중이 아닌 완성된 라이드 → 정거장 시작 위치에 정적 배치
  useEffect(() => {
    if (!isActive && pathData && groupRef.current) {
      const pos = pathData.curve.getPointAt(0);
      const tangent = pathData.curve.getTangentAt(0).normalize();
      groupRef.current.position.copy(pos);
      groupRef.current.position.y += 0.15;
      const lookTarget = pos.clone().add(tangent);
      lookTarget.y = groupRef.current.position.y + tangent.y * 2;
      groupRef.current.lookAt(lookTarget);
    }
  }, [isActive, pathData]);

  // 물리 시뮬레이션 + 렌더링 (매 프레임)
  useFrame((_state, delta) => {
    // 정차 모드에서는 물리 연산 스킵
    if (!isActive || !pathData || !groupRef.current) return;

    const { curve, arcTable, segmentRanges } = pathData;
    const fs = frameState.current;

    const dt = Math.min(delta, MAX_DELTA_TIME);

    const rideType = ride.rideType as keyof typeof RIDE_DEFINITIONS;
    const rideDef = RIDE_DEFINITIONS[rideType] ?? RIDE_DEFINITIONS.steel_coaster;
    const { friction, airResistance } = rideDef.physics;

    const specialType = getSpecialTypeAtDistance(fs.distance, segmentRanges);

    const curT = distanceToT(fs.distance, arcTable);
    const curPos = curve.getPointAt(curT);

    const nextDist = (fs.distance + fs.speed * dt) % arcTable.totalLength;
    const nextT = distanceToT(nextDist, arcTable);
    const nextPos = curve.getPointAt(nextT);

    fs.speed = physicsStep(
      fs.speed, curPos.y, nextPos.y,
      dt, friction, airResistance, specialType,
    );

    fs.distance += fs.speed * dt;
    fs.elapsedTime += dt;

    // 1바퀴 완주 체크
    if (fs.distance >= arcTable.totalLength) {
      fs.distance -= arcTable.totalLength;

      if (!fs.hasCompletedLap) {
        fs.hasCompletedLap = true;
        useRideTestStore.getState().setCompletedStats(ride.id, {
          maxSpeed: fs.maxSpeed,
          maxHeight: fs.maxHeight,
          maxGForce: fs.maxGForce,
          maxLateralG: fs.maxLateralG,
          trackLength: arcTable.totalLength,
          rideTime: fs.elapsedTime,
        });
        return; // 테스트 종료 → isActive=false → parked useEffect 발동
      }
    }

    // 최종 위치 계산
    const finalT = distanceToT(fs.distance, arcTable);
    const pos = curve.getPointAt(finalT);
    const tangent = curve.getTangentAt(finalT).normalize();

    // 그룹 위치/방향 설정
    groupRef.current.position.copy(pos);
    groupRef.current.position.y += 0.15; // 트랙 레일 위 오프셋

    const lookTarget = pos.clone().add(tangent);
    lookTarget.y = groupRef.current.position.y + (tangent.y * 2);
    groupRef.current.lookAt(lookTarget);

    // 포커스된 차량이면 카메라 ref 기록
    const store = useRideTestStore.getState();
    if (store.focusedRideId === ride.id) {
      vehicleTransform.position.copy(groupRef.current.position);
      vehicleTransform.tangent.copy(tangent);
      vehicleTransform.active = true;
    }

    // G-Force 계산
    const gStep = 0.005;
    const tPrev = Math.max(0, finalT - gStep);
    const tNext = Math.min(1, finalT + gStep);
    const pPrev = curve.getPointAt(tPrev);
    const pCur = curve.getPointAt(finalT);
    const pNext = curve.getPointAt(tNext);

    const slopeAngle = calculateSlopeAngle(pPrev, pNext);
    const radius = calculateCurvatureRadius(pPrev, pCur, pNext);
    const verticalG = calculateVerticalGForce(fs.speed, radius, slopeAngle);

    const hRadius = calculateHorizontalCurvatureRadius(pPrev, pCur, pNext);
    const lateralG = calculateLateralGForce(fs.speed, hRadius);

    // 통계 업데이트
    fs.maxSpeed = Math.max(fs.maxSpeed, fs.speed);
    fs.maxHeight = Math.max(fs.maxHeight, pos.y);
    fs.maxGForce = Math.max(fs.maxGForce, Math.abs(verticalG));
    fs.maxLateralG = Math.max(fs.maxLateralG, Math.abs(lateralG));

    // 주기적 스토어 동기화
    const now = performance.now();
    if (now - lastSyncTime.current > SPEED_SYNC_INTERVAL_MS) {
      lastSyncTime.current = now;
      useRideTestStore.getState().syncFromVehicle(
        ride.id, fs.speed, pos.y, verticalG, lateralG,
      );
    }
  });

  // 미완성 라이드이거나 경로 데이터 없으면 렌더링 안함
  if (!ride.isComplete || !pathData) return null;

  return (
    <group ref={groupRef}>
      {/* === 차량 본체 === */}
      {/* 하부 프레임 (대차) */}
      <mesh position={[0, BODY_Y - 0.02, 0]} castShadow>
        <boxGeometry args={[RAIL_OFFSET * 2 + 0.2, 0.06, 1.6]} />
        <meshStandardMaterial color="#555555" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* 객차 본체 */}
      <mesh position={[0, BODY_Y + 0.28, 0]} castShadow>
        <boxGeometry args={[1.0, 0.5, 1.6]} />
        <meshStandardMaterial color="#CC2222" />
      </mesh>

      {/* 객차 전면 (경사) */}
      <mesh position={[0, BODY_Y + 0.28, 0.9]} castShadow>
        <boxGeometry args={[0.96, 0.46, 0.2]} />
        <meshStandardMaterial color="#AA1111" />
      </mesh>

      {/* 객차 후면 */}
      <mesh position={[0, BODY_Y + 0.35, -0.9]} castShadow>
        <boxGeometry args={[0.96, 0.55, 0.15]} />
        <meshStandardMaterial color="#991111" />
      </mesh>

      {/* 좌석 등받이 */}
      <mesh position={[0, BODY_Y + 0.55, -0.3]} castShadow>
        <boxGeometry args={[0.85, 0.3, 0.08]} />
        <meshStandardMaterial color="#222222" />
      </mesh>

      {/* 안전 바 */}
      <mesh position={[-0.35, BODY_Y + 0.55, 0.15]}>
        <boxGeometry args={[0.05, 0.25, 0.6]} />
        <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.35, BODY_Y + 0.55, 0.15]}>
        <boxGeometry args={[0.05, 0.25, 0.6]} />
        <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* === 바퀴 (4개) — 레일 위에 위치 === */}
      {/* 좌측 전방 바퀴 */}
      <mesh
        geometry={wheelGeometry}
        material={wheelMaterial}
        position={[-RAIL_OFFSET, WHEEL_RADIUS, WHEEL_Z_OFFSET]}
        rotation={[0, 0, Math.PI / 2]}
      />
      <mesh
        geometry={flangeGeometry}
        material={flangeMaterial}
        position={[-RAIL_OFFSET - WHEEL_WIDTH / 2 - 0.01, WHEEL_RADIUS, WHEEL_Z_OFFSET]}
        rotation={[0, 0, Math.PI / 2]}
      />

      {/* 우측 전방 바퀴 */}
      <mesh
        geometry={wheelGeometry}
        material={wheelMaterial}
        position={[RAIL_OFFSET, WHEEL_RADIUS, WHEEL_Z_OFFSET]}
        rotation={[0, 0, Math.PI / 2]}
      />
      <mesh
        geometry={flangeGeometry}
        material={flangeMaterial}
        position={[RAIL_OFFSET + WHEEL_WIDTH / 2 + 0.01, WHEEL_RADIUS, WHEEL_Z_OFFSET]}
        rotation={[0, 0, Math.PI / 2]}
      />

      {/* 좌측 후방 바퀴 */}
      <mesh
        geometry={wheelGeometry}
        material={wheelMaterial}
        position={[-RAIL_OFFSET, WHEEL_RADIUS, -WHEEL_Z_OFFSET]}
        rotation={[0, 0, Math.PI / 2]}
      />
      <mesh
        geometry={flangeGeometry}
        material={flangeMaterial}
        position={[-RAIL_OFFSET - WHEEL_WIDTH / 2 - 0.01, WHEEL_RADIUS, -WHEEL_Z_OFFSET]}
        rotation={[0, 0, Math.PI / 2]}
      />

      {/* 우측 후방 바퀴 */}
      <mesh
        geometry={wheelGeometry}
        material={wheelMaterial}
        position={[RAIL_OFFSET, WHEEL_RADIUS, -WHEEL_Z_OFFSET]}
        rotation={[0, 0, Math.PI / 2]}
      />
      <mesh
        geometry={flangeGeometry}
        material={flangeMaterial}
        position={[RAIL_OFFSET + WHEEL_WIDTH / 2 + 0.01, WHEEL_RADIUS, -WHEEL_Z_OFFSET]}
        rotation={[0, 0, Math.PI / 2]}
      />

      {/* 차축 (전방/후방) */}
      <mesh position={[0, WHEEL_RADIUS, WHEEL_Z_OFFSET]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, RAIL_OFFSET * 2, 6]} />
        <meshStandardMaterial color="#444444" metalness={0.6} />
      </mesh>
      <mesh position={[0, WHEEL_RADIUS, -WHEEL_Z_OFFSET]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, RAIL_OFFSET * 2, 6]} />
        <meshStandardMaterial color="#444444" metalness={0.6} />
      </mesh>
    </group>
  );
}

/** 주어진 위치에서 가장 가까운 누적 거리를 찾는 헬퍼 */
function findClosestDistance(
  target: THREE.Vector3,
  samplePoints: readonly { x: number; y: number; z: number }[],
  arcTable: { distances: Float64Array; sampleCount: number },
): number {
  let minDistSq = Infinity;
  let closestIdx = 0;

  const step = Math.max(1, Math.floor(samplePoints.length / 100));
  for (let i = 0; i < samplePoints.length; i += step) {
    const p = samplePoints[i];
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const dz = target.z - p.z;
    const dSq = dx * dx + dy * dy + dz * dz;
    if (dSq < minDistSq) {
      minDistSq = dSq;
      closestIdx = i;
    }
  }

  const searchStart = Math.max(0, closestIdx - step);
  const searchEnd = Math.min(samplePoints.length - 1, closestIdx + step);
  for (let i = searchStart; i <= searchEnd; i++) {
    const p = samplePoints[i];
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const dz = target.z - p.z;
    const dSq = dx * dx + dy * dy + dz * dz;
    if (dSq < minDistSq) {
      minDistSq = dSq;
      closestIdx = i;
    }
  }

  return arcTable.distances[closestIdx];
}
