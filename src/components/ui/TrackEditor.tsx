import { useTrackStore } from '../../store/trackStore'
import type { TrackType } from '../../store/trackStore'
import { useEffect } from 'react'

export const TrackEditor = () => {
    const setPreview = useTrackStore((state) => state.setPreview)
    const commitPreview = useTrackStore((state) => state.commitPreview)
    const cancelPreview = useTrackStore((state) => state.cancelPreview)
    const removeLastSegment = useTrackStore((state) => state.removeLastSegment)
    const reset = useTrackStore((state) => state.reset)
    const previewSegment = useTrackStore((state) => state.previewSegment)

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (previewSegment) {
                if (e.key === 'Enter') commitPreview()
                if (e.key === 'Escape') cancelPreview()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [previewSegment, commitPreview, cancelPreview])

    const handleAdd = (type: TrackType) => {
        setPreview(type)
    }

    if (previewSegment) {
        return (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-xl flex flex-col gap-2 pointer-events-auto min-w-[300px] items-center">
                <p className="text-gray-700 font-medium">Confirm Segment?</p>
                <div className="flex gap-2">
                    <button
                        onClick={commitPreview}
                        className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-bold shadow-sm"
                    >
                        Build (Enter)
                    </button>
                    <button
                        onClick={cancelPreview}
                        className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium shadow-sm"
                    >
                        Cancel (Esc)
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-xl flex flex-col gap-4 pointer-events-auto min-w-[600px]">
            <div className="flex gap-2 justify-center flex-wrap">
                <button
                    onClick={() => handleAdd('STRAIGHT')}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium shadow-sm"
                >
                    Straight
                </button>
                <button
                    onClick={() => handleAdd('TURN_LEFT')}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors font-medium shadow-sm"
                >
                    Left Turn
                </button>
                <button
                    onClick={() => handleAdd('TURN_RIGHT')}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors font-medium shadow-sm"
                >
                    Right Turn
                </button>
                <button
                    onClick={() => handleAdd('SLOPE_UP')}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium shadow-sm"
                >
                    Slope Up
                </button>
                <button
                    onClick={() => handleAdd('SLOPE_DOWN')}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium shadow-sm"
                >
                    Slope Down
                </button>
            </div>

            <div className="h-px bg-gray-300 w-full" />

            <div className="flex gap-2 justify-center">
                <button
                    onClick={removeLastSegment}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium shadow-sm"
                >
                    Undo
                </button>
                <button
                    onClick={reset}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium shadow-sm"
                >
                    Clear All
                </button>
            </div>
        </div>
    )
}
