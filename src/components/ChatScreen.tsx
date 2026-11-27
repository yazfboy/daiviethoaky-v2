"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AiNotice } from "@/components/AiNotice";
import { IllustrationPanel } from "@/components/IllustrationPanel";
import { MAX_USER_MESSAGE_CHARS, type Character } from "@/lib/characters";
import { errorMessage, type ChatErrorCode } from "@/lib/chatProtocol";
import { ClientChatError, streamChat } from "@/lib/client/chatClient";
import { preloadImage, requestShot } from "@/lib/client/directorClient";
import { createPacer } from "@/lib/client/pacer";
import { clearHistory, loadHistory, newId, saveHistory, type StoredMessage } from "@/lib/client/chatStorage";
import { getImage } from "@/lib/media/catalog";
import { isSmallTalk } from "@/lib/media/smallTalk";
import type { ImageMedia } from "@/lib/media/types";
import { imageSrcSet, imageUrl, PANEL_SIZES, PANEL_WIDTHS } from "@/lib/media/urls";
import { cleanModelText } from "@/lib/text";

interface UiMessage extends StoredMessage {
  /** streaming: đang chạy chữ; error: bị lỗi giữa chừng (không lưu vào lịch sử). */
  status?: "streaming" | "error";
}

/** Ảnh dùng được của một lượt đáp (bỏ mã không còn trong kho và ảnh đã hỏng link). */
function imageOf(m: UiMessage, broken: Set<string>): ImageMedia | null {
  if (m.role !== "model" || m.status === "error" || !m.media) return null;
  for (const ref of m.media) {
    const img = ref.kind === "image" ? getImage(ref.id) : undefined;
    if (img && !broken.has(img.id)) return img;
  }
  return null;
}

