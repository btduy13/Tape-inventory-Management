import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { contactInfoFromEnv, hasContactInfo } from "./contact-info";
import { PresetsShowcase, stripClass } from "./PresetsShowcase";
import { HowItWorks } from "./HowItWorks";
import { ProductShowcase } from "./ProductShowcase";
import { UseCases } from "./UseCases";
import { CartonTapeArt } from "./CartonTapeArt";
import { Hero } from "./Hero";
import { DesignCta } from "./DesignCta";
import { TapeMarquee } from "./TapeMarquee";
import { Contact } from "./Contact";
import { PRESET } from "../testing/fixtures";

describe("contactInfoFromEnv", () => {
  it("builds safe tel/mailto values and hides empty entries", () => {
    const c = contactInfoFromEnv({ CONTACT_PHONE: "0901 234 567", CONTACT_EMAIL: "sales@bangkeo.vn" });
    expect(c.phoneHref).toBe("tel:0901234567");
    expect(c.email).toBe("sales@bangkeo.vn");
    expect(c.address).toBeNull();
    expect(c.zaloHref).toBe("https://zalo.me/0901234567");
    expect(contactInfoFromEnv({ CONTACT_PHONE: "+84 901 234 567" }).zaloHref).toBe("https://zalo.me/0901234567");
    expect(hasContactInfo(contactInfoFromEnv({}))).toBe(false);
  });

  it("drops malformed email / phone links", () => {
    const c = contactInfoFromEnv({ CONTACT_PHONE: "call us", CONTACT_EMAIL: "x\"><script>@a.b" });
    expect(c.phoneHref).toBeNull();
    expect(c.email).toBeNull();
  });
});

describe("PresetsShowcase", () => {
  it("renders presets and an empty state", () => {
    const { unmount } = render(<PresetsShowcase presets={[PRESET]} />);
    expect(screen.getByText("48 mm × 100 m · 45 mic")).toBeInTheDocument();
    expect(screen.queryByText("48mm x 100m")).not.toBeInTheDocument();
    unmount();
    render(<PresetsShowcase presets={[]} />);
    expect(screen.getByText(/đang được cập nhật/)).toBeInTheDocument();
  });

  it("buckets strip heights by width", () => {
    expect(stripClass(24)).toBe("h-4");
    expect(stripClass(48)).toBe("h-6");
    expect(stripClass(60)).toBe("h-8");
    expect(stripClass(72)).toBe("h-10");
  });
});

describe("HowItWorks", () => {
  it("renders four steps", () => {
    render(<HowItWorks />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });
});

describe("ProductShowcase", () => {
  it("renders the three tape types under one heading", () => {
    const { container } = render(<ProductShowcase />);
    expect(screen.getByRole("heading", { level: 2, name: /^Chọn loại băng\skeo$/ })).toBeInTheDocument();
    expect(within(container).getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });
});

describe("UseCases", () => {
  it("renders the three scenes, reasons and audiences", () => {
    render(<UseCases />);
    expect(screen.getByRole("heading", { level: 2, name: /thương\shiệu theo đến\sđó/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /Vì sao/ })).toBeInTheDocument();
    for (const name of ["Dán thùng carton", "Dán ly trà sữa", "Thương mại điện tử"]) {
      expect(screen.getByRole("heading", { level: 3, name })).toBeInTheDocument();
    }
    expect(screen.getByText("Dễ phát hiện thùng bị mở")).toBeInTheDocument();
    expect(screen.getByText("Kho vận, logistics")).toBeInTheDocument();
  });
});

describe("Hero", () => {
  it("has one real h1, hides the giant word art and links both CTAs", () => {
    const { container } = render(<Hero />);
    expect(screen.getByRole("heading", { level: 1, name: "Băng keo in logo theo yêu cầu" })).toBeInTheDocument();
    for (const svg of container.querySelectorAll("h1 svg")) expect(svg).toHaveAttribute("aria-hidden", "true");
    const design = screen.getAllByRole("link", { name: "Thiết kế ngay" });
    expect(design.every((a) => a.getAttribute("href") === "/thiet-ke")).toBe(true);
    expect(screen.getByRole("link", { name: "Nhận báo giá" })).toHaveAttribute("href", "/thiet-ke#yeu-cau-bao-gia");
  });

  it("has no spec pill tags (specs live in the product section)", () => {
    const { container } = render(<Hero />);
    expect(within(container).queryByText("Khổ 12 – 80 mm")).not.toBeInTheDocument();
    expect(within(container).queryByText("Báo giá trong ngày làm việc")).not.toBeInTheDocument();
  });

  it("shows the Vĩnh Thịnh logo in the header, linked home", () => {
    const { container } = render(<Hero />);
    const logo = within(container).getByRole("img", { name: "Logo Vĩnh Thịnh" });
    expect(logo).toHaveAttribute("src", "/brand/vinh-thinh-logo.png");
    expect(logo.closest("a")).toHaveAttribute("href", "/");
  });

  it("uses no inline style attributes (CSP: style-src is nonce-only)", () => {
    const { container } = render(<><Hero /><ProductShowcase /><UseCases /><HowItWorks /><DesignCta /></>);
    expect(container.querySelectorAll("[style]")).toHaveLength(0);
  });
});

describe("TapeMarquee", () => {
  it("is decorative and renders its run twice for a seamless loop", () => {
    const { container } = render(<TapeMarquee items={["A", "B"]} />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(screen.getAllByText("A").length % 2).toBe(0);
  });
});

describe("CartonTapeArt", () => {
  it("exposes an accessible label", () => {
    render(<CartonTapeArt caption="Mô phỏng" tapeText="LOGO" />);
    expect(screen.getByRole("img", { name: "Mô phỏng" })).toBeInTheDocument();
  });
});

describe("Contact", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("without contact env: honest copy, quote form as the channel, no CTA buttons", () => {
    vi.stubEnv("CONTACT_PHONE", "");
    vi.stubEnv("CONTACT_EMAIL", "");
    vi.stubEnv("CONTACT_ADDRESS", "");
    vi.stubEnv("CONTACT_HOURS", "");
    const { container } = render(<Contact />);
    const c = within(container);
    expect(c.queryByText(/gửi email/)).not.toBeInTheDocument();
    expect(c.getByRole("link", { name: "Gửi yêu cầu trực tuyến" })).toHaveAttribute("href", "/thiet-ke#yeu-cau-bao-gia");
    expect(c.queryByRole("link", { name: "Thiết kế ngay" })).not.toBeInTheDocument();
    expect(c.queryByText("Tối đa 3 màu")).not.toBeInTheDocument();
  });

  it("with phone and email: shows them as links", () => {
    vi.stubEnv("CONTACT_PHONE", "0901 234 567");
    vi.stubEnv("CONTACT_EMAIL", "sales@bangkeo.vn");
    const { container } = render(<Contact />);
    const c = within(container);
    expect(c.getByRole("link", { name: "0901 234 567" })).toHaveAttribute("href", "tel:0901234567");
    expect(c.getByRole("link", { name: "sales@bangkeo.vn" })).toHaveAttribute("href", "mailto:sales@bangkeo.vn");
    expect(c.getByRole("link", { name: "Nhắn tin tư vấn" })).toHaveAttribute("href", "https://zalo.me/0901234567");
    expect(c.getByText(/Gọi, nhắn Zalo hoặc gửi email/)).toBeInTheDocument();
    expect(c.queryByRole("link", { name: "Gửi yêu cầu trực tuyến" })).not.toBeInTheDocument();
  });
});
