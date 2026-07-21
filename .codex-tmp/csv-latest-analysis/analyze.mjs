import fs from "node:fs/promises";
import { Workbook } from "@oai/artifact-tool";

const inputPath = "C:/Users/USER/Downloads/Supabase Snippet Untitled query.csv";
const csvText = await fs.readFile(inputPath, "utf8");
const workbook = await Workbook.fromCSV(csvText, { sheetName: "Supabase" });

const overview = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 5000,
  tableMaxRows: 5,
  tableMaxCols: 8,
  tableMaxCellChars: 120,
});
console.log("ARTIFACT_INSPECT");
console.log(overview.ndjson);

const sheet = workbook.worksheets.getItem("Supabase");
const used = sheet.getUsedRange(true);
const values = used.values;
const headers = values[0].map(value => String(value ?? "").trim());
const rows = values.slice(1);
const index = Object.fromEntries(headers.map((header, i) => [header, i]));

function toMillis(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value > 1e11 ? value : value * 1000;
  const numberValue = Number(value);
  if (Number.isFinite(numberValue) && numberValue > 0) {
    return numberValue > 1e11 ? numberValue : numberValue * 1000;
  }
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function maxField(field) {
  const column = index[field];
  if (column === undefined) return null;
  let best = null;
  for (const row of rows) {
    const millis = toMillis(row[column]);
    if (millis > 0 && (!best || millis > best.millis)) {
      best = { millis, raw: row[column], id: row[index.id] };
    }
  }
  return best;
}

let maxJsonUpdatedAt = null;
if (index.data !== undefined) {
  for (const row of rows) {
    try {
      const data = typeof row[index.data] === "string"
        ? JSON.parse(row[index.data])
        : row[index.data];
      const millis = toMillis(data && data._updatedAt);
      if (millis > 0 && (!maxJsonUpdatedAt || millis > maxJsonUpdatedAt.millis)) {
        maxJsonUpdatedAt = { millis, raw: data._updatedAt, id: row[index.id] };
      }
    } catch {}
  }
}

const ids = rows.map(row => String(row[index.id] || ""));
console.log("ANALYSIS_JSON");
console.log(JSON.stringify({
  headers,
  exportedRows: rows.length,
  counts: {
    vouchers: ids.filter(id => id.startsWith("v_")).length,
    products: ids.filter(id => id.startsWith("p_")).length,
    partners: ids.filter(id => id.startsWith("part_")).length,
    metadata: ids.filter(id => id === "metadata").length,
  },
  latestLastModified: maxField("last_modified"),
  latestModifiedAt: maxField("modified_at"),
  latestUpdatedAt: maxField("updated_at"),
  latestJsonUpdatedAt: maxJsonUpdatedAt,
  firstFiveIds: ids.slice(0, 5),
}, null, 2));
