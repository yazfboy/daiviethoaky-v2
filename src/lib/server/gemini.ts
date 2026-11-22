import "server-only";

import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { StreamFactory } from "@/lib/server/chatStream";

export const DEFAULT_MODEL = "gemini-3.5-flash-lite";

export function getModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

/**
 * Độ ngẫu nhiên khi nhân vật trả lời. Phase 2 hạ từ 0.8 xuống 0.5 để bám sát sự kiện trong hồ sơ
 * (ít lệch năm, lệch người, lệch xưng hô) mà giọng văn vẫn tự nhiên. Đổi bằng GEMINI_TEMPERATURE (0–2).
 */
export const DEFAULT_TEMPERATURE = 0.5;

export function getTemperature(): number {
  const v = Number(process.env.GEMINI_TEMPERATURE);
  return Number.isFinite(v) && process.env.GEMINI_TEMPERATURE?.trim() && v >= 0 && v <= 2 ? v : DEFAULT_TEMPERATURE;
}

/**
 * Mức suy nghĩ của model: mặc định MINIMAL để chữ đầu ra nhanh (AC2: dưới 3 giây).
 * Đổi bằng GEMINI_THINKING_LEVEL=minimal|low|medium|high; "none" = không gửi tham số này
 * (dùng khi đổi sang model không hỗ trợ mức suy nghĩ).
 */
function getThinkingLevel(): ThinkingLevel | undefined {
  const raw = (process.env.GEMINI_THINKING_LEVEL ?? "minimal").trim().toUpperCase();
  if (raw === "NONE" || raw === "") return undefined;
  return (Object.values(ThinkingLevel) as string[]).includes(raw) ? (raw as ThinkingLevel) : ThinkingLevel.MINIMAL;
}

const clients = new Map<number, GoogleGenAI>();

function clientFor(index: number, apiKey: string): GoogleGenAI {
  let c = clients.get(index);
  if (!c) {
    c = new GoogleGenAI({ apiKey });
    clients.set(index, c);
  }
  return c;
}

/** StreamFactory thật: gọi Gemini streamGenerateContent bằng SDK chính thức. */
export const geminiStreamFactory: StreamFactory = async (key, req) => {
  const thinkingLevel = getThinkingLevel();
  const stream = await clientFor(key.index, key.value).models.generateContentStream({
    model: req.model,
    contents: req.contents,
    config: {
      systemInstruction: req.systemInstruction,
      temperature: getTemperature(),
      maxOutputTokens: 2048,
      ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
      abortSignal: req.signal,
    },
  });

  async function* texts(): AsyncGenerator<string> {
    for await (const chunk of stream) {
      const t = chunk.text;
      if (t) yield t;
    }
  }
  return texts();
};