export function ChatScreen({ character }: { character: Character }) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ChatErrorCode | null>(null);
  const [input, setInput] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  // Minh họa: lượt đáp đang được hiện ảnh (null: ảnh của lượt gần nhất có ảnh), đạo diễn đang tìm, ảnh hỏng link.
  const [activeMediaMsgId, setActiveMediaMsgId] = useState<string | null>(null);
  const [seeking, setSeeking] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(() => new Set());

  const busyRef = useRef(false);
  const runIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const directorAbortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Nạp lịch sử từ localStorage (chỉ chạy ở trình duyệt).
  useEffect(() => {
    const saved = loadHistory(character.id);
    setMessages(saved);
    // Câu hỏi cuối chưa có lời đáp (vd tải lại trang giữa lúc đang trả lời): cho phép gửi lại.
    if (saved.length > 0 && saved[saved.length - 1].role === "user") setError("INTERRUPTED");
    setHydrated(true);
  }, [character.id]);

  // Lưu những lượt đã hoàn tất (bỏ qua lượt đang chạy / bị lỗi), kèm minh họa của từng lượt.
  useEffect(() => {
    if (!hydrated) return;
    saveHistory(
      character.id,
      messages
        .filter((m) => !m.status)
        .map(({ id, role, text, media }) => (media?.length ? { id, role, text, media } : { id, role, text })),
    );
  }, [messages, hydrated, character.id]);

  // Hủy luồng chat và yêu cầu đạo diễn khi rời trang (kể cả đổi nhân vật).
  useEffect(
    () => () => {
      abortRef.current?.abort();
      directorAbortRef.current?.abort();
    },
    [],
  );

  // Tự cuộn xuống cuối nếu người dùng đang ở gần cuối.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, error, hydrated]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const run = useCallback(
    async (history: StoredMessage[]) => {
      if (busyRef.current) return;
      busyRef.current = true;
      const runId = ++runIdRef.current;
      const ac = new AbortController();
      abortRef.current = ac;
      const replyId = newId();

      setBusy(true);
      setError(null);
      stickToBottomRef.current = true;
      setMessages([...history, { id: replyId, role: "model", text: "", status: "streaming" }]);

      const pacer = createPacer((piece) => {
        if (runIdRef.current !== runId) return;
        setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, text: m.text + piece } : m)));
      });
      ac.signal.addEventListener("abort", () => pacer.cancel(), { once: true });

      // AI Đạo diễn chạy song song với lời thoại: không chờ, không chặn; lỗi thì chỉ là không có ảnh.
      directorAbortRef.current?.abort();
      const dac = new AbortController();
      directorAbortRef.current = dac;
      let chatFailed = false;
      let markSpoken: () => void = () => {};
      const spoken = new Promise<void>((resolve) => (markSpoken = resolve));
      if (!isSmallTalk(history[history.length - 1]?.text ?? "")) setSeeking(true);
      void (async () => {
        const shot = await requestShot({
          characterId: character.id,
          messages: history.map(({ role, text }) => ({ role, text })),
          shown: history.flatMap((m) => m.media?.map((r) => r.id) ?? []),
          signal: dac.signal,
        });
        const img = shot.kind === "image" ? getImage(shot.mediaId) : undefined;
        if (!img) return;
        // Tải trước ảnh thẳng từ Wikimedia; tải lỗi thì bỏ, không hiện khung vỡ.
        if (!(await preloadImage(imageUrl(img, 500), imageSrcSet(img, PANEL_WIDTHS), PANEL_SIZES, dac.signal))) return;
        // Hiện sớm nhất khi nhân vật đã bắt đầu nói.
        await spoken;
        if (dac.signal.aborted || chatFailed) return;
        setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, media: [{ kind: "image", id: img.id }] } : m)));
        if (runIdRef.current === runId) setActiveMediaMsgId(replyId);
      })()
        .catch(() => {})
        .finally(() => {
          if (directorAbortRef.current === dac) setSeeking(false);
        });

      try {
        await streamChat({
          characterId: character.id,
          messages: history.map(({ role, text }) => ({ role, text })),
          signal: ac.signal,
          onDelta: (delta) => {
            pacer.push(delta);
            markSpoken();
          },
        });
        // Chờ nhả hết chữ rồi mới coi là trả lời xong (trong lúc này vẫn chặn gửi câu mới).
        await pacer.drain();
        if (runIdRef.current !== runId) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === replyId
              ? { id: m.id, role: m.role, text: cleanModelText(m.text), ...(m.media ? { media: m.media } : {}) }
              : m,
          ),
        );
      } catch (err) {
        // Lượt chat lỗi hoặc bị hủy: bỏ luôn minh họa của lượt này.
        chatFailed = true;
        dac.abort();
        if (runIdRef.current !== runId) return;
        const code = err instanceof ClientChatError ? err.code : "INTERRUPTED";
        if (code === "ABORTED") return;
        pacer.flush(); // hiện nốt phần chữ đã nhận trước khi báo lỗi
        // Giữ phần chữ đã nhận (đánh dấu lỗi); nếu chưa có chữ nào thì bỏ bong bóng trống.
        setMessages((prev) =>
          prev.flatMap((m) =>
            m.id !== replyId ? [m] : m.text ? [{ ...m, status: "error" as const, media: undefined }] : [],
          ),
        );
        setError(code);
      } finally {
        markSpoken();
        if (runIdRef.current === runId) {
          busyRef.current = false;
          abortRef.current = null;
          setBusy(false);
          // Trên điện thoại không tự bật bàn phím; trên máy tính trả con trỏ về ô nhập.
          if (window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus();
        }
      }
    },
    [character.id],
  );

  const send = () => {
    const text = input.trim();
    if (!text || busyRef.current || !hydrated) return;
    const history: StoredMessage[] = [
      ...messages.filter((m) => !m.status),
      { id: newId(), role: "user", text: text.slice(0, MAX_USER_MESSAGE_CHARS) },
    ];
    // Nếu lượt trước bị lỗi mà người dùng gõ câu mới: bỏ câu hỏi cũ chưa được đáp để lịch sử xen kẽ gọn.
    const lastDone = messages.filter((m) => !m.status);
    if (lastDone.length > 0 && lastDone[lastDone.length - 1].role === "user") {
      history.splice(history.length - 2, 1);
    }
    setInput("");
    void run(history);
  };

  const retry = () => {
    if (busyRef.current) return;
    const history = messages.filter((m) => !m.status);
    if (history.length === 0 || history[history.length - 1].role !== "user") {
      setError(null);
      return;
    }
    void run(history);
  };

  const resetConversation = () => {
    runIdRef.current++;
    abortRef.current?.abort();
    abortRef.current = null;
    directorAbortRef.current?.abort();
    directorAbortRef.current = null;
    setSeeking(false);
    setActiveMediaMsgId(null);
    busyRef.current = false;
    clearHistory(character.id);
    setMessages([]);
    setError(null);
    setBusy(false);
    setInput("");
    setConfirmReset(false);
    stickToBottomRef.current = true;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Không gửi khi bộ gõ tiếng Việt (Telex/VNI/IME) đang ghép chữ.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const canSend = hydrated && !busy && input.trim().length > 0;

  // Vùng minh họa hiện ảnh của lượt người dùng vừa bấm "Có tư liệu", nếu không thì ảnh của lượt gần nhất có ảnh.
  const withImage = messages.filter((m) => imageOf(m, brokenImages));
  const shownMsg =
    withImage.find((m) => m.id === activeMediaMsgId) ?? (withImage.length > 0 ? withImage[withImage.length - 1] : null);
  const panelImage = shownMsg ? imageOf(shownMsg, brokenImages) : null;
  const latestReply = [...messages].reverse().find((m) => m.role === "model" && m.status !== "error");
  const panelEarlier = !!shownMsg && !!latestReply && shownMsg.id !== latestReply.id;
  const markBroken = useCallback(
    (id: string) => setBrokenImages((prev) => (prev.has(id) ? prev : new Set(prev).add(id))),
    [],
  );

  return (
    <div className="flex h-dvh flex-col">
      {/* Thanh đầu */}
      <header className="border-b border-line bg-scroll/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-3 sm:gap-3 sm:px-6">
          <Link
            href="/"
            className="shrink-0 rounded px-1 py-1 text-sm text-ink-soft hover:text-cinnabar"
            aria-label="Về màn chọn nhân vật"
          >
            ←<span className="hidden sm:inline"> Chọn nhân vật</span>
          </Link>
          <span
            aria-hidden
            className="seal hidden h-10 min-w-10 shrink-0 items-center justify-center px-1.5 text-base sm:flex"
          >
            {character.seal}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display truncate text-xl leading-tight font-bold sm:text-2xl">{character.name}</h1>
            <p className="truncate text-xs text-ink-faint">{character.title}</p>
          </div>
          {confirmReset ? (
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={resetConversation}
                className="rounded-md bg-cinnabar px-2.5 py-1.5 text-xs font-medium text-scroll hover:bg-cinnabar-deep sm:text-sm"
              >
                Xóa và bắt đầu lại
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded-md border border-line px-2.5 py-1.5 text-xs text-ink-soft hover:bg-paper-deep sm:text-sm"
              >
                Thôi
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => (messages.length === 0 && !error ? resetConversation() : setConfirmReset(true))}
              className="shrink-0 rounded-md border border-cinnabar/40 px-2.5 py-1.5 text-xs font-medium text-cinnabar hover:bg-cinnabar/5 sm:text-sm"
            >
              Cuộc trò chuyện mới
            </button>
          )}
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-2 sm:px-6">
          <AiNotice />
        </div>
      </header>

      {/* Thân: cột chat + vùng minh họa */}
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-0 md:flex-row md:gap-6 md:px-6 md:py-4">
        <IllustrationPanel image={panelImage} seeking={seeking} earlier={panelEarlier} onBroken={markBroken} />

        <section aria-label="Cuộc trò chuyện" className="flex min-h-0 min-w-0 flex-1 flex-col md:order-first">
          <div
            ref={scrollRef}
            onScroll={onScroll}
            role="log"
            aria-live="polite"
            aria-busy={busy}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-1"
          >
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {character.greeting && (
                <ModelBubble name={character.title} text={character.greeting} className="fade-in" />
              )}
              {messages.map((m) =>
                m.role === "user" ? (
                  <UserBubble key={m.id} text={m.text} />
                ) : (
                  <ModelBubble
                    key={m.id}
                    name={character.title}
                    text={m.text}
                    streaming={m.status === "streaming"}
                    broken={m.status === "error"}
                    hasMedia={!!imageOf(m, brokenImages)}
                    mediaActive={shownMsg?.id === m.id}
                    onShowMedia={() => setActiveMediaMsgId(m.id)}
                  />
                ),
              )}
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-cinnabar/50 bg-cinnabar/5 px-4 py-3 text-sm text-cinnabar-deep"
                >
                  <p>{errorMessage(error, character.title)}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={retry}
                      disabled={busy}
                      className="rounded-md bg-cinnabar px-3 py-1.5 text-sm font-medium text-scroll hover:bg-cinnabar-deep disabled:opacity-50"
                    >
                      Gửi lại
                    </button>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="rounded-md px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-deep"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ô nhập */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="border-t border-line bg-scroll/90 px-3 py-3 md:rounded-lg md:border md:px-4"
          >
            <div className="mx-auto flex max-w-3xl items-end gap-2">
              <label htmlFor="chat-input" className="sr-only">
                Câu hỏi của bạn
              </label>
              <textarea
                id="chat-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                maxLength={MAX_USER_MESSAGE_CHARS}
                placeholder={`Thưa ${character.title}…`}
                className="field-sizing-content max-h-36 min-h-11 min-w-0 flex-1 resize-none rounded-md border border-line bg-paper/60 px-3 py-2.5 text-base leading-snug text-ink placeholder:text-ink-faint focus:border-cinnabar/60 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!canSend}
                className="h-11 shrink-0 rounded-md bg-cinnabar px-4 text-sm font-medium text-scroll transition hover:bg-cinnabar-deep disabled:cursor-not-allowed disabled:bg-ink-faint/60"
              >
                {busy ? "Đang đáp…" : "Gửi"}
              </button>
            </div>
            <p className="mx-auto mt-1.5 hidden max-w-3xl text-[11px] text-ink-faint sm:block">
              Enter để gửi · Shift + Enter để xuống dòng
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}

