# STATUS.md — Đại Việt Họa Ký

## Trạng thái các Phase
- Phase 1 (khung web, màn chọn nhân vật, chat stream với Trần Hưng Đạo): **Đã xong** (QA: PASS AC)
- Phase 2 (đủ 4 nhân vật, chất lượng nhập vai, bộ kiểm thử chuẩn): **Đã xong** (QA: PASS AC ở lần test thứ 7, commit `f563bd4`)
- Phase 3 (AI Đạo diễn + minh họa ảnh có ghi nguồn): Chưa làm
- Phase 4 (minh họa video: công tắc bật/tắt, phát đúng đoạn): Chưa làm
- Phase 5 (tranh AI vẽ dự phòng, gắn nhãn): Chưa làm
- Phase 6 (motion & humanize: chuyển trang, hiệu ứng, rà giao diện, responsive): Chưa làm
- Phase 7 (ổn định & triển khai: trạng thái chờ/lỗi, giới hạn tần suất, xác nhận 18+, thông báo dữ liệu, URL public, kịch bản demo): Chưa làm

## Stack & Lệnh chạy
- Stack giữ cố định: Next.js 16 (App Router, Route Handler) + React 19 + TypeScript, Node.js >= 20.9; Tailwind CSS 4; font Noto Serif + Cormorant Garamond qua `next/font` (tự host)
- AI: Gemini qua `@google/genai`; chat mặc định `gemini-3.5-flash-lite`, mức suy nghĩ `minimal`, độ ngẫu nhiên `0.5`
- Máy mới: `npm install` → chép `.env.example` thành `.env`, điền khóa → `npm run dev`, hoặc `npm run build` rồi `npm start` → http://localhost:3000 (sửa `.env` phải khởi động lại)
- Unit test: `npm test` (Vitest, 7 file / 48 test) · Kiểm tra kiểu: `npm run typecheck`
- Bộ kiểm thử nhập vai: `npm run eval` (61 câu, ghi `eval/ket-qua.md`, 3–50 phút tùy hạn mức). Lọc: `EVAL_ONLY=<characterId>` hoặc `EVAL_CASES=<mã,mã>` → ghi `eval/ket-qua-loc.md` (gitignore)
- `.env` (chỉ server đọc, KHÔNG commit): `GEMINI_API_KEYS` (bắt buộc, nhiều khóa ngăn bằng dấu phẩy, mỗi khóa một project) · tùy chọn `GEMINI_MODEL`, `GEMINI_THINKING_LEVEL` (`minimal`|`low`|`medium`|`high`|`none`), `GEMINI_TEMPERATURE` (0–2)
- Biến riêng của eval: `EVAL_JUDGE_MODELS` (mặc định `gemini-3.5-flash,gemini-3.1-flash-lite`), `EVAL_JUDGE_VOTES` (3), `EVAL_CONCURRENCY` (3)

