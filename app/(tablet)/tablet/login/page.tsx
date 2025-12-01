'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { loginWithEmail, getEnterpriseEmployees, loginEmployeeWithPin } from '@/lib/utils/auth.client'

type Step = 'admin-login' | 'employee-selection' | 'pin-entry'

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string | null
}

export default function TabletLoginPage() {
  const [step, setStep] = useState<Step>('admin-login')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [enterpriseId, setEnterpriseId] = useState('')
  const [enterpriseName, setEnterpriseName] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { loginWithPin: contextLoginWithPin } = useAuth()
  const router = useRouter()

  // Step 1: Admin Login
  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await loginWithEmail(adminEmail, adminPassword)

      if (response.success && response.role === 'Admin' && response.enterprise) {
        setEnterpriseId(response.enterprise.id)
        setEnterpriseName(response.enterprise.name)

        // Load employees for this enterprise
        const employeeList = await getEnterpriseEmployees(response.enterprise.id)

        if (employeeList.length === 0) {
          setError('Aucun employé actif trouvé pour cette entreprise')
        } else {
          setEmployees(employeeList)
          setStep('employee-selection')
        }
      } else {
        setError('Connexion échouée. Seuls les administrateurs peuvent se connecter ici.')
      }
    } catch (err) {
      setError('Une erreur est survenue lors de la connexion')
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Employee Selection
  function handleEmployeeSelect(employee: Employee) {
    setSelectedEmployee(employee)
    setPin('')
    setError('')
    setStep('pin-entry')
  }

  // Step 3: PIN Entry
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
    if (!selectedEmployee || pin.length !== 4) {
      setError('Veuillez entrer un code PIN à 4 chiffres')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const response = await loginEmployeeWithPin(selectedEmployee.id, pin)

      if (response.success) {
        // Store session in localStorage
        const session = {
          user: response.data,
          role: response.role,
          enterprise: response.enterprise,
          accessibleRooms: response.accessibleRooms
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('user_session', JSON.stringify(session))
        }

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

  // Auto-submit when PIN is 4 digits
  useEffect(() => {
    if (pin.length === 4 && selectedEmployee) {
      handlePinSubmit()
    }
  }, [pin])

  function handleBack() {
    if (step === 'pin-entry') {
      setStep('employee-selection')
      setSelectedEmployee(null)
      setPin('')
      setError('')
    } else if (step === 'employee-selection') {
      setStep('admin-login')
      setEmployees([])
      setAdminEmail('')
      setAdminPassword('')
      setError('')
    }
  }

  return (
    <div className="tablet-mode min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-8">
      <div className="w-full max-w-4xl">
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
          <h1 className="text-5xl font-bold mb-3" style={{ fontFamily: 'Quicksand, sans-serif' }}>
            Connexion Employé
          </h1>
          <p className="text-2xl text-muted-foreground">
            {step === 'admin-login' && 'Connexion administrateur'}
            {step === 'employee-selection' && `${enterpriseName} - Sélectionnez votre nom`}
            {step === 'pin-entry' && `Bonjour ${selectedEmployee?.first_name}`}
          </p>
        </div>

        {/* Step 1: Admin Login */}
        {step === 'admin-login' && (
          <div className="bg-white rounded-3xl shadow-xl p-8 animate-slide-up">
            <form onSubmit={handleAdminLogin} className="space-y-6">
              <div>
                <label className="block text-xl font-medium mb-3">
                  Email administrateur
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-6 py-4 text-xl rounded-xl border-2 border-border focus:outline-none focus:ring-4 focus:ring-primary-500 focus:border-transparent bg-background"
                  placeholder="admin@example.com"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-xl font-medium mb-3">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-6 py-4 text-xl rounded-xl border-2 border-border focus:outline-none focus:ring-4 focus:ring-primary-500 focus:border-transparent bg-background"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-danger-50 border-2 border-danger-200 text-danger-700 text-xl text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="bg-green-500 text-white w-full h-16 text-2xl font-semibold rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                  'Continuer'
                )}
              </button>
            </form>

            <div className="text-center mt-6">
              <a
                href="/login"
                className="text-xl text-neutral-600 hover:text-primary-500 transition-colors"
              >
                ← Retour à la connexion standard
              </a>
            </div>
          </div>
        )}

        {/* Step 2: Employee Selection */}
        {step === 'employee-selection' && (
          <div className="animate-slide-up">
            <div className="grid grid-cols-2 gap-6 mb-6">
              {employees.map((employee) => (
                <button
                  key={employee.id}
                  onClick={() => handleEmployeeSelect(employee)}
                  className="bg-white rounded-3xl shadow-lg p-8 hover:shadow-2xl hover:scale-105 transition-all duration-200 active:scale-95 text-center"
                >
                  <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {employee.first_name.charAt(0)}{employee.last_name.charAt(0)}
                    </span>
                  </div>
                  <h3 className="text-2xl font-semibold mb-1">
                    {employee.first_name} {employee.last_name}
                  </h3>
                  {employee.email && (
                    <p className="text-lg text-muted-foreground">{employee.email}</p>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={handleBack}
              className="bg-gray-200 text-gray-800 w-full h-16 text-xl rounded-xl hover:bg-gray-300 transition-all font-semibold"
            >
              ← Retour
            </button>
          </div>
        )}

        {/* Step 3: PIN Entry */}
        {step === 'pin-entry' && selectedEmployee && (
          <div className="bg-white rounded-3xl shadow-xl p-8 animate-slide-up">
            {/* PIN Display */}
            <div className="flex justify-center items-center gap-6 mb-8">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-bold border-4 transition-all ${
                    i < pin.length
                      ? 'bg-primary-500 border-primary-600 text-white scale-110'
                      : 'bg-muted border-border text-muted-foreground/60'
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
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handlePinInput(digit.toString())}
                  disabled={isLoading || pin.length >= 4}
                  className="bg-purple-500 text-white h-24 text-3xl font-bold rounded-xl hover:bg-purple-600 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {digit}
                </button>
              ))}

              {/* Clear Button */}
              <button
                onClick={handleClear}
                disabled={isLoading}
                className="bg-orange-500 text-white h-24 text-xl rounded-xl hover:bg-orange-600 hover:scale-105 active:scale-95 transition-all font-semibold"
              >
                Effacer
              </button>

              {/* Zero */}
              <button
                onClick={() => handlePinInput('0')}
                disabled={isLoading || pin.length >= 4}
                className="bg-purple-500 text-white h-24 text-3xl font-bold rounded-xl hover:bg-purple-600 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
              >
                0
              </button>

              {/* Backspace */}
              <button
                onClick={handleBackspace}
                disabled={isLoading || pin.length === 0}
                className="bg-gray-200 text-gray-800 h-24 text-2xl rounded-xl hover:bg-gray-300 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all font-semibold"
              >
                ←
              </button>
            </div>

            {/* Back Button */}
            <button
              onClick={handleBack}
              disabled={isLoading}
              className="bg-gray-200 text-gray-800 w-full h-16 text-xl rounded-xl hover:bg-gray-300 transition-all font-semibold"
            >
              ← Changer d'employé
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
