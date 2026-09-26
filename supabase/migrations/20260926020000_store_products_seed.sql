-- Seeded from storeProductsSeed in src/data/ownerCatalog.ts.
-- GENERATED — do not hand-edit; regenerate if that data changes.
--
-- Ids are derived from each product's natural key rather than random, so re-running
-- this is a no-op instead of a second copy of the catalogue.
--
-- price_minor is deliberately NOT written here. The variant inserts below fire
-- store_products_sync_headline(), which derives it from the first variant's retail
-- price — writing it too would hide a broken trigger behind a correct-looking column.

insert into public.store_products
  (id, channel, name_en, name_ar, desc_en, desc_ar, category_en, category_ar, color, image,
   badges, visible, country, sku, moq, net_weight, shelf_life, barcode, notes, components, sort_order)
values
  ('081a7865-3a9e-5caf-8f13-453bae3e68ae','b2c','Dark 70% bar','لوح داكن ٧٠٪','Single-origin Jazan cacao, slow-conched to a clean snap.','كاكاو جازان أحادي المصدر، مُملّس ببطء حتى قرمشة نقية.','Single bars','ألواح فردية','#2e1a10','/products/bar-dark-70.jpg','{bestseller}',true,null,null,null,null,null,null,null,'[]'::jsonb,0),
  ('1c091a06-eaa9-55e0-8f6c-6f0f6371d4a6','b2c','Dark 60% bar','لوح داكن ٦٠٪','Rounder, gentler dark — 60% cacao with a soft finish.','داكن أنعم وأكثر توازنًا — ٦٠٪ كاكاو بنهاية ناعمة.','Single bars','ألواح فردية','#3b241a','/products/bar-dark-60.jpg','{}',true,null,null,null,null,null,null,null,'[]'::jsonb,1),
  ('36b18b75-6d31-569d-8ec9-a7d1d376572e','b2c','Milk chocolate bar','لوح حليب','Creamy milk chocolate, smooth and comforting.','شوكولاتة حليب كريمية، ناعمة ومريحة.','Single bars','ألواح فردية','#8a6b3f','/products/bar-milk.jpg','{bestseller}',true,null,null,null,null,null,null,null,'[]'::jsonb,2),
  ('f2d136fb-2e0e-5916-8b1d-addb3c1b0f82','b2c','Dark chocolate with Arabian jasmine','لوح داكن بالفل العربي','Dark chocolate perfumed with Arabian jasmine.','شوكولاتة داكنة معطّرة بالفل العربي.','Single bars','ألواح فردية','#6b5a3a','/products/bar-dark-jasmine.jpg','{new}',true,null,null,null,null,null,null,null,'[]'::jsonb,3),
  ('25028f80-8537-51c2-8067-b641dd3d51a8','b2c','Dark chocolate with rose','لوح داكن بالورد','Dark chocolate with the delicate scent of rose.','شوكولاتة داكنة بعبق الورد الرقيق.','Single bars','ألواح فردية','#7a4551','/products/bar-dark-rose.jpg','{}',true,null,null,null,null,null,null,null,'[]'::jsonb,4),
  ('1c7e69ec-2682-580c-8493-33a011d51c4b','b2c','Dark chocolate with coffee','لوح داكن بالقهوة','Dark chocolate deepened with roasted coffee.','شوكولاتة داكنة بعمق القهوة المحمّصة.','Single bars','ألواح فردية','#3a2418','/products/bar-dark-coffee.jpg','{}',true,null,null,null,null,null,null,null,'[]'::jsonb,5),
  ('d17d2ea3-190f-5f9f-8502-ddd437cf22cc','b2c','Dark chocolate with sea salt','لوح داكن بملح البحر','Dark chocolate with a bright hit of sea salt.','شوكولاتة داكنة بلمسة منعشة من ملح البحر.','Single bars','ألواح فردية','#4a3626','/products/bar-dark-seasalt.jpg','{new}',true,null,null,null,null,null,null,null,'[]'::jsonb,6),
  ('f33de943-47b2-5c60-8451-3c862a4a1165','b2c','Dark chocolate with chili','لوح داكن بالفلفل الحار','Dark chocolate with a warm chili finish.','شوكولاتة داكنة بنهاية دافئة من الفلفل الحار.','Single bars','ألواح فردية','#6b2e1e','/products/bar-dark-chili.jpg','{}',true,null,null,null,null,null,null,null,'[]'::jsonb,7),
  ('87b4f4ec-c3e2-5be2-806f-c911f2a39d50','b2c','Dark chocolate with lavender','لوح داكن باللافندر','Dark chocolate infused with fragrant lavender.','شوكولاتة داكنة منقوعة باللافندر العطري.','Single bars','ألواح فردية','#6a5a7a','/products/bar-dark-lavender.jpg','{}',true,null,null,null,null,null,null,null,'[]'::jsonb,8),
  ('8c807608-5e12-5823-8ee2-f567129490df','b2c','Dark chocolate with mango','لوح داكن بالمانجو','Dark chocolate with sun-ripe mango.','شوكولاتة داكنة بالمانجو الناضجة.','Single bars','ألواح فردية','#b5792e','/products/bar-dark-mango.jpg','{}',true,null,null,null,null,null,null,null,'[]'::jsonb,9),
  ('f75313b2-e5f5-55ff-8bf0-1a5329c51e68','b2c','Dark chocolate with papaya','لوح داكن بالبابايا','Dark chocolate with sweet tropical papaya.','شوكولاتة داكنة بالبابايا الاستوائية الحلوة.','Single bars','ألواح فردية','#b5562e','/products/bar-dark-papaya.jpg','{}',true,null,null,null,null,null,null,null,'[]'::jsonb,10),
  ('ef5aeebf-aa37-57fd-8363-9a3e96c773da','b2c','Dark chocolate with banana','لوح داكن بالموز','Dark chocolate with mellow ripe banana.','شوكولاتة داكنة بالموز الناضج.','Single bars','ألواح فردية','#a8862e','/products/bar-dark-banana.jpg','{}',true,null,null,null,null,null,null,null,'[]'::jsonb,11),
  ('1da78686-2262-59d2-83b2-aa7711c1fe4b','b2c','Jasmine luxury box','بوكس الفُل الفاخر','A curated dozen — our jasmine collection, boxed to gift.','اثنتا عشرة قطعة منتقاة — مجموعة الفُل في علبة هدية.','Gift boxes','بوكسات هدايا','#b08a57',null,'{bestseller}',true,null,null,null,null,null,null,null,'[]'::jsonb,12),
  ('eb58ac5a-5800-5218-8bd3-1d7831e27748','b2c','Rose gift box','بوكس الورد','Damascena rose ganache in a keepsake case.','غاناش ورد دمشقي في علبة تُقتنى.','Gift boxes','بوكسات هدايا','#9c5566',null,'{limited}',false,null,null,null,null,null,null,null,'[]'::jsonb,13),
  ('30279c74-b5ea-5cab-804b-6cb690485321','b2c','Founding Day box','بوكس يوم التأسيس','Limited seasonal assortment for Founding Day.','تشكيلة موسمية محدودة ليوم التأسيس.','Seasonal','موسمي','#8a5a3a',null,'{seasonal}',true,'sa',null,null,null,null,null,null,'[]'::jsonb,14),
  ('07ce0340-312c-5706-8468-7e34264abe7e','b2b','Hotel amenity bar','لوح ضيافة الفندق','Turn-down amenity bar, cold-chain ready.','لوح ضيافة للغرف، جاهز لسلسلة التبريد.','Hospitality','ضيافة الفنادق','#6b4a2e',null,'{}',true,null,null,null,null,null,null,null,'[]'::jsonb,0),
  ('624e3726-f791-5e89-8d0f-f8a3b118ab3a','b2b','Café couverture drops','قطرات كوفرتور للمقاهي','Bulk couverture drops for café kitchens.','قطرات كوفرتور بالجملة لمطابخ المقاهي.','Hospitality','ضيافة الفنادق','#4a2c1a',null,'{}',true,null,null,null,null,null,null,null,'[]'::jsonb,1),
  ('d7b91f4e-6fac-5b5e-8603-b25ff0a8f2ed','b2b','Corporate crescent','هلال الشركات','Branded crescent centerpiece for corporate gifting.','قطعة هلال مُخصّصة لهدايا الشركات.','Corporate gifting','هدايا مؤسسية','#b08a57',null,'{bestseller}',true,null,null,null,null,null,null,null,'[]'::jsonb,2),
  ('ae55f4c3-0f63-5a14-850b-cb34d2a344c2','b2b','Founding Day hamper','سلة يوم التأسيس','Seasonal hamper for corporate orders.','سلة موسمية لطلبات الشركات.','Corporate gifting','هدايا مؤسسية','#8a5a3a',null,'{seasonal}',true,'sa',null,null,null,null,null,null,'[]'::jsonb,3),
  ('8fcd7345-a004-5834-875d-f07c00ac342f','mega','Assorted bar pallet','طبلية ألواح مشكّلة','Mixed retail bars, palletised for distribution.','ألواح تجزئة مشكّلة، مرصوصة للتوزيع.','Pallets','طبليات','#6b4a2e',null,'{bestseller}',true,null,null,null,null,null,null,null,'[]'::jsonb,0),
  ('9da1d721-e881-50e5-8cb3-ccac6bf4e06f','mega','Seasonal pallet','طبلية موسمية','Seasonal SKUs consolidated per pallet.','أصناف موسمية مجمّعة لكل طبلية.','Pallets','طبليات','#8a5a3a',null,'{seasonal}',true,'ae',null,null,null,null,null,null,'[]'::jsonb,1),
  ('a0206edd-ffa8-51f9-8097-7cecc3e8f1fd','mega','Bulk couverture (ton)','كوفرتور خام بالطن','Industrial couverture by the metric ton.','كوفرتور صناعي بالطن المتري.','Raw by ton','خام بالطن','#2e1a10',null,'{}',true,null,null,null,null,null,null,null,'[]'::jsonb,2)
