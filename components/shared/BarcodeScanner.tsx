'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { XMarkIcon, CameraIcon } from '@heroicons/react/24/outline'

interface BarcodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (barcode: string) => void
}

export function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const decoderRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const onScanRef = useRef(onScan)
  const [manualCode, setManualCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [cameraFailed, setCameraFailed] = useState(false)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  const stopScanner = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    const el = document.getElementById('barcode-decoder-hidden')
    if (el) el.remove()
    decoderRef.current = null
  }, [])

  const getDecoder = useCallback(async () => {
    if (decoderRef.current) return decoderRef.current

    const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
      'html5-qrcode'
    )

    let hiddenEl = document.getElementById('barcode-decoder-hidden')
    if (!hiddenEl) {
      hiddenEl = document.createElement('div')
      hiddenEl.id = 'barcode-decoder-hidden'
      hiddenEl.style.display = 'none'
      document.body.appendChild(hiddenEl)
    }

    const decoder = new Html5Qrcode('barcode-decoder-hidden', {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.QR_CODE,
      ],
      verbose: false,
    })

    decoderRef.current = decoder
    return decoder
  }, [])

  useEffect(() => {
    if (!isOpen) return
    let mounted = true

    async function init() {
      setError(null)
      setPhotoError(null)
      setIsInitializing(true)
      setCameraFailed(false)

      // 1. Initialize decoder (html5-qrcode in file-scan mode only)
      let decoder: any
      try {
        decoder = await getDecoder()
      } catch {
        if (!mounted) return
        setIsInitializing(false)
        setCameraFailed(true)
        return
      }

      // 2. Open camera via getUserMedia (bypasses html5-qrcode camera management)
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
      } catch {
        // Retry with minimal constraints
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
          })
        } catch (err: any) {
          if (!mounted) return
          setIsInitializing(false)
          setCameraFailed(true)
          if (err?.name === 'NotAllowedError') {
            setError(
              "Accès caméra refusé. Utilisez la capture photo ci-dessous."
            )
          }
          return
        }
      }

      if (!mounted) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      streamRef.current = stream

      // 3. Enable continuous autofocus (critical for close-up barcode scanning)
      try {
        const track = stream.getVideoTracks()[0]
        const caps = (track as any).getCapabilities?.()
        if (caps?.focusMode?.includes('continuous')) {
          await track.applyConstraints({
            advanced: [{ focusMode: 'continuous' } as any],
          })
        }
      } catch {}

      // 4. Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // 5. Create offscreen canvas for frame capture
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      canvasRef.current = canvas

      // 6. Frame-by-frame detection loop using html5-qrcode's decoder
      const detect = async () => {
        if (!mounted || !videoRef.current || videoRef.current.readyState < 2) {
          if (mounted) timerRef.current = setTimeout(detect, 300)
          return
        }

        try {
          const video = videoRef.current
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0)

          // Convert canvas frame to JPEG blob then File for html5-qrcode decoder
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/jpeg', 0.85)
          )

          if (!blob || !mounted) {
            if (mounted) timerRef.current = setTimeout(detect, 300)
            return
          }

          const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' })
          const result = await decoder.scanFile(file, false)

          if (result && mounted) {
            onScanRef.current(result)
            stopScanner()
            return
          }
        } catch {
          // No barcode detected in this frame — continue
        }

        if (mounted) {
          timerRef.current = setTimeout(detect, 300)
        }
      }

      // Initial delay: let camera warm up + autofocus stabilize
      timerRef.current = setTimeout(detect, 800)
      if (mounted) setIsInitializing(false)
    }

    init()

    return () => {
      mounted = false
      stopScanner()
    }
  }, [isOpen, stopScanner, getDecoder])

  // Photo capture: opens native camera app on mobile, takes a photo, decodes it
  async function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError(null)

    try {
      const decoder = await getDecoder()
      const result = await decoder.scanFile(file, false)
      if (result) {
        onScanRef.current(result)
        stopScanner()
        onClose()
      }
    } catch {
      setPhotoError('Aucun code-barres détecté. Rapprochez-vous et réessayez.')
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const code = manualCode.trim()
    if (code) onScan(code)
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#c5e1a5] to-[#aed581]">
            <h2 className="text-lg font-bold text-[#33691e]">
              Scanner un produit
            </h2>
            <button
              onClick={() => {
                stopScanner()
                onClose()
              }}
              className="p-1 rounded-full hover:bg-white/30 transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-[#33691e]" />
            </button>
          </div>

          {/* Camera viewfinder (hidden if camera unavailable) */}
          {!cameraFailed && (
            <div className="p-4 pb-2">
              <div className="relative rounded-2xl overflow-hidden bg-gray-900 min-h-[220px]">
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full block"
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
                      <span>Initialisation de la caméra...</span>
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

          {/* Photo capture — reliable fallback for iOS */}
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
