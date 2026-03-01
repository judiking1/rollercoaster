/**
 * MapBrowser.tsx — 맵 브라우저 UI
 * 새 맵 만들기 + 저장된 맵 목록 관리 (열기/이름변경/삭제)
 */

import { useState, useEffect } from 'react';
import useGameStore from '../../store/useGameStore.ts';
import useMapStore from '../../store/useMapStore.ts';
import type { MapSizePreset } from '../../core/types/index.ts';
import { MAP_SIZE_PRESETS } from '../../core/constants/index.ts';

const SIZE_LABELS: Record<MapSizePreset, string> = {
  S: '소형 (32×32)',
  M: '중형 (64×64)',
  L: '대형 (128×128)',
};

export default function MapBrowser() {
  const setScene = useGameStore((s) => s.setScene);
  const {
    savedMaps,
    loadSavedMapList,
    createMap,
    loadMap,
    deleteMap,
    renameMap,
  } = useMapStore();

  // 새 맵 폼 상태
  const [newMapName, setNewMapName] = useState('내 놀이공원');
  const [newMapSize, setNewMapSize] = useState<MapSizePreset>('M');

  // 인라인 이름 변경 상태
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // 삭제 확인 상태
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 마운트 시 목록 로드
  useEffect(() => {
    loadSavedMapList();
  }, [loadSavedMapList]);

  const handleCreate = () => {
    const trimmed = newMapName.trim();
    if (!trimmed) return;
    createMap(trimmed, newMapSize);
    setScene('game');
  };

  const handleOpen = (id: string) => {
    const success = loadMap(id);
    if (success) {
      setScene('game');
    }
  };

  const handleRenameStart = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const handleRenameConfirm = () => {
    if (renamingId && renameValue.trim()) {
      renameMap(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleRenameCancel = () => {
    setRenamingId(null);
  };

  const handleDeleteConfirm = (id: string) => {
    deleteMap(id);
    setDeletingId(null);
  };

  const sizePresetKeys = Object.keys(MAP_SIZE_PRESETS) as MapSizePreset[];

  return (
    <div className="flex h-full w-full bg-gradient-to-br from-slate-800 via-slate-900 to-gray-900">
      {/* 헤더 */}
      <div className="flex h-full w-full flex-col">
        <div className="flex items-center justify-between border-b border-slate-700 px-8 py-4">
          <h1 className="text-2xl font-bold text-white">맵 선택</h1>
          <button
            onClick={() => setScene('mainMenu')}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-gray-300 transition hover:bg-slate-600"
          >
            뒤로가기
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 좌측: 새 맵 만들기 */}
          <div className="flex w-80 shrink-0 flex-col gap-6 border-r border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-sky-300">새 맵 만들기</h2>

            {/* 이름 입력 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400">맵 이름</label>
              <input
                type="text"
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                maxLength={30}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white outline-none focus:border-sky-400"
              />
            </div>

            {/* 크기 선택 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400">맵 크기</label>
              <div className="flex flex-col gap-2">
                {sizePresetKeys.map((key) => (
                  <button
                    key={key}
                    onClick={() => setNewMapSize(key)}
                    className={`rounded-lg px-4 py-2 text-left text-sm font-medium transition ${
                      newMapSize === key
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    {SIZE_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>

            {/* 생성 버튼 */}
            <button
              onClick={handleCreate}
              disabled={!newMapName.trim()}
              className="rounded-xl bg-emerald-500 px-6 py-3 text-lg font-bold text-white shadow-lg transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              맵 생성
            </button>
          </div>

          {/* 우측: 저장된 맵 목록 */}
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-sky-300">저장된 맵</h2>

            {savedMaps.length === 0 ? (
              <p className="mt-8 text-center text-gray-500">
                저장된 맵이 없습니다. 새 맵을 만들어보세요!
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {savedMaps.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3 transition hover:bg-slate-750"
                  >
                    {/* 이름 (인라인 수정) */}
                    <div className="flex-1 pr-4">
                      {renamingId === entry.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameConfirm();
                            if (e.key === 'Escape') handleRenameCancel();
                          }}
                          onBlur={handleRenameConfirm}
                          maxLength={30}
                          className="w-full rounded border border-sky-400 bg-slate-700 px-2 py-1 text-white outline-none"
                        />
                      ) : (
                        <div>
                          <p className="font-medium text-white">{entry.name}</p>
                          <p className="text-xs text-gray-500">
                            {entry.gridSize.x}×{entry.gridSize.z} · 수정:
                            {' '}{new Date(entry.updatedAt).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex gap-2">
                      {deletingId === entry.id ? (
                        <>
                          <button
                            onClick={() => handleDeleteConfirm(entry.id)}
                            className="rounded bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-500"
                          >
                            확인
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="rounded bg-slate-600 px-3 py-1 text-xs text-gray-300 hover:bg-slate-500"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleOpen(entry.id)}
                            className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500"
                          >
                            열기
                          </button>
                          <button
                            onClick={() => handleRenameStart(entry.id, entry.name)}
                            className="rounded bg-slate-600 px-3 py-1 text-xs text-gray-300 hover:bg-slate-500"
                          >
                            이름변경
                          </button>
                          <button
                            onClick={() => setDeletingId(entry.id)}
                            className="rounded bg-slate-600 px-3 py-1 text-xs text-red-400 hover:bg-red-700 hover:text-white"
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
