# Walkthrough - Grid System & Preview Mode

I have enhanced the track building experience with a **Grid System**, **Realistic Slopes**, and a **Preview Mode**.

## Features Implemented
- **Grid System**: All track segments now align to a 10m grid, ensuring pieces fit together perfectly.
- **Realistic Slopes**:
  - **Slope Up/Down**: Now implemented as "S-curve" transitions that move the track up or down by exactly 4 meters while moving forward 10 meters.
  - This creates a realistic "straight slope" look rather than a helix.
- **Preview Mode**:
  - When you click a track button, a **Ghost Segment** (green, transparent) appears.
  - **Confirm**: Press `Enter` or click "Build" to place it.
  - **Cancel**: Press `Esc` or click "Cancel" to discard.

## How to Test
1. **Preview**: Click "Straight" or any other button. You will see a green ghost segment.
2. **Build**: Press `Enter` to confirm placement.
3. **Slopes**: Try adding a "Slope Up". Notice it moves up smoothly. Add a "Straight" after it to see it continue at the new height.
4. **Grid**: Notice how all turns and straights align perfectly to the grid.

## Next Steps
- **Physics**: Implement the cart movement logic.
- **Loop Validation**: Detect when the track forms a closed loop.
