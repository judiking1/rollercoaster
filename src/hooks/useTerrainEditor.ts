/**
 * useTerrainEditor.ts — 지형 편집 인터랙션 훅 (RCT 스타일)
 *
 * sculpt 도구: 클릭 후 마우스를 위로 드래그하면 올리기, 아래로 드래그하면 내리기
 * flatten 도구: 클릭하면 영역을 평균 높이로 맞춤
 *
 * 서브 셀렉션:
 * - 마우스가 격자 꼭지점 근처 → corner 모드 (단일 정점만 편집)
 * - 마우스가 면 중앙 → full 모드 (브러시 영역 전체 편집)
 *
 * flatten 도구는 항상 full 모드로 동작
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { GridPosition, SubSelection } from '../core/types/index.ts';
import useTerrainStore from '../store/useTerrainStore.ts';
import useGameStore from '../store/useGameStore.ts';
import {
  worldToCell,
  detectSubSelection,
  adjustHeightGrid,
  adjustSingleVertex,
  flattenAreaGrid,
  getCellAverageHeight,
} from '../core/systems/TerrainSystem.ts';
import { GRID_UNIT, SCULPT_DRAG_THRESHOLD } from '../core/constants/index.ts';

/** 비어있는 서브 셀렉션 (초기값) */
const EMPTY_SUB_SELECTION: SubSelection = {
  mode: 'full',
  cornerVertex: null,
  highlightCells: [],
  affectedVertices: [],
  hintHeight: 0,
  hintPosition: { x: 0, y: 0, z: 0 },
};

