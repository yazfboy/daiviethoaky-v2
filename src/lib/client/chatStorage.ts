import type { ChatRole } from "@/lib/chatProtocol";

// Lưu lịch sử trò chuyện trong localStorage của trình duyệt, tách theo nhân vật.

export interface StoredMessage {
  id: string;
  role: ChatRole;
  text: string;
}

const VERSION = 1;
const keyFor = (characterId: string) => `dvhk:chat:v${VERSION}:${characterId}`;

export function loadHistory(characterId: string): StoredMessage[] {
  try {
    const raw = window.localStorage.getItem(keyFor(characterId));
    if (!raw) return [];
    const data = JSON.parse(raw) as { messages?: unknown };
    if (!Array.isArray(data?.messages)) return [];
    return data.messages.filter(
      (m): m is StoredMessage =>
        !!m &&
        typeof m === "object" &&
        typeof (m as StoredMessage).id === "string" &&
        ((m as StoredMessage).role === "user" || (m as StoredMessage).role === "model") &&
        typeof (m as StoredMessage).text === "string",
    );
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
