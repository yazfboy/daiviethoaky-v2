import { MAX_SHOWN_IDS, type DirectorResponse } from "@/lib/directorProtocol";
import { validateChatBody } from "@/lib/server/conversation";
import { decideShot, formatDirectorLog } from "@/lib/server/director";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/director: AI Đạo diễn quyết định minh họa cho lượt hỏi mới nhất (xem src/lib/directorProtocol.ts).
// Chạy độc lập với /api/chat. Đạo diễn lỗi thì vẫn trả 200 với shot "none" để chat không bị ảnh hưởng.

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: { code: "BAD_REQUEST" } }, { status: 400 });
  }

  const v = validateChatBody(body);
  if (!v.ok) return Response.json({ error: { code: v.code } }, { status: 400 });

  const rawShown = (body as { shown?: unknown }).shown;
  const shown = Array.isArray(rawShown)
    ? rawShown.filter((s): s is string => typeof s === "string" && s.length <= 80).slice(0, MAX_SHOWN_IDS)
    : [];

  const outcome = await decideShot({ characterId: v.characterId, messages: v.messages, shown, signal: req.signal });
  console.log(formatDirectorLog(v.characterId, v.messages, outcome));

  const res: DirectorResponse = { shot: outcome.shot, reason: outcome.reason };
  return Response.json(res, { headers: { "Cache-Control": "no-store" } });
}
