import type { ChatErrorCode, ChatTurn, StreamEvent } from "@/lib/chatProtocol";

// Gọi POST /api/chat và đọc luồng NDJSON, gọi onDelta cho mỗi đoạn chữ mới.

export class ClientChatError extends Error {
  constructor(public readonly code: ChatErrorCode | "ABORTED") {
    super(code);
    this.name = "ClientChatError";
  }
}

/** Không nhận thêm byte nào trong khoảng này thì coi là mất kết nối (trang không treo vô hạn). */
const IDLE_TIMEOUT_MS = 40_000;

export async function streamChat(opts: {
  characterId: string;
  messages: ChatTurn[];
  signal: AbortSignal;
  onDelta: (text: string) => void;
}): Promise<void> {
  const ac = new AbortController();
  let timedOut = false;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const armIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      timedOut = true;
      ac.abort();
    }, IDLE_TIMEOUT_MS);
  };
  const onOuterAbort = () => ac.abort();
  opts.signal.addEventListener("abort", onOuterAbort, { once: true });

  const fail = (code: ChatErrorCode): never => {
    if (opts.signal.aborted) throw new ClientChatError("ABORTED");
    if (timedOut) throw new ClientChatError(code === "NETWORK" ? "TIMEOUT" : "INTERRUPTED");
    throw new ClientChatError(code);
  };

  try {
    armIdle();
    let res: Response;
    try {
      res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: opts.characterId, messages: opts.messages }),
        signal: ac.signal,
      });
    } catch {
      return fail("NETWORK");
    }

    if (!res.ok || !res.body) {
      let code: ChatErrorCode = "UPSTREAM_ERROR";
      try {
        const data = (await res.json()) as { error?: { code?: ChatErrorCode } };
        if (data?.error?.code) code = data.error.code;
      } catch {
        // phản hồi không phải JSON (vd server sập)
      }
      return fail(code);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let done = false;

    const handleLine = (raw: string) => {
      const s = raw.trim();
      if (!s) return;
      let ev: StreamEvent;
      try {
        ev = JSON.parse(s) as StreamEvent;
      } catch {
        return;
      }
      if (ev.type === "delta") opts.onDelta(ev.text);
      else if (ev.type === "done") done = true;
      else if (ev.type === "error") fail(ev.code);
    };

    while (true) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch {
        return fail("INTERRUPTED");
      }
      armIdle();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        handleLine(buffer.slice(0, nl));
        buffer = buffer.slice(nl + 1);
      }
    }
    buffer += decoder.decode();
    handleLine(buffer);
    if (!done) fail("INTERRUPTED");
  } finally {
    clearTimeout(idleTimer);
    opts.signal.removeEventListener("abort", onOuterAbort);
  }
}
