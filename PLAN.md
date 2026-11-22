# PLAN.md — Đại Việt Họa Ký

## 1. Mục tiêu & Phạm vi

**Bài toán cốt lõi:** Làm một web nhập vai cổ phong để người dùng trò chuyện trực tiếp với danh nhân Việt Nam. Song song với lời thoại, "AI Đạo diễn" chọn và hiện minh họa khớp với điều nhân vật đang kể: ảnh/video tư liệu từ nguồn hợp lệ, hoặc tranh do AI vẽ khi không có tư liệu phù hợp.

**Đối tượng:** người dùng từ 18 tuổi trở lên.

**In-scope (MVP):**
- 4 nhân vật: Ngô Quyền, Trần Hưng Đạo, Nguyễn Trãi, Quang Trung (Nguyễn Huệ). Mỗi người có giọng văn, cách xưng hô và hiểu biết đúng thời đại của mình.
- Chat bằng chữ, lời thoại hiện chạy dần. Lịch sử hội thoại giữ trong trình duyệt, tách riêng theo từng nhân vật.
- AI Đạo diễn: mỗi lượt trả lời tự quyết định không minh họa, minh họa bằng ảnh, bằng video (chỉ khi người dùng bật video) hoặc bằng tranh AI vẽ dự phòng.
- Mọi ảnh/video tư liệu đều hiện nguồn và link gốc.
- Giao diện cổ phong có chất riêng, không mang dáng "web do AI làm"; có chuyển động, hiệu ứng và chuyển trang mượt.

**Out-of-scope:** đăng nhập/tài khoản, lưu lịch sử phía server · giọng nói (TTS/STT) · AI sinh video · tải về hoặc lưu trữ lại media lấy từ web · nhân vật ngoài 4 người, hội thoại nhiều nhân vật cùng lúc · app mobile native · trang quản trị nội dung · thanh toán · đa ngôn ngữ.

## 2. Ràng buộc cấp cao

- **Nền tảng:** Web app, ưu tiên desktop, trên mobile vẫn phải dùng được. Ngôn ngữ: tiếng Việt.
- **Thời gian thực:** Minh họa chạy song song, không được làm chậm hay chặn lời thoại. Minh họa trễ hoặc lỗi thì chat vẫn chạy bình thường.
- **Bản quyền media:** Chỉ nhúng từ danh sách nguồn được phép (vd: trình nhúng chính thức của YouTube, Wikimedia Commons), không tải về rồi host lại. Video được phát theo đoạn (có mốc bắt đầu và kết thúc). Video mặc định tắt.
- **Tranh AI:** Chỉ dùng khi không tìm được tư liệu phù hợp. Luôn gắn nhãn "Tranh minh họa do AI vẽ — không phải tư liệu lịch sử".
- **Độ chính xác lịch sử:** Nhân vật không bịa sự kiện hay trích dẫn. Câu hỏi về thời sau hoặc chủ đề nhạy cảm được xử lý khéo trong vai, không vỡ vai, không phát ngôn về chính trị đương đại.
- **Nhận diện thị giác:** Không mang dáng "web do AI làm". Tránh gradient tím–xanh, font mặc định (vd: Inter, font hệ thống), emoji làm icon, thẻ kính mờ, bố cục "hero + N thẻ" đại trà, dòng chữ nhỏ in hoa giãn chữ đặt trên tiêu đề, câu chữ sáo rỗng. Dùng chất liệu cổ phong Việt (vd: nền giấy dó/lụa, nét mực, ấn son, hoa văn Đông Sơn) và font hiển thị tiếng Việt có dấu chuẩn. Chữ trên giao diện phải đọc như người thật viết.
- **Chuyển động:** Dùng Framer Motion (nay là Motion) cho animation và chuyển trang. Hiệu ứng không được làm chậm lời thoại, phải tôn trọng cài đặt giảm chuyển động của hệ điều hành và chạy mượt trên điện thoại tầm trung.
- **AI & khóa API:** Dùng gói miễn phí của Gemini, xoay vòng 7 khóa thuộc các project khác nhau. Chủ dự án chấp nhận rủi ro: cách này trái điều khoản Google về hạn mức, khóa có thể bị chặn bất cứ lúc nào. Ở gói miễn phí, Google được dùng nội dung chat để cải tiến sản phẩm, nên web phải báo rõ điều này cho người dùng và nhắc không nhập thông tin cá nhân.
- **Độ tuổi:** Điều khoản Gemini API cấm dùng cho sản phẩm hướng tới, hoặc dễ có người dưới 18 tuổi truy cập. Web phải có bước xác nhận 18+ trước khi vào trò chuyện.
- **Vận hành:** Khóa API chỉ nằm phía server. Giới hạn tần suất theo phiên để kiểm soát lượt gọi. Chạy được trên một URL public để demo.
- **Stack (đã chốt ở Phase 1, chi tiết trong `STATUS.md`):** Next.js + React + TypeScript, Gemini qua SDK chính thức. Giữ cố định.

