import { create } from 'zustand'

type UiState = {
  isNavigationOpen: boolean
  openNavigation: () => void
  closeNavigation: () => void
}

export const useUiStore = create<UiState>((set) => ({
  isNavigationOpen: false,
  openNavigation: () => set({ isNavigationOpen: true }),
  closeNavigation: () => set({ isNavigationOpen: false }),
}))
