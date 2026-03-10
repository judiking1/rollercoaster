/**
 * Scene.tsx — 메인 3D 씬 컨테이너
 * CameraControls 기반: 모든 모드에서 우클릭=회전, 중클릭=팬, 휠=줌
 * terrain/track 모드에서는 좌클릭이 편집용이므로 카메라에서 비활성화
 * WASD 키보드로 카메라 이동 가능
 * 테스트 운행 시 1인칭/3인칭 카메라 오버라이드 (포커스 라이드 추적)
 */

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import * as THREE from 'three';
import Lighting from './Lighting.tsx';
import Terrain from './terrain/Terrain.tsx';
import Station from './ride/Station.tsx';
import Vehicle from './ride/Vehicle.tsx';
import TrackPath from './track/TrackPath.tsx';
import TrackPreview from './track/TrackPreview.tsx';
import TrackSupport from './track/TrackSupport.tsx';
import TrackTunnel from './track/TrackTunnel.tsx';
import PresetPreview from './ride/PresetPreview.tsx';
import useGameStore from '../../store/useGameStore.ts';
import useTerrainStore from '../../store/useTerrainStore.ts';
import useTrackStore from '../../store/useTrackStore.ts';
import useRideTestStore from '../../store/useRideTestStore.ts';
import {
  GRID_UNIT,
  CAMERA_PAN_SPEED,
  FIRST_PERSON_HEIGHT,
  THIRD_PERSON_BEHIND,
  THIRD_PERSON_ABOVE,
} from '../../core/constants/index.ts';
import { vehicleTransform } from './ride/vehicleRef.ts';

