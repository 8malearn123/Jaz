import type { Flavor, FlavorId } from './types'

// The per-flavor accent layer. The first five carry the design-system flavor tokens;
// mango / coffee / dark extend the layer (it is declared "extensible") using Jazan-rooted hues.
export const flavors: Record<FlavorId, Flavor> = {
  milk: {
    id: 'milk',
    name: { en: 'Milk', ar: 'الحليب' },
    note: { en: 'Golden, classic, gently caramelised', ar: 'ذهبي، كلاسيكي، بكراميل خفيف' },
    accent: '#b89b6e',
    onAccent: '#2a1a12',
  },
  lavender: {
    id: 'lavender',
    name: { en: 'Lavender', ar: 'الخزامى' },
    note: { en: 'Milk chocolate, soft lavender bloom', ar: 'شوكولاتة بالحليب وزهر خزامى ناعم' },
    accent: '#9c8bbe',
    onAccent: '#1c1726',
  },
  rose: {
    id: 'rose',
    name: { en: 'Rose', ar: 'الورد' },
    note: { en: 'Milk chocolate, Damascena rose', ar: 'شوكولاتة بالحليب وورد دمشقي' },
    accent: '#8e2f55',
    onAccent: '#fdf3f7',
  },
  jasmine: {
    id: 'jasmine',
    name: { en: 'Jasmine', ar: 'الفُل' },
    note: { en: 'Milk chocolate, Jazan jasmine (الفُل)', ar: 'شوكولاتة بالحليب وفُل جازان' },
    accent: '#c8bbb1',
    onAccent: '#2a1a12',
  },
  papaya: {
    id: 'papaya',
    name: { en: 'Papaya', ar: 'الببايا' },
    note: { en: 'Milk chocolate, sun-dried papaya', ar: 'شوكولاتة بالحليب وببايا مجففة بالشمس' },
    accent: '#d0a86b',
    onAccent: '#2a1a12',
  },
  mango: {
    id: 'mango',
    name: { en: 'Mango', ar: 'المانجو' },
    note: { en: 'Milk chocolate, Jazani mango', ar: 'شوكولاتة بالحليب ومانجو جيزاني' },
    accent: '#d98a3d',
    onAccent: '#2a1503',
  },
  coffee: {
    id: 'coffee',
    name: { en: 'Coffee', ar: 'البن' },
    note: { en: 'Dark chocolate, Khawlani coffee', ar: 'شوكولاتة داكنة وبن خولاني' },
    accent: '#6f4a32',
    onAccent: '#f6ece2',
  },
  dark: {
    id: 'dark',
    name: { en: 'Dark', ar: 'الداكنة' },
    note: { en: 'Single-origin, 72% cocoa', ar: 'من منشأ واحد، ٧٢٪ كاكاو' },
    accent: '#3b241a',
    onAccent: '#f3eee5',
  },
}

export const flavorList: Flavor[] = Object.values(flavors)
