'use client'

import { create } from 'zustand'

export interface NodeHint {
  new_nodes: Array<{
    label: string
    description: string
  }>
  updated_nodes: Array<{
    label: string
    mastery_level: 'EXPOSED' | 'UNDERSTOOD'
  }>
}

interface GraphState {
  pendingUpdates: NodeHint[]
  addPendingUpdate: (update: NodeHint) => void
  clearPendingUpdates: () => void
}

export const useGraphStore = create<GraphState>((set) => ({
  pendingUpdates: [],
  addPendingUpdate: (update) =>
    set((state) => ({ pendingUpdates: [...state.pendingUpdates, update] })),
  clearPendingUpdates: () => set({ pendingUpdates: [] }),
}))