## 3. Bản đồ các Phase (~4–5 tuần)

| Phase | Nội dung | Demo khi xong | Phụ thuộc | Ước lượng |
|---|---|---|---|---|
| 1 (xong) | Khung web, màn chọn nhân vật, chat lời thoại chạy dần với Trần Hưng Đạo, giao diện cổ phong cơ bản | Chọn Trần Hưng Đạo, hỏi đáp, chữ hiện chạy dần | — | 3–4 ngày |
| 2 | Đủ 4 nhân vật và chất lượng nhập vai: hồ sơ nhân vật được duyệt trước, giọng văn, xưng hô, giới hạn kiến thức theo thời đại, không bịa sử. Kèm bộ câu hỏi kiểm thử chuẩn chạy lại được | Chat được với cả 4 người; hỏi chuyện đời sau thì nhân vật trả lời trong vai; bộ kiểm thử ra bảng kết quả | 1 | 4 ngày |
| 3 | AI Đạo diễn và minh họa **ảnh** từ nguồn được phép, có ghi nguồn, không chặn lời thoại | Hỏi Trần Hưng Đạo về trận Bạch Đằng 1288 → ảnh tư liệu đúng chủ đề hiện bên cạnh lời thoại | 1 (làm song song với Phase 2 được) | 5 ngày |
| 4 | Minh họa **video**: công tắc bật/tắt, nhúng và phát đúng đoạn | Bật video → nhân vật kể chuyện kèm clip phát đúng đoạn | 3 | 3 ngày |
| 5 | **Tranh AI vẽ dự phòng** khi không có tư liệu phù hợp, gắn nhãn rõ ràng | Câu hỏi không có ảnh tư liệu → hiện tranh cổ phong do AI vẽ, có nhãn | 3 (làm song song với Phase 4 được) | 3 ngày |
| 6 | **Motion & humanize**: chuyển trang giữa chọn nhân vật và trò chuyện, hiệu ứng khi minh họa xuất hiện, micro-interaction (thẻ nhân vật, nút, trạng thái "đang tìm tư liệu"), hiệu ứng nền cổ phong nhẹ. Rà toàn bộ giao diện và chữ để bỏ dấu hiệu "AI làm". Hoàn thiện responsive | Chuyển cảnh mượt từ chọn nhân vật sang trò chuyện, minh họa hiện có hiệu ứng; bật giảm chuyển động thì hiệu ứng tắt mà app vẫn dùng đủ | 2, 4, 5 | 4–5 ngày |
| 7 | Ổn định & triển khai: trạng thái chờ và lỗi cho mọi luồng, giới hạn tần suất, bước xác nhận 18+, thông báo về việc Google dùng nội dung chat (gói miễn phí), triển khai public, kịch bản demo | Chạy trọn kịch bản demo với cả 4 nhân vật trên URL public | 6 | 3 ngày |
