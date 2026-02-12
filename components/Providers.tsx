'use client'

import { AuthProvider } from '@/lib/contexts/AuthContext'
import { NurseryProvider } from '@/lib/contexts/NurseryContext'
import { PopupEventProvider } from '@/lib/contexts/PopupEventContext'
import { PostHogProvider } from '@/lib/providers/PostHogProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <AuthProvider>
        <NurseryProvider>
          <PopupEventProvider>
            {children}
          </PopupEventProvider>
        </NurseryProvider>
      </AuthProvider>
    </PostHogProvider>
  )
}
