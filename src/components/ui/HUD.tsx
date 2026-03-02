/**
 * HUD.tsx — 게임 내 HUD 오버레이
 * TopBar (상단 툴바) + BottomBar (하단 컨텍스트 바) 통합
 * pointer-events-none 루트, 인터랙티브 요소만 auto
 */

import TopBar from './layout/TopBar.tsx';
import BottomBar from './layout/BottomBar.tsx';

export default function HUD() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <TopBar />
      <BottomBar />
    </div>
  );
}
