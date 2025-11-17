'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'

export default function TabletLoginPage() {
  const [pin, setPin] = useState('')
  const [enterprises, setEnterprises] = useState<any[]>([])
  const [selectedEnterprise, setSelectedEnterprise] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { loginWithPin } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  // Load enterprises on mount
  useEffect(() => {
    loadEnterprises()
  }, [])

  async function loadEnterprises() {
    const { data, error } = await supabase
      .from('enterprise')
      .select('id, name')
      .order('name')

    if (data && !error) {
      setEnterprises(data as any[])
      if (data.length === 1) {
        setSelectedEnterprise((data[0] as any).id)
      }
    }
  }

  function handlePinInput(digit: string) {
    if (pin.length < 6) {
      setPin(pin + digit)
    }
  }

  function handleBackspace() {
    setPin(pin.slice(0, -1))
  }

  function handleClear() {
    setPin('')
    setError('')
  }

  async function handleSubmit() {
    if (!selectedEnterprise) {
      setError('Veuillez sélectionner une crèche')
      return
    }

    if (pin.length < 4) {
      setError('Le code PIN doit contenir au moins 4 chiffres')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const response = await loginWithPin({
        pin,
        enterprise_id: selectedEnterprise
      })

      if (response.success) {
        router.push('/tablet/home')
      } else {
        setError(response.error || 'Code PIN incorrect')
        setPin('')
      }
    } catch (err) {
      setError('Une erreur est survenue')
      setPin('')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="tablet-mode min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-8">
      <div className="w-full max-w-2xl">
        {/* Logo & Title */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-block p-6 bg-white rounded-3xl shadow-xl mb-6">
            <svg
              className="w-20 h-20 text-primary-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h1 className="text-5xl font-bold text-neutral-900 mb-3" style={{ fontFamily: 'Quicksand, sans-serif' }}>
            Connexion Employé
          </h1>
          <p className="text-2xl text-neutral-600">Entrez votre code PIN</p>
        </div>

        {/* Enterprise Selector */}
        {enterprises.length > 1 && (
          <div className="card p-6 mb-8">
            <label className="block text-xl font-medium text-neutral-700 mb-3">
              Sélectionnez votre crèche
            </label>
            <select
              value={selectedEnterprise}
              onChange={(e) => setSelectedEnterprise(e.target.value)}
              className="w-full px-6 py-4 text-xl rounded-xl border-2 border-neutral-200 focus:outline-none focus:ring-4 focus:ring-primary-500 focus:border-transparent"
              disabled={isLoading}
            >
              <option value="">-- Choisir une crèche --</option>
              {enterprises.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* PIN Display */}
        <div className="card p-8 mb-8 animate-slide-up">
          <div className="flex justify-center items-center gap-4 mb-8">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold border-4 transition-all ${
                  i < pin.length
                    ? 'bg-primary-500 border-primary-600 text-white scale-110'
                    : 'bg-neutral-100 border-neutral-200 text-neutral-400'
                }`}
              >
                {i < pin.length ? '•' : ''}
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-danger-50 border-2 border-danger-200 text-danger-700 text-xl text-center mb-6">
              {error}
            </div>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <button
                key={digit}
                onClick={() => handlePinInput(digit.toString())}
                disabled={isLoading || pin.length >= 6}
                className="btn btn-primary h-24 text-3xl font-bold hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {digit}
              </button>
            ))}

            {/* Clear Button */}
            <button
              onClick={handleClear}
              disabled={isLoading}
              className="btn bg-warning-500 text-white h-24 text-2xl hover:bg-warning-600 hover:scale-105 active:scale-95"
            >
              Effacer
            </button>

            {/* Zero */}
            <button
              onClick={() => handlePinInput('0')}
              disabled={isLoading || pin.length >= 6}
              className="btn btn-primary h-24 text-3xl font-bold hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              0
            </button>

            {/* Backspace */}
            <button
              onClick={handleBackspace}
              disabled={isLoading || pin.length === 0}
              className="btn btn-secondary h-24 text-2xl hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              ←
            </button>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || pin.length < 4 || !selectedEnterprise}
            className="btn bg-success-500 text-white w-full mt-6 h-20 text-2xl font-semibold hover:bg-success-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connexion...
              </span>
            ) : (
              'Valider'
            )}
          </button>
        </div>

        {/* Back to Admin Login */}
        <div className="text-center">
          <a
            href="/login"
            className="text-xl text-neutral-600 hover:text-primary-500 transition-colors"
          >
            ← Retour à la connexion administrateur
          </a>
        </div>
      </div>
    </div>
  )
}
