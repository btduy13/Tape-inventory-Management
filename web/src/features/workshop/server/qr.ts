// QR code as SVG markup, rendered on the server (no client QR library, no inline styles: the
// qrcode SVG uses presentation attributes only, which the nonce-only style-src CSP allows).
import "server-only";
import QRCode from "qrcode";

export async function qrSvg(text: string): Promise<string> {
  // Level M + 2-module quiet zone: readable from a creased paper note at arm's length.
  return QRCode.toString(text, { type: "svg", errorCorrectionLevel: "M", margin: 2, color: { dark: "#000000", light: "#ffffff" } });
}
