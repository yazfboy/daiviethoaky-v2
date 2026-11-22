/**
 * Làm sạch lời đáp để hiển thị dạng văn xuôi: bỏ ký hiệu Markdown lọt ra (**, #, gạch đầu dòng)
 * dù prompt đã dặn không dùng. Không đụng tới dấu tiếng Việt.
 */
export function cleanModelText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/gs, "$1")
    .replace(/__(.+?)__/gs, "$1")
    .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, "$1$2")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/^\s*\*{3,}\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n");
}
