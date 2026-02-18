'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ShieldCheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

const CONSENT_KEY = 'luniqo_cookie_consent'

export type ConsentStatus = 'accepted' | 'refused' | 'pending'

export function getConsentStatus(): ConsentStatus {
  if (typeof window === 'undefined') return 'pending'
  const consent = localStorage.getItem(CONSENT_KEY)
  if (consent === 'accepted' || consent === 'refused') return consent
  return 'pending'
}

export function setConsentStatus(status: 'accepted' | 'refused') {
  if (typeof window === 'undefined') return
  localStorage.setItem(CONSENT_KEY, status)
  // Dispatch event to notify PostHogProvider
  window.dispatchEvent(new CustomEvent('consent-changed', { detail: status }))
}

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Check if user has already made a choice
    const consent = getConsentStatus()
    if (consent === 'pending') {
      // Small delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true)
        setTimeout(() => setIsAnimating(true), 50)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    setConsentStatus('accepted')
    setIsAnimating(false)
    setTimeout(() => setIsVisible(false), 300)
  }

  const handleRefuse = () => {
    setConsentStatus('refused')
    setIsAnimating(false)
    setTimeout(() => setIsVisible(false), 300)
  }

  if (!isVisible) return null

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 p-4 transition-all duration-300 ${
        isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div className="mx-auto max-w-4xl">
        <div className="relative rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          {/* Close button */}
          <button
            onClick={handleRefuse}
            className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Fermer"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheckIcon className="h-6 w-6 text-primary" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                Aidez-nous à améliorer Luniqo
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Nous utilisons des cookies pour analyser l&apos;utilisation de l&apos;application et améliorer votre expérience.
                Vos données restent en Europe et ne sont jamais vendues.{' '}
                <Link href="/politique-de-confidentialite" className="text-primary hover:underline">
                  En savoir plus
                </Link>
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefuse}
                className="order-2 sm:order-1"
              >
                Refuser
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
                className="order-1 sm:order-2"
              >
                Accepter (recommandé)
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
