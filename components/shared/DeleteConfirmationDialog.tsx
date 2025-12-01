'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface DeleteConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  description?: string
  itemName?: string
  isDeleting?: boolean
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmer la suppression',
  description = 'Êtes-vous sûr de vouloir supprimer définitivement',
  itemName,
  isDeleting = false
}: DeleteConfirmationDialogProps) {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md animate-slide-up">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-danger-50 flex items-center justify-center flex-shrink-0">
                <ExclamationTriangleIcon className="w-6 h-6 text-danger-600" />
              </div>

              <div className="flex-1">
                <h2 className="text-lg font-semibold mb-2">
                  {title}
                </h2>
                <p className="text-sm text-muted-foreground mb-1">
                  {description} {itemName && (
                    <span className="font-semibold text-foreground">"{itemName}"</span>
                  )} ?
                </p>
                <p className="text-sm text-danger-600">
                  Cette action est irréversible.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isDeleting}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirm}
                className="flex-1"
                disabled={isDeleting}
              >
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
