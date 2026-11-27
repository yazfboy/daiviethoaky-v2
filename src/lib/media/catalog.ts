import type { CharacterId } from "@/lib/characters";
import type { ImageMedia, MediaRef, Topic } from "@/lib/media/types";

// KHO ẢNH TƯ LIỆU ĐÃ DUYỆT (Phase 3).
// Mọi ảnh lấy từ Wikimedia Commons, nhúng thẳng từ máy chủ Wikimedia (không tải về lưu lại).
// Quy tắc khi thêm ảnh:
// - Đối chiếu trang mô tả file trên Commons: tác giả (người tạo ảnh), giấy phép, ảnh là gì, ở đâu.
// - Mỗi ảnh thuộc đúng MỘT chủ đề; không dùng tư liệu của sự kiện này cho sự kiện khác (vd trận 938 và trận 1288).
// - Chú thích nói rõ ảnh chụp ngày nay / tượng, tranh đời sau / bản sao; dùng "được cho là" khi việc gán hiện vật
//   cho sự kiện chỉ là suy đoán; tránh tên đơn vị hành chính (nhiều tên đã đổi sau đợt sáp nhập năm 2025).
// - Giấy phép chỉ nhận PD, CC0, CC BY, CC BY-SA. Thêm xong chạy `npm test` (soát kho) và `npm run eval:director` (kiểm link).

/** Năm "hiện tại" của từng nhân vật (khớp hồ sơ nhân vật): chủ đề xảy ra sau năm này thì nhân vật không biết. */
export const PRESENT_YEAR: Record<CharacterId, number> = {
  "ngo-quyen": 939,
  "tran-hung-dao": 1300,
  "nguyen-trai": 1439,
  "quang-trung": 1791,
};

