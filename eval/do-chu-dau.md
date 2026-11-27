# Đo thời gian ra chữ đầu: tắt và bật AI Đạo diễn (AC3, Phase 3)

- Chạy lúc: 2026-11-27T13:34:03.989Z · server: `http://localhost:3013` (bản build `npm run build && npm start`) · 10 vòng mỗi câu
- Cách đo: mỗi vòng gửi mỗi câu hai lần liền nhau, một lần TẮT (chỉ gọi /api/chat, như Phase 2) và một lần BẬT (gọi /api/chat cùng lúc với /api/director, như trình duyệt). Thứ tự tắt/bật đảo nhau mỗi vòng. Chữ đầu tính từ lúc gửi /api/chat tới khi nhận dòng delta đầu tiên, đo qua HTTP.
- Số đo TẮT là số đo Phase 2 (cùng câu hỏi, cùng điều kiện). Tham khảo thêm: bảng eval Phase 2 (`eval/ket-qua.md`) đo trong tiến trình, trung vị 1,00–1,16 s.

| Câu hỏi | Trung vị TẮT | Trung vị BẬT | p90 TẮT | p90 BẬT | Chậm nhất TẮT | Chậm nhất BẬT | Lần lỗi (tắt/bật) |
|---|---|---|---|---|---|---|---|
| tran-hung-dao: Ngài kể cho tôi nghe trận Bạch Đằng năm 1288. | 1.00 s | 0.78 s | 1.26 s | 1.30 s | 2.81 s | 1.77 s | 0/0 |
| quang-trung: Bệ hạ kể cho thần nghe trận Ngọc Hồi – Đống Đa. | 0.87 s | 0.89 s | 1.23 s | 0.98 s | 1.37 s | 0.98 s | 0/0 |
| nguyen-trai: Bình Ngô đại cáo được viết khi nào và để làm gì? | 0.88 s | 0.85 s | 1.01 s | 1.05 s | 1.02 s | 1.58 s | 0/0 |
| ngo-quyen: Ngài kể trận Bạch Đằng năm 938 đi. | 0.82 s | 0.82 s | 0.96 s | 1.13 s | 2.01 s | 1.34 s | 0/0 |
| **Tất cả** | **0.88 s** | **0.87 s** | 1.24 s | 1.26 s | 2.81 s | 1.77 s | 0/0 |

- Đạo diễn (lượt BẬT): trung vị 1.87 s, chậm nhất 4.39 s; có ảnh 40/40 lượt.
- Chênh trung vị BẬT − TẮT: -0.02 s (âm hoặc trong khoảng dao động ±0,15 s nghĩa là không chậm hơn).

## Từng lần đo

