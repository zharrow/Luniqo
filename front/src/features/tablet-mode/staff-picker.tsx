import type { Schemas } from '@/api/types'
import { Button } from '@/components/ui/button'

type StaffPickerProps = {
  staff: Schemas['TabletStaffMember'][]
  onSelect: (member: Schemas['TabletStaffMember']) => void
}

/**
 * Employés de la crèche, en grands boutons (usage tactile). Un employé sans PIN
 * ou au PIN bloqué reste visible, avec la raison, pour qu'il sache quoi faire.
 */
export function StaffPicker({ staff, onSelect }: StaffPickerProps) {
  if (staff.length === 0) {
    return <p className="text-lg text-muted-foreground">Aucun employé n&apos;a accès à cette crèche.</p>
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {staff.map((member) => {
        const reason = unavailable(member)
        return (
          <li key={member.id}>
            <Button
              variant="outline"
              className="h-auto min-h-20 w-full flex-col gap-1 py-4 text-xl whitespace-normal"
              disabled={reason !== null}
              aria-describedby={reason === null ? undefined : `raison-${member.id}`}
              onClick={() => onSelect(member)}
            >
              {member.display_name}
              {reason !== null && (
                <span id={`raison-${member.id}`} className="text-sm font-normal text-muted-foreground">
                  {reason}
                </span>
              )}
            </Button>
          </li>
        )
      })}
    </ul>
  )
}

function unavailable(member: Schemas['TabletStaffMember']): string | null {
  if (member.pin_locked) return 'PIN bloqué : la direction le débloque'
  if (!member.pin_set) return "PIN à choisir depuis l'espace employé"
  return null
}
