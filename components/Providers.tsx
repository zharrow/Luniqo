'use client'

import { AuthProvider } from '@/lib/contexts/AuthContext'
import { ThemeProvider } from '@/lib/contexts/ThemeContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  )
}
