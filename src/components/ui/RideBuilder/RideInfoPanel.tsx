/**
 * RideInfoPanel.tsx — 선택된 놀이기구 정보 패널
 * 이름 편집, 트랙 통계, 편집/삭제 버튼
 */

import { useState, useCallback, useEffect } from 'react';
import useTrackStore from '../../../store/useTrackStore.ts';
import useGameStore from '../../../store/useGameStore.ts';

export default function RideInfoPanel() {
  const selectedRideId = useTrackStore((s) => s.selectedRideId);
  const rides = useTrackStore((s) => s.rides);
  const setSelectedRide = useTrackStore((s) => s.setSelectedRide);
  const renameRide = useTrackStore((s) => s.renameRide);
  const resumeBuilding = useTrackStore((s) => s.resumeBuilding);
  const reopenRide = useTrackStore((s) => s.reopenRide);
  const deleteRide = useTrackStore((s) => s.deleteRide);
  const setGameMode = useGameStore((s) => s.setGameMode);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  // ESC 키로 패널 닫기
  useEffect(() => {
    if (!selectedRideId) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedRide(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedRideId, setSelectedRide]);

  const handleEdit = useCallback(() => {
    if (!selectedRideId) return;
    const ride = rides[selectedRideId];
    if (!ride) return;
    setGameMode('track');
    if (ride.isComplete) {
      reopenRide(selectedRideId);
    } else {
      resumeBuilding(selectedRideId);
    }
  }, [selectedRideId, rides, setGameMode, resumeBuilding, reopenRide]);

  const handleDelete = useCallback(() => {
    if (!selectedRideId) return;
    deleteRide(selectedRideId);
    setSelectedRide(null);
  }, [selectedRideId, deleteRide, setSelectedRide]);

  const handleClose = useCallback(() => {
    setSelectedRide(null);
  }, [setSelectedRide]);

  if (!selectedRideId) return null;
  const ride = rides[selectedRideId];
  if (!ride) return null;

  const segmentCount = Object.keys(ride.segments).length - 1; // 정거장 세그먼트 제외
  const nodeCount = Object.keys(ride.nodes).length;

  const handleStartRename = () => {
    setEditName(ride.name);
    setIsEditing(true);
  };

  const handleConfirmRename = () => {
    const trimmed = editName.trim();
    if (trimmed.length > 0) {
      renameRide(selectedRideId, trimmed);
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
      handleCancelRename();
    }
  };

  return (
    <div className="pointer-events-auto absolute right-4 top-20 w-64">
      <div className="rounded-lg bg-black/70 p-4 text-white backdrop-blur-sm">
        {/* 헤더: 이름 + 닫기 */}
        <div className="mb-3 flex items-center justify-between">
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

        {/* 정보 */}
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
