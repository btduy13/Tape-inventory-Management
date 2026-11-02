import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { businessContact } from "../landing/contact-info";
import { QuoteChannels } from "./QuoteChannels";

describe("QuoteChannels", () => {
  it("offers email, Zalo and a phone call", () => {
    render(<QuoteChannels contact={businessContact({})} />);
    const email = screen.getByRole("link", { name: /Gửi email/ });
    expect(email.getAttribute("href")).toMatch(/^mailto:tque36@gmail\.com\?subject=/);
    expect(screen.getByRole("link", { name: /Nhắn Zalo/ })).toHaveAttribute("href", "https://zalo.me/0903003882");
    expect(screen.getByRole("link", { name: /Gọi điện/ })).toHaveAttribute("href", "tel:0903003882");
  });

  it("renders nothing without a channel", () => {
    const { container } = render(<QuoteChannels contact={{ phone: null, phoneHref: null, zaloHref: null, email: null }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
