import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { calculateNextTrackSegment } from '../utils/trackUtils'


export type TrackType =
    | 'STRAIGHT'
    | 'TURN_LEFT'
    | 'TURN_RIGHT'
    | 'SLOPE_UP'
    | 'SLOPE_DOWN'
    | 'SLOPE_STRAIGHT' // New: Straight segment that maintains current slope

export interface TrackNode {
    id: string
    position: [number, number, number]
    rotation: [number, number, number, number] // Quaternion [x, y, z, w]
    tangent: [number, number, number] // Direction vector
    normal: [number, number, number] // Up vector
}

export interface TrackSegmentData {
    id: string
    type: TrackType
    startNodeId: string
    endNodeId: string
    controlPoints: [number, number, number][] // Bezier control points
    length: number
}

interface TrackState {
    nodes: Record<string, TrackNode>
    segments: TrackSegmentData[]
    previewSegment: TrackSegmentData | null

    // Actions
    setPreview: (type: TrackType) => void
    commitPreview: () => void
    cancelPreview: () => void
    removeLastSegment: () => void
    reset: () => void

    // Helpers
    getLastNode: () => TrackNode | undefined
}

export const useTrackStore = create<TrackState>((set, get) => ({
    nodes: {},
    segments: [],
    previewSegment: null,

    getLastNode: () => {
        const segments = get().segments
        if (segments.length === 0) return undefined
        const lastSegment = segments[segments.length - 1]
        return get().nodes[lastSegment.endNodeId]
    },

    setPreview: (type) => {
        const state = get()
        const lastNode = state.getLastNode()

        let startNode: TrackNode

        if (!lastNode) {
            startNode = {
                id: 'start-node', // Fixed ID for start node
                position: [0, 0, 0],
                rotation: [0, 0, 0, 1],
                tangent: [0, 0, 1],
                normal: [0, 1, 0]
            }
        } else {
            startNode = lastNode
        }

        // Calculate the segment based on the type
        const { endNode, controlPoints, length } = calculateNextTrackSegment(startNode, type)

        const previewSegment: TrackSegmentData = {
            id: 'preview',
            type,
            startNodeId: startNode.id,
            endNodeId: endNode.id,
            controlPoints,
            length
        }

        set({ previewSegment })
    },

    commitPreview: () => {
        const state = get()
        const { previewSegment, nodes, segments } = state

        if (!previewSegment) return

        // Finalize the segment and nodes
        const startNodeId = previewSegment.startNodeId
        const endNodeId = uuidv4() // Generate real ID for end node
        const segmentId = uuidv4()

        // If start node doesn't exist in state (first node), add it
        const newNodes = { ...nodes }
        if (!newNodes[startNodeId]) {
            // Re-create start node from preview calculation source? 
            // Actually, if it's the first node, we defined it in setPreview.
            // We need to make sure we have the start node data.
            // For simplicity, let's reconstruct the start node if it's missing.
            if (startNodeId === 'start-node') {
                newNodes[startNodeId] = {
                    id: startNodeId,
                    position: [0, 0, 0],
                    rotation: [0, 0, 0, 1],
                    tangent: [0, 0, 1],
                    normal: [0, 1, 0]
                }
            }
        }

        // We need the end node data. 
        // The previewSegment doesn't store the full endNode object, just the ID.
        // We need to re-calculate or store the endNode in the preview state?
        // Better: calculateNextTrackSegment returns the endNode. 
        // Let's re-calculate to be safe and clean, or store it in a temporary state?
        // Re-calculating is cheap.

        const startNode = newNodes[startNodeId]
        const { endNode } = calculateNextTrackSegment(startNode, previewSegment.type)
        endNode.id = endNodeId // Update ID

        newNodes[endNodeId] = endNode

        const newSegment: TrackSegmentData = {
            ...previewSegment,
            id: segmentId,
            endNodeId: endNodeId
        }

        set({
            nodes: newNodes,
            segments: [...segments, newSegment],
            previewSegment: null
        })
    },

    cancelPreview: () => {
        set({ previewSegment: null })
    },

    removeLastSegment: () => {
        set((state) => {
            if (state.segments.length === 0) return state

            const newSegments = [...state.segments]
            const removedSegment = newSegments.pop()

            const newNodes = { ...state.nodes }
            if (removedSegment) {
                delete newNodes[removedSegment.endNodeId]
                if (newSegments.length === 0) {
                    delete newNodes[removedSegment.startNodeId]
                }
            }

            return {
                segments: newSegments,
                nodes: newNodes,
                previewSegment: null
            }
        })
    },

    reset: () => set({ nodes: {}, segments: [], previewSegment: null })
}))
