import type { Collection } from './types'

export const collections: Collection[] = [
  {
    id: 'c-jazan-five',
    slug: 'the-jazan-five',
    title: { en: 'The Jazan Five', ar: 'خماسية جازان' },
    kind: 'signature',
    description: {
      en: 'A tasting flight of the five botanicals — milk, lavender, rose, jasmine, papaya — in one ribboned box.',
      ar: 'رحلة تذوّق للنكهات الخمس — الحليب، الخزامى، الورد، الفُل، الببايا — في علبةٍ واحدة مزيّنة.',
    },
    accent: '#8e2f55',
    priceMinor: 24500,
    pieceCount: 5,
    productIds: ['p-milk', 'p-lavender', 'p-rose', 'p-jasmine', 'p-papaya'],
  },
  {
    id: 'c-eid-maison',
    slug: 'eid-maison',
    title: { en: 'Eid Maison', ar: 'علبة العيد' },
    kind: 'seasonal',
    description: {
      en: 'A celebratory assortment dressed for Eid — gold foil, a collectible art-card, and a personalised bilingual note.',
      ar: 'تشكيلة احتفالية بحُلّة العيد — رقائق ذهبية، وبطاقة فنية مقتناة، ورسالة شخصية بلغتين.',
    },
    accent: '#355c4b',
    priceMinor: 32000,
    pieceCount: 8,
    productIds: ['p-rose', 'p-jasmine', 'p-mango', 'p-coffee'],
  },
  {
    id: 'c-corporate-crescent',
    slug: 'corporate-crescent',
    title: { en: 'Corporate Crescent', ar: 'هلال الشركات' },
    kind: 'corporate',
    description: {
      en: 'Designed for the boardroom and the season — bulk-ready, brandable sleeves, and one order that ships to many.',
      ar: 'مصمّمة لقاعة الاجتماعات وللموسم — جاهزة للجملة، بأغلفة قابلة للعلامة، وطلبٌ واحد يُشحن للكثيرين.',
    },
    accent: '#365766',
    priceMinor: 18000,
    pieceCount: 6,
    productIds: ['p-milk', 'p-coffee', 'p-dark'],
  },
  {
    id: 'c-harvest-ribbon',
    slug: 'harvest-ribbon',
    title: { en: 'The Harvest Ribbon', ar: 'شريط الحصاد' },
    kind: 'signature',
    description: {
      en: 'Our seasonal best — mango, coffee, and dark — for those who want the south at its ripest.',
      ar: 'أفضل ما في الموسم — المانجو والبن والداكنة — لمن يريد الجنوب في أنضج حالاته.',
    },
    accent: '#d98a3d',
    priceMinor: 21000,
    pieceCount: 6,
    productIds: ['p-mango', 'p-coffee', 'p-dark'],
  },
]

export function getCollection(slug: string): Collection | undefined {
  return collections.find((c) => c.slug === slug)
}