## Bản đồ file/thư mục chính (toàn dự án)
- `src/app/page.tsx`: màn chọn 4 nhân vật · `src/app/tro-chuyen/[characterId]/page.tsx`: màn chat (`ChatScreen` gắn `key` theo nhân vật)
- `src/app/api/chat/route.ts`: POST /api/chat nhận `{characterId, messages}`, trả NDJSON (`delta` / `done` / `error`)
- `src/app/layout.tsx`, `globals.css` (bảng màu cổ phong), `icon.svg` (favicon ấn triện)
- `src/components/`: `ChatScreen.tsx` (chat, lịch sử, lỗi, Gửi lại), `IllustrationPanel.tsx` (vùng minh họa trống), `AiNotice.tsx` (dòng cảnh báo AI)
- `src/lib/characters.ts` (dữ liệu công khai 4 nhân vật + lời chào) · `chatProtocol.ts` (giao thức, thông báo lỗi theo tên nhân vật) · `text.ts` (làm sạch lời đáp)
- `src/lib/server/`: `keyPool.ts`, `chatStream.ts` (gửi song song có trễ, timeout, phân loại lỗi), `gemini.ts` (model, nhiệt độ, mức suy nghĩ), `conversation.ts` (bảng persona, kiểm body, dựng lịch sử, `getTurnSystemPrompt`)
- `src/lib/server/personas/`: `shared.ts` (khung prompt chung `buildPersonaPrompt`), `ngoQuyen.ts`, `tranHungDao.ts`, `nguyenTrai.ts`, `quangTrung.ts`, `topicCards.ts` (thẻ sự thật theo chủ đề)
- `src/lib/client/`: `chatClient.ts` (đọc luồng), `chatStorage.ts` (localStorage), `pacer.ts` (nhả chữ đều)
- `docs/ho-so-nhan-vat.md`: hồ sơ 4 nhân vật đã duyệt, là nguồn của prompt
- `eval/`: `cases.ts` (61 câu, 5 nhóm, ý phải có / ý cấm / regex), `harness.ts` (sinh lời đáp, kiểm tra cứng, giám khảo, báo cáo), `run.eval.ts`, `ket-qua.md` (bảng lần chạy cuối)
- `tests/`: unit test key pool, chatStream, conversation, pacer, chatProtocol, làm sạch lời đáp (`phase2Quality`), thẻ sự thật

## Thư viện & Quyết định kỹ thuật quan trọng (cộng dồn)
- Khóa API chỉ dùng trong `src/lib/server/*` (`import "server-only"`); trình duyệt chỉ gửi `{characterId, messages}`
- Key pool xoay vòng mỗi lượt; khóa lỗi bị cho nghỉ: 429 → 60 s, 401/403 → 10 phút, 5xx hoặc quá chậm → 10 s
- Gửi song song có trễ: 2 s chưa có chữ thì gọi thêm khóa kế (tối đa 3 yêu cầu); mỗi khóa chờ tối đa 12 s, cả lượt 25 s; có chữ đầu thì không đổi khóa; server 20 s không có chữ mới → báo đứt; trình duyệt 40 s không nhận byte → báo lỗi
- Lịch sử: trình duyệt gửi toàn bộ, server giữ 60 lượt gần nhất và chèn lượt mở màn ẩn + lời chào cố định của nhân vật vào đầu
- localStorage `dvhk:chat:v1:<characterId>`: mỗi nhân vật một khóa, chỉ lưu lượt đã trả lời xong; "Cuộc trò chuyện mới" chỉ xóa khóa của nhân vật đang mở
- Thêm nhân vật: `characters.ts` (`available: true` + `greeting`) → `PersonaSpec` trong `personas/` → đăng ký ở `PERSONAS` trong `conversation.ts` (prompt + lượt mở màn) → thẻ trong `topicCards.ts` → câu hỏi trong `eval/cases.ts`
- Xưng hô: Ngô Quyền ta/khách (939) · Trần Hưng Đạo ta/túc hạ (1300) · Nguyễn Trãi lão phu/hiền hữu (1439) · Quang Trung trẫm/khanh (1791); cấm tôi/bạn/anh/em... và cấm dùng xưng hô riêng của nhân vật khác
- Prompt: hiểu biết dừng ở năm "hiện tại", người đời sau thì không biết; sự kiện cốt lõi có câu neo "(Khi kể X, LUÔN nêu ...)"; năm ghi dạng "Can Chi (năm)", không đưa ngày tháng dương lịch vào prompt hay thẻ; cấm phóng đại kết cục trận đánh; có mục tự soát trước khi gửi
- Thẻ sự thật (`topicCards.ts`): dò từ khóa nguyên chữ trong 2 câu hỏi gần nhất, chọn tối đa 3 thẻ, nối vào CUỐI system prompt; không khớp thì giữ prompt gốc; `/api/chat` và eval dùng chung `getTurnSystemPrompt`
- Hỏi "có phải AI không": A (hỏi thật → thừa nhận một câu rồi quay lại vai) / B (ra lệnh bỏ vai → từ chối trong vai); chưa chắc thì coi là B
- `cleanModelText` (`text.ts`): sửa can chi theo năm dương lịch, bỏ chữ Hán, sửa chữ tục, đổi số tiếng Anh sau mồng/mùng/ngày/tháng, bỏ Markdown
- Eval: kiểm tra cứng (xưng hô, từ của nhân vật khác, Markdown, regex bắt buộc/cấm, từ hiện đại, can chi) + giám khảo LLM chấm đa số 3 phiếu; giám khảo dự phòng, cho nghỉ theo (model, khóa) khi 429/5xx; lỗi hạ tầng chạy lại 2 lượt rồi ghi "LỖI HẠ TẦNG" → "KHÔNG KẾT LUẬN ĐƯỢC"; ngưỡng mỗi nhân vật ≥ 90%, nhóm cốt lõi 100%
- Giữ model `gemini-3.5-flash-lite`: `gemini-3.5-flash` có chữ đầu trung vị 5,9 s (vượt AC 3 s). Độ ngẫu nhiên hạ 0,8 → 0,5 để giảm lệch chi tiết
- Giữ mức suy nghĩ `minimal` (Manager chọn): `low` trượt cốt lõi 0/42 nhưng chữ đầu trung vị 2,7–3,0 s, chậm nhất 4–5,5 s
- `next.config.ts`: `compress: false` để stream không bị gom lại

