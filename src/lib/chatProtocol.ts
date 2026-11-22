// Giao thức giữa trình duyệt và POST /api/chat (dùng chung hai phía).
//
// Request:  { characterId, messages: [{ role: "user" | "model", text }] }
//           (không gồm lời chào mở đầu; server tự chèn lời chào vào đầu lịch sử)
// Response thành công: HTTP 200, Content-Type application/x-ndjson, mỗi dòng một sự kiện:
//   {"type":"delta","text":"..."}   một đoạn chữ mới
//   {"type":"done"}                 trả lời xong
//   {"type":"error","code":"..."}   lỗi giữa chừng
//   Nếu luồng kết thúc mà không có "done" thì coi là mất kết nối.
// Response lỗi trước khi có chữ đầu: HTTP 4xx/5xx, JSON { error: { code } }.

export type ChatRole = "user" | "model";

export interface ChatTurn {
  role: ChatRole;
  text: string;
}

export interface ChatRequestBody {
  characterId: string;
  messages: ChatTurn[];
}

export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; code: ChatErrorCode };

export type ChatErrorCode =
  | "BAD_REQUEST" // dữ liệu gửi lên sai
  | "CHARACTER_UNAVAILABLE" // nhân vật chưa mở
  | "NOT_CONFIGURED" // server chưa có khóa API
  | "AUTH" // mọi khóa đều bị từ chối (sai / hết hạn)
  | "QUOTA" // mọi khóa đều hết hạn mức
  | "TIMEOUT" // AI không phản hồi kịp
  | "UPSTREAM_UNREACHABLE" // server không kết nối được tới dịch vụ AI
  | "UPSTREAM_ERROR" // dịch vụ AI lỗi khác
  | "EMPTY" // AI không trả về chữ nào
  | "INTERRUPTED" // đang trả lời thì đứt
  | "NETWORK"; // trình duyệt không gọi được server (chỉ dùng phía client)

const MESSAGES: Record<ChatErrorCode, string> = {
  BAD_REQUEST: "Câu hỏi gửi đi không hợp lệ. Hãy thử gửi lại.",
  CHARACTER_UNAVAILABLE: "Nhân vật này chưa mở trò chuyện.",
  NOT_CONFIGURED: "Máy chủ chưa được cấu hình khóa AI. Hãy kiểm tra file .env rồi khởi động lại.",
  AUTH: "Dịch vụ AI từ chối khóa truy cập (khóa sai hoặc đã hết hạn). Hãy kiểm tra khóa trong .env rồi gửi lại.",
  QUOTA: "Tất cả khóa AI đều đã hết hạn mức tạm thời. Hãy chờ ít phút rồi gửi lại.",
  TIMEOUT: "Dịch vụ AI phản hồi quá chậm. Hãy gửi lại.",
  UPSTREAM_UNREACHABLE: "Máy chủ không kết nối được tới dịch vụ AI. Hãy kiểm tra mạng rồi gửi lại.",
  UPSTREAM_ERROR: "Dịch vụ AI đang gặp trục trặc. Hãy gửi lại sau giây lát.",
  EMPTY: "Tướng quân chưa đáp được câu này. Hãy gửi lại hoặc hỏi theo cách khác.",
  INTERRUPTED: "Kết nối bị ngắt khi tướng quân đang trả lời. Hãy gửi lại.",
  NETWORK: "Không kết nối được tới máy chủ. Hãy kiểm tra mạng rồi gửi lại.",
};

export function errorMessage(code: string): string {
  return MESSAGES[code as ChatErrorCode] ?? MESSAGES.UPSTREAM_ERROR;
}
