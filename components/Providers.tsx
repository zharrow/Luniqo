'use client'

import { AuthProvider } from '@/lib/contexts/AuthContext'
import { NurseryProvider } from '@/lib/contexts/NurseryContext'
import { PopupEventProvider } from '@/lib/contexts/PopupEventContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NurseryProvider>
        <PopupEventProvider>
          {children}
        </PopupEventProvider>
      </NurseryProvider>
    </AuthProvider>
  )
}
