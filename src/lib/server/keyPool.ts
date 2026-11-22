import "server-only";

// Key pool: xoay vòng nhiều khóa Gemini (mỗi khóa thuộc một project riêng nên quota tách biệt).
// Khóa lỗi (hết quota, bị từ chối, quá tải) bị tạm "nghỉ" một thời gian rồi mới dùng lại.
// Không bao giờ log giá trị khóa; chỉ log số thứ tự (#1, #2, ...).

export type KeyFailure = "quota" | "auth" | "overloaded";

/** Thời gian nghỉ (ms) theo loại lỗi. */
export const COOLDOWN_MS: Record<KeyFailure, number> = {
  quota: 60_000,
  auth: 10 * 60_000,
  overloaded: 10_000,
};

export interface PoolKey {
  /** Số thứ tự 1-based, chỉ dùng để log. */
  index: number;
  value: string;
}

export class KeyPool {
  private readonly keys: PoolKey[];
  private cursor = 0;
  private readonly cooldownUntil = new Map<number, number>();

  constructor(values: string[], private readonly now: () => number = Date.now) {
    this.keys = values.map((value, i) => ({ index: i + 1, value }));
  }

  get size(): number {
    return this.keys.length;
  }

  /**
   * Thứ tự khóa để thử cho một lượt: bắt đầu từ con trỏ xoay vòng, khóa đang nghỉ xếp cuối
   * (vẫn được thử nếu mọi khóa khác đều lỗi). Mỗi lần gọi đẩy con trỏ lên một bước.
   */
  candidates(): PoolKey[] {
    if (this.keys.length === 0) return [];
    const start = this.cursor % this.keys.length;
    this.cursor = (this.cursor + 1) % this.keys.length;
    const ordered = [...this.keys.slice(start), ...this.keys.slice(0, start)];
    const t = this.now();
    const ready = ordered.filter((k) => (this.cooldownUntil.get(k.index) ?? 0) <= t);
    const resting = ordered
      .filter((k) => (this.cooldownUntil.get(k.index) ?? 0) > t)
      .sort((a, b) => this.cooldownUntil.get(a.index)! - this.cooldownUntil.get(b.index)!);
    return [...ready, ...resting];
  }

  markFailure(key: PoolKey, kind: KeyFailure): void {
    this.cooldownUntil.set(key.index, this.now() + COOLDOWN_MS[kind]);
  }

  markSuccess(key: PoolKey): void {
    this.cooldownUntil.delete(key.index);
  }

  isResting(key: PoolKey): boolean {
    return (this.cooldownUntil.get(key.index) ?? 0) > this.now();
  }
}

/** Đọc GEMINI_API_KEYS (phân tách bằng dấu phẩy, chấm phẩy hoặc xuống dòng). */
export function parseKeys(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(/[,;\s]+/)) {
    const k = part.trim();
    if (k) seen.add(k);
  }
  return [...seen];
}

const globalForPool = globalThis as unknown as { __dvhkKeyPool?: KeyPool };

/** Pool dùng chung trong tiến trình server (giữ qua các lần hot-reload ở chế độ dev). */
export function getKeyPool(): KeyPool {
  if (!globalForPool.__dvhkKeyPool) {
    globalForPool.__dvhkKeyPool = new KeyPool(parseKeys(process.env.GEMINI_API_KEYS));
  }
  return globalForPool.__dvhkKeyPool;
}
