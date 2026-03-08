/**
 * Vehicle.tsx — 차량 3D 렌더링 + 물리 시뮬레이션
 * 멀티카/멀티트레인 지원. vehicleConfig(type, carsPerTrain, trainCount) 실반영.
 * useFrame 내 ref 기반 물리, 주기적 스토어 동기화.
 * 포커스된 열차 0의 car 0만 vehicleRef에 트랜스폼 기록 (카메라 연동).
 * 3가지 모드: parked (정차), running (운행중), hidden (미완성)
 */

import { useRef, useMemo, useEffect, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Ride } from '../../../core/types/index.ts';
import type { VehicleFrameState, VehicleStyleDef } from '../../../core/types/ride.ts';
import { RIDE_DEFINITIONS, VEHICLE_STYLES } from '../../../core/types/ride.ts';
import type { SegmentRange, SampledPath } from '../../../core/systems/PhysicsSystem.ts';
import {
  buildSampledPath,
  samplePositionAndTangent,
  sampleY,
  samplePosition,
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
  CAR_SPACING,
} from '../../../core/constants/index.ts';
import { buildCurvePoints } from '../track/trackCurveUtils.ts';
import useRideTestStore, { writeLiveVehicleStats } from '../../../store/useRideTestStore.ts';
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
/** 트랙 레일 위 오프셋 */
const TRACK_Y_OFFSET = 0.15;

/** 바퀴 geometry/material (공유 인스턴스) */
const wheelGeometry = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_WIDTH, 12);
const wheelMaterial = new THREE.MeshStandardMaterial({ color: '#333333', metalness: 0.6, roughness: 0.3 });
/** 바퀴 플랜지 (레일 위 걸림부) */
const flangeGeometry = new THREE.CylinderGeometry(WHEEL_RADIUS + 0.03, WHEEL_RADIUS + 0.03, 0.02, 12);
const flangeMaterial = new THREE.MeshStandardMaterial({ color: '#444444', metalness: 0.7, roughness: 0.3 });
/** 하부 프레임 material */
const frameMaterial = new THREE.MeshStandardMaterial({ color: '#555555', metalness: 0.5, roughness: 0.4 });
/** 좌석 material */
const seatMaterial = new THREE.MeshStandardMaterial({ color: '#222222' });
/** 안전바 material */
const barMaterial = new THREE.MeshStandardMaterial({ color: '#666666', metalness: 0.7, roughness: 0.3 });
/** 차축 material */
const axleMaterial = new THREE.MeshStandardMaterial({ color: '#444444', metalness: 0.6 });

const defaultStyle: VehicleStyleDef = {
  bodyColor: '#CC2222',
  frontColor: '#AA1111',
  rearColor: '#991111',
  hasSidePanels: true,
};

/* ============================================
 * 재사용 임시 객체 (GC 방지)
 * useFrame 내에서 new Vector3() 대신 사용
 * ============================================ */
const _pos = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _right = new THREE.Vector3();
const _correctedUp = new THREE.Vector3();
const _negTangent = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();

/* ============================================
 * SingleCar — 개별 차량 1대 메쉬
 * ============================================ */
interface SingleCarProps {
  vehicleType: string;
}

