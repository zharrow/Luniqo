import Image from 'next/image'

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 animate-in fade-in duration-200">
      <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
        {/* Logo with pulse animation */}
        <div className="relative animate-pulse">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
          <Image
            src="/luniqo.png"
            alt="Luniqo"
            width={120}
            height={120}
            className="relative drop-shadow-xl"
            priority
          />
        </div>

        {/* Loading text */}
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-2xl font-semibold text-primary animate-pulse">
            Luniqo
          </h2>
          <p className="text-sm text-muted-foreground">
            Chargement en cours...
          </p>
        </div>

        {/* Animated dots */}
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-3 h-3 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-3 h-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}
