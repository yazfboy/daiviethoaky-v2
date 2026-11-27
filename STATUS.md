# STATUS.md — Đại Việt Họa Ký

## Trạng thái các Phase
- Phase 1 (khung web, chọn nhân vật, chat stream): **Đã xong** (QA: PASS AC)
- Phase 2 (đủ 4 nhân vật, chất lượng nhập vai, bộ kiểm thử): **Đã xong** (QA: PASS AC lần 7, commit `f563bd4`)
- Phase 3 (AI Đạo diễn + minh họa ảnh tư liệu có ghi nguồn): **Đã xong** (QA: PASS AC lần test đầu)
- Phase 4 (video: công tắc, phát đúng đoạn) · Phase 5 (tranh AI dự phòng, gắn nhãn) · Phase 6 (motion & humanize, responsive) · Phase 7 (ổn định, giới hạn tần suất, 18+, thông báo dữ liệu, URL public, kịch bản demo): Chưa làm

## Stack & Lệnh chạy
- Next.js 16 (App Router, Route Handler) + React 19 + TypeScript, Node.js >= 20.9; Tailwind CSS 4; font Noto Serif + Cormorant Garamond qua `next/font` (tự host)
- AI: Gemini qua `@google/genai`. Chat `gemini-3.5-flash-lite` (suy nghĩ `minimal`, nhiệt độ 0.5). Đạo diễn: chính `gemini-3.1-flash-lite`, dự phòng `gemini-3.5-flash-lite` (suy nghĩ `minimal`, nhiệt độ 0)
- `npm install` → chép `.env.example` thành `.env`, điền khóa → `npm run dev`, hoặc `npm run build` + `npm start` → http://localhost:3000 (sửa `.env` phải khởi động lại)
- `npm test` (Vitest, 10 file / 90 test) · `npm run typecheck`
- `npm run eval`: bộ nhập vai 61 câu → `eval/ket-qua.md` (lọc `EVAL_ONLY` / `EVAL_CASES` → `ket-qua-loc.md`)
- `npm run eval:director`: bộ đạo diễn 32 câu + kiểm link toàn kho ảnh → `eval/dao-dien/ket-qua.md` (lọc `DIRECTOR_EVAL_ONLY` / `DIRECTOR_EVAL_CASES`, bỏ kiểm link `DIRECTOR_EVAL_SKIP_LINKS=1`)
- `npm run do:chu-dau`: đo chữ đầu tắt/bật đạo diễn trên server đang chạy (`BASE_URL`, `DO_CHU_DAU_LAN`) → `eval/do-chu-dau.md`; không chạy cùng lúc với eval
- `.env` (chỉ server đọc, KHÔNG commit): `GEMINI_API_KEYS` bắt buộc · tùy chọn `GEMINI_MODEL`, `GEMINI_THINKING_LEVEL`, `GEMINI_TEMPERATURE`, `DIRECTOR_MODEL`, `DIRECTOR_FALLBACK_MODEL` (`none` = bỏ dự phòng), `DIRECTOR_ENABLED` (`false` = tắt), `DIRECTOR_THINKING_LEVEL`; eval: `EVAL_JUDGE_MODELS`, `EVAL_JUDGE_VOTES`, `EVAL_CONCURRENCY`, `EVAL_JUDGE_TIMEOUT_MS` (mặc định 60000)

