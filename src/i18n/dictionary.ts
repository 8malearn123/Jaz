// Bilingual UI dictionary for JAZ Chocolate.
// Content data (product names, stories) carry their own _ar/_en fields in mock data;
// this dictionary covers the application chrome. Arabic is first-class, not a translation afterthought.

export type Locale = 'en' | 'ar'

type Dict = Record<string, { en: string; ar: string }>

export const dict: Dict = {
  // ── Brand ──────────────────────────────────────────────
  'brand.name': { en: 'JAZ', ar: 'جاز' },
  'brand.tagline': {
    en: "Where Jazan's harvest meets world-class confection",
    ar: 'حيث يلتقي حصاد جازان بصناعة الشوكولاتة العالمية',
  },
  'brand.location': { en: 'Abu Arish · Jazan · Saudi Arabia', ar: 'أبو عريش · جازان · المملكة العربية السعودية' },

  // ── Navigation ─────────────────────────────────────────
  'nav.shop': { en: 'Shop', ar: 'المتجر' },
  'nav.collections': { en: 'Collections', ar: 'المجموعات' },
  'nav.corporate': { en: 'Corporate', ar: 'الشركات' },
  'nav.heritage': { en: 'Heritage', ar: 'الإرث' },
  'nav.account': { en: 'Account', ar: 'الحساب' },
  'nav.search': { en: 'Search', ar: 'بحث' },
  'nav.cart': { en: 'Cart', ar: 'السلة' },
  'nav.menu': { en: 'Menu', ar: 'القائمة' },
  'nav.signin': { en: 'Sign in', ar: 'تسجيل الدخول' },
  'nav.business': { en: 'Business portal', ar: 'بوابة الأعمال' },

  // ── Common actions ─────────────────────────────────────
  'cta.shop': { en: 'Shop the collection', ar: 'تسوّق المجموعة' },
  'cta.explore': { en: 'Explore', ar: 'استكشف' },
  'cta.learnMore': { en: 'Learn more', ar: 'اعرف المزيد' },
  'cta.addToCart': { en: 'Add to cart', ar: 'أضف إلى السلة' },
  'cta.added': { en: 'Added', ar: 'تمت الإضافة' },
  'cta.viewAll': { en: 'View all', ar: 'عرض الكل' },
  'cta.continue': { en: 'Continue', ar: 'متابعة' },
  'cta.back': { en: 'Back', ar: 'رجوع' },
  'cta.viewDetails': { en: 'View details', ar: 'عرض التفاصيل' },
  'cta.checkout': { en: 'Checkout', ar: 'إتمام الشراء' },
  'cta.continueShopping': { en: 'Continue shopping', ar: 'مواصلة التسوق' },

  // ── Status / badges ────────────────────────────────────
  'badge.new': { en: 'New', ar: 'جديد' },
  'badge.bestseller': { en: 'Bestseller', ar: 'الأكثر مبيعًا' },
  'badge.limited': { en: 'Limited', ar: 'إصدار محدود' },
  'badge.seasonal': { en: 'Seasonal', ar: 'موسمي' },
  'badge.outOfStock': { en: 'Out of stock', ar: 'نفد المخزون' },
  'badge.inStock': { en: 'In stock', ar: 'متوفر' },
  'badge.coldChain': { en: 'Cold-chain', ar: 'سلسلة تبريد' },

  // ── Home ───────────────────────────────────────────────
  'home.hero.eyebrow': { en: 'Jazan-rooted · Saudi luxury chocolate', ar: 'من جذور جازان · شوكولاتة سعودية فاخرة' },
  'home.hero.title': { en: 'A taste of the south,\nrefined into art.', ar: 'نكهةٌ من الجنوب،\nمصاغةٌ كالفن.' },
  'home.hero.body': {
    en: 'Single-origin intentions, painterly packaging, and flavors drawn from the Jazan harvest — jasmine, rose, lavender, papaya. Crafted in Abu Arish, gifted across the Kingdom.',
    ar: 'نيّةٌ صافية من منشأٍ واحد، وتغليفٌ كاللوحة، ونكهاتٌ من حصاد جازان — الفُل، الورد، الخزامى، الببايا. تُصنع في أبو عريش، وتُهدى في أنحاء المملكة.',
  },
  'home.marquee': {
    en: 'Cold-chain delivery Kingdom-wide · ZATCA e-invoicing · Corporate gifting at scale · Bilingual concierge',
    ar: 'توصيل بسلسلة تبريد في كل المملكة · فوترة إلكترونية معتمدة من هيئة الزكاة · إهداء مؤسسي بالجملة · كونسيرج بلغتين',
  },
  'home.flavors.eyebrow': { en: 'The Flavor Library', ar: 'مكتبة النكهات' },
  'home.flavors.title': { en: 'Five notes of Jazan', ar: 'خمس نفحات من جازان' },
  'home.flavors.body': {
    en: 'Each bar is a single, confident idea — milk chocolate married to one botanical from the southern farms.',
    ar: 'كل لوح فكرةٌ واحدة واثقة — شوكولاتة بالحليب تتزاوج مع نبتةٍ واحدة من مزارع الجنوب.',
  },
  'home.collections.eyebrow': { en: 'Curated Collections', ar: 'مجموعات منتقاة' },
  'home.collections.title': { en: 'Boxed, ribboned, ready to give', ar: 'معبّأة، مزيّنة، جاهزة للإهداء' },
  'home.story.eyebrow': { en: 'Our Heritage', ar: 'إرثنا' },
  'home.story.title': { en: 'Grown in the south,\nmade for the world', ar: 'نشأت في الجنوب،\nوصُنعت للعالم' },
  'home.story.body': {
    en: 'JAZ is a Jazan house. Our region gives the Kingdom its coffee, its mango, its jasmine and roses — and we fold that harvest into chocolate that carries a sense of place. Every wrapper is original artwork by Saudi artists; every collectible art-card credits the hand that painted it.',
    ar: 'جاز بيتٌ جازاني. يمنح إقليمنا المملكة بنّها ومانجوها وفلّها وورودها — ونحن نطوي ذلك الحصاد في شوكولاتةٍ تحمل روح المكان. كل غلافٍ لوحةٌ أصلية لفنانين سعوديين؛ وكل بطاقة فنية مقتناة تنسب الفضل لليد التي رسمتها.',
  },
  'home.corporate.eyebrow': { en: 'For Business', ar: 'للأعمال' },
  'home.corporate.title': { en: 'Gifting, at the scale of a season', ar: 'إهداءٌ على مقاس الموسم' },
  'home.corporate.body': {
    en: 'Open a corporate account for tiered pricing, governed credit terms, ZATCA standard invoicing, and bulk gifting that fans out to hundreds of recipients — each with a personalised bilingual card.',
    ar: 'افتح حساب شركة لتحصل على تسعيرٍ متدرّج، وحدود ائتمان منضبطة، وفوترة معيارية معتمدة، وإهداءٍ بالجملة يتفرّع لمئات المستفيدين — لكلٍّ بطاقةٌ شخصية بلغتين.',
  },
  'home.corporate.cta': { en: 'Open a business account', ar: 'افتح حساب أعمال' },
  'home.newsletter.title': { en: 'Letters from the maison', ar: 'رسائل من المنزل' },
  'home.newsletter.body': {
    en: 'New harvests, limited art-cards, and seasonal boxes — first to your inbox.',
    ar: 'حصادٌ جديد، وبطاقاتٌ فنية محدودة، وعلبٌ موسمية — تصلك أولًا.',
  },
  'home.newsletter.placeholder': { en: 'Your email address', ar: 'بريدك الإلكتروني' },
  'home.newsletter.cta': { en: 'Subscribe', ar: 'اشترك' },

  // ── Shop ───────────────────────────────────────────────
  'shop.title': { en: 'The Chocolate Library', ar: 'مكتبة الشوكولاتة' },
  'shop.subtitle': {
    en: 'Bars, boxes, and collectible gifts — priced for you and your business.',
    ar: 'ألواح، وعلب، وهدايا مقتناة — بأسعارٍ لك ولأعمالك.',
  },
  'shop.filter.all': { en: 'All', ar: 'الكل' },
  'shop.filter.flavor': { en: 'Flavor', ar: 'النكهة' },
  'shop.filter.type': { en: 'Type', ar: 'النوع' },
  'shop.filter.occasion': { en: 'Occasion', ar: 'المناسبة' },
  'shop.results': { en: 'pieces', ar: 'قطعة' },
  'shop.sort': { en: 'Sort', ar: 'ترتيب' },
  'shop.empty': { en: 'No pieces match these filters yet.', ar: 'لا توجد قطعٌ تطابق هذه المرشحات بعد.' },

  // ── Product ────────────────────────────────────────────
  'product.flavor': { en: 'Flavor', ar: 'النكهة' },
  'product.weight': { en: 'Weight', ar: 'الوزن' },
  'product.quantity': { en: 'Quantity', ar: 'الكمية' },
  'product.cocoa': { en: 'Cocoa', ar: 'الكاكاو' },
  'product.story': { en: 'The story', ar: 'القصة' },
  'product.ingredients': { en: 'Ingredients', ar: 'المكونات' },
  'product.allergens': { en: 'Allergens', ar: 'مسببات الحساسية' },
  'product.artcard': { en: 'Collectible art-card', ar: 'بطاقة فنية مقتناة' },
  'product.artcardBy': { en: 'Artwork by', ar: 'العمل الفني من إبداع' },
  'product.reviews': { en: 'Reviews', ar: 'التقييمات' },
  'product.verifiedPurchase': { en: 'Verified purchase', ar: 'شراء موثّق' },
  'product.related': { en: 'Pairs beautifully with', ar: 'يتناغم بجمال مع' },
  'product.coldChainNote': {
    en: 'Heat-sensitive — ships in temperature-controlled cold-chain packaging.',
    ar: 'حساسة للحرارة — تُشحن بتغليف مبرّد بسلسلة تبريد محكمة.',
  },
  'product.b2cPrice': { en: 'Retail', ar: 'التجزئة' },
  'product.b2bPrice': { en: 'Your account price', ar: 'سعر حسابك' },

  // ── Cart ───────────────────────────────────────────────
  'cart.title': { en: 'Your cart', ar: 'سلتك' },
  'cart.empty': { en: 'Your cart is quiet for now', ar: 'سلتك هادئة حتى الآن' },
  'cart.emptyBody': {
    en: 'Add a bar, a box, or a collectible — we will keep it cold all the way to the door.',
    ar: 'أضف لوحًا أو علبة أو قطعة مقتناة — وسنبقيها باردة حتى الباب.',
  },
  'cart.item': { en: 'Item', ar: 'الصنف' },
  'cart.remove': { en: 'Remove', ar: 'إزالة' },
  'cart.gift': { en: 'This is a gift', ar: 'هذه هدية' },
  'cart.giftMessage': { en: 'Gift message', ar: 'رسالة الهدية' },
  'cart.summary': { en: 'Order summary', ar: 'ملخص الطلب' },
  'cart.subtotal': { en: 'Subtotal', ar: 'المجموع الفرعي' },
  'cart.discount': { en: 'Discount', ar: 'الخصم' },
  'cart.vat': { en: 'VAT (15%)', ar: 'ضريبة القيمة المضافة (15٪)' },
  'cart.shipping': { en: 'Shipping', ar: 'الشحن' },
  'cart.shippingFree': { en: 'Complimentary', ar: 'مجاني' },
  'cart.coldChainFee': { en: 'Cold-chain handling', ar: 'مناولة سلسلة التبريد' },
  'cart.total': { en: 'Total', ar: 'الإجمالي' },
  'cart.promo': { en: 'Promo code', ar: 'رمز الخصم' },
  'cart.apply': { en: 'Apply', ar: 'تطبيق' },
  'cart.taxNote': { en: 'Prices include 15% VAT · ZATCA-compliant invoice issued', ar: 'الأسعار تشمل ضريبة 15٪ · تُصدر فاتورة معتمدة من هيئة الزكاة' },

  // ── Checkout ───────────────────────────────────────────
  'checkout.title': { en: 'Checkout', ar: 'إتمام الشراء' },
  'checkout.channel': { en: 'Buying as', ar: 'الشراء بصفة' },
  'checkout.b2c': { en: 'Individual', ar: 'فرد' },
  'checkout.b2b': { en: 'Business account', ar: 'حساب أعمال' },
  'checkout.contact': { en: 'Contact', ar: 'التواصل' },
  'checkout.delivery': { en: 'Delivery address', ar: 'عنوان التوصيل' },
  'checkout.nationalAddress': { en: 'Saudi National Address', ar: 'العنوان الوطني السعودي' },
  'checkout.payment': { en: 'Payment', ar: 'الدفع' },
  'checkout.poNumber': { en: 'Purchase order (PO) number', ar: 'رقم أمر الشراء' },
  'checkout.placeOrder': { en: 'Place order', ar: 'تأكيد الطلب' },
  'checkout.firstName': { en: 'First name', ar: 'الاسم الأول' },
  'checkout.lastName': { en: 'Last name', ar: 'اسم العائلة' },
  'checkout.email': { en: 'Email', ar: 'البريد الإلكتروني' },
  'checkout.phone': { en: 'Mobile (KSA)', ar: 'الجوال (السعودية)' },
  'checkout.city': { en: 'City', ar: 'المدينة' },
  'checkout.district': { en: 'District', ar: 'الحي' },
  'checkout.shortAddress': { en: 'Short address', ar: 'العنوان المختصر' },
  'checkout.pay.mada': { en: 'mada', ar: 'مدى' },
  'checkout.pay.card': { en: 'Credit / debit card', ar: 'بطاقة ائتمان / مدى' },
  'checkout.pay.applepay': { en: 'Apple Pay', ar: 'Apple Pay' },
  'checkout.pay.tabby': { en: 'Tabby — pay in 4', ar: 'تابي — قسّمها على ٤' },
  'checkout.pay.tamara': { en: 'Tamara — split payment', ar: 'تمارا — دفعات' },
  'checkout.pay.credit': { en: 'Account credit terms', ar: 'الشراء على حساب آجل' },
  'checkout.pay.creditNote': { en: 'Settle on your agreed terms', ar: 'السداد وفق شروطك المتفق عليها' },
  'checkout.orderPlaced': { en: 'Order confirmed', ar: 'تم تأكيد الطلب' },
  'checkout.orderPlacedBody': {
    en: 'A ZATCA-compliant tax invoice is on its way to your inbox and WhatsApp.',
    ar: 'فاتورة ضريبية معتمدة من هيئة الزكاة في طريقها إلى بريدك وواتساب.',
  },

  // ── Credit (B2B) ───────────────────────────────────────
  'credit.title': { en: 'Credit account', ar: 'الحساب الائتماني' },
  'credit.limit': { en: 'Credit limit', ar: 'حد الائتمان' },
  'credit.available': { en: 'Available', ar: 'المتاح' },
  'credit.reserved': { en: 'Reserved', ar: 'محجوز' },
  'credit.outstanding': { en: 'Outstanding', ar: 'مستحق' },
  'credit.terms': { en: 'Payment terms', ar: 'شروط السداد' },
  'credit.requestIncrease': { en: 'Request a higher limit', ar: 'طلب رفع الحد' },
  'credit.ledger': { en: 'Credit ledger', ar: 'سجل الائتمان' },
  'credit.statements': { en: 'Statements', ar: 'كشوف الحساب' },
  'credit.nextReview': { en: 'Next review', ar: 'المراجعة القادمة' },
  'credit.riskRating': { en: 'Risk rating', ar: 'تصنيف المخاطر' },
  'credit.overLimit.title': { en: 'This order exceeds your available credit', ar: 'هذا الطلب يتجاوز رصيدك الائتماني المتاح' },
  'credit.overLimit.body': {
    en: 'No silent over-limit spending is possible. Choose how you would like to proceed:',
    ar: 'لا يمكن تجاوز الحد دون قرار واضح. اختر كيف تودّ المتابعة:',
  },
  'credit.overLimit.shortfall': { en: 'Shortfall', ar: 'العجز' },
  'credit.overLimit.reduce': { en: 'Reduce the order', ar: 'تقليل الطلب' },
  'credit.overLimit.payExcess': { en: 'Pay the excess now by card / mada', ar: 'ادفع الفائض الآن ببطاقة / مدى' },
  'credit.overLimit.requestMore': { en: 'Request a higher limit', ar: 'اطلب رفع الحد' },
  'credit.overLimit.requestNote': {
    en: 'Opens a limit-increase application and notifies your account manager. A human, finance-approved decision.',
    ar: 'يفتح طلب رفع للحد ويُشعر مدير حسابك. قرارٌ بشري يعتمده قسم المالية.',
  },
  'credit.app.title': { en: 'Request a limit increase', ar: 'طلب رفع الحد الائتماني' },
  'credit.app.requested': { en: 'Requested limit', ar: 'الحد المطلوب' },
  'credit.app.justification': { en: 'Justification', ar: 'المبرّر' },
  'credit.app.justificationPlaceholder': {
    en: 'e.g. seasonal Ramadan gifting volume',
    ar: 'مثال: حجم إهداء موسم رمضان',
  },
  'credit.app.submit': { en: 'Submit to sales', ar: 'إرسال إلى المبيعات' },
  'credit.app.submitted': { en: 'Sent to your account manager', ar: 'أُرسل إلى مدير حسابك' },
  'credit.app.submittedBody': {
    en: 'Finance will review and respond. We will notify you on WhatsApp.',
    ar: 'سيراجع قسم المالية ويردّ. سنُشعرك عبر واتساب.',
  },

  // ── Corporate / B2B landing ────────────────────────────
  'corp.hero.eyebrow': { en: 'JAZ for Business', ar: 'جاز للأعمال' },
  'corp.hero.title': { en: 'Account-based trade,\nbuilt for the Kingdom', ar: 'تجارةٌ على الحساب،\nمبنيّة للمملكة' },
  'corp.hero.body': {
    en: 'Corporate gifting, hospitality, and reseller buyers — one catalogue, negotiated price lists, governed credit, and ZATCA standard invoicing.',
    ar: 'إهداء الشركات والضيافة والموزّعون — كتالوج واحد، وقوائم أسعار تفاوضية، وائتمان منضبط، وفوترة معيارية معتمدة.',
  },
  'corp.feature.pricing.title': { en: 'Tiered price lists', ar: 'قوائم أسعار متدرّجة' },
  'corp.feature.pricing.body': {
    en: 'Bronze to platinum tiers with quantity volume breaks, resolved automatically at checkout.',
    ar: 'فئات من البرونزي إلى البلاتيني مع كسور سعرية حسب الكمية، تُحتسب تلقائيًا عند الدفع.',
  },
  'corp.feature.credit.title': { en: 'Governed credit', ar: 'ائتمان منضبط' },
  'corp.feature.credit.body': {
    en: 'An explicit, auditable limit. Orders consume credit transactionally; over-limit is structurally impossible.',
    ar: 'حدٌّ صريح وقابل للتدقيق. تستهلك الطلبات الائتمان لحظيًا؛ وتجاوز الحد مستحيلٌ بنيويًا.',
  },
  'corp.feature.gifting.title': { en: 'Bulk gifting', ar: 'إهداء بالجملة' },
  'corp.feature.gifting.body': {
    en: 'One order fans out to hundreds of recipients, each a tracked shipment with a bilingual card.',
    ar: 'طلبٌ واحد يتفرّع لمئات المستفيدين، كلٌّ شحنة متتبّعة ببطاقة بلغتين.',
  },
  'corp.feature.invoicing.title': { en: 'ZATCA invoicing', ar: 'فوترة هيئة الزكاة' },
  'corp.feature.invoicing.body': {
    en: 'Standard invoices cleared with ZATCA before issuance; bilingual PDFs with QR.',
    ar: 'فواتير معيارية تُجاز مع الهيئة قبل الإصدار؛ ملفات PDF بلغتين مع رمز QR.',
  },
  'corp.apply.title': { en: 'Open a business account', ar: 'افتح حساب أعمال' },
  'corp.apply.body': {
    en: 'Verified through Wathq and the ZATCA VAT registry — usually within two business days.',
    ar: 'يُوثَّق عبر واثق وسجل ضريبة القيمة المضافة — عادةً خلال يومي عمل.',
  },
  'corp.apply.legalName': { en: 'Legal name (per CR)', ar: 'الاسم النظامي (حسب السجل)' },
  'corp.apply.cr': { en: 'Commercial Registration no.', ar: 'رقم السجل التجاري' },
  'corp.apply.vat': { en: 'VAT number', ar: 'الرقم الضريبي' },
  'corp.apply.type': { en: 'Account type', ar: 'نوع الحساب' },
  'corp.apply.submit': { en: 'Submit for verification', ar: 'إرسال للتوثيق' },

  // ── Heritage ───────────────────────────────────────────
  'heritage.hero.eyebrow': { en: 'The JAZ Story', ar: 'قصة جاز' },
  'heritage.hero.title': { en: 'From the farms of\nthe far south', ar: 'من مزارع\nأقصى الجنوب' },

  // ── Footer ─────────────────────────────────────────────
  'footer.shop': { en: 'Shop', ar: 'تسوّق' },
  'footer.about': { en: 'Maison', ar: 'المنزل' },
  'footer.business': { en: 'Business', ar: 'الأعمال' },
  'footer.support': { en: 'Care', ar: 'العناية' },
  'footer.allChocolate': { en: 'All chocolate', ar: 'كل الشوكولاتة' },
  'footer.collections': { en: 'Gift collections', ar: 'مجموعات الإهداء' },
  'footer.giftCards': { en: 'Gift cards', ar: 'بطاقات الهدايا' },
  'footer.subscriptions': { en: 'Subscriptions', ar: 'الاشتراكات' },
  'footer.ourStory': { en: 'Our story', ar: 'قصتنا' },
  'footer.artists': { en: 'The artists', ar: 'الفنانون' },
  'footer.sustainability': { en: 'Sourcing', ar: 'المصادر' },
  'footer.careers': { en: 'Careers', ar: 'الوظائف' },
  'footer.corporateGifting': { en: 'Corporate gifting', ar: 'إهداء الشركات' },
  'footer.creditAccounts': { en: 'Credit accounts', ar: 'الحسابات الائتمانية' },
  'footer.becomeReseller': { en: 'Become a reseller', ar: 'كن موزّعًا' },
  'footer.contact': { en: 'Contact', ar: 'تواصل معنا' },
  'footer.shipping': { en: 'Shipping & cold-chain', ar: 'الشحن وسلسلة التبريد' },
  'footer.returns': { en: 'Returns', ar: 'الإرجاع' },
  'footer.privacy': { en: 'Privacy (PDPL)', ar: 'الخصوصية (نظام حماية البيانات)' },
  'footer.newsletter': { en: 'Join the list', ar: 'انضم للقائمة' },
  'footer.rights': {
    en: '© 2026 JAZ Chocolate Food Industries Company. All rights reserved.',
    ar: '© ٢٠٢٦ شركة جاز للصناعات الغذائية للشوكولاتة. جميع الحقوق محفوظة.',
  },
  'footer.madeIn': { en: 'Crafted in Abu Arish, Jazan, Kingdom of Saudi Arabia', ar: 'صُنعت في أبو عريش، جازان، المملكة العربية السعودية' },

  // ── Misc / system ──────────────────────────────────────
  'lang.toggle': { en: 'العربية', ar: 'English' },
  'common.currency': { en: 'SAR', ar: 'ر.س' },
  'common.free': { en: 'Free', ar: 'مجاني' },
  'common.from': { en: 'From', ar: 'يبدأ من' },
  'common.each': { en: 'each', ar: 'للقطعة' },
  'notFound.title': { en: 'This page melted away', ar: 'هذه الصفحة ذابت' },
  'notFound.body': { en: 'Let us walk you back to the warmth.', ar: 'دعنا نعيدك إلى الدفء.' },
  'notFound.cta': { en: 'Back to home', ar: 'العودة للرئيسية' },
}
