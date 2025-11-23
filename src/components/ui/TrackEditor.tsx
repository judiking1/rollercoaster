import { useTrackStore } from '../../store/trackStore'
import type { TrackDirection, TrackSlope } from '../../store/trackStore'
import { useEffect } from 'react'
import { RideCompletionModal } from './RideCompletionModal'

export const TrackEditor = () => {
    const setDirection = useTrackStore((state) => state.setDirection)
    const setSlope = useTrackStore((state) => state.setSlope)
    const commitPreview = useTrackStore((state) => state.commitPreview)
    const cancelPreview = useTrackStore((state) => state.cancelPreview)
    const reset = useTrackStore((state) => state.reset)
    const closeLoop = useTrackStore((state) => state.closeLoop)
    const setPlacementMode = useTrackStore((state) => state.setPlacementMode)
    const placementMode = useTrackStore((state) => state.placementMode)
    const savePark = useTrackStore((state) => state.savePark)
    const loadPark = useTrackStore((state) => state.loadPark)
    const exportPark = useTrackStore((state) => state.exportPark)
    const importPark = useTrackStore((state) => state.importPark)
    const selectedSegmentId = useTrackStore((state) => state.selectedSegmentId)
    const selectSegment = useTrackStore((state) => state.selectSegment)
    const deleteSelectedSegment = useTrackStore((state) => state.deleteSelectedSegment)
    const resumeBuilding = useTrackStore((state) => state.resumeBuilding)
    const rides = useTrackStore((state) => state.rides)

    const previewSegment = useTrackStore((state) => state.previewSegment)
    const isBuilding = useTrackStore((state) => state.isBuilding)
    const currentDirection = useTrackStore((state) => state.currentDirection)
    const currentSlope = useTrackStore((state) => state.currentSlope)
    const lastNode = useTrackStore((state) => state.getLastNode())
    const activeRide = useTrackStore((state) => state.getActiveRide())
    const validationError = useTrackStore((state) => state.validationError)

    // Check if we can close the loop
    const canCloseLoop = (() => {
        if (!activeRide || !lastNode) return false

        // Require at least 3 segments to form a meaningful loop
        if (activeRide.segments.length < 3) return false

        const startNodeId = activeRide.id + '-node-0'
        const startNode = activeRide.nodes[startNodeId]
        if (!startNode) return false

        // Check if last node is different from start node
        if (lastNode.id === startNodeId) return false

        const dx = lastNode.position[0] - startNode.position[0]
        const dy = lastNode.position[1] - startNode.position[1]
        const dz = lastNode.position[2] - startNode.position[2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        return dist < 10 // Allow closing if within 10 units
    })()

    const placementRotation = useTrackStore((state) => state.placementRotation)
    const rotatePlacement = useTrackStore((state) => state.rotatePlacement)

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isBuilding) {
                if (e.key === 'Enter' && !validationError) commitPreview()
                if (e.key === 'Escape') cancelPreview()
            } else if (selectedSegmentId) {
                if (e.key === 'Delete' || e.key === 'Backspace') deleteSelectedSegment()
                if (e.key === 'Escape') selectSegment(null)
            } else if (placementMode === 'ACTIVE') {
                if (e.key === 'r' || e.key === 'R') rotatePlacement()
                if (e.key === 'Escape') setPlacementMode('INACTIVE')
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isBuilding, commitPreview, cancelPreview, validationError, selectedSegmentId, deleteSelectedSegment, selectSegment, placementMode, rotatePlacement, setPlacementMode])

    // If in placement mode, show instruction
    if (placementMode === 'ACTIVE') {
        return (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-xl pointer-events-auto">
                <div className="text-center text-gray-600 font-medium">
                    Click on the ground to place the ride start point
                </div>
                <div className="text-center text-gray-500 text-sm mt-1 mb-2">
                    Current Rotation: {Math.round(placementRotation * 180 / Math.PI)}°
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={rotatePlacement}
                        className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium shadow-sm"
                    >
                        Rotate (R)
                    </button>
                    <button
                        onClick={() => setPlacementMode('INACTIVE')}
                        className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium shadow-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        )
    }

    // If ride is complete, show completion modal
    if (activeRide?.isComplete) {
        return <RideCompletionModal />
    }

    // Selection Menu
    if (selectedSegmentId && !isBuilding) {
        const selectedRide = Object.values(rides).find(r => r.segments.some(s => s.id === selectedSegmentId))
        const selectedSegment = selectedRide?.segments.find(s => s.id === selectedSegmentId)

        if (!selectedRide || !selectedSegment) return null

        // Calculate ride statistics
        const totalLength = selectedRide.segments.reduce((acc, seg) => acc + seg.length, 0)
        const maxHeight = Object.values(selectedRide.nodes).reduce((max, node) => Math.max(max, node.position[1]), 0)
        const segmentCount = selectedRide.segments.length

        // Find segment index
        const segmentIndex = selectedRide.segments.findIndex(s => s.id === selectedSegmentId)

        // Check if the end of this segment is open (not connected to any other segment's start)
        const isEndOpen = !selectedRide.segments.some(s => s.startNodeId === selectedSegment.endNodeId)

        // Can resume building if ride is incomplete OR if end is open
        const canResume = !selectedRide.isComplete && isEndOpen

        return (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-xl flex flex-col gap-3 pointer-events-auto min-w-[400px] max-w-[500px]">
                {/* Ride Header */}
                <div className="text-center">
                    <div className="font-bold text-gray-800 text-lg">{selectedRide.name}</div>
                    <div className="text-xs text-gray-500">
                        {selectedRide.isComplete ? '✓ Complete Loop' : '○ In Progress'}
                    </div>
                </div>

                {/* Ride Statistics */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-blue-50 p-2 rounded-lg">
                        <div className="text-xs text-gray-600">Length</div>
                        <div className="font-bold text-blue-600">{Math.round(totalLength)}m</div>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-lg">
                        <div className="text-xs text-gray-600">Height</div>
                        <div className="font-bold text-emerald-600">{Math.round(maxHeight * 10) / 10}m</div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded-lg">
                        <div className="text-xs text-gray-600">Segments</div>
                        <div className="font-bold text-purple-600">{segmentCount}</div>
                    </div>
                </div>

                {/* Selected Segment Info */}
                <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Segment #{segmentIndex + 1}</div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                            <div className="text-xs text-gray-500">Direction</div>
                            <div className="font-medium text-gray-800">{selectedSegment.direction}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Slope</div>
                            <div className="font-medium text-gray-800">{selectedSegment.slope}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Length</div>
                            <div className="font-medium text-gray-800">{Math.round(selectedSegment.length)}m</div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-gray-300" />

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={deleteSelectedSegment}
                        className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium shadow-sm"
                    >
                        Delete
                    </button>
                    {canResume && (
                        <button
                            onClick={() => resumeBuilding(selectedRide.id, selectedSegment.endNodeId)}
                            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium shadow-sm"
                        >
                            Resume Building
                        </button>
                    )}
                </div>
                <button
                    onClick={() => selectSegment(null)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium shadow-sm w-full text-sm"
                >
                    Close (Esc)
                </button>
            </div>
        )
    }

    if (isBuilding) {
        return (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-xl flex flex-col gap-4 pointer-events-auto min-w-[400px] items-center">

                {/* Info Tooltip */}
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 bg-black/80 text-white p-3 rounded-lg text-sm pointer-events-none whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                        <div>Current Height: <span className="font-bold text-emerald-400">{lastNode ? Math.round(lastNode.position[1] * 10) / 10 : 0}m</span></div>
                        <div>Grid Usage: <span className="font-bold text-blue-400">4x4</span></div>
                        {previewSegment && (
                            <div className="text-xs text-gray-400 mt-1">
                                Next Height: {Math.round(previewSegment.controlPoints[3][1] * 10) / 10}m
                            </div>
                        )}
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-black/80" />
                </div>

                {/* Validation Error */}
                {validationError && (
                    <div className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative text-center font-bold text-sm">
                        {validationError}
                    </div>
                )}

                <div className="flex flex-col gap-4 w-full">
                    {/* Direction Controls */}
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-gray-600">Direction</span>
                        <div className="flex gap-2 justify-center">
                            {(['LEFT', 'STRAIGHT', 'RIGHT'] as TrackDirection[]).map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setDirection(d)}
                                    className={`px-4 py-2 rounded-lg transition-colors font-medium shadow-sm flex-1 ${currentDirection === d
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Slope Controls */}
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-gray-600">Slope</span>
                        <div className="flex gap-2 justify-center">
                            {(['DOWN', 'FLAT', 'UP'] as TrackSlope[]).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setSlope(s)}
                                    className={`px-4 py-2 rounded-lg transition-colors font-medium shadow-sm flex-1 ${currentSlope === s
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="h-px bg-gray-300 w-full my-2" />

                <div className="flex gap-2 w-full">
                    <button
                        onClick={commitPreview}
                        disabled={!!validationError}
                        className={`flex-1 px-6 py-2 text-white rounded-lg transition-colors font-bold shadow-sm ${validationError
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-500 hover:bg-green-600'
                            }`}
                    >
                        Build (Enter)
                    </button>
                    {canCloseLoop && (
                        <button
                            onClick={closeLoop}
                            className="flex-1 px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors font-bold shadow-sm"
                        >
                            Finish (Close Loop)
                        </button>
                    )}
                    <button
                        onClick={cancelPreview}
                        className="flex-1 px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium shadow-sm"
                    >
                        Stop Building (Esc)
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-xl flex flex-col gap-2 pointer-events-auto">
            <h1 className="text-xl font-bold text-gray-800 mb-2">Roller Coaster Tycoon</h1>

            <div className="flex gap-2">
                <button
                    onClick={() => setPlacementMode('ACTIVE')}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm"
                >
                    Place New Ride
                </button>
            </div>

            <div className="h-px bg-gray-200 my-1" />

            <div className="flex gap-2">
                <button
                    onClick={savePark}
                    className="flex-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg transition-colors font-medium shadow-sm"
                >
                    Save Park
                </button>
                <button
                    onClick={loadPark}
                    className="flex-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-lg transition-colors font-medium shadow-sm"
                >
                    Load Park
                </button>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={exportPark}
                    className="flex-1 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-lg transition-colors font-medium shadow-sm"
                >
                    Export JSON
                </button>
                <label className="flex-1 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-sm rounded-lg transition-colors font-medium shadow-sm text-center cursor-pointer">
                    Import JSON
                    <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                                const reader = new FileReader()
                                reader.onload = (e) => {
                                    const content = e.target?.result as string
                                    importPark(content)
                                }
                                reader.readAsText(file)
                            }
                            e.target.value = ''
                        }}
                    />
                </label>
            </div>

            <div className="mt-2 text-xs text-gray-500">
                {Object.keys(rides).length} rides in park
            </div>

            <div className="h-px bg-gray-200 my-1" />

            <div className="flex gap-2 justify-center">
                <button
                    onClick={reset}
                    className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors font-medium shadow-sm w-full"
                >
                    Clear All
                </button>
            </div>
        </div>
    )
}