export default function Scene() {
  const controlsRef = useRef<CameraControlsImpl>(null);
  const gameMode = useGameStore((s) => s.gameMode);
  const gridSize = useTerrainStore((s) => s.gridSize);
  const isInitialized = useTerrainStore((s) => s.isInitialized);
  const rides = useTrackStore((s) => s.rides);
  const focusedRideId = useRideTestStore((s) => s.focusedRideId);
  const cameraMode = useRideTestStore((s) => s.cameraMode);
  const { camera } = useThree();

  // 포커스 전환 감지용
  const prevFocusedRef = useRef<string | null>(null);

  // WASD 키 상태 추적
  const keysPressed = useRef<Set<string>>(new Set());

  // 마우스 버튼 매핑: gameMode에 따라 변경
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (gameMode === 'terrain' || gameMode === 'track' || gameMode === 'preset') {
      controls.mouseButtons.left = CameraControlsImpl.ACTION.NONE;
      controls.mouseButtons.right = CameraControlsImpl.ACTION.ROTATE;
      controls.mouseButtons.middle = CameraControlsImpl.ACTION.TRUCK;
    } else {
      controls.mouseButtons.left = CameraControlsImpl.ACTION.ROTATE;
      controls.mouseButtons.right = CameraControlsImpl.ACTION.ROTATE;
      controls.mouseButtons.middle = CameraControlsImpl.ACTION.TRUCK;
    }
  }, [gameMode]);

  // 테스트 카메라 모드일 때 CameraControls 비활성화
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const isTestCamera = focusedRideId !== null && cameraMode !== 'free';
    controls.enabled = !isTestCamera;
  }, [focusedRideId, cameraMode]);

  // 테스트 시작/종료 감지 → 카메라 저장/복원
  useEffect(() => {
    const prev = prevFocusedRef.current;
    const cur = focusedRideId;
    prevFocusedRef.current = cur;

    const controls = controlsRef.current;
    if (!controls) return;

    // null → rideId: 테스트 시작 → 카메라 저장
    if (prev === null && cur !== null) {
      const target = new THREE.Vector3();
      controls.getTarget(target);
      useRideTestStore.getState().saveCameraState({
        posX: camera.position.x,
        posY: camera.position.y,
        posZ: camera.position.z,
        targetX: target.x,
        targetY: target.y,
        targetZ: target.z,
      });
    }

    // rideId → null: 테스트 종료 → 카메라 복원
    if (prev !== null && cur === null) {
      const saved = useRideTestStore.getState().popCameraState();
      if (saved) {
        controls.enabled = true;
        controls.setLookAt(
          saved.posX, saved.posY, saved.posZ,
          saved.targetX, saved.targetY, saved.targetZ,
          true, // 부드러운 전환
        );
      }
      vehicleTransform.active = false;
    }
  }, [focusedRideId, camera]);

  // 맵 로드 시 카메라를 맵 중앙으로 이동
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !isInitialized) return;

    const centerX = (gridSize.x * GRID_UNIT) / 2;
    const centerZ = (gridSize.z * GRID_UNIT) / 2;
    const mapDiagonal = Math.max(gridSize.x, gridSize.z) * GRID_UNIT;
    const cameraDistance = mapDiagonal * 0.6;

    controls.setLookAt(
      centerX + cameraDistance * 0.5,
      cameraDistance * 0.5,
      centerZ + cameraDistance * 0.5,
      centerX,
      0,
      centerZ,
      true,
    );
  }, [gridSize, isInitialized]);

  // WASD 키보드 이벤트 리스너
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        keysPressed.current.add(key);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current.delete(key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    const keys = keysPressed.current;
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      keys.clear();
    };
  }, []);

  // WASD 기반 카메라 이동 + 테스트 카메라 오버라이드
  useFrame((_state, delta) => {
    const controls = controlsRef.current;

    // 포커스된 라이드 카메라 오버라이드
    const store = useRideTestStore.getState();
    const curFocused = store.focusedRideId;
    const curCamMode = store.cameraMode;

    if (curFocused && curCamMode !== 'free' && vehicleTransform.active) {
      const vt = vehicleTransform;
      const pos = vt.position;
      const tangent = vt.tangent;

      if (curCamMode === 'firstPerson') {
        camera.position.set(pos.x, pos.y + FIRST_PERSON_HEIGHT, pos.z);
        camera.lookAt(
          pos.x + tangent.x * 10,
          pos.y + FIRST_PERSON_HEIGHT + tangent.y * 10,
          pos.z + tangent.z * 10,
        );
      } else if (curCamMode === 'thirdPerson') {
        camera.position.set(
          pos.x - tangent.x * THIRD_PERSON_BEHIND,
          pos.y + THIRD_PERSON_ABOVE,
          pos.z - tangent.z * THIRD_PERSON_BEHIND,
        );
        camera.lookAt(pos.x, pos.y + 1, pos.z);
      }

      return;
    }

    // vehicleTransform 비활성화 (테스트 없으면)
    if (!curFocused) {
      vehicleTransform.active = false;
    }

    // 일반 WASD 카메라 이동
    if (!controls) return;

    const keys = keysPressed.current;
    if (keys.size === 0) return;

    const speed = CAMERA_PAN_SPEED * delta;
    let truckX = 0;
    let forwardZ = 0;

    if (keys.has('a')) truckX -= speed;
    if (keys.has('d')) truckX += speed;
    if (keys.has('w')) forwardZ += speed;
    if (keys.has('s')) forwardZ -= speed;

    if (truckX !== 0) controls.truck(truckX, 0, false);
    if (forwardZ !== 0) controls.forward(forwardZ, false);
  });

  const rideEntries = Object.values(rides);

  return (
    <>
      <Lighting />
      <CameraControls
        ref={controlsRef}
        makeDefault
        minDistance={5}
        maxDistance={300}
        dollySpeed={0.5}
      />
      <Terrain />

      {/* 트랙 시스템 3D 렌더링 */}
      {rideEntries.map((ride) => (
        <group key={ride.id}>
          <Station ride={ride} />
          <TrackPath ride={ride} />
          <TrackSupport ride={ride} />
          <TrackTunnel ride={ride} />
          <Vehicle ride={ride} />
        </group>
      ))}

      {/* 트랙 빌더 프리뷰 */}
      {gameMode === 'track' && <TrackPreview />}

      {/* 프리셋 배치 프리뷰 */}
      {gameMode === 'preset' && <PresetPreview />}
    </>
  );
}
