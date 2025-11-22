import { useMemo } from 'react'
import * as THREE from 'three'
import type { TrackSegmentData } from '../../store/trackStore'

interface TrackSegmentProps {
    data: TrackSegmentData
    isPreview?: boolean
}

export const TrackSegment = ({ data, isPreview = false }: TrackSegmentProps) => {
    const { curve } = useMemo(() => {
        const points = data.controlPoints.map(p => new THREE.Vector3(...p))
        const curve = new THREE.CubicBezierCurve3(
            points[0],
            points[1],
            points[2],
            points[3]
        )
        return { curve }
    }, [data])

    return (
        <group>
            {/* Main Rail */}
            <mesh castShadow={!isPreview} receiveShadow={!isPreview}>
                <tubeGeometry args={[curve, 20, 0.3, 8, false]} />
                <meshStandardMaterial
                    color={isPreview ? "#360bf1" : "#e11d48"}
                    transparent={isPreview}
                    opacity={isPreview ? 0.4 : 1}
                />
            </mesh>

            {/* Sleepers (Ties) - Simple visualization */}
            {!isPreview && (
                <mesh>
                    {/* Placeholder for sleepers */}
                </mesh>
            )}
        </group>
    )
}
