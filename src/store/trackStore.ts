import { create } from 'zustand'
import { calculateNextTrackSegment, checkCollision, calculateForwardVector } from '../utils/trackUtils'
import * as THREE from 'three'

export type TrackDirection = 'STRAIGHT' | 'LEFT' | 'RIGHT'
export type TrackSlope = 'FLAT' | 'UP' | 'DOWN'

// --- V2 Data Structures ---

export interface TrackNode {
    id: string
    position: [number, number, number]
    rotation: [number, number, number, number] // Quaternion [x, y, z, w]
    tangent: [number, number, number] // Forward vector

    // Connectivity: A node is a point. It can have ONE incoming and ONE outgoing segment.
    outgoingSegmentId: string | null
    incomingSegmentId: string | null

    type: 'STATION_START' | 'STATION_END' | 'NORMAL'
}

export interface TrackSegment {
    id: string
    startNodeId: string
    endNodeId: string

    // Geometry
    controlPoints: [number, number, number][]
    length: number
    direction: TrackDirection
    slope: TrackSlope
}

export interface Ride {
    id: string
    name: string
    nodes: Record<string, TrackNode>
    segments: Record<string, TrackSegment>

    // Counters for unique IDs
    nextSegmentId: number
    nextNodeId: number

    isComplete: boolean
}

interface TrackState {
    rides: Record<string, Ride>
    activeRideId: string | null
    activeNodeId: string | null // The "Head" node we are currently building FROM

    // Preview State
    previewSegment: TrackSegment | null
    snapTargetId: string | null // If set, we are snapping to this node
    validationError: string | null

    // Builder Settings
    currentDirection: TrackDirection
    currentSlope: TrackSlope
    isBuilding: boolean

    // Edit State
    selectedSegmentId: string | null

    // Placement State
    placementMode: 'ACTIVE' | 'INACTIVE'
    placementRotation: number
    ghostPosition: [number, number, number] | null

    // Actions
    setPlacementMode: (mode: 'ACTIVE' | 'INACTIVE') => void
    setGhostPosition: (position: [number, number, number] | null) => void
    rotatePlacement: () => void

    createRide: (startPosition: [number, number, number]) => void
    setActiveRide: (rideId: string | null) => void

    startBuilding: () => void
    setDirection: (direction: TrackDirection) => void
    setSlope: (slope: TrackSlope) => void

    commitPreview: () => void // The ONLY way to add a segment
    cancelPreview: () => void

    selectSegment: (segmentId: string | null) => void
    deleteSelectedSegment: () => void
    resumeBuilding: (rideId: string, nodeId: string) => void

    // Helpers
    getActiveRide: () => Ride | undefined
    getLastNode: () => TrackNode | undefined // Returns the node at activeNodeId
    getOpenNodes: () => { nodeId: string, node: TrackNode, type: 'HEAD' | 'TAIL' }[]
    updatePreview: () => void

    // Persistence
    savePark: () => void
    loadPark: () => void
    exportPark: () => void
    importPark: (jsonContent: string) => void
    reset: () => void
}

