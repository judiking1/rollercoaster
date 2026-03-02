/**
 * RideInfoPanel.tsx — 놀이기구 정보 패널 (다중 패널 지원)
 * openPanels 기반으로 여러 패널 동시 표시 + 드래그 이동
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import useTrackStore from '../../../store/useTrackStore.ts';
import useGameStore from '../../../store/useGameStore.ts';
import useRideTestStore from '../../../store/useRideTestStore.ts';
import type { Ride } from '../../../core/types/index.ts';
import type { RideStats } from '../../../core/types/ride.ts';

/** m/s → km/h 변환 */
function msToKmh(ms: number): number {
  return ms * 3.6;
}

/** 초 → mm:ss 포맷 */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function RideInfoPanel() {
  const openPanels = useTrackStore((s) => s.openPanels);
  const rides = useTrackStore((s) => s.rides);

  const panelEntries = Object.entries(openPanels);
  if (panelEntries.length === 0) return null;

  return (
    <>
      {panelEntries.map(([rideId, pos], index) => {
        const ride = rides[rideId];
        if (!ride) return null;
        return (
          <SingleRidePanel
            key={rideId}
            ride={ride}
            posX={pos.x}
            posY={pos.y}
            zIndex={index}
          />
        );
      })}
    </>
  );
}

interface SingleRidePanelProps {
  ride: Ride;
  posX: number;
  posY: number;
  zIndex: number;
}

