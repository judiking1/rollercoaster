/**
 * index.ts — 타입 통합 re-export
 */

export type {
  Vector3Data,
  GridPosition,
  GridSize,
  MapSizePreset,
  MapMeta,
  MapSettings,
  MapFile,
  RideData,
  SceneType,
  GameMode,
} from './common.ts';

export type {
  TerrainTool,
  TerrainState,
  TerrainBrush,
  SubSelectionMode,
  SubSelection,
} from './terrain.ts';

export type {
  SegmentType,
  SpecialType,
  TrackNodeType,
  TrackNode,
  TrackSegment,
  Station,
  RideCounters,
  Ride,
  TrackBuilderMode,
  TrackPreviewData,
} from './track.ts';
export { SEGMENT_TYPES, SPECIAL_TYPES } from './track.ts';

export type {
  RideCategory,
  RideDefinition,
  RideStats,
  VehicleConfig,
} from './ride.ts';

export type {
  SimulationSpeed,
  SimulationState,
  Guest,
} from './simulation.ts';

export type {
  FinanceState,
  TransactionType,
  Transaction,
} from './finance.ts';
