'use client'

import { useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { useRouter } from 'next/navigation'
import {
  CalendarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function GenerateInvoicesPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const router = useRouter()

  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [step, setStep] = useState<'select' | 'preview' | 'generating' | 'completed'>('select')
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationResults, setGenerationResults] = useState<{
    total: number
    succeeded: number
    failed: number
  } | null>(null)

  // Génère les options de mois
  const months = [
    { value: '01', label: 'Janvier' },
    { value: '02', label: 'Février' },
    { value: '03', label: 'Mars' },
    { value: '04', label: 'Avril' },
    { value: '05', label: 'Mai' },
    { value: '06', label: 'Juin' },
    { value: '07', label: 'Juillet' },
    { value: '08', label: 'Août' },
    { value: '09', label: 'Septembre' },
    { value: '10', label: 'Octobre' },
    { value: '11', label: 'Novembre' },
    { value: '12', label: 'Décembre' },
  ]

  // Génère les années (année en cours - 1 jusqu'à année en cours)
  const currentYear = new Date().getFullYear()
  const years = [
    { value: (currentYear - 1).toString(), label: (currentYear - 1).toString() },
    { value: currentYear.toString(), label: currentYear.toString() },
  ]

  const handlePreview = () => {
    if (!selectedMonth || !selectedYear) return
    setStep('preview')
  }

  const handleGenerate = async () => {
    setStep('generating')
    setGenerationProgress(0)

    // Simulation de la génération
    const interval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setStep('completed')
          setGenerationResults({
            total: 15,
            succeeded: 14,
            failed: 1,
          })
          return 100
        }
        return prev + 10
      })
    }, 300)

    // TODO: Implémenter la vraie génération avec invoicingService
    // const result = await invoicingService.generateMonthlyInvoices(selectedNursery.id, `${selectedYear}-${selectedMonth}`)
  }

  if (authLoading || nurseryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Génération des factures</h1>
        <p className="text-muted-foreground">
          Générez automatiquement les factures mensuelles pour toutes les familles
        </p>
      </div>

      {/* Étapes */}
      <div className="mb-8 flex items-center justify-center gap-4">
        <div className={`flex items-center gap-2 ${step === 'select' ? 'text-primary-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === 'select' ? 'bg-primary-600 text-white' : 'bg-gray-200'
          }`}>
            1
          </div>
          <span className="font-medium">Sélection</span>
        </div>

        <ArrowRightIcon className="w-5 h-5 text-gray-400" />

        <div className={`flex items-center gap-2 ${step === 'preview' ? 'text-primary-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === 'preview' ? 'bg-primary-600 text-white' : 'bg-gray-200'
          }`}>
            2
          </div>
          <span className="font-medium">Aperçu</span>
        </div>

        <ArrowRightIcon className="w-5 h-5 text-gray-400" />

        <div className={`flex items-center gap-2 ${step === 'generating' || step === 'completed' ? 'text-primary-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === 'generating' || step === 'completed' ? 'bg-primary-600 text-white' : 'bg-gray-200'
          }`}>
            3
          </div>
          <span className="font-medium">Génération</span>
        </div>
      </div>

      {/* Étape 1 : Sélection du mois */}
      {step === 'select' && (
        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary-600" />
                Sélectionnez la période
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Choisissez le mois pour lequel vous souhaitez générer les factures
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Mois */}
              <div>
                <label className="block text-sm font-medium mb-2">Mois</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un mois" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Année */}
              <div>
                <label className="block text-sm font-medium mb-2">Année</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une année" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Informations */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Important</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>Les factures seront générées pour tous les contrats actifs</li>
                    <li>Le calcul se base sur les présences et horaires contractuels</li>
                    <li>Vous pourrez vérifier chaque facture avant envoi</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => router.back()}
              >
                Annuler
              </Button>
              <Button
                onClick={handlePreview}
                disabled={!selectedMonth || !selectedYear}
              >
                Suivant : Aperçu
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Étape 2 : Aperçu */}
      {step === 'preview' && (
        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Aperçu de la génération</h2>
              <p className="text-sm text-gray-600">
                Période : {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
              </p>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 bg-blue-50 border-blue-200">
                <p className="text-sm text-gray-600 mb-1">Contrats actifs</p>
                <p className="text-2xl font-bold">15</p>
              </Card>

              <Card className="p-4 bg-green-50 border-green-200">
                <p className="text-sm text-gray-600 mb-1">Factures à créer</p>
                <p className="text-2xl font-bold">15</p>
              </Card>

              <Card className="p-4 bg-purple-50 border-purple-200">
                <p className="text-sm text-gray-600 mb-1">CA estimé</p>
                <p className="text-2xl font-bold">12 450 €</p>
              </Card>
            </div>

            {/* Liste des contrats (simulation) */}
            <div>
              <h3 className="font-medium mb-3">Contrats concernés</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {[...Array(15)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">Famille {String.fromCharCode(65 + i)}</p>
                        <p className="text-sm text-gray-600">Contrat régulier</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">830,00 €</p>
                      <p className="text-xs text-gray-600">Estimé</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Avertissement */}
            <Card className="p-4 bg-yellow-50 border-yellow-200">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-900">
                  <p className="font-medium mb-1">Vérification avant génération</p>
                  <p>
                    Les factures seront créées en statut <strong>brouillon</strong>.
                    Vous pourrez les vérifier et les modifier avant de les envoyer aux familles.
                  </p>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setStep('select')}
              >
                Retour
              </Button>
              <Button
                onClick={handleGenerate}
              >
                Générer les factures
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Étape 3 : Génération en cours */}
      {step === 'generating' && (
        <Card className="p-6">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600"></div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Génération en cours...</h2>
              <p className="text-sm text-gray-600">
                Veuillez patienter pendant la création des factures
              </p>
            </div>

            {/* Barre de progression */}
            <div className="max-w-md mx-auto">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-primary-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">{generationProgress}%</p>
            </div>
          </div>
        </Card>
      )}

      {/* Étape 4 : Terminé */}
      {step === 'completed' && generationResults && (
        <Card className="p-6">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="w-10 h-10 text-green-600" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-2">Génération terminée !</h2>
              <p className="text-gray-600">
                Les factures ont été créées avec succès
              </p>
            </div>

            {/* Résultats */}
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              <Card className="p-4 bg-blue-50 border-blue-200">
                <p className="text-sm text-gray-600 mb-1">Total</p>
                <p className="text-3xl font-bold">{generationResults.total}</p>
              </Card>

              <Card className="p-4 bg-green-50 border-green-200">
                <p className="text-sm text-gray-600 mb-1">Réussies</p>
                <p className="text-3xl font-bold text-green-600">{generationResults.succeeded}</p>
              </Card>

              {generationResults.failed > 0 && (
                <Card className="p-4 bg-red-50 border-red-200">
                  <p className="text-sm text-gray-600 mb-1">Échecs</p>
                  <p className="text-3xl font-bold text-red-600">{generationResults.failed}</p>
                </Card>
              )}
            </div>

            {/* Prochaines étapes */}
            <Card className="p-4 bg-blue-50 border-blue-200 text-left">
              <p className="font-medium mb-2 text-blue-900">Prochaines étapes :</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Vérifiez les factures créées dans la liste</li>
                <li>Modifiez si nécessaire (les factures sont en brouillon)</li>
                <li>Envoyez les factures aux familles</li>
              </ol>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-center gap-4 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('select')
                  setSelectedMonth('')
                  setGenerationProgress(0)
                  setGenerationResults(null)
                }}
              >
                Nouvelle génération
              </Button>
              <Button
                onClick={() => router.push('/owner/invoicing/invoices')}
              >
                Voir les factures
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
