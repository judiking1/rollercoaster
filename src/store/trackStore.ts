import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { calculateNextTrackSegment, checkCollision, calculateForwardVector } from '../utils/trackUtils'
import * as THREE from 'three'

export type TrackDirection = 'STRAIGHT' | 'LEFT' | 'RIGHT'
export type TrackSlope = 'FLAT' | 'UP' | 'DOWN'

export interface TrackNode {
    id: string
    position: [number, number, number]
    rotation: [number, number, number, number] // Quaternion [x, y, z, w]
    tangent: [number, number, number] // Direction vector
    normal: [number, number, number] // Up vector
    type?: 'START' | 'NORMAL'
}

export interface TrackSegmentData {
    id: string
    direction: TrackDirection
    slope: TrackSlope
    startNodeId: string
    endNodeId: string
    controlPoints: [number, number, number][] // Bezier control points
    length: number
}

export interface Ride {
    id: string
    name: string
    nodes: Record<string, TrackNode>
    segments: TrackSegmentData[]
    isComplete: boolean
    stats: {
        length: number
        maxHeight: number
        maxSpeed: number
    }
}

interface TrackState {
    rides: Record<string, Ride>
    activeRideId: string | null
    activeNodeId: string | null // The node we are currently building from
    previewSegment: TrackSegmentData | null
    validationError: string | null

    // Builder State
    currentDirection: TrackDirection
    currentSlope: TrackSlope
    isBuilding: boolean

    // Edit State
    selectedSegmentId: string | null

    // Placement State
    placementMode: 'ACTIVE' | 'INACTIVE'
    placementRotation: number // Rotation in radians around Y axis
    ghostPosition: [number, number, number] | null

    // Actions
    setPlacementMode: (mode: 'ACTIVE' | 'INACTIVE') => void
    setGhostPosition: (position: [number, number, number] | null) => void
    rotatePlacement: () => void
    createRide: (startPosition: [number, number, number]) => void
    setActiveRide: (rideId: string) => void
    startBuilding: () => void
    setDirection: (direction: TrackDirection) => void
    setSlope: (slope: TrackSlope) => void
    commitPreview: () => void
    cancelPreview: () => void
    removeLastSegment: () => void
    reset: () => void
    closeLoop: () => void
    finalizeRide: (name: string) => void
    savePark: () => void
    loadPark: () => void
    exportPark: () => void
    importPark: (jsonContent: string) => void

    // Edit Actions
    selectSegment: (segmentId: string | null) => void
    deleteSelectedSegment: () => void
    resumeBuilding: (rideId: string, nodeId: string) => void

    // Helpers
    getActiveRide: () => Ride | undefined
    getLastNode: () => TrackNode | undefined
    updatePreview: () => void
}

