# PLAN.md — Đại Việt Họa Ký

## 1. Mục tiêu & Phạm vi

**Bài toán cốt lõi:** Làm một web nhập vai cổ phong để người dùng trò chuyện trực tiếp với danh nhân Việt Nam. Song song với lời thoại, "AI Đạo diễn" chọn và hiện minh họa khớp với điều nhân vật đang kể: ảnh/video tư liệu từ nguồn hợp lệ, hoặc tranh do AI vẽ khi không có tư liệu phù hợp.

**In-scope (MVP):**
- 4 nhân vật: Ngô Quyền, Trần Hưng Đạo, Nguyễn Trãi, Quang Trung (Nguyễn Huệ). Mỗi người có giọng văn, cách xưng hô và hiểu biết đúng thời đại của mình.
- Chat bằng chữ, lời thoại hiện chạy dần. Lịch sử hội thoại giữ trong phiên trình duyệt.
- AI Đạo diễn: mỗi lượt trả lời tự quyết định không minh họa, minh họa bằng ảnh, bằng video (chỉ khi người dùng bật video) hoặc bằng tranh AI vẽ dự phòng.
- Mọi ảnh/video tư liệu đều hiện nguồn và link gốc.
- Giao diện cổ phong.

**Out-of-scope:** đăng nhập/tài khoản, lưu lịch sử phía server · giọng nói (TTS/STT) · AI sinh video · tải về hoặc lưu trữ lại media lấy từ web · nhân vật ngoài 4 người, hội thoại nhiều nhân vật cùng lúc · app mobile native · trang quản trị nội dung · thanh toán · đa ngôn ngữ.

## 2. Ràng buộc cấp cao

- **Nền tảng:** Web app, ưu tiên desktop, trên mobile vẫn phải dùng được (responsive cơ bản). Ngôn ngữ: tiếng Việt.
- **Thời gian thực:** Minh họa chạy song song, không được làm chậm hay chặn lời thoại. Minh họa trễ hoặc lỗi thì chat vẫn chạy bình thường.
- **Bản quyền media:** Chỉ nhúng từ danh sách nguồn được phép (vd: trình nhúng chính thức của YouTube, Wikimedia Commons), không tải về rồi host lại. Video được phát theo đoạn (có mốc bắt đầu và kết thúc). Video mặc định tắt.
- **Tranh AI:** Chỉ dùng khi không tìm được tư liệu phù hợp. Luôn gắn nhãn "Tranh minh họa do AI vẽ — không phải tư liệu lịch sử".
- **Độ chính xác lịch sử:** Nhân vật không bịa sự kiện hay trích dẫn. Câu hỏi về thời sau hoặc chủ đề nhạy cảm được xử lý khéo trong vai, không vỡ vai, không phát ngôn về chính trị đương đại.
- **Vận hành:** Khóa API AI chỉ nằm phía server. Giới hạn tần suất theo phiên để kiểm soát chi phí. Chạy được trên một URL public để demo.
- **Stack:** Coder đề xuất ở Phase 1 và ghi vào `STATUS.md`; sau đó giữ cố định.

## 3. Bản đồ các Phase (~4 tuần)

| Phase | Nội dung | Demo khi xong | Phụ thuộc | Ước lượng |
|---|---|---|---|---|
| 1 | Khung web, màn chọn nhân vật (3 người còn lại để "sắp ra mắt"), chat lời thoại chạy dần với Trần Hưng Đạo, giao diện cổ phong cơ bản | Chọn Trần Hưng Đạo, hỏi đáp, chữ hiện chạy dần | — | 3–4 ngày |
| 2 | Đủ 4 nhân vật và chất lượng nhập vai: giọng văn, xưng hô, giới hạn kiến thức theo thời đại, không bịa sử. Kèm bộ câu hỏi kiểm thử chuẩn | Chat được với cả 4 người; hỏi chuyện hiện đại thì nhân vật trả lời trong vai | 1 | 4 ngày |
| 3 | AI Đạo diễn và minh họa **ảnh** từ nguồn được phép, có ghi nguồn, không chặn lời thoại | Hỏi Trần Hưng Đạo về trận Bạch Đằng 1288 → ảnh tư liệu đúng chủ đề hiện bên cạnh lời thoại | 1 (làm song song với Phase 2 được) | 5 ngày |
| 4 | Minh họa **video**: công tắc bật/tắt, nhúng và phát đúng đoạn | Bật video → nhân vật kể chuyện kèm clip phát đúng đoạn | 3 | 3 ngày |
| 5 | **Tranh AI vẽ dự phòng** khi không có tư liệu phù hợp, gắn nhãn rõ ràng | Câu hỏi không có ảnh tư liệu → hiện tranh cổ phong do AI vẽ, có nhãn | 3 (làm song song với Phase 4 được) | 3 ngày |
| 6 | Hoàn thiện để demo: giao diện cổ phong đầy đủ, responsive, trạng thái chờ và lỗi, giới hạn chi phí, triển khai public | Chạy trọn kịch bản demo với cả 4 nhân vật trên URL public | 2, 4, 5 | 4–5 ngày |
