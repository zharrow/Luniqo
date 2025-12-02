'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { EyeIcon, EyeSlashIcon, XMarkIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline'

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
    <div className="min-h-screen flex">
      {/* Left Column - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900">cLean/studio</span>
          </div>

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-sm text-gray-500">Please enter your credentials to login:</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address*
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                placeholder="Enter your email address"
                required
                disabled={isLoading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password*
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all pr-12"
                  placeholder="••••••••••••"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-600">Remember Me</span>
              </label>
              <button
                type="button"
                onClick={() => setShowContactModal(true)}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                I forgot Password?
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                'Sign In to cLean Studio'
              )}
            </button>
          </form>

          {/* Employee Login Link */}
          <p className="mt-6 text-center text-sm text-gray-600">
            Vous êtes employé ?{' '}
            <a href="/tablet/login" className="text-purple-600 hover:text-purple-700 font-medium">
              Connexion employé
            </a>
          </p>
        </div>
      </div>

      {/* Right Column - Info Panel */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 p-12 items-center justify-center relative overflow-hidden">
        {/* Main Card */}
        <div className="relative z-10 w-full max-w-md bg-purple-500/40 backdrop-blur-sm rounded-3xl p-10 border border-white/20">
          {/* Welcome Message */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
              Welcome back! Please sign in to your Shadcn Studio account
            </h2>
            <p className="text-white/90 text-sm leading-relaxed">
              Thank you for registering! Please check your inbox and click the verification link to activate your account.
            </p>
          </div>

          {/* White Card */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-2">
                Please enter your login details
              </h3>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-200 to-yellow-300 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              Stay connected with shadcn/studio Subscribe now for the latest updates and news.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-300 to-purple-400 border-2 border-white shadow-sm"></div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-300 to-blue-400 border-2 border-white shadow-sm"></div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-300 to-pink-400 border-2 border-white shadow-sm flex items-center justify-center">
                  <span className="text-xs font-semibold text-gray-800">+365</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-in fade-in duration-200">
            {/* Close Button */}
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Mot de passe oublié ?</h2>
              <p className="text-sm text-gray-600">
                Contactez le développeur pour récupérer vos identifiants.
              </p>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              {/* Email */}
              <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-100">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <EnvelopeIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Email</h3>
                  <a
                    href="mailto:contact@clean-app.fr"
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium break-all"
                  >
                    contact@clean-app.fr
                  </a>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-100">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <PhoneIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Téléphone</h3>
                  <a
                    href="tel:+33123456789"
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    +33 1 23 45 67 89
                  </a>
                </div>
              </div>
            </div>

            {/* Info Message */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs text-blue-900 leading-relaxed">
                <span className="font-semibold">Note :</span> Pour des raisons de sécurité, seul le développeur peut réinitialiser vos identifiants. Veuillez fournir votre email professionnel lors de votre demande.
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowContactModal(false)}
              className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
