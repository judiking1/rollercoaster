# Walkthrough

## Track System V2 Overhaul

The track system has been completely rewritten to address persistent bugs ("0m residual rail", "overlap errors") and improve robustness.

### Key Changes

1.  **Strict Graph Architecture**:
    *   Nodes now strictly track `incomingSegmentId` and `outgoingSegmentId`.
    *   Segments are stored in a `Record` for O(1) access.
    *   All state changes are atomic and validate graph integrity.

2.  **"Snap-First" Preview Logic**:
    *   Instead of checking for collisions and then failing, the system now *actively looks* for valid connection targets (Open Heads) within a 10m radius.
    *   If a target is found, the preview curve is forced to snap to it.
    *   **Refinement**: Snapping is disabled if the ride has fewer than 3 segments to prevent immediate U-turns.

3.  **Garbage Collection**:
    *   When a segment is deleted, any nodes that become isolated (no incoming or outgoing connections) are automatically removed.
    *   This prevents "ghost nodes" and 0-length segments.

4.  **UI Simplification**:
    *   The "Finish (Close Loop)" button has been removed.
    *   The "Build" button dynamically changes to **"Link & Finish"** when a snap target is detected.
    *   This unifies the workflow: just build towards the start, and it will snap.

### Verification status
- [x] Build passes (`npm run build`)
- [x] Basic track building works
- [x] Loop closure works (via snapping)
- [x] Segment deletion cleans up nodes correctly
- [x] Immediate snapping prevented for short rides

### Next Steps
- Resume work by running `npm run dev`.
- Test more complex track layouts (S-bends, helices).
- Implement banking.
