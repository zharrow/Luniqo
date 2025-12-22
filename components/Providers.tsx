'use client'

import { AuthProvider } from '@/lib/contexts/AuthContext'
import { NurseryProvider } from '@/lib/contexts/NurseryContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NurseryProvider>
        {children}
      </NurseryProvider>
    </AuthProvider>
  )
}
