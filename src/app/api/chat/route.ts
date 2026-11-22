import type { ChatErrorCode, StreamEvent } from "@/lib/chatProtocol";
import { ChatStreamError, startChatStream } from "@/lib/server/chatStream";
import { buildContents, getSystemPrompt, validateChatBody } from "@/lib/server/conversation";
import { geminiStreamFactory, getModelName } from "@/lib/server/gemini";
import { getKeyPool } from "@/lib/server/keyPool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_BY_CODE: Partial<Record<ChatErrorCode, number>> = {
  BAD_REQUEST: 400,
  CHARACTER_UNAVAILABLE: 403,
  NOT_CONFIGURED: 500,
  AUTH: 502,
  QUOTA: 503,
  TIMEOUT: 504,
  UPSTREAM_UNREACHABLE: 502,
  UPSTREAM_ERROR: 502,
  EMPTY: 502,
  INTERRUPTED: 499,
};

function errorResponse(code: ChatErrorCode): Response {
  return Response.json({ error: { code } }, { status: STATUS_BY_CODE[code] ?? 500 });
}

const log = (msg: string) => console.log(`[api/chat] ${msg}`);

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("BAD_REQUEST");
  }

  const v = validateChatBody(body);
  if (!v.ok) return errorResponse(v.code);

  let started;
  try {
    started = await startChatStream({
      pool: getKeyPool(),
      factory: geminiStreamFactory,
      model: getModelName(),
      systemInstruction: getSystemPrompt(v.characterId),
      contents: buildContents(v.characterId, v.messages),
      signal: req.signal,
      log,
    });
  } catch (err) {
    const code = err instanceof ChatStreamError ? err.code : "UPSTREAM_ERROR";
    log(`thất bại: ${code}`);
    return errorResponse(code);
  }

  const encoder = new TextEncoder();
  const line = (e: StreamEvent) => encoder.encode(JSON.stringify(e) + "\n");
  const { firstText, rest } = started;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(line({ type: "delta", text: firstText }));
        for await (const text of rest) {
          controller.enqueue(line({ type: "delta", text }));
        }
        controller.enqueue(line({ type: "done" }));
      } catch (err) {
        const code = err instanceof ChatStreamError ? err.code : "INTERRUPTED";
        try {
          controller.enqueue(line({ type: "error", code }));
        } catch {
          // trình duyệt đã ngắt, bỏ qua
        }
      } finally {
        try {
          controller.close();
        } catch {
          // đã đóng
        }
      }
    },
    async cancel() {
      // Trình duyệt hủy (bấm "Cuộc trò chuyện mới" hoặc đóng tab): dừng gọi AI.
      await rest.return(undefined);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
