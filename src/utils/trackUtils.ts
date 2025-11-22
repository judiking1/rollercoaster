import * as THREE from 'three'
import type { TrackNode, TrackType } from '../store/trackStore'
import { v4 as uuidv4 } from 'uuid'

const GRID_SIZE = 10
const SLOPE_HEIGHT = 4 // Height change per slope segment
const SLOPE_LENGTH = GRID_SIZE // Horizontal length of slope segment

export const calculateNextTrackSegment = (
    startNode: TrackNode,
    type: TrackType
): { endNode: TrackNode; controlPoints: [number, number, number][]; length: number } => {

    const startPos = new THREE.Vector3(...startNode.position)
    const startRot = new THREE.Quaternion(...startNode.rotation)
    const startTangent = new THREE.Vector3(...startNode.tangent).normalize()
    const startNormal = new THREE.Vector3(...startNode.normal).normalize()

    let endPos = new THREE.Vector3()
    let endRot = new THREE.Quaternion()
    let endTangent = new THREE.Vector3()
    let endNormal = new THREE.Vector3()

    let p1 = new THREE.Vector3()
    let p2 = new THREE.Vector3()

    // Helper to snap vector to grid (optional, but good for drift correction)
    // const snap = (v: THREE.Vector3) => v.set(Math.round(v.x), Math.round(v.y), Math.round(v.z))

    switch (type) {
        case 'STRAIGHT': {
            endTangent.copy(startTangent)
            endNormal.copy(startNormal)
            endPos.copy(startPos).add(startTangent.clone().multiplyScalar(GRID_SIZE))
            endRot.copy(startRot)

            p1.copy(startPos).add(startTangent.clone().multiplyScalar(GRID_SIZE / 3))
            p2.copy(endPos).sub(endTangent.clone().multiplyScalar(GRID_SIZE / 3))
            break
        }

        case 'TURN_LEFT': {
            // 90 degree turn with radius = GRID_SIZE
            // This fits exactly into a 1x1 grid cell if we enter from edge center? 
            // Or 2x2? Let's stick to the previous logic but enforce GRID_SIZE radius.
            const radius = GRID_SIZE
            const angle = Math.PI / 2
            const kCircle = 0.5522847498 * radius

            const axis = startNormal.clone() // Rotate around Up
            endTangent.copy(startTangent).applyAxisAngle(axis, angle)
            endNormal.copy(startNormal)

            // Calculate center of turn
            const left = new THREE.Vector3().crossVectors(startTangent, startNormal).normalize().negate()
            const center = startPos.clone().add(left.clone().multiplyScalar(radius))

            endPos.copy(center).add(startTangent.clone().multiplyScalar(radius))
            endRot.setFromAxisAngle(axis, angle).multiply(startRot)

            p1.copy(startPos).add(startTangent.clone().multiplyScalar(kCircle))
            p2.copy(endPos).sub(endTangent.clone().multiplyScalar(kCircle))
            break
        }

        case 'TURN_RIGHT': {
            const radius = GRID_SIZE
            const angle = -Math.PI / 2
            const kCircle = 0.5522847498 * radius

            const axis = startNormal.clone()
            endTangent.copy(startTangent).applyAxisAngle(axis, angle)
            endNormal.copy(startNormal)

            const right = new THREE.Vector3().crossVectors(startTangent, startNormal).normalize()
            const center = startPos.clone().add(right.clone().multiplyScalar(radius))

            endPos.copy(center).add(startTangent.clone().multiplyScalar(radius))
            endRot.setFromAxisAngle(axis, angle).multiply(startRot)

            p1.copy(startPos).add(startTangent.clone().multiplyScalar(kCircle))
            p2.copy(endPos).sub(endTangent.clone().multiplyScalar(kCircle))
            break
        }

        case 'SLOPE_UP': {
            // Transition from Flat to Upward Slope (or Upward to Flat?)
            // For simplicity, let's make it a full transition segment: Flat -> Slope -> Flat?
            // No, user usually wants: Flat -> Slope Start -> Slope Straight -> Slope End -> Flat
            // But requested "Simple straight rail slope".
            // Let's interpret "Slope Up" as a segment that goes Forward 1 Grid and Up 1 Height Unit.
            // It should be an S-curve in the vertical plane.

            endTangent.copy(startTangent) // Ends parallel to start (but higher)? 
            // If we want it to be connectable to a straight slope, the end tangent must be pitched up.
            // But the user said "simply straight rail slope".
            // If we do Flat -> Slope Up (Transition) -> Slope Straight -> Slope Down (Transition) -> Flat

            // Let's implement "Slope Up" as a transition piece that ends with a pitch.
            // Pitch angle = atan(Height / Length)
            const pitchAngle = Math.atan2(SLOPE_HEIGHT, SLOPE_LENGTH)

            // Rotate tangent around Right vector
            const right = new THREE.Vector3().crossVectors(startTangent, startNormal).normalize()
            endTangent.copy(startTangent).applyAxisAngle(right, pitchAngle)
            endNormal.copy(startNormal).applyAxisAngle(right, pitchAngle)

            // End position: Forward X, Up Y
            // To make it fit grid, we want horizontal displacement = GRID_SIZE
            // Vertical displacement = SLOPE_HEIGHT
            // But this is a curve.
            // But we need to connect it to flat track.

            // Let's try:
            // 1. Slope Up: Transition Flat -> Angled (Ends at half grid length? or full grid length?)
            // Let's do Full Grid Length, ends at full pitch.

            // Wait, if we want "Straight Slope", we need a "SLOPE_STRAIGHT" type.
            // Let's assume SLOPE_UP is the transition to the slope.

            endPos.copy(startPos)
                .add(startTangent.clone().multiplyScalar(GRID_SIZE)) // Move forward
                .add(new THREE.Vector3(0, 1, 0).multiplyScalar(SLOPE_HEIGHT)) // Move up

            // If it's a straight line connection, tangents point directly at end pos.
            // But we need smooth entry.
            // Let's make it an S-curve: Flat start, Flat end, but higher.
            // This is the easiest "Slope Up" block in games like RCT.

            endTangent.copy(startTangent)
            endNormal.copy(startNormal)
            endRot.copy(startRot)

            // Control points for S-curve
            // P1 = Start + Tangent * k
            // P2 = End - Tangent * k
            // k = 0.5 * Length

            p1.copy(startPos).add(startTangent.clone().multiplyScalar(GRID_SIZE * 0.5))
            p2.copy(endPos).sub(endTangent.clone().multiplyScalar(GRID_SIZE * 0.5))

            // This creates a smooth S-curve up.
            break
        }

        case 'SLOPE_DOWN': {
            // S-curve down
            endTangent.copy(startTangent)
            endNormal.copy(startNormal)
            endRot.copy(startRot)

            endPos.copy(startPos)
                .add(startTangent.clone().multiplyScalar(GRID_SIZE))
                .add(new THREE.Vector3(0, -1, 0).multiplyScalar(SLOPE_HEIGHT))

            p1.copy(startPos).add(startTangent.clone().multiplyScalar(GRID_SIZE * 0.5))
            p2.copy(endPos).sub(endTangent.clone().multiplyScalar(GRID_SIZE * 0.5))
            break
        }

        default: {
            // Straight
            endTangent.copy(startTangent)
            endNormal.copy(startNormal)
            endPos.copy(startPos).add(startTangent.clone().multiplyScalar(GRID_SIZE))
            endRot.copy(startRot)
            p1.copy(startPos).add(startTangent.clone().multiplyScalar(GRID_SIZE / 3))
            p2.copy(endPos).sub(endTangent.clone().multiplyScalar(GRID_SIZE / 3))
        }
    }

    const endNode: TrackNode = {
        id: uuidv4(), // This will be overwritten if committing
        position: [endPos.x, endPos.y, endPos.z],
        rotation: [endRot.x, endRot.y, endRot.z, endRot.w],
        tangent: [endTangent.x, endTangent.y, endTangent.z],
        normal: [endNormal.x, endNormal.y, endNormal.z]
    }

    const controlPoints: [number, number, number][] = [
        [startPos.x, startPos.y, startPos.z],
        [p1.x, p1.y, p1.z],
        [p2.x, p2.y, p2.z],
        [endPos.x, endPos.y, endPos.z]
    ]

    return { endNode, controlPoints, length: GRID_SIZE }
}
