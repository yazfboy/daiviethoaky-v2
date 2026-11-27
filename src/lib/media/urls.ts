import type { ImageMedia, LicenseId, MediaNature } from "@/lib/media/types";

// Dựng URL ảnh Wikimedia và nhãn hiển thị.
// Wikimedia chỉ nhận ảnh thu nhỏ ở các cỡ chuẩn; cỡ khác bị từ chối (HTTP 400), nên chỉ dùng các cỡ dưới đây.

/** Các host ảnh được phép nhúng (khớp header CSP img-src trong next.config.ts). */
export const ALLOWED_IMAGE_HOSTS = ["upload.wikimedia.org", "thumb.wikimedia.org"] as const;

/** Các cỡ ảnh thu nhỏ chuẩn của Wikimedia mà app dùng. */
export const STANDARD_WIDTHS = [500, 960, 1280] as const;
export type StandardWidth = (typeof STANDARD_WIDTHS)[number];

/** Cỡ ảnh ở vùng minh họa (cột phải trên máy tính, dải mỏng trên điện thoại). Dùng chung khi tải trước ảnh. */
export const PANEL_WIDTHS = [500, 960] as const satisfies readonly StandardWidth[];
export const PANEL_SIZES = "(min-width: 1024px) 384px, (min-width: 768px) 320px, 56px";
/** Cỡ ảnh khi bấm xem bản lớn. */
export const VIEWER_WIDTHS = [960, 1280] as const satisfies readonly StandardWidth[];
export const VIEWER_SIZES = "92vw";

const ORIGINAL_PREFIX = "https://upload.wikimedia.org/wikipedia/commons/";
const THUMB_PREFIX = "https://thumb.wikimedia.org/wikipedia/commons/thumb/";

/**
 * URL ảnh ở bề ngang `width`. Ảnh gốc hẹp hơn hoặc bằng cỡ yêu cầu thì dùng luôn file gốc
 * (Wikimedia không phóng to ảnh thu nhỏ).
 */
export function imageUrl(img: Pick<ImageMedia, "original" | "width">, width: StandardWidth): string {
  if (width >= img.width || !img.original.startsWith(ORIGINAL_PREFIX)) return img.original;
  const path = img.original.slice(ORIGINAL_PREFIX.length); // "d/d3/Ten_file.JPG"
  const name = path.slice(path.lastIndexOf("/") + 1);
  return `${THUMB_PREFIX}${path}/${width}px-${name}`;
}

/** srcset gồm các cỡ chuẩn không vượt ảnh gốc, và file gốc nếu ảnh gốc nhỏ hơn cỡ lớn nhất. */
export function imageSrcSet(img: Pick<ImageMedia, "original" | "width">, widths: readonly StandardWidth[]): string {
  const parts: string[] = [];
  for (const w of widths) {
    if (w < img.width) parts.push(`${imageUrl(img, w)} ${w}w`);
  }
  if (img.width <= widths[widths.length - 1]) parts.push(`${img.original} ${img.width}w`);
  return parts.join(", ");
}

export const LICENSE_INFO: Record<LicenseId, { label: string; url: string | null }> = {
  PD: { label: "Phạm vi công cộng", url: null },
  CC0: { label: "CC0", url: "https://creativecommons.org/publicdomain/zero/1.0/deed.vi" },
  "CC BY 3.0": { label: "CC BY 3.0", url: "https://creativecommons.org/licenses/by/3.0/deed.vi" },
  "CC BY 4.0": { label: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/deed.vi" },
  "CC BY-SA 3.0": { label: "CC BY-SA 3.0", url: "https://creativecommons.org/licenses/by-sa/3.0/deed.vi" },
  "CC BY-SA 4.0": { label: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/deed.vi" },
};

const NATURE_LABEL: Record<MediaNature, string> = {
  "anh-ngay-nay": "Ảnh chụp ngày nay",
  "hien-vat": "Hiện vật, ảnh chụp ngày nay",
  "anh-xua": "Ảnh chụp năm {year}",
  "tranh-doi-sau": "Tranh vẽ đời sau",
  "chan-dung-doi-sau": "Tranh vẽ đời sau, không phải chân dung thật",
  "tuong-doi-sau": "Tượng dựng đời sau, không phải chân dung thật",
  "mo-hinh": "Mô hình dựng lại ngày nay",
  "so-do": "Sơ đồ vẽ ngày nay",
  "ban-in-doi-sau": "Bản in đời sau",
  "ban-phuc-che": "Bản phục chế, ảnh chụp ngày nay",
};

/** Nhãn loại ảnh bắt buộc hiện trước chú thích. */
export function natureLabel(img: Pick<ImageMedia, "nature" | "takenYear">): string {
  return NATURE_LABEL[img.nature].replace("{year}", String(img.takenYear ?? "?"));
}
