import { describe, expect, it } from "vitest";
import { CHARACTERS } from "@/lib/characters";
import { IMAGES, PRESENT_YEAR, TOPICS, getImage, imagesOf, resolveRef, topicsFor } from "@/lib/media/catalog";
import type { LicenseId } from "@/lib/media/types";
import { ALLOWED_IMAGE_HOSTS, LICENSE_INFO, STANDARD_WIDTHS, imageSrcSet, imageUrl, natureLabel } from "@/lib/media/urls";

// Soát kho ảnh tư liệu: nguồn, giấy phép, chú thích, chủ đề và thời kỳ.

const ALLOWED_LICENSES: LicenseId[] = ["PD", "CC0", "CC BY 3.0", "CC BY 4.0", "CC BY-SA 3.0", "CC BY-SA 4.0"];

describe("kho ảnh tư liệu", () => {
  it("mã ảnh và mã chủ đề không trùng", () => {
    expect(new Set(IMAGES.map((i) => i.id)).size).toBe(IMAGES.length);
    expect(new Set(TOPICS.map((t) => t.id)).size).toBe(TOPICS.length);
  });

  it("mỗi ảnh thuộc đúng một chủ đề có thật, mỗi chủ đề có ít nhất một ảnh", () => {
    for (const img of IMAGES) expect(TOPICS.map((t) => t.id), img.id).toContain(img.topic);
    for (const t of TOPICS) expect(imagesOf(t.id).length, t.id).toBeGreaterThan(0);
  });

  it("chỉ nhúng từ Wikimedia Commons, giấy phép thuộc danh sách được phép, đủ tác giả và trang gốc", () => {
    for (const img of IMAGES) {
      expect(ALLOWED_IMAGE_HOSTS as readonly string[], img.id).toContain(new URL(img.original).host);
      expect(img.original, img.id).not.toContain("?");
      expect(img.sourcePage.startsWith("https://commons.wikimedia.org/wiki/File:"), img.id).toBe(true);
      expect(ALLOWED_LICENSES, img.id).toContain(img.license);
      expect(img.author.trim().length, img.id).toBeGreaterThan(1);
      expect(img.width, img.id).toBeGreaterThan(0);
      expect(img.height, img.id).toBeGreaterThan(0);
      // Giấy phép CC phải có link tới văn bản giấy phép.
      if (img.license !== "PD") expect(LICENSE_INFO[img.license].url, img.id).toMatch(/^https:\/\/creativecommons\.org\//);
    }
  });

  it("URL ảnh chỉ dùng cỡ thu nhỏ chuẩn của Wikimedia và host được phép", () => {
    for (const img of IMAGES) {
      for (const w of STANDARD_WIDTHS) {
        const url = imageUrl(img, w);
        expect(ALLOWED_IMAGE_HOSTS as readonly string[], url).toContain(new URL(url).host);
        const m = url.match(/\/(\d+)px-[^/]+$/);
        if (m) expect(STANDARD_WIDTHS as readonly number[], url).toContain(Number(m[1]));
        else expect(url, `${img.id}: chỉ dùng file gốc khi ảnh hẹp hơn cỡ yêu cầu`).toBe(img.original);
        if (m) expect(Number(m[1]), url).toBeLessThan(img.width);
      }
      expect(imageSrcSet(img, [500, 960])).not.toBe("");
    }
  });

  it("mỗi ảnh có nhãn loại ảnh và chú thích tiếng Việt", () => {
    for (const img of IMAGES) {
      expect(img.caption.length, img.id).toBeGreaterThan(30);
      expect(natureLabel(img), img.id).not.toContain("?");
      if (img.nature === "anh-xua") expect(img.takenYear, img.id).toBeTypeOf("number");
    }
  });

  it("tranh chân dung ghi rõ vẽ đời sau, không phải chân dung thật; tượng ghi dựng đời sau", () => {
    expect(natureLabel({ nature: "chan-dung-doi-sau" })).toBe("Tranh vẽ đời sau, không phải chân dung thật");
    expect(natureLabel({ nature: "tuong-doi-sau" })).toMatch(/đời sau.*không phải chân dung thật/);
    expect(natureLabel({ nature: "anh-ngay-nay" })).toBe("Ảnh chụp ngày nay");
    for (const t of TOPICS.filter((x) => x.id.endsWith("-dung-mao"))) {
      for (const img of imagesOf(t.id)) expect(["chan-dung-doi-sau", "tuong-doi-sau"], img.id).toContain(img.nature);
    }
  });

  it("chủ đề chỉ mở cho nhân vật sống từ năm diễn ra trở đi", () => {
    for (const t of TOPICS) {
      for (const c of t.characters) expect(t.year, `${t.id} → ${c}`).toBeLessThanOrEqual(PRESENT_YEAR[c]);
    }
    expect(topicsFor("ngo-quyen").map((t) => t.id)).not.toContain("bach-dang-1288");
    expect(topicsFor("tran-hung-dao").map((t) => t.id)).not.toContain("binh-ngo-dai-cao");
    expect(topicsFor("khong-co")).toEqual([]);
    for (const c of CHARACTERS) expect(topicsFor(c.id).length, c.id).toBeGreaterThanOrEqual(4);
  });

  it("không gán tư liệu trận 1288 cho trận 938 và ngược lại", () => {
    const say1288 = /1288|Mậu Tý|Nguyên|Mông|Ô Mã Nhi|nhà Trần|thời Trần/;
    const say938 = /938|Mậu Tuất|Nam Hán|Ngô Quyền|Hoằng Tháo/;
    for (const img of imagesOf("bach-dang-938")) expect(img.caption, img.id).not.toMatch(say1288);
    for (const img of imagesOf("bach-dang-1288")) expect(img.caption, img.id).not.toMatch(say938);
    for (const img of imagesOf("bach-dang-938")) expect(img.caption, img.id).toMatch(/938/);
    for (const img of imagesOf("bach-dang-1288")) expect(img.caption, img.id).toMatch(/1288/);
  });

  it("tra tham chiếu đã lưu: mã còn trong kho thì ra ảnh, mã lạ thì bỏ qua", () => {
    expect(resolveRef({ kind: "image", id: "bd1288-coc-btls" })?.topic).toBe("bach-dang-1288");
    expect(resolveRef({ kind: "image", id: "khong-co" })).toBeUndefined();
    expect(getImage("bd938-mo-hinh-btls")?.topic).toBe("bach-dang-938");
  });
});
