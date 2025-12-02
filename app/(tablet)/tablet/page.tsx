'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TabletPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/tablet/home')
  }, [router])

  return (
    <div className="tablet-mode min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-24 w-24 border-8 border-primary-200 border-t-primary-500 mx-auto mb-6"></div>
        <p className="text-2xl text-muted-foreground">Redirection...</p>
      </div>
    </div>
  )
}