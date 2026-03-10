/**
 * PresetBrowser.tsx — 프리셋 목록 드롭다운
 * TopBar에서 프리셋 아이콘 클릭 시 표시
 */

import { useEffect, useRef, useCallback } from 'react';
import usePresetStore from '../../store/usePresetStore.ts';
import useGameStore from '../../store/useGameStore.ts';
import { IconClose } from './icons/index.tsx';

interface PresetBrowserProps {
  onClose: () => void;
}

export default function PresetBrowser({ onClose }: PresetBrowserProps) {
  const presets = usePresetStore((s) => s.presets);
  const setActivePreset = usePresetStore((s) => s.setActivePreset);
  const deletePreset = usePresetStore((s) => s.deletePreset);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose]);

  const presetList = Object.values(presets);

  const handleSelectPreset = useCallback((presetId: string) => {
    setActivePreset(presetId);
    setGameMode('preset');
    onClose();
  }, [setActivePreset, setGameMode, onClose]);

  const handleDeletePreset = useCallback((e: React.MouseEvent, presetId: string) => {
    e.stopPropagation();
    deletePreset(presetId);
  }, [deletePreset]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-30 mt-1 w-64 overflow-hidden rounded-lg border border-slate-700/50 bg-slate-900/95 shadow-xl backdrop-blur-md"
    >
      <div className="max-h-80 overflow-y-auto">
        {presetList.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-slate-500">
            저장된 프리셋이 없습니다
          </div>
        ) : (
          presetList.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset.id)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-200 transition-colors hover:bg-slate-700/60"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                <span className="truncate">{preset.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-[10px] text-slate-500">
                  {preset.segmentCount}seg
                </span>
                <span
                  onClick={(e) => handleDeletePreset(e, preset.id)}
                  className="shrink-0 cursor-pointer rounded p-0.5 text-slate-500 hover:bg-red-500/20 hover:text-red-400"
                >
                  <IconClose className="h-3 w-3" />
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
