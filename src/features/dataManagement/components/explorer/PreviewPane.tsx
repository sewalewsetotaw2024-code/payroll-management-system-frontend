import React, { useState } from 'react';
import {
  X,
  Download,
  FolderUp,
  FileText,
  Users,
  Clock,
  FileSpreadsheet,
  User,
  Calendar,
  HardDrive,
  FileType,
} from 'lucide-react';
import { cn, getFileExtension } from '../../../../lib/utils';
import { toast } from '../../../../components/ui/Toast';
import type { ImportRecord } from '../../types/dataManagement.types';
import type { FolderTreeNode } from '../../types/folder.types';

/* ---------- Helpers ---------- */

/**
 * Returns the display label for a given reference type ID.
 *
 * @param refId - The reference type identifier.
 * @returns A human-readable label.
 */
const typeLabel = (refId: string): string => {
  const map: Record<string, string> = {
    EMPLOYEE: 'Employee Data',
    ATTENDANCE: 'Attendance',
    ADJUSTMENT: 'Adjustments',
  };
  return map[refId] || refId;
};

/**
 * Returns Tailwind color classes for the badge of a given reference type.
 *
 * @param refId - The reference type identifier.
 * @returns Space-separated Tailwind classes.
 */
const typeColor = (refId: string): string => {
  const map: Record<string, string> = {
    EMPLOYEE: 'bg-emerald-100 text-emerald-700',
    ATTENDANCE: 'bg-blue-100 text-blue-700',
    ADJUSTMENT: 'bg-amber-100 text-amber-700',
  };
  return map[refId] || 'bg-slate-100 text-slate-700';
};

/**
 * Returns the appropriate icon component for a given reference type.
 *
 * @param refId - The reference type identifier.
 * @returns A ReactNode containing the icon.
 */
const typeIcon = (refId: string): React.ReactNode => {
  const map: Record<string, React.ReactNode> = {
    EMPLOYEE: <Users className="w-5 h-5" />,
    ATTENDANCE: <Clock className="w-5 h-5" />,
    ADJUSTMENT: <FileSpreadsheet className="w-5 h-5" />,
  };
  return map[refId] || <FileText className="w-5 h-5" />;
};

/**
 * Returns Tailwind classes for the icon container background and color.
 *
 * @param refId - The reference type identifier.
 * @returns Space-separated Tailwind classes.
 */
const typeIconColor = (refId: string): string => {
  const map: Record<string, string> = {
    EMPLOYEE: 'text-emerald-500 bg-emerald-50',
    ATTENDANCE: 'text-blue-500 bg-blue-50',
    ADJUSTMENT: 'text-amber-500 bg-amber-50',
  };
  return map[refId] || 'text-slate-400 bg-slate-50';
};

/**
 * Formats a byte count into a human-readable string.
 *
 * @param bytes - The number of bytes.
 * @returns A formatted string with the appropriate unit.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Formats an ISO date string into a locale-friendly date with time.
 *
 * @param dateStr - The ISO date string to format.
 * @returns A formatted date string with time.
 */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ---------- Move-to-folder popover ---------- */

/**
 * Props for the MovePopover component.
 */
interface MovePopoverProps {
  folders: FolderTreeNode[];
  onMove: (folderId: string | null) => void;
  onClose: () => void;
}

/**
 * Popover component for selecting a destination folder to move the previewed file.
 * Closes on outside click.
 */
function MovePopover({ folders, onMove, onClose }: MovePopoverProps) {
  const popoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const renderFolderOptions = (nodes: FolderTreeNode[], depth: number = 0): React.ReactNode[] => {
    const items: React.ReactNode[] = [];
    for (const node of nodes) {
      items.push(
        <button
          key={node.id}
          type="button"
          onClick={() => {
            onMove(node.id);
            onClose();
          }}
          className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
        >
          <FolderUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>,
      );
      if (node.children && node.children.length > 0) {
        items.push(...renderFolderOptions(node.children, depth + 1));
      }
    }
    return items;
  };

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 bottom-full mb-1 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 min-w-[180px] max-h-[240px] overflow-y-auto"
    >
      {renderFolderOptions(folders)}
      <div className="border-t border-slate-100 my-1" />
      <button
        type="button"
        onClick={() => {
          onMove(null);
          onClose();
        }}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="truncate">Remove from folder</span>
      </button>
    </div>
  );
}