export const TOPICS: Topic[] = [
  // ── Ngô Quyền ──
  {
    id: "bach-dang-938",
    year: 938,
    characters: ["ngo-quyen", "tran-hung-dao", "nguyen-trai", "quang-trung"],
    title: "Trận Bạch Đằng năm Mậu Tuất (938): Ngô Quyền cắm cọc trên sông Bạch Đằng, phá thủy quân Nam Hán, giết Hoằng Tháo",
    when: "Hỏi về trận Bạch Đằng của Ngô Quyền đánh quân Nam Hán năm 938: cắm cọc, nhử giặc theo con nước, Hoằng Tháo, Lưu Cung.",
  },
  {
    id: "co-loa",
    year: 939,
    characters: ["ngo-quyen"],
    title: "Thành Cổ Loa, nơi Ngô Vương đóng đô năm 939",
    when: "Hỏi về Cổ Loa, kinh đô, chỗ ngài đóng đô, thành trì nơi ngài đang ở.",
  },
  {
    id: "duong-lam",
    year: 898,
    characters: ["ngo-quyen"],
    title: "Đường Lâm, quê của Ngô Quyền",
    when: "Hỏi ngài người ở đâu, quê quán, làng Đường Lâm.",
  },
  {
    id: "ngo-quyen-dung-mao",
    year: 939,
    characters: ["ngo-quyen"],
    title: "Dung mạo Ngô Quyền (chỉ có tượng thờ do người đời sau tạc)",
    when: "Hỏi ngài trông thế nào, dung mạo, hình dáng, có tượng hay tranh vẽ ngài không.",
  },

  // ── Trần Hưng Đạo ──
  {
    id: "bach-dang-1288",
    year: 1288,
    characters: ["tran-hung-dao", "nguyen-trai", "quang-trung"],
    title: "Trận Bạch Đằng năm Mậu Tý (1288): Hưng Đạo Vương cắm cọc phá thủy quân Nguyên, bắt sống Ô Mã Nhi",
    when: "Hỏi về trận Bạch Đằng đánh quân Nguyên năm 1288: bãi cọc nhà Trần, Ô Mã Nhi, Phàn Tiếp, thuyền giặc mắc cọc.",
  },
  {
    id: "kiep-bac",
    year: 1300,
    characters: ["tran-hung-dao", "nguyen-trai"],
    title: "Vạn Kiếp (Kiếp Bạc), nơi Hưng Đạo Vương lui về những năm cuối đời; đời sau dựng đền thờ ngài ở đây",
    when: "Hỏi về Vạn Kiếp, Kiếp Bạc, nơi Hưng Đạo Vương sống những năm cuối đời, đền thờ Hưng Đạo Vương.",
  },
  {
    id: "tran-hung-dao-dung-mao",
    year: 1300,
    characters: ["tran-hung-dao"],
    title: "Dung mạo Hưng Đạo Vương (chỉ có tranh thờ, tượng do người đời sau làm)",
    when: "Hỏi ngài trông thế nào, dung mạo, có chân dung hay tượng ngài không.",
  },

  // ── Nguyễn Trãi ──
  {
    id: "binh-ngo-dai-cao",
    year: 1428,
    characters: ["nguyen-trai", "quang-trung"],
    title: "Bình Ngô đại cáo (1428), bài cáo Nguyễn Trãi thay lời Lê Lợi bố cáo việc dẹp yên giặc Minh",
    when: "Hỏi về bài Bình Ngô đại cáo: viết khi nào, để làm gì, nội dung, câu văn trong bài cáo.",
  },
  {
    id: "le-loi-lam-kinh",
    year: 1433,
    characters: ["nguyen-trai", "quang-trung"],
    title: "Lê Lợi (vua Lê Thái Tổ), đất Lam Kinh và bia Vĩnh Lăng ghi công ông (văn bia do Nguyễn Trãi soạn)",
    when: "Hỏi về Lê Lợi, vua Lê Thái Tổ, đất Lam Sơn / Lam Kinh, lăng hoặc bia Vĩnh Lăng của vua.",
  },
  {
    id: "con-son",
    year: 1439,
    characters: ["nguyen-trai"],
    title: "Côn Sơn, nơi Nguyễn Trãi về ở ẩn",
    when: "Hỏi về Côn Sơn, nơi ông đang ở ẩn, cảnh núi, chùa, suối thông ở Côn Sơn.",
  },
  {
    id: "nguyen-trai-dung-mao",
    year: 1439,
    characters: ["nguyen-trai"],
    title: "Dung mạo Nguyễn Trãi (chỉ có tranh, tượng do người đời sau làm)",
    when: "Hỏi ông trông thế nào, dung mạo, có chân dung hay tượng ông không.",
  },
  {
    id: "nguyen-trai-tho-nom",
    year: 1439,
    characters: ["nguyen-trai"],
    title: "Thơ Nôm của Nguyễn Trãi (Quốc âm thi tập)",
    when: "Hỏi về thơ của ông, thơ Nôm, tập thơ quốc âm, chuyện làm thơ.",
  },

  // ── Quang Trung ──
  {
    id: "ngoc-hoi-dong-da",
    year: 1789,
    characters: ["quang-trung"],
    title: "Trận Ngọc Hồi – Đống Đa, Tết Kỷ Dậu (1789): đại phá quân Thanh, tiến vào Thăng Long",
    when: "Hỏi về trận đánh quân Thanh Tết Kỷ Dậu: Ngọc Hồi, Đống Đa, Khương Thượng, Hà Hồi, Sầm Nghi Đống, Tôn Sĩ Nghị, vào Thăng Long.",
  },
  {
    id: "rach-gam-xoai-mut",
    year: 1785,
    characters: ["quang-trung"],
    title: "Trận Rạch Gầm – Xoài Mút (đầu năm 1785) trên sông Tiền, phá quân Xiêm",
    when: "Hỏi về trận Rạch Gầm – Xoài Mút, đánh quân Xiêm trên sông Tiền.",
  },
  {
    id: "nui-ban",
    year: 1788,
    characters: ["quang-trung"],
    title: "Lên ngôi hoàng đế ở núi Bân (Phú Xuân) cuối năm 1788, đặt niên hiệu Quang Trung",
    when: "Hỏi về việc ngài lên ngôi, núi Bân, đặt niên hiệu.",
  },
  {
    id: "tay-son",
    year: 1771,
    characters: ["quang-trung"],
    title: "Đất Tây Sơn, quê nhà của ba anh em Tây Sơn",
    when: "Hỏi về quê ngài, ấp Tây Sơn, nhà cũ, ba anh em Tây Sơn thuở dấy binh.",
  },
  {
    id: "chieu-chu-nom",
    year: 1791,
    characters: ["quang-trung"],
    title: "Chiếu của vua Quang Trung về việc học và dịch sách chữ Hán ra chữ Nôm",
    when: "Hỏi về chữ Nôm, việc học, dịch sách, chiếu lập học, Sùng chính viện.",
  },
  {
    id: "quan-tay-son",
    year: 1789,
    characters: ["quang-trung"],
    title: "Binh khí quân Tây Sơn: súng thần công, trống trận",
    when: "Hỏi về vũ khí, binh khí, súng thần công, trống trận, thủy binh của quân Tây Sơn.",
  },
  {
    id: "quang-trung-dung-mao",
    year: 1791,
    characters: ["quang-trung"],
    title: "Dung mạo vua Quang Trung (chỉ có tượng do người đời sau dựng)",
    when: "Hỏi ngài trông thế nào, dung mạo, có chân dung hay tượng ngài không.",
  },
];

const C = "https://upload.wikimedia.org/wikipedia/commons/";
const P = "https://commons.wikimedia.org/wiki/File:";

