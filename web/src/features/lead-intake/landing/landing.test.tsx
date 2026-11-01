import { describe, expect, it } from "vitest";
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
import { PRESET } from "../testing/fixtures";

describe("contactInfoFromEnv", () => {
  it("builds safe tel/mailto values and hides empty entries", () => {
    const c = contactInfoFromEnv({ CONTACT_PHONE: "0901 234 567", CONTACT_EMAIL: "sales@bangkeo.vn" });
    expect(c.phoneHref).toBe("tel:0901234567");
    expect(c.email).toBe("sales@bangkeo.vn");
    expect(c.address).toBeNull();
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
    expect(screen.getByText("48mm x 100m")).toBeInTheDocument();
    expect(screen.getByText("48mm × 100m · 45 mic")).toBeInTheDocument();
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
    expect(screen.getByRole("heading", { level: 2, name: "Chọn loại băng keo" })).toBeInTheDocument();
    expect(within(container).getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });
});

describe("UseCases", () => {
  it("renders the three scenes, reasons and audiences", () => {
    render(<UseCases />);
    expect(screen.getByRole("heading", { level: 2, name: /thương hiệu theo đến đó/ })).toBeInTheDocument();
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
