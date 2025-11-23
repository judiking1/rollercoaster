import { useTrackStore } from '../../store/trackStore'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { useMemo } from 'react'

export const GroundGuide = () => {
    const previewSegment = useTrackStore((state) => state.previewSegment)

    const points = useMemo(() => {
        if (!previewSegment) return null

        // Create a curve from control points
        const curve = new THREE.CubicBezierCurve3(
            new THREE.Vector3(...previewSegment.controlPoints[0]),
            new THREE.Vector3(...previewSegment.controlPoints[1]),
            new THREE.Vector3(...previewSegment.controlPoints[2]),
            new THREE.Vector3(...previewSegment.controlPoints[3])
        )

        const points = curve.getPoints(20)
        // Project to y=0.02 (slightly above ground to avoid z-fighting)
        return points.map(p => new THREE.Vector3(p.x, 0.02, p.z))
    }, [previewSegment])

    if (!points) return null

    return (
        <group>
            {/* Shadow Line */}
            <Line
                points={points}
                color="black"
                opacity={0.5}
                transparent
                lineWidth={3}
            />

            {/* End Point Marker */}
            <mesh position={points[points.length - 1]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.5, 0.7, 32]} />
                <meshBasicMaterial color="black" opacity={0.5} transparent />
            </mesh>
        </group>
    )
}