## Mock tạm / Nợ kỹ thuật / Điểm lệch PLAN.md
- Mock: vùng minh họa chỉ là khung trống (Phase 3)
- Bug #11 [NGOÀI AC], hoãn: kiểm tra cứng của eval đánh trượt lời đáp đúng sử nhưng không có từ xưng hô nào (vd `thd-07` kể ngôi thứ ba, thiếu cả "ta" lẫn "túc hạ")
- Bug #13 [NGOÀI AC], hoãn: Nguyễn Trãi thỉnh thoảng tự xưng "ta" đầu câu, nói "thời khác", hoặc dính chữ (vd "vâyhãm") khi bộ lọc bỏ chữ Hán nằm giữa hai từ
- Ở mức `minimal` vẫn có trượt ngẫu nhiên hiếm ở câu cốt lõi (trước lần sửa cuối ~2%, sau đó 0/71 lượt): một lần eval có thể trượt AC5 vì một câu → chạy lại
- Eval dựa vào gói miễn phí: giám khảo `gemini-3.5-flash` hết hạn mức nhanh (đặt lại ~15:00 giờ VN); không đo chữ đầu khi eval đang chạy (dùng chung khóa)
- Giám khảo LLM có lúc dễ dãi (từng cho qua lời đáp có chữ hỏng ở `qt-02`) → vẫn cần đọc phần chi tiết lời đáp trong `ket-qua.md`
- Bộ lọc lời đáp chỉ chữa các lỗi đã gặp; thẻ sự thật chọn theo từ khóa nên câu hỏi diễn đạt khác từ khóa chỉ còn prompt gốc
- Khóa #6 và #7 trong `.env` bị Google trả 403 (cần bật billing); pool tự bỏ qua, 10 phút thử lại một lần
- Gửi song song có trễ có thể tăng số lần gọi API khi Gemini chậm → xử lý chi phí ở Phase 7
- Key pool và trạng thái nghỉ chỉ nằm trong bộ nhớ một tiến trình (mất khi restart, không chia sẻ giữa nhiều instance)
- Chưa giới hạn tần suất, chưa có bước xác nhận 18+ và thông báo dữ liệu (Phase 7)
- Ô nhập tự giãn nhờ CSS `field-sizing`; Firefox chưa hỗ trợ
- Cold start đầu tiên chữ đầu có thể tới ~3,5 s; khi Gemini quá tải có lượt tới ~5 s
- Điểm lệch PLAN.md: không có về phạm vi; chỉ thêm biến tùy chọn `GEMINI_TEMPERATURE`