export const useTrackStore = create<TrackState>((set, get) => ({
    rides: {},
    activeRideId: null,
    activeNodeId: null,
    previewSegment: null,
    snapTargetId: null,
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

    createRide: (startPosition) => {
        const state = get()
        const rideIndex = Object.keys(state.rides).length + 1
        const rideId = `ride-${rideIndex}`
        const rideName = `Ride ${rideIndex}`
        const rotation = state.placementRotation

        // Initial Tangent
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
            outgoingSegmentId: null,
            incomingSegmentId: null,
            type: 'STATION_START'
        }

        const newRide: Ride = {
            id: rideId,
            name: rideName,
            nodes: { [startNodeId]: startNode },
            segments: {},
            nextSegmentId: 0,
            nextNodeId: 1,
            isComplete: false
        }

        set({
            rides: { ...state.rides, [rideId]: newRide },
            activeRideId: rideId,
            activeNodeId: startNodeId,
            isBuilding: true,
            placementMode: 'INACTIVE',
            previewSegment: null,
            placementRotation: 0
        })
        get().updatePreview()
    },

    setActiveRide: (rideId) => set({ activeRideId: rideId }),

    startBuilding: () => {
        const state = get()
        if (!state.activeRideId) {
            // If no ride, create one at 0,0,0 (fallback)
            state.createRide([0, 0, 0])
        } else {
            // Resume from the last added node if activeNodeId is missing
            let nodeId = state.activeNodeId
            const ride = state.rides[state.activeRideId]
            if (!nodeId && ride) {
                // Find a node with no outgoing segment (Open Tail)
                const openTail = Object.values(ride.nodes).find(n => n.outgoingSegmentId === null)
                if (openTail) nodeId = openTail.id
            }

            set({
                isBuilding: true,
                activeNodeId: nodeId,
                currentDirection: 'STRAIGHT',
                currentSlope: 'FLAT'
            })
            get().updatePreview()
        }
    },

    setDirection: (direction) => {
        set({ currentDirection: direction })
        get().updatePreview()
    },

    setSlope: (slope) => {
        set({ currentSlope: slope })
        get().updatePreview()
    },

    updatePreview: () => {
        const state = get()
        const { activeRideId, activeNodeId, currentDirection, currentSlope, rides } = state

        if (!activeRideId || !activeNodeId) return
        const ride = rides[activeRideId]
        if (!ride) return

        const fromNode = ride.nodes[activeNodeId]
        if (!fromNode) return

        // 1. Calculate Ideal Next Segment
        const { endNode: idealEndNode, controlPoints, length } = calculateNextTrackSegment(fromNode, currentDirection, currentSlope)

        // 2. Scan for Snap Targets (Snap-First Logic)
        let snapTargetId: string | null = null
        let finalControlPoints = controlPoints
        let finalLength = length
        let finalEndNodeId = 'preview-end' // Placeholder

        const SNAP_RADIUS = 10
        const segmentCount = Object.keys(ride.segments).length

        // Only snap if we have enough segments (>= 3) to avoid immediate loop closure
        if (segmentCount >= 3) {
            const potentialTargets = Object.values(ride.nodes).filter(n =>
                n.id !== fromNode.id &&
                n.incomingSegmentId === null
            )

            for (const target of potentialTargets) {
                const dx = target.position[0] - idealEndNode.position[0]
                const dy = target.position[1] - idealEndNode.position[1]
                const dz = target.position[2] - idealEndNode.position[2]
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

                if (dist < SNAP_RADIUS) {
                    snapTargetId = target.id

                    // Recalculate Curve to Snap
                    const p0 = new THREE.Vector3(...fromNode.position)
                    const p3 = new THREE.Vector3(...target.position)
                    const distToTarget = p0.distanceTo(p3)

                    const t0 = new THREE.Vector3(...fromNode.tangent)
                    const t3 = new THREE.Vector3(...target.tangent)

                    // Scale handles based on distance
                    const scale = distToTarget * 0.4
                    const p1 = p0.clone().add(t0.clone().multiplyScalar(scale))
                    const p2 = p3.clone().sub(t3.clone().multiplyScalar(scale))

                    finalControlPoints = [
                        [p0.x, p0.y, p0.z],
                        [p1.x, p1.y, p1.z],
                        [p2.x, p2.y, p2.z],
                        [p3.x, p3.y, p3.z]
                    ]
                    finalLength = distToTarget
                    finalEndNodeId = target.id
                    break // Found a target, stop looking
                }
            }
        }

        // 3. Collision Detection
        const allSegments: any[] = []
        Object.values(rides).forEach(r => Object.values(r.segments).forEach(s => allSegments.push(s)))

        const excludeSegmentIds: string[] = []
        if (fromNode.incomingSegmentId) excludeSegmentIds.push(fromNode.incomingSegmentId)
        if (fromNode.outgoingSegmentId) excludeSegmentIds.push(fromNode.outgoingSegmentId)

        if (snapTargetId) {
            const target = ride.nodes[snapTargetId]
            if (target.outgoingSegmentId) excludeSegmentIds.push(target.outgoingSegmentId)
        }

        const isColliding = checkCollision(finalControlPoints, allSegments, excludeSegmentIds)

        set({
            previewSegment: {
                id: 'preview',
                startNodeId: fromNode.id,
                endNodeId: finalEndNodeId,
                controlPoints: finalControlPoints,
                length: finalLength,
                direction: currentDirection,
                slope: currentSlope
            },
            snapTargetId,
            validationError: isColliding ? 'Track overlaps with existing segment!' : null
        })
    },

    commitPreview: () => {
        const state = get()
        const { activeRideId, activeNodeId, previewSegment, snapTargetId, validationError, rides } = state

        if (!activeRideId || !activeNodeId || !previewSegment || validationError) return
        const ride = rides[activeRideId]
        if (!ride) return

        const fromNode = ride.nodes[activeNodeId]
        if (!fromNode) return

        // Generate IDs
        const newSegmentId = `${activeRideId}-segment-${ride.nextSegmentId}`
        let nextNodeIdCounter = ride.nextNodeId

        // Determine End Node
        let endNode: TrackNode

        if (snapTargetId) {
            // Connect to existing node
            endNode = ride.nodes[snapTargetId]
            // Validate again just in case
            if (endNode.incomingSegmentId !== null) {
                console.error("Snap target already has incoming segment")
                return
            }
        } else {
            // Create New Node
            const newNodeId = `${activeRideId}-node-${nextNodeIdCounter}`
            nextNodeIdCounter++

            // Calculate tangent at end of curve
            const tangent = calculateForwardVector(previewSegment.controlPoints)

            endNode = {
                id: newNodeId,
                position: previewSegment.controlPoints[3],
                rotation: [0, 0, 0, 1], // Simplified, should calculate from tangent
                tangent,
                outgoingSegmentId: null,
                incomingSegmentId: null,
                type: 'NORMAL'
            }
        }

        // Create Segment
        const newSegment: TrackSegment = {
            ...previewSegment,
            id: newSegmentId,
            startNodeId: fromNode.id,
            endNodeId: endNode.id
        }

        // Update Nodes
        const updatedFromNode = { ...fromNode, outgoingSegmentId: newSegmentId }
        const updatedEndNode = { ...endNode, incomingSegmentId: newSegmentId }

        // Update Ride
        const updatedNodes = { ...ride.nodes, [fromNode.id]: updatedFromNode, [endNode.id]: updatedEndNode }
        const updatedSegments = { ...ride.segments, [newSegmentId]: newSegment }

        const updatedRide: Ride = {
            ...ride,
            nodes: updatedNodes,
            segments: updatedSegments,
            nextSegmentId: ride.nextSegmentId + 1,
            nextNodeId: nextNodeIdCounter,
            isComplete: snapTargetId ? true : false // If we snapped, we likely closed a loop or connected parts
        }

        set({
            rides: { ...rides, [activeRideId]: updatedRide },
            activeNodeId: endNode.id, // Advance cursor
            previewSegment: null,
            snapTargetId: null
        })

        // If we snapped, we might want to stop building or just update preview
        if (snapTargetId) {
            set({ isBuilding: false })
        } else {
            get().updatePreview()
        }
    },

    cancelPreview: () => {
        set({ isBuilding: false, previewSegment: null, activeRideId: null, activeNodeId: null })
    },

    selectSegment: (segmentId) => set({ selectedSegmentId: segmentId }),

    deleteSelectedSegment: () => {
        const state = get()
        const { selectedSegmentId, rides } = state
        if (!selectedSegmentId) return

        // Find Ride
        let targetRideId: string | null = null
        for (const rideId in rides) {
            if (rides[rideId].segments[selectedSegmentId]) {
                targetRideId = rideId
                break
            }
        }
        if (!targetRideId) return

        const ride = rides[targetRideId]
        const segment = ride.segments[selectedSegmentId]
        const startNode = ride.nodes[segment.startNodeId]
        const endNode = ride.nodes[segment.endNodeId]

        const updatedNodes = { ...ride.nodes }
        const updatedSegments = { ...ride.segments }

        // 1. Remove Segment
        delete updatedSegments[selectedSegmentId]

        // 2. Unlink Nodes
        if (startNode) {
            updatedNodes[startNode.id] = { ...startNode, outgoingSegmentId: null }
        }
        if (endNode) {
            updatedNodes[endNode.id] = { ...endNode, incomingSegmentId: null }
        }

        // 3. Garbage Collection (Remove Isolated Nodes)
        const nodesToDelete: string[] = []

        if (startNode) {
            const n = updatedNodes[startNode.id]
            if (!n.incomingSegmentId && !n.outgoingSegmentId) nodesToDelete.push(n.id)
        }
        if (endNode) {
            const n = updatedNodes[endNode.id]
            if (!n.incomingSegmentId && !n.outgoingSegmentId) nodesToDelete.push(n.id)
        }

        nodesToDelete.forEach(id => delete updatedNodes[id])

        // 4. Check Empty Ride
        if (Object.keys(updatedNodes).length === 0) {
            const newRides = { ...rides }
            delete newRides[targetRideId]
            set({
                rides: newRides,
                selectedSegmentId: null,
                activeRideId: null,
                activeNodeId: null,
                isBuilding: false,
                placementMode: 'ACTIVE'
            })
            return
        }

        // 5. Update Ride
        const updatedRide = {
            ...ride,
            nodes: updatedNodes,
            segments: updatedSegments,
            isComplete: false
        }

        set({
            rides: { ...rides, [targetRideId]: updatedRide },
            selectedSegmentId: null
        })
    },

    resumeBuilding: (rideId, nodeId) => {
        set({
            activeRideId: rideId,
            activeNodeId: nodeId,
            isBuilding: true,
            selectedSegmentId: null
        })
        get().updatePreview()
    },

    getActiveRide: () => {
        const { rides, activeRideId } = get()
        if (!activeRideId) return undefined
        return rides[activeRideId]
    },

    getLastNode: () => {
        const { rides, activeRideId, activeNodeId } = get()
        if (!activeRideId || !activeNodeId) return undefined
        return rides[activeRideId]?.nodes[activeNodeId]
    },

    getOpenNodes: () => {
        const { rides, activeRideId } = get()
        if (!activeRideId) return []
        const ride = rides[activeRideId]
        if (!ride) return []

        const openNodes: { nodeId: string, node: TrackNode, type: 'HEAD' | 'TAIL' }[] = []

        Object.values(ride.nodes).forEach(node => {
            if (node.incomingSegmentId === null) {
                openNodes.push({ nodeId: node.id, node, type: 'HEAD' })
            }
            if (node.outgoingSegmentId === null) {
                openNodes.push({ nodeId: node.id, node, type: 'TAIL' })
            }
        })

        return openNodes
    },

    savePark: () => {
        const state = get()
        const data = JSON.stringify(state.rides)
        localStorage.setItem('park_save', data)
        console.log('Park saved!')
    },

    loadPark: () => {
        const data = localStorage.getItem('park_save')
        if (data) {
            try {
                const rides = JSON.parse(data)
                set({ rides, activeRideId: null, activeNodeId: null, isBuilding: false })
                console.log('Park loaded!')
            } catch (e) {
                console.error('Failed to load park', e)
            }
        }
    },

    exportPark: () => {
        const state = get()
        const data = JSON.stringify(state.rides, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'rollercoaster_park.json'
        a.click()
        URL.revokeObjectURL(url)
    },

    importPark: (jsonContent) => {
        try {
            const rides = JSON.parse(jsonContent)
            set({ rides, activeRideId: null, activeNodeId: null, isBuilding: false })
        } catch (e) {
            console.error('Failed to import park', e)
        }
    },

    reset: () => {
        set({
            rides: {},
            activeRideId: null,
            activeNodeId: null,
            previewSegment: null,
            snapTargetId: null,
            validationError: null,
            isBuilding: false,
            placementMode: 'ACTIVE'
        })
    }
}))
