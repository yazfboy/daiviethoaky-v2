"use client";

import { useEffect, useRef } from "react";
import { MediaCredit } from "@/components/MediaCredit";
import type { ImageMedia } from "@/lib/media/types";
import { imageSrcSet, imageUrl, VIEWER_SIZES, VIEWER_WIDTHS } from "@/lib/media/urls";

/**
 * Xem ảnh bản lớn bằng <dialog> sẵn có của trình duyệt (Esc để đóng, bấm ra ngoài để đóng).
 * Chỉ mở khi người dùng bấm vào ảnh, nên không che lời thoại lúc bình thường.
 */
export function MediaViewer({ image, onClose }: { image: ImageMedia | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (image && !d.open) d.showModal();
    if (!image && d.open) d.close();
  }, [image]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Bấm vào nền mờ (ngoài khung) thì đóng.
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      aria-label="Xem tư liệu bản lớn"
      className="m-auto max-h-[94dvh] w-[min(56rem,94vw)] overflow-hidden rounded-lg border border-line bg-scroll p-0 text-ink shadow-xl backdrop:bg-ink/70"
    >
      {image && (
        <div className="flex max-h-[94dvh] flex-col">
          <div className="flex min-h-0 flex-1 items-center justify-center bg-ink/90">
            <img
              src={imageUrl(image, 960)}
              srcSet={imageSrcSet(image, VIEWER_WIDTHS)}
              sizes={VIEWER_SIZES}
              alt={image.caption}
              referrerPolicy="no-referrer"
              decoding="async"
              className="max-h-[70dvh] w-auto max-w-full object-contain"
              onError={(e) => {
                // Bản lớn lỗi thì ẩn ảnh, vẫn giữ chú thích và nguồn.
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <div className="flex items-start gap-3 overflow-y-auto px-4 py-3">
            <MediaCredit image={image} className="min-w-0 flex-1" />
            <button
              type="button"
              autoFocus
              onClick={() => ref.current?.close()}
              className="shrink-0 rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-deep"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
