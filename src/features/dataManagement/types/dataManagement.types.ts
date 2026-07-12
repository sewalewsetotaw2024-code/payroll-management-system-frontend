/**
 * Supported import data types for the payroll system.
 */
export type ImportType = 'EMPLOYEE' | 'ATTENDANCE' | 'ADJUSTMENT';

/**
 * Describes a single column from an imported file, including header name,
 * index, sample values, and the mapped field in the system.
 */
export interface ImportColumn {
  header: string;
  index: number;
  sample: string[];
  mappedField: string;
}

/**
 * Represents a parsed file with its headers, rows, and column mappings.
 */
export interface ParsedFile {
  fileName: string;
  fileSize: number;
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  columns: ImportColumn[];
}

/**
 * Result returned after an import operation completes.
 */
export interface ImportResult {
  attachmentId: string;
  fileName: string;
  fileUrl: string;
  totalRows: number;
  created: number;
  updated?: number;
  imported?: number;
  errors: { row: number; message: string }[];
}

/**
 * A single import record stored in the system, representing an uploaded file.
 */
export interface ImportRecord {
  id: string;
  referenceType: string;
  referenceId: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  folderId?: string | null;
  uploadedBy: number;
  uploadedAt: string;
}

/**
 * Tracks the current state of an import workflow (select, preview, importing, done).
 */
export interface ImportState {
  step: 'select' | 'preview' | 'importing' | 'done';
  importType: ImportType | null;
  parsedFile: ParsedFile | null;
  result: ImportResult | null;
}
