'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import {
  popupEventsService,
  PopupEvent,
  PopupEventType,
  PopupTheme
} from '@/lib/services/popup-events.service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  MegaphoneIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  CalendarIcon,
  ChartBarIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

// Theme labels and colors for display
const themeConfig: Record<PopupTheme, { label: string; color: string; bg: string }> = {
  neutral: { label: 'Neutre', color: 'text-blue-700', bg: 'bg-blue-100' },
  valentine: { label: 'Saint Valentin', color: 'text-pink-700', bg: 'bg-pink-100' },
  christmas: { label: 'Noel', color: 'text-green-700', bg: 'bg-green-100' },
  celebration: { label: 'Celebration', color: 'text-orange-700', bg: 'bg-orange-100' },
  warning: { label: 'Alerte', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  success: { label: 'Succes', color: 'text-emerald-700', bg: 'bg-emerald-100' },
}

const eventTypeLabels: Record<PopupEventType, string> = {
  first_login_after_setup: 'Premiere connexion',
  seasonal_valentine: 'Saint Valentin',
  seasonal_christmas: 'Noel',
  seasonal_new_year: 'Nouvel An',
  promotional: 'Promotion',
  announcement: 'Annonce',
}

// Empty form state
const emptyForm = {
  event_key: '',
  event_type: 'promotional' as PopupEventType,
  title: '',
  description: '',
  emoji: '',
  image_url: '',
  theme: 'neutral' as PopupTheme,
  cta_label: '',
  cta_url: '',
  promo_code: '',
  promo_description: '',
  target_roles: [] as string[],
  start_date: '',
  end_date: '',
  dismissible: true,
  show_dont_show_again: true,
  priority: 0,
  max_views: 1,
  is_active: true,
}

export default function PopupsPage() {
  const { session, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [events, setEvents] = useState<PopupEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Dialog states
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<PopupEvent | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [formLoading, setFormLoading] = useState(false)

  // Analytics
  const [analytics, setAnalytics] = useState<Record<string, {
    total_views: number
    unique_viewers: number
    cta_clicks: number
    promo_copies: number
  }>>({})

  useEffect(() => {
    if (!authLoading && session) {
      if (session.role !== 'Developer') {
        router.push('/owner/dashboard')
        return
      }
      loadData()
    }
  }, [session, authLoading, router])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      const eventsData = await popupEventsService.getAllEvents()
      setEvents(eventsData)

      // Load analytics for each event
      const analyticsData: typeof analytics = {}
      for (const event of eventsData) {
        const stats = await popupEventsService.getEventAnalytics(event.id)
        analyticsData[event.id] = stats
      }
      setAnalytics(analyticsData)
    } catch (err) {
      console.error('Error loading popups:', err)
      setError('Erreur lors du chargement des popups')
    } finally {
      setLoading(false)
    }
  }

  function openCreateDialog() {
    setSelectedEvent(null)
    setFormData(emptyForm)
    setIsFormDialogOpen(true)
  }

  function openEditDialog(event: PopupEvent) {
    setSelectedEvent(event)
    setFormData({
      event_key: event.event_key,
      event_type: event.event_type,
      title: event.title,
      description: event.description || '',
      emoji: event.emoji || '',
      image_url: event.image_url || '',
      theme: event.theme,
      cta_label: event.cta_label || '',
      cta_url: event.cta_url || '',
      promo_code: event.promo_code || '',
      promo_description: event.promo_description || '',
      target_roles: event.target_roles || [],
      start_date: event.start_date ? event.start_date.split('T')[0] : '',
      end_date: event.end_date ? event.end_date.split('T')[0] : '',
      dismissible: event.dismissible,
      show_dont_show_again: event.show_dont_show_again,
      priority: event.priority,
      max_views: event.max_views || 1,
      is_active: event.is_active,
    })
    setIsFormDialogOpen(true)
  }

  function openDeleteDialog(event: PopupEvent) {
    setSelectedEvent(event)
    setIsDeleteDialogOpen(true)
  }

  function openPreviewDialog(event: PopupEvent) {
    setSelectedEvent(event)
    setIsPreviewDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true)
    setError(null)

    try {
      const payload = {
        ...formData,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        target_roles: formData.target_roles.length > 0 ? formData.target_roles : [],
        target_enterprise_ids: [],
        custom_styles: null,
      }

      if (selectedEvent) {
        await popupEventsService.updateEvent(selectedEvent.id, payload)
        setSuccess('Popup mise a jour avec succes')
      } else {
        await popupEventsService.createEvent(payload as any)
        setSuccess('Popup creee avec succes')
      }

      setIsFormDialogOpen(false)
      loadData()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDelete() {
    if (!selectedEvent) return

    setFormLoading(true)
    try {
      await popupEventsService.deleteEvent(selectedEvent.id)
      setSuccess('Popup supprimee avec succes')
      setIsDeleteDialogOpen(false)
      loadData()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleToggleActive(event: PopupEvent) {
    try {
      await popupEventsService.toggleEventActive(event.id, !event.is_active)
      setSuccess(`Popup ${!event.is_active ? 'activee' : 'desactivee'}`)
      loadData()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la modification')
    }
  }

  function handleRoleToggle(role: string) {
    setFormData(prev => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter(r => r !== role)
        : [...prev.target_roles, role]
    }))
  }

  // Format date for display
  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // Check if event is currently active (within date range)
  function isEventLive(event: PopupEvent) {
    if (!event.is_active) return false
    const now = new Date()
    if (event.start_date && new Date(event.start_date) > now) return false
    if (event.end_date && new Date(event.end_date) < now) return false
    return true
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Gestion des Popups</h1>
          <p className="text-muted-foreground mt-1">
            Creez et gerez les popups evenementielles (bienvenue, promotions, saisonnieres)
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <PlusIcon className="w-5 h-5" />
          Nouvelle Popup
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-100">
                <MegaphoneIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{events.length}</p>
                <p className="text-sm text-muted-foreground">Total popups</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100">
                <SparklesIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{events.filter(e => isEventLive(e)).length}</p>
                <p className="text-sm text-muted-foreground">Actives</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100">
                <EyeIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Object.values(analytics).reduce((sum, a) => sum + a.total_views, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Vues totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-100">
                <ChartBarIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Object.values(analytics).reduce((sum, a) => sum + a.cta_clicks, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Clics CTA</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Popups</CardTitle>
          <CardDescription>
            Gerez vos popups evenementielles, modifiez les dates et codes promo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-12">
              <MegaphoneIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune popup creee</p>
              <Button onClick={openCreateDialog} variant="outline" className="mt-4">
                Creer votre premiere popup
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => {
                const theme = themeConfig[event.theme]
                const live = isEventLive(event)
                const stats = analytics[event.id]

                return (
                  <div
                    key={event.id}
                    className={`border rounded-xl p-4 transition-all ${
                      live ? 'border-green-200 bg-green-50/30' : 'border-neutral-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Emoji/Icon */}
                        <div className={`text-4xl ${!event.emoji && 'p-3 rounded-xl bg-neutral-100'}`}>
                          {event.emoji || <MegaphoneIcon className="w-8 h-8 text-neutral-400" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{event.title}</h3>
                            <Badge className={`${theme.bg} ${theme.color}`}>
                              {theme.label}
                            </Badge>
                            <Badge variant="outline">
                              {eventTypeLabels[event.event_type]}
                            </Badge>
                            {live && (
                              <Badge className="bg-green-500 text-white">
                                En cours
                              </Badge>
                            )}
                            {!event.is_active && (
                              <Badge variant="secondary">Desactivee</Badge>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {event.description || 'Pas de description'}
                          </p>

                          {/* Dates & Promo */}
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-4 h-4" />
                              {formatDate(event.start_date)} - {formatDate(event.end_date)}
                            </span>
                            {event.promo_code && (
                              <span className="font-mono bg-neutral-100 px-2 py-0.5 rounded">
                                {event.promo_code}
                              </span>
                            )}
                          </div>

                          {/* Stats */}
                          {stats && (
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>{stats.total_views} vues</span>
                              <span>{stats.unique_viewers} utilisateurs</span>
                              <span>{stats.cta_clicks} clics</span>
                              {event.promo_code && <span>{stats.promo_copies} copies</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={event.is_active}
                          onCheckedChange={() => handleToggleActive(event)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openPreviewDialog(event)}
                        >
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(event)}
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => openDeleteDialog(event)}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent ? 'Modifier la popup' : 'Nouvelle popup'}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent
                ? 'Modifiez les informations de cette popup evenementielle'
                : 'Creez une nouvelle popup pour vos utilisateurs'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_key">Cle unique *</Label>
                <Input
                  id="event_key"
                  value={formData.event_key}
                  onChange={(e) => setFormData({ ...formData, event_key: e.target.value })}
                  placeholder="valentine_2026"
                  required
                  disabled={!!selectedEvent}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event_type">Type *</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(v) => setFormData({ ...formData, event_type: v as PopupEventType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(eventTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Joyeuse Saint Valentin !"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Profitez de notre offre speciale..."
                rows={3}
              />
            </div>

            {/* Appearance */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emoji">Emoji</Label>
                <Input
                  id="emoji"
                  value={formData.emoji}
                  onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                  placeholder="💝"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme">Theme visuel *</Label>
                <Select
                  value={formData.theme}
                  onValueChange={(v) => setFormData({ ...formData, theme: v as PopupTheme })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(themeConfig).map(([value, config]) => (
                      <SelectItem key={value} value={value}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* CTA */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cta_label">Texte du bouton</Label>
                <Input
                  id="cta_label"
                  value={formData.cta_label}
                  onChange={(e) => setFormData({ ...formData, cta_label: e.target.value })}
                  placeholder="Decouvrir"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cta_url">URL du bouton</Label>
                <Input
                  id="cta_url"
                  value={formData.cta_url}
                  onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                  placeholder="/owner/modules"
                />
              </div>
            </div>

            {/* Promo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="promo_code">Code promo</Label>
                <Input
                  id="promo_code"
                  value={formData.promo_code}
                  onChange={(e) => setFormData({ ...formData, promo_code: e.target.value })}
                  placeholder="LOVE2026"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo_description">Description du code</Label>
                <Input
                  id="promo_description"
                  value={formData.promo_description}
                  onChange={(e) => setFormData({ ...formData, promo_description: e.target.value })}
                  placeholder="-10% sur un module"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Date de debut</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Date de fin</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            {/* Targeting */}
            <div className="space-y-2">
              <Label>Roles cibles</Label>
              <div className="flex items-center gap-4">
                {['Owner', 'Employee'].map((role) => (
                  <div key={role} className="flex items-center gap-2">
                    <Checkbox
                      id={`role-${role}`}
                      checked={formData.target_roles.includes(role)}
                      onCheckedChange={() => handleRoleToggle(role)}
                    />
                    <Label htmlFor={`role-${role}`} className="font-normal cursor-pointer">
                      {role}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Laissez vide pour cibler tous les roles
              </p>
            </div>

            {/* Behavior */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priorite</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Plus eleve = affiche en premier</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_views">Nombre max d'affichages</Label>
                <Input
                  id="max_views"
                  type="number"
                  min={1}
                  value={formData.max_views}
                  onChange={(e) => setFormData({ ...formData, max_views: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="dismissible"
                  checked={formData.dismissible}
                  onCheckedChange={(v) => setFormData({ ...formData, dismissible: v })}
                />
                <Label htmlFor="dismissible" className="font-normal cursor-pointer">
                  Peut etre fermee
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="show_dont_show_again"
                  checked={formData.show_dont_show_again}
                  onCheckedChange={(v) => setFormData({ ...formData, show_dont_show_again: v })}
                />
                <Label htmlFor="show_dont_show_again" className="font-normal cursor-pointer">
                  Option "Ne plus afficher"
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
                <Label htmlFor="is_active" className="font-normal cursor-pointer">
                  Active
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? 'Enregistrement...' : selectedEvent ? 'Mettre a jour' : 'Creer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la popup</DialogTitle>
            <DialogDescription>
              Etes-vous sur de vouloir supprimer la popup "{selectedEvent?.title}" ?
              Cette action est irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={formLoading}>
              {formLoading ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apercu de la popup</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className={`rounded-2xl p-6 text-center ${
              themeConfig[selectedEvent.theme].bg
            }`}>
              {selectedEvent.emoji && (
                <div className="text-5xl mb-4">{selectedEvent.emoji}</div>
              )}
              <h3 className={`text-xl font-bold mb-2 ${themeConfig[selectedEvent.theme].color}`}>
                {selectedEvent.title}
              </h3>
              {selectedEvent.description && (
                <p className="text-sm text-muted-foreground mb-4">
                  {selectedEvent.description}
                </p>
              )}
              {selectedEvent.promo_code && (
                <div className="bg-white/80 rounded-xl py-2 px-4 inline-block mb-4">
                  <span className="font-mono font-bold">{selectedEvent.promo_code}</span>
                  {selectedEvent.promo_description && (
                    <p className="text-xs text-muted-foreground">{selectedEvent.promo_description}</p>
                  )}
                </div>
              )}
              {selectedEvent.cta_label && (
                <Button className="w-full">
                  {selectedEvent.cta_label}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