function SingleRidePanel({ ride, posX, posY, zIndex }: SingleRidePanelProps) {
  const selectedRideId = useTrackStore((s) => s.selectedRideId);
  const setSelectedRide = useTrackStore((s) => s.setSelectedRide);
  const closePanel = useTrackStore((s) => s.closePanel);
  const renameRide = useTrackStore((s) => s.renameRide);
  const resumeBuilding = useTrackStore((s) => s.resumeBuilding);
  const reopenRide = useTrackStore((s) => s.reopenRide);
  const deleteRide = useTrackStore((s) => s.deleteRide);
  const setPanelPosition = useTrackStore((s) => s.setPanelPosition);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const activeTests = useRideTestStore((s) => s.activeTests);
  const completedStatsMap = useRideTestStore((s) => s.completedStatsMap);
  const startTest = useRideTestStore((s) => s.startTest);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const isHighlighted = selectedRideId === ride.id;
  const isTestRunning = !!activeTests[ride.id];
  const savedStats: RideStats | undefined = completedStatsMap[ride.id];

  // 패널에 마우스 올리면 하이라이트
  const handleMouseEnter = useCallback(() => {
    setSelectedRide(ride.id);
  }, [ride.id, setSelectedRide]);

  // ESC 키: 하이라이트된 패널 닫기
  useEffect(() => {
    if (!isHighlighted) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePanel(ride.id);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isHighlighted, ride.id, closePanel]);

  // 드래그 핸들러
  const handleDragStart = useCallback((e: React.PointerEvent) => {
    // 입력 필드에서는 드래그 안함
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    e.preventDefault();
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - posX,
      y: e.clientY - posY,
    };
  }, [posX, posY]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: PointerEvent) => {
      // 뷰포트 내로 클램프
      const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.current.y));
      setPanelPosition(ride.id, newX, newY);
    };

    const handleUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };
  }, [isDragging, ride.id, setPanelPosition]);

  const handleEdit = useCallback(() => {
    setGameMode('track');
    if (ride.isComplete) {
      reopenRide(ride.id);
    } else {
      resumeBuilding(ride.id);
    }
  }, [ride, setGameMode, resumeBuilding, reopenRide]);

  const handleDelete = useCallback(() => {
    deleteRide(ride.id);
  }, [ride.id, deleteRide]);

  const handleStartTest = useCallback(() => {
    if (!ride.isComplete) return;
    startTest(ride.id);
  }, [ride, startTest]);

  const handleClose = useCallback(() => {
    closePanel(ride.id);
  }, [ride.id, closePanel]);

  const segmentCount = Object.keys(ride.segments).length - 1;
  const nodeCount = Object.keys(ride.nodes).length;

  const handleStartRename = () => {
    setEditName(ride.name);
    setIsEditing(true);
  };

  const handleConfirmRename = () => {
    const trimmed = editName.trim();
    if (trimmed.length > 0) {
      renameRide(ride.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleCancelRename = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirmRename();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      handleCancelRename();
    }
  };

  return (
    <div
      className="pointer-events-auto absolute w-64"
      style={{ left: `${posX}px`, top: `${posY}px`, zIndex: 20 + zIndex }}
      onMouseEnter={handleMouseEnter}
    >
      <div className={`rounded-lg p-4 text-white backdrop-blur-sm ${
        isHighlighted ? 'bg-black/80 ring-1 ring-yellow-500/50' : 'bg-black/70'
      }`}>
        {/* 헤더: 드래그 핸들 + 이름 + 닫기 */}
        <div
          className="mb-3 flex cursor-grab items-center justify-between active:cursor-grabbing"
          onPointerDown={handleDragStart}
        >
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleConfirmRename}
              autoFocus
              className="w-full rounded bg-slate-700 px-2 py-1 text-sm text-white outline-none focus:ring-1 focus:ring-blue-400"
            />
          ) : (
            <span
              className="cursor-pointer text-sm font-semibold hover:text-blue-300"
              onClick={handleStartRename}
              title="클릭하여 이름 변경"
            >
              {ride.name}
            </span>
          )}
          <button
            onClick={handleClose}
            className="ml-2 text-gray-400 hover:text-white"
          >
            &times;
          </button>
        </div>

        {/* 기본 정보 */}
        <div className="mb-3 space-y-1 text-xs text-gray-300">
          <div className="flex justify-between">
            <span>상태</span>
            <span className={ride.isComplete ? 'text-emerald-400' : 'text-amber-400'}>
              {ride.isComplete ? '완성됨' : '미완성'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>세그먼트</span>
            <span>{segmentCount}개</span>
          </div>
          <div className="flex justify-between">
            <span>노드</span>
            <span>{nodeCount}개</span>
          </div>
          <div className="flex justify-between">
            <span>방향</span>
            <span>{ride.station.direction}°</span>
          </div>
          <div className="flex justify-between">
            <span>높이</span>
            <span>{ride.station.position.y.toFixed(1)}m</span>
          </div>
        </div>

        {/* 테스트 결과 (완주 이력이 있을 때) */}
        {savedStats && (
          <div className="mb-3 rounded bg-slate-800/60 p-2">
            <div className="mb-1 text-xs font-semibold text-emerald-400">테스트 결과</div>
            <div className="space-y-0.5 text-xs text-gray-300">
              <div className="flex justify-between">
                <span>최고 속도</span>
                <span className="text-cyan-400">{msToKmh(savedStats.maxSpeed).toFixed(1)} km/h</span>
              </div>
              <div className="flex justify-between">
                <span>최고 높이</span>
                <span className="text-emerald-400">{savedStats.maxHeight.toFixed(1)} m</span>
              </div>
              <div className="flex justify-between">
                <span>최대 수직 G</span>
                <span>{savedStats.maxGForce.toFixed(2)} G</span>
              </div>
              <div className="flex justify-between">
                <span>최대 횡 G</span>
                <span>{savedStats.maxLateralG.toFixed(2)} G</span>
              </div>
              <div className="flex justify-between">
                <span>주행 시간</span>
                <span>{formatTime(savedStats.rideTime)}</span>
              </div>
              <div className="flex justify-between">
                <span>트랙 길이</span>
                <span>{savedStats.trackLength.toFixed(0)} m</span>
              </div>
            </div>
          </div>
        )}

        {/* 테스트 운행 버튼 (완성된 라이드만) */}
        {ride.isComplete && (
          <button
            onClick={handleStartTest}
            disabled={isTestRunning}
            className={`mb-2 w-full rounded px-3 py-1.5 text-sm font-medium ${
              isTestRunning
                ? 'cursor-not-allowed bg-gray-600 text-gray-400'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            {isTestRunning ? '운행 중...' : '테스트 운행'}
          </button>
        )}

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={handleEdit}
            className="flex-1 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-500"
          >
            편집
          </button>
          <button
            onClick={handleDelete}
            className="rounded bg-red-600/80 px-3 py-1.5 text-sm hover:bg-red-500"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
