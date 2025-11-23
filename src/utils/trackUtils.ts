import * as THREE from 'three'
import type { TrackNode, TrackDirection, TrackSlope, TrackSegmentData } from '../store/trackStore'
import { v4 as uuidv4 } from 'uuid'

const GRID_SIZE = 4
const SLOPE_ANGLE = Math.PI / 6 // 30 degrees

export const calculateNextTrackSegment = (
    startNode: TrackNode,
    direction: TrackDirection,
    slope: TrackSlope
): { endNode: TrackNode; controlPoints: [number, number, number][]; length: number } => {

    const startPos = new THREE.Vector3(...startNode.position)
    // const startRot = new THREE.Quaternion(...startNode.rotation) // Unused
    const startTangent = new THREE.Vector3(...startNode.tangent).normalize()
    // const startNormal = new THREE.Vector3(...startNode.normal).normalize() // Unused for now

    // Calculate current pitch from tangent
    // Assuming "Up" is Y, we can get pitch from the angle with the horizontal plane.
    // But simpler: we just need to know if we are currently on a slope or flat.
    // However, we want to transition to the TARGET slope.

    let targetPitch = 0
    if (slope === 'UP') targetPitch = SLOPE_ANGLE
    if (slope === 'DOWN') targetPitch = -SLOPE_ANGLE

    // Calculate Yaw change
    let yawChange = 0
    if (direction === 'LEFT') yawChange = Math.PI / 2
    if (direction === 'RIGHT') yawChange = -Math.PI / 2

    // We need to construct the end tangent.
    // 1. Get the current yaw (project tangent to horizontal plane)
    // 2. Apply yaw change
    // 3. Apply target pitch

    // Current horizontal direction
    const currentHorizontalDir = new THREE.Vector3(startTangent.x, 0, startTangent.z).normalize()
    if (currentHorizontalDir.lengthSq() < 0.001) {
        // Vertical track? Should not happen in this simplified model yet.
        // Fallback to Z forward
        currentHorizontalDir.set(0, 0, 1)
    }

    // Target horizontal direction
    const targetHorizontalDir = currentHorizontalDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yawChange)

    // Target Tangent
    // We rotate the target horizontal direction up/down by targetPitch
    // Axis of rotation is the "Right" vector relative to the target direction
    const targetRight = new THREE.Vector3().crossVectors(targetHorizontalDir, new THREE.Vector3(0, 1, 0)).normalize()
    const endTangent = targetHorizontalDir.clone().applyAxisAngle(targetRight, targetPitch).normalize()

    // End Normal
    // We want the normal to be roughly Up, but banked if we add banking later.
    // For now, let's keep it simple: Normal is perpendicular to Tangent and Right.
    // Or just rotate the Up vector same way?
    // Let's compute it from Tangent and Right.
    // Note: targetRight is horizontal. If we pitch up, the normal should tilt back.
    const endNormal = new THREE.Vector3().crossVectors(endTangent, targetRight).normalize()

    // End Rotation
    const endRot = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), endTangent)
    // Fix roll? setFromUnitVectors doesn't guarantee roll.
    // Better: lookRotation.
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), endTangent, endNormal)
    endRot.setFromRotationMatrix(m)


    // Calculate End Position
    // This is the tricky part. We need to bridge Start and End with a curve.
    // If Straight + Flat: Simple linear add.
    // If Turn + Flat: Arc.
    // If Straight + Slope: S-curve vertical.
    // If Turn + Slope: Helix.

    // Heuristic:
    // We want the end position to be roughly GRID_SIZE away horizontally.
    // And the height change should match the slope.

    // Let's define the "Horizontal Displacement" vector.
    // If Straight: Displacement = TargetHorizontalDir * GRID_SIZE
    // If Turn: Displacement = (Center + Radius * EndAngle) - Start
    //   Radius = GRID_SIZE
    //   Center = Start + Left * Radius

    let horizontalDisplacement = new THREE.Vector3()

    if (direction === 'STRAIGHT') {
        horizontalDisplacement.copy(targetHorizontalDir).multiplyScalar(GRID_SIZE)
    } else {
        const radius = GRID_SIZE

        const centerOffset = new THREE.Vector3().crossVectors(currentHorizontalDir, new THREE.Vector3(0, 1, 0)).normalize() // Right
        if (direction === 'LEFT') centerOffset.negate() // Left
        centerOffset.multiplyScalar(radius)

        // End point relative to center
        // Rotate -centerOffset by 90 degrees * turnDir
        const endOffsetFromCenter = centerOffset.clone().negate().applyAxisAngle(new THREE.Vector3(0, 1, 0), yawChange)

        horizontalDisplacement.copy(centerOffset).add(endOffsetFromCenter)
    }

    // But we defined "Slope Up" as a target state.
    // So if we go Flat -> Up, we transition.
    // If we go Up -> Up, we continue.

    // Let's estimate height change based on average pitch?
    // Or just force the end height to be consistent with the target pitch?
    // If we want a "Straight Slope" that goes up 1 unit per 1 unit,
    // Height = HorizontalLength * tan(targetPitch)
    // But if we are transitioning, maybe half that?

    // Let's try to be consistent:
    // The segment length (arc length) is roughly GRID_SIZE (for straight) or PI/2 * R (for turn).
    // Let's use the horizontal length as the base.
    // Height Change = HorizontalLength * tan(avgPitch)
    // avgPitch = (startPitch + targetPitch) / 2

    // Start Pitch
    const startPitch = Math.asin(startTangent.y)
    const avgPitch = (startPitch + targetPitch) / 2

    // Horizontal Length of the path
    let horizontalPathLength = GRID_SIZE
    if (direction !== 'STRAIGHT') {
        horizontalPathLength = (Math.PI / 2) * GRID_SIZE
    }

    const heightChange = horizontalPathLength * Math.tan(avgPitch)

    const endPos = startPos.clone().add(horizontalDisplacement)
    endPos.y += heightChange

    const endNode: TrackNode = {
        id: uuidv4(),
        position: [endPos.x, endPos.y, endPos.z],
        rotation: [endRot.x, endRot.y, endRot.z, endRot.w],
        tangent: [endTangent.x, endTangent.y, endTangent.z],
        normal: [endNormal.x, endNormal.y, endNormal.z]
    }

    // Control Points
    // Standard Bezier approximation
    const k = horizontalPathLength * 0.4 // Control point distance factor

    const p1 = startPos.clone().add(startTangent.clone().multiplyScalar(k))
    const p2 = endPos.clone().sub(endTangent.clone().multiplyScalar(k))

    const controlPoints: [number, number, number][] = [
        [startPos.x, startPos.y, startPos.z],
        [p1.x, p1.y, p1.z],
        [p2.x, p2.y, p2.z],
        [endPos.x, endPos.y, endPos.z]
    ]

    return { endNode, controlPoints, length: horizontalPathLength }
}

export const checkCollision = (
    newSegmentPoints: [number, number, number][],
    existingSegments: TrackSegmentData[],
    excludeSegmentIds: string[] = []
): boolean => {
    // Strict collision detection: Increased distance threshold
    // to prevent overlapping tracks more reliably

    const MIN_DISTANCE = 2.5 // Stricter minimum distance between tracks

    for (const segment of existingSegments) {
        // Skip excluded segments
        if (excludeSegmentIds.includes(segment.id)) continue

        for (const p1 of newSegmentPoints) {
            for (const p2 of segment.controlPoints) {
                const dx = p1[0] - p2[0]
                const dy = p1[1] - p2[1]
                const dz = p1[2] - p2[2]
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

                if (dist < MIN_DISTANCE) {
                    return true
                }
            }
        }
    }
    return false
}

export const calculateForwardVector = (controlPoints: [number, number, number][]): [number, number, number] => {
    // Calculate the forward direction from the last two control points
    const p2 = new THREE.Vector3(...controlPoints[2])
    const p3 = new THREE.Vector3(...controlPoints[3])

    const forward = new THREE.Vector3().subVectors(p3, p2).normalize()

    return [forward.x, forward.y, forward.z]
}
