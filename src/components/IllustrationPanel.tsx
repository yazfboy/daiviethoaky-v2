"use client";

import { useState } from "react";
import { MediaCredit } from "@/components/MediaCredit";
import { MediaViewer } from "@/components/MediaViewer";
import type { ImageMedia } from "@/lib/media/types";
import { imageSrcSet, imageUrl, natureLabel, PANEL_SIZES, PANEL_WIDTHS } from "@/lib/media/urls";

/**
 * Vùng minh họa (Phase 3): ảnh tư liệu do AI Đạo diễn chọn, kèm nhãn loại ảnh, chú thích và nguồn.
 * - Máy tính (>= md): cột bên phải, cao theo khung chat.
 * - Điện thoại: dải cao cố định phía trên lời thoại (ảnh nhỏ + một dòng chú thích), chạm để xem bản lớn.
 *   Dải không đổi chiều cao nên ảnh hiện ra không đẩy lời thoại hay ô nhập.
 * Ảnh hỏng link thì ẩn hẳn (báo lên qua onBroken), không để khung vỡ.
 */
export function IllustrationPanel({
  image,
  seeking,
  earlier,
  onBroken,
}: {
  /** Ảnh đang hiện (null: chưa có). */
  image: ImageMedia | null;
  /** Đạo diễn đang tìm tư liệu cho lượt mới. */
  seeking: boolean;
  /** Ảnh đang hiện thuộc một lượt hỏi trước, không phải lượt mới nhất. */
  earlier: boolean;
  onBroken: (id: string) => void;
}) {
  const [viewing, setViewing] = useState<ImageMedia | null>(null);

  const imgProps = image
    ? {
        src: imageUrl(image, 500),
        srcSet: imageSrcSet(image, PANEL_WIDTHS),
        sizes: PANEL_SIZES,
        alt: image.caption,
        referrerPolicy: "no-referrer" as const,
        decoding: "async" as const,
        onError: () => onBroken(image.id),
      }
    : null;

  const seekingLine = (
    <p className="text-xs text-ink-faint italic" role="status">
      Đang tìm tư liệu
      <span className="thinking-dot inline-block">.</span>
      <span className="thinking-dot inline-block">.</span>
      <span className="thinking-dot inline-block">.</span>
    </p>
  );

  return (
    <aside aria-label="Vùng minh họa" data-slot="illustration" className="shrink-0 border-b border-line md:w-80 md:border-b-0 lg:w-96">
      {/* Điện thoại */}
      <div className="flex h-14 items-center gap-3 bg-paper-deep/50 px-4 md:hidden">
        {image && imgProps ? (
          <button
            type="button"
            onClick={() => setViewing(image)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-label={`Xem tư liệu: ${image.caption}`}
          >
            <img {...imgProps} alt="" className="h-11 w-11 shrink-0 rounded border border-line object-cover" />
            <span className="min-w-0 flex-1">
              {/* Nhãn loại ảnh được xuống 2 dòng để không bị cắt mất ý "không phải chân dung thật". */}
              <span className="line-clamp-2 text-[11px] leading-tight font-semibold text-cinnabar">
                {seeking ? "Đang tìm tư liệu…" : natureLabel(image)}
              </span>
              <span className="block truncate text-xs text-ink-soft">{image.caption}</span>
            </span>
            <span className="shrink-0 text-xs font-medium text-cinnabar underline underline-offset-2">Xem</span>
          </button>
        ) : seeking ? (
          seekingLine
        ) : (
          <p className="text-xs text-ink-faint">Tư liệu minh họa sẽ hiện ở đây khi có.</p>
        )}
      </div>

      {/* Máy tính */}
      <div className="hidden h-full flex-col overflow-hidden rounded-lg border border-line bg-scroll/60 md:flex">
        {image && imgProps ? (
          <>
            <button
              type="button"
              onClick={() => setViewing(image)}
              className="group relative flex min-h-0 flex-1 items-center justify-center bg-ink/85"
              aria-label="Xem ảnh bản lớn"
            >
              <img {...imgProps} className="max-h-full w-full object-contain" />
              <span className="absolute right-2 bottom-2 rounded bg-scroll/90 px-2 py-0.5 text-[11px] text-ink-soft opacity-80 group-hover:opacity-100">
                Bấm để xem bản lớn
              </span>
            </button>
            <div className="max-h-[45%] shrink-0 overflow-y-auto border-t border-line px-4 py-3">
              {seeking && <div className="mb-2">{seekingLine}</div>}
              {earlier && !seeking && <p className="mb-1 text-[11px] text-ink-faint italic">Ảnh của một lượt hỏi trước</p>}
              <MediaCredit image={image} />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <span aria-hidden className="font-display text-5xl text-gold/60">
              ❀
            </span>
            <p className="font-display mt-3 text-lg font-semibold text-ink-soft">Vùng minh họa</p>
            {seeking ? (
              <div className="mt-2">{seekingLine}</div>
            ) : (
              <p className="mt-1 text-sm text-ink-faint">Khi câu chuyện nhắc tới trận đánh, di tích hay văn bản có tư liệu, ảnh sẽ hiện ở đây.</p>
            )}
          </div>
        )}
      </div>

      <MediaViewer image={viewing} onClose={() => setViewing(null)} />
    </aside>
  );
}
