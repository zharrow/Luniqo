import { Button } from '@/components/ui/button'

type BackupCodesProps = {
  codes: string[]
  onDone: () => void
}

/** Codes de secours, montrés une seule fois par l'API : à noter avant de continuer. */
export function BackupCodes({ codes, onDone }: BackupCodesProps) {
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Notez ces codes et gardez-les en lieu sûr. Chacun sert une fois si vous n&apos;avez plus accès à votre
        application d&apos;authentification. Ils ne seront plus affichés.
      </p>
      <ul aria-label="Codes de secours" className="grid grid-cols-2 gap-2 rounded-md bg-muted p-4 font-mono">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <Button size="lg" className="h-11" onClick={onDone}>
        J&apos;ai noté mes codes
      </Button>
    </div>
  )
}
