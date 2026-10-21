-- Sample inventory and catalog. NOT real Enjoy Life commercial information.
INSERT INTO categories (id,slug,name) VALUES
('10000000-0000-4000-8000-000000000001','ao','Áo'),
('10000000-0000-4000-8000-000000000002','quan','Quần'),
('10000000-0000-4000-8000-000000000003','outerwear','Áo khoác');
INSERT INTO products (id,category_id,slug,name,description,image_url,collection_name,published) VALUES
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','everyday-oxford','Sơ mi hằng ngày','Áo sơ mi phom thoải mái, phù hợp với nhiều cách phối đồ. Sản phẩm mẫu dùng cho quá trình phát triển.','https://images.unsplash.com/photo-1598032895397-b9472444bf93?w=1000&q=85','Phối đồ mỗi ngày',true),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','relaxed-trouser','Quần suông thoải mái','Quần suông phom thẳng, dễ kết hợp trong tủ đồ hằng ngày. Sản phẩm mẫu.','https://images.unsplash.com/photo-1517438476312-10d79c077509?w=1000&q=85','Nét tối giản',true),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','weekend-knit','Áo len cuối tuần','Áo len mềm nhẹ, kiểu dáng tối giản. Sản phẩm mẫu.','https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1000&q=85','Nét tối giản',true),
('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000003','city-layer','Áo khoác phố thị','Áo khoác nhẹ có cấu trúc, dành cho những ngày di chuyển. Sản phẩm mẫu.','https://images.unsplash.com/photo-1544923246-77307dd654cb?w=1000&q=85','Câu chuyện phố thị',true);
INSERT INTO product_variants (id,product_id,sku,color,size,price_vnd) VALUES
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','EL-OXF-IV-M','Ngà','M',329000),
('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','EL-OXF-IV-L','Ngà','L',329000),
('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','EL-OXF-BK-M','Đen','M',329000),
('30000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000002','EL-TR-BE-M','Be','M',399000),
('30000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000002','EL-TR-BE-L','Be','L',399000),
('30000000-0000-4000-8000-000000000006','20000000-0000-4000-8000-000000000003','EL-KN-BR-M','Nâu','M',359000),
('30000000-0000-4000-8000-000000000007','20000000-0000-4000-8000-000000000003','EL-KN-BR-L','Nâu','L',359000),
('30000000-0000-4000-8000-000000000008','20000000-0000-4000-8000-000000000004','EL-JK-BK-M','Đen','M',549000),
('30000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000004','EL-JK-BK-L','Đen','L',549000);
INSERT INTO inventory(variant_id,on_hand,reserved,unavailable)
SELECT id, CASE WHEN sku='EL-OXF-BK-M' THEN 0 ELSE 16 END,0,0 FROM product_variants;
