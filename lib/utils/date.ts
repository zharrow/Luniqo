/**
 * Format a Date object to YYYY-MM-DD string in local timezone
 * This avoids timezone issues when comparing dates
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get today's date as YYYY-MM-DD in local timezone
 */
export function getTodayLocal(): string {
  return formatDateLocal(new Date())
}

/**
 * Get date with offset (in days) as YYYY-MM-DD in local timezone
 */
export function getDateWithOffset(offset: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return formatDateLocal(date)
}
