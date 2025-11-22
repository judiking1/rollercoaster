# Implementation Plan - Roller Coaster Tycoon Web

## Goal Description
Build a 3D web-based Roller Coaster construction and simulation game. The app will allow users to build tracks with realistic physics, grid-based alignment, and a preview system.

## Tech Stack
- **Framework**: React (via Vite)
- **Language**: TypeScript (Strict mode)
- **3D Engine**: Three.js with `@react-three/fiber` (R3F)
- **Math**: Cubic Bezier for smooth track generation.
- **State Management**: `zustand` (Track graph data structure).
- **Styling**: Tailwind CSS v4.

## User Review Required
> [!IMPORTANT]
> **Grid System**: I will define strict grid units.
> - **Length Unit**: 10 meters (1 block).
> - **Height Unit**: 4 meters (approx).
> - **Slopes**: 
>   - `Slope Up`: Transitions from Flat (0°) to Shallow (approx 22°).
>   - `Steep Slope`: Transitions from Shallow to Steep (60°).
>   - All segments must end exactly on a grid intersection to ensure loops can be closed.

> [!NOTE]
> **Preview Mode**: Clicking a track button will now spawn a "Ghost Segment". The user must confirm (e.g., by clicking "Build" or pressing Enter) to place it.

## Proposed Changes

### Phase 3.6: Grid & Preview System
#### [MODIFY] [trackStore.ts](file:///src/store/trackStore.ts)
- Add `previewSegment` state.
- Add `commitPreview` action.
- Add `cancelPreview` action.

#### [MODIFY] [trackUtils.ts](file:///src/utils/trackUtils.ts)
- Define `GRID_SIZE = 10`.
- Update `SLOPE_UP` / `SLOPE_DOWN` to be vertical transitions (S-curves in Y axis) rather than helices.
- Ensure `endPos` always snaps to logical grid coordinates relative to start.

#### [MODIFY] [TrackBuilder.tsx](file:///src/components/3d/TrackBuilder.tsx)
- Render `previewSegment` with a transparent/holographic material.

#### [MODIFY] [TrackEditor.tsx](file:///src/components/ui/TrackEditor.tsx)
- Update buttons to trigger preview.
- Add "Confirm/Cancel" UI when preview is active.

## Verification Plan
### Automated Tests
- Verify that a sequence of `Slope Up` -> `Slope Down` returns to the original Y height.

### Manual Verification
- Build a track: Straight -> Slope Up -> Straight (Sloped) -> Slope Down -> Straight.
- Verify the ghost segment appears before placing.
