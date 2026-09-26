-- Variants and reviews for the seeded products. GENERATED — see the previous migration.

insert into public.product_variants
  (id, product_id, position, net_weight_g, packaging, case_qty,
   retail_price_minor, b2b_price_minor, in_stock, requires_cold_chain)
values
  ('v-milk-90','p-milk',0,90,'standard',null,4800,3360,true,true),
  ('v-milk-180','p-milk',1,180,'gift',null,8900,6230,true,true),
  ('v-milk-case','p-milk',2,90,'bulk_case',24,105600,73900,true,true),
  ('v-lav-90','p-lavender',0,90,'standard',null,5200,3640,true,true),
  ('v-lav-180','p-lavender',1,180,'gift',null,9600,6720,true,true),
  ('v-rose-90','p-rose',0,90,'gift',null,6500,4550,true,true),
  ('v-rose-180','p-rose',1,180,'gift',null,12000,8400,true,true),
  ('v-jas-90','p-jasmine',0,90,'gift',null,6200,4340,true,true),
  ('v-pap-90','p-papaya',0,90,'standard',null,5400,3780,true,true),
  ('v-man-90','p-mango',0,90,'standard',null,5600,3920,true,true),
  ('v-man-180','p-mango',1,180,'gift',null,10400,7280,false,true),
  ('v-cof-90','p-coffee',0,90,'standard',null,5800,4060,true,false),
  ('v-cof-case','p-coffee',1,90,'bulk_case',24,127200,89000,true,false),
  ('v-dark-90','p-dark',0,90,'standard',null,5600,3920,true,false),
  ('v-dark60-90','p-dark60',0,90,'standard',null,4000,2800,true,false),
  ('v-dark60-180','p-dark60',1,180,'gift',null,7400,5180,true,false),
  ('v-salt-90','p-seasalt',0,90,'standard',null,4400,3080,true,false),
  ('v-salt-180','p-seasalt',1,180,'gift',null,8200,5740,true,false),
  ('v-chili-90','p-chili',0,90,'standard',null,4600,3220,true,false),
  ('v-ban-90','p-banana',0,90,'standard',null,4200,2940,true,false),
  ('v-gift-orchard-250','p-gift-orchard',0,250,'gift',null,16500,11550,true,true),
  ('v-gift-mountain-250','p-gift-mountain',0,250,'gift',null,14500,10150,true,false),
  ('v-gift-library-500','p-gift-library',0,500,'gift',null,29500,20650,true,true)
on conflict (id) do nothing;

insert into public.product_reviews
  (product_id, author_en, author_ar, rating, body_en, body_ar, verified, review_date)
values
  ('p-milk','Lina A.','لينا أ.',5,'The most refined milk chocolate I have had in the Kingdom. Arrived perfectly cold.','أرقى شوكولاتة بالحليب جرّبتها في المملكة. وصلت باردة تمامًا.',true,'2026-05-20'),
  ('p-milk','Faisal R.','فيصل ر.',5,'Bought a case for the office. Everyone asked where it was from.','اشتريت كرتونًا للمكتب. سأل الجميع من أين هي.',true,'2026-04-11'),
  ('p-lavender','Maha S.','مها س.',5,'Elegant and calm. The lavender is a whisper, exactly right.','أنيقة وهادئة. الخزامى همسة، تمامًا كما يجب.',true,'2026-05-02'),
  ('p-rose','Noura K.','نورة ك.',5,'The art-card alone is worth framing. The chocolate is divine.','البطاقة الفنية وحدها تستحق التأطير. والشوكولاتة إلهية.',true,'2026-06-01'),
  ('p-jasmine','Abdullah M.','عبدالله م.',5,'It smells like home. I sent six to family abroad.','رائحتها كالبيت. أرسلت ستًا للعائلة في الخارج.',true,'2026-03-19'),
  ('p-mango','Hessa T.','حصة ت.',5,'Tastes like a Jazan summer. Please make it year-round!','مذاقها كصيف جازان. أرجوكم اجعلوها على مدار العام!',true,'2026-06-08'),
  ('p-coffee','Omar B.','عمر ب.',5,'As a coffee person, this is the one. Deep and real.','كعاشق قهوة، هذه هي. عميقة وأصيلة.',true,'2026-05-15'),
  ('p-gift-orchard','Reem A.','ريم أ.',5,'I sent one to my mother and kept one. The rose and the jasmine together are the whole point.','أرسلت واحدة لأمي واحتفظت بواحدة. الورد والفُل معًا هما بيت القصيد.',true,'2026-06-14'),
  ('p-gift-mountain','Saad Q.','سعد ق.',5,'The coffee and the sea salt in one box. I have bought it three times.','البن وملح البحر في علبة واحدة. اشتريتها ثلاث مرات.',true,'2026-05-29'),
  ('p-gift-library','Hind M.','هند م.',5,'Twelve flavors and twelve artworks. It is the only gift I take when I travel now.','اثنتا عشرة نكهة واثنتا عشرة لوحة. صارت الهدية الوحيدة التي أحملها في سفري.',true,'2026-06-02');
