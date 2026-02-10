'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { usePopupEvent } from '@/lib/contexts/PopupEventContext'
import { Confetti, ConfettiRef } from '@/components/ui/confetti'
import type { PopupTheme } from '@/lib/services/popup-events.service'

// ============================================================================
// THEME CONFIGURATIONS
// Following the "Douceur Professionnelle" design system
// ============================================================================

interface ThemeConfig {
  gradient: string
  border: string
  shadow: string
  textPrimary: string
  textSecondary: string
  buttonBg: string
  buttonHover: string
  emojiGlow: string
}

const themeConfig: Record<PopupTheme, ThemeConfig> = {
  neutral: {
    gradient: 'from-[#e3f2fd] via-[#f0f7ff] to-white',
    border: 'border-[#5a9dc9]/30',
    shadow: 'shadow-[0_20px_60px_-15px_rgba(90,157,201,0.35)]',
    textPrimary: 'text-[#2c5f7f]',
    textSecondary: 'text-gray-600',
    buttonBg: 'bg-[#5a9dc9] hover:bg-[#4a8db9]',
    buttonHover: 'hover:shadow-lg hover:shadow-[#5a9dc9]/25',
    emojiGlow: 'drop-shadow-[0_0_20px_rgba(90,157,201,0.3)]'
  },
  valentine: {
    gradient: 'from-[#fce4ec] via-[#fff0f3] to-[#fff5f7]',
    border: 'border-[#f4a5a5]/40',
    shadow: 'shadow-[0_20px_60px_-15px_rgba(244,165,165,0.4)]',
    textPrimary: 'text-[#c66b6b]',
    textSecondary: 'text-[#d97557]',
    buttonBg: 'bg-gradient-to-r from-[#f4a5a5] to-[#e57373] hover:from-[#e89999] hover:to-[#d96666]',
    buttonHover: 'hover:shadow-lg hover:shadow-[#f4a5a5]/30',
    emojiGlow: 'drop-shadow-[0_0_25px_rgba(244,165,165,0.5)]'
  },
  christmas: {
    gradient: 'from-[#e8f5e9] via-[#f5fff6] to-[#ffebee]',
    border: 'border-[#81c995]/40',
    shadow: 'shadow-[0_20px_60px_-15px_rgba(129,201,149,0.35)]',
    textPrimary: 'text-[#4a8f5a]',
    textSecondary: 'text-[#c66b6b]',
    buttonBg: 'bg-gradient-to-r from-[#81c995] to-[#4a8f5a] hover:from-[#71b985] hover:to-[#3a7f4a]',
    buttonHover: 'hover:shadow-lg hover:shadow-[#81c995]/30',
    emojiGlow: 'drop-shadow-[0_0_20px_rgba(129,201,149,0.4)]'
  },
  celebration: {
    gradient: 'from-[#fff3e0] via-[#fffbf5] to-[#e8f5e9]',
    border: 'border-[#ffab91]/40',
    shadow: 'shadow-[0_20px_60px_-15px_rgba(255,171,145,0.35)]',
    textPrimary: 'text-[#d97557]',
    textSecondary: 'text-gray-600',
    buttonBg: 'bg-gradient-to-r from-[#ffab91] to-[#ff8a65] hover:from-[#ff9b81] hover:to-[#ff7a55]',
    buttonHover: 'hover:shadow-lg hover:shadow-[#ffab91]/30',
    emojiGlow: 'drop-shadow-[0_0_25px_rgba(255,171,145,0.5)]'
  },
  warning: {
    gradient: 'from-[#fff8e1] via-[#fffef5] to-white',
    border: 'border-yellow-400/40',
    shadow: 'shadow-[0_20px_60px_-15px_rgba(251,191,36,0.35)]',
    textPrimary: 'text-yellow-800',
    textSecondary: 'text-yellow-700',
    buttonBg: 'bg-yellow-500 hover:bg-yellow-600',
    buttonHover: 'hover:shadow-lg hover:shadow-yellow-500/25',
    emojiGlow: 'drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]'
  },
  success: {
    gradient: 'from-[#e8f5e9] via-[#f0fff2] to-white',
    border: 'border-[#81c995]/40',
    shadow: 'shadow-[0_20px_60px_-15px_rgba(129,201,149,0.35)]',
    textPrimary: 'text-[#4a8f5a]',
    textSecondary: 'text-gray-600',
    buttonBg: 'bg-[#81c995] hover:bg-[#71b985]',
    buttonHover: 'hover:shadow-lg hover:shadow-[#81c995]/25',
    emojiGlow: 'drop-shadow-[0_0_20px_rgba(129,201,149,0.4)]'
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EventPopup() {
  const { currentPopup, dismissPopup, onCtaClick, onPromoCopy } = usePopupEvent()
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [promoCopied, setPromoCopied] = useState(false)
  const confettiRef = useRef<ConfettiRef>(null)

  // Fire confetti for celebration theme
  useEffect(() => {
    if (currentPopup?.theme === 'celebration' && confettiRef.current) {
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => {
        confettiRef.current?.fire({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.3 }
        })
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [currentPopup?.id])

  if (!currentPopup) return null

  const theme = themeConfig[currentPopup.theme] || themeConfig.neutral
  const showConfetti = currentPopup.theme === 'celebration'

  const handleCopyPromo = async () => {
    if (currentPopup.promo_code) {
      await navigator.clipboard.writeText(currentPopup.promo_code)
      setPromoCopied(true)
      await onPromoCopy()
      setTimeout(() => setPromoCopied(false), 2000)
    }
  }

  const handleCtaClick = async () => {
    await onCtaClick()
    if (currentPopup.cta_url) {
      // Navigate to URL if provided
      window.location.href = currentPopup.cta_url
    }
    await dismissPopup(false)
  }

  const handleClose = () => {
    dismissPopup(dontShowAgain)
  }

  return (
    <AnimatePresence>
      {currentPopup && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={currentPopup.dismissible ? handleClose : undefined}
          />

          {/* Confetti canvas for celebration theme */}
          {showConfetti && (
            <Confetti
              ref={confettiRef}
              className="fixed inset-0 z-[101] pointer-events-none"
              manualstart
            />
          )}

          {/* Popup Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[102] w-full max-w-md px-4"
          >
            <div
              className={`
                relative overflow-hidden rounded-3xl
                bg-gradient-to-br ${theme.gradient}
                border-2 ${theme.border} ${theme.shadow}
                p-6 sm:p-8
              `}
            >
              {/* Close button */}
              {currentPopup.dismissible && (
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 transition-colors z-10"
                  aria-label="Fermer"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}

              {/* Content */}
              <div className="text-center">
                {/* Emoji or Image */}
                {currentPopup.emoji && (
                  <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                    className={`text-6xl sm:text-7xl mb-4 ${theme.emojiGlow}`}
                  >
                    {currentPopup.emoji}
                  </motion.div>
                )}

                {currentPopup.image_url && !currentPopup.emoji && (
                  <motion.img
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    src={currentPopup.image_url}
                    alt=""
                    className="w-32 h-32 mx-auto mb-4 object-contain"
                  />
                )}

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className={`text-2xl sm:text-3xl font-bold ${theme.textPrimary} mb-3 tracking-tight`}
                >
                  {currentPopup.title}
                </motion.h2>

                {/* Description */}
                {currentPopup.description && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`${theme.textSecondary} mb-6 leading-relaxed text-base`}
                  >
                    {currentPopup.description}
                  </motion.p>
                )}

                {/* Promo Code */}
                {currentPopup.promo_code && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="mb-6"
                  >
                    {currentPopup.promo_description && (
                      <p className={`text-sm ${theme.textSecondary} mb-2 font-medium`}>
                        {currentPopup.promo_description}
                      </p>
                    )}
                    <div
                      className="flex items-center justify-center gap-3 bg-white/80 rounded-2xl py-3 px-5 border-2 border-dashed border-gray-300 cursor-pointer hover:bg-white hover:border-gray-400 transition-all group"
                      onClick={handleCopyPromo}
                    >
                      <span className="font-mono font-bold text-lg sm:text-xl tracking-widest text-gray-800">
                        {currentPopup.promo_code}
                      </span>
                      <button
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Copier le code"
                      >
                        {promoCopied ? (
                          <CheckIcon className="w-5 h-5 text-green-500" />
                        ) : (
                          <ClipboardDocumentIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                    {promoCopied && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-green-600 mt-2 font-medium"
                      >
                        Code copie !
                      </motion.p>
                    )}
                  </motion.div>
                )}

                {/* CTA Button */}
                {currentPopup.cta_label && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Button
                      onClick={handleCtaClick}
                      size="lg"
                      className={`w-full ${theme.buttonBg} text-white py-3 rounded-2xl font-semibold text-lg transition-all ${theme.buttonHover}`}
                    >
                      {currentPopup.cta_label}
                    </Button>
                  </motion.div>
                )}

                {/* Don't show again checkbox */}
                {currentPopup.show_dont_show_again && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-5 flex items-center justify-center gap-2"
                  >
                    <Checkbox
                      id="dont-show-again"
                      checked={dontShowAgain}
                      onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
                      className="border-gray-300"
                    />
                    <label
                      htmlFor="dont-show-again"
                      className="text-sm text-gray-500 cursor-pointer select-none"
                    >
                      Ne plus afficher
                    </label>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
