'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { XMarkIcon, CameraIcon } from '@heroicons/react/24/outline'

interface BarcodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (barcode: string) => void
}

export function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const codeReaderRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [manualCode, setManualCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [cameraFailed, setCameraFailed] = useState(false)

  // Initialize ZXing scanner
  useEffect(() => {
    if (!isOpen) return

    let mounted = true
    let activeReader: any = null

    async function initScanner() {
      setError(null)
      setPhotoError(null)
      setIsInitializing(true)
      setCameraFailed(false)

      try {
        // Import ZXing
        const { BrowserMultiFormatReader, DecodeHintType } = await import('@zxing/library')

        if (!mounted) return

        // Create reader with hints for better performance
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          'EAN_13',
          'EAN_8',
          'UPC_A',
          'UPC_E',
          'CODE_128',
          'CODE_39',
          'QR_CODE',
        ])
        hints.set(DecodeHintType.TRY_HARDER, true)

        const reader = new BrowserMultiFormatReader(hints)
        codeReaderRef.current = reader
        activeReader = reader

        // Get video input devices
        const videoInputDevices = await reader.listVideoInputDevices()
        if (!videoInputDevices || videoInputDevices.length === 0) {
          throw new Error('No camera found')
        }

        // Try to find back camera (environment facing)
        const backCamera = videoInputDevices.find((device) =>
          /back|rear|environment/i.test(device.label)
        )
        const selectedDeviceId = backCamera?.deviceId || videoInputDevices[0].deviceId

        if (!mounted || !videoRef.current) return

        // Start continuous decode from video device
        await reader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result) => {
            if (result && mounted) {
              const barcodeText = result.getText()
              if (barcodeText) {
                onScan(barcodeText)
                cleanup()
              }
            }
            // Ignore decode errors - they're normal when no barcode is visible
          }
        )

        if (mounted) {
          setIsInitializing(false)
        }
      } catch (err: any) {
        console.error('ZXing initialization error:', err)
        if (!mounted) return

        setIsInitializing(false)
        setCameraFailed(true)

        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          setError('Accès caméra refusé. Utilisez la capture photo ci-dessous.')
        } else {
          setError('Impossible d\'initialiser la caméra. Utilisez la capture photo.')
        }
      }
    }

    function cleanup() {
      if (activeReader) {
        activeReader.reset()
        activeReader = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      codeReaderRef.current = null
    }

    initScanner()

    return () => {
      mounted = false
      cleanup()
    }
  }, [isOpen, onScan])

  // Photo capture fallback using ZXing
  async function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError(null)

    try {
      const { BrowserMultiFormatReader, DecodeHintType } = await import('@zxing/library')

      const hints = new Map()
      hints.set(DecodeHintType.TRY_HARDER, true)

      const reader = new BrowserMultiFormatReader(hints)

      // Create image element from file
      const imageUrl = URL.createObjectURL(file)
      const img = new Image()

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl
      })

      // Decode from image
      const result = await reader.decodeFromImageElement(img)
      const barcodeText = result.getText()

      if (barcodeText) {
        onScan(barcodeText)
        onClose()
      }

      URL.revokeObjectURL(imageUrl)
    } catch (err) {
      console.error('Photo decode error:', err)
      setPhotoError('Aucun code-barres détecté. Rapprochez-vous et réessayez.')
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const code = manualCode.trim()
    if (code) {
      onScan(code)
      onClose()
    }
  }

  const handleClose = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={handleClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#c5e1a5] to-[#aed581]">
            <h2 className="text-lg font-bold text-[#33691e]">
              Scanner un produit
            </h2>
            <button
              onClick={handleClose}
              className="p-1 rounded-full hover:bg-white/30 transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-[#33691e]" />
            </button>
          </div>

          {/* ZXing camera viewfinder */}
          {!cameraFailed && (
            <div className="p-4 pb-2">
              <div className="relative rounded-2xl overflow-hidden bg-gray-900 min-h-[280px]">
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full block"
                  style={{ objectFit: 'cover' }}
                />
                {/* Scanning guide overlay */}
                {!isInitializing && !error && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className="border-2 border-[#aed581] rounded-lg"
                      style={{
                        width: '75%',
                        height: '30%',
                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.25)',
                      }}
                    />
                  </div>
                )}
                {isInitializing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-white text-sm flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                      <span>Initialisation du scanner...</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Alignez le code-barres dans le cadre vert
              </p>
            </div>
          )}

          {/* Camera error */}
          {error && (
            <div className="px-4 pt-2">
              <p className="text-sm text-amber-600 text-center bg-amber-50 rounded-xl p-3">
                {error}
              </p>
            </div>
          )}

          {/* Photo capture — reliable fallback */}
          <div className="px-4 py-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
            />
            <button
              onClick={() => {
                setPhotoError(null)
                fileInputRef.current?.click()
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#aed581] hover:bg-green-50 text-gray-600 hover:text-[#33691e] font-medium transition-colors"
            >
              <CameraIcon className="w-5 h-5" />
              Prendre une photo du code-barres
            </button>
            {photoError && (
              <p className="text-xs text-amber-600 text-center mt-2">
                {photoError}
              </p>
            )}
          </div>

          {/* Manual input */}
          <div className="px-4 pb-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-muted-foreground uppercase">
                ou saisie manuelle
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Entrez le code-barres"
                className="flex-1"
                inputMode="numeric"
              />
              <Button
                type="submit"
                disabled={!manualCode.trim()}
                className="bg-[#aed581] hover:bg-[#9ccc65] text-[#33691e]"
              >
                Valider
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
