'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, UserIcon, KeyIcon } from '@heroicons/react/24/outline'

export default function PortalRegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [guardianId, setGuardianId] = useState('')

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    // Get invitation token from URL
    const token = searchParams.get('token')
    const guardian_id = searchParams.get('guardian_id')

    if (guardian_id) {
      setGuardianId(guardian_id)
    }

    // TODO: Validate token and pre-fill email if available
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validation
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    if (!guardianId) {
      setError('Lien d\'invitation invalide. Veuillez contacter votre crèche.')
      return
    }

    setIsLoading(true)

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('Un compte existe déjà avec cet email')
        } else {
          setError(authError.message)
        }
        setIsLoading(false)
        return
      }

      if (!authData.user) {
        setError('Échec de la création du compte')
        setIsLoading(false)
        return
      }

      // Create guardian_user record
      const { error: guardianUserError } = await (supabase as any)
        .from('guardian_user')
        .insert({
          guardian_id: guardianId,
          user_id: authData.user.id,
          can_view_photos: true,
          can_receive_messages: true,
          can_update_info: false,
          terms_accepted_at: new Date().toISOString(),
          privacy_policy_accepted_at: new Date().toISOString(),
        })

      if (guardianUserError) {
        console.error('Guardian user creation error:', guardianUserError)
        setError('Erreur lors de la création du profil')
        // Clean up auth user
        await supabase.auth.admin.deleteUser(authData.user.id)
        setIsLoading(false)
        return
      }

      // Success - redirect to login or home
      router.push('/portal/home')
    } catch (err) {
      console.error('Registration error:', err)
      setError('Une erreur est survenue')
      setIsLoading(false)
    }
  }

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
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Créer mon compte</h1>
          <p className="text-sm text-gray-600">
            Rejoignez le portail parents de votre crèche
          </p>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Adresse email
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 pl-11 border border-[#5a9dc9]/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5a9dc9]/20 focus:border-[#5a9dc9] transition-all duration-300 bg-white"
                placeholder="votre@email.com"
                required
                disabled={isLoading}
              />
              <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
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
                placeholder="Min. 8 caractères"
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
                placeholder="Répétez votre mot de passe"
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
              En créant un compte, vous acceptez les{' '}
              <a href="#" className="text-[#5a9dc9] hover:underline">conditions d'utilisation</a>
              {' '}et la{' '}
              <a href="#" className="text-[#5a9dc9] hover:underline">politique de confidentialité</a>.
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
                Création...
              </span>
            ) : (
              'Créer mon compte'
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Vous avez déjà un compte ?{' '}
            <a href="/portal/login" className="text-[#5a9dc9] hover:text-[#2c5f7f] font-medium transition-colors">
              Se connecter
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
