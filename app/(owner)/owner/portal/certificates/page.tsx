'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { taxCertificateService, type TaxCertificate } from '@/lib/services/tax-certificate.service'
import { cafDocumentService, type CAFDocument } from '@/lib/services/caf-document.service'
import {
  DocumentTextIcon,
  PlusIcon,
  PaperAirplaneIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function CertificatesPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()

  const [taxCertificates, setTaxCertificates] = useState<any[]>([])
  const [cafDocuments, setCafDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString())

  useEffect(() => {
    if (selectedNursery?.id) {
      loadData()
    } else if (!authLoading && !selectedNursery) {
      setLoading(false)
    }
  }, [selectedNursery?.id, authLoading, selectedYear])

  async function loadData() {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)
      const [taxCerts, cafDocs] = await Promise.all([
        taxCertificateService.getByNursery(selectedNursery.id, parseInt(selectedYear)),
        cafDocumentService.getByNursery(selectedNursery.id, parseInt(selectedYear))
      ])
      setTaxCertificates(taxCerts)
      setCafDocuments(cafDocs)
    } catch (error) {
      console.error('Error loading certificates:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateAllTaxCertificates() {
    if (!selectedNursery?.id || !session?.user?.id) return

    const year = parseInt(selectedYear)
    if (!confirm(`Générer les attestations fiscales ${year} pour toutes les familles ?`)) return

    try {
      setGenerating(true)
      await taxCertificateService.generateForAllFamilies(
        selectedNursery.id,
        year,
        session.user.id
      )
      await loadData()
      alert('Attestations générées avec succès !')
    } catch (error) {
      console.error('Error generating certificates:', error)
      alert('Erreur lors de la génération')
    } finally {
      setGenerating(false)
    }
  }

  async function handleGenerateAllCAFDocuments() {
    if (!selectedNursery?.id || !session?.user?.id) return

    const year = parseInt(selectedYear)
    const month = parseInt(selectedMonth)
    if (!confirm(`Générer les attestations CAF pour ${getMonthName(month)} ${year} ?`)) return

    try {
      setGenerating(true)
      await cafDocumentService.bulkGenerateAttendanceCertificates(
        selectedNursery.id,
        month,
        year,
        session.user.id
      )
      await loadData()
      alert('Attestations CAF générées avec succès !')
    } catch (error) {
      console.error('Error generating CAF documents:', error)
      alert('Erreur lors de la génération')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSendCertificate(certificateId: string) {
    try {
      await taxCertificateService.send(certificateId)
      await loadData()
      alert('Attestation envoyée !')
    } catch (error) {
      console.error('Error sending certificate:', error)
      alert('Erreur lors de l\'envoi')
    }
  }

  async function handleSendCAFDocument(documentId: string) {
    try {
      await cafDocumentService.send(documentId)
      await loadData()
      alert('Document CAF envoyé !')
    } catch (error) {
      console.error('Error sending document:', error)
      alert('Erreur lors de l\'envoi')
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  function getMonthName(month: number): string {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]
    return months[month - 1] || ''
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!selectedNursery) {
    return (
      <div className="p-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-yellow-800">Veuillez sélectionner une crèche.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <PageBreadcrumb
          items={[
            { label: 'Accueil', href: '/owner/dashboard' },
            { label: 'Portail Parents', href: '/owner/portal' },
            { label: 'Attestations' }
          ]}
        />
        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">Attestations Fiscales & CAF</h1>
          <p className="mt-2 text-gray-600">
            Gérez les attestations fiscales et documents CAF pour les familles
          </p>
        </div>
      </div>

      {/* Year/Month Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Année
              </label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Mois (pour CAF)
              </label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month} value={month.toString()}>
                      {getMonthName(month)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="tax" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tax">
            Attestations Fiscales ({taxCertificates.length})
          </TabsTrigger>
          <TabsTrigger value="caf">
            Documents CAF ({cafDocuments.length})
          </TabsTrigger>
        </TabsList>

        {/* Tax Certificates */}
        <TabsContent value="tax" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{taxCertificates.length}</p>
                  </div>
                  <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Envoyées</p>
                    <p className="text-2xl font-bold text-green-900">
                      {taxCertificates.filter(c => c.is_sent).length}
                    </p>
                  </div>
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Montant Total</p>
                    <p className="text-xl font-bold text-purple-900">
                      {formatCurrency(taxCertificates.reduce((sum, c) => sum + c.deductible_amount, 0))}
                    </p>
                  </div>
                  <DocumentTextIcon className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleGenerateAllTaxCertificates}
              disabled={generating}
              className="bg-green-600 hover:bg-green-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              {generating ? 'Génération...' : `Générer pour toutes les familles ${selectedYear}`}
            </Button>
          </div>

          {/* Certificates List */}
          {taxCertificates.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Aucune attestation pour {selectedYear}</p>
                <Button
                  onClick={handleGenerateAllTaxCertificates}
                  disabled={generating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Générer les attestations
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {taxCertificates.map(cert => (
                <Card key={cert.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                        {cert.certificate_number}
                      </Badge>
                      {cert.is_sent ? (
                        <Badge className="bg-green-600 text-white">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          Envoyée
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-800">
                          Non envoyée
                        </Badge>
                      )}
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900">
                        {cert.family?.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {cert.child?.first_name} {cert.child?.last_name}
                      </p>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payé:</span>
                        <span className="font-medium">{formatCurrency(cert.total_paid)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">CAF:</span>
                        <span className="font-medium text-orange-700">-{formatCurrency(cert.caf_contribution)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="text-gray-900 font-semibold">Déductible:</span>
                        <span className="font-bold text-green-700">{formatCurrency(cert.deductible_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Crédit impôt:</span>
                        <span className="font-medium text-purple-700">{formatCurrency(cert.tax_credit_amount)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500">
                      Générée le {formatDate(cert.issued_at)}
                    </p>

                    <div className="flex gap-2 pt-2 border-t">
                      {!cert.is_sent && (
                        <Button
                          size="sm"
                          onClick={() => handleSendCertificate(cert.id)}
                          className="flex-1"
                        >
                          <PaperAirplaneIcon className="h-4 w-4 mr-1" />
                          Envoyer
                        </Button>
                      )}
                      {cert.pdf_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(cert.pdf_url, '_blank')}
                          className="flex-1"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CAF Documents */}
        <TabsContent value="caf" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{cafDocuments.length}</p>
                  </div>
                  <DocumentTextIcon className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Envoyés</p>
                    <p className="text-2xl font-bold text-green-900">
                      {cafDocuments.filter(d => d.is_sent).length}
                    </p>
                  </div>
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Ce Mois</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {cafDocuments.filter(d => d.month === parseInt(selectedMonth)).length}
                    </p>
                  </div>
                  <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleGenerateAllCAFDocuments}
              disabled={generating}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              {generating ? 'Génération...' : `Générer pour ${getMonthName(parseInt(selectedMonth))} ${selectedYear}`}
            </Button>
          </div>

          {/* CAF Documents List */}
          {cafDocuments.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Aucun document CAF pour {selectedYear}</p>
                <Button
                  onClick={handleGenerateAllCAFDocuments}
                  disabled={generating}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Générer les documents
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {cafDocuments.map(doc => (
                <Card key={doc.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                            {doc.document_number}
                          </Badge>
                          <Badge variant="outline" className={
                            doc.document_type === 'attendance_certificate'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-purple-100 text-purple-800 border-purple-300'
                          }>
                            {doc.document_type === 'attendance_certificate' ? 'Présence' : 'Paiement'}
                          </Badge>
                          {doc.is_sent && (
                            <Badge className="bg-green-600 text-white">
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              Envoyé
                            </Badge>
                          )}
                        </div>

                        <p className="font-semibold text-gray-900">
                          {doc.family?.name} - {doc.child?.first_name} {doc.child?.last_name}
                        </p>

                        <p className="text-sm text-gray-600 mt-1">
                          {getMonthName(doc.month)} {doc.year}
                        </p>

                        <p className="text-xs text-gray-500 mt-1">
                          Généré le {formatDate(doc.generated_at)}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {!doc.is_sent && (
                          <Button
                            size="sm"
                            onClick={() => handleSendCAFDocument(doc.id)}
                          >
                            <PaperAirplaneIcon className="h-4 w-4 mr-1" />
                            Envoyer
                          </Button>
                        )}
                        {doc.pdf_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(doc.pdf_url, '_blank')}
                          >
                            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
