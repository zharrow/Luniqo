import { CircleAlert } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'

/** Erreur d'un formulaire, annoncée par les lecteurs d'écran (role="alert"). */
export function FormError({ message }: { message: string | null }) {
  if (message === null) return null
  return (
    <Alert variant="destructive">
      <CircleAlert aria-hidden="true" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
