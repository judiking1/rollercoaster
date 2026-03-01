/**
 * Scene.tsx — 메인 3D 씬 컨테이너
 * CameraControls 기반: 모든 모드에서 우클릭=회전, 중클릭=팬, 휠=줌
 * terrain 모드에서는 좌클릭이 편집용이므로 카메라에서 비활성화
 * WASD 키보드로 카메라 이동 가능 (terrain 모드 대응)
 */

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import Lighting from './Lighting.tsx';
import Terrain from './terrain/Terrain.tsx';
import useGameStore from '../../store/useGameStore.ts';
import useTerrainStore from '../../store/useTerrainStore.ts';
import { GRID_UNIT, CAMERA_PAN_SPEED } from '../../core/constants/index.ts';

export default function Scene() {
  const controlsRef = useRef<CameraControlsImpl>(null);
  const gameMode = useGameStore((s) => s.gameMode);
  const gridSize = useTerrainStore((s) => s.gridSize);
  const isInitialized = useTerrainStore((s) => s.isInitialized);

  // WASD 키 상태 추적
  const keysPressed = useRef<Set<string>>(new Set());

  // 마우스 버튼 매핑: gameMode에 따라 변경
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (gameMode === 'terrain') {
      // terrain 모드: 좌클릭=편집(카메라 비활성), 우클릭=회전, 중클릭=팬
      controls.mouseButtons.left = CameraControlsImpl.ACTION.NONE;
      controls.mouseButtons.right = CameraControlsImpl.ACTION.ROTATE;
      controls.mouseButtons.middle = CameraControlsImpl.ACTION.TRUCK;
    } else {
      // view 모드: 좌클릭=회전, 우클릭=회전, 중클릭=팬
      controls.mouseButtons.left = CameraControlsImpl.ACTION.ROTATE;
      controls.mouseButtons.right = CameraControlsImpl.ACTION.ROTATE;
      controls.mouseButtons.middle = CameraControlsImpl.ACTION.TRUCK;
    }
  }, [gameMode]);

  // 맵 로드 시 카메라를 맵 중앙으로 이동
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !isInitialized) return;

    const centerX = (gridSize.x * GRID_UNIT) / 2;
    const centerZ = (gridSize.z * GRID_UNIT) / 2;
    const mapDiagonal = Math.max(gridSize.x, gridSize.z) * GRID_UNIT;
    const cameraDistance = mapDiagonal * 0.6;

    // 카메라 위치: 맵 중앙에서 비스듬히 위에서 바라보기
    controls.setLookAt(
      centerX + cameraDistance * 0.5,  // x
      cameraDistance * 0.5,            // y (위에서)
      centerZ + cameraDistance * 0.5,  // z
      centerX,                         // target x
      0,                               // target y
      centerZ,                         // target z
      true,                            // animate
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

  // WASD 기반 카메라 truck 이동 (매 프레임)
  useFrame((_state, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const keys = keysPressed.current;
    if (keys.size === 0) return;

    const speed = CAMERA_PAN_SPEED * delta;

    // truck(x, y): 카메라 로컬 좌표계 기준 이동 (x=좌우, y=위아래)
    // forward/backward는 forward() 메서드로 처리
    let truckX = 0;
    let forwardZ = 0;

    if (keys.has('a')) truckX -= speed;
    if (keys.has('d')) truckX += speed;
    if (keys.has('w')) forwardZ += speed;
    if (keys.has('s')) forwardZ -= speed;

    if (truckX !== 0) {
      controls.truck(truckX, 0, false);
    }
    if (forwardZ !== 0) {
      controls.forward(forwardZ, false);
    }
  });

  return (
    <>
      <Lighting />
      <CameraControls
        ref={controlsRef}
        makeDefault
        minDistance={5}
        maxDistance={300}
        maxPolarAngle={Math.PI / 2.1}
        dollySpeed={0.5}
      />
      <Terrain />
    </>
  );
}
