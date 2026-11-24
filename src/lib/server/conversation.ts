import "server-only";

import { getCharacter, MAX_USER_MESSAGE_CHARS } from "@/lib/characters";
import type { ChatTurn } from "@/lib/chatProtocol";
import { NGO_QUYEN_OPENING_TURN, NGO_QUYEN_SYSTEM_PROMPT } from "@/lib/server/personas/ngoQuyen";
import { NGUYEN_TRAI_OPENING_TURN, NGUYEN_TRAI_SYSTEM_PROMPT } from "@/lib/server/personas/nguyenTrai";
import { QUANG_TRUNG_OPENING_TURN, QUANG_TRUNG_SYSTEM_PROMPT } from "@/lib/server/personas/quangTrung";
import { renderTopicCards, selectTopicCards } from "@/lib/server/personas/topicCards";
import { TRAN_HUNG_DAO_OPENING_TURN, TRAN_HUNG_DAO_SYSTEM_PROMPT } from "@/lib/server/personas/tranHungDao";

interface Persona {
  systemPrompt: string;
  /** Lượt mở màn ẩn: Gemini cần hội thoại bắt đầu bằng lượt "user", lời chào là lượt "model" kế tiếp. */
  openingTurn: string;
}

const PERSONAS: Record<string, Persona> = {
  "ngo-quyen": { systemPrompt: NGO_QUYEN_SYSTEM_PROMPT, openingTurn: NGO_QUYEN_OPENING_TURN },
  "tran-hung-dao": { systemPrompt: TRAN_HUNG_DAO_SYSTEM_PROMPT, openingTurn: TRAN_HUNG_DAO_OPENING_TURN },
  "nguyen-trai": { systemPrompt: NGUYEN_TRAI_SYSTEM_PROMPT, openingTurn: NGUYEN_TRAI_OPENING_TURN },
  "quang-trung": { systemPrompt: QUANG_TRUNG_SYSTEM_PROMPT, openingTurn: QUANG_TRUNG_OPENING_TURN },
};

/** Số lượt gần nhất gửi kèm cho AI (giữ trí nhớ hội thoại mà không phình vô hạn). */
export const MAX_HISTORY_TURNS = 60;
/** Giới hạn độ dài một lời đáp cũ của nhân vật được gửi lại. */
const MAX_MODEL_TURN_CHARS = 6000;

/** Lượt mở màn ẩn của Trần Hưng Đạo (giữ tên cũ từ Phase 1). */
export const OPENING_USER_TURN = TRAN_HUNG_DAO_OPENING_TURN;

export function getOpeningTurn(characterId: string): string {
  return PERSONAS[characterId]?.openingTurn ?? "(Khách từ phương xa vừa bước vào, cúi chào.)";
}

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
  if (!character || !character.available || !PERSONAS[characterId]) {
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

/** Prompt nhập vai gốc của nhân vật. */
export function getSystemPrompt(characterId: string): string {
  return PERSONAS[characterId].systemPrompt;
}

/**
 * Prompt hệ thống cho một lượt hỏi: prompt gốc + thẻ sự thật của chủ đề đang hỏi nối vào cuối
 * (xem personas/topicCards.ts). Câu hỏi không chạm chủ đề nào thì trả nguyên prompt gốc.
 */
export function getTurnSystemPrompt(characterId: string, messages: ChatTurn[]): string {
  const base = getSystemPrompt(characterId);
  const notes = renderTopicCards(selectTopicCards(characterId, messages));
  return notes ? `${base}\n\n${notes}` : base;
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
    turns.push({ role: "user", text: getOpeningTurn(characterId) }, { role: "model", text: greeting });
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