export default function useTerrainEditor() {
  const [cursorCell, setCursorCell] = useState<GridPosition | null>(null);
  const [subSelection, setSubSelection] = useState<SubSelection>(EMPTY_SUB_SELECTION);

  // 드래그 상태 refs (리렌더 방지)
  const isEditing = useRef(false);
  /** 드래그 시작 시 화면 Y 좌표 */
  const startClientY = useRef(0);
  /** 마지막으로 적용된 ratchet 단계 (0이면 아직 적용 안 함) */
  const lastRatchetStep = useRef(0);
  /** pointerDown 시 잠긴 셀 + 서브 셀렉션 (드래그 중 변하지 않음) */
  const lockedCell = useRef<GridPosition | null>(null);
  const lockedSub = useRef<SubSelection>(EMPTY_SUB_SELECTION);

  const gameMode = useGameStore((s) => s.gameMode);
  const brush = useTerrainStore((s) => s.brush);
  const setBrushTool = useTerrainStore((s) => s.setBrushTool);
  const setBrushSize = useTerrainStore((s) => s.setBrushSize);

  /** 잠긴 서브 셀렉션의 hintHeight를 현재 heightMap 기준으로 갱신 */
  const updateHintFromHeightMap = useCallback((cell: GridPosition, sub: SubSelection) => {
    const { heightMap, gridSize } = useTerrainStore.getState();

    let newHeight: number;
    if (sub.mode === 'corner' && sub.cornerVertex) {
      const idx = sub.cornerVertex.z * (gridSize.x + 1) + sub.cornerVertex.x;
      newHeight = heightMap[idx] ?? 0;
    } else {
      newHeight = getCellAverageHeight(heightMap, cell.x, cell.z, gridSize);
    }

    setSubSelection({
      ...sub,
      hintHeight: newHeight,
      hintPosition: { ...sub.hintPosition, y: newHeight + 1.5 },
    });
  }, []);

  /** sculpt 도구: 방향에 따라 높이 변경 */
  const applySculpt = useCallback((cell: GridPosition, sub: SubSelection, direction: 1 | -1) => {
    const { heightMap, gridSize, setHeightMap } = useTerrainStore.getState();

    let newMap: number[];
    if (sub.mode === 'corner' && sub.cornerVertex) {
      newMap = adjustSingleVertex(heightMap, sub.cornerVertex, direction, gridSize);
    } else {
      newMap = adjustHeightGrid(heightMap, cell.x, cell.z, useTerrainStore.getState().brush.size, direction, gridSize);
    }
    setHeightMap(newMap);
  }, []);

  /** flatten 도구: 평균 높이로 맞춤 */
  const applyFlatten = useCallback((cell: GridPosition) => {
    const { heightMap, gridSize, brush: b, setHeightMap } = useTerrainStore.getState();
    const newMap = flattenAreaGrid(heightMap, cell.x, cell.z, b.size, gridSize);
    setHeightMap(newMap);
  }, []);

  /** 월드 좌표로부터 셀 + 서브 셀렉션 동시 계산 */
  const computeSelection = useCallback((worldX: number, worldZ: number) => {
    const { heightMap, gridSize, brush: b } = useTerrainStore.getState();
    const cell = worldToCell(worldX, worldZ, gridSize, GRID_UNIT);

    // flatten 도구는 항상 full 모드
    const forceFullMode = b.tool === 'flatten';

    let sub: SubSelection;
    if (forceFullMode) {
      sub = detectSubSelection(
        (cell.x + 0.5) * GRID_UNIT,
        (cell.z + 0.5) * GRID_UNIT,
        cell, b.size, heightMap, gridSize, GRID_UNIT,
      );
    } else {
      sub = detectSubSelection(
        worldX, worldZ,
        cell, b.size, heightMap, gridSize, GRID_UNIT,
      );
    }

    return { cell, sub };
  }, []);

  /** 드래그 중 window-level pointermove 핸들러 */
  const handleWindowPointerMove = useCallback((e: PointerEvent) => {
    if (!isEditing.current || !lockedCell.current) return;

    const { tool } = useTerrainStore.getState().brush;
    if (tool !== 'sculpt') return;

    // 화면 Y 변화량 계산 (위로 드래그 = 음수 clientY = 양수 delta)
    const deltaY = startClientY.current - e.clientY;
    const currentStep = Math.trunc(deltaY / SCULPT_DRAG_THRESHOLD);

    // ratchet: 새 단계에 도달했을 때만 적용
    if (currentStep !== lastRatchetStep.current) {
      const stepDiff = currentStep - lastRatchetStep.current;
      const direction: 1 | -1 = stepDiff > 0 ? 1 : -1;

      // 여러 단계를 한번에 건너뛸 수 있으므로 각 단계별로 적용
      const stepsToApply = Math.abs(stepDiff);
      for (let i = 0; i < stepsToApply; i++) {
        applySculpt(lockedCell.current!, lockedSub.current, direction);
      }

      lastRatchetStep.current = currentStep;

      // 높이 변경 후 hint 실시간 갱신
      updateHintFromHeightMap(lockedCell.current!, lockedSub.current);
    }
  }, [applySculpt, updateHintFromHeightMap]);

  /** 드래그 종료 window-level 핸들러 */
  const handleWindowPointerUp = useCallback(() => {
    isEditing.current = false;
    lockedCell.current = null;
    lockedSub.current = EMPTY_SUB_SELECTION;
  }, []);

  // window 레벨 이벤트 리스너 등록/해제
  useEffect(() => {
    if (gameMode !== 'terrain') return;

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [gameMode, handleWindowPointerMove, handleWindowPointerUp]);

  /** R3F 메쉬 위 포인터 이동 — 호버 프리뷰 업데이트 */
  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (gameMode !== 'terrain') return;
    // 드래그 중에는 호버 프리뷰를 고정 (잠긴 셀렉션 사용)
    if (isEditing.current) return;

    const { cell, sub } = computeSelection(e.point.x, e.point.z);
    setCursorCell(cell);
    setSubSelection(sub);
  }, [gameMode, computeSelection]);

  /** R3F 메쉬 위 포인터 다운 — 편집 시작 */
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (gameMode !== 'terrain') return;
    if (e.button !== 0) return;

    e.stopPropagation();

    const { tool } = useTerrainStore.getState().brush;
    const { cell, sub } = computeSelection(e.point.x, e.point.z);

    // Undo 스냅샷 (드래그 전체가 하나의 undo 단위)
    useTerrainStore.getState().pushUndoSnapshot();

    if (tool === 'flatten') {
      // flatten은 클릭 한번으로 즉시 적용
      applyFlatten(cell);
    } else {
      // sculpt: 드래그 시작, 잠금 상태 설정
      isEditing.current = true;
      startClientY.current = e.nativeEvent.clientY;
      lastRatchetStep.current = 0;
      lockedCell.current = cell;
      lockedSub.current = sub;
    }
  }, [gameMode, computeSelection, applyFlatten]);

  /** R3F 메쉬 위 포인터 업 */
  const handlePointerUp = useCallback(() => {
    isEditing.current = false;
    lockedCell.current = null;
    lockedSub.current = EMPTY_SUB_SELECTION;
  }, []);

  /** R3F 메쉬에서 포인터 이탈 */
  const handlePointerLeave = useCallback(() => {
    if (!isEditing.current) {
      setCursorCell(null);
      setSubSelection(EMPTY_SUB_SELECTION);
    }
  }, []);

  const undo = useCallback(() => {
    useTerrainStore.getState().undo();
  }, []);

  const redo = useCallback(() => {
    useTerrainStore.getState().redo();
  }, []);

  const canUndo = useTerrainStore((s) => s.undoStack.length > 0);
  const canRedo = useTerrainStore((s) => s.redoStack.length > 0);

  return {
    cursorCell,
    subSelection,
    handlePointerMove,
    handlePointerDown,
    handlePointerUp,
    handlePointerLeave,
    brush,
    setBrushTool,
    setBrushSize,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
