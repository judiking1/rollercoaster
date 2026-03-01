/**
 * App.tsx — 최상위 라우팅 및 레이아웃
 * currentScene 상태에 따라 씬을 전환합니다.
 */

import useGameStore from './store/useGameStore.ts';
import MainMenuScene from './scenes/MainMenuScene.tsx';
import MapSelectScene from './scenes/MapSelectScene.tsx';
import GameScene from './scenes/GameScene.tsx';

export default function App() {
  const currentScene = useGameStore((s) => s.currentScene);

  switch (currentScene) {
    case 'mainMenu':
      return <MainMenuScene />;
    case 'mapSelect':
      return <MapSelectScene />;
    case 'game':
      return <GameScene />;
  }
}
