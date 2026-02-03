'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface BarcodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (barcode: string) => void
}

const NATIVE_FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'qr_code',
]

export function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const scannerRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const onScanRef = useRef(onScan)
  const [manualCode, setManualCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

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
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch {
        // Scanner may already be stopped
      }
      scannerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return

    let mounted = true

    async function initScanner() {
      setError(null)
      setIsInitializing(true)

      const hasNativeDetector =
        typeof window !== 'undefined' && 'BarcodeDetector' in window

      if (hasNativeDetector) {
        await initNativeScanner(mounted)
      } else {
        await initHtml5QrcodeScanner(mounted)
      }
    }

    async function initNativeScanner(isMounted: boolean) {
      try {
        // Request HD resolution for better barcode readability on mobile
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        })

        if (!isMounted || !containerRef.current) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream

        // Try to enable continuous autofocus (important for close-up barcode scanning)
        try {
          const track = stream.getVideoTracks()[0]
          const capabilities = (track as any).getCapabilities?.()
          if (capabilities?.focusMode?.includes('continuous')) {
            await track.applyConstraints({
              advanced: [{ focusMode: 'continuous' } as any],
            })
          }
        } catch {
          // Focus control not supported on this device
        }

        // Create video element
        const video = document.createElement('video')
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        video.setAttribute('autoplay', 'true')
        video.setAttribute('muted', 'true')
        video.style.width = '100%'
        video.style.borderRadius = '0.75rem'
        containerRef.current.innerHTML = ''
        containerRef.current.appendChild(video)
        videoRef.current = video

        await video.play()

        // Create native BarcodeDetector
        const BarcodeDetector = (window as any).BarcodeDetector
        const detector = new BarcodeDetector({ formats: NATIVE_FORMATS })

        // Canvas for frame capture (more reliable than passing video directly)
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!

        // Throttled detection loop — one detect() at a time, every 250ms
        const detect = async () => {
          if (!isMounted || !videoRef.current) return
          if (videoRef.current.readyState >= 2) {
            try {
              canvas.width = videoRef.current.videoWidth
              canvas.height = videoRef.current.videoHeight
              ctx.drawImage(videoRef.current, 0, 0)
              const barcodes = await detector.detect(canvas)
              if (barcodes.length > 0) {
                onScanRef.current(barcodes[0].rawValue)
                stopScanner()
                return
              }
            } catch {
              // Detection failed on this frame
            }
          }
          if (isMounted) {
            timerRef.current = setTimeout(detect, 250)
          }
        }

        // Small delay to let the camera warm up and autofocus
        timerRef.current = setTimeout(detect, 500)
        if (isMounted) setIsInitializing(false)
      } catch (err: any) {
        if (!isMounted) return
        setIsInitializing(false)
        handleError(err)
      }
    }

    async function initHtml5QrcodeScanner(isMounted: boolean) {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
          'html5-qrcode'
        )

        if (!isMounted || !containerRef.current) return

        const scannerId = 'barcode-scanner-region'

        const existingEl = document.getElementById(scannerId)
        if (existingEl) existingEl.remove()

        const el = document.createElement('div')
        el.id = scannerId
        el.style.width = '100%'
        containerRef.current.appendChild(el)

        const scanner = new Html5Qrcode(scannerId, {
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
        scannerRef.current = scanner

        // Try to find back camera by device ID (more reliable on iOS Safari)
        let cameraConfig: any = { facingMode: 'environment' }
        try {
          const cameras = await Html5Qrcode.getCameras()
          if (cameras.length > 0) {
            const backCamera = cameras.find((c) =>
              /back|rear|arrière|environment/i.test(c.label)
            )
            if (backCamera) {
              cameraConfig = backCamera.id
            }
          }
        } catch {
          // Camera enumeration failed, use facingMode fallback
        }

        const containerWidth = containerRef.current.offsetWidth - 32
        const qrboxWidth = Math.min(containerWidth, 300)
        const qrboxHeight = Math.round(qrboxWidth * 0.4)

        await scanner.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: { width: qrboxWidth, height: qrboxHeight },
          },
          (decodedText: string) => {
            onScanRef.current(decodedText)
            stopScanner()
          },
          () => {}
        )

        if (isMounted) setIsInitializing(false)
      } catch (err: any) {
        if (!isMounted) return
        setIsInitializing(false)
        handleError(err)
      }
    }

    function handleError(err: any) {
      if (
        err?.name === 'NotAllowedError' ||
        err?.message?.includes('Permission')
      ) {
        setError(
          "Accès à la caméra refusé. Autorisez l'accès dans les paramètres de votre navigateur."
        )
      } else if (err?.name === 'NotFoundError') {
        setError('Aucune caméra détectée sur cet appareil.')
      } else {
        setError(
          "Impossible d'initialiser le scanner. Utilisez la saisie manuelle ci-dessous."
        )
      }
    }

    initScanner()

    return () => {
      mounted = false
      stopScanner()
    }
  }, [isOpen, stopScanner])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const code = manualCode.trim()
    if (code) {
      onScan(code)
    }
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

          {/* Camera viewfinder */}
          <div className="p-4">
            <div className="relative rounded-2xl overflow-hidden bg-gray-900 min-h-[220px]">
              <div ref={containerRef} className="w-full" />
              {isInitializing && !error && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white text-sm flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                    <span>Initialisation de la caméra...</span>
                  </div>
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white text-sm text-center p-6">
                    <p className="text-amber-300 mb-2">{error}</p>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center mt-3">
              Positionnez le code-barres dans le cadre pour le scanner
            </p>
          </div>

          {/* Manual input fallback */}
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
