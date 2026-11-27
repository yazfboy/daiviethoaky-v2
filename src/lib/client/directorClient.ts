import type { ChatTurn } from "@/lib/chatProtocol";
import type { DirectorResponse, Shot } from "@/lib/directorProtocol";
import { getImage } from "@/lib/media/catalog";

// Gọi AI Đạo diễn (POST /api/director) song song với lời thoại.
// Mọi lỗi (mạng, server, quá giờ, dữ liệu lạ) đều thành "không ảnh": minh họa không bao giờ báo lỗi vào chat.

const NONE: Shot = { kind: "none" };
/** Đạo diễn phía server tự giới hạn 9 giây; trình duyệt chờ tối đa 11 giây rồi bỏ. */
const DIRECTOR_TIMEOUT_MS = 11_000;

export async function requestShot(opts: {
  characterId: string;
  messages: ChatTurn[];
  shown: string[];
  signal: AbortSignal;
}): Promise<Shot> {
  const ac = new AbortController();
  const onOuter = () => ac.abort();
  opts.signal.addEventListener("abort", onOuter, { once: true });
  const timer = setTimeout(() => ac.abort(), DIRECTOR_TIMEOUT_MS);
  try {
    const res = await fetch("/api/director", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId: opts.characterId, messages: opts.messages, shown: opts.shown }),
      signal: ac.signal,
    });
    if (!res.ok) return NONE;
    const data = (await res.json()) as Partial<DirectorResponse>;
    const shot = data?.shot;
    if (shot?.kind === "image" && typeof shot.mediaId === "string" && getImage(shot.mediaId)) return shot;
    return NONE;
  } catch {
    return NONE;
  } finally {
    clearTimeout(timer);
    opts.signal.removeEventListener("abort", onOuter);
  }
}

/** Tải trước ảnh (đúng srcset/sizes mà giao diện dùng, để trình duyệt dùng lại bản đã tải). */
export function preloadImage(src: string, srcSet: string, sizes: string, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve(false);
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.sizes = sizes;
    img.srcset = srcSet;
    const finish = (ok: boolean) => {
      img.onload = img.onerror = null;
      signal.removeEventListener("abort", onAbort);
      resolve(ok);
    };
    const onAbort = () => {
      img.src = "";
      finish(false);
    };
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    signal.addEventListener("abort", onAbort, { once: true });
    img.src = src;
  });
}
