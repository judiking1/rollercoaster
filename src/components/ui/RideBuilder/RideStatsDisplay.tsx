/**
 * RideStatsDisplay.tsx — 테스트 운행 UI 패널
 * 포커스된 라이드의 실시간 속도/G-Force 표시 + 카메라 모드 전환
 * 활성 테스트 목록 표시, 개별 중지 가능
 */

import useRideTestStore, { useLiveVehicleData } from '../../../store/useRideTestStore.ts';
import useTrackStore from '../../../store/useTrackStore.ts';
import type { RideCameraMode } from '../../../core/types/ride.ts';

/** m/s → km/h 변환 */
function msToKmh(ms: number): number {
  return ms * 3.6;
}

const CAMERA_MODES: { mode: RideCameraMode; label: string; key: string }[] = [
  { mode: 'free', label: '자유', key: '1' },
  { mode: 'firstPerson', label: '1인칭', key: '2' },
  { mode: 'thirdPerson', label: '3인칭', key: '3' },
];

export default function RideStatsDisplay() {
  const activeTests = useRideTestStore((s) => s.activeTests);
  const focusedRideId = useRideTestStore((s) => s.focusedRideId);
  const cameraMode = useRideTestStore((s) => s.cameraMode);
  const setCameraMode = useRideTestStore((s) => s.setCameraMode);
  const stopTest = useRideTestStore((s) => s.stopTest);
  const setFocusedRide = useRideTestStore((s) => s.setFocusedRide);
  const rides = useTrackStore((s) => s.rides);

  // 훅은 조건부 반환 전에 호출 (Rules of Hooks)
  const focusedData = useLiveVehicleData(focusedRideId);

  const activeIds = Object.keys(activeTests);
  if (activeIds.length === 0) return null;

  const focusedRide = focusedRideId ? rides[focusedRideId] : null;

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 w-72">
      <div className="rounded-lg bg-black/80 p-4 text-white backdrop-blur-sm">
        {/* 활성 테스트 목록 */}
        <div className="mb-3">
          <div className="mb-1 text-xs text-gray-400">
            운행 중 ({activeIds.length}개)
          </div>
          <div className="flex flex-wrap gap-1">
            {activeIds.map((rideId) => {
              const ride = rides[rideId];
              const isFocused = rideId === focusedRideId;
              return (
                <button
                  key={rideId}
                  onClick={() => setFocusedRide(rideId)}
                  className={`rounded px-2 py-0.5 text-xs ${
                    isFocused
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  {ride?.name ?? rideId}
                </button>
              );
            })}
          </div>
        </div>

        {/* 포커스된 라이드 실시간 데이터 */}
        {focusedData && focusedRide && (
          <>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">{focusedRide.name}</span>
              <button
                onClick={() => stopTest(focusedRideId!)}
                className="rounded bg-red-600/80 px-2 py-0.5 text-xs hover:bg-red-500"
              >
                중지 (ESC)
              </button>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-slate-800/80 p-2">
                <div className="text-gray-400">속도</div>
                <div className="text-lg font-bold text-cyan-400">
                  {msToKmh(focusedData.currentSpeed).toFixed(0)}
                  <span className="ml-0.5 text-xs font-normal">km/h</span>
                </div>
              </div>
              <div className="rounded bg-slate-800/80 p-2">
                <div className="text-gray-400">높이</div>
                <div className="text-lg font-bold text-emerald-400">
                  {focusedData.currentHeight.toFixed(1)}
                  <span className="ml-0.5 text-xs font-normal">m</span>
                </div>
              </div>
              <div className="rounded bg-slate-800/80 p-2">
                <div className="text-gray-400">수직 G</div>
                <div className={`text-lg font-bold ${getGColor(focusedData.currentVerticalG)}`}>
                  {focusedData.currentVerticalG.toFixed(2)}
                  <span className="ml-0.5 text-xs font-normal">G</span>
                </div>
              </div>
              <div className="rounded bg-slate-800/80 p-2">
                <div className="text-gray-400">횡 G</div>
                <div className={`text-lg font-bold ${getGColor(focusedData.currentLateralG)}`}>
                  {focusedData.currentLateralG.toFixed(2)}
                  <span className="ml-0.5 text-xs font-normal">G</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 카메라 모드 */}
        <div className="flex gap-1">
          {CAMERA_MODES.map(({ mode, label, key }) => (
            <button
              key={mode}
              onClick={() => setCameraMode(mode)}
              className={`flex-1 rounded px-2 py-1 text-xs ${
                cameraMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              {label} ({key})
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** G-Force 값에 따른 색상 클래스 */
function getGColor(g: number): string {
  const absG = Math.abs(g);
  if (absG > 4) return 'text-red-400';
  if (absG > 2.5) return 'text-amber-400';
  return 'text-emerald-400';
}
