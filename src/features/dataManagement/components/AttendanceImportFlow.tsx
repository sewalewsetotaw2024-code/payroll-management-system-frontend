import React, { useRef, useState, useEffect } from "react";
import { Loader2, Upload, AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "../../../components/ui/Toast";
import { attendanceApi } from "../../attendance/api/attendanceApi";
import { dataManagementApi } from "../api/dataManagementApi";
import { parseWorkbook } from "../../../lib/parseBiometricWorkbook";
import type { ParsedWorkbook } from "../../../lib/parseBiometricWorkbook";
import type { FolderTreeNode } from "../types/folder.types";
import type { AttendanceImport } from "../../attendance/types/attendance.types";
import { AttendancePreviewPanel } from "./AttendancePreviewPanel";

interface AttendanceImportFlowProps {
  folders: FolderTreeNode[];
  existingImports: AttendanceImport[];
  onComplete: () => void;
  onCancel: () => void;
}

/**
 * Orchestrates the biometric attendance import flow:
 * 1. If an active import exists for the current period, show a blocking modal
 * 2. User selects an .xlsx file
 * 3. File is parsed client-side via XLSX for preview
 * 4. Preview modal shows stats, employee data, folder selector
 * 5. On confirm: upload raw file to backend (auto-active) + create folder attachment
 */
export const AttendanceImportFlow: React.FC<AttendanceImportFlowProps> = ({
  folders,
  existingImports,
  onComplete,
  onCancel,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<File | null>(null);
  const [parsed, setParsed] = useState<ParsedWorkbook | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  /** Track whether the active import was just deactivated — hides the blocking modal. */
  const [deactivated, setDeactivated] = useState(false);

  // Check if there's an active import in the same period
  const activeImport = !deactivated
    ? existingImports.find((imp) => imp.isActive)
    : undefined;

  /** Handle file selection — parse client-side for preview. */
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setParseError(null);
    try {
      const result = await parseWorkbook(file);
      setParsed(result);
      importFileRef.current = file;
    } catch (err: any) {
      setParseError(err.message || "Failed to parse file");
      toast.error("Failed to parse the Excel file. Make sure it's a valid ZKTeco export.");
    } finally {
      setParsing(false);
    }
  };

  /** Deactivate the existing active import. */
  const handleDeactivate = async () => {
    if (!activeImport) return;
    setDeactivating(true);
    try {
      await attendanceApi.toggleImportActive(activeImport.id);
      toast.success(`Deactivated previous import: ${activeImport.periodLabel}`);
      // Mark as deactivated locally so the blocking modal disappears
      // and the useEffect auto-triggers the file picker
      setDeactivated(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to deactivate";
      toast.error(msg);
    } finally {
      setDeactivating(false);
    }
  };

  /** Import the parsed data to the backend + folder system. */
  const handleImport = async (folderId: string | null) => {
    const file = importFileRef.current;
    if (!file) {
      toast.error("File reference lost. Please re-select the file.");
      return;
    }

    setUploading(true);
    try {
      // Step 1: Upload to attendance backend (auto-active)
      const importResult = await attendanceApi.importFile(file);

      // Step 2: Upload to folder system (if a folder was selected)
      if (folderId) {
        try {
          await dataManagementApi.importFile(
            "ATTENDANCE",
            file,
            [],
            undefined,
            folderId
          );
        } catch (storageErr: any) {
          const storageMsg =
            storageErr?.response?.data?.message ||
            storageErr?.message ||
            "File storage failed";
          toast.warning(
            `Attendance imported, but file storage failed: ${storageMsg}`
          );
        }
      }

      toast.success(`Imported ${importResult.totalRecords} attendance records (${importResult.totalEmployees} employees)`);
      importFileRef.current = null;
      onComplete();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Import failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  /** Trigger the hidden file input on mount (only if no active import blocking).
   *  Uses setTimeout + cleanup to prevent StrictMode double-firing in React 19 dev mode. */
  useEffect(() => {
    if (!activeImport) {
      const timer = setTimeout(() => fileInputRef.current?.click(), 50);
      return () => clearTimeout(timer);
    }
  }, [activeImport]);

  // ── Active import blocking modal ───────────────────────────────
  if (activeImport) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Active Import Exists</h3>
              <p className="text-sm text-slate-500">Deactivate or process it before importing new data</p>
            </div>
          </div>

          {/* Existing import details */}
          <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">{activeImport.periodLabel}</span>
              <div className="flex items-center gap-2">
                {activeImport.processedAt && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                    <CheckCircle2 className="w-3 h-3" /> PROCESSED
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                  ACTIVE
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500">Employees</span>
                <p className="font-semibold text-slate-900">{activeImport.totalEmployees}</p>
              </div>
              <div>
                <span className="text-slate-500">Records</span>
                <p className="font-semibold text-slate-900">{activeImport.totalRecords}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Imported</span>
                <p className="font-semibold text-slate-900">
                  {new Date(activeImport.importedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-600 mb-6">
            The new import will automatically become active. You can deactivate this import first,
            or close this dialog and process it through the payroll run instead.
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleDeactivate}
              disabled={deactivating}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {deactivating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deactivating...
                </>
              ) : (
                "Deactivate & Import New"
              )}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2.5 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Parse error state ──────────────────────────────────────────
  if (parseError) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Parse Error</h3>
          <p className="text-sm text-slate-500 mb-6">{parseError}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setParseError(null); if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); } }}
              className="px-5 py-2.5 text-sm font-bold text-white bg-[#047857] rounded-xl hover:bg-[#036246] transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={onCancel}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Parsing state ──────────────────────────────────────────────
  if (parsing) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 p-8 text-center">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-700">Parsing biometric file...</p>
        </div>
      </div>
    );
  }

  // ── Preview state ──────────────────────────────────────────────
  if (parsed) {
    return (
      <AttendancePreviewPanel
        parsed={parsed}
        folders={folders}
        uploading={uploading}
        onImport={handleImport}
        onCancel={onCancel}
      />
    );
  }

  // ── Hidden file input — auto-triggered on mount ────────────────
  return (
    <input
      ref={fileInputRef}
      type="file"
      accept=".xlsx,.xls"
      className="hidden"
      onChange={handleFileSelected}
    />
  );
};
