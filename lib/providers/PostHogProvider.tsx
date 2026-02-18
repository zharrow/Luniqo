'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { Suspense, useEffect, useState, useCallback } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { CookieBanner, getConsentStatus, type ConsentStatus } from '@/components/shared/CookieBanner'

// Page view tracker component (needs Suspense for useSearchParams)
function PostHogPageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const posthogClient = usePostHog()

  useEffect(() => {
    if (pathname && posthogClient) {
      let url = window.origin + pathname
      if (searchParams?.toString()) {
        url = url + '?' + searchParams.toString()
      }
      posthogClient.capture('$pageview', { $current_url: url })
    }
  }, [pathname, searchParams, posthogClient])

  return null
}

function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageViewTracker />
    </Suspense>
  )
}

// PostHog initialization options based on consent
function getPostHogOptions(consent: ConsentStatus) {
  const baseOptions = {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
    capture_pageview: false, // We capture manually for more control
    capture_pageleave: true,
    request_batching: true,
  }

  if (consent === 'accepted') {
    // Full tracking with cookies
    return {
      ...baseOptions,
      person_profiles: 'identified_only' as const,
      autocapture: true,
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: false,
        maskInputOptions: {
          password: true,
        },
      },
    }
  } else {
    // Cookieless mode - minimal tracking
    return {
      ...baseOptions,
      person_profiles: 'identified_only' as const,
      persistence: 'memory' as const,
      disable_persistence: true,
      disable_session_recording: true,
      autocapture: false,
    }
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentStatus>('pending')
  const [isInitialized, setIsInitialized] = useState(false)

  const initPostHog = useCallback((consentStatus: ConsentStatus) => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY

    if (!posthogKey) {
      console.log('PostHog key not found, skipping initialization')
      return
    }

    // If already loaded, we need to update settings
    if (posthog.__loaded) {
      // Update persistence based on new consent
      if (consentStatus === 'accepted') {
        posthog.set_config({
          persistence: 'localStorage+cookie',
          disable_persistence: false,
          disable_session_recording: false,
          autocapture: true,
        })
        // Opt in to everything
        posthog.opt_in_capturing()
      } else if (consentStatus === 'refused') {
        posthog.set_config({
          persistence: 'memory',
          disable_persistence: true,
          disable_session_recording: true,
          autocapture: false,
        })
      }
      return
    }

    // First initialization
    const options = getPostHogOptions(consentStatus)

    console.log('PostHog initializing with consent:', consentStatus, {
      key: posthogKey?.slice(0, 10) + '...',
      mode: consentStatus === 'accepted' ? 'full' : 'cookieless',
    })

    posthog.init(posthogKey, {
      ...options,
      loaded: (ph) => {
        console.log('PostHog initialized successfully', { consent: consentStatus })
        setIsInitialized(true)
      },
    })
  }, [])

  // Initialize on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const currentConsent = getConsentStatus()
    setConsent(currentConsent)

    // Initialize PostHog (even if pending, we start in cookieless mode)
    const effectiveConsent = currentConsent === 'pending' ? 'refused' : currentConsent
    initPostHog(effectiveConsent)
  }, [initPostHog])

  // Listen for consent changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleConsentChange = (event: CustomEvent<ConsentStatus>) => {
      const newConsent = event.detail
      console.log('Consent changed to:', newConsent)
      setConsent(newConsent)
      initPostHog(newConsent)
    }

    window.addEventListener('consent-changed', handleConsentChange as EventListener)
    return () => {
      window.removeEventListener('consent-changed', handleConsentChange as EventListener)
    }
  }, [initPostHog])

  // Don't render PostHog provider if no key is set
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>
  }

  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      {children}
      <CookieBanner />
    </PHProvider>
  )
}
