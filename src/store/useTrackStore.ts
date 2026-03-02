/**
 * useTrackStore.ts — 트랙 시스템 상태 관리
 * Node-Segment 그래프 기반 놀이기구/트랙 CRUD
 */

import { create } from 'zustand';
import type {
  Ride,
  RideData,
  Station,
  TrackNode,
  TrackSegment,
  SegmentType,
  SpecialType,
  TrackBuilderMode,
} from '../core/types/index.ts';
import {
  calculateNextPosition,
  createStationNodes,
  createStationSegment,
  checkCollision,
  checkClearanceViolation,
  distance3D,
} from '../core/systems/TrackSystem.ts';
import {
  COLLISION_MIN_DISTANCE,
  MAX_SEGMENTS_PER_RIDE,
  SNAP_RADIUS,
  TRACK_CLEARANCE_RADIUS,
} from '../core/constants/index.ts';

/** 패널 위치 (화면 좌표) */
interface PanelPosition {
  x: number;
  y: number;
}

interface TrackStoreState {
  rides: Record<string, Ride>;
  activeRideId: string | null;
  /** 하이라이트된 라이드 (트랙 색상 강조) */
  selectedRideId: string | null;
  /** 정보 패널이 열린 라이드별 화면 위치 */
  openPanels: Record<string, PanelPosition>;
  builderMode: TrackBuilderMode;
  selectedSegmentType: SegmentType;
  selectedSpecialType: SpecialType;
  rideCounter: number;
}

interface TrackStoreActions {
  // 빌더 모드
  setBuilderMode: (mode: TrackBuilderMode) => void;
  setSelectedSegmentType: (type: SegmentType) => void;
  setSelectedSpecialType: (type: SpecialType) => void;

  // 라이드 관리
  createRide: (station: Station) => string;
  deleteRide: (rideId: string) => void;
  setActiveRide: (rideId: string | null) => void;
  setSelectedRide: (rideId: string | null) => void;
  /** 패널 열기 (이미 열려있으면 무시) */
  openPanel: (rideId: string) => void;
  /** 패널 닫기 */
  closePanel: (rideId: string) => void;
  /** 모든 패널 닫기 */
  closeAllPanels: () => void;
  /** 패널 위치 업데이트 (드래그 후) */
  setPanelPosition: (rideId: string, x: number, y: number) => void;
  renameRide: (rideId: string, name: string) => void;
  resumeBuilding: (rideId: string) => void;
  reopenRide: (rideId: string) => void;

  // 트랙 건설
  addSegment: (rideId: string) => boolean;
  removeLastSegment: (rideId: string) => void;

  // 맵 데이터에서 복원
  loadRides: (rideDataList: RideData[]) => void;

  // 초기화
  resetTrackStore: () => void;
}

const initialState: TrackStoreState = {
  rides: {},
  activeRideId: null,
  selectedRideId: null,
  openPanels: {},
  builderMode: 'idle',
  selectedSegmentType: 'straight',
  selectedSpecialType: 'normal',
  rideCounter: 0,
};

