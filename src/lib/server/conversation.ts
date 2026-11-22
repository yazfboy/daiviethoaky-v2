import "server-only";

import { getCharacter, MAX_USER_MESSAGE_CHARS } from "@/lib/characters";
import type { ChatTurn } from "@/lib/chatProtocol";
import { TRAN_HUNG_DAO_SYSTEM_PROMPT } from "@/lib/server/personas/tranHungDao";

const SYSTEM_PROMPTS: Record<string, string> = {
  "tran-hung-dao": TRAN_HUNG_DAO_SYSTEM_PROMPT,
};

/** Số lượt gần nhất gửi kèm cho AI (giữ trí nhớ hội thoại mà không phình vô hạn). */
export const MAX_HISTORY_TURNS = 60;
/** Giới hạn độ dài một lời đáp cũ của nhân vật được gửi lại. */
const MAX_MODEL_TURN_CHARS = 6000;

/** Lượt mở màn ẩn: Gemini cần hội thoại bắt đầu bằng lượt "user", lời chào là lượt "model" kế tiếp. */
export const OPENING_USER_TURN = "(Khách từ phương xa vừa bước vào trướng, cúi chào Hưng Đạo Vương.)";

export interface GeminiContent {
  role: "user" | "model";
  parts: { text: string }[];
}

export type ValidationResult =
  | { ok: true; characterId: string; messages: ChatTurn[] }
  | { ok: false; code: "BAD_REQUEST" | "CHARACTER_UNAVAILABLE" };

/** Kiểm tra body gửi từ trình duyệt. */
export function validateChatBody(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") return { ok: false, code: "BAD_REQUEST" };
  const { characterId, messages } = body as Record<string, unknown>;
  if (typeof characterId !== "string") return { ok: false, code: "BAD_REQUEST" };
  const character = getCharacter(characterId);
  if (!character || !character.available || !SYSTEM_PROMPTS[characterId]) {
    return { ok: false, code: "CHARACTER_UNAVAILABLE" };
  }
  if (!Array.isArray(messages) || messages.length === 0) return { ok: false, code: "BAD_REQUEST" };

  const clean: ChatTurn[] = [];
  for (const m of messages) {
    if (!m || typeof m !== "object") return { ok: false, code: "BAD_REQUEST" };
    const { role, text } = m as Record<string, unknown>;
    if ((role !== "user" && role !== "model") || typeof text !== "string") {
      return { ok: false, code: "BAD_REQUEST" };
    }
    const trimmed = text.trim();
    if (!trimmed) continue;
    if (role === "user" && trimmed.length > MAX_USER_MESSAGE_CHARS) return { ok: false, code: "BAD_REQUEST" };
    clean.push({ role, text: role === "model" ? trimmed.slice(0, MAX_MODEL_TURN_CHARS) : trimmed });
  }
  if (clean.length === 0 || clean[clean.length - 1].role !== "user") return { ok: false, code: "BAD_REQUEST" };
  return { ok: true, characterId, messages: clean };
}

export function getSystemPrompt(characterId: string): string {
  return SYSTEM_PROMPTS[characterId];
}

/**
 * Dựng danh sách nội dung gửi Gemini: [lượt mở màn ẩn, lời chào] + lịch sử (cắt bớt phần quá cũ),
 * gộp các lượt liền nhau cùng vai để luôn xen kẽ user/model.
 */
export function buildContents(characterId: string, messages: ChatTurn[]): GeminiContent[] {
  const greeting = getCharacter(characterId)?.greeting;
  let recent = messages.slice(-MAX_HISTORY_TURNS);
  // Sau khi cắt, lịch sử nên bắt đầu bằng lượt user để nối tiếp lời chào (model).
  while (recent.length > 0 && recent[0].role !== "user") recent = recent.slice(1);

  const turns: ChatTurn[] = [];
  if (greeting) {
    turns.push({ role: "user", text: OPENING_USER_TURN }, { role: "model", text: greeting });
  }
  turns.push(...recent);

  const contents: GeminiContent[] = [];
  for (const t of turns) {
    const last = contents[contents.length - 1];
    if (last && last.role === t.role) {
      last.parts[0].text += "\n\n" + t.text;
    } else {
      contents.push({ role: t.role, parts: [{ text: t.text }] });
    }
  }
  return contents;
}
