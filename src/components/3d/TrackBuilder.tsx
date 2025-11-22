import { useTrackStore } from '../../store/trackStore'
import { TrackSegment } from './TrackSegment'

export const TrackBuilder = () => {
    const segments = useTrackStore((state) => state.segments)
    const previewSegment = useTrackStore((state) => state.previewSegment)

    return (
        <group>
            {segments.map((segment) => (
                <TrackSegment key={segment.id} data={segment} />
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
