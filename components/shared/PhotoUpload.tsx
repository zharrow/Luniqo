'use client'

import { useState, useRef } from 'react'
import { storageService } from '@/lib/services/storage.service'

interface PhotoUploadProps {
  onPhotosChange: (urls: string[]) => void
  maxPhotos?: number
  existingPhotos?: string[]
  tabletMode?: boolean
}

export default function PhotoUpload({
  onPhotosChange,
  maxPhotos = 5,
  existingPhotos = [],
  tabletMode = false
}: PhotoUploadProps) {
  const [photos, setPhotos] = useState<string[]>(existingPhotos)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Check max photos limit
    if (photos.length + files.length > maxPhotos) {
      setError(`Maximum ${maxPhotos} photos autorisées`)
      return
    }

    setIsUploading(true)
    setError('')

    try {
      const uploadPromises = Array.from(files).map((file) =>
        storageService.uploadFile(file, {
          bucket: 'cleaning-photos',
          path: 'tasks',
          maxSizeMB: 5,
          optimize: true,
          resize: {
            width: 1200,
            height: 1200,
            fit: 'contain'
          }
        })
      )

      const results = await Promise.all(uploadPromises)

      // Check for errors
      const failed = results.filter((r) => !r.success)
      if (failed.length > 0) {
        setError(failed[0].error || 'Upload échoué')
        return
      }

      // Extract URLs
      const newUrls = results
        .filter((r) => r.success && r.url)
        .map((r) => r.url!)

      const updatedPhotos = [...photos, ...newUrls]
      setPhotos(updatedPhotos)
      onPhotosChange(updatedPhotos)
    } catch (err: any) {
      console.error('Upload error:', err)
      setError('Erreur lors de l\'upload')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function handleRemovePhoto(index: number) {
    const updatedPhotos = photos.filter((_, i) => i !== index)
    setPhotos(updatedPhotos)
    onPhotosChange(updatedPhotos)
  }

  function handleTakePhoto() {
    fileInputRef.current?.click()
  }

  const buttonClass = tabletMode
    ? 'btn btn-primary h-20 text-xl font-semibold'
    : 'btn btn-primary'

  const photoGridClass = tabletMode
    ? 'grid grid-cols-2 gap-4'
    : 'grid grid-cols-3 gap-3'

  const photoSizeClass = tabletMode ? 'h-48' : 'h-32'

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          type="button"
          onClick={handleTakePhoto}
          disabled={isUploading || photos.length >= maxPhotos}
          className={`${buttonClass} w-full disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isUploading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Upload en cours...
            </span>
          ) : (
            <>
              <svg
                className={`${tabletMode ? 'w-8 h-8' : 'w-5 h-5'} mr-2 inline-block`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {photos.length > 0
                ? `Ajouter une photo (${photos.length}/${maxPhotos})`
                : 'Prendre une photo'}
            </>
          )}
        </button>

        {error && (
          <p className={`${tabletMode ? 'text-lg' : 'text-sm'} text-danger-600 mt-2`}>
            {error}
          </p>
        )}
      </div>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className={photoGridClass}>
          {photos.map((url, index) => (
            <div
              key={index}
              className={`relative ${photoSizeClass} rounded-lg overflow-hidden border-2 border-neutral-200 bg-neutral-100 group`}
            >
              <img
                src={url}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => handleRemovePhoto(index)}
                className="absolute top-2 right-2 bg-danger-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-danger-600"
              >
                <svg
                  className={`${tabletMode ? 'w-6 h-6' : 'w-4 h-4'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* Photo Number */}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs font-semibold">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