/* ---------- Preview Pane ---------- */

/**
 * Props for the PreviewPane component.
 */
interface PreviewPaneProps {
  file: ImportRecord | null;
  folders: FolderTreeNode[];
  onClose: () => void;
  onMoveFile: (attachmentId: string, folderId: string | null) => Promise<void>;
}

/**
 * PreviewPane component that shows detailed information about a selected file,
 * including metadata, download, and move-to-folder actions. Displays a placeholder
 * prompt when no file is selected.
 */
export const PreviewPane: React.FC<PreviewPaneProps> = ({
  file,
  folders,
  onClose,
  onMoveFile,
}) => {
  const [showMovePopover, setShowMovePopover] = useState(false);

  if (!file) {
    return (
      <aside className="w-[240px] shrink-0 bg-white border-l border-slate-100 flex flex-col items-center justify-center text-slate-400">
        <FileText className="w-8 h-8 mb-2 text-slate-200" />
        <p className="text-xs font-medium">Select a file to preview</p>
      </aside>
    );
  }

  const handleDownload = () => {
    const url = file.filePath?.replace('/upload/', '/upload/fl_attachment/');
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.error('Download URL not available');
    }
  };

  const handleMove = (folderId: string | null) => {
    onMoveFile(file.id, folderId).catch((err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to move file');
    });
  };

  return (
    <aside className="w-[240px] shrink-0 bg-white border-l border-slate-100 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Preview</span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close preview"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Icon + name */}
      <div className="flex flex-col items-center gap-2 px-4 py-5 border-b border-slate-50">
        <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center', typeIconColor(file.referenceId))}>
          {typeIcon(file.referenceId)}
        </div>
        <p className="text-sm font-semibold text-slate-800 text-center break-all line-clamp-2">
          {file.fileName}
        </p>
        <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', typeColor(file.referenceId))}>
          {typeLabel(file.referenceId)}
        </span>
      </div>

      {/* Metadata */}
      <div className="px-4 py-3 space-y-3">
        <div className="space-y-2">
          <MetaRow icon={<FileType className="w-3.5 h-3.5" />} label="Format" value={getFileExtension(file.fileName).toUpperCase() || '—'} />
          <MetaRow icon={<HardDrive className="w-3.5 h-3.5" />} label="File size" value={formatBytes(file.sizeBytes)} />
          <MetaRow icon={<Calendar className="w-3.5 h-3.5" />} label="Uploaded" value={formatDate(file.uploadedAt)} />
          <MetaRow icon={<User className="w-3.5 h-3.5" />} label="Uploaded by" value={`User #${file.uploadedBy}`} />
        </div>

        {/* Folder info */}
        <div className="border-t border-slate-50 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Location</p>
          <p className="text-xs font-medium text-slate-600">
            {file.folderId ? `Folder: ${file.folderId}` : 'Root / No folder'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-auto px-4 py-3 border-t border-slate-100 space-y-2">
        <button
          type="button"
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" /> Download
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMovePopover((prev) => !prev)}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <FolderUp className="w-3.5 h-3.5" /> Move to folder
          </button>
          {showMovePopover && (
            <MovePopover
              folders={folders}
              onMove={handleMove}
              onClose={() => setShowMovePopover(false)}
            />
          )}
        </div>
      </div>
    </aside>
  );
};

/* ---------- Meta Row ---------- */

/**
 * MetaRow component that renders a single metadata key-value pair with an icon.
 *
 * @param icon - The icon element to display.
 * @param label - The metadata field label.
 * @param value - The metadata field value.
 */
function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <span className="text-xs font-medium text-slate-700 truncate">{value}</span>
      </div>
    </div>
  );
}