const SingleCar = memo(function SingleCar({ vehicleType }: SingleCarProps) {
  const style = VEHICLE_STYLES[vehicleType] ?? defaultStyle;

  return (
    <group>
      {/* 하부 프레임 (대차) */}
      <mesh position={[0, BODY_Y - 0.02, 0]} material={frameMaterial} castShadow>
        <boxGeometry args={[RAIL_OFFSET * 2 + 0.2, 0.06, 1.6]} />
      </mesh>

      {/* 객차 본체 */}
      <mesh position={[0, BODY_Y + 0.28, 0]} castShadow>
        <boxGeometry args={[1.0, 0.5, 1.6]} />
        <meshStandardMaterial color={style.bodyColor} />
      </mesh>

      {/* 객차 전면 */}
      <mesh position={[0, BODY_Y + 0.28, 0.9]} castShadow>
        <boxGeometry args={[0.96, 0.46, 0.2]} />
        <meshStandardMaterial color={style.frontColor} />
      </mesh>

      {/* 객차 후면 */}
      <mesh position={[0, BODY_Y + 0.35, -0.9]} castShadow>
        <boxGeometry args={[0.96, 0.55, 0.15]} />
        <meshStandardMaterial color={style.rearColor} />
      </mesh>

      {/* 좌석 등받이 + 안전바 (hasSidePanels일 때만) */}
      {style.hasSidePanels && (
        <>
          <mesh position={[0, BODY_Y + 0.55, -0.3]} material={seatMaterial} castShadow>
            <boxGeometry args={[0.85, 0.3, 0.08]} />
          </mesh>
          <mesh position={[-0.35, BODY_Y + 0.55, 0.15]} material={barMaterial}>
            <boxGeometry args={[0.05, 0.25, 0.6]} />
          </mesh>
          <mesh position={[0.35, BODY_Y + 0.55, 0.15]} material={barMaterial}>
            <boxGeometry args={[0.05, 0.25, 0.6]} />
          </mesh>
        </>
      )}

      {/* === 바퀴 (4개) === */}
      <mesh geometry={wheelGeometry} material={wheelMaterial}
        position={[-RAIL_OFFSET, WHEEL_RADIUS, WHEEL_Z_OFFSET]} rotation={[0, 0, Math.PI / 2]} />
      <mesh geometry={flangeGeometry} material={flangeMaterial}
        position={[-RAIL_OFFSET - WHEEL_WIDTH / 2 - 0.01, WHEEL_RADIUS, WHEEL_Z_OFFSET]} rotation={[0, 0, Math.PI / 2]} />

      <mesh geometry={wheelGeometry} material={wheelMaterial}
        position={[RAIL_OFFSET, WHEEL_RADIUS, WHEEL_Z_OFFSET]} rotation={[0, 0, Math.PI / 2]} />
      <mesh geometry={flangeGeometry} material={flangeMaterial}
        position={[RAIL_OFFSET + WHEEL_WIDTH / 2 + 0.01, WHEEL_RADIUS, WHEEL_Z_OFFSET]} rotation={[0, 0, Math.PI / 2]} />

      <mesh geometry={wheelGeometry} material={wheelMaterial}
        position={[-RAIL_OFFSET, WHEEL_RADIUS, -WHEEL_Z_OFFSET]} rotation={[0, 0, Math.PI / 2]} />
      <mesh geometry={flangeGeometry} material={flangeMaterial}
        position={[-RAIL_OFFSET - WHEEL_WIDTH / 2 - 0.01, WHEEL_RADIUS, -WHEEL_Z_OFFSET]} rotation={[0, 0, Math.PI / 2]} />

      <mesh geometry={wheelGeometry} material={wheelMaterial}
        position={[RAIL_OFFSET, WHEEL_RADIUS, -WHEEL_Z_OFFSET]} rotation={[0, 0, Math.PI / 2]} />
      <mesh geometry={flangeGeometry} material={flangeMaterial}
        position={[RAIL_OFFSET + WHEEL_WIDTH / 2 + 0.01, WHEEL_RADIUS, -WHEEL_Z_OFFSET]} rotation={[0, 0, Math.PI / 2]} />

      {/* 차축 */}
      <mesh position={[0, WHEEL_RADIUS, WHEEL_Z_OFFSET]} rotation={[0, 0, Math.PI / 2]} material={axleMaterial}>
        <cylinderGeometry args={[0.03, 0.03, RAIL_OFFSET * 2, 6]} />
      </mesh>
      <mesh position={[0, WHEEL_RADIUS, -WHEEL_Z_OFFSET]} rotation={[0, 0, Math.PI / 2]} material={axleMaterial}>
        <cylinderGeometry args={[0.03, 0.03, RAIL_OFFSET * 2, 6]} />
      </mesh>
    </group>
  );
});

/* ============================================
 * 헬퍼: SampledPath 위 특정 거리에 group 배치
 * — zero-allocation: 재사용 임시 객체 사용
 * — tangent 기반 quaternion으로 경사면 정확 추적
 * ============================================ */
function placeOnCurve(
  group: THREE.Group,
  path: SampledPath,
  distance: number,
) {
  const totalLen = path.totalLength;
  const d = ((distance % totalLen) + totalLen) % totalLen;

  // SampledPath에서 이진탐색 1회 + lerp
  samplePositionAndTangent(path, d, _pos, _tangent);

  group.position.copy(_pos);
  group.position.y += TRACK_Y_OFFSET;

  // Frenet-like frame: right = tangent × worldUp, correctedUp = right × tangent
  _up.set(0, 1, 0);
  _right.crossVectors(_tangent, _up);
  if (_right.lengthSq() < 0.001) {
    // 수직 구간: fallback up
    _up.set(0, 0, 1);
    _right.crossVectors(_tangent, _up);
  }
  _right.normalize();
  _correctedUp.crossVectors(_right, _tangent).normalize();

  // 회전 행렬: [right, correctedUp, -tangent] (Three.js는 -Z를 전방으로 사용)
  _negTangent.copy(_tangent).negate();
  _mat4.makeBasis(_right, _correctedUp, _negTangent);
  _quat.setFromRotationMatrix(_mat4);
  group.quaternion.copy(_quat);
}

/* ============================================
 * Vehicle — 메인 컴포넌트
 * ============================================ */
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

