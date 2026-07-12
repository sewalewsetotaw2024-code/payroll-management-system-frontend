import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Table,
  MapPin,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from '../../../components/ui/Toast';
import { dataManagementApi } from '../api/dataManagementApi';
import {
  FIELD_MAP,
  EMPLOYEE_FIELDS,
  ATTENDANCE_FIELDS,
  ADJUSTMENT_FIELDS,
  IMPORT_TYPES,
} from '../constants';
import type {
  ImportType,
  ImportResult,
  ParsedFile,
  ImportColumn,
} from '../types/dataManagement.types';

/**
 * Simplified folder node structure used for folder selection in the import modal.
 */
interface FolderNode {
  id: string;
  name: string;
  fileCount: number;
  children?: FolderNode[];
}

/**
 * Props for the ImportModal component.
 */
interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importType: ImportType;
  onComplete: () => void;
  initialFile?: File | null;
  folders?: FolderNode[];
  initialFolderId?: string | null;
}

/**
 * Strips the UTF-8 BOM character from the beginning of a string, if present.
 *
 * @param s - The string to clean.
 * @returns The string without a leading BOM character.
 */
function stripBOM(s: string): string {
  return s.replace(/^\uFEFF/, '');
}

/**
 * Detects the system field name for a given file column header using the FIELD_MAP.
 *
 * @param header - The raw column header from the imported file.
 * @returns The mapped system field name, or an empty string if unmapped.
 */
function detectField(header: string): string {
  const key = stripBOM(header).toLowerCase().trim();
  return FIELD_MAP[key] ?? '';
}

/**
 * Parses an uploaded Excel or CSV file into a structured ParsedFile object.
 * Reads the file, normalises headers (strips BOM, trims), detects field mappings,
 * and extracts sample data for each column.
 *
 * @param file - The File object to parse.
 * @returns Promise resolving to the parsed file data.
 */
