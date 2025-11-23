import { useTrackStore } from '../../store/trackStore'
import { TrackSegment } from './TrackSegment'

export const TrackBuilder = () => {
    const rides = useTrackStore((state) => state.rides)
    const previewSegment = useTrackStore((state) => state.previewSegment)

    return (
        <group>
            {Object.values(rides).map((ride) => (
                <group key={ride.id}>
                    {Object.values(ride.segments).map((segment) => (
                        <TrackSegment key={segment.id} segment={segment} />
                    ))}
                </group>
            ))}

            {previewSegment && (
                <TrackSegment
                    key="preview"
                    segment={previewSegment}
                    isPreview
                />
            )}
        </group>
    )
}
