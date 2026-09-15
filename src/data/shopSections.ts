// The /shop page as the client laid it out in «تعديلات محتوى منصة جاز شوكلت» §الصفحة الثالثة.
// The order below is their order — do not sort these lists.
// The per-flavour line of copy for the second section lives on `Flavor.landLine`.

/** «القسم الأول (مباشر)» — Milk, Lavender, Rose, Jasmine, Dark, Dark 60%. */
export const directProductIds: readonly string[] = ['p-milk', 'p-lavender', 'p-rose', 'p-jasmine', 'p-dark', 'p-dark60']

/** «نكهات من أرضٍ واحدة» — قهوة، بابايا، موز، مانجو، ملح بحري، فل، فلفل. */
export const oneLandProductIds: readonly string[] = [
  'p-coffee',
  'p-papaya',
  'p-banana',
  'p-mango',
  'p-seasalt',
  // Deliberate: the client lists فل in both sections. See .context/client-notes/NOTES.md.
  'p-jasmine',
  'p-chili',
]

/**
 * Ids the client placed in both sections. Derived rather than hand-written, so that
 * collapsing فل into one list later also removes the page's note about the repeat.
 */
export const repeatedProductIds: ReadonlySet<string> = new Set(
  directProductIds.filter((id) => oneLandProductIds.includes(id)),
)
