import { execSync } from 'child_process';

const API_BASE = 'http://localhost:8081/api/v1';

const products = [
  {
    name: 'Quần ống rộng xếp ly thanh lịch',
    slug: 'quan-ong-rong-xep-ly',
    description: 'Quần tây ống rộng xếp ly phong cách Hàn Quốc, chất vải mềm rũ tôn dáng thanh lịch.',
    image_url: '1792588575441_7703059347836215187_g8805501598271789638_38021d646ed097ed69d3204014263939.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'quan',
    sku: '',
    color: 'Be',
    size: 'M',
    price_vnd: 359000,
    opening_stock: 20
  },
  {
    name: 'Quần jeans ống rộng đen cạp cao',
    slug: 'quan-jeans-ong-rong-den',
    description: 'Quần jeans nữ ống rộng màu đen wash nhẹ, chất denim co giãn nhẹ thoải mái suốt ngày dài.',
    image_url: '1792588575518_7703059347836215187_g8805501598271789638_40d5bf1636881d8d238326f67485c8d5.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'quan',
    sku: '',
    color: 'Đen',
    size: 'M',
    price_vnd: 389000,
    opening_stock: 20
  },
  {
    name: 'Quần vải suông lưng thun nâu',
    slug: 'quan-vai-suong-lung-thun-nau',
    description: 'Quần suông chất liệu đũi lụa mềm mát, lưng thun co giãn dễ phối đồ đi làm và dạo phố.',
    image_url: '1792588575600_7703059347836215187_g8805501598271789638_82cf8d7b694c89f1c0f9508dbbd67688.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'quan',
    sku: '',
    color: 'Nâu',
    size: 'M',
    price_vnd: 339000,
    opening_stock: 25
  },
  {
    name: 'Giày cao gót mũi nhọn da lộn',
    slug: 'giay-cao-got-mui-nhon-da-lon',
    description: 'Giày cao gót 7cm da lộn sang trọng, thiết kế mũi nhọn thanh thoát ôm chân cực êm.',
    image_url: '1792588575679_7703059347836215187_g8805501598271789638_695c7330c87332f78141696375c17092.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'giay-dep',
    sku: '',
    color: 'Đen',
    size: '37',
    price_vnd: 489000,
    opening_stock: 15
  },
  {
    name: 'Giày sneaker canvas cổ thấp xám',
    slug: 'giay-sneaker-canvas-co-thap',
    description: 'Giày thể thao vải canvas trẻ trung, đế cao su chống trượt bền bỉ, phong cách năng động.',
    image_url: '1792588575763_7703059347836215187_g8805501598271789638_bb9b11bf536a8d0f0fa859d5d8a0b96d.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'giay-dep',
    sku: '',
    color: 'Xám',
    size: '38',
    price_vnd: 329000,
    opening_stock: 25
  },
  {
    name: 'Sandal đế xuồng quai chéo đan cói',
    slug: 'sandal-de-xuong-quai-cheo',
    description: 'Sandal đế xuồng cao 5cm bọc cói phong cách du lịch, quai da mềm mại không gây đau chân.',
    image_url: '1792588575845_7703059347836215187_g8805501598271789638_a4d44256e70d856f0bb1030857029d5e.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'giay-dep',
    sku: '',
    color: 'Trắng',
    size: '37',
    price_vnd: 359000,
    opening_stock: 20
  },
  {
    name: 'Túi hobo da mềm ELLY nâu',
    slug: 'tui-hobo-da-mem-elly',
    description: 'Túi xách dáng hobo da tổng hợp cao cấp mềm mịn, ngăn chứa rộng rãi tiện lợi đựng vừa sổ tay.',
    image_url: '1792588575924_7703059347836215187_g8805501598271789638_c07a1868431b2dfabd9d5a35d883a6c6.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'tui-xach',
    sku: '',
    color: 'Nâu',
    size: 'Freesize',
    price_vnd: 459000,
    opening_stock: 15
  },
  {
    name: 'Túi đeo chéo da chần trám nắp gập',
    slug: 'tui-deo-cheo-chan-tram-trang',
    description: 'Túi đeo chéo nắp gập họa tiết chần trám sang chảnh, dây xích phối da mạ vàng ánh kim lấp lánh.',
    image_url: '1792588576003_7703059347836215187_g8805501598271789638_a9a345ddf5bd4b8a2857966eabf947a8.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'tui-xach',
    sku: '',
    color: 'Trắng kem',
    size: 'Freesize',
    price_vnd: 399000,
    opening_stock: 18
  },
  {
    name: 'Guốc nơ gót vuông tiểu thư',
    slug: 'guoc-no-got-vuong-tieu-thu',
    description: 'Dép guốc nữ gót vuông 5cm đính nơ nữ tính, chất da bóng nhẹ phối viền tinh tế.',
    image_url: '1792588576083_7703059347836215187_g8805501598271789638_c13a609656c27846852b4147e5e436fe.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'giay-dep',
    sku: '',
    color: 'Be hồng',
    size: '37',
    price_vnd: 379000,
    opening_stock: 16
  },
  {
    name: 'Dép quai ngang da lộn chữ H',
    slug: 'dep-quai-ngang-da-lon-h',
    description: 'Dép bệt quai ngang cách điệu chữ H da lộn thời thượng, đệm chân êm ái thoáng mát mùa hè.',
    image_url: '1792588576234_7703059347836215187_g8805501598271789638_2e4b01ba0087d30b599f627b1165acd3.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'giay-dep',
    sku: '',
    color: 'Nâu vàng',
    size: '37',
    price_vnd: 299000,
    opening_stock: 22
  },
  {
    name: 'Dép quai ngang da nâu basic',
    slug: 'dep-quai-ngang-da-nau-basic',
    description: 'Dép da quai bản ngang tối giản, đế cao su chống trượt linh hoạt dễ mang hằng ngày.',
    image_url: '1792588576413_7703059347836215187_g8805501598271789638_e05d3100f2940a5793d9b7ccfdf7f83b.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'giay-dep',
    sku: '',
    color: 'Nâu',
    size: '37',
    price_vnd: 289000,
    opening_stock: 20
  },
  {
    name: 'Vòng tay thiên nga bạc ý đính đá',
    slug: 'vong-tay-thien-nga-bac-y',
    description: 'Lắc tay bạc ý 925 mặt thiên nga nạm pha lê sáng bóng, thiết kế thanh mảnh kiêu sa.',
    image_url: '1792588576504_7703059347836215187_g8805501598271789638_6533d600d2a64e3bcb2bd076428afd1c.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'trang-suc',
    sku: '',
    color: 'Bạc',
    size: 'Freesize',
    price_vnd: 289000,
    opening_stock: 25
  },
  {
    name: 'Vòng tay thiên nga mạ vàng hồng',
    slug: 'vong-tay-thien-nga-vang-hong',
    description: 'Vòng tay thiên nga mạ vàng hồng 18K sang trọng, đá chủ pha lê lấp lánh cuốn hút.',
    image_url: '1792588576586_7703059347836215187_g8805501598271789638_0792620c9f3ea8a7aa3ac35c5843c027.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'trang-suc',
    sku: '',
    color: 'Vàng hồng',
    size: 'Freesize',
    price_vnd: 309000,
    opening_stock: 25
  },
  {
    name: 'Set trang sức hoa tuyết đá xanh',
    slug: 'set-trang-suc-hoa-tuyet-xanh',
    description: 'Bộ trang sức bạc hoa tuyết đính đá sapphire xanh pastel gồm dây chuyền, bông tai và lắc tay.',
    image_url: '1792588576665_7703059347836215187_g8805501598271789638_1d3ec4eb1b066cf7c6b0494d18cdca4c.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'trang-suc',
    sku: '',
    color: 'Bạc',
    size: 'Freesize',
    price_vnd: 489000,
    opening_stock: 12
  },
  {
    name: 'Bộ trang sức hoa tuyết kim cương nhân tạo',
    slug: 'bo-trang-suc-hoa-tuyet-kim-cuong',
    description: 'Bộ trang sức hoa tuyết bạc cao cấp đính đá CZ lấp lánh gồm dây chuyền, nhẫn và khuyên tai nụ.',
    image_url: '1792588576753_7703059347836215187_g8805501598271789638_d2d8d293777a7049bacf7522f265c6e8.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'trang-suc',
    sku: '',
    color: 'Bạc',
    size: 'Freesize',
    price_vnd: 469000,
    opening_stock: 14
  },
  {
    name: 'Dây chuyền nơ bạc đính đá hồng',
    slug: 'day-chuyen-no-bac-da-hong',
    description: 'Dây chuyền bạc 925 tạo hình nơ điệu đà đính charm đá thạch anh hồng hình trái tim ngọt ngào.',
    image_url: '1792588576830_7703059347836215187_g8805501598271789638_37779f6f33ca6d7f5a26df223941f859.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'trang-suc',
    sku: '',
    color: 'Bạc',
    size: 'Freesize',
    price_vnd: 269000,
    opening_stock: 28
  },
  {
    name: 'Nón cói vành rộng phối dây da',
    slug: 'non-coi-vanh-rong-day-da',
    description: 'Mũ cói rộng vành đan tay cao cấp, điểm nhấn dây da mỏng chống nắng và chụp ảnh biển cực đẹp.',
    image_url: '1792588576907_7703059347836215187_g8805501598271789638_b415afadd2d2556f0ffc0599224521d0.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'mu-non',
    sku: '',
    color: 'Be tự nhiên',
    size: 'Freesize',
    price_vnd: 249000,
    opening_stock: 20
  },
  {
    name: 'Mũ dạ lưỡi trai mềm phong cách Retro',
    slug: 'mu-da-luoi-trai-mem-retro',
    description: 'Nón lưỡi trai chất nỉ dạ cao cấp mềm mại, form chuẩn phong cách vintage ấm áp mùa thu đông.',
    image_url: '1792588576988_7703059347836215187_g8805501598271789638_57c819aadf12158cf77398725293319c.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'mu-non',
    sku: '',
    color: 'Be',
    size: 'Freesize',
    price_vnd: 219000,
    opening_stock: 25
  },
  {
    name: 'Nón lưỡi trai vải canvas thêu chữ',
    slug: 'non-luoi-trai-canvas-theu-chu',
    description: 'Mũ lưỡi trai canvas dày dặn thoáng khí, khóa cài kim loại điều chỉnh vòng đầu tiện lợi.',
    image_url: '1792588577065_7703059347836215187_g8805501598271789638_747b2c36001371e1337c2d17e818b205.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'mu-non',
    sku: '',
    color: 'Be',
    size: 'Freesize',
    price_vnd: 189000,
    opening_stock: 30
  },
  {
    name: 'Khăn choàng cashmere tua rua giữ ấm',
    slug: 'khan-choang-cashmere-tua-rua',
    description: 'Khăn choàng dạ len cashmere mềm êm không xù lông, viền tua rua cổ điển thanh lịch.',
    image_url: '1792588577141_7703059347836215187_g8805501598271789638_c1adfcbbacfc79ae7890b2a83aa93ea6.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'khan-choang',
    sku: '',
    color: 'Be camel',
    size: 'Freesize',
    price_vnd: 349000,
    opening_stock: 18
  },
  {
    name: 'Khăn lụa vuông monogram cổ điển',
    slug: 'khan-lua-vuong-monogram',
    description: 'Khăn lụa tơ tằm nhân tạo kích thước 70x70cm họa tiết monogram quý phái, dùng quàng cổ hoặc quấn túi.',
    image_url: '1792588577215_7703059347836215187_g8805501598271789638_e3cdea5c46a71243f325a740a1ac234d.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'khan-choang',
    sku: '',
    color: 'Đen trắng',
    size: 'Freesize',
    price_vnd: 299000,
    opening_stock: 25
  },
  {
    name: 'Khăn choàng hoa len dệt nổi họa tiết',
    slug: 'khan-choang-hoa-len-det-noi',
    description: 'Khăn choàng len dệt jacquard hoa văn nổi tinh xảo, phối màu vàng kem ấm áp thời thượng.',
    image_url: '1792588577293_7703059347836215187_g8805501598271789638_6c4dee092290c59e3260b5f2fff4dfac.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'khan-choang',
    sku: '',
    color: 'Vàng kem',
    size: 'Freesize',
    price_vnd: 389000,
    opening_stock: 15
  },
  {
    name: 'Áo thun waffle dệt nổi ngôi sao',
    slug: 'ao-thun-waffle-det-noi-sao',
    description: 'Áo thun tay ngắn chất dệt tổ ong waffle thông thoáng khí, họa tiết ngôi sao cá tính độc đáo.',
    image_url: '1792588624280_1967435891473892664_g8805501598271789638_b7ad7b2b3c35d3c6fc292670fb9b1cf0.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'ao',
    sku: '',
    color: 'Trắng',
    size: 'M',
    price_vnd: 279000,
    opening_stock: 25
  },
  {
    name: 'Set pyjama mặc nhà Hello Baby hồng',
    slug: 'set-pyjama-hello-baby-hong',
    description: 'Bộ đồ ngủ pijama lụa satin mềm mịn in họa tiết gấu dễ thương, form rộng rãi thoải mái khi ngủ.',
    image_url: '1792588624295_1967435891473892664_g8805501598271789638_b74f260cef79cf33184b51ff48d1e929.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'ao',
    sku: '',
    color: 'Hồng',
    size: 'M',
    price_vnd: 299000,
    opening_stock: 20
  },
  {
    name: 'Set đồ thể thao nỉ thêu chữ Marvellous',
    slug: 'set-the-thao-theu-chu-marvellous',
    description: 'Set áo thun form rộng kèm quần short nỉ da cá thêu chữ nổi, phong cách sporty trẻ trung.',
    image_url: '1792588624308_1967435891473892664_g8805501598271789638_66718c953f637d6f2cbf40e76dfbf421.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'ao',
    sku: '',
    color: 'Xám nhạt',
    size: 'M',
    price_vnd: 389000,
    opening_stock: 20
  },
  {
    name: 'Áo thun trắng Snoopy Eternal Youth',
    slug: 'ao-thun-snoopy-eternal-youth',
    description: 'Áo thun cotton 100% in hình chú chó Snoopy mặt trước và truyện tranh vintage mặt sau.',
    image_url: '1792588624319_1967435891473892664_g8805501598271789638_4bd94e39417ebb4287895c8a6161fb15.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'ao',
    sku: '',
    color: 'Trắng',
    size: 'M',
    price_vnd: 269000,
    opening_stock: 25
  },
  {
    name: 'Quần jeans suông rộng cạp cao ống dài',
    slug: 'quan-jeans-suong-rong-cap-cao',
    description: 'Quần jeans cạp cao che khuyết điểm đùi to, form ống suông rộng rãi chuẩn xu hướng streetwear.',
    image_url: '1792588624326_1967435891473892664_g8805501598271789638_a349fd9da2892190c36e010c880e3d9a.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'quan',
    sku: '',
    color: 'Xám khói',
    size: 'M',
    price_vnd: 399000,
    opening_stock: 22
  },
  {
    name: 'Áo thun hồng cánh sen Vintage Drink',
    slug: 'ao-thun-hong-vintage-drink',
    description: 'Áo phông nữ màu hồng fuchsia nổi bật, in hình ly cafe vintage cá tính chất vải thun co giãn 4 chiều.',
    image_url: '1792588624335_1967435891473892664_g8805501598271789638_57cbe86f677e50ae07a3a217efcfa154.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'ao',
    sku: '',
    color: 'Hồng đậm',
    size: 'M',
    price_vnd: 249000,
    opening_stock: 25
  },
  {
    name: 'Túi xách kẹp nách chần ô pastel',
    slug: 'tui-xach-kep-nach-pastel',
    description: 'Túi kẹp nách nữ màu tím pastel ngọt ngào, chất da chần ô phồng mềm mại kèm quai đeo xích.',
    image_url: '1792588624342_1967435891473892664_g8805501598271789638_52b4f4dab8e67bd81c670956ee90a338.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'tui-xach',
    sku: '',
    color: 'Tím pastel',
    size: 'Freesize',
    price_vnd: 369000,
    opening_stock: 16
  },
  {
    name: 'Túi xách tay nữ phối màu vintage',
    slug: 'tui-xach-tay-phoi-mau-vintage',
    description: 'Túi xách dáng công sở thanh lịch, phối hai tông màu nâu da bò và kem sang trọng kèm quai đeo chéo.',
    image_url: '1792588624347_1967435891473892664_g8805501598271789638_96e72c545c8e0df12b333597d7962c99.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'tui-xach',
    sku: '',
    color: 'Nâu phối kem',
    size: 'Freesize',
    price_vnd: 429000,
    opening_stock: 14
  },
  {
    name: 'Túi bucket rút dây quai xích da hồng',
    slug: 'tui-bucket-rut-day-quai-xich',
    description: 'Túi dáng xô bucket nhỏ xinh miệng rút dây, da lì chống trầy xước phối dây xích cá tính.',
    image_url: '1792588624352_1967435891473892664_g8805501598271789638_a269d23355992b0df463343c0491b5db.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'tui-xach',
    sku: '',
    color: 'Hồng phấn',
    size: 'Freesize',
    price_vnd: 349000,
    opening_stock: 18
  },
  {
    name: 'Dép sandal đôi hai quai khóa kim loại',
    slug: 'dep-sandal-hai-quai-khoa',
    description: 'Dép sandal đế đúc 2 quai ngang khóa gài phong cách unisex, đệm chân nâng đỡ vòm chân chống mỏi.',
    image_url: '1792588624357_1967435891473892664_g8805501598271789638_3228e74d129c982be377a0678dbb2d24.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'giay-dep',
    sku: '',
    color: 'Be',
    size: '37',
    price_vnd: 319000,
    opening_stock: 22
  },
  {
    name: 'Đầm ren trắng xếp tầng thắt nơ lưng',
    slug: 'dam-ren-trang-xep-tang-tieu-thu',
    description: 'Đầm tiểu thư chất liệu ren hoa cao cấp 2 lớp, thân váy may xếp bèo tầng bồng bềnh nữ tính.',
    image_url: '1792588624361_1967435891473892664_g8805501598271789638_355573c53d65c39136e08a5fac85affd.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'vay-dam',
    sku: '',
    color: 'Trắng',
    size: 'M',
    price_vnd: 469000,
    opening_stock: 15
  },
  {
    name: 'Áo sơ mi voan trắng nơ cổ tay lỡ',
    slug: 'ao-so-mi-voan-no-co',
    description: 'Áo sơ mi voan lụa công sở cao cấp, thắt nơ cổ duyên dáng tay lửng bồng nhẹ che bắp tay khéo léo.',
    image_url: '1792588624366_1967435891473892664_g8805501598271789638_41ae576b9bb6c383a6aa971535aec0d4.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'ao',
    sku: '',
    color: 'Trắng',
    size: 'M',
    price_vnd: 329000,
    opening_stock: 22
  },
  {
    name: 'Áo thun cổ tim thêu chữ Creative navy',
    slug: 'ao-thun-co-tim-creative-navy',
    description: 'Áo thun cổ chữ V tôn xương quai xanh, thêu chữ Creative tinh tế trên ngực áo màu xanh navy tôn da.',
    image_url: '1792588660780_7703059347836215187_g8805501598271789638_c02ffc84409bb194a4148229cb6c0817.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'ao',
    sku: '',
    color: 'Xanh navy',
    size: 'M',
    price_vnd: 259000,
    opening_stock: 25
  },
  {
    name: 'Quần jeans ống suông rách gấu tua rua',
    slug: 'quan-jeans-suong-rach-gau',
    description: 'Quần bò ống suông dài cắt gấu tua rua bụi bặm, form rộng hack dáng kéo dài chân hiệu quả.',
    image_url: '1792588660785_7703059347836215187_g8805501598271789638_b48fe46f8503a616bb26b9257137e3ed.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'quan',
    sku: '',
    color: 'Xanh denim',
    size: 'M',
    price_vnd: 389000,
    opening_stock: 20
  },
  {
    name: 'Đầm maxi trắng dáng xòe chiết eo',
    slug: 'dam-maxi-trang-dang-xoe',
    description: 'Đầm maxi trắng tinh khôi sát nách cổ chữ V, tùng váy xếp ly xòe dài sang trọng đi biển hoặc dự tiệc.',
    image_url: '1792588660789_7703059347836215187_g8805501598271789638_b7fdab4e359f9f07d7558fd3c8a2d94c.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'vay-dam',
    sku: '',
    color: 'Trắng',
    size: 'M',
    price_vnd: 479000,
    opening_stock: 15
  },
  {
    name: 'Áo khoác gió cổ đứng cản nước chống gió',
    slug: 'ao-khoac-gio-co-dung-chong-gio',
    description: 'Áo khoác dù 2 lớp chống thấm nước nhẹ, cổ đứng cao cản gió kèm khóa kéo trơn tru tiện dụng.',
    image_url: '1792588660797_7703059347836215187_g8805501598271789638_ffc28dcf970d4b02338fba0c80554888.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'outerwear',
    sku: '',
    color: 'Trắng ngà',
    size: 'M',
    price_vnd: 439000,
    opening_stock: 18
  },
  {
    name: 'Quần jeans wide leg xanh nhạt vintage',
    slug: 'quan-jeans-wide-leg-xanh-nhat',
    description: 'Quần bò ống thụng màu xanh sáng wash retro, cạp cao ôm eo tôn vòng ba tự nhiên.',
    image_url: '1792588660802_7703059347836215187_g8805501598271789638_4b200fa7ae8068c07d904e82754bcc1d.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'quan',
    sku: '',
    color: 'Xanh nhạt',
    size: 'M',
    price_vnd: 399000,
    opening_stock: 20
  },
  {
    name: 'Quần jeans barrel fit xanh đậm ống vòm',
    slug: 'quan-jeans-barrel-fit-xanh-dam',
    description: 'Quần jean form barrel cong nhẹ độc đáo sành điệu, chất denim đứng form giữ dáng sau nhiều lần giặt.',
    image_url: '1792588660808_7703059347836215187_g8805501598271789638_7d859e403a35d14a644e6ba357e021e5.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'quan',
    sku: '',
    color: 'Xanh đậm',
    size: 'M',
    price_vnd: 419000,
    opening_stock: 20
  },
  {
    name: 'Quần jeans suông medium wash cạp cao',
    slug: 'quan-jeans-suong-medium-wash',
    description: 'Quần jeans nữ màu xanh cơ bản dễ phối, ống suông che khuyết điểm chân cong hoàn hảo.',
    image_url: '1792588660814_7703059347836215187_g8805501598271789638_9483665227425126c4dc318f59f26a79.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'quan',
    sku: '',
    color: 'Xanh vừa',
    size: 'M',
    price_vnd: 399000,
    opening_stock: 20
  },
  {
    name: 'Áo khoác dù có mũ mỏng nhẹ thể thao',
    slug: 'ao-khoac-du-co-mu-mong-nhe',
    description: 'Áo khoác gió siêu nhẹ gấp gọn tiện lợi, có mũ trùm đầu và túi khóa hai bên chống gió bụi đi nắng.',
    image_url: '1792588660819_7703059347836215187_g8805501598271789638_12b6e89e767146f8cda18be3aa786e0f.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'outerwear',
    sku: '',
    color: 'Kem nhạt',
    size: 'M',
    price_vnd: 429000,
    opening_stock: 18
  },
  {
    name: 'Áo khoác lông cừu hoodie tai thỏ xinh xắn',
    slug: 'ao-khoac-long-cuu-tai-tho',
    description: 'Áo khoác lông cừu nhân tạo siêu dày ấm, mũ gắn tai thỏ đáng yêu form oversize dễ thương.',
    image_url: '1792588660826_7703059347836215187_g8805501598271789638_5cef81719752256752724d04117e9eb3.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'outerwear',
    sku: '',
    color: 'Be ấm',
    size: 'M',
    price_vnd: 459000,
    opening_stock: 16
  },
  {
    name: 'Áo khoác nỉ thể thao cổ trụ kéo khóa',
    slug: 'ao-khoac-ni-the-thao-co-tru',
    description: 'Áo khoác nỉ cotton phối bo thun cổ tay và gấu áo, phong cách athleisure năng động và ấm áp.',
    image_url: '1792588660831_7703059347836215187_g8805501598271789638_4a444dd08d70e10c042df26696429c65.jpg',
    collection: 'Bộ sưu tập mới',
    category: 'outerwear',
    sku: '',
    color: 'Trắng sữa',
    size: 'M',
    price_vnd: 469000,
    opening_stock: 16
  }
];

