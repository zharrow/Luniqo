'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTabletAuth, type TabletSession } from '@/lib/contexts/TabletAuthContext'
import { loginWithPin, getTodayNurseries, type TodayNurseryAssignment } from '@/lib/utils/auth.client'

type Step = 'username' | 'pin-entry' | 'nursery-selection' | 'no-nursery'

export default function TabletLoginPage() {
  const [step, setStep] = useState<Step>('username')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Data stored between steps
  const [employeeData, setEmployeeData] = useState<{
    user: any
    enterprise: any
    accessibleRooms: string[]
  } | null>(null)
  const [nurseryAssignments, setNurseryAssignments] = useState<TodayNurseryAssignment[]>([])

  const { setSession } = useTabletAuth()
  const router = useRouter()

  // Step 1: Username submission
  async function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setError('Veuillez entrer votre adresse email')
      return
    }
    setError('')
    setStep('pin-entry')
  }

  // Step 2: PIN Entry
  function handlePinInput(digit: string) {
    if (pin.length < 4) {
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

  async function handlePinSubmit() {
    if (pin.length !== 4) {
      setError('Veuillez entrer un code PIN à 4 chiffres')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      // Authenticate with email + PIN
      const response = await loginWithPin({ email: email.trim(), pin })

      if (!response.success || !response.data || !response.enterprise) {
        setError(response.error || 'Code PIN incorrect')
        setPin('')
        setIsLoading(false)
        return
      }

      const employee = {
        user: response.data,
        enterprise: response.enterprise,
        accessibleRooms: response.accessibleRooms || []
      }
      setEmployeeData(employee)

      // Fetch today's nursery assignments
      const assignments = await getTodayNurseries(response.data.id)
      setNurseryAssignments(assignments)

      if (assignments.length === 1) {
        // Single nursery today — connect directly
        finalizeSession(employee, assignments[0])
      } else if (assignments.length > 1) {
        // Multiple nurseries — show selector
        setStep('nursery-selection')
        setIsLoading(false)
      } else {
        // No nursery assigned today
        setStep('no-nursery')
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Une erreur est survenue')
      setPin('')
      setIsLoading(false)
    }
  }

  function finalizeSession(
    employee: { user: any; enterprise: any; accessibleRooms: string[] },
    assignment: TodayNurseryAssignment
  ) {
    const session: TabletSession = {
      user: employee.user,
      enterprise: employee.enterprise,
      accessibleRooms: employee.accessibleRooms,
      selectedNursery: assignment.nursery,
      todayShifts: assignment.shifts
    }
    setSession(session)
    router.push('/tablet/home')
  }

  function handleNurserySelect(assignment: TodayNurseryAssignment) {
    if (!employeeData) return
    finalizeSession(employeeData, assignment)
  }

  // Auto-submit when PIN is 4 digits
  useEffect(() => {
    if (pin.length === 4) {
      handlePinSubmit()
    }
  }, [pin])

  function handleBack() {
    if (step === 'pin-entry') {
      setStep('username')
      setPin('')
      setError('')
    } else if (step === 'nursery-selection' || step === 'no-nursery') {
      setStep('username')
      setEmail('')
      setPin('')
      setError('')
      setEmployeeData(null)
      setNurseryAssignments([])
    }
  }

  function formatTime(time: string) {
    // time is in HH:MM:SS or HH:MM format, display as HH:MM
    return time.substring(0, 5)
  }

  return (
    <div className="tablet-mode min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8fbfd] via-white to-[#fef6f7] p-8">
      <div className="w-full max-w-4xl">
        {/* Logo & Title */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-block p-6 bg-white rounded-3xl shadow-[0_12px_32px_-4px_rgba(90,157,201,0.25)] mb-6">
            <img
              src="/luniqo.png"
              alt="Luniqo"
              className="w-24 h-24 object-contain"
            />
          </div>
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f] bg-clip-text text-transparent tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Connexion Employé
          </h1>
          <p className="text-2xl text-gray-600">
            {step === 'username' && 'Entrez votre adresse email'}
            {step === 'pin-entry' && 'Entrez votre code PIN'}
            {step === 'nursery-selection' && `Bonjour ${employeeData?.user.first_name} — Sélectionnez votre crèche`}
            {step === 'no-nursery' && `Bonjour ${employeeData?.user.first_name}`}
          </p>
        </div>

        {/* Step 1: Username */}
        {step === 'username' && (
          <div className="bg-white rounded-3xl shadow-[0_16px_48px_-12px_rgba(90,157,201,0.15)] p-8 animate-slide-up border border-[#5a9dc9]/10">
            <form onSubmit={handleUsernameSubmit} className="space-y-6">
              <div>
                <label className="block text-xl font-medium mb-3 text-gray-700">
                  Adresse email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-6 py-4 text-xl rounded-2xl border border-[#5a9dc9]/30 focus:outline-none focus:ring-2 focus:ring-[#5a9dc9]/20 focus:border-[#5a9dc9] bg-white transition-colors"
                  placeholder="prenom.nom@exemple.com"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200/50 text-red-700 text-xl text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-r from-[#81c995] to-[#4a8f5a] text-white w-full h-16 text-2xl font-semibold rounded-2xl shadow-[0_8px_24px_-4px_rgba(129,201,149,0.4)] disabled:opacity-50 disabled:cursor-not-allowed active:opacity-80 transition-opacity relative overflow-hidden"
              >
                <span className="relative">Continuer</span>
              </button>
            </form>

            <div className="text-center mt-6">
              <a
                href="/login"
                className="text-xl text-[#5a9dc9] inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Retour à la connexion standard
              </a>
            </div>
          </div>
        )}

        {/* Step 2: PIN Entry */}
        {step === 'pin-entry' && (
          <div className="bg-white rounded-3xl shadow-[0_16px_48px_-12px_rgba(90,157,201,0.15)] p-8 animate-slide-up border border-[#5a9dc9]/10">
            {/* PIN Display */}
            <div className="flex justify-center items-center gap-6 mb-8">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-bold transition-all duration-300 ${
                    i < pin.length
                      ? 'bg-gradient-to-br from-[#5a9dc9] to-[#2c5f7f] border-2 border-[#5a9dc9] text-white scale-110 shadow-lg'
                      : 'bg-gray-50 border-2 border-gray-200 text-gray-300'
                  }`}
                >
                  {i < pin.length ? '•' : ''}
                </div>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200/50 text-red-700 text-xl text-center mb-6">
                {error}
              </div>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handlePinInput(digit.toString())}
                  disabled={isLoading || pin.length >= 4}
                  className="bg-gradient-to-br from-[#5a9dc9] to-[#2c5f7f] text-white h-24 text-3xl font-bold rounded-2xl shadow-[0_8px_24px_-4px_rgba(90,157,201,0.4)] active:scale-95 disabled:opacity-50 transition-transform duration-200"
                >
                  {digit}
                </button>
              ))}

              {/* Clear Button */}
              <button
                onClick={handleClear}
                disabled={isLoading}
                className="bg-gradient-to-br from-[#ffe5b4] to-[#ffd580] text-gray-800 h-24 text-xl rounded-2xl shadow-[0_8px_24px_-4px_rgba(255,229,180,0.4)] active:scale-95 transition-transform duration-200 font-semibold"
              >
                Effacer
              </button>

              {/* Zero */}
              <button
                onClick={() => handlePinInput('0')}
                disabled={isLoading || pin.length >= 4}
                className="bg-gradient-to-br from-[#5a9dc9] to-[#2c5f7f] text-white h-24 text-3xl font-bold rounded-2xl shadow-[0_8px_24px_-4px_rgba(90,157,201,0.4)] active:scale-95 disabled:opacity-50 transition-transform duration-200"
              >
                0
              </button>

              {/* Backspace */}
              <button
                onClick={handleBackspace}
                disabled={isLoading || pin.length === 0}
                className="bg-gray-200 text-gray-800 h-24 text-2xl rounded-2xl active:scale-95 disabled:opacity-50 transition-transform duration-200 font-semibold border border-gray-200"
              >
                ←
              </button>
            </div>

            {/* Back Button */}
            <button
              onClick={handleBack}
              disabled={isLoading}
              className="bg-gray-200 text-gray-800 w-full h-16 text-xl rounded-2xl font-semibold border border-gray-300 active:opacity-80 transition-opacity inline-flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour
            </button>
          </div>
        )}

        {/* Step 3a: Nursery Selection */}
        {step === 'nursery-selection' && (
          <div className="animate-slide-up">
            <div className="grid grid-cols-1 gap-6 mb-6">
              {nurseryAssignments.map((assignment) => (
                <button
                  key={assignment.nursery.id}
                  onClick={() => handleNurserySelect(assignment)}
                  className="relative bg-white rounded-3xl p-8 shadow-[0_16px_48px_-12px_rgba(90,157,201,0.25)] active:opacity-90 transition-opacity text-left border border-[#5a9dc9]/20 overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#f8fbfd] to-white opacity-60"></div>

                  <div className="relative z-10 flex items-center gap-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#5a9dc9] to-[#2c5f7f] rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">
                        {assignment.nursery.name}
                      </h3>
                      <div className="flex flex-wrap gap-3">
                        {assignment.shifts.map((shift) => (
                          <span
                            key={shift.id}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#5a9dc9]/10 text-[#2c5f7f] text-lg font-medium"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <svg className="w-8 h-8 text-[#5a9dc9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleBack}
              className="bg-gray-200 text-gray-800 w-full h-16 text-xl rounded-2xl font-semibold border border-gray-300 active:opacity-80 transition-opacity inline-flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour
            </button>
          </div>
        )}

        {/* Step 3b: No Nursery Assigned */}
        {step === 'no-nursery' && (
          <div className="bg-white rounded-3xl shadow-[0_16px_48px_-12px_rgba(90,157,201,0.15)] p-8 animate-slide-up border border-[#f4a5a5]/20">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[#ffe5b4] to-[#ffd580] rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-12 h-12 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Aucune crèche assignée aujourd'hui
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-lg mx-auto">
                Vous n'avez pas de crèche assignée pour aujourd'hui. Si vous pensez que c'est une erreur, contactez votre supérieur.
              </p>

              <button
                onClick={handleBack}
                className="bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f] text-white w-full max-w-md h-16 text-2xl font-semibold rounded-2xl shadow-[0_8px_24px_-4px_rgba(90,157,201,0.4)] active:opacity-80 transition-opacity relative overflow-hidden"
              >
                <span className="relative inline-flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Retour
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
