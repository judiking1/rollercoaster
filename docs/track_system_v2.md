# Track System V2: Robust Graph Architecture

## Goal
Completely replace the existing fragile track logic with a robust, graph-based system that guarantees data integrity. This addresses the "0m residual rail", "overlap errors", and "ghost nodes" by enforcing strict rules at the data structure level.

## 1. Core Data Structure (Strict Graph)

The system is a **Directed Graph** where:
- **Nodes** are the primary entities (Points in space).
- **Segments** are the edges (Curves between nodes).

### Types
```typescript
interface TrackNode {
    id: string
    position: [number, number, number]
    rotation: [number, number, number, number] // Quaternion
    tangent: [number, number, number] // Forward vector
    
    // Connectivity (Strictly Enforced)
    // A node can have AT MOST one outgoing and one incoming segment
    outgoingSegmentId: string | null 
    incomingSegmentId: string | null
    
    type: 'STATION_START' | 'STATION_END' | 'NORMAL'
}

interface TrackSegment {
    id: string
    startNodeId: string
    endNodeId: string
    
    // Geometry
    controlPoints: [number, number, number][]
    length: number
    direction: 'STRAIGHT' | 'LEFT' | 'RIGHT'
    slope: 'FLAT' | 'UP' | 'DOWN'
}

interface Ride {
    id: string
    nodes: Record<string, TrackNode>
    segments: Record<string, TrackSegment> // Changed from Array to Record for O(1) lookup
    headNodeId: string | null // The "Cursor" node we are building from
}
```

## 2. The "Snap-First" Preview System (The Fix for Overlap Errors)

The root cause of overlap errors during loop closure is that the system "guesses" where the track goes, and then checks for collisions. 
**V2 Logic:**
1. **Calculate Ideal Path:** Calculate where the track *would* go based on direction/slope.
2. **Scan for Snap Targets:** Look for any "Open Head" (node with no `incomingSegmentId`) within `SNAP_RADIUS` (e.g., 10m) of the ideal end point.
3. **Force Snap:** If a target is found:
    - **Override Geometry:** Recalculate the Bezier curve to end *exactly* at the target node's position and align with its tangent (if possible) or smooth the connection.
    - **Disable Collision:** Explicitly disable collision checks against the target node's neighbors.
    - **Visual Feedback:** Show a "Magnet" icon or color change to indicate snapping.

## 3. Atomic Operations (The Fix for 0m Rails & Ghosts)

All state changes happen through these atomic actions which include **Garbage Collection**.

### `addSegment(rideId, fromNodeId, direction, slope)`
1. Create `newNode` at calculated position.
2. Create `newSegment` linking `fromNode` -> `newNode`.
3. Update `fromNode.outgoingSegmentId`.
4. Update `newNode.incomingSegmentId`.
5. **Set `ride.headNodeId` to `newNode.id`.**

### `connectNodes(rideId, fromNodeId, toNodeId)`
1. Validate: `fromNode` must have no outgoing. `toNode` must have no incoming.
2. Create `newSegment` linking `fromNode` -> `toNode`.
3. Update links.
4. **Set `ride.headNodeId` to `toNodeId`.**

### `deleteSegment(rideId, segmentId)`
1. Identify `startNode` and `endNode`.
2. Nullify `startNode.outgoingSegmentId`.
3. Nullify `endNode.incomingSegmentId`.
4. Remove segment.
5. **Garbage Collection (Crucial):**
   - If `startNode` has NO incoming AND NO outgoing -> **DELETE NODE**.
   - If `endNode` has NO incoming AND NO outgoing -> **DELETE NODE**.
   - If `ride.headNodeId` was deleted, set it to the nearest valid node or null.

## 4. Implementation Steps

1.  **`src/utils/trackUtils.ts`**: Rewrite math helpers to be pure and robust.
2.  **`src/store/trackStore.ts`**:
    -   Wipe existing logic.
    -   Implement `TrackState` with the new types.
    -   Implement `updatePreview` with "Snap-First" logic.
    -   Implement `addSegment`, `deleteSegment`, `connectNodes` with strict validation.
3.  **`src/components/ui/TrackEditor.tsx`**: Update to use the new store actions.

## 5. Verification Plan
- **Test 1: Basic Build:** Create ride, add 5 segments.
- **Test 2: Delete & Resume:** Delete segment #3. Ride splits. Resume from Node #2. Build new path.
- **Test 3: Loop Closure:** Bring path around to Node #0. Verify "Snap" activates. Click Build. Verify NO 0m segment.
- **Test 4: Clean Delete:** Delete all segments. Verify Ride is removed or reset cleanly.