## Bản đồ file/thư mục chính (toàn dự án)
- `src/app/page.tsx` (chọn nhân vật) · `src/app/tro-chuyen/[characterId]/page.tsx` (màn chat) · `layout.tsx`, `globals.css`, `icon.svg`
- `src/app/api/chat/route.ts`: POST /api/chat → NDJSON (`delta`/`done`/`error`)
- `src/app/api/director/route.ts`: POST /api/director → `{shot, reason}`, luôn 200 trừ body sai (400)
- `src/components/`: `ChatScreen.tsx` (chat, lịch sử, gọi đạo diễn song song, dấu "Có tư liệu"), `IllustrationPanel.tsx` (vùng minh họa), `MediaViewer.tsx` (xem bản lớn bằng `<dialog>`), `MediaCredit.tsx` (nhãn + chú thích + nguồn), `AiNotice.tsx`
- `src/lib/`: `characters.ts`, `chatProtocol.ts`, `directorProtocol.ts` (Shot: `none` | `image`), `text.ts`
- `src/lib/media/`: `catalog.ts` (kho 19 chủ đề / 34 ảnh đã duyệt, `PRESENT_YEAR`), `urls.ts` (URL cỡ chuẩn, host được phép, nhãn loại ảnh, giấy phép), `types.ts`, `smallTalk.ts` (lọc chào hỏi / cảm ơn)
- `src/lib/server/`: `keyPool.ts`, `chatStream.ts`, `gemini.ts`, `conversation.ts`, `director.ts` (AI Đạo diễn), `personas/` (prompt, `topicCards.ts`)
- `src/lib/client/`: `chatClient.ts`, `chatStorage.ts`, `pacer.ts`, `directorClient.ts` (gọi đạo diễn, tải trước ảnh)
- `docs/ho-so-nhan-vat.md`: hồ sơ nhân vật đã duyệt · `eval/` (nhập vai), `eval/dao-dien/` (đạo diễn), `eval/do-chu-dau.md` · `scripts/do-chu-dau.mjs` · `tests/`

## Thư viện & Quyết định kỹ thuật quan trọng (cộng dồn)
- Khóa API chỉ dùng trong `src/lib/server/*` (`server-only`); trình duyệt chỉ gửi `{characterId, messages}` (+ `shown` cho đạo diễn)
- Key pool chat xoay vòng; khóa lỗi nghỉ: 429 → 60 s, 401/403 → 10 phút, 5xx/chậm → 10 s. Gửi song song có trễ 2 s (tối đa 3), mỗi khóa 12 s, cả lượt 25 s; server 20 s không có chữ → đứt; trình duyệt 40 s
- Lịch sử: server giữ 60 lượt gần nhất + lượt mở màn ẩn + lời chào. localStorage `dvhk:chat:v1:<characterId>`, mỗi nhân vật một khóa; Phase 3 thêm trường tùy chọn `media: [{kind:"image", id}]` ở lượt đáp, lịch sử cũ vẫn đọc được
- Nhập vai: xưng hô cố định theo nhân vật (ta/khách 939, ta/túc hạ 1300, lão phu/hiền hữu 1439, trẫm/khanh 1791); hiểu biết dừng ở năm "hiện tại"; thẻ sự thật theo từ khóa nối cuối prompt (`getTurnSystemPrompt`); `cleanModelText` sửa can chi, chữ Hán, chữ tục, Markdown
- Đạo diễn chạy độc lập với /api/chat, không chặn lời thoại; mọi lỗi → "không ảnh", không báo lỗi vào chat
- Quyết định có ảnh qua 4 lớp: lọc câu xã giao (không gọi AI) → AI chọn MỘT mã chủ đề trong danh sách đóng của nhân vật (enum JSON) hoặc `none` → lấy ảnh chưa hiện của chủ đề → trình duyệt chỉ hiện nếu ảnh tải được và lượt chat không lỗi
- AI không viết chú thích hay chọn URL; ảnh, chú thích, nhãn lấy từ kho đã duyệt. Mỗi ảnh thuộc đúng một chủ đề; chủ đề chỉ mở cho nhân vật sống sau năm của nó
- Gọi đạo diễn: song song có trễ 1,5 s, tối đa 3 lần (lần 1 model chính, từ lần 2 model dự phòng), mỗi lần 5 s, cả lượt 9 s; trình duyệt chờ 11 s. Mỗi model một key pool riêng (không đụng pool chat); khóa 403 bị cho nghỉ ở mọi pool đạo diễn
- Ảnh hiện sớm nhất khi nhân vật bắt đầu nói; lượt mới không có ảnh thì giữ ảnh gần nhất, ghi "Ảnh của một lượt hỏi trước"; bấm "Có tư liệu" để hiện lại ảnh của lượt đó
- Nguồn ảnh duy nhất: Wikimedia Commons, nhúng thẳng (không tải về). Host: `upload.wikimedia.org`, `thumb.wikimedia.org`. Chỉ cỡ chuẩn 500/960/1280 px (cỡ khác bị trả 400). Giấy phép nhận: PD, CC0, CC BY, CC BY-SA. Dùng `<img>` thường, không dùng `next/image`
- Header CSP `img-src 'self' data: blob: upload.wikimedia.org thumb.wikimedia.org` trong `next.config.ts`; `compress: false` để stream không bị gom
- Mỗi ảnh hiện: nhãn loại ảnh bắt buộc (ảnh chụp ngày nay / tượng, tranh đời sau, không phải chân dung thật / mô hình / bản in đời sau / bản phục chế) + chú thích viết tay + tác giả · giấy phép (link) · link trang Commons
- Log server mỗi lượt: `[dao-dien] <nhân vật> · lượt N · "<≤40 ký tự>" → ẢNH chủ đề / mã ảnh | KHÔNG ẢNH · lý do · thời gian · khóa · model`
- Eval: mỗi lần chấm của giám khảo giới hạn 60 s; quá giờ thì cặp (model, khóa) nghỉ 10 s rồi chấm lại, hết lượt thì ghi "LỖI HẠ TẦNG" (kết nối đứt ngầm khi máy ngủ không còn treo cả bộ)
- Script tuyển ảnh / kiểm link Commons: User-Agent chung, tuần tự, giãn ≥ 5 s cho lệnh tìm (API Commons trả 429 nếu gọi dồn)

