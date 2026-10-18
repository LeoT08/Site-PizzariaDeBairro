import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { configureAuth } from '@/api/client'
import type { AuthResponse, User } from '@/api/types'

interface SessionState {
  token: string | null
  user: User | null
  signIn: (auth: AuthResponse) => void
  setUser: (user: User) => void
  signOut: () => void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      signIn: ({ token, user }) => set({ token, user }),
      setUser: (user) => set({ user }),
      signOut: () => set({ token: null, user: null }),
    }),
    { name: 'pb:session' },
  ),
)

configureAuth(
  () => useSession.getState().token,
  () => useSession.getState().signOut(),
)
