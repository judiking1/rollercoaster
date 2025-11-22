import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { TrackBuilder } from './TrackBuilder'

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
        </Canvas>
    )
}
