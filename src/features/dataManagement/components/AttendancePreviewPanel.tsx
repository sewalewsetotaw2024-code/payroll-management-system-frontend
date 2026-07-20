import React, { useState } from "react";
import { motion } from "motion/react";
import { Loader2, Upload, FolderOpen } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { ParsedWorkbook, ParsedColumn } from "../../../lib/parseBiometricWorkbook";
import { formatHourValue, getSummaryColor } from "../../../lib/parseBiometricWorkbook";
import type { FolderTreeNode } from "../types/folder.types";

/** Number of fixed columns in the preview table (ID, Name, Dept). */
const TABLE_COL_COUNT = 3;

/** Recursively find a folder name by ID in a tree. */
function findFolderName(folders: FolderTreeNode[], id: string): string | null {
  for (const f of folders) {
    if (f.id === id) return f.name;
    if (f.children?.length) {
      const found = findFolderName(f.children, id);
      if (found) return found;
    }
  }
  return null;
}

interface AttendancePreviewPanelProps {
  parsed: ParsedWorkbook;
  folders: FolderTreeNode[];
  uploading: boolean;
  onImport: (folderId: string | null) => void;
  onCancel: () => void;
}

/** Renders a flat list of folders as clickable options with depth indentation. */
function FolderOption({
  folder,
  depth = 0,
  selectedId,
  onSelect,
}: {
  folder: FolderTreeNode;
  depth?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <button
        onClick={() => onSelect(folder.id)}
        className={cn(
          "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
          selectedId === folder.id
            ? "bg-brand-100 text-emerald-800 font-semibold"
            : "hover:bg-slate-100 text-slate-700"
        )}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <FolderOpen className="w-4 h-4 shrink-0 text-slate-400" />
        {folder.name}
      </button>
      {folder.children?.map((child) => (
        <FolderOption
          key={child.id}
          folder={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

export const AttendancePreviewPanel: React.FC<AttendancePreviewPanelProps> = ({
  parsed,
  folders,
  uploading,
  onImport,
  onCancel,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderOpen, setFolderOpen] = useState(false);

  // Dynamically compute per-column totals for every summary field
  const summaryTotals = parsed.summaryCols.reduce<Record<string, number>>((acc, col) => {
    if (col.name) {
      acc[col.name] = parsed.employees.reduce(
        (sum, e) => sum + (Number(e.summaryData[col.name!]) || 0),
        0,
      );
    }
    return acc;
  }, {});

  // Categorize summary columns for styling
  const otColNames = parsed.summaryCols
    .filter((c) => c.name && /ot|overtime/i.test(c.name))
    .map((c) => c.name!);

  // Find selected folder name for display
  const selectedFolderName = selectedFolderId ? findFolderName(folders, selectedFolderId) : null;

  const totalCols = TABLE_COL_COUNT + parsed.summaryCols.length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-8 pt-8 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Attendance Import Preview</h2>
              <p className="text-sm text-slate-500 mt-1">
                {parsed.sheetName} &middot; {parsed.employees.length} employees &middot; {parsed.dayCols.length} days
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-brand-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Employees</p>
              <p className="text-2xl font-black text-emerald-900 mt-1">{parsed.employees.length}</p>
            </div>
            {parsed.summaryCols.filter((c) => c.name).slice(0, 5).map((col) => {
              const total = summaryTotals[col.name!] ?? 0;
              const isOT = /ot|overtime/i.test(col.name!);
              const isAbsence = /absence/i.test(col.name!);
              let cardStyle = "bg-blue-50 border-blue-100 text-blue-900";
              let labelStyle = "text-blue-600";
              if (isOT) { cardStyle = "bg-purple-50 border-purple-100 text-purple-900"; labelStyle = "text-purple-600"; }
              if (isAbsence) { cardStyle = "bg-red-50 border-red-100 text-red-900"; labelStyle = "text-red-600"; }
              if (col.name === "Regular(H)") { cardStyle = "bg-blue-50 border-blue-100 text-blue-900"; labelStyle = "text-blue-600"; }
              return (
                <div key={col.name} className={`rounded-xl p-4 border ${cardStyle}`}>
                  <p className={`text-[11px] font-semibold ${labelStyle} uppercase tracking-wider`}>{col.name}</p>
                  <p className={`text-2xl font-black mt-1 ${cardStyle.split(' ')[2]}`}>{total.toFixed(1)}</p>
                </div>
              );
            })}
          </div>

          {/* Employee Preview Table */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3">Employee Data Preview</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-r border-slate-200/50">ID</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-r border-slate-200/50">Name</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-r border-slate-200/50">Department</th>
                    {parsed.summaryCols.filter((c) => c.name).map((col, ci, arr) => {
                      const isOT = /ot|overtime/i.test(col.name!);
                      return (
                        <th
                          key={col.name}
                          className={cn(
                            `px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-center ${isOT ? "text-purple-500" : "text-slate-400"}`,
                            ci < arr.length - 1 ? 'border-r border-slate-200/50' : ''
                          )}
                        >
                          {col.name}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {parsed.employees.slice(0, 20).map((emp, i) => (
                    <tr key={emp.empId || i} className={cn("border-b border-slate-100 transition-colors", i % 2 === 0 ? 'bg-slate-50/40' : 'bg-white', "hover:bg-brand-50/60 transition-colors")}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 border-r border-slate-200/50">{emp.empId}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-200/50">{emp.firstName}</td>
                      <td className="px-4 py-3 text-slate-500 border-r border-slate-200/50">{emp.department}</td>
                      {parsed.summaryCols.filter((c) => c.name).map((col, ci, arr) => (
                        <td key={col.name} className={cn("px-4 py-3 text-center", ci < arr.length - 1 ? 'border-r border-slate-200/50' : '')}>
                          <span className={getSummaryColor(col.name!, emp.summaryData[col.name!])}>
                            {formatHourValue(emp.summaryData[col.name!])}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                  {parsed.employees.length > 20 && (
                    <tr>
                      <td colSpan={totalCols} className="px-4 py-3 text-center text-xs text-slate-400">
                        + {parsed.employees.length - 20} more employees
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Folder Selector */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3">Target Folder (optional)</h3>
            <div className="relative">
              <button
                onClick={() => setFolderOpen(!folderOpen)}
                className="w-full flex items-center justify-between px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 hover:border-brand-300 transition-colors bg-white"
              >
                <span className={cn(selectedFolderId ? "text-slate-800" : "text-slate-400")}>
                  {selectedFolderId ? selectedFolderName ?? "Unknown folder" : "No folder (file will be root-level)"}
                </span>
                <FolderOpen className="w-4 h-4 text-slate-400" />
              </button>
              {folderOpen && folders.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto p-2">
                  <button
                    onClick={() => { setSelectedFolderId(null); setFolderOpen(false); }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                      !selectedFolderId ? "bg-brand-100 text-emerald-800 font-semibold" : "hover:bg-slate-100 text-slate-700"
                    )}
                  >
                    Root (no folder)
                  </button>
                  {folders.map((f) => (
                    <FolderOption
                      key={f.id}
                      folder={f}
                      selectedId={selectedFolderId}
                      onSelect={(id) => { setSelectedFolderId(id); setFolderOpen(false); }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white z-10 px-8 py-4 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-3xl">
          <button
            onClick={onCancel}
            disabled={uploading}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onImport(selectedFolderId)}
            disabled={uploading}
            className="px-5 py-2.5 text-sm font-bold text-white bg-primary rounded-xl hover:bg-brand-800 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-900/10"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? "Importing..." : "Import to Folder"}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
