// Nhận ra câu chỉ có chào hỏi / cảm ơn / tạm biệt / đáp lời xã giao ("Chào ngài", "Đa tạ ngài", "Vâng ạ").
// Những câu này không bao giờ có minh họa, nên không cần gọi AI Đạo diễn.
// Dùng chung hai phía: server để quyết định nhanh, trình duyệt để khỏi hiện "Đang tìm tư liệu…".

/** Cụm chào hỏi, cảm ơn, đáp lời. Câu phải chứa ít nhất một cụm này. */
const POLITE = [
  "xin chào", "kính chào", "chào", "bái kiến", "tham kiến", "bái biệt", "tạm biệt", "cáo từ", "cáo biệt",
  "hẹn gặp lại", "chúc ngủ ngon", "đa tạ", "xin cảm ơn", "cảm ơn", "cám ơn", "cảm tạ", "tạ ơn", "vâng", "dạ",
  "ừ", "ok", "oke", "okay", "được rồi", "hay quá", "tuyệt vời", "tuyệt", "hiểu rồi", "rõ rồi", "ra vậy", "thì ra",
];

/** Từ đi kèm không mang nội dung (danh xưng, từ đệm). Bỏ hết những từ này mà không còn gì thì là câu xã giao. */
const FILLER = [
  "ngài", "tiên sinh", "bệ hạ", "hoàng thượng", "thánh thượng", "đại vương", "vương gia", "tướng quân", "quốc công",
  "ngô vương", "hưng đạo vương", "ức trai", "hoàng đế", "cụ", "ông", "người", "lão", "ạ", "nhé", "nha", "nhiều",
  "lắm", "rất", "vô cùng", "thật", "quá", "a", "à", "ơi", "xin", "kính", "thưa", "con", "cháu", "tôi", "em",
  "vãn bối", "tại hạ", "đã", "kể", "chỉ giáo", "giảng giải", "lời", "câu", "trả lời", "chuyện", "và", "vậy", "thế",
  "nhé", "ha", "hì", "ạ", "luôn", "hôm nay", "lần sau", "sau", "gặp", "lại", "mọi", "điều",
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const phrase = (list: string[]) =>
  new RegExp(
    `(?<![\\p{L}\\p{M}])(?:${[...list].sort((a, b) => b.length - a.length).map(escape).join("|")})(?![\\p{L}\\p{M}])`,
    "giu",
  );
const POLITE_RE = phrase(POLITE);
const FILLER_RE = phrase(FILLER);

/** true nếu câu chỉ gồm chào hỏi / cảm ơn / tạm biệt / đáp lời xã giao. */
export function isSmallTalk(text: string): boolean {
  const t = text.normalize("NFC").toLowerCase().trim();
  if (!t || t.length > 80) return false;
  POLITE_RE.lastIndex = 0;
  if (!POLITE_RE.test(t)) return false;
  const rest = t
    .replace(POLITE_RE, " ")
    .replace(FILLER_RE, " ")
    .replace(/[\p{P}\p{S}\d]+/gu, " ")
    .trim();
  return rest.length === 0;
}
