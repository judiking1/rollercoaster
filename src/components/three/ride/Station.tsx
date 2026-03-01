/**
 * Station.tsx — 정거장 3D 렌더링
 * BoxGeometry 플랫폼, direction 기반 회전, 지형 높이 위 배치
 * 클릭 시 해당 놀이기구 선택
 */

import { useMemo, useCallback } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { Ride } from '../../../core/types/index.ts';
import { SEGMENT_LENGTH } from '../../../core/constants/index.ts';
import useTrackStore from '../../../store/useTrackStore.ts';
import useGameStore from '../../../store/useGameStore.ts';

interface StationProps {
  ride: Ride;
}

export default function Station({ ride }: StationProps) {
  const { station } = ride;
  const selectedRideId = useTrackStore((s) => s.selectedRideId);
  const builderMode = useTrackStore((s) => s.builderMode);
  const setSelectedRide = useTrackStore((s) => s.setSelectedRide);
  const gameMode = useGameStore((s) => s.gameMode);
  const setGameMode = useGameStore((s) => s.setGameMode);

  const isSelected = selectedRideId === ride.id;
  const platformLength = station.length * SEGMENT_LENGTH;
  const platformWidth = 2.5;
  const platformHeight = 0.3;

  // 정거장 중심 위치 계산
  const centerPosition = useMemo(() => {
    const rad = (station.direction * Math.PI) / 180;
    const halfLen = platformLength / 2;
    return new THREE.Vector3(
      station.position.x + Math.sin(rad) * halfLen,
      station.position.y + platformHeight / 2,
      station.position.z + Math.cos(rad) * halfLen,
    );
  }, [station.position, station.direction, platformLength, platformHeight]);

  // Y축 회전 (0°=+Z → rotation.y = 0)
  const rotationY = useMemo(() => {
    return -(station.direction * Math.PI) / 180;
  }, [station.direction]);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    // 빌더 모드에서는 선택 무시
    if (builderMode !== 'idle') return;
    e.stopPropagation();
    // view 모드에서 클릭하면 선택
    if (gameMode !== 'terrain') {
      setSelectedRide(isSelected ? null : ride.id);
      if (gameMode !== 'view') setGameMode('view');
    }
  }, [builderMode, gameMode, isSelected, ride.id, setSelectedRide, setGameMode]);

  const platformColor = isSelected ? '#FFD700' : '#8B7355';
  const railingColor = isSelected ? '#DDAA00' : '#666666';

  return (
    <group
      position={centerPosition}
      rotation={[0, rotationY, 0]}
      onClick={handleClick}
    >
      {/* 메인 플랫폼 */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[platformWidth, platformHeight, platformLength]} />
        <meshStandardMaterial color={platformColor} />
      </mesh>

      {/* 좌측 난간 */}
      <mesh position={[-(platformWidth / 2 + 0.05), 0.3, 0]}>
        <boxGeometry args={[0.1, 0.6, platformLength]} />
        <meshStandardMaterial color={railingColor} />
      </mesh>

      {/* 우측 난간 */}
      <mesh position={[platformWidth / 2 + 0.05, 0.3, 0]}>
        <boxGeometry args={[0.1, 0.6, platformLength]} />
        <meshStandardMaterial color={railingColor} />
      </mesh>

      {/* 레일 (정거장 위) */}
      <mesh position={[-0.5, platformHeight / 2 + 0.05, 0]}>
        <boxGeometry args={[0.15, 0.1, platformLength]} />
        <meshStandardMaterial color="#AAAAAA" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.5, platformHeight / 2 + 0.05, 0]}>
        <boxGeometry args={[0.15, 0.1, platformLength]} />
        <meshStandardMaterial color="#AAAAAA" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}