export default function Vehicle({ ride }: VehicleProps) {
  const { trainCount, carsPerTrain, type: vehicleType } = ride.vehicleConfig;

  // ref 배열: trainRefs[trainIdx][carIdx]
  const trainRefs = useRef<(THREE.Group | null)[][]>([]);
  const frameState = useRef<VehicleFrameState>(createInitialFrameState());
  const lastSyncTime = useRef(0);

  const isActive = useRideTestStore((s) => !!s.activeTests[ride.id]);

  // 경로 데이터 생성: ride 구조가 변경될 때만 재계산 (vehicleConfig 변경에 무관)
  // CatmullRomCurve3를 빌드타임에 1회 샘플링 → SampledPath. 이후 curve 참조 제거.
  const pathData = useMemo(() => {
    if (!ride.isComplete) return null;

    const { points, segmentRanges: rawRanges } = buildFullCurvePoints(ride);
    if (points.length < 2) return null;

    // 임시 curve: buildSampledPath 호출 후 GC 대상
    const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
    const path = buildSampledPath(curve, ARC_LENGTH_SAMPLES);

    // segmentRanges: 노드 인덱스 비율 → 샘플링된 누적 거리로 매핑
    const totalPoints = points.length;
    const segmentRanges: SegmentRange[] = rawRanges.map((r) => {
      const startU = r.startDist / (totalPoints - 1);
      const endU = r.endDist / (totalPoints - 1);
      // u → SampledPath 인덱스 → 누적 거리 (선형 보간)
      const startDist = uToDistance(path, Math.min(startU, 1));
      const endDist = uToDistance(path, Math.min(endU, 1));
      return {
        startDist: Math.min(startDist, endDist),
        endDist: Math.max(startDist, endDist),
        specialType: r.specialType,
      };
    });

    return { path, segmentRanges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride.nodes, ride.segments, ride.isComplete]);

  // 테스트 시작 시 상태 초기화
  useEffect(() => {
    if (isActive) {
      frameState.current = createInitialFrameState();
      frameState.current.speed = INITIAL_LAUNCH_SPEED;
      lastSyncTime.current = 0;
    }
  }, [isActive]);

  // 정차(parked) 모드: 모든 열차/차량을 곡선 위 정적 배치
  useEffect(() => {
    if (!isActive && pathData) {
      parkAllTrains(trainRefs.current, pathData, trainCount, carsPerTrain);
    }
  }, [isActive, pathData, trainCount, carsPerTrain]);

  // 물리 시뮬레이션 + 렌더링 (매 프레임)
  useFrame((_state, delta) => {
    if (!isActive || !pathData) return;

    const { path, segmentRanges } = pathData;
    const fs = frameState.current;
    const dt = Math.min(delta, MAX_DELTA_TIME);
    const totalLen = path.totalLength;

    const rideType = ride.rideType as keyof typeof RIDE_DEFINITIONS;
    const rideDef = RIDE_DEFINITIONS[rideType] ?? RIDE_DEFINITIONS.steel_coaster;
    const { friction, airResistance } = rideDef.physics;

    // 물리 시뮬레이션 (리드 트레인 기준) — SampledPath 기반 O(log n) lerp
    const specialType = getSpecialTypeAtDistance(fs.distance, segmentRanges);
    const curY = sampleY(path, fs.distance);

    const nextDist = (fs.distance + fs.speed * dt) % totalLen;
    const nextY = sampleY(path, nextDist);

    fs.speed = physicsStep(
      fs.speed, curY, nextY,
      dt, friction, airResistance, specialType,
    );

    fs.distance += fs.speed * dt;
    fs.elapsedTime += dt;

    // 1바퀴 완주 체크
    if (fs.distance >= totalLen) {
      fs.distance -= totalLen;

      if (!fs.hasCompletedLap) {
        fs.hasCompletedLap = true;
        useRideTestStore.getState().setCompletedStats(ride.id, {
          maxSpeed: fs.maxSpeed,
          maxHeight: fs.maxHeight,
          maxGForce: fs.maxGForce,
          maxLateralG: fs.maxLateralG,
          trackLength: totalLen,
          rideTime: fs.elapsedTime,
        });
        return;
      }
    }

    // 모든 열차/차량 배치
    const trainSpacing = totalLen / trainCount;
    for (let ti = 0; ti < trainCount; ti++) {
      const trainDist = fs.distance + ti * trainSpacing;
      const trainCars = trainRefs.current[ti];
      if (!trainCars) continue;

      for (let ci = 0; ci < carsPerTrain; ci++) {
        const carGroup = trainCars[ci];
        if (!carGroup) continue;
        placeOnCurve(carGroup, path, trainDist - ci * CAR_SPACING);
      }
    }

    // 리드 카 거리로 통계/카메라 계산 (한 번만)
    const leadDist = ((fs.distance % totalLen) + totalLen) % totalLen;
    samplePositionAndTangent(path, leadDist, _pos, _tangent);
    const posY = _pos.y;

    // 포커스된 차량이면 카메라 ref 기록 (열차 0, car 0)
    const leadCar = trainRefs.current[0]?.[0];
    const store = useRideTestStore.getState();
    if (store.focusedRideId === ride.id && leadCar) {
      vehicleTransform.position.copy(leadCar.position);
      vehicleTransform.tangent.copy(_tangent);
      vehicleTransform.active = true;
    }

    // G-Force 계산 — 주기적으로만 (매 프레임 불필요)
    const now = performance.now();
    if (now - lastSyncTime.current > SPEED_SYNC_INTERVAL_MS) {
      lastSyncTime.current = now;

      // 거리 기반 3점 샘플링 (G-Force용)
      const gDist = totalLen * 0.005; // 총 길이의 0.5%
      const dPrev = ((leadDist - gDist) % totalLen + totalLen) % totalLen;
      const dNext = (leadDist + gDist) % totalLen;

      const pPrev = { x: 0, y: 0, z: 0 };
      const pCur = { x: _pos.x, y: _pos.y, z: _pos.z };
      const pNext = { x: 0, y: 0, z: 0 };
      samplePosition(path, dPrev, pPrev);
      samplePosition(path, dNext, pNext);

      const slopeAngle = calculateSlopeAngle(pPrev, pNext);
      const radius = calculateCurvatureRadius(pPrev, pCur, pNext);
      const verticalG = calculateVerticalGForce(fs.speed, radius, slopeAngle);
      const hRadius = calculateHorizontalCurvatureRadius(pPrev, pCur, pNext);
      const lateralG = calculateLateralGForce(fs.speed, hRadius);

      // 뮤터블 버퍼에 직접 기록 (Zustand set() 없음 → 리렌더 제거)
      writeLiveVehicleStats(ride.id, fs.speed, posY, verticalG, lateralG);

      fs.maxGForce = Math.max(fs.maxGForce, Math.abs(verticalG));
      fs.maxLateralG = Math.max(fs.maxLateralG, Math.abs(lateralG));
    }

    // 통계 업데이트 (매 프레임 — 싸다)
    fs.maxSpeed = Math.max(fs.maxSpeed, fs.speed);
    fs.maxHeight = Math.max(fs.maxHeight, posY);
  });

  // 미완성 라이드이거나 경로 데이터 없으면 렌더링 안함
  if (!ride.isComplete || !pathData) return null;

  // ref 배열 크기 동기화
  if (trainRefs.current.length !== trainCount) {
    trainRefs.current = Array.from({ length: trainCount }, () =>
      Array.from<THREE.Group | null>({ length: carsPerTrain }).fill(null),
    );
  }
  for (let ti = 0; ti < trainCount; ti++) {
    if (!trainRefs.current[ti] || trainRefs.current[ti].length !== carsPerTrain) {
      trainRefs.current[ti] = Array.from<THREE.Group | null>({ length: carsPerTrain }).fill(null);
    }
  }

  return (
    <>
      {Array.from({ length: trainCount }, (_, ti) => (
        Array.from({ length: carsPerTrain }, (_, ci) => (
          <group
            key={`train-${ti}-car-${ci}`}
            ref={(el) => {
              if (trainRefs.current[ti]) {
                trainRefs.current[ti][ci] = el;
              }
            }}
          >
            <SingleCar vehicleType={vehicleType} />
          </group>
        ))
      ))}
    </>
  );
}

/** 정차 모드: 모든 열차/차량을 곡선 위 균등 간격 정적 배치 */
function parkAllTrains(
  refs: (THREE.Group | null)[][],
  pathData: { path: SampledPath },
  trainCount: number,
  carsPerTrain: number,
) {
  const { path } = pathData;
  const totalLen = path.totalLength;

  for (let ti = 0; ti < trainCount; ti++) {
    const trainOffset = ti * (totalLen / trainCount);
    const trainCars = refs[ti];
    if (!trainCars) continue;

    for (let ci = 0; ci < carsPerTrain; ci++) {
      const carGroup = trainCars[ci];
      if (!carGroup) continue;
      const carDist = trainOffset - ci * CAR_SPACING;
      placeOnCurve(carGroup, path, carDist);
    }
  }
}

/**
 * 균등 u (0~1) → SampledPath 누적 거리 변환.
 * SampledPath는 균등 u 간격으로 샘플링되었으므로, u × sampleCount로 인덱스 + 보간.
 */
function uToDistance(path: SampledPath, u: number): number {
  const idx = u * path.sampleCount;
  const i0 = Math.min(Math.floor(idx), path.sampleCount - 1);
  const i1 = i0 + 1;
  const frac = idx - i0;
  return path.distances[i0] + (path.distances[i1] - path.distances[i0]) * frac;
}
