'use client'

import { useState } from 'react'
import PhotoUpload from '@/components/shared/PhotoUpload'

interface TaskValidationModalProps {
  isOpen: boolean
  onClose: () => void
  onValidate: (data: { note: string; photo_urls: string[] }) => Promise<void>
  taskName: string
  taskDescription?: string | null
  suggestedTime?: string | null
  expectedDuration?: number | null
}

export function TaskValidationModal({
  isOpen,
  onClose,
  onValidate,
  taskName,
  taskDescription,
  suggestedTime,
  expectedDuration
}: TaskValidationModalProps) {
  const [note, setNote] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  async function handleValidate() {
    setIsSubmitting(true)
    try {
      await onValidate({ note, photo_urls: photoUrls })
      // Reset form
      setNote('')
      setPhotoUrls([])
    } catch (error) {
      console.error('Error validating task:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCancel() {
    setNote('')
    setPhotoUrls([])
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-8 pointer-events-none">
        <div
          className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b-2 border-primary-100 p-6 rounded-t-3xl z-10">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-primary-700 mb-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                  Valider la tâche
                </h2>
                <h3 className="text-2xl font-semibold mb-2">{taskName}</h3>

                {/* Task metadata */}
                <div className="flex flex-wrap items-center gap-4 mt-3">
                  {suggestedTime && (
                    <div className="flex items-center gap-2 text-lg text-muted-foreground">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{suggestedTime}</span>
                    </div>
                  )}
                  {expectedDuration && (
                    <div className="flex items-center gap-2 text-lg text-muted-foreground">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>{expectedDuration} min</span>
                    </div>
                  )}
                </div>

                {taskDescription && (
                  <p className="text-lg text-muted-foreground mt-3 italic">
                    {taskDescription}
                  </p>
                )}
              </div>

              {/* Close button */}
              <button
                onClick={handleCancel}
                className="flex-shrink-0 ml-4 p-2 bg-gray-100 rounded-xl active:opacity-80 transition-opacity"
              >
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-8 space-y-8">
            {/* Photos Upload */}
            <div>
              <label className="block text-xl font-semibold mb-4">
                Photos (optionnel)
              </label>
              <PhotoUpload
                onPhotosChange={setPhotoUrls}
                maxPhotos={3}
                existingPhotos={photoUrls}
                tabletMode={true}
              />
              <p className="text-sm text-muted-foreground mt-2">
                Vous pouvez ajouter jusqu'à 3 photos pour documenter cette tâche
              </p>
            </div>

            {/* Note Input */}
            <div>
              <label className="block text-xl font-semibold mb-4">
                Commentaire (optionnel)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-5 py-4 text-xl rounded-2xl border-2 border-gray-300 focus:outline-none focus:ring-4 focus:ring-primary-500 focus:border-transparent bg-white resize-none"
                rows={4}
                placeholder="Ajouter une remarque, une observation..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 p-6 rounded-b-3xl">
            <div className="flex gap-4">
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex-1 btn btn-secondary h-20 text-2xl font-bold disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleValidate}
                disabled={isSubmitting}
                className="flex-1 h-20 text-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg rounded-2xl !bg-green-700 text-white active:opacity-80 transition-opacity"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Validation...
                  </span>
                ) : (
                  <>
                    <svg className="w-8 h-8 mr-3 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    Valider la tâche
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
