import { useMemo } from 'react'
import * as THREE from 'three'
import { useTrackStore } from '../../store/trackStore'
import type { TrackSegmentData } from '../../store/trackStore'

interface TrackSegmentProps {
    data: TrackSegmentData
    isPreview?: boolean
}

export const TrackSegment = ({ data, isPreview = false }: TrackSegmentProps) => {
    const selectedSegmentId = useTrackStore((state) => state.selectedSegmentId)
    const selectSegment = useTrackStore((state) => state.selectSegment)

    const isSelected = selectedSegmentId === data.id

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
        <group
            onClick={(e) => {
                if (!isPreview) {
                    e.stopPropagation()
                    selectSegment(data.id)
                }
            }}
            onPointerMissed={(e) => {
                if (e.type === 'click' && isSelected) {
                    selectSegment(null)
                }
            }}
        >
            {/* Main Rail */}
            <mesh castShadow={!isPreview} receiveShadow={!isPreview}>
                <tubeGeometry args={[curve, 20, 0.3, 8, false]} />
                <meshStandardMaterial
                    color={isPreview ? "#360bf1" : (isSelected ? "#fbbf24" : "#e11d48")} // Yellow if selected
                    transparent={isPreview}
                    opacity={isPreview ? 0.4 : 1}
                    emissive={isSelected ? "#fbbf24" : "#000000"}
                    emissiveIntensity={isSelected ? 0.5 : 0}
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
