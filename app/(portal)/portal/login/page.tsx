'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { EyeIcon, EyeSlashIcon, EnvelopeIcon } from '@heroicons/react/24/outline'

export default function PortalLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Sign in with Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError('Identifiants invalides')
        setIsLoading(false)
        return
      }

      if (!data.user) {
        setError('Échec de la connexion')
        setIsLoading(false)
        return
      }

      // Check if user has guardian_user record
      const { data: guardianUser, error: guardianError } = await supabase
        .from('guardian_user')
        .select('*')
        .eq('user_id', data.user.id)
        .single()

      if (guardianError || !guardianUser) {
        setError('Aucun accès parent trouvé pour ce compte')
        await supabase.auth.signOut()
        setIsLoading(false)
        return
      }

      // Update last login
      await (supabase as any)
        .from('guardian_user')
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', data.user.id)

      // Redirect to home
      router.push('/portal/home')
    } catch (err) {
      console.error('Login error:', err)
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bienvenue</h1>
          <p className="text-sm text-gray-600">
            Suivez la journée de votre enfant en temps réel
          </p>
        </div>

        {/* Login Form */}
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
                className="w-full px-4 py-3 pr-11 border border-[#5a9dc9]/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5a9dc9]/20 focus:border-[#5a9dc9] transition-all duration-300 bg-white"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
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
                Connexion...
              </span>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        {/* Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Vous n'avez pas encore de compte ?<br />
            <span className="text-xs text-gray-500 mt-2 block">
              Contactez votre crèche pour recevoir une invitation
            </span>
          </p>
        </div>

        {/* Staff Login Link */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-600">
            Vous êtes membre du personnel ?{' '}
            <a href="/login" className="text-[#5a9dc9] hover:text-[#2c5f7f] font-medium transition-colors">
              Connexion staff
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