export const useTrackStore = create<TrackState>((set, get) => ({
    rides: {},
    activeRideId: null,
    activeNodeId: null,
    previewSegment: null,
    validationError: null,
    currentDirection: 'STRAIGHT',
    currentSlope: 'FLAT',
    isBuilding: false,
    selectedSegmentId: null,
    placementMode: 'INACTIVE',
    placementRotation: 0,
    ghostPosition: null,

    setPlacementMode: (mode) => set({ placementMode: mode }),
    setGhostPosition: (position) => set({ ghostPosition: position }),

    rotatePlacement: () => set((state) => ({ placementRotation: state.placementRotation + Math.PI / 2 })),

    selectSegment: (segmentId) => set({ selectedSegmentId: segmentId }),

    resumeBuilding: (rideId, nodeId) => {
        const state = get()
        const ride = state.rides[rideId]
        if (!ride) return

        let targetNodeId = nodeId

        // If no specific node provided, try to find a good default
        if (!targetNodeId) {
            if (ride.segments.length > 0) {
                // Default to the end of the last segment
                targetNodeId = ride.segments[ride.segments.length - 1].endNodeId
            } else {
                // Default to start node (try new format first, fallback to old)
                targetNodeId = `${rideId}-node-0`
                if (!ride.nodes[targetNodeId]) {
                    targetNodeId = `start-node-${rideId}`
                }
            }
        }

        set({
            activeRideId: rideId,
            isBuilding: true,
            selectedSegmentId: null,
            activeNodeId: targetNodeId
        })

        get().updatePreview()
    },

    deleteSelectedSegment: () => {
        const state = get()
        const { selectedSegmentId, rides } = state
        if (!selectedSegmentId) return

        // Find which ride has this segment
        let targetRideId: string | null = null
        let targetRide: Ride | null = null

        for (const rideId in rides) {
            if (rides[rideId].segments.some(s => s.id === selectedSegmentId)) {
                targetRideId = rideId
                targetRide = rides[rideId]
                break
            }
        }

        if (!targetRideId || !targetRide) return

        // Find the segment to delete
        const segmentToDelete = targetRide.segments.find(s => s.id === selectedSegmentId)
        if (!segmentToDelete) return

        // Remove segment
        const newSegments = targetRide.segments.filter(s => s.id !== selectedSegmentId)

        // Identify orphaned nodes
        // A node is orphaned if it is not referenced by any remaining segment
        const usedNodeIds = new Set<string>()
        newSegments.forEach(s => {
            usedNodeIds.add(s.startNodeId)
            usedNodeIds.add(s.endNodeId)
        })

        // Always keep the ride's main start node (use correct format)
        const rideStartNodeId = `${targetRideId}-node-0`
        usedNodeIds.add(rideStartNodeId)

        const newNodes: Record<string, TrackNode> = {}
        Object.values(targetRide.nodes).forEach(node => {
            if (usedNodeIds.has(node.id)) {
                newNodes[node.id] = node
            }
        })

        // Update ride
        const updatedRide = {
            ...targetRide,
            segments: newSegments,
            nodes: newNodes,
            isComplete: false
        }

        set({
            rides: { ...rides, [targetRideId]: updatedRide },
            selectedSegmentId: null
        })
    },

    savePark: () => {
        const { rides } = get()
        try {
            localStorage.setItem('rollercoaster_park_data', JSON.stringify(rides))
            alert('Park saved successfully!')
        } catch (e) {
            console.error('Failed to save park:', e)
            alert('Failed to save park.')
        }
    },

    loadPark: () => {
        try {
            const data = localStorage.getItem('rollercoaster_park_data')
            if (data) {
                const rides = JSON.parse(data)
                set({ rides, activeRideId: null, isBuilding: false, placementMode: 'INACTIVE' })
                alert('Park loaded successfully!')
            } else {
                alert('No saved park found.')
            }
        } catch (e) {
            console.error('Failed to load park:', e)
            alert('Failed to load park.')
        }
    },

    exportPark: () => {
        const { rides } = get()

        // Custom replacer to round numbers to 4 decimal places
        const replacer = (_key: string, value: any) => {
            if (typeof value === 'number') {
                return Number(value.toFixed(4))
            }
            return value
        }

        const dataStr = JSON.stringify(rides, replacer, 2)
        const blob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        // Use explicit date formatting to avoid locale issues
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const filename = `park-${year}-${month}-${day}.json`

        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    },

    importPark: (jsonContent: string) => {
        try {
            const rides = JSON.parse(jsonContent)
            if (typeof rides !== 'object') throw new Error('Invalid JSON format')

            set({ rides, activeRideId: null, isBuilding: false, placementMode: 'INACTIVE' })
            alert('Park imported successfully!')
        } catch (e) {
            console.error('Failed to import park:', e)
            alert('Failed to import park. Invalid file format.')
        }
    },

    getActiveRide: () => {
        const { rides, activeRideId } = get()
        if (!activeRideId) return undefined
        return rides[activeRideId]
    },

    getLastNode: () => {
        const { rides, activeRideId, activeNodeId } = get()
        if (!activeRideId) return undefined
        const ride = rides[activeRideId]
        if (!ride) return undefined

        // If we have an explicit activeNodeId, use it
        if (activeNodeId && ride.nodes[activeNodeId]) {
            return ride.nodes[activeNodeId]
        }

        // Fallback to the end of the last segment
        if (ride.segments.length > 0) {
            const lastSegment = ride.segments[ride.segments.length - 1]
            return ride.nodes[lastSegment.endNodeId]
        }

        // If no segments, return start node
        const startNodeId = `${activeRideId}-node-0`
        return ride.nodes[startNodeId]
    },

    createRide: (startPosition) => {
        const state = get()
        const rideIndex = Object.keys(state.rides).length + 1
        const rideId = `ride-${rideIndex}`
        const rideName = `Ride ${rideIndex}`

        const rotation = state.placementRotation

        // Calculate initial tangent based on rotation
        const tangent: [number, number, number] = [
            Math.sin(rotation),
            0,
            Math.cos(rotation)
        ]

        // Create Start Node
        const startNodeId = `${rideId}-node-0`
        const startNode: TrackNode = {
            id: startNodeId,
            position: startPosition,
            rotation: [0, Math.sin(rotation / 2), 0, Math.cos(rotation / 2)],
            tangent,
            normal: [0, 1, 0],
            type: 'START'
        }

        // Create End Node (Initial Segment)
        // Default length 4 units in the direction of tangent
        const endNodeId = `${rideId}-node-1`
        const endPosition: [number, number, number] = [
            startPosition[0] + tangent[0] * 4,
            startPosition[1] + tangent[1] * 4,
            startPosition[2] + tangent[2] * 4
        ]

        const endNode: TrackNode = {
            id: endNodeId,
            position: endPosition,
            rotation: [0, Math.sin(rotation / 2), 0, Math.cos(rotation / 2)],
            tangent,
            normal: [0, 1, 0],
            type: 'NORMAL'
        }

        // Create Segment
        const segmentId = `${rideId}-segment-0`
        const segment: TrackSegmentData = {
            id: segmentId,
            startNodeId,
            endNodeId,
            direction: 'STRAIGHT',
            slope: 'FLAT',
            length: 4,
            controlPoints: [
                startPosition,
                [startPosition[0] + tangent[0], startPosition[1] + tangent[1], startPosition[2] + tangent[2]],
                [endPosition[0] - tangent[0], endPosition[1] - tangent[1], endPosition[2] - tangent[2]],
                endPosition
            ]
        }

        const newRide: Ride = {
            id: rideId,
            name: rideName,
            segments: [segment],
            nodes: {
                [startNodeId]: startNode,
                [endNodeId]: endNode
            },
            isComplete: false,
            stats: { length: 4, maxHeight: startPosition[1], maxSpeed: 0 }
        }

        set((state) => ({
            rides: { ...state.rides, [rideId]: newRide },
            activeRideId: rideId,
            activeNodeId: endNodeId, // Continue building from the end of the first segment
            isBuilding: true,
            placementMode: 'INACTIVE',
            previewSegment: null,
            placementRotation: 0 // Reset rotation
        }))

        get().updatePreview()
    },

    setActiveRide: (rideId) => {
        set({ activeRideId: rideId })
    },

    updatePreview: () => {
        const state = get()
        const { currentDirection, currentSlope, rides } = state
        const ride = state.getActiveRide()

        if (!ride) return

        const lastNode = state.getLastNode()
        if (!lastNode) return

        const { endNode, controlPoints, length } = calculateNextTrackSegment(lastNode, currentDirection, currentSlope)

        // Collision Check with smart gap detection
        const allSegments: TrackSegmentData[] = []
        Object.values(rides).forEach(r => allSegments.push(...r.segments))

        // Build list of segments to exclude from collision check
        const excludeSegmentIds: string[] = []

        // 1. Always exclude all segments connected to the current node (lastNode)
        ride.segments.forEach(segment => {
            if (segment.endNodeId === lastNode.id || segment.startNodeId === lastNode.id) {
                excludeSegmentIds.push(segment.id)
            }
        })

        // 2. Smart gap detection: Find if we're trying to connect to an open node
        //    An open node is one that has only one segment connected to it
        const openNodes: string[] = []
        const nodeConnections = new Map<string, number>()

        // Count connections for each node
        ride.segments.forEach(segment => {
            nodeConnections.set(segment.startNodeId, (nodeConnections.get(segment.startNodeId) || 0) + 1)
            nodeConnections.set(segment.endNodeId, (nodeConnections.get(segment.endNodeId) || 0) + 1)
        })

        // Find open nodes (nodes with only 1 connection, excluding start node)
        const startNodeId = `${ride.id}-node-0`
        for (const [nodeId, connections] of nodeConnections.entries()) {
            if (connections === 1 && nodeId !== startNodeId) {
                openNodes.push(nodeId)
            }
        }

        // Check if preview's end position is near any open node
        const endPos = endNode.position
        for (const openNodeId of openNodes) {
            const openNode = ride.nodes[openNodeId]
            if (!openNode || openNodeId === lastNode.id) continue

            const dx = endPos[0] - openNode.position[0]
            const dy = endPos[1] - openNode.position[1]
            const dz = endPos[2] - openNode.position[2]
            const distToOpen = Math.sqrt(dx * dx + dy * dy + dz * dz)

            // If we're close to an open node (within 6 units), exclude its connected segment
            if (distToOpen < 6) {
                ride.segments.forEach(segment => {
                    if (segment.startNodeId === openNodeId || segment.endNodeId === openNodeId) {
                        if (!excludeSegmentIds.includes(segment.id)) {
                            excludeSegmentIds.push(segment.id)
                        }
                    }
                })
            }
        }

        // 3. When close to completing a loop, also exclude the first segment
        if (ride.segments.length > 0) {
            const firstSegment = ride.segments[0]
            const firstStartNodeId = firstSegment.startNodeId
            const firstStartNode = ride.nodes[firstStartNodeId]

            if (firstStartNode) {
                const dx = endPos[0] - firstStartNode.position[0]
                const dy = endPos[1] - firstStartNode.position[1]
                const dz = endPos[2] - firstStartNode.position[2]
                const distToStart = Math.sqrt(dx * dx + dy * dy + dz * dz)

                if (distToStart < 6 && !excludeSegmentIds.includes(firstSegment.id)) {
                    excludeSegmentIds.push(firstSegment.id)
                }
            }
        }

        const isColliding = checkCollision(controlPoints, allSegments, excludeSegmentIds)

        set({
            previewSegment: {
                id: 'preview',
                direction: currentDirection,
                slope: currentSlope,
                startNodeId: lastNode.id,
                endNodeId: endNode.id,
                controlPoints,
                length
            },
            validationError: isColliding ? 'Track overlaps with existing segment!' : null
        })
    },

    startBuilding: () => {
        if (!get().activeRideId) {
            get().createRide([0, 0, 0])
        }
        set({ isBuilding: true, currentDirection: 'STRAIGHT', currentSlope: 'FLAT' })
        get().updatePreview()
    },

    setDirection: (direction) => {
        set({ currentDirection: direction })
        if (get().isBuilding) {
            get().updatePreview()
        }
    },

    setSlope: (slope) => {
        set({ currentSlope: slope })
        if (get().isBuilding) {
            get().updatePreview()
        }
    },

    commitPreview: () => {
        const state = get()
        const { previewSegment, activeRideId, rides, validationError } = state

        if (!previewSegment || !activeRideId || validationError) return

        const ride = rides[activeRideId]
        if (!ride) return

        // Generate readable IDs
        const segmentIndex = ride.segments.length
        const nodeIndex = Object.keys(ride.nodes).length

        // Use a fallback if ID collision (though unlikely with sequential)
        // Or just append random string if needed, but user asked for readable
        const newSegmentId = `${activeRideId}-segment-${segmentIndex}`
        const newNodeId = `${activeRideId}-node-${nodeIndex}`

        const newSegment: TrackSegmentData = {
            ...previewSegment,
            id: newSegmentId,
            endNodeId: newNodeId // Update endNodeId to match the new node ID
        }

        const newNode: TrackNode = {
            id: newNodeId,
            position: previewSegment.controlPoints[3],
            rotation: [0, 0, 0, 1], // Simplified
            tangent: calculateForwardVector(previewSegment.controlPoints),
            normal: [0, 1, 0], // Simplified
            type: 'NORMAL'
        }

        const updatedRide = {
            ...ride,
            segments: [...ride.segments, newSegment],
            nodes: { ...ride.nodes, [newNode.id]: newNode }
        }

        set({
            rides: { ...rides, [activeRideId]: updatedRide },
            activeNodeId: newNode.id, // Advance cursor
            previewSegment: null
        })

        get().updatePreview()
    },

    cancelPreview: () => {
        set({ isBuilding: false, previewSegment: null, activeRideId: null, activeNodeId: null })
    },

    removeLastSegment: () => {
        // Legacy action, might not be needed with deleteSelectedSegment
        // But useful for "Undo"
        set((state) => {
            const { activeRideId, rides } = state
            if (!activeRideId || !rides[activeRideId]) return state

            const ride = rides[activeRideId]
            if (ride.segments.length === 0) return state

            const newSegments = [...ride.segments]
            const removedSegment = newSegments.pop()

            const newNodes = { ...ride.nodes }
            if (removedSegment) {
                delete newNodes[removedSegment.endNodeId]
            }

            const updatedRide = {
                ...ride,
                segments: newSegments,
                nodes: newNodes
            }

            return {
                rides: { ...rides, [activeRideId]: updatedRide }
            }
        })

        if (get().isBuilding) {
            get().updatePreview()
        }
    },

    reset: () => set({ rides: {}, activeRideId: null, previewSegment: null, isBuilding: false, activeNodeId: null }),

    closeLoop: () => {
        const state = get()
        const { activeRideId, rides } = state
        const ride = state.getActiveRide()
        const lastNode = state.getLastNode()

        if (!ride || !lastNode || !activeRideId) return

        const startNodeId = `${activeRideId}-node-0`
        const startNode = ride.nodes[startNodeId]

        if (!startNode) return

        const p0 = new THREE.Vector3(...lastNode.position)
        const p3 = new THREE.Vector3(...startNode.position)
        const dist = p0.distanceTo(p3)

        const t0 = new THREE.Vector3(...lastNode.tangent)
        const t3 = new THREE.Vector3(...startNode.tangent)

        const scale = dist * 0.4
        const p1 = p0.clone().add(t0.clone().multiplyScalar(scale))
        const p2 = p3.clone().sub(t3.clone().multiplyScalar(scale))

        const controlPoints: [number, number, number][] = [
            [p0.x, p0.y, p0.z],
            [p1.x, p1.y, p1.z],
            [p2.x, p2.y, p2.z],
            [p3.x, p3.y, p3.z]
        ]

        const newSegment: TrackSegmentData = {
            id: uuidv4(),
            direction: 'STRAIGHT',
            slope: 'FLAT',
            startNodeId: lastNode.id,
            endNodeId: startNode.id,
            controlPoints,
            length: dist
        }

        const updatedRide = {
            ...ride,
            segments: [...ride.segments, newSegment],
            isComplete: true
        }

        set({
            rides: { ...rides, [activeRideId]: updatedRide },
            previewSegment: null,
            // Keep activeRideId so modal shows up
        })
    },

    finalizeRide: (name: string) => {
        const state = get()
        const { activeRideId, rides } = state
        if (!activeRideId || !rides[activeRideId]) return

        const ride = rides[activeRideId]
        let length = 0
        let maxHeight = 0
        ride.segments.forEach(s => {
            length += s.length
            s.controlPoints.forEach(p => {
                if (p[1] > maxHeight) maxHeight = p[1]
            })
        })

        const updatedRide = {
            ...ride,
            name,
            stats: { ...ride.stats, length, maxHeight }
        }

        set({
            rides: { ...rides, [activeRideId]: updatedRide },
            activeRideId: null,
            activeNodeId: null,
            isBuilding: false,
            placementMode: 'INACTIVE'
        })
    }
}))