on conflict (id) do nothing;

insert into public.store_variants
  (id, product_id, position, net_weight_g, packaging, case_qty,
   retail_price_minor, b2b_price_minor, in_stock, requires_cold_chain)
values
  ('8cbf2121-4205-56e9-86ae-b4b4eee9e4a1','081a7865-3a9e-5caf-8f13-453bae3e68ae',0,90,'standard',null,4400,3100,true,true),
  ('4001d57f-3b0a-5f7c-8306-24018d9bd853','1c091a06-eaa9-55e0-8f6c-6f0f6371d4a6',0,90,'standard',null,4000,2800,true,true),
  ('74a38971-34b2-59f5-8f8d-52d1ede7fd73','36b18b75-6d31-569d-8ec9-a7d1d376572e',0,90,'standard',null,3800,2700,true,true),
  ('0c01b1d3-c00e-5682-82ed-33fdcf13f72b','f2d136fb-2e0e-5916-8b1d-addb3c1b0f82',0,90,'standard',null,4800,3400,true,true),
  ('46f2dd39-d41d-5e77-8669-0b9929ad16ac','25028f80-8537-51c2-8067-b641dd3d51a8',0,90,'standard',null,4800,3400,true,true),
  ('2cd37455-36f2-501a-83f9-52b221ee73b1','1c7e69ec-2682-580c-8493-33a011d51c4b',0,90,'standard',null,4600,3200,true,true),
  ('bad8cd0b-c5ed-576e-817e-734b7e13d66c','d17d2ea3-190f-5f9f-8502-ddd437cf22cc',0,90,'standard',null,4400,3100,true,true),
  ('4cd9128b-2209-51c0-84c9-8c8935d84e28','f33de943-47b2-5c60-8451-3c862a4a1165',0,90,'standard',null,4600,3200,true,true),
  ('e84172d4-42a8-535a-8e4f-21c21771e7cf','87b4f4ec-c3e2-5be2-806f-c911f2a39d50',0,90,'standard',null,4800,3400,true,true),
  ('ffdf09ab-8b86-5046-8fdd-eb7b04d40b48','8c807608-5e12-5823-8ee2-f567129490df',0,90,'standard',null,4400,3100,true,true),
  ('53cd93f9-d82a-5103-86b8-13eb92b7ccde','f75313b2-e5f5-55ff-8bf0-1a5329c51e68',0,90,'standard',null,4400,3100,true,true),
  ('8ff7bc93-6831-5ebe-88af-727a527b2111','ef5aeebf-aa37-57fd-8363-9a3e96c773da',0,90,'standard',null,4200,2900,true,true),
  ('39c5b470-174d-5221-83b8-539762130f25','1da78686-2262-59d2-83b2-aa7711c1fe4b',0,220,'gift',null,16800,11800,true,true),
  ('1c2bef4c-fb04-57d5-8cec-0bd20ac8dfac','eb58ac5a-5800-5218-8bd3-1d7831e27748',0,260,'gift',null,31000,21700,true,true),
  ('aa8af8bc-4725-585a-863e-671a7302b8fa','30279c74-b5ea-5cab-804b-6cb690485321',0,300,'gift',null,22000,15400,true,true),
  ('d06a84ee-4dc7-5fe9-8723-3343354c3aea','07ce0340-312c-5706-8468-7e34264abe7e',0,40,'standard',null,3800,2700,true,true),
  ('28f39822-b574-51bb-87f2-cdd5402b4cc2','07ce0340-312c-5706-8468-7e34264abe7e',1,40,'bulk_case',48,168000,117600,true,true),
  ('500e8323-3b3f-522a-8199-c4229b8bddce','624e3726-f791-5e89-8d0f-f8a3b118ab3a',0,2500,'bulk_case',null,21000,14700,true,false),
  ('a457d066-4302-51f4-8079-009b0d43941a','d7b91f4e-6fac-5b5e-8603-b25ff0a8f2ed',0,500,'gift',null,30300,21200,true,true),
  ('e9a50f0e-f7ba-5cb5-8b4d-2fd97ca5032c','ae55f4c3-0f63-5a14-850b-cb34d2a344c2',0,1200,'gift',null,26700,18700,true,true),
  ('99bfdca5-9a03-53b4-8e43-5d4b4d7e7080','8fcd7345-a004-5834-875d-f07c00ac342f',0,480000,'bulk_case',1800,1100000,770000,true,true),
  ('1b84d67f-ee1d-52d1-8830-03a122c2402a','9da1d721-e881-50e5-8cb3-ccac6bf4e06f',0,520000,'bulk_case',1600,1400000,980000,true,true),
  ('6900fb93-662a-5d37-8e91-f04351db4405','a0206edd-ffa8-51f9-8097-7cecc3e8f1fd',0,1000000,'bulk_case',1,21600000,15120000,true,false)
on conflict (id) do nothing;
