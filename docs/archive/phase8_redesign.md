# Phase 8: Track System Architecture Redesign

## Problem Analysis
The current system treats the track as a collection of `TrackSegment`s, with `TrackNode`s serving merely as shared coordinate points. This leads to:
1.  **Fragile Connectivity**: Connections are inferred by matching IDs, not explicit links.
2.  **Complex Traversal**: Determining "what comes next" requires searching all segments.
3.  **Editing Instability**: Deleting a segment breaks the implicit chain, making it hard to resume or detect loops.
4.  **Ambiguous State**: It's unclear which nodes are "open" for connection.

## Proposed Solution: Node-Centric Doubly Linked List
We will restructure the data model so that **Nodes** are the primary entities that define connectivity. Segments become the "edges" between nodes.

### 1. Data Structure Changes

#### `TrackNode` (The Anchor)
Nodes will explicitly know their neighbors.
```typescript
interface TrackNode {
    id: string
    position: [number, number, number]
    rotation: [number, number, number, number]
    tangent: [number, number, number]
    normal: [number, number, number]
    
    // Graph Connectivity
    nextSegmentId: string | null // The segment leaving this node
    prevSegmentId: string | null // The segment entering this node
    
    type: 'STATION_START' | 'STATION_END' | 'NORMAL' | 'BREAK'
}
```

#### `TrackSegment` (The Edge)
Segments define the geometry between two specific nodes.
```typescript
interface TrackSegmentData {
    id: string
    startNodeId: string
    endNodeId: string
    
    // Geometry
    controlPoints: [number, number, number][]
    length: number
    direction: TrackDirection
    slope: TrackSlope
}
```

### 2. Core Logic Redesign

#### Building (Extending)
When building from Active Node `A`:
1.  Create new Node `B`.
2.  Create Segment `S` connecting `A` -> `B`.
3.  **Link**: `A.nextSegmentId = S.id`
4.  **Link**: `B.prevSegmentId = S.id`
5.  Set Active Node = `B`.

#### Connecting (Closing Loop / Merging)
When connecting Active Node `A` to existing Node `T`:
1.  Validate: `A.nextSegmentId` must be null (A is a tail).
2.  Validate: `T.prevSegmentId` must be null (T is a head).
3.  Create Segment `S` connecting `A` -> `T`.
4.  **Link**: `A.nextSegmentId = S.id`
5.  **Link**: `T.prevSegmentId = S.id`
6.  **Loop Check**: Traverse from `T` to see if we reach `A` (or vice versa).

#### Deleting (Splitting)
When deleting Segment `S` (between `A` and `B`):
1.  **Unlink**: `A.nextSegmentId = null`
2.  **Unlink**: `B.prevSegmentId = null`
3.  Delete Segment `S`.
4.  `A` becomes an "Open Tail" (can build from here).
5.  `B` becomes an "Open Head" (can connect to here).

### 3. Implementation Steps

1.  **Refactor Interfaces**: Update `TrackNode` and `Ride` interfaces in `trackStore.ts`.
2.  **Migration/Reset**: Since this is a breaking change, we will likely need to reset the store or provide a migration (Reset is preferred for dev).
3.  **Rewrite `createRide`**: Initialize with a Station Start Node that has `nextSegmentId = null`.
4.  **Rewrite `commitPreview`**: Implement the "Building" logic above.
5.  **Rewrite `deleteSelectedSegment`**: Implement the "Deleting" logic above.
6.  **Rewrite `connectNodes`**: Implement the "Connecting" logic above.
7.  **Update `updatePreview`**: Use the explicit `activeNode` to calculate geometry.
8.  **Update `TrackEditor` UI**: 
    - Highlight "Open Tails" (Green) - clickable to resume building.
    - Highlight "Open Heads" (Blue) - clickable to connect to.

## Benefits
- **Robustness**: Impossible to create invalid connections if logic is followed.
- **Simplicity**: "Is this a loop?" becomes a simple linked-list traversal.
- **Flexibility**: Editing just means breaking and re-linking chains.
