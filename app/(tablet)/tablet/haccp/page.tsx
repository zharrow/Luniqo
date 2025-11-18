'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'

type HaccpSection = 'meals' | 'temperatures'

export default function TabletHaccpPage() {
  const [selectedSection, setSelectedSection] = useState<HaccpSection | null>(null)
  const { session } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!session || session.role !== 'User') {
      router.push('/tablet/login')
    }
  }, [session])

  if (!session) return null

  // If section selected, show it
  if (selectedSection === 'meals') {
    router.push('/tablet/haccp/meals')
    return null
  }

  if (selectedSection === 'temperatures') {
    router.push('/tablet/haccp/temperatures')
    return null
  }

  return (
    <div className="tablet-mode min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-5xl font-bold text-neutral-900 mb-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
            HACCP
          </h1>
          <p className="text-2xl text-neutral-600">Traçabilité alimentaire</p>
        </div>
        <button
          onClick={() => router.push('/tablet/home')}
          className="btn btn-secondary px-8 py-4 text-xl"
        >
          <svg className="w-6 h-6 mr-3 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
      </div>

      {/* HACCP Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Meals Section */}
        <button
          onClick={() => setSelectedSection('meals')}
          className="card p-12 hover:shadow-2xl hover:scale-105 transition-all duration-300 text-left group"
        >
          {/* Icon */}
          <div className="w-32 h-32 rounded-3xl bg-success-100 flex items-center justify-center mb-8 mx-auto group-hover:bg-success-500 transition-colors">
            <svg
              className="w-20 h-20 text-success-500 group-hover:text-white transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
              <circle cx="12" cy="12" r="10" strokeWidth={2} />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-4xl font-bold text-neutral-900 mb-4 text-center group-hover:text-success-500 transition-colors">
            Repas
          </h2>

          {/* Description */}
          <p className="text-xl text-neutral-600 text-center mb-6">
            Enregistrer les repas servis aux enfants
          </p>

          {/* Action */}
          <div className="flex items-center justify-center text-success-500 text-xl font-semibold group-hover:translate-x-2 transition-transform">
            Accéder
            <svg className="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {/* Temperatures Section */}
        <button
          onClick={() => setSelectedSection('temperatures')}
          className="card p-12 hover:shadow-2xl hover:scale-105 transition-all duration-300 text-left group"
        >
          {/* Icon */}
          <div className="w-32 h-32 rounded-3xl bg-danger-100 flex items-center justify-center mb-8 mx-auto group-hover:bg-danger-500 transition-colors">
            <svg
              className="w-20 h-20 text-danger-500 group-hover:text-white transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-4xl font-bold text-neutral-900 mb-4 text-center group-hover:text-danger-500 transition-colors">
            Températures
          </h2>

          {/* Description */}
          <p className="text-xl text-neutral-600 text-center mb-6">
            Contrôler les températures des repas
          </p>

          {/* Action */}
          <div className="flex items-center justify-center text-danger-500 text-xl font-semibold group-hover:translate-x-2 transition-transform">
            Accéder
            <svg className="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>

      {/* Enterprise Info */}
      {session?.enterprise && (
        <div className="mt-12 text-center">
          <p className="text-xl text-neutral-500">
            {session.enterprise.name}
          </p>
        </div>
      )}
    </div>
  )
}
