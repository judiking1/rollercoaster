import { Scene } from './components/3d/Scene'
import { TrackEditor } from './components/ui/TrackEditor'

function App() {
  return (
    <div className="w-full h-screen bg-gray-900 relative">
      <Scene />

      {/* UI Overlay */}
      <div className="absolute top-4 left-4 p-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg pointer-events-none select-none">
        <h1 className="text-xl font-bold text-gray-800">Roller Coaster Tycoon Web</h1>
        <p className="text-sm text-gray-600">Pre-Alpha Build</p>
        <div className="mt-2 text-xs text-gray-500">
          <p>Left Click: Rotate</p>
          <p>Right Click: Pan</p>
          <p>Scroll: Zoom</p>
        </div>
      </div>

      <TrackEditor />
    </div>
  )
}

export default App
