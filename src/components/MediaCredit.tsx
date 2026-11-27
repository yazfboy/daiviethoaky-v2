import type { ImageMedia } from "@/lib/media/types";
import { LICENSE_INFO, natureLabel } from "@/lib/media/urls";

/** Nhãn loại ảnh + chú thích + dòng nguồn (tác giả, giấy phép, link trang gốc). Bắt buộc đi kèm mọi ảnh. */
export function MediaCredit({ image, className = "" }: { image: ImageMedia; className?: string }) {
  const license = LICENSE_INFO[image.license];
  return (
    <div className={className}>
      <p className="text-xs font-semibold text-cinnabar">{natureLabel(image)}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink">{image.caption}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">
        Ảnh: {image.author} ·{" "}
        {license.url ? (
          <a href={license.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-cinnabar">
            {license.label}
          </a>
        ) : (
          license.label
        )}{" "}
        ·{" "}
        <a
          href={image.sourcePage}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-cinnabar"
        >
          Wikimedia Commons
        </a>
      </p>
    </div>
  );
}
