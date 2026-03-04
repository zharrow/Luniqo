'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { EyeIcon, EyeSlashIcon, XMarkIcon, EnvelopeIcon, PhoneIcon, SparklesIcon } from '@heroicons/react/24/outline'

const OAUTH_ERRORS: Record<string, string> = {
  no_account: 'Aucun compte Luniqo n\'est associe a cette adresse Google. Contactez votre administrateur.',
  auth_callback_error: 'Erreur lors de la connexion. Veuillez reessayer.',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [showContactModal, setShowContactModal] = useState(false)

  const { loginWithEmail, session, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check for OAuth error in URL params
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam && OAUTH_ERRORS[errorParam]) {
      setError(OAUTH_ERRORS[errorParam])
    }
  }, [searchParams])

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (!authLoading && session) {
      if (session.role === 'Owner' && !session.enterprise) {
        router.push('/setup')
      } else if (session.role === 'Developer') {
        router.push('/developer/dashboard')
      } else if (session.role === 'Owner') {
        router.push('/owner/dashboard')
      } else if (session.role === 'Employee') {
        router.push('/employee/dashboard')
      }
    }
  }, [authLoading, session, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await loginWithEmail({ email, password })

      if (!response.success) {
        setError(response.error || 'Echec de la connexion')
        setIsLoading(false)
      }
      // If success, AuthContext handles the redirect
    } catch (err) {
      console.error('Login error:', err)
      setError('Une erreur est survenue')
      setIsLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setError('')
    setIsGoogleLoading(true)

    try {
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (oauthError) {
        setError('Erreur lors de la connexion Google')
        setIsGoogleLoading(false)
      }
      // If successful, the browser will redirect to Google
    } catch (err) {
      console.error('Google login error:', err)
      setError('Erreur lors de la connexion Google')
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#f8fbfd] to-white">
      {/* Left Column - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 group">
            <div className="relative">
              <img
                src="/luniqo.png"
                alt="Luniqo"
                className="w-14 h-14 object-contain transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
              />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f] bg-clip-text text-transparent" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Luniqo
            </span>
          </div>

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Bienvenue</h1>
            <p className="text-sm text-gray-600">Connectez-vous à votre espace de gestion</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email*
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-[#5a9dc9]/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5a9dc9]/20 focus:border-[#5a9dc9] transition-all duration-300 hover:border-[#5a9dc9]/40 bg-white"
                placeholder="votre@email.com"
                required
                disabled={isLoading || isGoogleLoading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe*
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-[#5a9dc9]/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5a9dc9]/20 focus:border-[#5a9dc9] transition-all duration-300 hover:border-[#5a9dc9]/40 bg-white pr-12"
                  placeholder="••••••••••••"
                  required
                  disabled={isLoading || isGoogleLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#5a9dc9] transition-colors duration-200"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#5a9dc9] focus:ring-[#5a9dc9]"
                />
                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Se souvenir de moi</span>
              </label>
              <button
                type="button"
                onClick={() => setShowContactModal(true)}
                className="text-sm text-[#5a9dc9] hover:text-[#2c5f7f] font-medium transition-colors duration-200"
              >
                Mot de passe oublié ?
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200/50 text-red-700 text-sm flex items-start gap-3 animate-in fade-in duration-300">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f] hover:shadow-[0_8px_24px_-4px_rgba(90,157,201,0.4)] text-white font-medium py-3.5 px-6 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connexion en cours...
                </span>
              ) : (
                <span className="relative">Se connecter à Luniqo</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 flex items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-4 text-sm text-gray-400">ou</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading || isGoogleLoading}
            className="w-full mt-4 flex items-center justify-center gap-3 bg-white border border-[#5a9dc9]/20 hover:border-[#5a9dc9]/40 text-gray-700 font-medium py-3.5 px-6 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-4px_rgba(90,157,201,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
              <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Se connecter avec Google
          </button>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Pas encore de compte ?{' '}
              <a href="/register" className="text-[#5a9dc9] hover:text-[#2c5f7f] font-medium transition-colors duration-200">
                Creer un compte
              </a>
            </p>
          </div>

          {/* Employee Login Link */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Accéder à la{' '}
              <a href="/tablet/login" className="text-[#5a9dc9] hover:text-[#2c5f7f] font-medium transition-colors duration-200 inline-flex items-center gap-1 group">
                vue tablette
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </p>
          </div>

          {/* Privacy Policy Link */}
          <div className="mt-6 text-center">
            <a
              href="/politique-de-confidentialite"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              Politique de confidentialite
            </a>
          </div>
        </div>
      </div>

      {/* Right Column - Info Panel */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-[#5a9dc9] via-[#4a8cbd] to-[#2c5f7f] p-12 items-center justify-center relative overflow-hidden">
        {/* Animated Background Circles */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>

        {/* Main Card */}
        <div className="relative z-10 w-full max-w-md">
          {/* Welcome Message */}
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-white mb-4 leading-tight tracking-tight">
              Bienvenue sur Luniqo
            </h2>
            <p className="text-white/90 text-base leading-relaxed">
              Votre solution de gestion de crèche avec traçabilité HACCP complète. Simplifiez votre quotidien et assurez la sécurité alimentaire en toute sérénité.
            </p>
          </div>

          {/* White Card */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.3)] hover:shadow-[0_20px_56px_-12px_rgba(0,0,0,0.4)] transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 pr-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 tracking-tight">
                  Gestion intelligente de votre crèche
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Module de nettoyage, traçabilité HACCP, gestion des équipes et bien plus encore.
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ffe5b4] to-[#ffd580] flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <SparklesIcon className="w-6 h-6 text-gray-800" strokeWidth={1.5} />
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-1.5 h-1.5 rounded-full bg-[#5a9dc9]"></div>
                <span>Traçabilité alimentaire complète</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-1.5 h-1.5 rounded-full bg-[#81c995]"></div>
                <span>Gestion des tâches de nettoyage</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f4a5a5]"></div>
                <span>Suivi des équipes en temps réel</span>
              </div>
            </div>

            {/* Users Badge */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5a9dc9] to-[#2c5f7f] border-2 border-white shadow-sm"></div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#81c995] to-[#4a8f5a] border-2 border-white shadow-sm"></div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f4a5a5] to-[#c66b6b] border-2 border-white shadow-sm flex items-center justify-center">
                  <span className="text-xs font-semibold text-white">+</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-900">Rejoint par plus de crèches</p>
                <p className="text-xs text-gray-500">en France</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative animate-in zoom-in-95 duration-300">
            {/* Close Button */}
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all duration-200"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Mot de passe oublié ?</h2>
              <p className="text-sm text-gray-600">
                Contactez le développeur pour récupérer vos identifiants.
              </p>
            </div>

            {/* Contact Information */}
            <div className="space-y-3">
              {/* Email */}
              <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-[#e3f2fd] to-white rounded-2xl border border-[#5a9dc9]/20 hover:border-[#5a9dc9]/40 transition-all duration-300 hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5a9dc9]/10 to-[#5a9dc9]/5 flex items-center justify-center flex-shrink-0">
                  <EnvelopeIcon className="w-5 h-5 text-[#2c5f7f]" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Email</h3>
                  <a
                    href="mailto:contact@luniqo.fr"
                    className="text-sm text-[#5a9dc9] hover:text-[#2c5f7f] font-medium break-all transition-colors"
                  >
                    contact@luniqo.fr
                  </a>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-[#e3f2fd] to-white rounded-2xl border border-[#5a9dc9]/20 hover:border-[#5a9dc9]/40 transition-all duration-300 hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5a9dc9]/10 to-[#5a9dc9]/5 flex items-center justify-center flex-shrink-0">
                  <PhoneIcon className="w-5 h-5 text-[#2c5f7f]" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Téléphone</h3>
                  <a
                    href="tel:+33123456789"
                    className="text-sm text-[#5a9dc9] hover:text-[#2c5f7f] font-medium transition-colors"
                  >
                    +33 1 23 45 67 89
                  </a>
                </div>
              </div>
            </div>

            {/* Info Message */}
            <div className="mt-5 p-4 bg-gradient-to-br from-[#e8f5e9] to-white border border-[#81c995]/20 rounded-2xl">
              <p className="text-xs text-gray-700 leading-relaxed">
                <span className="font-semibold text-gray-900">Note :</span> Pour des raisons de sécurité, seul le développeur peut réinitialiser vos identifiants. Veuillez fournir votre email professionnel lors de votre demande.
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowContactModal(false)}
              className="w-full mt-6 bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f] hover:shadow-[0_8px_24px_-4px_rgba(90,157,201,0.4)] text-white font-medium py-3 px-6 rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
