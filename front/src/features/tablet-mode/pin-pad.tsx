import { Delete } from 'lucide-react'
import { useId, useState } from 'react'

import { FormError } from '@/components/form-error'
import { Button } from '@/components/ui/button'

export const PIN_LENGTH = 4

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

type PinPadProps = {
  /** Prénom et initiale de l'employé, ex. « Lucas B. ». */
  name: string
  onSubmit: (pin: string) => void
  onCancel: () => void
  pending?: boolean
  error?: string | null
}

/**
 * Saisie du PIN : pavé à grands boutons ou clavier, envoi dès le 4e chiffre.
 * Le PIN n'est vérifié que par l'API (ANO-001 : jamais dans le navigateur).
 */
export function PinPad({ name, onSubmit, onCancel, pending = false, error = null }: PinPadProps) {
  const [pin, setPin] = useState('')
  const id = useId()

  function change(next: string) {
    const digits = next.replace(/\D/g, '').slice(0, PIN_LENGTH)
    setPin(digits)
    if (digits.length === PIN_LENGTH) onSubmit(digits)
  }

  return (
    <div className="mx-auto grid w-full max-w-sm gap-5">
      <label htmlFor={id} className="text-center text-2xl font-semibold">
        PIN de {name}
      </label>
      <input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={PIN_LENGTH}
        value={pin}
        disabled={pending}
        aria-invalid={error !== null}
        onChange={(event) => change(event.target.value)}
        className="h-16 rounded-md border bg-card text-center text-4xl tracking-[0.5em] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      <FormError message={error} />
      <div className="grid grid-cols-3 gap-3">
        {DIGITS.map((digit) => (
          <PadKey key={digit} label={digit} disabled={pending} onPress={() => change(pin + digit)} />
        ))}
        <Button variant="ghost" className="h-16 text-lg" disabled={pending} onClick={onCancel}>
          Retour
        </Button>
        <PadKey label="0" disabled={pending} onPress={() => change(`${pin}0`)} />
        <Button
          variant="ghost"
          className="h-16"
          aria-label="Effacer le dernier chiffre"
          disabled={pending || pin === ''}
          onClick={() => setPin(pin.slice(0, -1))}
        >
          <Delete aria-hidden="true" className="size-7" />
        </Button>
      </div>
    </div>
  )
}

function PadKey({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Button variant="outline" className="h-16 text-2xl" disabled={disabled} onClick={onPress}>
      {label}
    </Button>
  )
}
