'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type ActiveDatasetStore = {
  activeDatasetId: string | null
  activeDatasetName: string | null
  setActiveDatasetId: (datasetId: string | null) => void
  setActiveDataset: (dataset: { id: string; name: string } | null) => void
  clearActiveDatasetId: () => void
}

export const ACTIVE_DATASET_STORAGE_KEY = 'clarityboard.activeDatasetId'

export const useActiveDatasetStore = create<ActiveDatasetStore>()(
  persist(
    (set) => ({
      activeDatasetId: null,
      activeDatasetName: null,
      setActiveDatasetId: (datasetId) => {
        set((state) => {
          if (state.activeDatasetId === datasetId) {
            return state
          }

          return {
            activeDatasetId: datasetId,
            activeDatasetName: datasetId ? state.activeDatasetName : null,
          }
        })
      },
      setActiveDataset: (dataset) => {
        set((state) => {
          const nextId = dataset?.id ?? null
          const nextName = dataset?.name ?? null

          if (state.activeDatasetId === nextId && state.activeDatasetName === nextName) {
            return state
          }

          return {
            activeDatasetId: nextId,
            activeDatasetName: nextName,
          }
        })
      },
      clearActiveDatasetId: () => {
        set({ activeDatasetId: null, activeDatasetName: null })
      },
    }),
    {
      name: ACTIVE_DATASET_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeDatasetId: state.activeDatasetId,
        activeDatasetName: state.activeDatasetName,
      }),
    }
  )
)