const useTrackStore = create<TrackStoreState & TrackStoreActions>()((set, get) => ({
  ...initialState,

  // ─── 빌더 모드 ────────────────────────────────────────

  setBuilderMode: (mode) => set({ builderMode: mode }),
  setSelectedSegmentType: (type) => set({ selectedSegmentType: type }),
  setSelectedSpecialType: (type) => set({ selectedSpecialType: type }),

  // ─── 라이드 관리 ──────────────────────────────────────

  createRide: (station) => {
    const s = get();
    const rideNum = s.rideCounter + 1;
    const rideId = `ride-${rideNum}`;

    // 정거장 노드 생성
    const { startNode, endNode, nextCounter } = createStationNodes(station, rideId, 0);

    // 정거장 세그먼트 생성
    const stationSeg = createStationSegment(
      rideId, 0, startNode.id, endNode.id, station.length,
    );

    // 링크 설정
    startNode.nextSegmentId = stationSeg.id;
    endNode.prevSegmentId = stationSeg.id;

    const ride: Ride = {
      id: rideId,
      name: `코스터 ${rideNum}`,
      rideType: 'steel_coaster',
      station,
      nodes: {
        [startNode.id]: startNode,
        [endNode.id]: endNode,
      },
      segments: {
        [stationSeg.id]: stationSeg,
      },
      headNodeId: endNode.id,
      counters: { node: nextCounter, segment: 1 },
      isComplete: false,
    };

    set({
      rides: { ...s.rides, [rideId]: ride },
      activeRideId: rideId,
      rideCounter: rideNum,
      builderMode: 'building',
    });

    return rideId;
  },

  deleteRide: (rideId) => set((s) => {
    const newRides = { ...s.rides };
    delete newRides[rideId];
    const newPanels = { ...s.openPanels };
    delete newPanels[rideId];
    return {
      rides: newRides,
      activeRideId: s.activeRideId === rideId ? null : s.activeRideId,
      selectedRideId: s.selectedRideId === rideId ? null : s.selectedRideId,
      openPanels: newPanels,
      builderMode: s.activeRideId === rideId ? 'idle' : s.builderMode,
    };
  }),

  setActiveRide: (rideId) => set({ activeRideId: rideId }),

  setSelectedRide: (rideId) => set({ selectedRideId: rideId }),

  openPanel: (rideId) => set((s) => {
    if (s.openPanels[rideId]) return s;
    // 캐스케이드 배치: 기존 패널 수에 따라 위치 계산
    const panelCount = Object.keys(s.openPanels).length;
    const slot = panelCount % 5;
    const x = 16 + slot * 30;
    const y = 80 + slot * 40;
    return { openPanels: { ...s.openPanels, [rideId]: { x, y } } };
  }),

  closePanel: (rideId) => set((s) => {
    const newPanels = { ...s.openPanels };
    delete newPanels[rideId];
    return {
      openPanels: newPanels,
      selectedRideId: s.selectedRideId === rideId ? null : s.selectedRideId,
    };
  }),

  closeAllPanels: () => set({ openPanels: {}, selectedRideId: null }),

  setPanelPosition: (rideId, x, y) => set((s) => {
    if (!s.openPanels[rideId]) return s;
    return { openPanels: { ...s.openPanels, [rideId]: { x, y } } };
  }),

  renameRide: (rideId, name) => set((s) => {
    const ride = s.rides[rideId];
    if (!ride) return s;
    return {
      rides: { ...s.rides, [rideId]: { ...ride, name } },
    };
  }),

  resumeBuilding: (rideId) => {
    const s = get();
    const ride = s.rides[rideId];
    if (!ride || ride.isComplete) return;
    const newPanels = { ...s.openPanels };
    delete newPanels[rideId];
    set({
      activeRideId: rideId,
      selectedRideId: null,
      openPanels: newPanels,
      builderMode: 'building',
    });
  },

  reopenRide: (rideId) => {
    const s = get();
    const ride = s.rides[rideId];
    if (!ride || !ride.isComplete) return;

    // 폐쇄 세그먼트 찾기: station_start 노드의 prevSegmentId
    const stationStartNode = Object.values(ride.nodes).find((n) => n.type === 'station_start');
    if (!stationStartNode || !stationStartNode.prevSegmentId) return;

    const closeSegId = stationStartNode.prevSegmentId;
    const closeSeg = ride.segments[closeSegId];
    if (!closeSeg) return;

    // 폐쇄 세그먼트의 시작 노드가 새로운 headNode
    const newHeadNodeId = closeSeg.startNodeId;
    const headNode = ride.nodes[newHeadNodeId];
    if (!headNode) return;

    // 노드 링크 해제
    const updatedStartNode: TrackNode = { ...stationStartNode, prevSegmentId: null };
    const updatedHeadNode: TrackNode = { ...headNode, nextSegmentId: null };

    // 폐쇄 세그먼트 삭제
    const newSegments = { ...ride.segments };
    delete newSegments[closeSegId];

    const updatedRide: Ride = {
      ...ride,
      nodes: {
        ...ride.nodes,
        [stationStartNode.id]: updatedStartNode,
        [newHeadNodeId]: updatedHeadNode,
      },
      segments: newSegments,
      headNodeId: newHeadNodeId,
      isComplete: false,
    };

    const newPanels = { ...s.openPanels };
    delete newPanels[rideId];
    set({
      rides: { ...s.rides, [rideId]: updatedRide },
      activeRideId: rideId,
      selectedRideId: null,
      openPanels: newPanels,
      builderMode: 'building',
    });
  },

  // ─── 트랙 건설 ────────────────────────────────────────

  addSegment: (rideId) => {
    const s = get();
    const ride = s.rides[rideId];
    if (!ride || ride.isComplete) return false;

    // 세그먼트 수 제한
    const segCount = Object.keys(ride.segments).length;
    if (segCount >= MAX_SEGMENTS_PER_RIDE) return false;

    const headNode = ride.nodes[ride.headNodeId];
    if (!headNode) return false;

    // 다음 위치 계산
    const segType = s.selectedSegmentType;
    const { position: nextPos, direction: nextDir } = calculateNextPosition(
      headNode.position, headNode.direction, segType,
    );

    // station_start 노드 찾기 (폐쇄 루프 스냅 판정)
    const stationStartNode = Object.values(ride.nodes).find((n) => n.type === 'station_start');

    // 스냅 판정: 다음 위치가 station_start 근처이면 폐쇄 루프 생성
    if (stationStartNode && distance3D(nextPos, stationStartNode.position) < SNAP_RADIUS) {
      const segId = `${rideId}-seg-${ride.counters.segment}`;

      const closeSeg: TrackSegment = {
        id: segId,
        type: segType,
        specialType: s.selectedSpecialType,
        startNodeId: headNode.id,
        endNodeId: stationStartNode.id,
        length: 0,
      };

      // headNode → 세그먼트 → stationStart 링크
      const updatedHeadNode: TrackNode = { ...headNode, nextSegmentId: segId };
      const updatedStartNode: TrackNode = { ...stationStartNode, prevSegmentId: segId };

      const updatedRide: Ride = {
        ...ride,
        nodes: {
          ...ride.nodes,
          [headNode.id]: updatedHeadNode,
          [stationStartNode.id]: updatedStartNode,
        },
        segments: {
          ...ride.segments,
          [segId]: closeSeg,
        },
        headNodeId: stationStartNode.id,
        counters: { ...ride.counters, segment: ride.counters.segment + 1 },
        isComplete: true,
      };

      set({
        rides: { ...s.rides, [rideId]: updatedRide },
        builderMode: 'idle',
      });

      return true;
    }

    // 일반 충돌 검사 (headNode + stationStart 제외)
    const excludeIds = [headNode.id];
    if (stationStartNode) excludeIds.push(stationStartNode.id);

    // 다른 라이드 노드와의 충돌도 검사
    const allOtherNodes: Record<string, TrackNode> = {};
    for (const [rid, r] of Object.entries(s.rides)) {
      if (rid === rideId) continue;
      for (const [nid, node] of Object.entries(r.nodes)) {
        allOtherNodes[nid] = node;
      }
    }

    if (checkCollision(nextPos, ride.nodes, excludeIds, COLLISION_MIN_DISTANCE)) {
      return false;
    }
    if (checkCollision(nextPos, allOtherNodes, [], COLLISION_MIN_DISTANCE)) {
      return false;
    }

    // 클리어런스 검사: 새 세그먼트가 기존 세그먼트와 너무 가까운지 확인
    const existingSegs: Array<{ startPos: { x: number; y: number; z: number }; endPos: { x: number; y: number; z: number } }> = [];
    // 현재 라이드의 기존 세그먼트 (headNode와 연결된 세그먼트는 제외 — 당연히 인접함)
    for (const seg of Object.values(ride.segments)) {
      if (seg.endNodeId === headNode.id || seg.startNodeId === headNode.id) continue;
      const sn = ride.nodes[seg.startNodeId];
      const en = ride.nodes[seg.endNodeId];
      if (sn && en) existingSegs.push({ startPos: sn.position, endPos: en.position });
    }
    // 다른 라이드의 세그먼트
    for (const [rid, r] of Object.entries(s.rides)) {
      if (rid === rideId) continue;
      for (const seg of Object.values(r.segments)) {
        const sn = r.nodes[seg.startNodeId];
        const en = r.nodes[seg.endNodeId];
        if (sn && en) existingSegs.push({ startPos: sn.position, endPos: en.position });
      }
    }
    if (checkClearanceViolation(headNode.position, nextPos, existingSegs, TRACK_CLEARANCE_RADIUS)) {
      return false;
    }

    // 새 노드 생성
    const nodeId = `${rideId}-node-${ride.counters.node}`;
    const segId = `${rideId}-seg-${ride.counters.segment}`;

    const newNode: TrackNode = {
      id: nodeId,
      position: nextPos,
      direction: nextDir,
      type: 'normal',
      nextSegmentId: null,
      prevSegmentId: segId,
    };

    const newSeg: TrackSegment = {
      id: segId,
      type: segType,
      specialType: s.selectedSpecialType,
      startNodeId: headNode.id,
      endNodeId: nodeId,
      length: 0,
    };

    const updatedHeadNode: TrackNode = { ...headNode, nextSegmentId: segId };

    const updatedRide: Ride = {
      ...ride,
      nodes: {
        ...ride.nodes,
        [headNode.id]: updatedHeadNode,
        [nodeId]: newNode,
      },
      segments: {
        ...ride.segments,
        [segId]: newSeg,
      },
      headNodeId: nodeId,
      counters: {
        node: ride.counters.node + 1,
        segment: ride.counters.segment + 1,
      },
    };

    set({
      rides: { ...s.rides, [rideId]: updatedRide },
    });

    return true;
  },

  removeLastSegment: (rideId) => {
    const s = get();
    const ride = s.rides[rideId];
    if (!ride) return;

    const headNode = ride.nodes[ride.headNodeId];
    if (!headNode || !headNode.prevSegmentId) return;

    // station_end 노드는 삭제 불가
    if (headNode.type === 'station_end') return;

    const lastSeg = ride.segments[headNode.prevSegmentId];
    if (!lastSeg) return;

    const prevNode = ride.nodes[lastSeg.startNodeId];
    if (!prevNode) return;

    // 이전 노드의 nextSegmentId 해제
    const updatedPrevNode: TrackNode = {
      ...prevNode,
      nextSegmentId: null,
    };

    // headNode, lastSeg 삭제
    const newNodes = { ...ride.nodes };
    delete newNodes[headNode.id];
    newNodes[prevNode.id] = updatedPrevNode;

    const newSegments = { ...ride.segments };
    delete newSegments[lastSeg.id];

    const updatedRide: Ride = {
      ...ride,
      nodes: newNodes,
      segments: newSegments,
      headNodeId: prevNode.id,
    };

    set({
      rides: { ...s.rides, [rideId]: updatedRide },
    });
  },

  // ─── 맵 데이터에서 복원 ────────────────────────────────

  loadRides: (rideDataList) => {
    if (rideDataList.length === 0) return;

    const rides: Record<string, Ride> = {};
    let maxCounter = 0;

    for (const rd of rideDataList) {
      // RideData → Ride 변환 (타입 캐스팅: JSON에서 복원된 데이터)
      const ride: Ride = {
        id: rd.id,
        name: rd.name,
        rideType: rd.rideType,
        station: rd.station as Station,
        nodes: rd.nodes as Record<string, TrackNode>,
        segments: rd.segments as Record<string, TrackSegment>,
        headNodeId: rd.headNodeId,
        counters: rd.counters,
        isComplete: rd.isComplete,
      };
      rides[rd.id] = ride;

      // ride counter 복원 (ride-N에서 N 추출)
      const match = rd.id.match(/^ride-(\d+)$/);
      if (match) {
        maxCounter = Math.max(maxCounter, parseInt(match[1], 10));
      }
    }

    set({ rides, rideCounter: maxCounter });
  },

  // ─── 초기화 ───────────────────────────────────────────

  resetTrackStore: () => set(initialState),
}));

export default useTrackStore;
