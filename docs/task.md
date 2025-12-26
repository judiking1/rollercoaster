# Tasks

- [x] **Phase 1: Initial Setup & Fixes**
    - [x] Fix Tailwind CSS issue
    - [x] Refactor Track System (V1)
    - [x] Enhance Track Builder Experience

- [x] **Phase 2: Core Features**
    - [x] Implement JSON Export/Import
    - [x] Advanced Edit Mode (Gap Filling)
    - [x] Placement Rotation

- [x] **Phase 3: UX & Optimization**
    - [x] Placement UI & 'R' key
    - [x] Ride Creation Improvements
    - [x] Data Optimization (Readable IDs)

- [x] **Phase 4: Simplified Collision & Manual Connection**
    - [x] Simplify Collision Detection
    - [x] Manual Node Connection

- [x] **Phase 5: Track System V2 Overhaul (Strict Graph)**
    - [x] **Architecture**: Strict `TrackNode` (incoming/outgoing) and `TrackSegment` types
    - [x] **Snap-First Preview**: Proactive snapping to open nodes within 10m
    - [x] **Garbage Collection**: Auto-remove isolated nodes on deletion
    - [x] **UI Refactor**: Remove "Finish" button, integrate snapping into "Build"
    - [x] **Bug Fixes**: "0m residual rail" and "Overlap errors" resolved
    - [x] **Refinement**: Prevent snapping for short rides (< 3 segments)

- [ ] **Phase 6: Future Polish**
    - [ ] Add banking support
    - [ ] Improved physics simulation
    - [ ] Multi-ride support (UI for switching rides)
