import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format cents to Euro string (e.g., 12345 -> "123,45 €").
 */
export function formatEuro(cents: number): string {
  const euros = cents / 100
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(euros)
}

/**
 * Format a date string or Date to German date format (e.g., "26.03.2026").
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

const STATUS_COLORS: Record<string, string> = {
  neu: 'bg-blue-100 text-blue-800',
  zugewiesen: 'bg-indigo-100 text-indigo-800',
  kontaktversuch: 'bg-yellow-100 text-yellow-800',
  nicht_erreicht: 'bg-amber-100 text-amber-800',
  qualifiziert: 'bg-cyan-100 text-cyan-800',
  termin: 'bg-purple-100 text-purple-800',
  show: 'bg-emerald-100 text-emerald-800',
  no_show: 'bg-orange-100 text-orange-800',
  nachfassen: 'bg-teal-100 text-teal-800',
  abschluss: 'bg-green-100 text-green-800',
  verloren: 'bg-red-100 text-red-800',
  warteschlange: 'bg-gray-100 text-gray-800',
}

/**
 * Return a Tailwind color class string for a given lead status.
 */
export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800'
}

const STATUS_LABELS: Record<string, string> = {
  neu: 'Neu',
  zugewiesen: 'Zugewiesen',
  kontaktversuch: 'Kontaktversuch',
  nicht_erreicht: 'Nicht erreicht',
  qualifiziert: 'Qualifiziert',
  termin: 'Termin',
  show: 'Show',
  no_show: 'No-Show',
  nachfassen: 'Nachfassen',
  abschluss: 'Abschluss',
  verloren: 'Verloren',
  warteschlange: 'Warteschlange',
}

/**
 * Return the German label for a given lead status.
 */
export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}
