'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { EyeIcon, EyeSlashIcon, XMarkIcon, EnvelopeIcon, PhoneIcon, SparklesIcon } from '@heroicons/react/24/outline'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showContactModal, setShowContactModal] = useState(false)

  const { loginWithEmail } = useAuth()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      console.log('🔐 Starting login...', { email })
      const response = await loginWithEmail({ email, password })
      console.log('📥 Login response:', response)

      if (response.success) {
        console.log('✅ Login successful, role:', response.role)
        // Small delay to allow session to be set before redirect
        await new Promise(resolve => setTimeout(resolve, 500))

        // Redirect based on role
        if (response.role === 'Developer') {
          console.log('🚀 Redirecting to /analytics')
          router.push('/analytics')
        } else if (response.role === 'Admin') {
          console.log('🚀 Redirecting to /dashboard')
          router.push('/dashboard')
        }
        // Note: Don't set isLoading(false) here - let the redirect happen while loading
      } else {
        console.error('❌ Login failed:', response.error)
        setError(response.error || 'Échec de la connexion')
        setIsLoading(false)
      }
    } catch (err) {
      console.error('❌ Login error:', err)
      setError('Une erreur est survenue')
      setIsLoading(false)
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
                disabled={isLoading}
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
                  disabled={isLoading}
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
              disabled={isLoading}
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

          {/* Employee Login Link */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Vous êtes employé ?{' '}
              <a href="/tablet/login" className="text-[#5a9dc9] hover:text-[#2c5f7f] font-medium transition-colors duration-200 inline-flex items-center gap-1 group">
                Connexion employé
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </p>
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