function parseFile(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          defval: '',
        });

        if (!rawJson.length) {
          reject(new Error('File is empty'));
          return;
        }

        // Normalise headers: strip BOM, trim whitespace
        const rawHeaders = Object.keys(rawJson[0]);
        const headers = rawHeaders.map((h) => stripBOM(h).trim() || h);

        // Remap row keys to cleaned headers so row[header] lookups work
        const json = rawJson.map((row) => {
          const clean: Record<string, unknown> = {};
          rawHeaders.forEach((raw) => {
            clean[stripBOM(raw).trim() || raw] = row[raw];
          });
          return clean;
        });

        const columns: ImportColumn[] = headers.map((header, i) => ({
          header,
          index: i,
          sample: json.slice(0, 3).map((r) => String(r[header] ?? '')),
          mappedField: detectField(header),
        }));

        resolve({
          fileName: file.name,
          fileSize: file.size,
          headers,
          rows: json,
          totalRows: json.length,
          columns,
        });
      } catch (err) {
        reject(new Error('Failed to parse file. Ensure it is a valid Excel or CSV file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * ImportModal component that provides a multi-step wizard for importing data files.
 * Steps: select (choose import type) -> preview (review column mappings and data) ->
 * importing (processing) -> done (results summary). Supports folder assignment and
 * custom field mapping.
 */
export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  importType,
  onComplete,
  initialFile,
  folders = [],
  initialFolderId,
}) => {
  const [step, setStep] = useState<'select' | 'preview' | 'importing' | 'done'>('select');
  const [selectedType, setSelectedType] = useState<ImportType>(importType);
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [columns, setColumns] = useState<ImportColumn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseAndSetFile = useCallback(async (file: File) => {
    setError(null);
    try {
      const parsed = await parseFile(file);
      setParsedFile(parsed);
      setColumns(parsed.columns);
      setOriginalFile(file);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep(initialFile ? 'preview' : 'select');
      setParsedFile(null);
      setResult(null);
      setError(null);
      setSelectedType(importType);
      setOriginalFile(initialFile ?? null);
      setSelectedFolderId(initialFolderId ?? null);
    }
  }, [isOpen, importType, initialFile, initialFolderId]);

  useEffect(() => {
    if (isOpen && initialFile) {
      parseAndSetFile(initialFile);
    }
  }, [isOpen, initialFile, parseAndSetFile]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await parseAndSetFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [parseAndSetFile]);

  const handleColumnChange = useCallback((index: number, value: string) => {
    setColumns((prev) =>
      prev.map((c, i) => (i === index ? { ...c, mappedField: value } : c))
    );
  }, []);

  const handleImport = useCallback(async () => {
    if (!parsedFile || !originalFile) return;

    const mappedData = parsedFile.rows.map((row) => {
      const mapped: Record<string, unknown> = {};
      columns.forEach((col) => {
        if (col.mappedField && col.mappedField !== '_skip') {
          const val = row[col.header];
          if (col.mappedField === 'basicSalary' || col.mappedField === 'grossSalary' || col.mappedField === 'amount') {
            mapped[col.mappedField] = val ? Number(val) : undefined;
          } else if (col.mappedField === 'isAbsent') {
            mapped[col.mappedField] = val === true || val === 'true' || val === '1' || val === 'yes';
          } else if (col.mappedField === 'regularHours' || col.mappedField === 'lateMinutes') {
            mapped[col.mappedField] = val ? Number(val) : undefined;
          } else if (col.mappedField === 'tinNumber' || col.mappedField === 'pensionNumber') {
            mapped[col.mappedField] = val != null ? String(val) : undefined;
          } else {
            mapped[col.mappedField] = val || undefined;
          }
        }
      });
      return mapped;
    });

    setStep('importing');
    try {
      const res = await dataManagementApi.importFile(
        selectedType,
        originalFile,
        mappedData,
        undefined,
        selectedFolderId ?? undefined,
      );
      setResult(res);
      setStep('done');
      const total = (res.created ?? 0) + (res.updated ?? 0) + (res.imported ?? 0);
      if (res.errors?.length) {
        toast.warning(`Imported ${total} records with ${res.errors.length} errors`);
      } else {
        toast.success(`Imported ${total} records`);
      }
      onComplete();
    } catch (err: any) {
      const msg = err?.response?.data?.message
        || err?.response?.data?.error
        || err?.message
        || 'Import failed';
      const detail = err?.response?.data?.stack ? '' : err?.response?.data?.details || '';
      toast.error(`${msg}${detail ? ` — ${detail}` : ''}`);
      setStep('preview');
      setError(`${msg}${detail ? ` — ${detail}` : ''}`);
    }
  }, [parsedFile, columns, selectedType, originalFile, onComplete]);

  /**
   * Flattens a nested folder tree into a flat list with depth information for rendering options.
   *
   * @param nodes - The folder nodes to flatten.
   * @param depth - The current recursion depth.
   * @returns A flat array of folder entries with depth metadata.
   */
  const flattenFolders = (nodes: FolderNode[], depth: number = 0): { id: string; label: string; depth: number }[] => {
    const result: { id: string; label: string; depth: number }[] = [];
    for (const node of nodes) {
      result.push({ id: node.id, label: node.name, depth });
      if (node.children && node.children.length > 0) {
        result.push(...flattenFolders(node.children, depth + 1));
      }
    }
    return result;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const availableFields = selectedType === 'EMPLOYEE'
    ? EMPLOYEE_FIELDS
    : selectedType === 'ATTENDANCE'
    ? ATTENDANCE_FIELDS
    : ADJUSTMENT_FIELDS;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            {step !== 'select' && (
              <button
                onClick={() => setStep('select')}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {step === 'select' ? 'Import Data' :
                 step === 'preview' ? 'Review & Import' :
                 step === 'importing' ? 'Importing...' : 'Import Complete'}
              </h3>
              <p className="text-sm text-slate-500">
                {step === 'select' ? 'Choose what type of data to import' :
                 parsedFile ? `${parsedFile.fileName} (${formatFileSize(parsedFile.fileSize)})` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'select' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {IMPORT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => {
                    setSelectedType(type.value);
                    fileInputRef.current?.click();
                  }}
                  className={`p-6 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    selectedType === type.value
                      ? 'border-emerald-400 bg-emerald-50/50'
                      : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl ${type.color} bg-opacity-10 flex items-center justify-center mb-4`}>
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-bold text-slate-800 mb-1">{type.label}</p>
                  <p className="text-xs text-slate-500">{type.desc}</p>
                </button>
              ))}
            </div>
          )}

          {step === 'preview' && parsedFile && (
            <div className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Folder Assignment — nested tree dropdown */}
              {folders.length > 0 && (
                <div className="flex items-center gap-3">
                  <label className="text-sm font-bold text-slate-600 whitespace-nowrap">
                    Assign to folder:
                  </label>
                  <div className="relative">
                    <select
                      value={selectedFolderId ?? ''}
                      onChange={(e) => setSelectedFolderId(e.target.value || null)}
                      className="text-sm border border-slate-200 rounded-xl px-3 py-2 pr-8 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 appearance-none cursor-pointer min-w-[200px]"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 10px center',
                        backgroundSize: '14px',
                      }}
                    >
                      <option value="">— No folder —</option>
                      {flattenFolders(folders).map((f) => (
                        <option key={f.id} value={f.id}>
                          {'\u00A0\u00A0'.repeat(f.depth)}{f.depth > 0 ? '\u2514\u00A0' : ''}{f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Column Mapping */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <h4 className="font-bold text-sm text-slate-700">Column Mapping</h4>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase">File Column</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase">Sample Data</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase">Map To</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {columns.map((col, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 font-medium text-slate-700">{col.header}</td>
                          <td className="px-4 py-2.5 text-slate-400 text-xs max-w-[200px] truncate">
                            {col.sample.filter(Boolean).join(', ') || '(empty)'}
                          </td>
                          <td className="px-4 py-2.5">
                            <select
                              value={col.mappedField}
                              onChange={(e) => handleColumnChange(i, e.target.value)}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 w-full max-w-[200px]"
                            >
                              {availableFields.map((f) => (
                                <option key={f.value} value={f.value}>
                                  {f.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Data Preview */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Table className="w-4 h-4 text-slate-400" />
                  <h4 className="font-bold text-sm text-slate-700">
                    Data Preview
                    <span className="font-normal text-slate-400 ml-2">
                      — {parsedFile.totalRows} rows (showing first 5)
                    </span>
                  </h4>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase">#</th>
                        {columns.filter((c) => c.mappedField && c.mappedField !== '_skip').map((col) => (
                          <th key={col.index} className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">
                            {col.mappedField}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedFile.rows.slice(0, 5).map((row, ri) => (
                        <tr key={ri} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 text-xs text-slate-400 font-mono">{ri + 1}</td>
                          {columns.filter((c) => c.mappedField && c.mappedField !== '_skip').map((col) => (
                            <td key={col.index} className="px-4 py-2 text-slate-700 max-w-[150px] truncate">
                              {String(row[col.header] ?? '') || <span className="text-slate-300">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
              <p className="text-lg font-bold text-slate-800">Importing data...</p>
              <p className="text-sm text-slate-500 mt-1">Please wait while we process your file</p>
            </div>
          )}

          {step === 'done' && result && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-xl font-bold text-slate-900">Import Complete</p>
                <p className="text-sm text-slate-500 mt-1">{result.fileName}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="text-2xl font-black text-slate-900">{result.totalRows}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Total Rows</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl text-center">
                  <p className="text-2xl font-black text-emerald-600">{result.created}</p>
                  <p className="text-[10px] font-bold text-emerald-500 uppercase mt-1">Created</p>
                </div>
                {(result.updated ?? 0) > 0 && (
                  <div className="p-4 bg-blue-50 rounded-xl text-center">
                    <p className="text-2xl font-black text-blue-600">{result.updated}</p>
                    <p className="text-[10px] font-bold text-blue-500 uppercase mt-1">Updated</p>
                  </div>
                )}
                <div className={`p-4 rounded-xl text-center ${result.errors.length > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <p className={`text-2xl font-black ${result.errors.length > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {result.errors.length}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Errors</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm font-bold text-red-800 mb-2">Row Errors</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-600">
                        Row {err.row}: {err.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 shrink-0">
          {step === 'select' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Select File
              </button>
            </>
          )}
          {step === 'preview' && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Change File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                onClick={handleImport}
                className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer flex items-center gap-2"
              >
                <ChevronRight className="w-4 h-4" />
                Import Data
              </button>
            </>
          )}
          {step === 'done' && (
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
