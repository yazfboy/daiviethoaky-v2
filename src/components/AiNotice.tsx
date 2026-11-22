/** Dòng thông báo bắt buộc: nhân vật do AI nhập vai. */
export function AiNotice({ className = "" }: { className?: string }) {
  return (
    <p role="note" className={`text-xs leading-relaxed text-ink-soft sm:text-[13px] ${className}`}>
      <span aria-hidden className="mr-1 text-cinnabar">
        ❖
      </span>
      Nhân vật do AI nhập vai. Nội dung có thể chưa chính xác về lịch sử, hãy đối chiếu với sử liệu.
    </p>
  );
}
