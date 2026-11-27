import type { ChatRole } from "@/lib/chatProtocol";
import type { MediaRef } from "@/lib/media/types";

// Lưu lịch sử trò chuyện trong localStorage của trình duyệt, tách theo nhân vật.
// Phase 3 thêm trường tùy chọn `media` (minh họa của lượt đáp). Lịch sử cũ không có trường này vẫn đọc được
// nên giữ nguyên khóa v1.

export interface StoredMessage {
  id: string;
  role: ChatRole;
  text: string;
  /** Minh họa của lượt đáp (chỉ lượt "model"). */
  media?: MediaRef[];
}

const VERSION = 1;
const keyFor = (characterId: string) => `dvhk:chat:v${VERSION}:${characterId}`;

/** Giữ lại các tham chiếu minh họa hợp lệ; dữ liệu lạ thì bỏ (không làm hỏng cả lịch sử). */
function sanitizeMedia(raw: unknown): MediaRef[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const refs = raw.filter(
    (r): r is MediaRef =>
      !!r && typeof r === "object" && (r as MediaRef).kind === "image" && typeof (r as MediaRef).id === "string",
  );
  return refs.length > 0 ? refs.map(({ kind, id }) => ({ kind, id })) : undefined;
}

export function loadHistory(characterId: string): StoredMessage[] {
  try {
    const raw = window.localStorage.getItem(keyFor(characterId));
    if (!raw) return [];
    const data = JSON.parse(raw) as { messages?: unknown };
    if (!Array.isArray(data?.messages)) return [];
    return data.messages
      .filter(
        (m): m is StoredMessage =>
          !!m &&
          typeof m === "object" &&
          typeof (m as StoredMessage).id === "string" &&
          ((m as StoredMessage).role === "user" || (m as StoredMessage).role === "model") &&
          typeof (m as StoredMessage).text === "string",
      )
      .map((m) => {
        const media = m.role === "model" ? sanitizeMedia(m.media) : undefined;
        return media ? { id: m.id, role: m.role, text: m.text, media } : { id: m.id, role: m.role, text: m.text };
      });
  } catch {
    return [];
  }
}

export function saveHistory(characterId: string, messages: StoredMessage[]): void {
  try {
    window.localStorage.setItem(keyFor(characterId), JSON.stringify({ messages, savedAt: Date.now() }));
  } catch {
    // hết dung lượng hoặc trình duyệt chặn lưu trữ: bỏ qua, chat vẫn chạy trong phiên
  }
}

export function clearHistory(characterId: string): void {
  try {
    window.localStorage.removeItem(keyFor(characterId));
  } catch {
    // bỏ qua
  }
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
