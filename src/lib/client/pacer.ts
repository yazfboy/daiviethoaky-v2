/**
 * Bộ nhả chữ đều: AI thường trả về từng cụm lớn, bộ này nhả dần ra màn hình (~60 nhịp/giây)
 * để chữ luôn "chạy dần" thay vì đổ ra cả khối. Phần tồn càng nhiều thì nhả càng nhanh.
 */
export interface Pacer {
  push(text: string): void;
  /** Chờ nhả hết phần đã nhận. */
  drain(): Promise<void>;
  /** Nhả ngay toàn bộ phần còn lại (dùng khi lỗi). */
  flush(): void;
  /** Bỏ phần còn lại, dừng hẳn (dùng khi hủy). */
  cancel(): void;
}

const TICK_MS = 16;
const MIN_CHARS_PER_TICK = 2;
const BACKLOG_DIVISOR = 40;

export function createPacer(emit: (text: string) => void): Pacer {
  let buffer = "";
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let waiters: (() => void)[] = [];

  const resolveWaiters = () => {
    const w = waiters;
    waiters = [];
    w.forEach((fn) => fn());
  };

  const tick = () => {
    timer = null;
    if (stopped) return;
    if (buffer) {
      // Tab bị ẩn thì nhả hết luôn (trình duyệt làm chậm hẹn giờ ở tab ẩn).
      const hidden = typeof document !== "undefined" && document.hidden;
      let n = hidden ? buffer.length : Math.max(MIN_CHARS_PER_TICK, Math.ceil(buffer.length / BACKLOG_DIVISOR));
      // Không cắt đôi cặp surrogate (ký tự ngoài BMP).
      if (n < buffer.length) {
        const code = buffer.charCodeAt(n - 1);
        if (code >= 0xd800 && code <= 0xdbff) n += 1;
      }
      emit(buffer.slice(0, n));
      buffer = buffer.slice(n);
    }
    if (buffer) timer = setTimeout(tick, TICK_MS);
    else resolveWaiters();
  };

  return {
    push(text) {
      if (stopped || !text) return;
      buffer += text.normalize("NFC");
      if (!timer) timer = setTimeout(tick, TICK_MS);
    },
    drain() {
      if (!buffer || stopped) return Promise.resolve();
      return new Promise((resolve) => waiters.push(resolve));
    },
    flush() {
      if (timer) clearTimeout(timer);
      timer = null;
      if (buffer && !stopped) emit(buffer);
      buffer = "";
      resolveWaiters();
    },
    cancel() {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
      buffer = "";
      resolveWaiters();
    },
  };
}
