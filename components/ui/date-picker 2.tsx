"use client"

import * as React from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarIcon } from "@heroicons/react/24/outline"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: Date | string
  onChange: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** For birth dates - shows year/month dropdowns and limits to past dates */
  mode?: "default" | "birthdate"
  /** Min date (for birthdate mode, defaults to 10 years ago) */
  fromYear?: number
  /** Max date (for birthdate mode, defaults to current year) */
  toYear?: number
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Sélectionner une date",
  disabled = false,
  className,
  mode = "default",
  fromYear,
  toYear,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Convert string to Date if needed
  const dateValue = React.useMemo(() => {
    if (!value) return undefined
    if (value instanceof Date) return value
    // Parse YYYY-MM-DD format
    const parsed = new Date(value + "T00:00:00")
    return isNaN(parsed.getTime()) ? undefined : parsed
  }, [value])

  // Calculate year range for birthdate mode
  const currentYear = new Date().getFullYear()
  const defaultFromYear = mode === "birthdate" ? currentYear - 10 : currentYear - 100
  const defaultToYear = mode === "birthdate" ? currentYear : currentYear + 10

  const actualFromYear = fromYear ?? defaultFromYear
  const actualToYear = toYear ?? defaultToYear

  // For birthdate, start calendar view at a reasonable default (3 years ago)
  const defaultMonth = React.useMemo(() => {
    if (dateValue) return dateValue
    if (mode === "birthdate") {
      return new Date(currentYear - 2, 0, 1)
    }
    return new Date()
  }, [dateValue, mode, currentYear])

  const handleSelect = (date: Date | undefined) => {
    onChange(date)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex items-center w-full h-9 px-3 py-2 rounded-md border bg-background shadow-xs text-sm text-left font-normal hover:bg-accent hover:text-accent-foreground transition-colors disabled:pointer-events-none disabled:opacity-50",
            !dateValue && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {dateValue ? (
            format(dateValue, "d MMMM yyyy", { locale: fr })
          ) : (
            <span>{placeholder}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleSelect}
          defaultMonth={defaultMonth}
          captionLayout="dropdown"
          fromYear={actualFromYear}
          toYear={actualToYear}
          disabled={mode === "birthdate" ? { after: new Date() } : undefined}
          locale={fr}
          weekStartsOn={1}
        />
      </PopoverContent>
    </Popover>
  )
}
