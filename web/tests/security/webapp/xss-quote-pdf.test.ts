// Rule: the quote PDF treats customer text as plain text: no active content (JS, launch, URI
// actions) can be produced from lead name/company/notes/line descriptions.
import { describe, expect, it } from "vitest";
import { renderQuotePdf } from "@/features/quotes/server/pdf/render";
import { XSS } from "../helpers/web";

describe("quote PDF is inert for hostile customer text", () => {
  it("renders without JavaScript, Launch, URI or OpenAction objects", async () => {
    const bytes = await renderQuotePdf({
      code: "L2610-00001",
      customerName: `Evil ${XSS.tag} /JavaScript (app.alert(1))`,
      company: `${XSS.attr} /URI (https://evil.example)`,
      phone: "0912345678",
      version: 1,
      issuedAt: new Date().toISOString(),
      validUntil: null,
      notes: `${XSS.script}\n/Launch /F (cmd.exe)`,
      vatPercent: 8,
      subtotal: 1000,
      vatAmount: 80,
      total: 1080,
      lines: [{ description: `${XSS.tag} /OpenAction`, unit: "cuộn", quantity: 1, unit_price: 1000, line_total: 1000 }],
    });
    const text = Buffer.from(bytes).toString("latin1");
    expect(text.startsWith("%PDF-")).toBe(true);
    for (const op of ["/JavaScript", "/JS ", "/JS(", "/Launch", "/URI", "/OpenAction", "/AA", "/SubmitForm", "/EmbeddedFile"]) {
      expect(text.includes(op), `PDF contains ${op}`).toBe(false);
    }
  }, 60_000);
});
