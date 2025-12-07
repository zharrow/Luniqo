'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTabletAuth } from '@/lib/contexts/TabletAuthContext'
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

  const { setSession } = useTabletAuth()
  const router = useRouter()

  // Step 1: Admin Login
  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      console.log('🔐 Attempting admin login...', { email: adminEmail })
      const response = await loginWithEmail(adminEmail, adminPassword)
      console.log('📥 Login response:', { success: response.success, role: response.role, hasEnterprise: !!response.enterprise })

      if (response.success && response.role === 'Owner' && response.enterprise) {
        setEnterpriseId(response.enterprise.id)
        setEnterpriseName(response.enterprise.name)

        console.log('🏢 Loading employees for enterprise:', response.enterprise.id)
        // Load employees for this enterprise
        const employeeList = await getEnterpriseEmployees(response.enterprise.id)
        console.log('👥 Employees loaded:', employeeList.length)

        if (employeeList.length === 0) {
          setError('Aucun employé actif trouvé pour cette entreprise')
        } else {
          setEmployees(employeeList)
          setStep('employee-selection')
          console.log('✅ Employee list loaded, ready for selection')
        }
      } else {
        console.error('❌ Login failed:', response.error || 'Invalid role or missing enterprise')
        setError('Connexion échouée. Seuls les administrateurs peuvent se connecter ici.')
      }
    } catch (err) {
      console.error('❌ Login error:', err)
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
      console.log('🔢 Verifying PIN for employee:', selectedEmployee.id)
      const response = await loginEmployeeWithPin(selectedEmployee.id, pin)
      console.log('✅ PIN verification response:', { success: response.success, role: response.role })

      if (response.success && response.data && response.enterprise) {
        console.log('💾 Setting tablet session...')

        // Store session using TabletAuthContext
        setSession({
          user: response.data as any, // Safe: loginEmployeeWithPin always returns User type
          enterprise: response.enterprise,
          accessibleRooms: response.accessibleRooms || []
        })

        console.log('✅ Tablet session set successfully')
        console.log('🚀 Redirecting to /tablet/home')
        router.push('/tablet/home')
      } else {
        console.error('❌ PIN verification failed:', response.error)
        setError(response.error || 'Code PIN incorrect')
        setPin('')
      }
    } catch (err) {
      console.error('❌ PIN submit error:', err)
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
    <div className="tablet-mode min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8fbfd] via-white to-[#fef6f7] p-8">
      <div className="w-full max-w-4xl">
        {/* Logo & Title */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-block p-6 bg-white rounded-3xl shadow-[0_8px_24px_-4px_rgba(90,157,201,0.15)] mb-6 hover:shadow-[0_12px_32px_-4px_rgba(90,157,201,0.25)] transition-all duration-300 hover:-translate-y-1">
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
            {step === 'admin-login' && 'Connexion administrateur'}
            {step === 'employee-selection' && `${enterpriseName} - Sélectionnez votre nom`}
            {step === 'pin-entry' && `Bonjour ${selectedEmployee?.first_name}`}
          </p>
        </div>

        {/* Step 1: Admin Login */}
        {step === 'admin-login' && (
          <div className="bg-white rounded-3xl shadow-[0_16px_48px_-12px_rgba(90,157,201,0.15)] p-8 animate-slide-up border border-[#5a9dc9]/10">
            <form onSubmit={handleAdminLogin} className="space-y-6">
              <div>
                <label className="block text-xl font-medium mb-3 text-gray-700">
                  Email administrateur
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-6 py-4 text-xl rounded-2xl border border-[#5a9dc9]/20 focus:outline-none focus:ring-2 focus:ring-[#5a9dc9]/20 focus:border-[#5a9dc9] bg-white transition-all duration-300 hover:border-[#5a9dc9]/40"
                  placeholder="admin@example.com"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-xl font-medium mb-3 text-gray-700">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-6 py-4 text-xl rounded-2xl border border-[#5a9dc9]/20 focus:outline-none focus:ring-2 focus:ring-[#5a9dc9]/20 focus:border-[#5a9dc9] bg-white transition-all duration-300 hover:border-[#5a9dc9]/40"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
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
                className="bg-gradient-to-r from-[#81c995] to-[#4a8f5a] text-white w-full h-16 text-2xl font-semibold rounded-2xl hover:shadow-[0_8px_24px_-4px_rgba(129,201,149,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-3 relative">
                    <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connexion...
                  </span>
                ) : (
                  <span className="relative">Continuer</span>
                )}
              </button>
            </form>

            <div className="text-center mt-6">
              <a
                href="/login"
                className="text-xl text-gray-600 hover:text-[#5a9dc9] transition-colors inline-flex items-center gap-2 group"
              >
                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Retour à la connexion standard
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
                  className="relative bg-white rounded-3xl p-8 hover:-translate-y-1 hover:shadow-[0_16px_48px_-12px_rgba(244,165,165,0.25)] transition-all duration-300 text-center border border-[#f4a5a5]/20 overflow-hidden group"
                >
                  {/* Gradient rose pastel en fond */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#fef6f7] to-white opacity-60"></div>

                  <div className="relative z-10">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-[#f4a5a5] to-[#c66b6b] rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
                      <span className="text-4xl font-bold text-white">
                        {employee.first_name.charAt(0)}{employee.last_name.charAt(0)}
                      </span>
                    </div>
                    <h3 className="text-2xl font-semibold mb-1 text-gray-900 tracking-tight">
                      {employee.first_name} {employee.last_name}
                    </h3>
                    {employee.email && (
                      <p className="text-lg text-gray-600">{employee.email}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleBack}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 w-full h-16 text-xl rounded-2xl transition-all font-semibold border border-gray-200 hover:border-gray-300 hover:-translate-y-0.5 inline-flex items-center justify-center gap-2 group"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour
            </button>
          </div>
        )}

        {/* Step 3: PIN Entry */}
        {step === 'pin-entry' && selectedEmployee && (
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
                  className="bg-gradient-to-br from-[#5a9dc9] to-[#2c5f7f] text-white h-24 text-3xl font-bold rounded-2xl hover:shadow-[0_8px_24px_-4px_rgba(90,157,201,0.4)] hover:scale-105 active:scale-95 disabled:opacity-50 transition-all duration-200"
                >
                  {digit}
                </button>
              ))}

              {/* Clear Button */}
              <button
                onClick={handleClear}
                disabled={isLoading}
                className="bg-gradient-to-br from-[#ffe5b4] to-[#ffd580] text-gray-800 h-24 text-xl rounded-2xl hover:shadow-[0_8px_24px_-4px_rgba(255,229,180,0.4)] hover:scale-105 active:scale-95 transition-all duration-200 font-semibold"
              >
                Effacer
              </button>

              {/* Zero */}
              <button
                onClick={() => handlePinInput('0')}
                disabled={isLoading || pin.length >= 4}
                className="bg-gradient-to-br from-[#5a9dc9] to-[#2c5f7f] text-white h-24 text-3xl font-bold rounded-2xl hover:shadow-[0_8px_24px_-4px_rgba(90,157,201,0.4)] hover:scale-105 active:scale-95 disabled:opacity-50 transition-all duration-200"
              >
                0
              </button>

              {/* Backspace */}
              <button
                onClick={handleBackspace}
                disabled={isLoading || pin.length === 0}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 h-24 text-2xl rounded-2xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all duration-200 font-semibold border border-gray-200"
              >
                ←
              </button>
            </div>

            {/* Back Button */}
            <button
              onClick={handleBack}
              disabled={isLoading}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 w-full h-16 text-xl rounded-2xl transition-all font-semibold border border-gray-200 hover:border-gray-300 hover:-translate-y-0.5 inline-flex items-center justify-center gap-2 group"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Changer d'employé
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
