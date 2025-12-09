'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { haccpService, type NonCompliance, type CreateNonComplianceInput, type ComplianceType, type ComplianceStatus } from '@/lib/services/haccp.service'
import { usersService, type ProfileWithRooms } from '@/lib/services/users.service'
import {
  PlusIcon,
  PencilIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { FormDialog } from '@/components/shared/FormDialog'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function NonCompliancesPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const router = useRouter()
  const [nonCompliances, setNonCompliances] = useState<NonCompliance[]>([])
  const [users, setUsers] = useState<ProfileWithRooms[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingNC, setEditingNC] = useState<NonCompliance | null>(null)
  const [filterStatus, setFilterStatus] = useState<ComplianceStatus | 'ALL'>('ALL')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreateNonComplianceInput | any>({
    type: 'Other',
    description: '',
    discovered_at: new Date().toISOString().slice(0, 16),
    discovered_by_id: '',
    corrective_action: ''
  })

  useEffect(() => {
    if (session?.enterprise) {
      loadData()
    }
  }, [session])

  async function loadData() {
    if (!session?.enterprise?.id) return

    try {
      setLoading(true)
      const [ncData, usersData] = await Promise.all([
        haccpService.getNonCompliances(session.enterprise.id),
        usersService.getEmployees(session.enterprise.id)
      ])
      setNonCompliances(ncData)
      setUsers(usersData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingNC(null)
    setFormData({
      type: 'Other',
      description: '',
      discovered_at: new Date().toISOString().slice(0, 16),
      discovered_by_id: users[0]?.id || session?.user?.id || '',
      corrective_action: ''
    })
    setShowModal(true)
  }

  function openEditModal(nc: NonCompliance) {
    setEditingNC(nc)
    setFormData({
      type: nc.type,
      description: nc.description,
      corrective_action: nc.corrective_action || '',
      status: nc.status,
      closed_at: nc.closed_at || ''
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.enterprise?.id) return

    try {
      setIsSubmitting(true)
      if (editingNC) {
        const updateData: any = {
          type: formData.type,
          description: formData.description,
          corrective_action: formData.corrective_action,
          status: formData.status
        }
        if (formData.status === 'Closed' && !editingNC.closed_at) {
          updateData.closed_at = new Date().toISOString()
        }
        await haccpService.updateNonCompliance(editingNC.id, session.enterprise.id, updateData)
      } else {
        await haccpService.createNonCompliance(session.enterprise.id, formData)
      }

      setShowModal(false)
      loadData()
    } catch (error) {
      console.error('Error saving non-compliance:', error)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: ComplianceStatus) => {
    switch (status) {
      case 'Open': return 'bg-danger-50 text-danger-700 border-danger-200'
      case 'Corrected': return 'bg-accent-50 text-accent-700 border-accent-200'
      case 'Closed': return 'bg-success-50 text-success-700 border-success-200'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getStatusIcon = (status: ComplianceStatus) => {
    switch (status) {
      case 'Open': return <ExclamationTriangleIcon className="w-5 h-5" />
      case 'Corrected': return <ClockIcon className="w-5 h-5" />
      case 'Closed': return <CheckCircleIcon className="w-5 h-5" />
      default: return <XCircleIcon className="w-5 h-5" />
    }
  }

  const getStatusLabel = (status: ComplianceStatus) => {
    switch (status) {
      case 'Open': return 'Ouvert'
      case 'Corrected': return 'Corrigé'
      case 'Closed': return 'Fermé'
      default: return status
    }
  }

  const getTypeColor = (type: ComplianceType) => {
    switch (type) {
      case 'Product': return 'bg-accent-50 text-accent-700'
      case 'Temperature': return 'bg-primary-50 text-primary-700'
      case 'Hygiene': return 'bg-secondary-50 text-secondary-700'
      case 'Other': return 'bg-muted text-muted-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getTypeLabel = (type: ComplianceType) => {
    switch (type) {
      case 'Product': return 'Produit'
      case 'Temperature': return 'Température'
      case 'Hygiene': return 'Hygiène'
      case 'Other': return 'Autre'
      default: return type
    }
  }

  const filteredNCs = filterStatus === 'ALL'
    ? nonCompliances
    : nonCompliances.filter(nc => nc.status === filterStatus)

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <PageBreadcrumb
          items={[
            { label: 'Dashboard', href: '/owner/dashboard' },
            { label: 'HACCP', href: '/owner/haccp' },
            { label: 'Non-conformités' }
          ]}
        />

        {/* Header with Gradient - Module Users (Rose) */}
        <div className="relative mb-8 p-8 rounded-3xl bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 border border-rose-200/50 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/patterns/dots.svg')] opacity-5"></div>
          <div className="relative flex items-center gap-4">
            <button
              onClick={() => router.push('/owner/haccp')}
              className="p-3 rounded-2xl bg-white/80 hover:bg-white hover:scale-110 transition-all duration-200 shadow-md"
              title="Retour au HACCP"
            >
              <ArrowLeftIcon className="w-5 h-5 text-rose-600" />
            </button>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
              <ExclamationTriangleIcon className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                Non-conformités
              </h1>
              <p className="text-rose-700/70">
                Suivi des incidents et actions correctives
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Déclarer un incident
            </button>
          </div>
        </div>

        {/* Stats - Couleurs variées */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Tous', value: nonCompliances.length, status: 'ALL', gradient: 'from-gray-50 to-slate-50', border: 'gray-200', shadow: 'gray-500' },
            { label: 'Ouverts', value: nonCompliances.filter(nc => nc.status === 'Open').length, status: 'Open', gradient: 'from-rose-50 to-red-50', border: 'rose-200', shadow: 'rose-500' },
            { label: 'Corrigés', value: nonCompliances.filter(nc => nc.status === 'Corrected').length, status: 'Corrected', gradient: 'from-amber-50 to-orange-50', border: 'amber-200', shadow: 'amber-500' },
            { label: 'Fermés', value: nonCompliances.filter(nc => nc.status === 'Closed').length, status: 'Closed', gradient: 'from-emerald-50 to-teal-50', border: 'emerald-200', shadow: 'emerald-500' }
          ].map((stat) => (
            <button
              key={stat.status}
              onClick={() => setFilterStatus(stat.status as any)}
              className={`group p-4 rounded-3xl bg-gradient-to-br ${stat.gradient} border border-${stat.border}/50 hover:shadow-lg hover:shadow-${stat.shadow}/20 transition-all duration-300 hover:scale-105 text-left ${
                filterStatus === stat.status ? 'ring-2 ring-rose-500' : ''
              }`}
            >
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </button>
          ))}
        </div>

        {/* Non-compliances list */}
        {filteredNCs.length === 0 ? (
          <div className="card p-12 text-center">
            <CheckCircleIcon className="w-16 h-16 text-success-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {filterStatus === 'ALL' ? 'Aucune non-conformité' : `Aucune non-conformité ${getStatusLabel(filterStatus as ComplianceStatus).toLowerCase()}`}
            </h3>
            <p className="text-muted-foreground mb-4">
              {filterStatus === 'Open' ? 'Aucun incident ouvert actuellement' : 'Bonne nouvelle !'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNCs.map((nc) => {
              const user = users.find(u => u.id === nc.discovered_by_id)

              return (
                <div key={nc.id} className="group relative p-6 rounded-3xl bg-gradient-to-br from-rose-50/80 to-pink-50/80 border border-rose-200/50 hover:shadow-lg hover:shadow-rose-500/20 transition-all duration-300 hover:scale-[1.01]">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-2xl ${getStatusColor(nc.status)} shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                        {getStatusIcon(nc.status)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(nc.type)}`}>
                            {getTypeLabel(nc.type)}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(nc.status)}`}>
                            {getStatusLabel(nc.status)}
                          </span>
                        </div>

                        <h3 className="font-semibold mb-2">
                          {nc.description}
                        </h3>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <span>
                            Découvert le {format(new Date(nc.discovered_at), 'd MMMM yyyy à HH:mm', { locale: fr })}
                          </span>
                          {user && (
                            <span>
                              par {user.first_name} {user.last_name}
                            </span>
                          )}
                        </div>

                        {nc.corrective_action && (
                          <div className="p-3 rounded-lg bg-accent-50 border border-accent-200">
                            <p className="text-xs font-medium text-accent-900 mb-1">Action corrective</p>
                            <p className="text-sm text-accent-700">{nc.corrective_action}</p>
                          </div>
                        )}

                        {nc.closed_at && (
                          <div className="mt-3 text-sm text-success-600">
                            Fermé le {format(new Date(nc.closed_at), 'd MMMM yyyy', { locale: fr })}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => openEditModal(nc)}
                      className="p-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
                      title="Modifier"
                    >
                      <PencilIcon className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Form Dialog */}
        <FormDialog
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          title={editingNC ? 'Modifier la non-conformité' : 'Déclarer une non-conformité'}
          submitLabel={editingNC ? 'Modifier' : 'Déclarer'}
          isSubmitting={isSubmitting}
          maxWidth="md"
        >
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Type *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as ComplianceType })}
                      className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
                      required
                    >
                      <option value="Product">Produit</option>
                      <option value="Temperature">Température</option>
                      <option value="Hygiene">Hygiène</option>
                      <option value="Other">Autre</option>
                    </select>
                  </div>

                  {!editingNC && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Date et heure de découverte *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.discovered_at}
                        onChange={(e) => setFormData({ ...formData, discovered_at: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
                        required
                      />
                    </div>
                  )}

                  {!editingNC && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Découvert par *
                      </label>
                      <select
                        value={formData.discovered_by_id}
                        onChange={(e) => setFormData({ ...formData, discovered_by_id: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
                        required
                      >
                        <option value="">Sélectionner une personne</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.first_name} {user.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
                      placeholder="Décrivez l'incident en détail"
                      rows={4}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Action corrective
                    </label>
                    <textarea
                      value={formData.corrective_action}
                      onChange={(e) => setFormData({ ...formData, corrective_action: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
                      placeholder="Décrivez l'action corrective mise en place"
                      rows={3}
                    />
                  </div>

                  {editingNC && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Statut *
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as ComplianceStatus })}
                        className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
                        required
                      >
                        <option value="Open">Ouvert</option>
                        <option value="Corrected">Corrigé</option>
                        <option value="Closed">Fermé</option>
                      </select>
                    </div>
                  )}
        </FormDialog>
      </div>
    </div>
  )
}
