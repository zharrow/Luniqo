'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthContext'
import type { Nursery } from '@/types/database.types'

interface NurseryContextType {
  selectedNursery: Nursery | null
  nurseries: Nursery[]
  setSelectedNursery: (nursery: Nursery) => void
  isLoading: boolean
  refreshNurseries: () => Promise<void>
}

const NurseryContext = createContext<NurseryContextType | undefined>(undefined)

// Storage key for selected nursery ID
const SELECTED_NURSERY_KEY = 'luniqo_selected_nursery'

export function NurseryProvider({ children }: { children: React.ReactNode }) {
  // Initialize selected nursery from localStorage
  const [selectedNursery, setSelectedNurseryState] = useState<Nursery | null>(() => {
    if (typeof window === 'undefined') return null

    try {
      const savedNurseryId = localStorage.getItem(SELECTED_NURSERY_KEY)
      if (savedNurseryId) {
        // We'll restore the full nursery object after fetching from DB
        return null
      }
    } catch (e) {
      console.error('Failed to load selected nursery from localStorage:', e)
    }

    return null
  })

  const [nurseries, setNurseries] = useState<Nursery[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [supabase] = useState(() => createClient())
  const { session } = useAuth()
  const hasInitialized = useRef(false)

  // Wrapper to save selected nursery to localStorage
  const setSelectedNursery = (nursery: Nursery) => {
    setSelectedNurseryState(nursery)
    localStorage.setItem(SELECTED_NURSERY_KEY, nursery.id)
    console.log('🏢 Selected nursery:', nursery.name)
  }

  // Load nurseries for the current enterprise
  const loadNurseries = async (enterpriseId: string) => {
    try {
      setIsLoading(true)
      console.log('🔄 Loading nurseries for enterprise:', enterpriseId)

      const { data, error } = await supabase
        .from('nursery')
        .select('*')
        .eq('enterprise_id', enterpriseId)
        .eq('is_active', true)
        .order('is_default', { ascending: false }) // Default nursery first
        .order('name')

      if (error) {
        console.error('Failed to load nurseries:', error)
        return
      }

      const nurseryList = (data || []) as Nursery[]
      setNurseries(nurseryList)
      console.log('✅ Loaded', nurseryList.length, 'nurseries')

      // Auto-select nursery
      if (nurseryList.length > 0) {
        // Try to restore saved nursery from localStorage
        const savedNurseryId = localStorage.getItem(SELECTED_NURSERY_KEY)
        if (savedNurseryId) {
          const savedNursery = nurseryList.find(n => n.id === savedNurseryId)
          if (savedNursery) {
            setSelectedNurseryState(savedNursery)
            console.log('🏢 Restored selected nursery from localStorage:', savedNursery.name)
            return
          }
        }

        // Fallback to default nursery
        const defaultNursery = nurseryList.find(n => n.is_default) || nurseryList[0]
        setSelectedNurseryState(defaultNursery)
        localStorage.setItem(SELECTED_NURSERY_KEY, defaultNursery.id)
        console.log('🏢 Auto-selected default nursery:', defaultNursery.name)
      }
    } catch (error) {
      console.error('Failed to load nurseries:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh nurseries (useful after creating a new nursery)
  const refreshNurseries = async () => {
    if (session?.enterprise?.id) {
      await loadNurseries(session.enterprise.id)
    }
  }

  // Initialize nurseries when session changes
  useEffect(() => {
    // Reset on session change
    if (!session?.enterprise?.id) {
      setNurseries([])
      setSelectedNurseryState(null)
      setIsLoading(false)
      return
    }

    // Only load once per enterprise
    if (hasInitialized.current && nurseries.length > 0) {
      return
    }

    hasInitialized.current = true
    loadNurseries(session.enterprise.id)
  }, [session?.enterprise?.id])

  const value: NurseryContextType = {
    selectedNursery,
    nurseries,
    setSelectedNursery,
    isLoading,
    refreshNurseries
  }

  return (
    <NurseryContext.Provider value={value}>
      {children}
    </NurseryContext.Provider>
  )
}

// Custom hook to use nursery context
export function useNursery() {
  const context = useContext(NurseryContext)
  if (context === undefined) {
    throw new Error('useNursery must be used within a NurseryProvider')
  }
  return context
}

// Hook to require a selected nursery (for protected pages)
export function useRequireNursery() {
  const { selectedNursery, isLoading } = useNursery()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setReady(true)
    }
  }, [isLoading])

  return {
    selectedNursery,
    isLoading: !ready,
    hasNursery: selectedNursery !== null
  }
}
