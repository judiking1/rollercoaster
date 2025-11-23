import { useTrackStore } from '../../store/trackStore'
import { TrackSegment } from './TrackSegment'

export const TrackBuilder = () => {
    const rides = useTrackStore((state) => state.rides)
    const previewSegment = useTrackStore((state) => state.previewSegment)

    return (
        <group>
            {Object.values(rides).map((ride) => (
                <group key={ride.id}>
                    {ride.segments.map((segment) => (
                        <TrackSegment key={segment.id} data={segment} />
                    ))}
                </group>
            ))}

            {previewSegment && (
                <TrackSegment
                    key="preview"
                    data={previewSegment}
                    isPreview
                />
            )}
        </group>
    )
}
