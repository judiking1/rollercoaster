# Ride Management System Implementation Plan

The user wants to transform the single-track builder into a full park management system where users can place, build, and save multiple roller coasters.

## User Review Required
> [!IMPORTANT]
> This is a major architectural change. I will refactor `trackStore` to manage a collection of `Ride` objects instead of a single flat list of segments.
> I will introduce a new `GameStore` or significantly expand `TrackStore` to handle the "Park" state.

## Proposed Changes

### Data Architecture
#### [MODIFY] [trackStore.ts](file:///e:/Personal_Project/rollercoaster/src/store/trackStore.ts)
- **New Interfaces**:
    - `Ride`: Contains `id`, `name`, `segments`, `nodes`, `isComplete`, `stats` (length, height, etc.).
    - `ParkState`: Contains `rides` (Map/Record), `activeRideId` (currently editing), `mode` (BUILDING | PLACING | VIEWING).
- **State Migration**:
    - Move `nodes` and `segments` from root state to inside `Ride` objects.
    - Actions will now target the `activeRideId`.

### Visual Aids (Request 1)
#### [NEW] [GroundGuide.tsx](file:///e:/Personal_Project/rollercoaster/src/components/3d/GroundGuide.tsx)
- A component that renders a "shadow" or grid highlight on the ground plane (y=0) corresponding to the `previewSegment`'s x/z bounds.
- Helps users judge position relative to the ground.

### Track Completion (Request 2)
#### [MODIFY] [trackUtils.ts](file:///e:/Personal_Project/rollercoaster/src/utils/trackUtils.ts)
- Add logic to check distance between `previewSegment.endNode` and `activeRide.startNode`.
- If distance < threshold, allow "Close Loop".

#### [MODIFY] [trackStore.ts](file:///e:/Personal_Project/rollercoaster/src/store/trackStore.ts)
- Add `closeLoop()` action that generates a segment connecting back to the start.
- Update `commitPreview` to check for completion.

### Placement System (Request 1 & 4)
- If `rides[activeRideId].isComplete`, prevent further building/preview.

#### [MODIFY] [TrackEditor.tsx](file:///e:/Personal_Project/rollercoaster/src/components/ui/TrackEditor.tsx)
- If `validationError` exists, show error message and disable "Build" button.
- If `isComplete`, hide builder controls and show "Ride Complete" summary.

### Ride Completion Flow (Request 5)
#### [MODIFY] [trackStore.ts](file:///e:/Personal_Project/rollercoaster/src/store/trackStore.ts)
- Update `closeLoop` to NOT immediately finish everything, but set `isComplete` to true.
- Add `finalizeRide(name)` action: Sets name, calculates stats, saves to `rides`.

#### [NEW] [RideCompletionModal.tsx](file:///e:/Personal_Project/rollercoaster/src/components/ui/RideCompletionModal.tsx)
- Shown when `activeRide.isComplete` is true.
- Input for Ride Name.
- Display calculated stats (Length, Max Height, etc.).
- "Save & Finish" button -> calls `finalizeRide` -> clears `activeRideId`.

### Persistence (Request 5)
#### [MODIFY] [trackStore.ts](file:///e:/Personal_Project/rollercoaster/src/store/trackStore.ts)
- Ensure `finalizeRide` updates the persistent store.
- (Already planned) `savePark` / `loadPark`.

## Refinements (User Feedback)
- **Ghost Rail**: Update `PlacementHandler` in `Scene.tsx` to render a `TrackSegment` geometry instead of a box.
- **Loop Collision**: Update `checkCollision` to accept an `ignoreNodeId` (target of the loop) to prevent self-collision errors when closing the loop.

## Phase 3: Edit Mode (New Request)
### Selection & Deletion
#### [MODIFY] [trackStore.ts](file:///e:/Personal_Project/rollercoaster/src/store/trackStore.ts)
- Add `selectedSegmentId` and `selectedRideId`.
- Add `deleteSegment(segmentId)` action.
- Add `resumeBuilding(nodeId)` action.

#### [MODIFY] [TrackSegment.tsx](file:///e:/Personal_Project/rollercoaster/src/components/3d/TrackSegment.tsx)
- Add `onClick` handler to select segment.
- Highlight selected segment.

#### [MODIFY] [TrackEditor.tsx](file:///e:/Personal_Project/rollercoaster/src/components/ui/TrackEditor.tsx)
- Show "Delete" button when a segment is selected.
- Show "Resume Building" button when an end node is selected (or implied).

## Verification Plan

