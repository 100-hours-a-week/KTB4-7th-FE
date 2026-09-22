import { create } from 'zustand'

type UiState = {
  isNavigationOpen: boolean
  openNavigation: () => void
  closeNavigation: () => void
  savedSolutionIds: string[]
  saveSolution: (id: string) => void
}

export const useUiStore = create<UiState>((set) => ({
  isNavigationOpen: false,
  openNavigation: () => set({ isNavigationOpen: true }),
  closeNavigation: () => set({ isNavigationOpen: false }),
  savedSolutionIds: [],
  saveSolution: (id) =>
    set((state) =>
      state.savedSolutionIds.includes(id)
        ? state
        : { savedSolutionIds: [...state.savedSolutionIds, id] },
    ),
}))
