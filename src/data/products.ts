import type { Product, ArtCard } from './types'

const ALLERGEN = {
  milk: { en: 'Milk', ar: 'حليب' },
  soya: { en: 'Soya', ar: 'صويا' },
  nuts: { en: 'Tree nuts', ar: 'مكسرات' },
  mayNuts: { en: 'May contain nuts', ar: 'قد يحتوي على مكسرات' },
}

const baseProducts: Product[] = [
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
  {
    id: 'p-dark60',
    sku: 'JAZ-BAR-DARK60-90',
    slug: 'dark-60',
    type: 'bar',
    line: 'signature',
    title: { en: 'Dark 60%', ar: 'الداكنة ٦٠٪' },
    flavorId: 'dark60',
    cocoaPct: 60,
    allergens: [ALLERGEN.soya, ALLERGEN.mayNuts],
    ingredients: {
      en: 'Cocoa mass, cane sugar, cocoa butter, soya lecithin.',
      ar: 'كتلة كاكاو، سكر قصب، زبدة كاكاو، ليسيثين الصويا.',
    },
    story: {
      en: 'A gentler way into dark — 60% cacao, rounder and less austere than our 72%. All cocoa warmth, no bitterness to brace for.',
      ar: 'مدخلٌ أنعم إلى الداكنة — ٦٠٪ كاكاو، أكثر استدارةً وأقل حِدّةً من ٧٢٪. دفءُ كاكاو دون مرارةٍ تتحسّب لها.',
    },
    badges: [],
    rating: 4.6,
    reviewCount: 57,
    occasions: ['everyday'],
    pairsWith: ['p-dark', 'p-coffee'],
    variants: [
      { id: 'v-dark60-90', netWeightG: 90, packaging: 'standard', requiresColdChain: false, retailPriceMinor: 4000, b2bPriceMinor: 2800, inStock: true },
      { id: 'v-dark60-180', netWeightG: 180, packaging: 'gift', requiresColdChain: false, retailPriceMinor: 7400, b2bPriceMinor: 5180, inStock: true },
    ],
    reviews: [],
  },
  {
    id: 'p-seasalt',
    sku: 'JAZ-BAR-SALT-90',
    slug: 'sea-salt-dark',
    type: 'bar',
    line: 'signature',
    title: { en: 'Sea Salt Dark', ar: 'الداكنة بملح البحر' },
    flavorId: 'seasalt',
    cocoaPct: 62,
    allergens: [ALLERGEN.soya, ALLERGEN.mayNuts],
    ingredients: {
      en: 'Cocoa mass, cane sugar, cocoa butter, Red Sea salt flakes, soya lecithin.',
      ar: 'كتلة كاكاو، سكر قصب، زبدة كاكاو، رقائق ملح البحر الأحمر، ليسيثين الصويا.',
    },
    story: {
      en: 'Flakes of Red Sea salt scattered across dark chocolate — every bite swings between sweet and saline. A coastline in a bar.',
      ar: 'رقائق من ملح البحر الأحمر تتناثر على شوكولاتة داكنة — كل قضمة تتأرجح بين الحلاوة والملوحة. ساحلٌ في لوح.',
    },
    badges: ['new'],
    rating: 4.8,
    reviewCount: 46,
    occasions: ['everyday', 'gifting'],
    pairsWith: ['p-dark', 'p-coffee'],
    variants: [
      { id: 'v-salt-90', netWeightG: 90, packaging: 'standard', requiresColdChain: false, retailPriceMinor: 4400, b2bPriceMinor: 3080, inStock: true },
      { id: 'v-salt-180', netWeightG: 180, packaging: 'gift', requiresColdChain: false, retailPriceMinor: 8200, b2bPriceMinor: 5740, inStock: true },
    ],
    reviews: [],
  },
  {
    id: 'p-chili',
    sku: 'JAZ-BAR-CHILI-90',
    slug: 'chili-dark',
    type: 'bar',
    line: 'signature',
    title: { en: 'Chili Dark', ar: 'الداكنة بالفلفل الحار' },
    flavorId: 'chili',
    cocoaPct: 65,
    allergens: [ALLERGEN.soya, ALLERGEN.mayNuts],
    ingredients: {
      en: 'Cocoa mass, cane sugar, cocoa butter, ground chili, soya lecithin.',
      ar: 'كتلة كاكاو، سكر قصب، زبدة كاكاو، فلفل حار مطحون، ليسيثين الصويا.',
    },
    story: {
      en: 'Dark chocolate with a slow chili warmth that arrives only after the sweetness — a gentle heat that lingers, never a burn.',
      ar: 'شوكولاتة داكنة بحرارة فلفلٍ هادئة لا تصل إلا بعد الحلاوة — دفءٌ لطيف يبقى، دون أن يلسع.',
    },
    badges: [],
    rating: 4.5,
    reviewCount: 33,
    occasions: ['everyday'],
    pairsWith: ['p-dark', 'p-coffee'],
    variants: [
      { id: 'v-chili-90', netWeightG: 90, packaging: 'standard', requiresColdChain: false, retailPriceMinor: 4600, b2bPriceMinor: 3220, inStock: true },
    ],
    reviews: [],
  },
  {
    id: 'p-banana',
    sku: 'JAZ-BAR-BAN-90',
    slug: 'banana-dark',
    type: 'bar',
    line: 'seasonal',
    title: { en: 'Banana Dark', ar: 'الداكنة بالموز' },
    flavorId: 'banana',
    cocoaPct: 55,
    allergens: [ALLERGEN.soya, ALLERGEN.mayNuts],
    ingredients: {
      en: 'Cocoa mass, cane sugar, cocoa butter, sun-dried banana, soya lecithin.',
      ar: 'كتلة كاكاو، سكر قصب، زبدة كاكاو، موز مجفف بالشمس، ليسيثين الصويا.',
    },
    story: {
      en: 'Sun-dried banana folded into dark chocolate — mellow, jammy sweetness leaning against a firm cocoa backbone.',
      ar: 'موزٌ مجفف بالشمس يُطوى في شوكولاتة داكنة — حلاوةٌ ناضجة هادئة تتّكئ على عمود كاكاو راسخ.',
    },
    badges: ['seasonal'],
    rating: 4.4,
    reviewCount: 29,
    occasions: ['everyday'],
    pairsWith: ['p-papaya', 'p-mango'],
    variants: [
      { id: 'v-ban-90', netWeightG: 90, packaging: 'standard', requiresColdChain: false, retailPriceMinor: 4200, b2bPriceMinor: 2940, inStock: true },
    ],
    reviews: [],
  },
]

