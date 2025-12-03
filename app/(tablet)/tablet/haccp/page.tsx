'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireTabletAuth } from '@/lib/contexts/TabletAuthContext'

type HaccpSection = 'meals' | 'temperatures'

export default function TabletHaccpPage() {
  const [selectedSection, setSelectedSection] = useState<HaccpSection | null>(null)
  const { session, isLoading } = useRequireTabletAuth()
  const router = useRouter()

  // useRequireTabletAuth handles redirect if no session
  if (isLoading || !session) return null

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
          <h1 className="text-5xl font-bold mb-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
            HACCP
          </h1>
          <p className="text-2xl text-muted-foreground">Traçabilité alimentaire</p>
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
          className="relative rounded-3xl p-12 bg-white hover:-translate-y-1 hover:shadow-[0_16px_48px_-12px_rgba(129,201,149,0.25)] transition-all duration-300 text-left group border border-[#81c995]/20 overflow-hidden"
        >
          {/* Gradient pastel vert en fond */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#f1f9f3] to-white opacity-60"></div>

          <div className="relative z-10">
            {/* Icon avec animation */}
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-3xl bg-gradient-to-br from-[#81c995]/10 to-[#81c995]/5 mb-8 mx-auto group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
              <svg
                className="w-20 h-20 text-[#4a8f5a]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-4xl font-bold mb-4 text-center text-gray-900 group-hover:text-[#4a8f5a] transition-colors tracking-tight">
              Repas
            </h2>

            {/* Description */}
            <p className="text-xl text-gray-600 text-center mb-6">
              Enregistrer les repas servis aux enfants
            </p>

            {/* Chevron animé */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-[#81c995] text-xl font-semibold">Accéder</span>
              <div className="w-10 h-10 rounded-full bg-[#81c995]/8 flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                <svg className="w-5 h-5 text-[#81c995]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </button>

        {/* Temperatures Section */}
        <button
          onClick={() => setSelectedSection('temperatures')}
          className="relative rounded-3xl p-12 bg-white hover:-translate-y-1 hover:shadow-[0_16px_48px_-12px_rgba(255,171,145,0.25)] transition-all duration-300 text-left group border border-[#ffab91]/20 overflow-hidden"
        >
          {/* Gradient pastel pêche en fond */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#fffaf8] to-white opacity-60"></div>

          <div className="relative z-10">
            {/* Icon avec animation */}
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-3xl bg-gradient-to-br from-[#ffab91]/10 to-[#ffab91]/5 mb-8 mx-auto group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
              <svg
                className="w-20 h-20 text-[#d97557]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-4xl font-bold mb-4 text-center text-gray-900 group-hover:text-[#d97557] transition-colors tracking-tight">
              Températures
            </h2>

            {/* Description */}
            <p className="text-xl text-gray-600 text-center mb-6">
              Contrôler les températures des repas
            </p>

            {/* Chevron animé */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-[#ffab91] text-xl font-semibold">Accéder</span>
              <div className="w-10 h-10 rounded-full bg-[#ffab91]/8 flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                <svg className="w-5 h-5 text-[#ffab91]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Enterprise Info */}
      {session?.enterprise && (
        <div className="mt-12 text-center">
          <p className="text-xl text-muted-foreground">
            {session.enterprise.name}
          </p>
        </div>
      )}
    </div>
  )
}
