-- Việt hóa catalog mẫu cho cả cơ sở dữ liệu đã khởi tạo trước đó.
UPDATE categories SET name = 'Áo khoác' WHERE id = '10000000-0000-4000-8000-000000000003';

UPDATE products SET name = 'Sơ mi hằng ngày', description = 'Áo sơ mi phom thoải mái, phù hợp với nhiều cách phối đồ. Sản phẩm mẫu dùng cho quá trình phát triển.', collection_name = 'Phối đồ mỗi ngày' WHERE id = '20000000-0000-4000-8000-000000000001';
UPDATE products SET name = 'Quần suông thoải mái', description = 'Quần suông phom thẳng, dễ kết hợp trong tủ đồ hằng ngày. Sản phẩm mẫu.', collection_name = 'Nét tối giản' WHERE id = '20000000-0000-4000-8000-000000000002';
UPDATE products SET name = 'Áo len cuối tuần', description = 'Áo len mềm nhẹ, kiểu dáng tối giản. Sản phẩm mẫu.', collection_name = 'Nét tối giản' WHERE id = '20000000-0000-4000-8000-000000000003';
UPDATE products SET name = 'Áo khoác phố thị', description = 'Áo khoác nhẹ có cấu trúc, dành cho những ngày di chuyển. Sản phẩm mẫu.', collection_name = 'Câu chuyện phố thị' WHERE id = '20000000-0000-4000-8000-000000000004';

UPDATE product_variants SET color = 'Ngà' WHERE sku IN ('EL-OXF-IV-M', 'EL-OXF-IV-L');
UPDATE product_variants SET color = 'Đen' WHERE sku IN ('EL-OXF-BK-M', 'EL-JK-BK-M', 'EL-JK-BK-L');
UPDATE product_variants SET color = 'Be' WHERE sku IN ('EL-TR-BE-M', 'EL-TR-BE-L');
UPDATE product_variants SET color = 'Nâu' WHERE sku IN ('EL-KN-BR-M', 'EL-KN-BR-L');
