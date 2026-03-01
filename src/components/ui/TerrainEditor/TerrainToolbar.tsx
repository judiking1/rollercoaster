/**
 * TerrainToolbar.tsx — 지형 편집 도구 UI
 * 하단 중앙 고정, terrain 모드에서만 표시
 *
 * 도구:
 * - 편집(sculpt): 클릭 후 마우스 위로 드래그 = 올리기, 아래로 = 내리기
 * - 평탄화(flatten): 클릭하면 영역을 평균 높이로 맞춤
 */

import { useCallback } from 'react';
import type { TerrainTool } from '../../../core/types/index.ts';
import { MIN_BRUSH_SIZE, MAX_BRUSH_SIZE } from '../../../core/constants/index.ts';
import useGameStore from '../../../store/useGameStore.ts';
import useTerrainStore from '../../../store/useTerrainStore.ts';

const TOOLS: { tool: TerrainTool; label: string; icon: string; desc: string }[] = [
  { tool: 'sculpt', label: '편집', icon: '⛰', desc: '드래그: ↑올리기 ↓내리기' },
  { tool: 'flatten', label: '평탄화', icon: '═', desc: '클릭: 평균 높이로 맞춤' },
];

export default function TerrainToolbar() {
  const gameMode = useGameStore((s) => s.gameMode);
  const brush = useTerrainStore((s) => s.brush);
  const setBrushTool = useTerrainStore((s) => s.setBrushTool);
  const setBrushSize = useTerrainStore((s) => s.setBrushSize);
  const undoStackLength = useTerrainStore((s) => s.undoStack.length);
  const redoStackLength = useTerrainStore((s) => s.redoStack.length);

  const handleUndo = useCallback(() => {
    useTerrainStore.getState().undo();
  }, []);

  const handleRedo = useCallback(() => {
    useTerrainStore.getState().redo();
  }, []);

  const handleSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBrushSize(Number(e.target.value));
  }, [setBrushSize]);

  if (gameMode !== 'terrain') return null;

  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2">
      <div className="pointer-events-auto flex flex-col items-center gap-2">
        {/* 도구 힌트 */}
        <div className="rounded-lg bg-black/50 px-3 py-1 text-xs text-slate-300">
          {brush.tool === 'sculpt'
            ? '좌클릭 후 마우스 ↑올리기 ↓내리기 · 우클릭: 회전 · WASD: 이동'
            : '좌클릭: 영역 평탄화 · 우클릭: 회전 · WASD: 이동'}
        </div>

        {/* 메인 툴바 */}
        <div className="flex items-center gap-2 rounded-xl bg-black/60 px-4 py-3 backdrop-blur-sm">
          {/* 도구 버튼 */}
          {TOOLS.map(({ tool, label, icon, desc }) => (
            <button
              key={tool}
              onClick={() => setBrushTool(tool)}
              title={`${label} (${desc})`}
              className={`flex h-10 min-w-10 items-center justify-center gap-1 rounded-lg px-3 text-sm font-bold transition ${
                brush.tool === tool
                  ? 'bg-amber-500 text-black'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
            >
              <span className="text-lg">{icon}</span>
              <span>{label}</span>
            </button>
          ))}

          {/* 구분선 */}
          <div className="mx-1 h-8 w-px bg-slate-500" />

          {/* 브러시 크기 슬라이더 */}
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] text-slate-400">크기</span>
            <input
              type="range"
              min={MIN_BRUSH_SIZE}
              max={MAX_BRUSH_SIZE}
              step={1}
              value={brush.size}
              onChange={handleSizeChange}
              className="h-1.5 w-20 cursor-pointer accent-amber-500"
            />
            <span className="text-[10px] text-slate-300">{brush.size}x{brush.size}</span>
          </div>

          {/* 구분선 */}
          <div className="mx-1 h-8 w-px bg-slate-500" />

          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={undoStackLength === 0}
            title="되돌리기 (Ctrl+Z)"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-lg text-white transition hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-slate-700"
          >
            ↩
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStackLength === 0}
            title="다시 실행 (Ctrl+Y)"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-lg text-white transition hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-slate-700"
          >
            ↪
          </button>
        </div>
      </div>
    </div>
  );
}
