/**
 * useRideTest.ts — 테스트 운행 제어 훅
 * 키보드 단축키: 1=자유, 2=1인칭, 3=3인칭, ESC=포커스 라이드 중지
 */

import { useEffect } from 'react';
import useRideTestStore from '../store/useRideTestStore.ts';

export default function useRideTest() {
  const activeTests = useRideTestStore((s) => s.activeTests);
  const setCameraMode = useRideTestStore((s) => s.setCameraMode);

  const hasActiveTests = Object.keys(activeTests).length > 0;

  // 키보드 단축키
  useEffect(() => {
    if (!hasActiveTests) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case '1':
          setCameraMode('free');
          break;
        case '2':
          setCameraMode('firstPerson');
          break;
        case '3':
          setCameraMode('thirdPerson');
          break;
        case 'Escape': {
          // 포커스된 라이드 중지, 없으면 전체 중지
          const store = useRideTestStore.getState();
          if (store.focusedRideId) {
            store.stopTest(store.focusedRideId);
          } else {
            store.stopAllTests();
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasActiveTests, setCameraMode]);
}
