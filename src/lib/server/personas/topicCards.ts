import "server-only";

import type { CharacterId } from "@/lib/characters";
import type { ChatTurn } from "@/lib/chatProtocol";

// Thẻ sự thật theo chủ đề (Phase 2, sau QA lần 6).
// Prompt nhập vai rất dài; model nhỏ ở mức suy nghĩ thấp đôi khi kéo nhầm chi tiết (gán năm của việc này cho việc kia)
// hoặc bỏ sót kết cục. Khi câu hỏi chạm tới một sự kiện chính, server chèn đúng thẻ của sự kiện ấy vào CUỐI prompt,
// ngay trước lúc model trả lời. Nội dung thẻ lấy từ docs/ho-so-nhan-vat.md, không thêm sự kiện mới.

export interface TopicCard {
  /** Mã ngắn, dùng cho test và báo cáo kiểm thử. */
  id: string;
  /** Khớp với câu hỏi của người dùng (đã chuẩn hóa NFC, không phân biệt hoa thường). */
  match: RegExp;
  /** Sự thật phải nói đúng khi bàn chủ đề này. */
  facts: string;
}

/** Khớp nguyên từ / cụm từ tiếng Việt (không khớp giữa chừng một chữ khác). */
function words(...terms: string[]): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{M}])(?:${terms.join("|")})(?![\\p{L}\\p{M}])`, "iu");
}

export const TOPIC_CARDS: Record<CharacterId, TopicCard[]> = {
  "ngo-quyen": [
    {
      id: "nq-bach-dang",
      match: words("bạch đằng", "cọc", "hoằng tháo", "lưu cung", "lưu nghiễm", "nam hán", "thủy triều", "con nước", "hải môn", "trận"),
      facts:
        "Trận Bạch Đằng: mùa đông năm Mậu Tuất (938), tức mùa đông năm ngoái, cách nay mới vài tháng. Vua Nam Hán là Lưu Cung (còn gọi Lưu Nghiễm) sai con là Hoằng Tháo đem thủy quân theo sông Bạch Đằng sang; Lưu Cung tự đóng quân ở Hải Môn làm thanh viện. Ngài cho đóng cọc lớn đầu nhọn bịt sắt xuống lòng sông ở cửa biển; lúc triều lên cọc chìm, ngài cho thuyền nhẹ ra khiêu chiến rồi giả thua nhử giặc vào; đợi triều rút cọc nhô lên thì dốc quân đánh ập lại; thuyền giặc vướng cọc vỡ đắm, chết đuối quá nửa. Kết cục: Hoằng Tháo bị giết; Lưu Cung nghe tin thương khóc, thu nhặt quân còn sót rồi rút về. Không nêu số quân, số thuyền hay số cọc.",
    },
    {
      id: "nq-kieu-cong-tien",
      match: words("kiều công tiễn", "công tiễn", "dương đình nghệ", "dương công", "báo thù", "ái châu", "phản chủ"),
      facts:
        "Năm Đinh Dậu (937), nha tướng Kiều Công Tiễn giết Dương Đình Nghệ (chủ tướng cũ, cũng là cha vợ của ngài) để đoạt quyền, rồi sai người sang cầu cứu Nam Hán. Năm Mậu Tuất (938) ngài kéo quân từ Ái Châu ra giết Kiều Công Tiễn, báo thù cho chủ cũ và trừ kẻ rước giặc vào nhà. Luôn nói đủ hai lý do ấy; không tả cảnh chém giết.",
    },
    {
      id: "nq-co-loa",
      match: words("cổ loa", "đóng đô", "kinh đô", "xưng vương", "xưng hiệu", "xưng đế", "lên ngôi", "triều nghi", "trăm quan", "vương hậu", "hoàng hậu", "dương thị", "con gái"),
      facts:
        "Mùa xuân năm Kỷ Hợi (939), ngài xưng vương (không xưng đế), đóng đô ở Cổ Loa, thành cũ của An Dương Vương; đặt trăm quan, chế định triều nghi và phẩm phục; lập Dương thị, con gái Dương Đình Nghệ, làm vương hậu. Không gọi bà bằng tên riêng nào khác ngoài Dương thị.",
    },
    {
      id: "nq-que-quan",
      match: words("quê", "người ở đâu", "người đâu", "thân phụ", "cha ngài", "cha của ngài", "xuất thân", "đường lâm", "ngô mân", "gia đình", "sinh năm", "sinh ra"),
      facts:
        "Ngài sinh năm Mậu Ngọ (898) ở Đường Lâm, con của Ngô Mân, người làm châu mục Đường Lâm. Không bịa tên mẹ, anh em hay chuyện thuở nhỏ.",
    },
  ],

  "tran-hung-dao": [
    {
      id: "thd-binh-than-dong-bo-dau",
      match: words("bình than", "đông bộ đầu", "duyệt binh", "duyệt quân", "hội nghị"),
      facts:
        "Bình Than là nơi HỌP BÀN: năm Nhâm Ngọ (1282), vua Trần Nhân Tông họp các vương hầu và trăm quan ở Bình Than bàn kế đánh giữ khi giặc Nguyên sắp sang. Đông Bộ Đầu là nơi DUYỆT BINH: tháng chín năm Giáp Thân (1284), ngài tập hợp vương hầu tông thất và các quân duyệt binh lớn ở Đông Bộ Đầu, chuẩn bị kháng chiến lần thứ hai; Đông Bộ Đầu cũng là nơi quân ta phá giặc cuối năm Đinh Tỵ, tức đầu năm 1258. Năm của hội nghị Bình Than là 1282, KHÔNG phải 1284; \"tháng chín năm Giáp Thân\" là của buổi duyệt binh, không phải của hội nghị.",
    },
    {
      id: "thd-dien-hong",
      match: words("diên hồng", "bô lão"),
      facts:
        "Hội nghị Diên Hồng: cuối năm Giáp Thân sang đầu năm Ất Dậu (1285), Thượng hoàng Trần Thánh Tông (vua cha) chủ trì, mời các bô lão trong nước hỏi nên đánh hay hòa; ai nấy đồng thanh hô \"Đánh!\". Người chủ trì là Thượng hoàng Thánh Tông, không phải vua Nhân Tông.",
    },
    {
      id: "thd-hich",
      match: words("hịch", "hịch tướng sĩ", "dụ chư tỳ tướng", "binh thư yếu lược"),
      facts:
        "Hịch tướng sĩ: ngài soạn khoảng năm Giáp Thân (1284), trước cuộc kháng chiến lần thứ hai, để khích lệ tướng sĩ bỏ thói ham chơi, chăm học Binh thư yếu lược, luyện tập cung kiếm, đồng lòng đánh giặc. Chỉ được trích nguyên văn đoạn \"Ta thường tới bữa quên ăn, nửa đêm vỗ gối...\" như trong phần trích dẫn.",
    },
    {
      id: "thd-bach-dang",
      match: words("bạch đằng", "ô mã nhi", "cọc", "mậu tý", "1288", "phàn tiếp", "thoát hoan"),
      facts:
        "Ngày mồng 8 tháng 3 năm Mậu Tý (1288), trận Bạch Đằng đánh quân Nguyên: ngài cho đóng cọc gỗ đầu bịt sắt xuống lòng sông, dùng quân nhử thuyền giặc vào lúc triều lên, đợi triều rút thì thuyền giặc mắc cọc vỡ đắm, quân ta từ hai bờ đánh ập vào. Kết cục: bắt sống Ô Mã Nhi, Phàn Tiếp, Tích Lệ Cơ; Thoát Hoan theo đường bộ chạy qua Lạng Sơn. Kế này học phép cũ của Ngô Vương Quyền phá quân Nam Hán năm Mậu Tuất (938); Mậu Tuất (938) là năm của Ngô Vương, Mậu Tý (1288) là năm của trận này, không lẫn hai năm. Không nêu số quân, số thuyền hay số cọc; không nói Ô Mã Nhi tử trận tại trận.",
    },
    {
      id: "thd-van-don",
      match: words("vân đồn", "khánh dư", "thuyền lương", "trương văn hổ"),
      facts:
        "Cuối năm Đinh Hợi (1287), Phó tướng Trần Khánh Dư đánh tan đoàn thuyền lương của Trương Văn Hổ ở Vân Đồn; giặc Nguyên thiếu lương phải tính đường rút, mở đường cho trận Bạch Đằng năm Mậu Tý (1288).",
    },
    {
      id: "thd-chem-dau",
      match: words("chém đầu", "xin hàng", "hàng giặc", "đầu hàng", "hãy hàng", "chuyện hàng", "sát thát"),
      facts:
        "Năm Ất Dậu (1285), cuộc kháng chiến lần thứ hai, khi vua Nhân Tông lo thế giặc mạnh mà hỏi việc hàng, ngài tâu nguyên văn: \"Bệ hạ chém đầu thần trước rồi hãy hàng\". Quân sĩ thích hai chữ \"Sát Thát\" lên cánh tay. Luôn nói nguyên văn câu tâu và năm 1285.",
    },
    {
      id: "thd-ngo-quyen",
      match: words("ngô quyền", "ngô vương"),
      facts:
        "Ngô Vương Quyền là bậc anh hùng đời trước, cách hơn ba trăm năm: năm Mậu Tuất (938) ông cắm cọc trên sông Bạch Đằng phá quân Nam Hán, giết Hoằng Tháo, rồi xưng vương đóng đô ở Cổ Loa. Ngài học phép cọc ấy cho trận năm 1288. Nói như người đọc sử, không tự nhận đã gặp; gọi đủ \"quân Nam Hán\".",
    },
  ],

  "nguyen-trai": [
    {
      id: "nt-binh-ngo-dai-cao",
      match: words("bình ngô đại cáo", "đại cáo", "bài cáo", "cáo bình ngô"),
      facts:
        "Bình Ngô đại cáo: đầu năm Mậu Thân (1428), ông thay lời Lê Lợi (Bình Định Vương, sau là vua Lê Thái Tổ) soạn, bố cáo thiên hạ việc dẹp yên giặc Minh. Cốt lõi là tư tưởng nhân nghĩa, yên dân; có thể trích \"Việc nhân nghĩa cốt ở yên dân / Quân điếu phạt trước lo trừ bạo\". Khi nói về bài cáo luôn nêu đủ: năm 1428; thay lời Lê Lợi bố cáo việc dẹp giặc Minh; tư tưởng nhân nghĩa, yên dân.",
    },
    {
      id: "nt-chi-lang",
      match: words("chi lăng", "xương giang", "liễu thăng", "mộc thạnh", "viện binh"),
      facts:
        "Năm Đinh Mùi (1427): quân ta chém Liễu Thăng ở Chi Lăng, rồi phá tan viện binh Minh ở Xương Giang; Mộc Thạnh nghe tin rút chạy; Vương Thông trong thành Đông Quan phải xin hòa. Không nêu số giặc bị giết hay bị bắt (kể cả \"hàng vạn\"), không nói \"không sót một ai\", \"không còn một mống\"; chỉ nói giặc tan vỡ, đại bại.",
    },
    {
      id: "nt-hoi-the-dong-quan",
      match: words("vương thông", "đông quan", "xin hòa", "giảng hòa", "hội thề", "về nước", "hiếu sinh"),
      facts:
        "Cuối năm Đinh Mùi (1427), Vương Thông cố thủ ở Đông Quan phải xin hòa; có Hội thề Đông Quan; nghĩa quân không giết, cấp thuyền, ngựa, lương cho quân Minh rút về nước, mở đường hiếu sinh. Luôn nêu tên Hội thề Đông Quan; không nêu số thuyền ngựa.",
    },
    {
      id: "nt-gia-dinh",
      match: words("thân phụ", "thân mẫu", "song thân", "cha ngài", "mẹ ngài", "cha mẹ", "phi khanh", "nguyên đán", "trần thị thái"),
      facts:
        "Cha ông là Nguyễn Phi Khanh; mẹ là bà Trần Thị Thái, con gái quan Tư đồ Trần Nguyên Đán. Ông sinh năm Canh Thân (1380), hiệu Ức Trai. Không bịa tên anh em hay chi tiết gia đình khác.",
    },
    {
      id: "nt-lam-son",
      match: words("lam sơn", "lê lợi", "bình định vương", "bình ngô sách", "thái tổ", "kế sách"),
      facts:
        "Năm Mậu Tuất (1418) Lê Lợi dựng cờ khởi nghĩa ở Lam Sơn, xưng Bình Định Vương. Ông vào Lam Sơn theo Lê Lợi trong những năm đầu khởi nghĩa (năm cụ thể sử chép chưa rõ, không khẳng định năm) và dâng Bình Ngô sách. Đánh đuổi giặc Minh xong, đầu năm Mậu Thân (1428) Lê Lợi lên ngôi, tức vua Lê Thái Tổ; năm Quý Sửu (1433) vua băng hà.",
    },
    {
      id: "nt-quan-trung-tu-menh",
      match: words("quân trung từ mệnh", "viết thư", "thư từ", "bức thư", "những bức thư", "dụ hàng"),
      facts:
        "Trong quân, ông thay lời Bình Định Vương viết nhiều thư gửi các tướng Minh để dụ hàng, vạch lẽ phải trái, chủ trương đánh vào lòng người; các thư ấy về sau được gom thành Quân trung từ mệnh tập.",
    },
    {
      id: "nt-tran-hung-dao",
      match: words("trần hưng đạo", "hưng đạo", "quốc tuấn"),
      facts:
        "Hưng Đạo Vương Trần Quốc Tuấn: danh tướng nhà Trần hơn trăm năm trước, ba phen đánh lui quân Nguyên; năm Mậu Tý (1288) cắm cọc trên sông Bạch Đằng, bắt sống Ô Mã Nhi; soạn Hịch tướng sĩ và Binh thư yếu lược. Trong Bình Ngô đại cáo ông có viết \"Cửa Hàm Tử bắt sống Toa Đô / Sông Bạch Đằng giết tươi Ô Mã\". Nói như học trò đọc sử về bậc tiền bối, không tự nhận đã gặp.",
    },
    {
      id: "nt-nam-quan",
      match: words("nam quan", "ải nam quan", "trả thù"),
      facts:
        "Chuyện cha dặn ở ải Nam Quan là chuyện người đời truyền lại: chỉ nói vậy, rồi nói tấm lòng thương cha và nợ nước; TUYỆT ĐỐI không thuật lại nội dung lời cha dặn, kể cả gián tiếp. Năm vào Lam Sơn: chỉ nói những năm đầu khởi nghĩa, không khẳng định năm.",
    },
  ],

  "quang-trung": [
    {
      id: "qt-ky-dau",
      match: words("kỷ dậu", "quân thanh", "ngọc hồi", "đống đa", "hà hồi", "tôn sĩ nghị", "sầm nghi đống", "khương thượng", "đại phá", "gián khẩu"),
      facts:
        "Tết Kỷ Dậu (1789): đêm 30 Tết quân ta vượt sông Gián Khẩu; đêm mồng 3 Tết vây đồn Hà Hồi, giặc hàng; sáng mồng 5 Tết đánh đồn Ngọc Hồi, cùng lúc một cánh quân phá đồn Khương Thượng ở Đống Đa, Sầm Nghi Đống thắt cổ tự vẫn; Tôn Sĩ Nghị bỏ chạy qua sông Nhị Hà, cầu phao đứt, quân Thanh chết đuối rất nhiều; trưa mồng 5 Tết ngài vào Thăng Long, sớm hơn ngày hẹn mồng 7. Không nêu số quân. Viết ngày tháng bằng tiếng Việt (vd mồng 5), không dùng tiếng nước ngoài.",
    },
    {
      id: "qt-len-ngoi",
      match: words("lên ngôi", "núi bân", "bân sơn", "niên hiệu", "xưng đế", "xưng hoàng đế", "làm vua"),
      facts:
        "Ngày 25 tháng 11 năm Mậu Thân (1788), ngài lên ngôi hoàng đế ở núi Bân (Phú Xuân), đặt niên hiệu Quang Trung, rồi lập tức kéo quân ra Bắc đánh quân Thanh. Lên ngôi TRƯỚC khi ra Bắc, không phải sau khi thắng; không phải ở Thăng Long hay Quy Nhơn. Chỉ nói ngày tháng theo lịch ta như trên, không đổi ra ngày tháng dương lịch; năm 1788 ghi bằng chữ số.",
    },
    {
      id: "qt-rach-gam",
      match: words("rạch gầm", "xoài mút", "xiêm", "sông tiền"),
      facts:
        "Tháng chạp năm Giáp Thìn, tức đầu năm 1785, ngài phá tan quân Xiêm (do Nguyễn Ánh cầu sang) ở Rạch Gầm – Xoài Mút trên sông Tiền. Trận này đánh quân Xiêm, không phải quân Thanh hay chúa Trịnh.",
    },
    {
      id: "qt-dung-nuoc",
      match: words("dựng lại", "dựng nước", "trị nước", "khuyến nông", "lập học", "cầu hiền", "chữ nôm", "nguyễn thiếp", "sùng chính", "an dân", "chính sách"),
      facts:
        "Sau khi đuổi quân Thanh, ngài ban Chiếu khuyến nông cho dân lưu tán về quê cày cấy; ban Chiếu lập học, mở trường ở các xã; có Chiếu cầu hiền (Ngô Thì Nhậm soạn) mời kẻ sĩ ra giúp nước; coi trọng chữ Nôm, năm Tân Hợi (1791) mời La Sơn phu tử Nguyễn Thiếp làm viện trưởng Sùng chính viện dịch sách ra chữ Nôm. Khi kể việc dựng nước, nêu đủ các chiếu ấy và việc chữ Nôm.",
    },
    {
      id: "qt-tam-diep",
      match: words("tam điệp", "hẹn", "mồng 7", "mùng 7", "mồng bảy", "mùng bảy", "vào thành", "vào thăng long"),
      facts:
        "Ở Tam Điệp, ngài gặp Ngô Văn Sở, Ngô Thì Nhậm, khao quân và hẹn các tướng mồng 7 Tết sẽ vào thành Thăng Long mở tiệc; rốt cuộc trưa mồng 5 Tết đã vào thành, sớm hơn ngày hẹn hai ngày.",
    },
    {
      id: "qt-bach-dang",
      match: words("bạch đằng", "1288", "trần hưng đạo", "hưng đạo", "ô mã nhi", "ngô quyền"),
      facts:
        "Trận Bạch Đằng năm Mậu Tý (1288): Hưng Đạo Vương Trần Quốc Tuấn đời Trần đánh quân Nguyên, đóng cọc gỗ đầu bịt sắt dưới lòng sông, nhử giặc vào lúc triều lên, đợi triều rút thì đánh, thuyền giặc mắc cọc vỡ đắm, bắt sống tướng Ô Mã Nhi. Kế ấy học phép cũ của Ngô Quyền phá quân Nam Hán năm Mậu Tuất (938); đó là hai trận khác nhau, không lẫn năm Mậu Tuất (938) với năm Mậu Tý (1288). Kể như chuyện người xưa đọc trong sử, cách nay hơn năm trăm năm; không tự nhận chứng kiến; không nêu số quân.",
    },
    {
      id: "qt-nguyen-anh",
      match: words("gia long", "nguyễn ánh", "triều nguyễn", "nhà nguyễn", "gia định"),
      facts:
        "Nguyễn Ánh là đối thủ của ngài, đang giữ đất Gia Định ở phía Nam và mạnh dần. Ngài không hề biết \"Gia Long\" là ai, cũng không biết \"triều Nguyễn\" như một triều đại: nói chưa từng nghe, không đoán; có thể nhắc Nguyễn Ánh là đối thủ ở Gia Định.",
    },
  ],
};

/** Xét câu hỏi hiện tại và câu hỏi liền trước (để câu nối tiếp như "trận đó" vẫn có thẻ). */
const LOOKBACK_USER_TURNS = 2;
/** Tối đa số thẻ mỗi lượt, để phần ghi chú cuối prompt luôn ngắn và tập trung. */
export const MAX_TOPIC_CARDS = 3;

/** Chọn thẻ sự thật cho lượt hỏi cuối: ưu tiên thẻ khớp câu hỏi hiện tại, rồi tới câu hỏi trước đó. */
export function selectTopicCards(characterId: string, messages: ChatTurn[]): TopicCard[] {
  const cards = TOPIC_CARDS[characterId as CharacterId];
  if (!cards) return [];
  const userTexts = messages
    .filter((m) => m.role === "user")
    .slice(-LOOKBACK_USER_TURNS)
    .reverse()
    .map((m) => m.text.normalize("NFC"));
  const picked: TopicCard[] = [];
  for (const text of userTexts) {
    for (const card of cards) {
      if (picked.length >= MAX_TOPIC_CARDS) return picked;
      if (!picked.includes(card) && card.match.test(text)) picked.push(card);
    }
  }
  return picked;
}

/** Phần ghi chú chèn vào cuối prompt hệ thống. Rỗng nếu không có thẻ nào. */
export function renderTopicCards(cards: TopicCard[]): string {
  if (cards.length === 0) return "";
  return [
    "# SỰ THẬT CHO CÂU HỎI NÀY (bám đúng từng chi tiết dưới đây: năm, nơi, người, kết cục; không thêm bớt, không gán năm của việc này cho việc kia)",
    ...cards.map((c) => `- ${c.facts}`),
  ].join("\n");
}
