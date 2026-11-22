# STATUS.md — Đại Việt Họa Ký

## Trạng thái các Phase
- Phase 1 (khung web, chọn nhân vật, chat stream với Trần Hưng Đạo): **Đã xong** (QA: PASS AC)
- Phase 2 (đủ 4 nhân vật, chất lượng nhập vai, bộ câu hỏi kiểm thử chuẩn): **Đang làm**
- Phase 3 (AI Đạo diễn + minh họa ảnh có ghi nguồn): Chưa làm
- Phase 4 (minh họa video: công tắc bật/tắt, phát đúng đoạn): Chưa làm
- Phase 5 (tranh AI vẽ dự phòng, gắn nhãn): Chưa làm
- Phase 6 (motion & humanize: chuyển trang, hiệu ứng, rà giao diện, responsive): Chưa làm
- Phase 7 (ổn định & triển khai: trạng thái chờ/lỗi, giới hạn tần suất, xác nhận 18+, thông báo dữ liệu, URL public, kịch bản demo): Chưa làm

## Stack & Lệnh chạy (stack giữ cố định)
- Next.js 16 (App Router, Route Handler) + React 19 + TypeScript, Node.js >= 20.9 (đã chạy trên Node 24)
- AI: Google Gemini qua SDK chính thức `@google/genai`, model mặc định `gemini-3.5-flash-lite`, mức suy nghĩ `minimal`
- Giao diện: Tailwind CSS 4; font Noto Serif + Cormorant Garamond (bộ chữ tiếng Việt) qua `next/font`, tự host
- Test: Vitest (`tests/`)
- Máy mới: cài Node.js LTS → `npm install` → sao chép `.env.example` thành `.env` và điền khóa → `npm run dev`, hoặc `npm run build` rồi `npm start` → mở http://localhost:3000 (sửa `.env` thì phải khởi động lại)
- Test: `npm test` · Kiểm tra kiểu: `npm run typecheck`
- Biến môi trường (`.env`, chỉ server đọc, KHÔNG commit):
  - `GEMINI_API_KEYS` (bắt buộc): nhiều khóa ngăn cách bằng dấu phẩy, mỗi khóa thuộc một project riêng
  - `GEMINI_MODEL` (tùy chọn): mặc định `gemini-3.5-flash-lite`
  - `GEMINI_THINKING_LEVEL` (tùy chọn): `minimal` | `low` | `medium` | `high` | `none`; mặc định `minimal`

## Bản đồ file/thư mục chính
- `src/app/page.tsx`: màn chọn 4 nhân vật · `src/app/tro-chuyen/[characterId]/page.tsx`: màn chat (nhân vật chưa mở thì báo "Sắp ra mắt")
- `src/app/api/chat/route.ts`: POST /api/chat, trả luồng NDJSON (`delta` / `done` / `error`)
- `src/app/layout.tsx`, `globals.css` (bảng màu cổ phong), `icon.svg` (favicon ấn triện)
- `src/components/`: `ChatScreen.tsx` (chat, lịch sử, lỗi, Gửi lại), `IllustrationPanel.tsx` (vùng minh họa trống), `AiNotice.tsx` (dòng cảnh báo AI)
- `src/lib/characters.ts`: dữ liệu công khai 4 nhân vật + lời chào · `src/lib/chatProtocol.ts`: giao thức + thông báo lỗi tiếng Việt
- `src/lib/server/`: `keyPool.ts`, `chatStream.ts` (gửi song song có trễ, timeout, phân loại lỗi), `gemini.ts`, `conversation.ts`, `personas/tranHungDao.ts`
- `src/lib/client/`: `chatClient.ts` (đọc luồng), `chatStorage.ts` (localStorage), `pacer.ts` (nhả chữ đều)
- `tests/`: unit test cho key pool, conversation, chatStream, pacer (25 test)

## Thư viện & Quyết định kỹ thuật quan trọng
- Khóa API chỉ dùng trong `src/lib/server/*` (có `import "server-only"`); trình duyệt chỉ gửi `{characterId, messages}`
- Key pool: mỗi lượt bắt đầu ở khóa kế tiếp (xoay vòng). Khóa lỗi bị cho nghỉ: 429 → 60 giây, 401/403 → 10 phút, 5xx hoặc quá chậm → 10 giây
- Gửi song song có trễ: sau 2 giây chưa có chữ thì gọi thêm khóa kế (tối đa 3 yêu cầu cùng lúc). Mỗi khóa chờ tối đa 12 giây, cả lượt tối đa 25 giây
- Đã có chữ đầu thì không đổi khóa. Server: quá 20 giây không có chữ mới → báo đứt. Trình duyệt: quá 40 giây không nhận được byte nào → báo lỗi
- Lịch sử: trình duyệt gửi toàn bộ lịch sử mỗi lượt, server giữ 60 lượt gần nhất. Lời chào mở đầu là chữ cố định, server chèn vào đầu lịch sử để AI nhớ
- Prompt nhập vai: xưng "ta", gọi người dùng là "túc hạ", hiểu biết dừng ở năm 1300, văn xuôi không Markdown. Màn hình còn tự lọc Markdown (`src/lib/text.ts`)
- localStorage key `dvhk:chat:v1:<characterId>`; chỉ lưu những lượt đã trả lời xong
- Nhân vật mới (Phase 2): thêm vào `characters.ts` (đặt `available: true` + `greeting`), viết prompt trong `personas/`, rồi đăng ký trong `SYSTEM_PROMPTS` ở `conversation.ts`
- `next.config.ts`: `compress: false` để stream không bị gom lại

## Mock tạm / Nợ kỹ thuật / Điểm lệch PLAN.md
- Mock: vùng minh họa chỉ là khung trống (Phase 3). Ngô Quyền, Nguyễn Trãi, Quang Trung chỉ có thẻ "Sắp ra mắt", chưa có prompt (Phase 2)
- Khóa #6 và #7 trong `.env` bị Google trả 403 "free tier is not available for this project" (cần bật billing). Pool tự bỏ qua, 10 phút thử lại một lần
- Gửi song song có trễ có thể làm tăng số lần gọi API khi Gemini chậm → xử lý chi phí ở Phase 7
- Key pool và trạng thái nghỉ chỉ nằm trong bộ nhớ của một tiến trình (mất khi restart, không chia sẻ giữa nhiều instance)
- Chưa giới hạn tần suất gọi AI (Phase 7)
- AI thỉnh thoảng lệch chi tiết nhỏ (vd nói "hội nghị ở Đông Bộ Đầu", trong khi đó là nơi duyệt binh) → tinh chỉnh prompt ở Phase 2
- Ô nhập tự giãn chiều cao nhờ CSS `field-sizing`; Firefox chưa hỗ trợ nên ô nhập ở Firefox không tự giãn
- Lần cold start đầu tiên chữ đầu có thể chậm tới ~3,5 giây; khi Gemini quá tải có lượt tới ~5 giây (QA đo)
