import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge conditional class names with Tailwind conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** A soft tint of a flavor accent for backgrounds (modern color-mix). */
export function tint(hex: string, pct = 12) {
  return `color-mix(in srgb, ${hex} ${pct}%, #ffffff)`
}

/** A deeper mix of a flavor accent toward ink, for readable text. */
export function shade(hex: string, pct = 70) {
  return `color-mix(in srgb, ${hex} ${pct}%, #241712)`
}
