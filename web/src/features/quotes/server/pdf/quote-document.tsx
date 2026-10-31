// @react-pdf document for a quote. Rendered on the server only (no runtime <style> injection).
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatVnd } from "@/i18n";
import { vi } from "@/i18n/vi";
import type { QuoteLine } from "@/lib/types";

export interface QuotePdfData {
  code: string;
  customerName: string;
  company: string | null;
  phone: string;
  version: number;
  issuedAt: string;
  validUntil: string | null;
  notes: string | null;
  vatPercent: number;
  subtotal: number;
  vatAmount: number;
  total: number;
  lines: Array<Pick<QuoteLine, "description" | "unit" | "quantity" | "unit_price" | "line_total">>;
}

const t = vi.quotes;
const fmtDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00+07:00` : iso).toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
const fmtQty = (n: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(n);

function makeStyles(fontFamily: string) {
  return StyleSheet.create({
    page: { padding: 36, fontSize: 10, fontFamily, color: "#18181b" },
    brand: { fontSize: 12, fontWeight: "bold" },
    title: { fontSize: 18, fontWeight: "bold", marginTop: 16, marginBottom: 12 },
    meta: { marginBottom: 2 },
    table: { marginTop: 16, borderTopWidth: 1, borderColor: "#d4d4d8" },
    row: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e4e4e7", paddingVertical: 5 },
    head: { fontWeight: "bold", backgroundColor: "#f4f4f5" },
    cIdx: { width: "6%" },
    cDesc: { width: "40%", paddingRight: 4 },
    cUnit: { width: "10%" },
    cQty: { width: "12%", textAlign: "right" },
    cPrice: { width: "16%", textAlign: "right" },
    cTotal: { width: "16%", textAlign: "right" },
    sums: { marginTop: 12, alignSelf: "flex-end", width: "50%" },
    sumRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
    grand: { fontWeight: "bold", fontSize: 12 },
    notes: { marginTop: 16 },
    footer: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 8, color: "#71717a" },
  });
}

export function QuoteDocument({ data, fontFamily }: { data: QuotePdfData; fontFamily: string }) {
  const s = makeStyles(fontFamily);
  return (
    <Document title={`${t.pdfTitle} ${data.code}`} language="vi">
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>{vi.common.appName}</Text>
        <Text style={s.title}>
          {t.pdfTitle} - {data.code} ({data.version > 1 ? `v${data.version}` : "v1"})
        </Text>
        <Text style={s.meta}>
          {t.pdfCustomer}: {data.customerName}
          {data.company ? ` - ${data.company}` : ""}
        </Text>
        <Text style={s.meta}>
          {t.pdfDate}: {fmtDate(data.issuedAt)}
        </Text>
        {data.validUntil ? (
          <Text style={s.meta}>
            {t.validUntil}: {fmtDate(data.validUntil)}
          </Text>
        ) : null}

        <View style={s.table}>
          <View style={[s.row, s.head]} fixed>
            <Text style={s.cIdx}>{t.pdfIndex}</Text>
            <Text style={s.cDesc}>{t.description}</Text>
            <Text style={s.cUnit}>{t.unit}</Text>
            <Text style={s.cQty}>{t.quantity}</Text>
            <Text style={s.cPrice}>{t.unitPrice}</Text>
            <Text style={s.cTotal}>{t.lineTotal}</Text>
          </View>
          {data.lines.map((l, i) => (
            <View style={s.row} key={i} wrap={false}>
              <Text style={s.cIdx}>{i + 1}</Text>
              <Text style={s.cDesc}>{l.description}</Text>
              <Text style={s.cUnit}>{l.unit}</Text>
              <Text style={s.cQty}>{fmtQty(l.quantity)}</Text>
              <Text style={s.cPrice}>{formatVnd(l.unit_price)}</Text>
              <Text style={s.cTotal}>{formatVnd(l.line_total)}</Text>
            </View>
          ))}
        </View>

        <View style={s.sums}>
          <View style={s.sumRow}>
            <Text>{t.subtotal}</Text>
            <Text>{formatVnd(data.subtotal)}</Text>
          </View>
          <View style={s.sumRow}>
            <Text>
              {t.vat} ({fmtQty(data.vatPercent)}%)
            </Text>
            <Text>{formatVnd(data.vatAmount)}</Text>
          </View>
          <View style={[s.sumRow, s.grand]}>
            <Text>{t.total}</Text>
            <Text>{formatVnd(data.total)}</Text>
          </View>
        </View>

        {data.notes ? (
          <View style={s.notes}>
            <Text style={{ fontWeight: "bold" }}>{t.notes}</Text>
            <Text>{data.notes}</Text>
          </View>
        ) : null}

        <Text style={s.footer} fixed>
          {t.pdfFooter}
        </Text>
      </Page>
    </Document>
  );
}
