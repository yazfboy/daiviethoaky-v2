/**
 * Vùng minh họa (CHỪA TRỐNG ở Phase 1). Phase 3 sẽ hiện ảnh tư liệu / video / tranh AI ở đây.
 * - Máy tính (>= md): cột bên phải, cố định chiều cao theo khung chat.
 * - Điện thoại: một dải mỏng phía trên lời thoại, không đè lên chat.
 */
export function IllustrationPanel() {
  return (
    <aside
      aria-label="Vùng minh họa"
      data-slot="illustration"
      className="shrink-0 border-b border-line md:w-80 md:border-b-0 lg:w-96"
    >
      {/* Điện thoại */}
      <div className="flex h-10 items-center justify-center gap-2 bg-paper-deep/50 px-4 text-xs text-ink-faint md:hidden">
        <span aria-hidden className="text-gold">
          ❀
        </span>
        Vùng minh họa sẽ có ở bản sau
      </div>

      {/* Máy tính */}
      <div className="hidden h-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-line bg-scroll/40 p-6 text-center md:flex">
        <span aria-hidden className="font-display text-5xl text-gold/60">
          ❀
        </span>
        <p className="font-display mt-3 text-lg font-semibold text-ink-soft">Vùng minh họa</p>
        <p className="mt-1 text-sm text-ink-faint">Tranh, ảnh tư liệu sẽ hiện ở đây trong bản sau.</p>
      </div>
    </aside>
  );
}
