import fs from "node:fs";
import path from "node:path";
import { parentPort, workerData } from "node:worker_threads";
import XLSX from "xlsx";
import { parse as parseCsv } from "csv-parse/sync";

function parseSpreadsheetRows(filePath) {
  const extension = path.extname(filePath || "").toLowerCase();

  if (extension === ".xlsx" || extension === ".xls") {
    const workbook = XLSX.readFile(filePath, { cellDates: false });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return [];
    }

    const sheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  }

  if (extension === ".csv") {
    const raw = fs.readFileSync(filePath, "utf8");
    return parseCsv(raw, {
      bom: true,
      skip_empty_lines: false,
      relax_column_count: true
    });
  }

  throw new Error("Extensao de arquivo nao suportada.");
}

try {
  const rows = parseSpreadsheetRows(workerData?.filePath);
  parentPort?.postMessage({ ok: true, rows });
} catch (error) {
  parentPort?.postMessage({
    ok: false,
    error: error?.message || "Falha ao processar planilha."
  });
}