| Vòng | Nhân vật | Chế độ | Chữ đầu | Cả lời đáp | Đạo diễn | Lỗi |
|---|---|---|---|---|---|---|
| 1 | tran-hung-dao | tắt | 1.26 s | 1.99 s | – |  |
| 1 | tran-hung-dao | bật | 1.30 s | 2.06 s | 1.67 s → bd1288-coc-btls |  |
| 1 | quang-trung | tắt | 0.78 s | 1.73 s | – |  |
| 1 | quang-trung | bật | 0.98 s | 1.72 s | 1.59 s → dong-da-go-tuong |  |
| 1 | nguyen-trai | tắt | 0.98 s | 1.30 s | – |  |
| 1 | nguyen-trai | bật | 1.58 s | 2.01 s | 2.74 s → binh-ngo-hoang-viet-van-tuyen |  |
| 1 | ngo-quyen | tắt | 0.75 s | 1.81 s | – |  |
| 1 | ngo-quyen | bật | 0.73 s | 1.60 s | 1.88 s → bd938-mo-hinh-btls |  |
| 2 | tran-hung-dao | bật | 0.78 s | 1.54 s | 1.87 s → bd1288-coc-btls |  |
| 2 | tran-hung-dao | tắt | 0.81 s | 1.59 s | – |  |
| 2 | quang-trung | bật | 0.93 s | 1.90 s | 1.44 s → dong-da-go-tuong |  |
| 2 | quang-trung | tắt | 0.80 s | 1.72 s | – |  |
| 2 | nguyen-trai | bật | 0.82 s | 1.21 s | 1.57 s → binh-ngo-hoang-viet-van-tuyen |  |
| 2 | nguyen-trai | tắt | 0.91 s | 1.51 s | – |  |
| 2 | ngo-quyen | bật | 0.82 s | 1.91 s | 2.56 s → bd938-mo-hinh-btls |  |
| 2 | ngo-quyen | tắt | 0.90 s | 2.19 s | – |  |
| 3 | tran-hung-dao | tắt | 2.81 s | 3.48 s | – |  |
| 3 | tran-hung-dao | bật | 1.26 s | 2.26 s | 2.65 s → bd1288-coc-btls |  |
| 3 | quang-trung | tắt | 1.11 s | 2.01 s | – |  |
| 3 | quang-trung | bật | 0.98 s | 1.98 s | 2.74 s → dong-da-go-tuong |  |
| 3 | nguyen-trai | tắt | 0.74 s | 1.24 s | – |  |
| 3 | nguyen-trai | bật | 0.82 s | 1.14 s | 2.09 s → binh-ngo-hoang-viet-van-tuyen |  |
| 3 | ngo-quyen | tắt | 0.89 s | 1.75 s | – |  |
| 3 | ngo-quyen | bật | 0.79 s | 1.96 s | 2.58 s → bd938-mo-hinh-btls |  |
| 4 | tran-hung-dao | bật | 0.77 s | 1.46 s | 2.00 s → bd1288-coc-btls |  |
| 4 | tran-hung-dao | tắt | 1.00 s | 1.85 s | – |  |
| 4 | quang-trung | bật | 0.68 s | 1.54 s | 2.98 s → dong-da-go-tuong |  |
| 4 | quang-trung | tắt | 1.01 s | 1.84 s | – |  |
| 4 | nguyen-trai | bật | 0.85 s | 1.41 s | 2.32 s → binh-ngo-hoang-viet-van-tuyen |  |
| 4 | nguyen-trai | tắt | 0.77 s | 1.22 s | – |  |
| 4 | ngo-quyen | bật | 1.05 s | 2.38 s | 1.17 s → bd938-mo-hinh-btls |  |
| 4 | ngo-quyen | tắt | 0.80 s | 1.79 s | – |  |
| 5 | tran-hung-dao | tắt | 1.24 s | 1.82 s | – |  |
| 5 | tran-hung-dao | bật | 0.69 s | 1.35 s | 1.20 s → bd1288-coc-btls |  |
| 5 | quang-trung | tắt | 0.86 s | 1.67 s | – |  |
| 5 | quang-trung | bật | 0.71 s | 1.38 s | 2.69 s → dong-da-go-tuong |  |
| 5 | nguyen-trai | tắt | 0.78 s | 1.11 s | – |  |
| 5 | nguyen-trai | bật | 1.05 s | 1.37 s | 2.43 s → binh-ngo-hoang-viet-van-tuyen |  |
| 5 | ngo-quyen | tắt | 2.01 s | 2.79 s | – |  |
| 5 | ngo-quyen | bật | 0.75 s | 1.52 s | 1.15 s → bd938-mo-hinh-btls |  |
| 6 | tran-hung-dao | bật | 0.68 s | 1.39 s | 2.60 s → bd1288-coc-btls |  |
| 6 | tran-hung-dao | tắt | 0.86 s | 1.81 s | – |  |
| 6 | quang-trung | bật | 0.93 s | 1.72 s | 1.82 s → dong-da-go-tuong |  |
| 6 | quang-trung | tắt | 0.74 s | 1.67 s | – |  |
| 6 | nguyen-trai | bật | 0.83 s | 1.07 s | 1.73 s → binh-ngo-hoang-viet-van-tuyen |  |
| 6 | nguyen-trai | tắt | 0.88 s | 1.48 s | – |  |
| 6 | ngo-quyen | bật | 0.92 s | 1.75 s | 1.91 s → bd938-mo-hinh-btls |  |
| 6 | ngo-quyen | tắt | 0.88 s | 1.85 s | – |  |
| 7 | tran-hung-dao | tắt | 0.80 s | 1.81 s | – |  |
| 7 | tran-hung-dao | bật | 1.02 s | 1.92 s | 1.77 s → bd1288-coc-btls |  |
| 7 | quang-trung | tắt | 0.87 s | 1.79 s | – |  |
| 7 | quang-trung | bật | 0.79 s | 1.44 s | 2.30 s → dong-da-go-tuong |  |
| 7 | nguyen-trai | tắt | 0.86 s | 1.32 s | – |  |
| 7 | nguyen-trai | bật | 1.05 s | 1.58 s | 2.82 s → binh-ngo-hoang-viet-van-tuyen |  |
| 7 | ngo-quyen | tắt | 0.77 s | 1.41 s | – |  |
| 7 | ngo-quyen | bật | 1.34 s | 2.27 s | 1.12 s → bd938-mo-hinh-btls |  |
| 8 | tran-hung-dao | bật | 0.74 s | 1.49 s | 2.38 s → bd1288-coc-btls |  |
| 8 | tran-hung-dao | tắt | 1.01 s | 1.55 s | – |  |
| 8 | quang-trung | bật | 0.79 s | 1.74 s | 1.73 s → dong-da-go-tuong |  |
| 8 | quang-trung | tắt | 1.08 s | 1.80 s | – |  |
| 8 | nguyen-trai | bật | 0.90 s | 1.39 s | 1.78 s → binh-ngo-hoang-viet-van-tuyen |  |
| 8 | nguyen-trai | tắt | 1.01 s | 1.54 s | – |  |
| 8 | ngo-quyen | bật | 1.13 s | 1.97 s | 0.76 s → bd938-mo-hinh-btls |  |
| 8 | ngo-quyen | tắt | 0.82 s | 1.59 s | – |  |
| 9 | tran-hung-dao | tắt | 1.20 s | 2.10 s | – |  |
| 9 | tran-hung-dao | bật | 1.77 s | 2.78 s | 1.62 s → bd1288-coc-btls |  |
| 9 | quang-trung | tắt | 1.37 s | 2.25 s | – |  |
| 9 | quang-trung | bật | 0.89 s | 1.79 s | 2.92 s → dong-da-go-tuong |  |
| 9 | nguyen-trai | tắt | 1.02 s | 1.49 s | – |  |
| 9 | nguyen-trai | bật | 0.63 s | 1.15 s | 1.28 s → binh-ngo-hoang-viet-van-tuyen |  |
| 9 | ngo-quyen | tắt | 0.75 s | 1.93 s | – |  |
| 9 | ngo-quyen | bật | 0.87 s | 4.24 s | 0.97 s → bd938-mo-hinh-btls |  |
| 10 | tran-hung-dao | bật | 0.97 s | 1.81 s | 1.71 s → bd1288-coc-btls |  |
| 10 | tran-hung-dao | tắt | 0.97 s | 2.02 s | – |  |
| 10 | quang-trung | bật | 0.97 s | 1.60 s | 4.39 s → dong-da-go-tuong |  |
| 10 | quang-trung | tắt | 1.23 s | 2.29 s | – |  |
| 10 | nguyen-trai | bật | 0.96 s | 1.50 s | 1.61 s → binh-ngo-hoang-viet-van-tuyen |  |
| 10 | nguyen-trai | tắt | 0.88 s | 1.22 s | – |  |
| 10 | ngo-quyen | bật | 0.77 s | 1.49 s | 2.33 s → bd938-mo-hinh-btls |  |
| 10 | ngo-quyen | tắt | 0.96 s | 1.78 s | – |  |
