import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { TrackBuilder } from './TrackBuilder'
import { GroundGuide } from './GroundGuide'
import { useTrackStore } from '../../store/trackStore'
import { useState } from 'react'
import { TrackSegment } from './TrackSegment'
import type { TrackSegment as TrackSegmentType } from '../../store/trackStore'

const PlacementHandler = () => {
    const placementMode = useTrackStore((state) => state.placementMode)
    const setGhostPosition = useTrackStore((state) => state.setGhostPosition)
    const createRide = useTrackStore((state) => state.createRide)
    const placementRotation = useTrackStore((state) => state.placementRotation)

    const [hoverPos, setHoverPos] = useState<[number, number, number] | null>(null)

    // Raycasting for placement
    useThree(({ raycaster, pointer, camera }) => {
        if (placementMode !== 'ACTIVE') return

        raycaster.setFromCamera(pointer, camera)
        // We rely on the invisible plane for interaction
    })

    if (placementMode !== 'ACTIVE') return null

    // Create a dummy segment data for the ghost
    let ghostSegmentData: TrackSegmentType | null = null

    if (hoverPos) {
        const rot = placementRotation
        const forward = [Math.sin(rot), 0, Math.cos(rot)]
        const p0 = hoverPos
        const p1 = [p0[0] + forward[0] * 1, p0[1], p0[2] + forward[2] * 1]
        const p2 = [p0[0] + forward[0] * 3, p0[1], p0[2] + forward[2] * 3]
        const p3 = [p0[0] + forward[0] * 4, p0[1], p0[2] + forward[2] * 4]

        ghostSegmentData = {
            id: 'ghost',
            direction: 'STRAIGHT',
            slope: 'FLAT',
            startNodeId: 'ghost-start',
            endNodeId: 'ghost-end',
            length: 4,
            controlPoints: [
                [p0[0], p0[1], p0[2]],
                [p1[0], p1[1], p1[2]],
                [p2[0], p2[1], p2[2]],
                [p3[0], p3[1], p3[2]]
            ]
        }
    }

    return (
        <>
            {/* Invisible plane for raycasting */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0.01, 0]}
                visible={false}
                onPointerMove={(e) => {
                    // Snap to grid (size 4)
                    const x = Math.round(e.point.x / 4) * 4
                    const z = Math.round(e.point.z / 4) * 4
                    setHoverPos([x, 0, z])
                    setGhostPosition([x, 0, z])
                }}
                onClick={() => {
                    if (hoverPos) {
                        createRide(hoverPos)
                    }
                }}
            >
                <planeGeometry args={[100, 100]} />
                <meshBasicMaterial />
            </mesh>

            {/* Ghost Segment */}
            {ghostSegmentData && (
                <TrackSegment segment={ghostSegmentData} isPreview={true} />
            )}

            {/* Direction Indicator Arrow */}
            {hoverPos && (
                <group position={hoverPos} rotation={[0, placementRotation, 0]}>
                    <mesh position={[0, 1, 2]} rotation={[Math.PI / 2, 0, 0]}>
                        <coneGeometry args={[0.5, 1, 4]} />
                        <meshStandardMaterial color="yellow" transparent opacity={0.8} />
                    </mesh>
                </group>
            )}
        </>
    )
}

export const Scene = () => {
    return (
        <Canvas shadows camera={{ position: [10, 10, 10], fov: 50 }}>
            <color attach="background" args={['#87CEEB']} />
            <ambientLight intensity={0.5} />
            <directionalLight
                position={[10, 20, 10]}
                intensity={1.5}
                castShadow
                shadow-mapSize={[2048, 2048]}
            />

            <OrbitControls makeDefault minDistance={5} maxDistance={100} />

            {/* Ground Plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#4ade80" />
            </mesh>

            {/* Grid Helper */}
            <Grid args={[100, 100]} cellColor="white" sectionColor="white" fadeDistance={50} />

            <TrackBuilder />
            <GroundGuide />
            <PlacementHandler />
        </Canvas>
    )
}
