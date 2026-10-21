// Sprint 1 editorial concepts only. These are NOT published articles.
// Replace this data source with the published-articles API in the CMS sprint.
export type JournalConcept = {
  id: string;
  category: string;
  title: string;
  summary: string;
  imageClass: string;
  alt: string;
};

export const journalConcepts: JournalConcept[] = [
  {
    id: "everyday-style",
    category: "PHONG CÁCH",
    title: "Mặc đẹp bắt đầu từ điều giản dị.",
    summary: "Khám phá những ý tưởng mặc đẹp dễ ứng dụng mỗi ngày.",
    imageClass: "journal-image-one",
    alt: "Chân dung thời trang đường phố đầy sắc màu",
  },
  {
    id: "wardrobe-essentials",
    category: "GÓC TỦ ĐỒ",
    title: "Chọn món đồ hợp với chính bạn.",
    summary: "Một vài góc nhìn về chất liệu, phom dáng và sự thoải mái.",
    imageClass: "journal-image-two",
    alt: "Trang phục được sắp xếp theo phong cách cá nhân",
  },
  {
    id: "life-in-style",
    category: "CẢM HỨNG",
    title: "Phong cách đi cùng nhịp sống.",
    summary: "Những câu chuyện và cảm hứng từ đời sống thường ngày.",
    imageClass: "journal-image-three",
    alt: "Trang phục thanh lịch trong không gian thành thị",
  },
];
