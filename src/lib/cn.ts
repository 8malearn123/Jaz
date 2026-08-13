import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// The design system's custom font-size tokens fail tailwind-merge's t-shirt-size
// check and get classified as text *colors*, so a pair like `text-caption text-ink`
// silently drops one class. Same family of bug: `bg-grain` (a background-image
// utility) reads as a background-color and knocks out real backgrounds. Teach the
// merger the system's vocabulary so both pairs coexist.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display-xl', 'display-lg', 'display-md', 'headline', 'card-title', 'subhead',
            'body-lg', 'body', 'body-sm', 'data', 'caption', 'button', 'eyebrow', 'section-number',
          ],
        },
      ],
      'bg-image': ['bg-grain'],
    },
  },
})

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
