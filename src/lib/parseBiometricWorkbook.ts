import * as XLSX from "xlsx";

/** Leave column names to exclude from summary fields. */
const LEAVE_KEYWORDS = [
  "Annual Leave",
  "Sick Leave",
  "Casual Leave",
  "Maternity Leave",
  "Compassionate Leave",
  "Compensatory Leave",
];

function isLeaveColumn(name: string): boolean {
  return LEAVE_KEYWORDS.some((k) =>
    name.toLowerCase().includes(k.toLowerCase())
  );
}

/** Single parsed day-data entry for one employee. */
export interface ParsedDayData {
  [key: string]: number | null; // key = `${date}_${colIndex}`
}

/** A single column definition in the parsed workbook. */
export interface ParsedColumn {
  index: number;
  type: "day" | "summary";
  date?: string;
  dayOfWeek?: string;
  name?: string;
}

/** Parsed employee row from the biometric workbook. */
export interface ParsedEmployee {
  empId: string;
  firstName: string;
  department: string;
  cardNumber?: string;
  dayData: ParsedDayData;
  summaryData: Record<string, number | null>;
}

/** Full result of parsing a biometric workbook. */
export interface ParsedWorkbook {
  employees: ParsedEmployee[];
  dayCols: ParsedColumn[];
  summaryCols: ParsedColumn[];
  sheetName: string;
}

/**
 * Parses a ZKTeco biometric Monthly Hours Excel file (.xlsx) entirely
 * client-side using the XLSX library. Returns structured employee data
 * with daily attendance records and monthly summary fields.
 *
 * Expected sheet layout:
 *   Row 0: Company name (ignored)
 *   Row 1: Day-of-week labels (Sun, Mon, Tu, ...)
 *   Row 2: Employee ID | First Name | Department | Card Number | <day numbers> | <summary col names>
 *   Row 3+: Employee data rows
 *
 * @param file - The Excel File object from a file input or drop event.
 * @returns ParsedWorkbook with employees, column definitions, and sheet name.
 */
export async function parseWorkbook(file: File): Promise<ParsedWorkbook> {
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  const wb = XLSX.read(data, { type: "array" });

  // Find the main data sheet (skip Sheet1 which is usually a scratch sheet)
  const sheetName =
    wb.SheetNames.find((n) => n !== "Sheet1") || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  // Get raw 2D array
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  const headerRow1: any[] = raw[1] || []; // day-of-week row
  const headerRow2: any[] = raw[2] || []; // date numbers + col names

  const FIXED_COLS = 4;
  const columns: ParsedColumn[] = [];

  for (let i = FIXED_COLS; i < headerRow2.length; i++) {
    const h2 = headerRow2[i];
    if (h2 === null || h2 === undefined) continue;
    const isDateCol =
      typeof h2 === "number" || (typeof h2 === "string" && /^\d+$/.test(String(h2).trim()));

    if (isDateCol) {
      const dayOfWeek = headerRow1[i] || "";
      columns.push({
        index: i,
        type: "day",
        date: String(h2).trim(),
        dayOfWeek: String(dayOfWeek),
      });
    } else {
      const name = String(h2).trim();
      if (!isLeaveColumn(name)) {
        columns.push({ index: i, type: "summary", name });
      }
    }
  }

  // Parse data rows (row 3 onwards)
  const employees: ParsedEmployee[] = [];
  for (let r = 3; r < raw.length; r++) {
    const row = raw[r];
    if (!row || row.every((v: any) => v === null || v === undefined || v === "")) continue;
    const empId = String(row[0] ?? "");
    const firstName = String(row[1] ?? "");
    const department = String(row[2] ?? "");
    const cardNumber = String(row[3] ?? "").trim();
    if (!firstName && !empId) continue;

    const dayData: ParsedDayData = {};
    const summaryData: Record<string, number | null> = {};

    for (const col of columns) {
      const val = row[col.index];
      const num = val !== null && val !== undefined ? parseFloat(String(val)) : null;
      if (col.type === "day") {
        dayData[`${col.date}_${col.index}`] = isNaN(num as number) ? null : num;
      } else if (col.name) {
        summaryData[col.name] = isNaN(num as number) ? null : num;
      }
    }

    employees.push({ empId, firstName, department, cardNumber: cardNumber || undefined, dayData, summaryData });
  }

  const dayCols = columns.filter((c) => c.type === "day");
  const summaryCols = columns.filter((c) => c.type === "summary");

  return { employees, dayCols, summaryCols, sheetName };
}

/** Day-of-week strings that are considered non-working days. */
export const WEEKEND_DAYS = ["Sun", "Sat"];

/**
 * Safely formats a numeric value for display.
 * Returns "\u2014" for null/undefined values.
 */
export function formatHourValue(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return "\u2014";
  const n = Number(val);
  if (isNaN(n)) return "\u2014";
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

/**
 * Returns a Tailwind color class for a daily hour value.
 */
export function getHourColor(val: number | null | undefined): string {
  if (!val || val <= 0) return "text-slate-600";
  if (val >= 8) return "text-blue-400 font-semibold";
  if (val >= 4) return "text-blue-300";
  return "text-amber-400";
}

/**
 * Returns a Tailwind color class for a summary metric value.
 */
export function getSummaryColor(name: string, val: number | null | undefined): string {
  if (!val || val <= 0) return "";
  if (name.includes("Absence") && val > 0) return "text-red-400 font-semibold";
  if ((name.includes("OT") || name.includes("Overtime")) && val > 0) return "text-green-400 font-semibold";
  if ((name.includes("Late") || name.includes("Early Out")) && val > 0) return "text-amber-400";
  return "";
}