## Mock tạm / Nợ kỹ thuật / Điểm lệch PLAN.md
- Kho ảnh chỉ có 19 chủ đề (mỗi nhân vật 4–9); chủ đề ngoài kho không có ảnh (chờ tranh AI ở Phase 5). Chưa có ảnh cho Hịch tướng sĩ, Vân Đồn, Diên Hồng, Chi Lăng
- Ảnh tượng hiện đại ở Việt Nam có thể bị Commons xóa (vướng bản quyền nhà điêu khắc) → ảnh tự ẩn; chạy `npm run eval:director` định kỳ để kiểm link
- Ảnh Bình Ngô đại cáo là PNG nặng (~0,5 MB ở cỡ 500 px)
- `gemini-3.1-flash-lite` hay chậm / 503 nên lúc đo 18–20/28 lượt dùng model dự phòng → phần lớn lượt đạo diễn đang tốn hạn mức `gemini-3.5-flash-lite` của chat. Điểm lệch so với đề xuất ban đầu (model riêng hoàn toàn), Manager đã duyệt
- Khi Gemini quá tải, thỉnh thoảng một lượt không có ảnh dù đúng chủ đề
- Bug #11 [NGOÀI AC], hoãn: kiểm tra cứng của eval đánh trượt lời đáp đúng sử nhưng không có từ xưng hô nào
- Bug #13 [NGOÀI AC], hoãn: Nguyễn Trãi đôi khi tự xưng "ta", nói "thời khác", hoặc dính chữ khi lọc chữ Hán
- Trượt ngẫu nhiên hiếm ở eval nhập vai (vd `nt-10` có lần đoán mò "Internet"); một lần eval có thể trượt vì một câu → chạy lại
- Eval dựa vào gói miễn phí: giám khảo `gemini-3.5-flash` hết hạn mức nhanh (đặt lại ~15:00 giờ VN); giám khảo LLM có lúc dễ dãi → vẫn đọc lời đáp trong `ket-qua.md`
- Khóa #6, #7 trong `.env` bị Google trả 403; key pool và trạng thái nghỉ chỉ nằm trong bộ nhớ một tiến trình
- Gửi song song có trễ (chat và đạo diễn) có thể tăng số lần gọi API khi Gemini chậm → xử lý chi phí ở Phase 7. Chưa giới hạn tần suất, chưa có bước 18+ và thông báo dữ liệu (Phase 7)
- Ô nhập tự giãn nhờ CSS `field-sizing` (Firefox chưa hỗ trợ); cold start chữ đầu có thể tới ~3,5 s
- Số đo chữ đầu cùng câu hỏi (`eval/do-chu-dau.md`, lần QA): trung vị tắt đạo diễn 0,88 s / bật 0,87 s
