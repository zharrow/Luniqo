'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { validateInvitationToken, registerGuardianUser } from '@/lib/actions/invitation.actions'
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, KeyIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

type TokenStatus = 'loading' | 'valid' | 'invalid' | 'missing'

export default function PortalRegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [guardianId, setGuardianId] = useState('')
  const [token, setToken] = useState('')
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>('loading')
  const [tokenError, setTokenError] = useState('')
  const [guardianName, setGuardianName] = useState('')

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    const guardianIdParam = searchParams.get('guardian_id')

    // No token or guardian_id → block access
    if (!tokenParam || !guardianIdParam) {
      setTokenStatus('missing')
      return
    }

    setGuardianId(guardianIdParam)
    setToken(tokenParam)

    // Validate the invitation token
    async function validate() {
      const result = await validateInvitationToken({
        token: tokenParam!,
        guardianId: guardianIdParam!,
      })

      if (result.valid && result.email) {
        setEmail(result.email)
        setGuardianName(result.guardianName || '')
        setTokenStatus('valid')
      } else {
        setTokenError(result.error || 'Lien d\'invitation invalide')
        setTokenStatus('invalid')
      }
    }

    validate()
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres')
      return
    }

    if (!guardianId || !token) {
      setError('Lien d\'invitation invalide. Veuillez contacter votre creche.')
      return
    }

    setIsLoading(true)

    try {
      // Use server action to create user (email auto-confirmed)
      const result = await registerGuardianUser({
        email,
        password,
        guardianId,
        token,
      })

      if (!result.success) {
        setError(result.error || 'Erreur lors de la creation du compte')
        setIsLoading(false)
        return
      }

      // Sign in the user after successful registration
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        // Account created but sign-in failed - redirect to login
        router.push('/portal/login?registered=true')
        return
      }

      // Success - redirect to portal home
      router.push('/portal/home')
    } catch (err) {
      console.error('Registration error:', err)
      setError('Une erreur est survenue')
      setIsLoading(false)
    }
  }

  // Loading state while validating token
  if (tokenStatus === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#f8fbfd] to-white p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5a9dc9]"></div>
        <p className="mt-4 text-gray-500">Verification de votre invitation...</p>
      </div>
    )
  }

  // No token provided — block access
  if (tokenStatus === 'missing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#f8fbfd] to-white p-4">
        <div className="w-full max-w-md text-center">
          <div className="flex flex-col items-center gap-3 mb-8">
            <img src="/luniqo.png" alt="Luniqo" className="w-16 h-16 object-contain" />
            <span className="text-2xl font-bold bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f] bg-clip-text text-transparent">
              Portail Parents
            </span>
          </div>

          <div className="p-6 bg-[#ffe5b4]/30 border border-[#ffe5b4] rounded-2xl mb-6">
            <ExclamationTriangleIcon className="w-12 h-12 text-[#c9915a] mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Invitation requise</h2>
            <p className="text-sm text-gray-600">
              Pour creer un compte sur le portail parents, vous devez recevoir une invitation
              de votre creche. Contactez la direction de votre creche pour obtenir votre lien d'inscription.
            </p>
          </div>

          <a
            href="/portal/login"
            className="text-[#5a9dc9] hover:text-[#2c5f7f] font-medium text-sm transition-colors"
          >
            Vous avez deja un compte ? Se connecter
          </a>
        </div>
      </div>
    )
  }

  // Invalid or expired token
  if (tokenStatus === 'invalid') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#f8fbfd] to-white p-4">
        <div className="w-full max-w-md text-center">
          <div className="flex flex-col items-center gap-3 mb-8">
            <img src="/luniqo.png" alt="Luniqo" className="w-16 h-16 object-contain" />
            <span className="text-2xl font-bold bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f] bg-clip-text text-transparent">
              Portail Parents
            </span>
          </div>

          <div className="p-6 bg-red-50 border border-red-200/50 rounded-2xl mb-6">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Invitation invalide</h2>
            <p className="text-sm text-gray-600">
              {tokenError}
            </p>
          </div>

          <a
            href="/portal/login"
            className="text-[#5a9dc9] hover:text-[#2c5f7f] font-medium text-sm transition-colors"
          >
            Vous avez deja un compte ? Se connecter
          </a>
        </div>
      </div>
    )
  }

  // Valid token — show registration form
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#f8fbfd] to-white p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <img
            src="/luniqo.png"
            alt="Luniqo"
            className="w-16 h-16 object-contain"
          />
          <span className="text-2xl font-bold bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f] bg-clip-text text-transparent">
            Portail Parents
          </span>
        </div>

        {/* Welcome */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Creer mon compte</h1>
          {guardianName && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <CheckCircleIcon className="w-4 h-4 text-green-500" />
              <span>Invitation pour <strong>{guardianName}</strong></span>
            </div>
          )}
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input (pre-filled, read-only) */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Adresse email
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={email}
                readOnly
                className="w-full px-4 py-3 pl-11 border border-[#5a9dc9]/20 rounded-2xl bg-gray-50 text-gray-600 cursor-not-allowed"
              />
              <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              L'email est lie a votre invitation et ne peut pas etre modifie
            </p>
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pl-11 pr-11 border border-[#5a9dc9]/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5a9dc9]/20 focus:border-[#5a9dc9] transition-all duration-300 bg-white"
                placeholder="Min. 8 caracteres"
                required
                disabled={isLoading}
                minLength={8}
              />
              <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#5a9dc9] transition-colors"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 pl-11 pr-11 border border-[#5a9dc9]/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5a9dc9]/20 focus:border-[#5a9dc9] transition-all duration-300 bg-white"
                placeholder="Repetez votre mot de passe"
                required
                disabled={isLoading}
              />
              <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#5a9dc9] transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Terms */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <p className="text-xs text-gray-600">
              En creant un compte, vous acceptez les{' '}
              <a href="#" className="text-[#5a9dc9] hover:underline">conditions d'utilisation</a>
              {' '}et la{' '}
              <a href="#" className="text-[#5a9dc9] hover:underline">politique de confidentialite</a>.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200/50 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f] hover:shadow-lg text-white font-medium py-3.5 px-6 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creation...
              </span>
            ) : (
              'Creer mon compte'
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Vous avez deja un compte ?{' '}
            <a href="/portal/login" className="text-[#5a9dc9] hover:text-[#2c5f7f] font-medium transition-colors">
              Se connecter
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