### Manual Verification
- **Multi-Ride**:
    1. Place Ride A. Build a few segments. Finish.
    2. Place Ride B. Build a few segments. Finish.
    3. -> Both rides should exist and be rendered.
- **Ground Guide**:
    1. Build a high track.
# Ride Management System Implementation Plan

The user wants to transform the single-track builder into a full park management system where users can place, build, and save multiple roller coasters.

## User Review Required
> [!IMPORTANT]
> This is a major architectural change. I will refactor `trackStore` to manage a collection of `Ride` objects instead of a single flat list of segments.
> I will introduce a new `GameStore` or significantly expand `TrackStore` to handle the "Park" state.

## Proposed Changes

### Data Architecture
#### [MODIFY] [trackStore.ts](file:///e:/Personal_Project/rollercoaster/src/store/trackStore.ts)
- **New Interfaces**:
    - `Ride`: Contains `id`, `name`, `segments`, `nodes`, `isComplete`, `stats` (length, height, etc.).
    - `ParkState`: Contains `rides` (Map/Record), `activeRideId` (currently editing), `mode` (BUILDING | PLACING | VIEWING).
- **State Migration**:
    - Move `nodes` and `segments` from root state to inside `Ride` objects.
    - Actions will now target the `activeRideId`.

### Visual Aids (Request 1)
#### [NEW] [GroundGuide.tsx](file:///e:/Personal_Project/rollercoaster/src/components/3d/GroundGuide.tsx)
- A component that renders a "shadow" or grid highlight on the ground plane (y=0) corresponding to the `previewSegment`'s x/z bounds.
- Helps users judge position relative to the ground.

### Track Completion (Request 2)
#### [MODIFY] [trackUtils.ts](file:///e:/Personal_Project/rollercoaster/src/utils/trackUtils.ts)
- Add logic to check distance between `previewSegment.endNode` and `activeRide.startNode`.
- If distance < threshold, allow "Close Loop".

#### [MODIFY] [trackStore.ts](file:///e:/Personal_Project/rollercoaster/src/store/trackStore.ts)
- Add `closeLoop()` action that generates a segment connecting back to the start.
- Update `commitPreview` to check for completion.

### Placement System (Request 1 & 4)
- If `rides[activeRideId].isComplete`, prevent further building/preview.

#### [MODIFY] [TrackEditor.tsx](file:///e:/Personal_Project/rollercoaster/src/components/ui/TrackEditor.tsx)
- If `validationError` exists, show error message and disable "Build" button.
- If `isComplete`, hide builder controls and show "Ride Complete" summary.

### Ride Completion Flow (Request 5)
#### [MODIFY] [trackStore.ts](file:///e:/Personal_Project/rollercoaster/src/store/trackStore.ts)
- Update `closeLoop` to NOT immediately finish everything, but set `isComplete` to true.
- Add `finalizeRide(name)` action: Sets name, calculates stats, saves to `rides`.

#### [NEW] [RideCompletionModal.tsx](file:///e:/Personal_Project/rollercoaster/src/components/ui/RideCompletionModal.tsx)
- Shown when `activeRide.isComplete` is true.
- Input for Ride Name.
- Display calculated stats (Length, Max Height, etc.).
- "Save & Finish" button -> calls `finalizeRide` -> clears `activeRideId`.

### Persistence (Request 5)
#### [MODIFY] [trackStore.ts](file:///e:/Personal_Project/rollercoaster/src/store/trackStore.ts)
- Ensure `finalizeRide` updates the persistent store.
- (Already planned) `savePark` / `loadPark`.

## Refinements (User Feedback)
- **Ghost Rail**: Update `PlacementHandler` in `Scene.tsx` to render a `TrackSegment` geometry instead of a box.
- **Loop Collision**: Update `checkCollision` to accept an `ignoreNodeId` (target of the loop) to prevent self-collision errors when closing the loop.

## Phase 3: Edit Mode (New Request)
### Selection & Deletion
#### [MODIFY] [trackStore.ts](file:///e:/Personal_Project/rollercoaster/src/store/trackStore.ts)
- Add `selectedSegmentId` and `selectedRideId`.
- Add `deleteSegment(segmentId)` action.
- Add `resumeBuilding(nodeId)` action.

#### [MODIFY] [TrackSegment.tsx](file:///e:/Personal_Project/rollercoaster/src/components/3d/TrackSegment.tsx)
- Add `onClick` handler to select segment.
- Highlight selected segment.

#### [MODIFY] [TrackEditor.tsx](file:///e:/Personal_Project/rollercoaster/src/components/ui/TrackEditor.tsx)
- Show "Delete" button when a segment is selected.
- Show "Resume Building" button when an end node is selected (or implied).

