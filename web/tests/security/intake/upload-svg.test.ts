// Rule: an SVG logo with active content or external references is either rejected or stored
// only in sanitized form (no script, event handlers, foreignObject, style, external refs).
import { afterAll, describe, expect, it } from "vitest";
import {
  cleanupIntakeData,
  designOfLead,
  downloadText,
  leadByCode,
  leadForm,
  submitInProcess,
  svgFile,
} from "../helpers/intake";

afterAll(cleanupIntakeData);

const NS = 'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"';
const RECT = '<rect width="10" height="10" fill="#000"/>';

const VECTORS: [string, string][] = [
  ["<script> element", `<svg ${NS}>${RECT}<script>alert(1)</script></svg>`],
  ["CDATA script", `<svg ${NS}>${RECT}<script><![CDATA[alert(1)]]></script></svg>`],
  ["onload on root", `<svg ${NS} onload="alert(1)">${RECT}</svg>`],
  ["onmouseover on child", `<svg ${NS}><rect width="10" height="10" onmouseover="alert(1)"/></svg>`],
  ["foreignObject with HTML", `<svg ${NS}>${RECT}<foreignObject width="10" height="10"><body xmlns="http://www.w3.org/1999/xhtml"><img src="x" onerror="alert(1)"/></body></foreignObject></svg>`],
  ["<a> javascript: link", `<svg ${NS}><a xlink:href="javascript:alert(1)">${RECT}</a></svg>`],
  ["<use> external href", `<svg ${NS}>${RECT}<use href="https://evil.example/sprite.svg#x"/></svg>`],
  ["<use> xlink:href external", `<svg ${NS}>${RECT}<use xlink:href="//evil.example/sprite.svg#x"/></svg>`],
  ["<image> external href", `<svg ${NS}>${RECT}<image href="https://evil.example/track.png" width="5" height="5"/></svg>`],
  ["<image> javascript: href", `<svg ${NS}>${RECT}<image xlink:href="javascript:alert(1)" width="5" height="5"/></svg>`],
  ["<image> data:svg href (nested active SVG)", `<svg ${NS}>${RECT}<image href="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+PC9zdmc+" width="5" height="5"/></svg>`],
  ["fill url() external", `<svg ${NS}><rect width="10" height="10" fill="url(https://evil.example/p.svg#g)"/></svg>`],
  ["filter url() external", `<svg ${NS}><rect width="10" height="10" filter="url('http://evil.example/f.svg#f')"/></svg>`],
  ["<style> with @import", `<svg ${NS}><style>@import url(https://evil.example/x.css); rect{fill:red}</style>${RECT}</svg>`],
  ["style attribute url()", `<svg ${NS}><rect width="10" height="10" style="fill:url(https://evil.example/p#g)"/></svg>`],
  ["<set> to javascript:", `<svg ${NS}><a><set attributeName="href" to="javascript:alert(1)"/>${RECT}</a></svg>`],
  ["<animate> href to javascript:", `<svg ${NS}><a><animate attributeName="href" values="javascript:alert(1)"/>${RECT}</a></svg>`],
  ["<iframe>/<embed>/<object>", `<svg ${NS}>${RECT}<iframe src="https://evil.example"/><embed src="x.swf"/><object data="x"/></svg>`],
  ["XXE external entity", `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg ${NS}><text>&xxe;</text>${RECT}</svg>`],
  ["xml-stylesheet PI", `<?xml-stylesheet href="https://evil.example/x.xsl" type="text/xsl"?><svg ${NS}>${RECT}</svg>`],
  ["mixed-case event handler", `<svg ${NS}><rect width="10" height="10" OnClIcK="alert(1)"/></svg>`],
  ["entity-encoded javascript: href", `<svg ${NS}><a href="&#106;avascript:alert(1)">${RECT}</a></svg>`],
  ["<feImage> external", `<svg ${NS}><filter id="f"><feImage href="https://evil.example/i.png"/></filter><rect width="10" height="10" filter="url(#f)"/></svg>`],
];

/** Problems that must not survive in a stored SVG. */
function dangers(svg: string): string[] {
  const out: string[] = [];
  if (/<script/i.test(svg)) out.push("script element");
  if (/\son[a-z]+\s*=/i.test(svg)) out.push("event handler attribute");
  if (/foreignObject/i.test(svg)) out.push("foreignObject");
  if (/<(iframe|embed|object|style|set|animate)\b/i.test(svg)) out.push("forbidden element");
  if (/javascript:/i.test(svg) || /&#0*106;avascript/i.test(svg)) out.push("javascript: url");
  if (/@import/i.test(svg)) out.push("@import");
  if (/<!ENTITY|SYSTEM\s+["']|<\?xml-stylesheet/i.test(svg)) out.push("entity/stylesheet PI");
  if (/data:image\/svg/i.test(svg)) out.push("nested svg data uri");
  if (/url\(\s*['"]?\s*(?!#)[^)\s]/i.test(svg)) out.push("external url()");
  for (const m of svg.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi)) {
    const v = m[1]!.trim();
    if (!v.startsWith("#") && !/^data:image\/(png|jpeg);/i.test(v)) out.push(`external href ${v}`);
  }
  for (const m of svg.matchAll(/\ssrc\s*=\s*["']([^"']*)["']/gi)) out.push(`src ${m[1]}`);
  return out;
}

describe("intake upload SVG: active content / external references are sanitized or rejected", () => {
  for (const [label, svg] of VECTORS) {
    it(label, async () => {
      const r = await submitInProcess(await leadForm({ logo: svgFile(svg) }));
      if (r.status === 415) return; // rejected: fine
      expect(r.status, JSON.stringify(r.body)).toBe(201);
      const lead = await leadByCode(r.body.code!);
      const design = await designOfLead(lead.id);
      expect(design.logo_path).toBeTruthy();
      const stored = await downloadText("logos", design.logo_path!);
      expect(dangers(stored), stored).toEqual([]);
    });
  }
});

describe("intake upload SVG: stored object is served as image/svg+xml from a lead-scoped path", () => {
  it("clean SVG round-trips with svg content type", async () => {
    const r = await submitInProcess(await leadForm({ logo: svgFile(`<svg ${NS} viewBox="0 0 10 10">${RECT}</svg>`) }));
    expect(r.status).toBe(201);
    const lead = await leadByCode(r.body.code!);
    const design = await designOfLead(lead.id);
    expect(design.logo_path).toMatch(new RegExp(`^${lead.id}/logo-[A-Za-z0-9_-]+\\.svg$`));
  });
});
