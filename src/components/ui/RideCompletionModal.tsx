import { useState } from 'react'
import { useTrackStore } from '../../store/trackStore'

export const RideCompletionModal = () => {
    const activeRide = useTrackStore((state) => state.getActiveRide())
    const cancelPreview = useTrackStore((state) => state.cancelPreview)
    const [rideName, setRideName] = useState('')

    if (!activeRide || !activeRide.isComplete) return null

    const handleFinish = () => {
        // TODO: Update ride name in store
        cancelPreview() // Close modal and clear active ride
    }

    // Calculate stats
    const totalLength = Object.values(activeRide.segments).reduce((acc, seg) => acc + seg.length, 0)
    const maxHeight = Object.values(activeRide.nodes).reduce((max, node) => Math.max(max, node.position[1]), 0)

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-[500px] flex flex-col gap-6">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Ride Complete!</h2>
                    <p className="text-gray-500">Your masterpiece is ready.</p>
                </div>

                <div className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ride Name</label>
                        <input
                            type="text"
                            value={rideName}
                            onChange={(e) => setRideName(e.target.value)}
                            placeholder={activeRide.name}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <div className="text-sm text-gray-500">Total Length</div>
                            <div className="text-2xl font-bold text-blue-600">{Math.round(totalLength)}m</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <div className="text-sm text-gray-500">Max Height</div>
                            <div className="text-2xl font-bold text-emerald-600">{Math.round(maxHeight * 10) / 10}m</div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleFinish}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg shadow-lg transform transition-all hover:scale-[1.02]"
                >
                    Save & Finish
                </button>
            </div>
        </div>
    )
}
