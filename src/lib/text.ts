/** Ký tự chữ Hán / Nhật / Hàn (model đôi khi lọt ra giữa câu tiếng Việt, vd "lâm终"). */
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}　-〿＀-￯]+/gu;

const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];

/** Can chi của một năm dương lịch (năm 4 là Giáp Tý). */
export function canChi(year: number): string {
  return `${CAN[(((year - 4) % 10) + 10) % 10]} ${CHI[(((year - 4) % 12) + 12) % 12]}`;
}

/** "Can Chi (năm)" đứng liền nhau, vd "Mậu Tý (1288)". Khoảng năm "(1287 - 1288)" không bắt. */
const CAN_CHI_YEAR = new RegExp(
  `(?<![\\p{L}\\p{M}])(${CAN.join("|")})\\s+(${CHI.join("|")}|Tị|Mẹo)(?![\\p{L}\\p{M}])(\\s*)\\((\\d{3,4})\\)`,
  "gu",
);

/**
 * Sửa can chi lệch với năm dương lịch đi kèm (model đôi khi ghép nhầm, vd "Mậu Tý (1258)" -> "Mậu Ngọ (1258)").
 * Năm dương lịch là mốc chắc chắn hơn nên lấy năm làm chuẩn.
 */
export function fixCanChi(text: string): string {
  return text.replace(CAN_CHI_YEAR, (whole, can: string, chi: string, space: string, year: string) => {
    const y = Number(year);
    if (y < 100 || y > 2100) return whole;
    const right = canChi(y);
    return `${can} ${chi}`.toLowerCase() === right.toLowerCase() ? whole : `${right}${space}(${year})`;
  });
}

/** Chữ số tiếng Anh lọt vào câu tiếng Việt (vd "mồng five Tết"). */
const EN_NUMBERS: Record<string, string> = {
  one: "một", two: "hai", three: "ba", four: "bốn", five: "năm",
  six: "sáu", seven: "bảy", eight: "tám", nine: "chín", ten: "mười",
};
// Chỉ đổi khi đứng sau chữ chỉ ngày tháng ("mồng five Tết"), để không đụng từ tiếng Việt trùng mặt chữ như "ten" (gỉ đồng).
const EN_NUMBER_WORD = new RegExp(
  `(?<=(?<![\\p{L}\\p{M}])(?:mồng|mùng|ngày|tháng)\\s+)(${Object.keys(EN_NUMBERS).join("|")})(?![\\p{L}\\p{M}])`,
  "giu",
);

/**
 * Làm sạch lời đáp để hiển thị dạng văn xuôi: bỏ ký hiệu Markdown lọt ra (**, #, gạch đầu dòng),
 * ký tự chữ Hán và chữ số tiếng Anh lọt vào, sửa can chi lệch năm, dù prompt đã dặn. Không đụng tới dấu tiếng Việt.
 */
export function cleanModelText(text: string): string {
  return fixCanChi(text)
    .replace(CJK, "")
    .replace(EN_NUMBER_WORD, (w) => EN_NUMBERS[w.toLowerCase()])
    .replace(/\*\*(.+?)\*\*/gs, "$1")
    .replace(/__(.+?)__/gs, "$1")
    .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, "$1$2")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/^\s*\*{3,}\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n");
}
