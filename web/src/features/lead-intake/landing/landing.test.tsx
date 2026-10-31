import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { contactInfoFromEnv, hasContactInfo } from "./contact-info";
import { PresetsShowcase, stripClass } from "./PresetsShowcase";
import { HowItWorks } from "./HowItWorks";
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
