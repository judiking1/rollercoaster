/**
 * GameScene.tsx — 게임 플레이 씬
 * R3F Canvas + HUD 오버레이 + 지형 초기화 + 트랙 빌더 패널
 */

import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene from '../components/three/Scene.tsx';
import HUD from '../components/ui/HUD.tsx';
import TerrainToolbar from '../components/ui/TerrainEditor/TerrainToolbar.tsx';
import RideBuilderPanel from '../components/ui/RideBuilder/RideBuilderPanel.tsx';
import RideInfoPanel from '../components/ui/RideBuilder/RideInfoPanel.tsx';
import useMapStore from '../store/useMapStore.ts';
import useTerrainStore from '../store/useTerrainStore.ts';
import useTrackStore from '../store/useTrackStore.ts';
import useGameStore from '../store/useGameStore.ts';

export default function GameScene() {
  const currentMapData = useMapStore((s) => s.currentMapData);
  const initFromMapData = useTerrainStore((s) => s.initFromMapData);
  const resetTerrain = useTerrainStore((s) => s.resetTerrain);
  const resetTrackStore = useTrackStore((s) => s.resetTrackStore);
  const loadRides = useTrackStore((s) => s.loadRides);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const gameMode = useGameStore((s) => s.gameMode);

  // 맵 데이터로 지형 + 트랙 초기화
  useEffect(() => {
    if (currentMapData) {
      initFromMapData(
        currentMapData.terrain.heightMap,
        currentMapData.settings.gridSize,
      );
      // 저장된 놀이기구 데이터 복원
      if (currentMapData.rides.length > 0) {
        loadRides(currentMapData.rides);
      }
    }

    return () => {
      resetTerrain();
      resetTrackStore();
      setGameMode('view');
    };
  }, [currentMapData, initFromMapData, loadRides, resetTerrain, resetTrackStore, setGameMode]);

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        camera={{ position: [50, 50, 50], fov: 50, near: 0.5, far: 1000 }}
      >
        <Scene />
      </Canvas>
      <HUD />
      <TerrainToolbar />
      {gameMode === 'track' && <RideBuilderPanel />}
      <RideInfoPanel />
    </div>
  );
}
