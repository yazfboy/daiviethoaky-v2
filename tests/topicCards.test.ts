import { describe, expect, it } from "vitest";
import { CHARACTERS } from "@/lib/characters";
import type { ChatTurn } from "@/lib/chatProtocol";
import { getSystemPrompt, getTurnSystemPrompt } from "@/lib/server/conversation";
import { MAX_TOPIC_CARDS, selectTopicCards, TOPIC_CARDS } from "@/lib/server/personas/topicCards";
import { fixCanChi } from "@/lib/text";

const ask = (text: string): ChatTurn[] => [{ role: "user", text }];
const ids = (characterId: string, messages: ChatTurn[]) => selectTopicCards(characterId, messages).map((c) => c.id);

describe("Thẻ sự thật theo chủ đề", () => {
  it("chọn đúng thẻ theo câu hỏi (các lỗi QA lần 6)", () => {
    expect(ids("tran-hung-dao", ask("Đông Bộ Đầu và Bình Than là nơi diễn ra việc gì vậy ngài?"))).toContain(
      "thd-binh-than-dong-bo-dau",
    );
    expect(ids("nguyen-trai", ask("Trận Chi Lăng – Xương Giang diễn ra thế nào?"))).toContain("nt-chi-lang");
    expect(ids("nguyen-trai", ask("Bình Ngô đại cáo được viết khi nào và để làm gì?"))).toContain("nt-binh-ngo-dai-cao");
    expect(ids("quang-trung", ask("Bệ hạ kể lại trận đại phá quân Thanh dịp Tết Kỷ Dậu đi."))).toContain("qt-ky-dau");
  });

  it("câu hỏi nối tiếp ('trận ấy', 'ông ta') vẫn có thẻ nhờ xét câu hỏi liền trước", () => {
    const history: ChatTurn[] = [
      { role: "user", text: "Ngài kể sơ qua trận Vân Đồn." },
      { role: "model", text: "Trận ấy là ở cửa biển Vân Đồn..." },
      { role: "user", text: "Ai chỉ huy trận ấy, và nó ảnh hưởng thế nào tới trận Bạch Đằng?" },
    ];
    expect(ids("tran-hung-dao", history)).toEqual(expect.arrayContaining(["thd-van-don", "thd-bach-dang"]));

    const qt: ChatTurn[] = [
      { role: "user", text: "Ai là người đem quân Thanh sang nước ta?" },
      { role: "model", text: "Là Tôn Sĩ Nghị..." },
      { role: "user", text: "Rồi ông ta chạy thoát bằng cách nào?" },
    ];
    expect(ids("quang-trung", qt)).toContain("qt-ky-dau");
  });

  it("câu không chạm chủ đề nào thì giữ nguyên prompt gốc", () => {
    const msgs = ask("Ngài thích làm gì lúc thư nhàn?");
    expect(ids("nguyen-trai", msgs)).toEqual([]);
    expect(getTurnSystemPrompt("nguyen-trai", msgs)).toBe(getSystemPrompt("nguyen-trai"));
  });

  it("có thẻ thì nối vào CUỐI prompt gốc, đúng sự thật đã duyệt", () => {
    const msgs = ask("Hội nghị Bình Than họp năm nào?");
    const prompt = getTurnSystemPrompt("tran-hung-dao", msgs);
    expect(prompt.startsWith(getSystemPrompt("tran-hung-dao"))).toBe(true);
    const notes = prompt.slice(getSystemPrompt("tran-hung-dao").length);
    expect(notes).toContain("# SỰ THẬT CHO CÂU HỎI NÀY");
    expect(notes).toContain("năm Nhâm Ngọ (1282)");
    expect(notes).toContain("KHÔNG phải 1284");
  });

  it("khớp nguyên chữ, không khớp giữa chừng chữ khác ('quên' không phải 'quê')", () => {
    expect(ids("ngo-quyen", ask("Ngài có quên chuyện cũ không?"))).not.toContain("nq-que-quan");
    expect(ids("ngo-quyen", ask("Ngài quê ở đâu?"))).toContain("nq-que-quan");
  });

  it("không quá số thẻ tối đa mỗi lượt", () => {
    const many = ask("Kể về Bạch Đằng, Kiều Công Tiễn, Cổ Loa và quê của ngài ở Đường Lâm");
    expect(selectTopicCards("ngo-quyen", many).length).toBeLessThanOrEqual(MAX_TOPIC_CARDS);
  });

  it("nhân vật nào cũng có thẻ, mã thẻ không trùng, mọi cặp can chi – năm trong thẻ đều đúng", () => {
    const all = CHARACTERS.flatMap((c) => TOPIC_CARDS[c.id]);
    expect(CHARACTERS.every((c) => TOPIC_CARDS[c.id].length > 0)).toBe(true);
    expect(new Set(all.map((c) => c.id)).size).toBe(all.length);
    for (const card of all) expect(fixCanChi(card.facts), card.id).toBe(card.facts);
  });

  it("không đưa ngày tháng dương lịch vào prompt hay thẻ (mô hình hay đọc thành chữ rồi viết hỏng, vd qt-02)", () => {
    const DUONG_LICH = /\d{1,2} tháng \d{1,2} năm \d{3,4}/u;
    for (const c of CHARACTERS) {
      expect(getSystemPrompt(c.id), c.id).not.toMatch(DUONG_LICH);
      for (const card of TOPIC_CARDS[c.id]) expect(card.facts, card.id).not.toMatch(DUONG_LICH);
    }
  });

  it("thẻ trận Bạch Đằng 1288 nhắc Ngô Quyền thì ghi sẵn đúng cặp Mậu Tuất (938), không để năm trơn", () => {
    const all = Object.values(TOPIC_CARDS).flat();
    for (const id of ["thd-bach-dang", "qt-bach-dang"]) {
      const card = all.find((c) => c.id === id);
      expect(card?.facts, id).toContain("Mậu Tuất (938)");
      expect(card?.facts, id).not.toMatch(/năm 938/);
    }
  });
});