## Verification Plan

### Manual Verification
- **Multi-Ride**:
    1. Place Ride A. Build a few segments. Finish.
    2. Place Ride B. Build a few segments. Finish.
    3. -> Both rides should exist and be rendered.
- **Ground Guide**:
    1. Build a high track.
    2. -> Should see a shadow/highlight on the ground directly below.
- **Loop Closing**:
    1. Build a circle.
    2. -> When nearing the start, should see an option to close the loop.
    3. -> **Verify no collision error occurs.**
## Phase 5: UX & Optimization (User Feedback) (Completed)

### Placement UI & Logic
- [x] **Rotation UI**: Add a visible "Rotate (R)" button in the placement overlay in `TrackEditor.tsx`.
- [x] **Immediate Start Segment**: Update `createRide` in `trackStore.ts` to immediately create a "Start Segment" (Station) instead of just a node, so the ride is visible immediately.

### Data Optimization (JSON)
- [x] **Readable IDs**: Refactor ID generation to use sequential/readable formats (e.g., `Ride 1-segment-0`, `Ride 1-node-0`) instead of UUIDs.
- [x] **Precision Optimization**: Implement a custom `JSON.stringify` replacer or a pre-processing step in `exportPark` to round numeric values (position, rotation, etc.) to 3-4 decimal places.

## Phase 6: Simplified Collision & Manual Connection System

> [!IMPORTANT]
> The previous distance-based collision exclusion system was unpredictable. This phase redesigns the system with clear, explicit rules.

### Core Principles
1. **Simplified Collision**: Only detect immediate overlaps (no smart gap-filling heuristics)
2. **Manual Connection**: User explicitly connects open nodes
3. **Visual Feedback**: Clearly show open nodes and connection possibilities

### Changes

#### [MODIFY] [trackUtils.ts](file:///e:/Personal_Project/rollercoaster/src/utils/trackUtils.ts)
- Increase `MIN_DISTANCE` from 1.5 to 2.5 for stricter collision detection
- Remove all complex logic - just compare distances

#### [MODIFY] [trackStore.ts](file:///e:/Personal_Project/rollercoaster/src/store/trackStore.ts)
- **Simplify `updatePreview`**: Only exclude segments directly connected to `lastNode` (no distance checks)
- **Add `connectNodes(nodeA, nodeB)`**: New action to manually create a connecting segment between two open nodes
- **Add `getOpenNodes()`**: Helper to find all nodes with only one connection

#### [MODIFY] [TrackEditor.tsx](file:///e:/Personal_Project/rollercoaster/src/components/ui/TrackEditor.tsx)
- Add "Connect to Node" button when building from an open node and other open nodes exist
- Show list of connectable nodes with distances
- Visual indicators for open nodes

#### [NEW] [OpenNodeMarker.tsx](file:///e:/Personal_Project/rollercoaster/src/components/3d/OpenNodeMarker.tsx)
- 3D marker component to visually highlight open nodes
- Different colors for: buildable (green), connectable (blue), start node (yellow)

## Verification Plan

### Manual Testing
1. Create a loop with intentional gaps
2. Delete middle segments
3. Verify collision only prevents immediate overlaps
4. Use "Connect Nodes" feature to bridge gaps
5. Verify no phantom segments remain after deletion

## Phase 8: Architecture Redesign (Node-Centric)

### Core Changes
- **Data Model**: Shift from Segment-List to Node-Graph (Doubly Linked List).
- **Nodes**: Explicitly track `nextSegmentId` and `prevSegmentId`.
- **Segments**: Act as edges between nodes.

### [MODIFY] [trackStore.ts](file:///e:/Personal_Project/rollercoaster/src/store/trackStore.ts)
- **Interfaces**: Update `TrackNode` to include graph links.
- **Actions**:
    - `createRide`: Initialize Station Start Node (Head).
    - `commitPreview`: Link new node to current node via new segment.
    - `deleteSelectedSegment`: Unlink nodes, creating Open Tail and Open Head.
    - `connectNodes`: Link Open Tail to Open Head.
    - `getOpenNodes`: Find nodes with null `nextSegmentId` (Tail) or null `prevSegmentId` (Head).

### [MODIFY] [TrackEditor.tsx](file:///e:/Personal_Project/rollercoaster/src/components/ui/TrackEditor.tsx)
- **Visuals**: Clearly distinguish between "Building from here" (Tail) and "Connect to here" (Head).
- **Interaction**: Click on Open Tail to resume building. Click on Open Head to connect.
