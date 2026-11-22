// Dữ liệu công khai về nhân vật, dùng chung cho cả trình duyệt và server.
// KHÔNG đặt prompt nhập vai hay bí mật ở đây (prompt nằm trong src/lib/server/personas).

export type CharacterId = "ngo-quyen" | "tran-hung-dao" | "nguyen-trai" | "quang-trung";

export interface Character {
  id: CharacterId;
  name: string;
  /** Tên gọi ngắn dùng trong giao diện chat, vd "Hưng Đạo Vương". */
  title: string;
  years: string;
  /** Một dòng giới thiệu trên thẻ chọn nhân vật. */
  intro: string;
  /** Chữ in trên ấn triện của thẻ. */
  seal: string;
  available: boolean;
  /** Lời chào mở đầu (nhân vật nói trước). Chỉ cần cho nhân vật đã mở. */
  greeting?: string;
}

export const CHARACTERS: Character[] = [
  {
    id: "ngo-quyen",
    name: "Ngô Quyền",
    title: "Ngô Vương",
    years: "898 – 944",
    intro: "Phá quân Nam Hán trên sông Bạch Đằng năm 938, mở ra thời tự chủ lâu dài.",
    seal: "Ngô",
    available: true,
    greeting:
      "Ta là Ngô Quyền, người Đường Lâm. Mùa đông năm ngoái ta cắm cọc trên sông Bạch Đằng, đợi con nước rút " +
      "mà phá thuyền Nam Hán. Nay ta về đóng đô ở Cổ Loa, việc nước mới dựng, còn bộn bề lắm.\n\n" +
      "Khách đường xa tới đây, có điều gì muốn hỏi thì cứ nói thẳng. Chuyện đánh giặc trên sông, " +
      "chuyện giữ thành, hay chuyện đất này, ta biết gì sẽ nói nấy.",
  },
  {
    id: "tran-hung-dao",
    name: "Trần Hưng Đạo",
    title: "Hưng Đạo Vương",
    years: "? – 1300",
    intro: "Quốc công Tiết chế, thống lĩnh quân Đại Việt đánh lui quân Nguyên Mông năm 1285 và 1288.",
    seal: "Trần",
    available: true,
    greeting:
      "Ta là Trần Quốc Tuấn, người đời quen gọi là Hưng Đạo Vương. Nay tuổi đã cao, ta lui về Vạn Kiếp, " +
      "sớm hôm xem lại binh thư, trông dòng Lục Đầu mà nhớ chuyện cũ.\n\n" +
      "Túc hạ từ phương xa tới, chẳng hay muốn hỏi ta điều chi: chuyện ba phen đánh giặc Nguyên, " +
      "bài hịch năm xưa, hay phép trị quân giữ nước? Cứ nói, ta sẵn lòng kể.",
  },
  {
    id: "nguyen-trai",
    name: "Nguyễn Trãi",
    title: "Ức Trai",
    years: "1380 – 1442",
    intro: "Mưu sĩ của khởi nghĩa Lam Sơn, người viết Bình Ngô đại cáo.",
    seal: "Nguyễn",
    available: true,
    greeting:
      "Lão phu là Nguyễn Trãi, hiệu Ức Trai. Nay tuổi gần sáu mươi, xin về núi Côn Sơn, " +
      "sớm nghe suối chảy, chiều ngắm thông reo, ngày tháng gửi vào chén trà, trang sách.\n\n" +
      "Hiền hữu chẳng quản đường xa lên tận am cỏ, thật quý hóa. Muốn hỏi chuyện mười năm nếm mật nằm gai " +
      "ở Lam Sơn, chuyện bài Bình Ngô đại cáo, hay đạo nhân nghĩa yên dân, xin cứ hỏi, lão phu xin kể.",
  },
  {
    id: "quang-trung",
    name: "Quang Trung",
    title: "Hoàng đế Quang Trung",
    years: "1753 – 1792",
    intro: "Thủ lĩnh Tây Sơn, đại phá quân Thanh mùa xuân Kỷ Dậu 1789.",
    seal: "Quang",
    available: true,
    greeting:
      "Trẫm là Quang Trung, người đất Tây Sơn. Mùa xuân năm Kỷ Dậu, trẫm đem quân ra Bắc, " +
      "chỉ trong mấy ngày Tết đã quét sạch quân Thanh khỏi Thăng Long. Nay về Phú Xuân, việc nước còn ngổn ngang.\n\n" +
      "Khanh từ xa tới, chắc có điều muốn hỏi. Chuyện đánh giặc, chuyện trị nước hay chuyện dùng người, " +
      "khanh cứ nói thẳng, trẫm trả lời thẳng.",
  },
];

export function getCharacter(id: string): Character | undefined {
  return CHARACTERS.find((c) => c.id === id);
}

/** Giới hạn độ dài một câu hỏi của người dùng (ký tự). */
export const MAX_USER_MESSAGE_CHARS = 1000;
