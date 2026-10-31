import { describe, expect, it } from "vitest";
import { containsLink, escapeHtml, escapeMultiline, oneLine, safeUrl } from "./escape";
import { normalizeRecipients } from "./recipients";
import { absoluteUrl } from "./site-url";

describe("escapeHtml", () => {
  it("escapes markup and attribute breakers", () => {
    expect(escapeHtml(`<script>alert("x")</script>&'\`=`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;&#96;&#61;",
    );
  });
  it("handles null/undefined/numbers", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(12)).toBe("12");
  });
  it("keeps Vietnamese text", () => {
    expect(escapeHtml("Nguyễn Văn Á")).toBe("Nguyễn Văn Á");
  });
  it("escapeMultiline converts newlines after escaping", () => {
    expect(escapeMultiline("a<b\nc")).toBe("a&lt;b<br>c");
  });
});

describe("safeUrl", () => {
  it("allows http(s)", () => {
    expect(safeUrl("https://x.vn/q/abc")).toBe("https://x.vn/q/abc");
  });
  it("rejects javascript:, data:, relative", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,hi")).toBeNull();
    expect(safeUrl("/relative")).toBeNull();
    expect(safeUrl(null)).toBeNull();
  });
  it("allows cid only when asked", () => {
    expect(safeUrl("cid:mockup")).toBeNull();
    expect(safeUrl("cid:mockup", { allowCid: true })).toBe("cid:mockup");
    expect(safeUrl("cid:\"><x", { allowCid: true })).toBeNull();
  });
});

describe("oneLine", () => {
  it("strips CR/LF and trims to max", () => {
    expect(oneLine("a\r\nBcc: evil@x.com")).toBe("a Bcc: evil@x.com");
    expect(oneLine("abcdef", 3)).toBe("abc");
  });
});

describe("normalizeRecipients", () => {
  it("validates, lowercases and dedupes", () => {
    expect(normalizeRecipients([" A@x.vn ", "a@x.vn", "bad", null, "", "b@y.vn"])).toEqual(["a@x.vn", "b@y.vn"]);
  });
});

describe("absoluteUrl", () => {
  it("joins with or without trailing slash", () => {
    expect(absoluteUrl("https://x.vn", "/q/t")).toBe("https://x.vn/q/t");
    expect(absoluteUrl("https://x.vn/", "/q/t")).toBe("https://x.vn/q/t");
  });
});

describe("containsLink", () => {
  it.each(["https://evil.vn", "Xem www.evil.vn", "trung thuong tai evil.com", "a@b.vn", "evil.vn/x", "hxxp://x"])(
    "flags %s",
    (v) => expect(containsLink(v)).toBe(true),
  );
  it.each(["Nguyễn Văn A", "Công ty TNHH A.B", "Trần Thị B - 0912", "Lê Văn C."])("allows %s", (v) =>
    expect(containsLink(v)).toBe(false),
  );
});