/** Ảnh trong cùng một chủ đề xếp theo thứ tự ưu tiên hiện ra. */
export const IMAGES: ImageMedia[] = [
  // ── bach-dang-938 ──
  {
    id: "bd938-mo-hinh-btls",
    kind: "image",
    topic: "bach-dang-938",
    nature: "mo-hinh",
    caption:
      "Mô hình dựng lại trận Bạch Đằng năm 938, khi Ngô Quyền phá thủy quân Nam Hán; trưng bày ở Bảo tàng Lịch sử Quốc gia, Hà Nội.",
    author: "Daderot",
    license: "CC0",
    sourcePage: `${P}Model_of_Battle_in_Bach_Dang_River_in_938_AD_-_DSC05544.JPG`,
    original: `${C}d/da/Model_of_Battle_in_Bach_Dang_River_in_938_AD_-_DSC05544.JPG`,
    width: 5065,
    height: 3054,
  },
  {
    id: "bd938-tranh-dong-ho",
    kind: "image",
    topic: "bach-dang-938",
    nature: "tranh-doi-sau",
    caption:
      "Tranh khắc gỗ dân gian Đông Hồ vẽ Ngô Quyền phá quân Nam Hán trên sông Bạch Đằng năm 938; tranh do nghệ nhân đời sau làm, không rõ năm làm tranh.",
    author: "Nghệ nhân làng Đông Hồ (khuyết danh)",
    license: "PD",
    sourcePage: `${P}Ng%C3%B4_Quy%E1%BB%81n_%C4%91%E1%BA%A1i_ph%C3%A1_qu%C3%A2n_Nam_H%C3%A1n_tr%C3%AAn_s%C3%B4ng_B%E1%BA%A1ch_%C4%90%E1%BA%B1ng.jpg`,
    original: `${C}2/27/Ng%C3%B4_Quy%E1%BB%81n_%C4%91%E1%BA%A1i_ph%C3%A1_qu%C3%A2n_Nam_H%C3%A1n_tr%C3%AAn_s%C3%B4ng_B%E1%BA%A1ch_%C4%90%E1%BA%B1ng.jpg`,
    width: 2000,
    height: 1511,
  },
  {
    id: "bd938-coc-mo-phong",
    kind: "image",
    topic: "bach-dang-938",
    nature: "mo-hinh",
    caption: "Hàng cọc dựng mô phỏng ngày nay trên sông Bạch Đằng, tái hiện bãi cọc ngầm của trận năm 938.",
    author: "Goodmorninghpvn (Wikipedia tiếng Việt)",
    license: "PD",
    sourcePage: `${P}B%C3%A3i_c%E1%BB%8Dc_c%E1%BB%ADa_s%C3%B4ng_B%E1%BA%A1ch_%C4%90%E1%BA%B1ng.jpg`,
    original: `${C}0/01/B%C3%A3i_c%E1%BB%8Dc_c%E1%BB%ADa_s%C3%B4ng_B%E1%BA%A1ch_%C4%90%E1%BA%B1ng.jpg`,
    width: 960,
    height: 647,
  },

  // ── co-loa ──
  {
    id: "co-loa-luy-thanh",
    kind: "image",
    topic: "co-loa",
    nature: "anh-ngay-nay",
    caption:
      "Một đoạn lũy đất thành Cổ Loa (Hà Nội) ngày nay, trong mùa lễ hội. Thành có từ thời An Dương Vương; năm 939 Ngô Quyền chọn nơi đây làm kinh đô.",
    author: "Viethavvh (Wikipedia tiếng Việt)",
    license: "PD",
    sourcePage: `${P}Thanh_co_loa2.jpg`,
    original: `${C}9/9d/Thanh_co_loa2.jpg`,
    width: 800,
    height: 600,
  },

  // ── duong-lam ──
  {
    id: "duong-lam-cong-lang",
    kind: "image",
    topic: "duong-lam",
    nature: "anh-ngay-nay",
    caption: "Cổng vào làng cổ Đường Lâm (Hà Nội) ngày nay, đất quê của Ngô Quyền. Cổng làng là công trình của đời sau.",
    author: "Bùi Thụy Đào Nguyên",
    license: "CC BY-SA 3.0",
    sourcePage: `${P}C%E1%BB%95ng_v%C3%A0o_l%C3%A0ng_c%E1%BB%95_%C4%90%C6%B0%E1%BB%9Dng_L%C3%A2m.jpg`,
    original: `${C}8/8a/C%E1%BB%95ng_v%C3%A0o_l%C3%A0ng_c%E1%BB%95_%C4%90%C6%B0%E1%BB%9Dng_L%C3%A2m.jpg`,
    width: 4608,
    height: 3456,
  },
  {
    id: "duong-lam-den-ngo-quyen",
    kind: "image",
    topic: "duong-lam",
    nature: "anh-ngay-nay",
    caption: "Đền thờ Ngô Quyền ở làng Đường Lâm ngày nay, do người đời sau dựng để thờ ông trên đất quê.",
    author: "Bùi Thụy Đào Nguyên",
    license: "CC BY-SA 3.0",
    sourcePage: `${P}%C4%90%E1%BB%81n_th%E1%BB%9D_Ng%C3%B4_Quy%E1%BB%81n_2.jpg`,
    original: `${C}4/4c/%C4%90%E1%BB%81n_th%E1%BB%9D_Ng%C3%B4_Quy%E1%BB%81n_2.jpg`,
    width: 4396,
    height: 3298,
  },

  // ── ngo-quyen-dung-mao ──
  {
    id: "ngo-quyen-tuong-tho",
    kind: "image",
    topic: "ngo-quyen-dung-mao",
    nature: "tuong-doi-sau",
    caption:
      "Tượng thờ Ngô Quyền trong đền thờ ông ở làng Đường Lâm. Tượng do người đời sau tạc; không ai biết chắc dung mạo thật của ông.",
    author: "Bùi Thụy Đào Nguyên",
    license: "CC BY-SA 3.0",
    sourcePage: `${P}T%C6%B0%E1%BB%A3ng_Ng%C3%B4_Quy%E1%BB%81n.jpg`,
    original: `${C}a/af/T%C6%B0%E1%BB%A3ng_Ng%C3%B4_Quy%E1%BB%81n.jpg`,
    width: 3456,
    height: 4608,
  },

  // ── bach-dang-1288 ──
  {
    id: "bd1288-coc-btls",
    kind: "image",
    topic: "bach-dang-1288",
    nature: "hien-vat",
    caption:
      "Những cọc gỗ được cho là đã dùng trong trận Bạch Đằng năm 1288, trưng bày ở Bảo tàng Lịch sử Quốc gia, Hà Nội.",
    author: "Bình Giang (Wikipedia tiếng Việt)",
    license: "PD",
    sourcePage: `${P}C%E1%BB%8Dc_nh%E1%BB%8Dn_B%E1%BA%A1ch_%C4%90%E1%BA%B1ng_1288.JPG`,
    original: `${C}d/d3/C%E1%BB%8Dc_nh%E1%BB%8Dn_B%E1%BA%A1ch_%C4%90%E1%BA%B1ng_1288.JPG`,
    width: 3000,
    height: 4000,
  },
  {
    id: "bd1288-coc-btlsqs",
    kind: "image",
    topic: "bach-dang-1288",
    nature: "hien-vat",
    caption:
      "Cọc gỗ được cho là của trận Bạch Đằng năm 1288, trưng bày ở Bảo tàng Lịch sử Quân sự Việt Nam, Hà Nội. Bức tranh trận đánh phía sau do người ngày nay vẽ.",
    author: "Gary Todd",
    license: "CC0",
    sourcePage: `${P}Wood_Stakes_Used_to_Destroy_Mongol_Fleet_at_Bach_Dang,_1288_(9732100161).jpg`,
    original: `${C}5/57/Wood_Stakes_Used_to_Destroy_Mongol_Fleet_at_Bach_Dang%2C_1288_%289732100161%29.jpg`,
    width: 3456,
    height: 5184,
  },
  {
    id: "bd1288-bai-coc-cao-quy",
    kind: "image",
    topic: "bach-dang-1288",
    nature: "anh-ngay-nay",
    caption:
      "Bãi cọc Cao Quỳ (vùng Quảng Yên, Quảng Ninh) lúc khai quật, nhìn từ trên cao. Giới khảo cổ cho là dấu tích bãi cọc trận Bạch Đằng năm 1288.",
    author: "Tran Trong Nhan (Wikipedia tiếng Việt)",
    license: "PD",
    sourcePage: `${P}B%C3%A3i_c%E1%BB%8Dc_Cao_Qu%E1%BB%B3.jpg`,
    original: `${C}6/63/B%C3%A3i_c%E1%BB%8Dc_Cao_Qu%E1%BB%B3.jpg`,
    width: 1392,
    height: 789,
  },

  // ── kiep-bac ──
  {
    id: "kiep-bac-1904",
    kind: "image",
    topic: "kiep-bac",
    nature: "anh-xua",
    takenYear: 1904,
    caption:
      "Đền Kiếp Bạc năm 1904. Đền do người đời sau dựng để thờ Hưng Đạo Vương, trên đất Vạn Kiếp, nơi ngài lui về những năm cuối đời.",
    author: "André Salles",
    license: "PD",
    sourcePage: `${P}Ki%E1%BA%BFp_B%E1%BA%A1c_temple_in_1904.jpg`,
    original: `${C}e/ea/Ki%E1%BA%BFp_B%E1%BA%A1c_temple_in_1904.jpg`,
    width: 4096,
    height: 2967,
  },
  {
    id: "kiep-bac-cong-den",
    kind: "image",
    topic: "kiep-bac",
    nature: "anh-ngay-nay",
    caption: "Cổng chính đền Kiếp Bạc ngày nay, nơi người đời sau thờ Hưng Đạo Vương trên đất Vạn Kiếp.",
    author: "Handyhuy",
    license: "CC BY 3.0",
    sourcePage: `${P}Den_kiep_bac.jpg`,
    original: `${C}a/a2/Den_kiep_bac.jpg`,
    width: 3072,
    height: 2304,
  },

  // ── tran-hung-dao-dung-mao ──
  {
    id: "thd-tranh-tho",
    kind: "image",
    topic: "tran-hung-dao-dung-mao",
    nature: "chan-dung-doi-sau",
    caption:
      "Tranh thờ Hưng Đạo Vương Trần Quốc Tuấn do người đời sau vẽ (Commons ghi là thời Nguyễn). Không ai biết chắc dung mạo thật của ngài.",
    author: "Khuyết danh",
    license: "PD",
    sourcePage: `${P}Painting_of_Tr%E1%BA%A7n_H%C6%B0ng_%C4%90%E1%BA%A1o_(1228_-_1300),_Nguy%E1%BB%85n_dynasty,_Vietnam.jpg`,
    original: `${C}5/5f/Painting_of_Tr%E1%BA%A7n_H%C6%B0ng_%C4%90%E1%BA%A1o_%281228_-_1300%29%2C_Nguy%E1%BB%85n_dynasty%2C_Vietnam.jpg`,
    width: 720,
    height: 960,
  },
  {
    id: "thd-tuong-nam-dinh",
    kind: "image",
    topic: "tran-hung-dao-dung-mao",
    nature: "tuong-doi-sau",
    caption: "Tượng đài Trần Hưng Đạo ở Nam Định, dựng thời nay.",
    author: "TaiwaneseWaveVN",
    license: "CC BY-SA 4.0",
    sourcePage: `${P}Statue_of_Tran_Hung_Dao,_Nam_Dinh_City,_Vietnam_(01).jpg`,
    original: `${C}5/58/Statue_of_Tran_Hung_Dao%2C_Nam_Dinh_City%2C_Vietnam_%2801%29.jpg`,
    width: 2041,
    height: 1459,
  },

  // ── binh-ngo-dai-cao ──
  {
    id: "binh-ngo-hoang-viet-van-tuyen",
    kind: "image",
    topic: "binh-ngo-dai-cao",
    nature: "ban-in-doi-sau",
    caption:
      "Trang mở đầu bài Bình Ngô đại cáo (chữ Hán) trong sách Hoàng Việt văn tuyển, quyển 5, phần chiếu văn; bản khắc in đời sau, không phải bản viết năm 1428.",
    author: "Nguyễn Trãi soạn văn; bản khắc in khuyết danh",
    license: "PD",
    sourcePage: `${P}B%C3%ACnh_Ng%C3%B4_%C4%91%E1%BA%A1i_c%C3%A1o_%E5%B9%B3%E5%90%B3%E5%A4%A7%E8%AA%A5.png`,
    original: `${C}a/a2/B%C3%ACnh_Ng%C3%B4_%C4%91%E1%BA%A1i_c%C3%A1o_%E5%B9%B3%E5%90%B3%E5%A4%A7%E8%AA%A5.png`,
    width: 1370,
    height: 1483,
  },

  // ── le-loi-lam-kinh ──
  {
    id: "vinh-lang-ban-phuc-che",
    kind: "image",
    topic: "le-loi-lam-kinh",
    nature: "ban-phuc-che",
    caption:
      "Bản phục chế bia Vĩnh Lăng ở Bảo tàng Lịch sử Quốc gia, Hà Nội. Bia gốc dựng năm 1433 ở Lam Kinh, ghi công vua Lê Thái Tổ (Lê Lợi); văn bia do Nguyễn Trãi soạn.",
    author: "Gary Todd",
    license: "CC0",
    sourcePage: `${P}Le_Dynasty_Stele,_1433,_Copy_(9738952790).jpg`,
    original: `${C}1/1f/Le_Dynasty_Stele%2C_1433%2C_Copy_%289738952790%29.jpg`,
    width: 2304,
    height: 3456,
  },
  {
    id: "lam-kinh-san-rong",
    kind: "image",
    topic: "le-loi-lam-kinh",
    nature: "anh-ngay-nay",
    caption:
      "Khu di tích Lam Kinh (Thanh Hóa) ngày nay, nhìn từ sân Rồng về phía Ngọ Môn. Lam Kinh là đất dấy nghiệp của Lê Lợi; nhiều công trình ở đây mới được dựng lại.",
    author: "Bùi Lê Việt Cường",
    license: "CC BY-SA 4.0",
    sourcePage: `${P}Lam_Kinh.jpg`,
    original: `${C}5/57/Lam_Kinh.jpg`,
    width: 1280,
    height: 577,
  },

  // ── con-son ──
  {
    id: "con-son-chua",
    kind: "image",
    topic: "con-son",
    nature: "anh-ngay-nay",
    caption: "Chùa Côn Sơn ngày nay, dưới chân núi Côn Sơn, nơi Nguyễn Trãi về ở ẩn những năm cuối đời.",
    author: "Chitto",
    license: "CC BY-SA 3.0",
    sourcePage: `${P}Chua_Con_son.jpg`,
    original: `${C}0/04/Chua_Con_son.jpg`,
    width: 593,
    height: 455,
  },
  {
    id: "con-son-den-nguyen-trai",
    kind: "image",
    topic: "con-son",
    nature: "anh-ngay-nay",
    caption: "Đền thờ Nguyễn Trãi trong khu di tích Côn Sơn ngày nay, do người đời sau dựng.",
    author: "Kien1980v",
    license: "PD",
    sourcePage: `${P}Denthonguyentrai.jpg`,
    original: `${C}3/36/Denthonguyentrai.jpg`,
    width: 3072,
    height: 2304,
  },

  // ── nguyen-trai-dung-mao ──
  {
    id: "nguyen-trai-chan-dung",
    kind: "image",
    topic: "nguyen-trai-dung-mao",
    nature: "chan-dung-doi-sau",
    caption:
      "Bức chân dung Nguyễn Trãi quen thuộc nhất hiện nay, do người đời sau vẽ. Không ai biết chắc dung mạo thật của ông.",
    author: "Khuyết danh",
    license: "PD",
    sourcePage: `${P}Nguyen_Trai.jpg`,
    original: `${C}c/c6/Nguyen_Trai.jpg`,
    width: 1280,
    height: 1906,
  },
  {
    id: "nguyen-trai-tuong",
    kind: "image",
    topic: "nguyen-trai-dung-mao",
    nature: "tuong-doi-sau",
    caption: "Tượng Nguyễn Trãi ở công viên mang tên ông tại Hà Nội, dựng thời nay.",
    author: "NHHP (Wikipedia tiếng Việt)",
    license: "CC BY-SA 3.0",
    sourcePage: `${P}Statue_of_Nguyen_Trai.jpg`,
    original: `${C}c/c6/Statue_of_Nguyen_Trai.jpg`,
    width: 3072,
    height: 2304,
  },

  // ── nguyen-trai-tho-nom ──
  {
    id: "quoc-am-thi-tap-1868",
    kind: "image",
    topic: "nguyen-trai-tho-nom",
    nature: "ban-in-doi-sau",
    caption:
      "Một trang Quốc âm thi tập, tập thơ chữ Nôm của Nguyễn Trãi, trong bản khắc in năm 1868, hơn bốn trăm năm sau thời ông.",
    author: "Nguyễn Trãi (thơ); bản khắc in năm 1868",
    license: "PD",
    sourcePage: `${P}Qu%E1%BB%91c_%C3%A2m_thi_t%E1%BA%ADp_c%E1%BB%A7a_Nguy%E1%BB%85n_Tr%C3%A3i_(1380-1442),_b%E1%BA%A3n_kh%E1%BA%AFc_in_n%C4%83m_1868,_ph%E1%BA%A3n_%C3%A1nh_v%C4%83n_t%E1%BB%B1,_ng%C3%B4n_ng%E1%BB%AF_v%C3%A0_v%C4%83n_h%C3%B3a_th%E1%BA%BF_k%E1%BB%89_XV.jpg`,
    original: `${C}3/34/Qu%E1%BB%91c_%C3%A2m_thi_t%E1%BA%ADp_c%E1%BB%A7a_Nguy%E1%BB%85n_Tr%C3%A3i_%281380-1442%29%2C_b%E1%BA%A3n_kh%E1%BA%AFc_in_n%C4%83m_1868%2C_ph%E1%BA%A3n_%C3%A1nh_v%C4%83n_t%E1%BB%B1%2C_ng%C3%B4n_ng%E1%BB%AF_v%C3%A0_v%C4%83n_h%C3%B3a_th%E1%BA%BF_k%E1%BB%89_XV.jpg`,
    width: 1600,
    height: 1134,
  },

  // ── ngoc-hoi-dong-da ──
  {
    id: "dong-da-go-tuong",
    kind: "image",
    topic: "ngoc-hoi-dong-da",
    nature: "tuong-doi-sau",
    caption:
      "Gò Đống Đa (Hà Nội) ngày nay, với tượng vua Quang Trung dựng thời nay. Tương truyền gò này là nơi chôn xác quân Thanh sau trận Tết Kỷ Dậu (1789).",
    author: "Tonbi ko",
    license: "CC BY-SA 4.0",
    sourcePage: `${P}G%C3%B2_%C4%90%E1%BB%91ng_%C4%90a.JPG`,
    original: `${C}a/a4/G%C3%B2_%C4%90%E1%BB%91ng_%C4%90a.JPG`,
    width: 1200,
    height: 805,
  },
  {
    id: "dong-da-tuong-dai",
    kind: "image",
    topic: "ngoc-hoi-dong-da",
    nature: "tuong-doi-sau",
    caption:
      "Tượng đài vua Quang Trung ở công viên Gò Đống Đa (Hà Nội), dựng thời nay để ghi nhớ trận đại phá quân Thanh Tết Kỷ Dậu (1789).",
    author: "Bình Giang (Wikipedia tiếng Việt)",
    license: "PD",
    sourcePage: `${P}Go_Dong_Da_3.JPG`,
    original: `${C}9/99/Go_Dong_Da_3.JPG`,
    width: 2304,
    height: 1736,
  },
  {
    id: "dong-da-tuong-can-canh",
    kind: "image",
    topic: "ngoc-hoi-dong-da",
    nature: "tuong-doi-sau",
    caption: "Cận cảnh tượng vua Quang Trung ở Gò Đống Đa (Hà Nội), nơi ghi nhớ trận Tết Kỷ Dậu (1789); tượng dựng thời nay.",
    author: "Nguyễn Thanh Quang",
    license: "CC BY-SA 3.0",
    sourcePage: `${P}Quang_Trung_Nguy%E1%BB%85n_Hu%E1%BB%87,_G%C3%B2_%C4%90%E1%BB%91ng_%C4%90a.JPG`,
    original: `${C}3/3d/Quang_Trung_Nguy%E1%BB%85n_Hu%E1%BB%87%2C_G%C3%B2_%C4%90%E1%BB%91ng_%C4%90a.JPG`,
    width: 3000,
    height: 4000,
  },

  // ── rach-gam-xoai-mut ──
  {
    id: "rach-gam-so-do",
    kind: "image",
    topic: "rach-gam-xoai-mut",
    nature: "so-do",
    caption: "Sơ đồ trận Rạch Gầm – Xoài Mút (đầu năm 1785) trên sông Tiền, trưng bày ở Bảo tàng Quang Trung.",
    author: "Tonbi ko",
    license: "CC BY-SA 4.0",
    sourcePage: `${P}Battle_of_R%E1%BA%A1ch_G%E1%BA%A7m_-_Xo%C3%A0i_M%C3%BAt,jpg.JPG`,
    original: `${C}8/84/Battle_of_R%E1%BA%A1ch_G%E1%BA%A7m_-_Xo%C3%A0i_M%C3%BAt%2Cjpg.JPG`,
    width: 1500,
    height: 1097,
  },

  // ── nui-ban ──
  {
    id: "nui-ban-tuong",
    kind: "image",
    topic: "nui-ban",
    nature: "tuong-doi-sau",
    caption: "Tượng vua Quang Trung ở núi Bân (Huế), nơi ngài lên ngôi hoàng đế cuối năm 1788; tượng dựng thời nay.",
    author: "P. Hughes",
    license: "CC BY 4.0",
    sourcePage: `${P}Hu%E1%BA%BF_-_Quang_Trung_Statue,_Ban_Mountain_site.jpg`,
    original: `${C}8/8d/Hu%E1%BA%BF_-_Quang_Trung_Statue%2C_Ban_Mountain_site.jpg`,
    width: 3932,
    height: 2492,
  },

  // ── tay-son ──
  {
    id: "tay-son-cay-me",
    kind: "image",
    topic: "tay-son",
    nature: "anh-ngay-nay",
    caption:
      "Cây me cổ thụ trong vườn nhà cũ của ba anh em Tây Sơn, nay nằm trong khuôn viên Bảo tàng Quang Trung ở đất Tây Sơn.",
    author: "Bùi Thụy Đào Nguyên",
    license: "CC BY-SA 3.0",
    sourcePage: `${P}C%C3%A2y_me_T%C3%A2y_S%C6%A1n.jpg`,
    original: `${C}7/75/C%C3%A2y_me_T%C3%A2y_S%C6%A1n.jpg`,
    width: 2472,
    height: 3296,
  },
  {
    id: "tay-son-bao-tang",
    kind: "image",
    topic: "tay-son",
    nature: "anh-ngay-nay",
    caption: "Bảo tàng Quang Trung ngày nay, dựng trên đất quê nhà của ba anh em Tây Sơn.",
    author: "Liftold (Wikipedia tiếng Việt)",
    license: "CC BY-SA 3.0",
    sourcePage: `${P}B%E1%BA%A3o_T%C3%A0ng_Quang_Trung.JPG`,
    original: `${C}4/43/B%E1%BA%A3o_T%C3%A0ng_Quang_Trung.JPG`,
    width: 3072,
    height: 2304,
  },

  // ── chieu-chu-nom ──
  {
    id: "chieu-dich-sach-nom",
    kind: "image",
    topic: "chieu-chu-nom",
    nature: "hien-vat",
    caption: "Tờ chiếu của vua Quang Trung về việc dịch sách chữ Hán ra chữ Nôm, đang trưng bày ở Bảo tàng Quang Trung.",
    author: "Nguyễn Thanh Quang",
    license: "CC BY-SA 3.0",
    sourcePage: `${P}Chi%E1%BA%BFu_ch%E1%BB%89_Quang_Trung.JPG`,
    original: `${C}a/aa/Chi%E1%BA%BFu_ch%E1%BB%89_Quang_Trung.JPG`,
    width: 4000,
    height: 3000,
  },

  // ── quan-tay-son ──
  {
    id: "tay-son-sung-than-cong",
    kind: "image",
    topic: "quan-tay-son",
    nature: "hien-vat",
    caption:
      "Súng thần công của quân Tây Sơn, tìm thấy ở cảng Thị Nại (Quy Nhơn), nơi đóng thủy binh Tây Sơn; nay trưng bày ở bảo tàng trên đất Tây Sơn.",
    author: "Bùi Thụy Đào Nguyên",
    license: "CC BY-SA 3.0",
    sourcePage: `${P}S%C3%BAng_th%E1%BA%A7n_c%C3%B4ng_th%E1%BB%9Di_T%C3%A2y_S%C6%A1n.jpg`,
    original: `${C}a/a1/S%C3%BAng_th%E1%BA%A7n_c%C3%B4ng_th%E1%BB%9Di_T%C3%A2y_S%C6%A1n.jpg`,
    width: 3296,
    height: 2472,
  },
  {
    id: "tay-son-trong-tran",
    kind: "image",
    topic: "quan-tay-son",
    nature: "hien-vat",
    caption: "Trống trận thời Tây Sơn, trưng bày ở Bảo tàng Quang Trung.",
    author: "Bùi Thụy Đào Nguyên",
    license: "CC BY-SA 3.0",
    sourcePage: `${P}Tr%E1%BB%91ng_tr%E1%BA%ADn_th%E1%BB%9Di_T%C3%A2y_S%C6%A1n.jpg`,
    original: `${C}2/21/Tr%E1%BB%91ng_tr%E1%BA%ADn_th%E1%BB%9Di_T%C3%A2y_S%C6%A1n.jpg`,
    width: 2472,
    height: 3296,
  },

  // ── quang-trung-dung-mao ──
  {
    id: "quang-trung-tuong-bao-tang",
    kind: "image",
    topic: "quang-trung-dung-mao",
    nature: "tuong-doi-sau",
    caption:
      "Tượng đài vua Quang Trung ở Bảo tàng Quang Trung, dựng thời nay. Không có bức chân dung nào được biết chắc là vẽ đúng dung mạo thật của ngài.",
    author: "Liftold (Wikipedia tiếng Việt)",
    license: "CC BY-SA 3.0",
    sourcePage: `${P}T%C6%B0%E1%BB%A3ng_%C4%91%C3%A0i_Quang_Trung_t%E1%BA%A1i_B%E1%BA%A3o_t%C3%A0ng_Quang_Trung.JPG`,
    original: `${C}b/b7/T%C6%B0%E1%BB%A3ng_%C4%91%C3%A0i_Quang_Trung_t%E1%BA%A1i_B%E1%BA%A3o_t%C3%A0ng_Quang_Trung.JPG`,
    width: 1944,
    height: 2592,
  },
];

const IMAGE_BY_ID = new Map(IMAGES.map((img) => [img.id, img]));
const TOPIC_BY_ID = new Map(TOPICS.map((t) => [t.id, t]));

export function getImage(id: string): ImageMedia | undefined {
  return IMAGE_BY_ID.get(id);
}

export function getTopic(id: string): Topic | undefined {
  return TOPIC_BY_ID.get(id);
}

/** Chủ đề nhân vật được phép minh họa (đúng danh sách và không xảy ra sau năm "hiện tại" của nhân vật). */
export function topicsFor(characterId: string): Topic[] {
  const present = PRESENT_YEAR[characterId as CharacterId];
  if (present === undefined) return [];
  return TOPICS.filter((t) => t.characters.includes(characterId as CharacterId) && t.year <= present);
}

/** Ảnh của một chủ đề, theo thứ tự ưu tiên. */
export function imagesOf(topicId: string): ImageMedia[] {
  return IMAGES.filter((img) => img.topic === topicId);
}

/** Tra một minh họa đã lưu trong lịch sử; mã không còn trong kho thì trả undefined (giao diện bỏ qua). */
export function resolveRef(ref: MediaRef): ImageMedia | undefined {
  return ref.kind === "image" ? getImage(ref.id) : undefined;
}
