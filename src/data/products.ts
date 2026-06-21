import type { Product } from './types'

const ALLERGEN = {
  milk: { en: 'Milk', ar: 'حليب' },
  soya: { en: 'Soya', ar: 'صويا' },
  nuts: { en: 'Tree nuts', ar: 'مكسرات' },
  mayNuts: { en: 'May contain nuts', ar: 'قد يحتوي على مكسرات' },
}

export const products: Product[] = [
  {
    id: 'p-milk',
    sku: 'JAZ-BAR-MILK-90',
    slug: 'signature-milk',
    type: 'bar',
    line: 'signature',
    title: { en: 'Signature Milk', ar: 'الحليب التوقيعية' },
    flavorId: 'milk',
    cocoaPct: 38,
    allergens: [ALLERGEN.milk, ALLERGEN.soya, ALLERGEN.mayNuts],
    ingredients: {
      en: 'Cocoa butter, whole milk powder, cane sugar, cocoa mass, soya lecithin, natural vanilla.',
      ar: 'زبدة كاكاو، حليب كامل الدسم مجفف، سكر قصب، كتلة كاكاو، ليسيثين الصويا، فانيليا طبيعية.',
    },
    story: {
      en: 'Our north star. A gently caramelised milk chocolate, conched slow until it turns to silk — the bar every other flavor is measured against.',
      ar: 'نجمنا القطبي. شوكولاتة بالحليب بكراميل خفيف، تُملّس ببطءٍ حتى تصير حريرًا — اللوح الذي تُقاس عليه كل النكهات.',
    },
    badges: ['bestseller'],
    rating: 4.9,
    reviewCount: 218,
    occasions: ['everyday', 'gifting'],
    pairsWith: ['p-coffee', 'p-dark'],
    variants: [
      { id: 'v-milk-90', netWeightG: 90, packaging: 'standard', requiresColdChain: true, retailPriceMinor: 4800, b2bPriceMinor: 3360, inStock: true },
      { id: 'v-milk-180', netWeightG: 180, packaging: 'gift', requiresColdChain: true, retailPriceMinor: 8900, b2bPriceMinor: 6230, inStock: true },
      { id: 'v-milk-case', netWeightG: 90, packaging: 'bulk_case', caseQty: 24, requiresColdChain: true, retailPriceMinor: 105600, b2bPriceMinor: 73900, inStock: true },
    ],
    reviews: [
      { author: { en: 'Lina A.', ar: 'لينا أ.' }, rating: 5, verified: true, date: '2026-05-20', body: { en: 'The most refined milk chocolate I have had in the Kingdom. Arrived perfectly cold.', ar: 'أرقى شوكولاتة بالحليب جرّبتها في المملكة. وصلت باردة تمامًا.' } },
      { author: { en: 'Faisal R.', ar: 'فيصل ر.' }, rating: 5, verified: true, date: '2026-04-11', body: { en: 'Bought a case for the office. Everyone asked where it was from.', ar: 'اشتريت كرتونًا للمكتب. سأل الجميع من أين هي.' } },
    ],
  },
  {
    id: 'p-lavender',
    sku: 'JAZ-BAR-LAV-90',
    slug: 'lavender-milk',
    type: 'bar',
    line: 'signature',
    title: { en: 'Lavender Milk', ar: 'الخزامى بالحليب' },
    flavorId: 'lavender',
    cocoaPct: 38,
    allergens: [ALLERGEN.milk, ALLERGEN.soya],
    ingredients: {
      en: 'Cocoa butter, whole milk powder, cane sugar, cocoa mass, culinary lavender, soya lecithin.',
      ar: 'زبدة كاكاو، حليب كامل الدسم مجفف، سكر قصب، كتلة كاكاو، خزامى للطهي، ليسيثين الصويا.',
    },
    story: {
      en: 'A single breath of culinary lavender folded into milk chocolate — floral, never soapy. Restraint is the whole trick.',
      ar: 'نفَسٌ واحد من خزامى الطهي يُطوى في شوكولاتة الحليب — عطريّ دون أن يكون صابونيًا. الاتزان هو السرّ كله.',
    },
    badges: ['bestseller'],
    rating: 4.7,
    reviewCount: 96,
    occasions: ['gifting', 'ramadan'],
    pairsWith: ['p-rose', 'p-jasmine'],
    variants: [
      { id: 'v-lav-90', netWeightG: 90, packaging: 'standard', requiresColdChain: true, retailPriceMinor: 5200, b2bPriceMinor: 3640, inStock: true },
      { id: 'v-lav-180', netWeightG: 180, packaging: 'gift', requiresColdChain: true, retailPriceMinor: 9600, b2bPriceMinor: 6720, inStock: true },
    ],
    reviews: [
      { author: { en: 'Maha S.', ar: 'مها س.' }, rating: 5, verified: true, date: '2026-05-02', body: { en: 'Elegant and calm. The lavender is a whisper, exactly right.', ar: 'أنيقة وهادئة. الخزامى همسة، تمامًا كما يجب.' } },
    ],
  },
  {
    id: 'p-rose',
    sku: 'JAZ-BAR-ROSE-90',
    slug: 'damascena-rose',
    type: 'bar',
    line: 'limited',
    title: { en: 'Damascena Rose', ar: 'الورد الدمشقي' },
    flavorId: 'rose',
    cocoaPct: 38,
    allergens: [ALLERGEN.milk, ALLERGEN.soya],
    ingredients: {
      en: 'Cocoa butter, whole milk powder, cane sugar, cocoa mass, Taif rose petals, soya lecithin.',
      ar: 'زبدة كاكاو، حليب كامل الدسم مجفف، سكر قصب، كتلة كاكاو، بتلات ورد طائفي، ليسيثين الصويا.',
    },
    story: {
      en: 'Taif rose petals, hand-folded at the last moment so the perfume survives. A limited bar that smells like a courtyard at dusk.',
      ar: 'بتلات ورد طائفي تُطوى يدويًا في اللحظة الأخيرة كي يبقى العبير. لوحٌ محدود برائحة فناءٍ عند الغروب.',
    },
    badges: ['limited', 'new'],
    rating: 4.8,
    reviewCount: 64,
    occasions: ['gifting', 'wedding'],
    pairsWith: ['p-lavender', 'p-jasmine'],
    artCard: {
      artworkTitle: { en: 'Rose of the Courtyard', ar: 'وردة الفناء' },
      artistName: { en: 'Reem Al-Faifi', ar: 'ريم الفيفي' },
      year: 2025,
      description: {
        en: 'An original gouache of a southern courtyard in bloom — the artwork printed on every wrapper of this limited run.',
        ar: 'لوحة غواش أصلية لفناءٍ جنوبيّ مُزهر — العمل المطبوع على كل غلافٍ من هذا الإصدار المحدود.',
      },
    },
    variants: [
      { id: 'v-rose-90', netWeightG: 90, packaging: 'gift', requiresColdChain: true, retailPriceMinor: 6500, b2bPriceMinor: 4550, inStock: true },
      { id: 'v-rose-180', netWeightG: 180, packaging: 'gift', requiresColdChain: true, retailPriceMinor: 12000, b2bPriceMinor: 8400, inStock: true },
    ],
    reviews: [
      { author: { en: 'Noura K.', ar: 'نورة ك.' }, rating: 5, verified: true, date: '2026-06-01', body: { en: 'The art-card alone is worth framing. The chocolate is divine.', ar: 'البطاقة الفنية وحدها تستحق التأطير. والشوكولاتة إلهية.' } },
    ],
  },
  {
    id: 'p-jasmine',
    sku: 'JAZ-BAR-JAS-90',
    slug: 'jazan-jasmine',
    type: 'bar',
    line: 'signature',
    title: { en: 'Jazan Jasmine', ar: 'فُل جازان' },
    flavorId: 'jasmine',
    cocoaPct: 38,
    allergens: [ALLERGEN.milk, ALLERGEN.soya],
    ingredients: {
      en: 'Cocoa butter, whole milk powder, cane sugar, cocoa mass, jasmine (الفُل) infusion, soya lecithin.',
      ar: 'زبدة كاكاو، حليب كامل الدسم مجفف، سكر قصب، كتلة كاكاو، نقيع الفُل، ليسيثين الصويا.',
    },
    story: {
      en: 'The الفُل that scents Jazan evenings, infused into white-edged milk chocolate. The most local bar we make.',
      ar: 'الفُل الذي يعطّر أمسيات جازان، منقوعٌ في شوكولاتة حليب بأطرافٍ بيضاء. أكثر ألواحنا محليّة.',
    },
    badges: ['seasonal'],
    rating: 4.6,
    reviewCount: 73,
    occasions: ['gifting', 'eid'],
    pairsWith: ['p-rose', 'p-papaya'],
    artCard: {
      artworkTitle: { en: 'Full at Dusk', ar: 'الفُل عند المغيب' },
      artistName: { en: 'Yasser Hakami', ar: 'ياسر حكمي' },
      year: 2025,
      description: {
        en: 'A nocturne of jasmine vines climbing a Jazani wall — original artwork by a Jazan painter.',
        ar: 'مقطوعة ليلية لكروم الفُل تتسلق جدارًا جيزانيًا — عمل أصلي لرسّامٍ جازاني.',
      },
    },
    variants: [
      { id: 'v-jas-90', netWeightG: 90, packaging: 'gift', requiresColdChain: true, retailPriceMinor: 6200, b2bPriceMinor: 4340, inStock: true },
    ],
    reviews: [
      { author: { en: 'Abdullah M.', ar: 'عبدالله م.' }, rating: 5, verified: true, date: '2026-03-19', body: { en: 'It smells like home. I sent six to family abroad.', ar: 'رائحتها كالبيت. أرسلت ستًا للعائلة في الخارج.' } },
    ],
  },
  {
    id: 'p-papaya',
    sku: 'JAZ-BAR-PAP-90',
    slug: 'sun-papaya',
    type: 'bar',
    line: 'seasonal',
    title: { en: 'Sun Papaya', ar: 'الببايا الشمسية' },
    flavorId: 'papaya',
    cocoaPct: 38,
    allergens: [ALLERGEN.milk, ALLERGEN.soya, ALLERGEN.mayNuts],
    ingredients: {
      en: 'Cocoa butter, whole milk powder, cane sugar, cocoa mass, sun-dried Jazani papaya, soya lecithin.',
      ar: 'زبدة كاكاو، حليب كامل الدسم مجفف، سكر قصب، كتلة كاكاو، ببايا جيزانية مجففة بالشمس، ليسيثين الصويا.',
    },
    story: {
      en: 'Jazani papaya, sun-dried to a chew and scattered through milk chocolate. A tropical bar with a southern accent.',
      ar: 'ببايا جيزانية تُجفَّف بالشمس حتى تصبح مطّاطة، ثم تُنثر في شوكولاتة الحليب. لوحٌ استوائي بلكنةٍ جنوبية.',
    },
    badges: ['seasonal'],
    rating: 4.5,
    reviewCount: 41,
    occasions: ['everyday'],
    pairsWith: ['p-mango', 'p-milk'],
    variants: [
      { id: 'v-pap-90', netWeightG: 90, packaging: 'standard', requiresColdChain: true, retailPriceMinor: 5400, b2bPriceMinor: 3780, inStock: true },
    ],
    reviews: [],
  },
  {
    id: 'p-mango',
    sku: 'JAZ-BAR-MAN-90',
    slug: 'jazani-mango',
    type: 'bar',
    line: 'seasonal',
    title: { en: 'Jazani Mango', ar: 'المانجو الجيزاني' },
    flavorId: 'mango',
    cocoaPct: 38,
    allergens: [ALLERGEN.milk, ALLERGEN.soya],
    ingredients: {
      en: 'Cocoa butter, whole milk powder, cane sugar, cocoa mass, Jazani mango, soya lecithin.',
      ar: 'زبدة كاكاو، حليب كامل الدسم مجفف، سكر قصب، كتلة كاكاو، مانجو جيزاني، ليسيثين الصويا.',
    },
    story: {
      en: 'The pride of the Jazan orchards in a bar — bright mango against warm milk chocolate. Made only in season.',
      ar: 'فخر بساتين جازان في لوح — مانجو ساطع أمام شوكولاتة حليب دافئة. يُصنع في موسمه فقط.',
    },
    badges: ['seasonal', 'new'],
    rating: 4.8,
    reviewCount: 52,
    occasions: ['everyday', 'gifting'],
    pairsWith: ['p-papaya', 'p-coffee'],
    artCard: {
      artworkTitle: { en: 'Orchard Light', ar: 'ضوء البستان' },
      artistName: { en: 'Sara Madkhali', ar: 'سارة مدخلي' },
      year: 2026,
      description: {
        en: 'Mango trees heavy with fruit under the southern sun — a commissioned oil painting.',
        ar: 'أشجار مانجو مثقلة بالثمر تحت شمس الجنوب — لوحة زيتية مكلّفة.',
      },
    },
    variants: [
      { id: 'v-man-90', netWeightG: 90, packaging: 'standard', requiresColdChain: true, retailPriceMinor: 5600, b2bPriceMinor: 3920, inStock: true },
      { id: 'v-man-180', netWeightG: 180, packaging: 'gift', requiresColdChain: true, retailPriceMinor: 10400, b2bPriceMinor: 7280, inStock: false },
    ],
    reviews: [
      { author: { en: 'Hessa T.', ar: 'حصة ت.' }, rating: 5, verified: true, date: '2026-06-08', body: { en: 'Tastes like a Jazan summer. Please make it year-round!', ar: 'مذاقها كصيف جازان. أرجوكم اجعلوها على مدار العام!' } },
    ],
  },
  {
    id: 'p-coffee',
    sku: 'JAZ-BAR-COF-90',
    slug: 'khawlani-coffee',
    type: 'bar',
    line: 'signature',
    title: { en: 'Khawlani Coffee', ar: 'البن الخولاني' },
    flavorId: 'coffee',
    cocoaPct: 62,
    allergens: [ALLERGEN.milk, ALLERGEN.soya],
    ingredients: {
      en: 'Cocoa mass, cane sugar, cocoa butter, Khawlani coffee, milk powder, soya lecithin.',
      ar: 'كتلة كاكاو، سكر قصب، زبدة كاكاو، بن خولاني، حليب مجفف، ليسيثين الصويا.',
    },
    story: {
      en: 'Khawlani coffee — grown in the Jazan highlands for six centuries — ground into a darker bar. Heritage, twice over.',
      ar: 'البن الخولاني — الذي يُزرع في مرتفعات جازان منذ ستة قرون — مطحونٌ في لوحٍ أدكن. إرثٌ مرتين.',
    },
    badges: ['bestseller'],
    rating: 4.9,
    reviewCount: 134,
    occasions: ['everyday', 'gifting'],
    pairsWith: ['p-dark', 'p-milk'],
    variants: [
      { id: 'v-cof-90', netWeightG: 90, packaging: 'standard', requiresColdChain: false, retailPriceMinor: 5800, b2bPriceMinor: 4060, inStock: true },
      { id: 'v-cof-case', netWeightG: 90, packaging: 'bulk_case', caseQty: 24, requiresColdChain: false, retailPriceMinor: 127200, b2bPriceMinor: 89000, inStock: true },
    ],
    reviews: [
      { author: { en: 'Omar B.', ar: 'عمر ب.' }, rating: 5, verified: true, date: '2026-05-15', body: { en: 'As a coffee person, this is the one. Deep and real.', ar: 'كعاشق قهوة، هذه هي. عميقة وأصيلة.' } },
    ],
  },
  {
    id: 'p-dark',
    sku: 'JAZ-BAR-DARK-90',
    slug: 'single-origin-dark',
    type: 'bar',
    line: 'signature',
    title: { en: 'Single-Origin Dark 72%', ar: 'الداكنة ٧٢٪' },
    flavorId: 'dark',
    cocoaPct: 72,
    allergens: [ALLERGEN.soya, ALLERGEN.mayNuts],
    ingredients: {
      en: 'Cocoa mass, cane sugar, cocoa butter, soya lecithin.',
      ar: 'كتلة كاكاو، سكر قصب، زبدة كاكاو، ليسيثين الصويا.',
    },
    story: {
      en: 'A clean, single-origin 72% for purists — bitter-bright, with a long, dry finish. Dairy-free.',
      ar: 'داكنة نقية ٧٢٪ من منشأ واحد للمتذوّقين — مرّةٌ مشرقة بنهايةٍ طويلة جافة. خالية من الألبان.',
    },
    badges: [],
    rating: 4.7,
    reviewCount: 88,
    occasions: ['everyday'],
    pairsWith: ['p-coffee', 'p-milk'],
    variants: [
      { id: 'v-dark-90', netWeightG: 90, packaging: 'standard', requiresColdChain: false, retailPriceMinor: 5600, b2bPriceMinor: 3920, inStock: true },
    ],
    reviews: [],
  },
]

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug)
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id)
}

export function variantById(id: string): { product: Product; variant: Product['variants'][number] } | undefined {
  for (const product of products) {
    const variant = product.variants.find((v) => v.id === id)
    if (variant) return { product, variant }
  }
  return undefined
}
