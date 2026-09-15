import type { Flavor, FlavorId } from './types'

// The per-flavor accent layer. The first five carry the design-system flavor tokens;
// mango / coffee / dark extend the layer (it is declared "extensible") using Jazan-rooted hues.
//
// `landLine` is the client's own line of copy for the seven Jazan-rooted flavours — the
// «نكهات من أرضٍ واحدة» section of /shop. The Arabic is their text, verbatim.
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
    landLine: {
      en: 'A scent every house in Jazan knows, melted here into a single piece.',
      ar: 'رائحة تعرفها كل بيوت جازان، ذابت هنا في قطعة واحدة.',
    },
    accent: '#c8bbb1',
    onAccent: '#2a1a12',
  },
  papaya: {
    id: 'papaya',
    name: { en: 'Papaya', ar: 'الببايا' },
    note: { en: 'Milk chocolate, sun-dried papaya', ar: 'شوكولاتة بالحليب وببايا مجففة بالشمس' },
    landLine: {
      en: 'A sweetness grown under a sun that never hesitates.',
      ar: 'حلاوة نمت تحت شمس لا تعرف التردد.',
    },
    accent: '#d0a86b',
    onAccent: '#2a1a12',
  },
  mango: {
    id: 'mango',
    name: { en: 'Mango', ar: 'المانجو' },
    note: { en: 'Milk chocolate, Jazani mango', ar: 'شوكولاتة بالحليب ومانجو جيزاني' },
    landLine: {
      en: 'Summer, the moment it sets into a single piece.',
      ar: 'الصيف، حين يتجمد في قطعة واحدة.',
    },
    accent: '#d98a3d',
    onAccent: '#2a1503',
  },
  coffee: {
    id: 'coffee',
    name: { en: 'Coffee', ar: 'البن' },
    note: { en: 'Dark chocolate, Khawlani coffee', ar: 'شوكولاتة داكنة وبن خولاني' },
    landLine: {
      en: 'As mornings open in the south, so this piece opens its flavor.',
      ar: 'كما تُفتتح الصباحات في الجنوب، تفتتح هذي القطعة نكهتها.',
    },
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
  dark60: {
    id: 'dark60',
    name: { en: 'Dark 60%', ar: 'الداكنة ٦٠٪' },
    note: { en: 'Rounder dark, cocoa-forward', ar: 'داكنة أنعم، غنيّة بالكاكاو' },
    accent: '#5a3a26',
    onAccent: '#f3eee5',
  },
  seasalt: {
    id: 'seasalt',
    name: { en: 'Sea Salt', ar: 'ملح البحر' },
    note: { en: 'Dark chocolate, Red Sea salt', ar: 'شوكولاتة داكنة وملح البحر الأحمر' },
    landLine: {
      en: 'One grain of salt, from a sea that knows its way to cocoa.',
      ar: 'حبة ملح، من بحرٍ يعرف طريقه إلى الكاكاو.',
    },
    accent: '#7c8a8f',
    onAccent: '#141a1c',
  },
  chili: {
    id: 'chili',
    name: { en: 'Chili', ar: 'الفلفل الحار' },
    note: { en: 'Dark chocolate, slow chili heat', ar: 'شوكولاتة داكنة وحرارة فلفل هادئة' },
    landLine: {
      en: 'A light spark that wakes the senses before they surrender to the sweetness.',
      ar: 'شرارة خفيفة، توقظ الحواس قبل أن تستسلم للحلاوة.',
    },
    accent: '#a83a29',
    onAccent: '#fdf1ee',
  },
  banana: {
    id: 'banana',
    name: { en: 'Banana', ar: 'الموز' },
    note: { en: 'Dark chocolate, sun-dried banana', ar: 'شوكولاتة داكنة وموز مجفف بالشمس' },
    landLine: {
      en: 'A taste like your first sweet memory, with a touch of this land.',
      ar: 'طعمٌ يشبه أول ذكرى حلوة، بلمسة من هذي الأرض.',
    },
    accent: '#c9a227',
    onAccent: '#241a08',
  },
}

export const flavorList: Flavor[] = Object.values(flavors)
