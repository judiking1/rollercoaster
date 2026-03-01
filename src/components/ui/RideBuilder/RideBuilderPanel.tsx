/**
 * RideBuilderPanel.tsx — 놀이기구 제작 패널
 * 세그먼트 타입 선택, 특수 타입, 추가/Undo/취소 버튼
 */

import { useCallback } from 'react';
import useTrackStore from '../../../store/useTrackStore.ts';
import useTrackBuilder from '../../../hooks/useTrackBuilder.ts';
import { SEGMENT_TYPES, SPECIAL_TYPES } from '../../../core/types/index.ts';
import type { SegmentType, SpecialType } from '../../../core/types/index.ts';

/** 세그먼트 타입 한글 레이블 */
const SEGMENT_LABELS: Record<SegmentType, string> = {
  straight: '직진',
  left_gentle: '좌완곡',
  left_sharp: '좌급곡',
  right_gentle: '우완곡',
  right_sharp: '우급곡',
  slope_up: '오르막',
  slope_down: '내리막',
};

/** 특수 타입 한글 레이블 */
const SPECIAL_LABELS: Record<SpecialType, string> = {
  normal: '일반',
  chain_lift: '체인',
  brake: '브레이크',
  booster: '부스터',
};

export default function RideBuilderPanel() {
  const builderMode = useTrackStore((s) => s.builderMode);
  const selectedSegmentType = useTrackStore((s) => s.selectedSegmentType);
  const selectedSpecialType = useTrackStore((s) => s.selectedSpecialType);
  const setSelectedSegmentType = useTrackStore((s) => s.setSelectedSegmentType);
  const setSelectedSpecialType = useTrackStore((s) => s.setSelectedSpecialType);
  const activeRideId = useTrackStore((s) => s.activeRideId);
  const rides = useTrackStore((s) => s.rides);

  const {
    cancelBuilder,
    handleAddSegment,
    handleUndo,
  } = useTrackBuilder();

  const handleSegmentSelect = useCallback((type: SegmentType) => {
    setSelectedSegmentType(type);
  }, [setSelectedSegmentType]);

  const handleSpecialSelect = useCallback((type: SpecialType) => {
    setSelectedSpecialType(type);
  }, [setSelectedSpecialType]);

  // placing_station 모드: 힌트만 표시
  if (builderMode === 'placing_station') {
    return (
      <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="rounded-lg bg-black/70 px-6 py-4 text-white backdrop-blur-sm">
          <p className="text-sm font-medium">지형을 클릭하여 정거장을 배치하세요</p>
          <p className="mt-1 text-xs text-gray-300">Q/E: 방향 회전 | ESC: 취소</p>
          <button
            onClick={cancelBuilder}
            className="mt-2 w-full rounded bg-red-600/80 px-3 py-1 text-sm hover:bg-red-500"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  // building 모드: 세그먼트 선택 + 빌더 패널
  if (builderMode !== 'building' || !activeRideId) return null;

  const ride = rides[activeRideId];
  const segmentCount = ride ? Object.keys(ride.segments).length - 1 : 0; // 정거장 세그먼트 제외

  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2">
      <div className="rounded-lg bg-black/70 px-6 py-4 text-white backdrop-blur-sm">
        {/* 타이틀 */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold">트랙 빌더</span>
          <span className="text-xs text-gray-400">세그먼트: {segmentCount}</span>
        </div>

        {/* 세그먼트 타입 선택 */}
        <div className="mb-2">
          <span className="mb-1 block text-xs text-gray-300">세그먼트 타입</span>
          <div className="flex flex-wrap gap-1">
            {SEGMENT_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => handleSegmentSelect(type)}
                className={`rounded px-2 py-1 text-xs transition ${
                  selectedSegmentType === type
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-600 text-gray-200 hover:bg-slate-500'
                }`}
              >
                {SEGMENT_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* 특수 타입 선택 */}
        <div className="mb-3">
          <span className="mb-1 block text-xs text-gray-300">특수 타입</span>
          <div className="flex gap-1">
            {SPECIAL_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => handleSpecialSelect(type)}
                className={`rounded px-2 py-1 text-xs transition ${
                  selectedSpecialType === type
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-600 text-gray-200 hover:bg-slate-500'
                }`}
              >
                {SPECIAL_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={handleAddSegment}
            className="flex-1 rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium hover:bg-emerald-500"
          >
            추가
          </button>
          <button
            onClick={handleUndo}
            className="rounded bg-slate-600 px-3 py-1.5 text-sm hover:bg-slate-500"
          >
            되돌리기
          </button>
          <button
            onClick={cancelBuilder}
            className="rounded bg-red-600/80 px-3 py-1.5 text-sm hover:bg-red-500"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