// Collector art cards — the wrapper artwork on each bar, keyed by product slug.
const productArtCards: Record<string, ArtCard> = {
  'single-origin-dark': {
    artworkTitle: { en: "What Remains of Us", ar: 'ما يبقى منا' },
    artistName: { en: 'Afnan Ali', ar: 'أفنان علي' },
    description: {
      en: "Inspired by the timeless values that endure across generations, the artwork reflects the profound bond between people, their land, and their cultural identity. It reminds us that what truly remains is the legacy we preserve and pass on.",
      ar: 'استُلهم هذا العمل من القيم الراسخة التي تبقى رغم تعاقب الزمن، ويجسد العلاقة العميقة بين الإنسان وأرضه وهويته. ويؤكد أن ما يبقى حقًا هو الإرث الذي نحفظه ونتناقله عبر الأجيال.',
    },
  },
  'dark-60': {
    artworkTitle: { en: "The Jazan Head Ornament", ar: 'الميل الجازاني' },
    artistName: { en: 'Wajd Jandali', ar: 'وجد جندلي' },
    description: {
      en: "Inspired by the elegance of the Jazan woman and her traditional attire, the artwork highlights the iconic Meel head ornament. It celebrates a cultural heritage that continues to thrive through everyday life.",
      ar: 'استُلهم هذا العمل من جمال المرأة الجازانية وأصالة زيّها التقليدي، ويبرز «الميل» بوصفه أحد رموز الهوية الاجتماعية. وتحتفي اللوحة بتراثٍ ما زال حاضرًا في تفاصيل الحياة اليومية.',
    },
  },
  'signature-milk': {
    artworkTitle: { en: "Shepherds' Memories", ar: 'ذاكرة الرعاة' },
    artistName: { en: 'Afnan Ali', ar: 'أفنان علي' },
    description: {
      en: "Inspired by the lives of shepherds across Jazan's mountains and valleys, the artwork portrays the simplicity of rural life and the harmony between people and nature. It celebrates authenticity, patience, and the enduring connection to the land.",
      ar: 'استُلهم هذا العمل من حياة الرعاة في جبال وسهول جازان، ويجسد بساطة الحياة وانسجام الإنسان مع الطبيعة. وتحتفي اللوحة بقيم الأصالة والصبر والارتباط العميق بالأرض.',
    },
  },
  'jazan-jasmine': {
    artworkTitle: { en: "When the Fields Bloom", ar: 'حين تزهر الحقول' },
    artistName: { en: 'Afnan Ali', ar: 'أفنان علي' },
    description: {
      en: "Inspired by the Arabian jasmine of Jazan, a timeless symbol of fragrance and beauty, the artwork portrays a woman carrying a basket of blossoms. It expresses the authenticity, generosity, and warmth that define the spirit of Jazan.",
      ar: 'استُلهم هذا العمل من الفُل الجازاني، رمز العطر والجمال في المنطقة، ويجسد امرأة تحمل سلة من الزهور. وتعبر اللوحة عن الأصالة والكرم ودفء المجتمع الجازاني.',
    },
  },
  'damascena-rose': {
    artworkTitle: { en: "When the Fields Bloom", ar: 'حين تزهر الحقول' },
    artistName: { en: 'Afnan Ali', ar: 'أفنان علي' },
    description: {
      en: "Inspired by the fragrance of Jazan's roses and aromatic plants, the artwork reflects the beauty of nature and the enduring bond between people and their environment. It celebrates one of the region's most elegant cultural treasures.",
      ar: 'استُلهم هذا العمل من عبير الورود والنباتات العطرية في جازان، ويجسد جمال الطبيعة وارتباط الإنسان ببيئته. وتحتفي اللوحة بأحد أرقى ملامح الهوية العطرية للمنطقة.',
    },
  },
  'khawlani-coffee': {
    artworkTitle: { en: "The First Harvest", ar: 'الحصاد الأول' },
    artistName: { en: 'Afnan Ali', ar: 'أفنان علي' },
    description: {
      en: "Inspired by the coffee farms of Jazan, the artwork portrays a young boy carrying freshly harvested coffee cherries, marking the beginning of a tradition passed down through generations. It honors Jazan's renowned coffee heritage.",
      ar: 'استُلهم هذا العمل من مزارع البن الجازاني، ويجسد طفلًا يحمل سلة البن في بداية رحلة الحصاد المتوارثة عبر الأجيال. وتعكس اللوحة ارتباط الإنسان بأرضه واعتزازه بإرثه الزراعي.',
    },
  },
  'sea-salt-dark': {
    artworkTitle: { en: "White Tide", ar: 'أبيض المدّ' },
    artistName: { en: 'Afnan Ali', ar: 'أفنان علي' },
    description: {
      en: "Inspired by Jazan's historic salt fields, the artwork portrays a salt worker whose dedication reflects generations of perseverance. It celebrates the timeless relationship between the people and the sea.",
      ar: 'استُلهم هذا العمل من ملاحات جازان التاريخية، ويجسد عامل الملح ورحلة الكفاح والصبر في جمع أحد أقدم كنوز البحر. وتحتفي اللوحة بعلاقة الإنسان بالبحر وإرثه العريق.',
    },
  },
  'chili-dark': {
    artworkTitle: { en: "The Millstone", ar: 'المطحنة' },
    artistName: { en: 'Wajd Jandali', ar: 'وجد جندلي' },
    description: {
      en: "Inspired by everyday life in Jazan, the artwork portrays a woman grinding chili peppers with a traditional stone mill. It honors the role of women in preserving culinary traditions across generations.",
      ar: 'استُلهم هذا العمل من تفاصيل الحياة اليومية في جازان، ويجسد امرأة تطحن الفلفل بالطاحونة الحجرية التقليدية. وتعكس اللوحة دور المرأة في حفظ الموروث الغذائي ونقل النكهات الأصيلة.',
    },
  },
  'lavender-milk': {
    artworkTitle: { en: "When the Fields Bloom", ar: 'حين تزهر الحقول' },
    artistName: { en: 'Afnan Ali', ar: 'أفنان علي' },
    description: {
      en: "Inspired by Jazan's aromatic plants, the artwork portrays a woman carrying a basket filled with lavender and local herbs. It celebrates the harmony between people and nature and the region's rich botanical heritage.",
      ar: 'استُلهم هذا العمل من النباتات العطرية التي تزخر بها جازان، ويجسد امرأة تحمل سلة مليئة بالخزامى والنباتات المحلية. وتعكس اللوحة انسجام الإنسان مع الطبيعة وثراء الإرث العطري للمنطقة.',
    },
  },
  'jazani-mango': {
    artworkTitle: { en: "Waves of Mango", ar: 'موج المانجو' },
    artistName: { en: 'Rehab Zakri', ar: 'رحاب زكري' },
    description: {
      en: "Inspired by the meeting of Jazan's coastline and its mango orchards, the artwork blends the blue sea with lush greenery. It celebrates the mango as one of Jazan's most iconic agricultural treasures.",
      ar: 'استُلهم هذا العمل من التقاء بحر جازان ببساتين المانجو، حيث تمتزج زرقة البحر بخضرة الطبيعة في مشهد يعكس جمال المنطقة. وتجسد اللوحة المانجو كأحد أبرز رموز جازان الزراعية.',
    },
  },
  'sun-papaya': {
    artworkTitle: { en: "Papaya Harvest", ar: 'حصاد البابايا' },
    artistName: { en: 'Rehab Zakri', ar: 'رحاب زكري' },
    description: {
      en: "Inspired by Jazan's flourishing papaya orchards, the artwork captures the harvest of one of the region's most celebrated tropical fruits. Its vibrant colors reflect the richness and abundance of Jazan's landscape.",
      ar: 'استُلهم هذا العمل من مزارع البابايا التي تزين جازان، ويجسد لحظة حصاد إحدى أشهر الفواكه الاستوائية في المنطقة. وتعكس ألوانه حيوية الطبيعة ووفرة الخير التي تميز جازان.',
    },
  },
  'banana-dark': {
    artworkTitle: { en: "Among the Banana Clusters", ar: 'بين عناقيد الموز' },
    artistName: { en: 'Rehab Zakri', ar: 'رحاب زكري' },
    description: {
      en: "Inspired by Jazan's abundant banana plantations, the artwork portrays lush banana clusters that blend with the land and its people. It celebrates fertility, generosity, and the tropical spirit of Jazan.",
      ar: 'استُلهم هذا العمل من وفرة مزارع الموز في جازان، حيث تتناغم عناقيد الموز مع الأرض والإنسان في مشهد يجسد الخصوبة والعطاء. وتعكس اللوحة روح جازان الاستوائية وقصة أرضٍ تُثمر خيرًا وجمالًا.',
    },
  },
}

export const products: Product[] = baseProducts.map((p) => ({ ...p, artCard: productArtCards[p.slug] ?? p.artCard }))

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