function ModelBubble({
  name,
  text,
  streaming = false,
  broken = false,
  className = "",
  hasMedia = false,
  mediaActive = false,
  onShowMedia,
}: {
  name: string;
  text: string;
  streaming?: boolean;
  broken?: boolean;
  className?: string;
  /** Lượt này có ảnh minh họa: hiện dấu "Có tư liệu", bấm vào thì vùng minh họa hiện lại ảnh của lượt. */
  hasMedia?: boolean;
  mediaActive?: boolean;
  onShowMedia?: () => void;
}) {
  const shown = cleanModelText(text);
  return (
    <article className={`max-w-[92%] self-start sm:max-w-[85%] ${className}`}>
      <p className="font-display mb-1 text-sm font-semibold text-cinnabar">{name}</p>
      <div className="frame-double rounded-lg bg-scroll px-4 py-3 text-[15.5px] leading-relaxed sm:text-base">
        {streaming && !shown ? (
          <p className="text-ink-faint italic" aria-label={`${name} đang ngẫm nghĩ`}>
            Đang ngẫm nghĩ
            <span className="thinking-dot inline-block">.</span>
            <span className="thinking-dot inline-block">.</span>
            <span className="thinking-dot inline-block">.</span>
          </p>
        ) : (
          <p className={`break-words whitespace-pre-wrap ${streaming ? "caret" : ""}`}>{shown}</p>
        )}
        {broken && <p className="mt-2 text-xs text-cinnabar italic">(Lời đáp bị ngắt giữa chừng)</p>}
      </div>
      {hasMedia && (
        <button
          type="button"
          onClick={onShowMedia}
          aria-pressed={mediaActive}
          aria-label="Có tư liệu: hiện ảnh của lượt này ở vùng minh họa"
          className={`mt-1.5 inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs transition-colors ${
            mediaActive
              ? "border-cinnabar bg-cinnabar text-scroll"
              : "border-cinnabar/40 text-cinnabar hover:bg-cinnabar/5"
          }`}
        >
          <span aria-hidden className={`inline-block h-2 w-2 rotate-45 ${mediaActive ? "bg-scroll" : "bg-cinnabar"}`} />
          Có tư liệu
        </button>
      )}
    </article>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <article className="max-w-[88%] self-end sm:max-w-[75%]">
      <p className="mb-1 text-right text-xs text-ink-faint">Bạn</p>
      <div className="rounded-lg bg-ink/90 px-4 py-2.5 text-[15.5px] leading-relaxed text-scroll sm:text-base">
        <p className="break-words whitespace-pre-wrap">{text}</p>
      </div>
    </article>
  );
}