async function main() {
  console.log('=== BẮT ĐẦU NHẬP LIỆU SẢN PHẨM ENJOY LIFE ===\n');

  // 1. Dev Admin Login
  console.log('1. Đang đăng nhập tài khoản Quản trị viên...');
  const loginRes = await fetch(`${API_BASE}/auth/admin-demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' })
  });
  if (!loginRes.ok) {
    throw new Error(`Đăng nhập thất bại: ${loginRes.status}`);
  }
  const cookie = loginRes.headers.get('set-cookie');
  console.log('-> Đăng nhập thành công!\n');

  // 2. Call adminImportProducts API
  console.log(`2. Đang gửi ${products.length} sản phẩm tới API /admin/products/import...`);
  const importRes = await fetch(`${API_BASE}/admin/products/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    },
    body: JSON.stringify({ rows: products })
  });

  const importResult = await importRes.json();
  if (!importRes.ok) {
    console.error('Lỗi import:', importResult);
    throw new Error(`Import failed with status ${importRes.status}`);
  }
  console.log('-> Import thành công:', importResult, '\n');

  // 3. Publish all imported products
  console.log('3. Đang công khai (Publish = true) toàn bộ sản phẩm...');
  try {
    const updateSql = 'UPDATE products SET published = true WHERE published = false;';
    execSync(`docker exec enjoy-life-db-1 psql -U enjoylife -d enjoylife -c "${updateSql}"`, { stdio: 'inherit' });
    console.log('-> Đã công khai tất cả sản phẩm thành công qua Database!\n');
  } catch (err) {
    console.error('Lỗi khi publish qua SQL:', err);
  }

  // 4. Verify catalog
  console.log('4. Kiểm tra danh mục sản phẩm công khai trên Storefront...');
  const catRes = await fetch(`${API_BASE}/products?limit=100`);
  const catData = await catRes.json();
  const items = catData.items || [];
  console.log(`-> Storefront hiện có tổng cộng: ${items.length} sản phẩm đang mở bán!\n`);

  console.log('=== DANH SÁCH SẢN PHẨM ĐÃ CÔNG KHAI ===');
  console.table(items.map((it, idx) => ({
    STT: idx + 1,
    'Tên sản phẩm': it.name,
    'Danh mục': it.category_slug,
    'Giá bán (₫)': it.price_vnd?.toLocaleString('vi-VN'),
    'Tồn kho': it.available,
    'Ảnh': it.image_url ? it.image_url.slice(0, 25) + '...' : 'Không có'
  })));

  console.log('\n=== HOÀN TẤT NHẬP LIỆU THÀNH CÔNG! ===');
}

main().catch(err => {
  console.error('LỖI THỰC THI:', err);
  process.exit(1);
});
