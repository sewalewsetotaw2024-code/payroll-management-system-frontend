import React, { useState, useMemo, useCallback } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  FileText,
  Folder,
  FolderOpen,
  FolderUp,
  GripVertical,
  MoreHorizontal,
  Eye,
  Scissors,
} from 'lucide-react';
import { cn, getFileExtension } from '../../../../lib/utils';
import { useFileDragDrop } from '../../hooks/useFileDragDrop';
import type { ImportRecord } from '../../types/dataManagement.types';
import type { FolderTreeNode } from '../../types/folder.types';

/* ---------- Types ---------- */

/**
 * Sortable column keys for the file list view.
 */
type SortKey = 'fileName' | 'referenceId' | 'uploadedAt' | 'sizeBytes' | 'status';

/**
 * Sort direction for the file list.
 */
type SortDir = 'asc' | 'desc';

/* ---------- Helpers ---------- */

/**
 * Returns the user-facing label for a given reference type ID.
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
 * Returns Tailwind CSS color classes for the badge of a given reference type.
 *
 * @param refId - The reference type identifier.
 * @returns Space-separated Tailwind classes for background and text color.
 */
const typeColor = (refId: string): string => {
  const map: Record<string, string> = {
    EMPLOYEE: 'bg-brand-100 text-emerald-700',
    ATTENDANCE: 'bg-blue-100 text-blue-700',
    ADJUSTMENT: 'bg-amber-100 text-amber-700',
  };
  return map[refId] || 'bg-slate-100 text-slate-700';
};

/**
 * Returns Tailwind CSS color classes for an import status badge.
 *
 * @param status - The import status string.
 * @returns Space-separated Tailwind classes for background and text color.
 */
const statusColor = (status: string): string => {
  const map: Record<string, string> = {
    completed: 'bg-brand-100 text-emerald-700',
    processing: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
    pending: 'bg-slate-100 text-slate-600',
  };
  return map[status] || 'bg-slate-100 text-slate-600';
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
 * Formats an ISO date string into a locale-friendly short date.
 *
 * @param dateStr - The ISO date string to format.
 * @returns A formatted date string.
 */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ---------- Sortable Column Header ---------- */

/**
 * Props for the ColumnHeader component.
 */
interface ColumnHeaderProps {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}

/**
 * ColumnHeader component that renders a clickable table column header with sort indicators.
 * Toggles between ascending and descending sort order on click.
 */
const ColumnHeader: React.FC<ColumnHeaderProps> = ({
  label,
  sortKey,
  currentSort,
  sortDir,
  onSort,
  className,
}) => {
  const isActive = currentSort === sortKey;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        'flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors cursor-pointer',
        className,
      )}
    >
      {label}
      {isActive ? (
        sortDir === 'asc' ? (
          <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowDown className="w-3 h-3" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 text-slate-300" />
      )}
    </button>
  );
};

/* ---------- Move-to-Folder Popover ---------- */

/**
 * Props for the MovePopover component.
 */
interface MovePopoverProps {
  fileId: string;
  folders: FolderTreeNode[];
  onMove: (attachmentId: string, folderId: string | null) => void;
  onClose: () => void;
}

/**
 * Popover component that displays a folder tree for moving a file via the list view.
 * Closes on outside click.
 */
function MovePopover({ fileId, folders, onMove, onClose }: MovePopoverProps) {
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

  const renderFolderOptions = (
    nodes: FolderTreeNode[],
    depth: number = 0,
  ): React.ReactNode[] => {
    const items: React.ReactNode[] = [];
    for (const node of nodes) {
      items.push(
        <button
          key={node.id}
          type="button"
          onClick={() => {
            onMove(fileId, node.id);
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
      <button
        type="button"
        onClick={() => {
          onMove(fileId, null);
          onClose();
        }}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="truncate">Root / No folder</span>
      </button>
      <div className="border-t border-slate-100 my-1" />
      {renderFolderOptions(folders)}
    </div>
  );
}

/* ---------- Pagination ---------- */

/**
 * Props for the Pagination component.
 */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Pagination component for the file list view, showing Previous/Next buttons.
 * Returns null when there is only one page.
 */
const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-white">
      <span className="text-xs text-slate-400">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  );
};

/* ---------- Folder Row ---------- */

/**
 * Props for the FolderRow component.
 */
interface FolderRowProps {
  folder: FolderTreeNode;
  onNavigate: (folderId: string) => void;
}

/**
 * FolderRow component that renders a folder as a table row in list view,
 * displaying the folder icon, name, type badge, date, and file count.
 */
const FolderRow: React.FC<FolderRowProps> = ({ folder, onNavigate }) => {
  return (
    <button
      type="button"
      data-folder-id={folder.id}
      onClick={() => onNavigate(folder.id)}
      className="group grid grid-cols-[24px_1fr_140px_120px_100px_100px_32px] items-center gap-2 px-4 py-2.5 border-b border-slate-50 text-xs font-medium transition-all w-full text-left cursor-pointer hover:bg-sky-50/60 border-l-2 border-l-transparent hover:border-l-sky-400"
    >
      {/* Drag handle placeholder */}
      <div className="shrink-0 text-slate-200">
        <Folder className="w-3.5 h-3.5 text-sky-400" />
      </div>

      {/* Name */}
      <div className="flex items-center gap-2 min-w-0">
        <FolderOpen className="w-4 h-4 text-sky-500 shrink-0" />
        <span className="truncate text-sky-800 font-semibold">{folder.name}</span>
      </div>

      {/* Type */}
      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Folder</span>

      {/* Date */}
      <span className="text-slate-400">{formatDate(folder.createdAt)}</span>

      {/* Size / items */}
      <span className="text-slate-400">
        {folder.fileCount} {folder.fileCount === 1 ? 'file' : 'files'}
      </span>

      {/* Empty status */}
      <span />

      {/* Empty actions */}
      <span />
    </button>
  );
};

/* ---------- File Row ---------- */

/**
 * Props for the FileRow component.
 */
interface FileRowProps {
  file: ImportRecord;
  isSelected: boolean;
  folders: FolderTreeNode[];
  onSelect: (fileId: string | null) => void;
  onToggle: (fileId: string) => void;
  onPreview: (file: ImportRecord) => void;
  moveFile: (attachmentId: string, folderId: string | null) => Promise<void>;
  onCopyFile: (fileId: string, fileName: string) => void;
  onCutFile: (fileId: string, fileName: string) => void;
  dragOverFolderId: string | null;
  onDragStart: (e: React.DragEvent, fileId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, folderId: string | null) => void;
  onDragLeave: () => void;
}

/**
 * FileRow component that renders a file as a draggable, selectable table row in list view.
 * Displays file name, type badge, MIME type, date, size, status, and hover action buttons.
 */
const FileRow: React.FC<FileRowProps> = ({
  file,
  isSelected,
  folders,
  onSelect,
  onToggle,
  onPreview,
  moveFile,
  onCopyFile,
  onCutFile,
  dragOverFolderId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
}) => {
  const [showMovePopover, setShowMovePopover] = useState(false);

  const handleRowClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      onToggle(file.id);
    } else if (isSelected) {
      onSelect(null);
    } else {
      onSelect(file.id);
    }
  };

  return (
    <div
      data-file-id={file.id}
      className={cn(
        'group grid grid-cols-[24px_1fr_140px_120px_100px_100px_32px] items-center gap-2 px-4 py-2.5 border-b border-slate-50 text-xs font-medium transition-all select-none',
        isSelected
          ? 'bg-brand-50/60 border-l-2 border-l-emerald-500'
          : dragOverFolderId === file.id
            ? 'bg-brand-50/40 border-l-2 border-l-emerald-400'
            : 'hover:bg-slate-50/60 border-l-2 border-l-transparent',
      )}
      draggable
      onDragStart={(e) => onDragStart(e, file.id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, file.id)}
      onDragLeave={onDragLeave}
      onClick={handleRowClick}
    >
      {/* Drag handle */}
      <div className="shrink-0 text-slate-200 group-hover:text-slate-400 transition-colors cursor-grab active:cursor-grabbing">
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Name + Type badge */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="truncate text-slate-800">{file.fileName}</span>
        <span
          className={cn(
            'shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold',
            typeColor(file.referenceId),
          )}
        >
          {typeLabel(file.referenceId)}
        </span>
      </div>

      {/* MIME type */}
      <span className="text-slate-500">{getFileExtension(file.fileName) || '—'}</span>

      {/* Date */}
      <span className="text-slate-500">{formatDate(file.uploadedAt)}</span>

      {/* Size */}
      <span className="text-slate-500">{formatBytes(file.sizeBytes)}</span>

      {/* Status */}
      <span
        className={cn(
          'px-1.5 py-0.5 rounded text-[10px] font-bold text-center inline-block',
          statusColor((file as any).status || 'completed'),
        )}
      >
        {(file as any).status || 'completed'}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-0.5 justify-end shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview(file);
          }}
          className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Preview file"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCopyFile(file.id, file.fileName);
          }}
          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
          aria-label="Copy file"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCutFile(file.id, file.fileName);
          }}
          className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
          aria-label="Cut file"
        >
          <Scissors className="w-3.5 h-3.5" />
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMovePopover((prev) => !prev);
            }}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Move to folder"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {showMovePopover && (
            <MovePopover
              fileId={file.id}
              folders={folders}
              onMove={moveFile}
              onClose={() => setShowMovePopover(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- Main FileListView ---------- */

/** Number of files displayed per page in the list view. */
const PAGE_SIZE = 20;

/**
 * Props for the FileListView component.
 */
export interface FileListViewProps {
  files: ImportRecord[];
  /** Sub-folders to display as clickable items above the file list */
  subFolders: FolderTreeNode[];
  folders: FolderTreeNode[];
  selectedFileIds: string[];
  onFileSelect: (fileId: string | null) => void;
  onFileToggle: (fileId: string) => void;
  onFolderNavigate: (folderId: string) => void;
  onRefresh: () => void;
  onPreview: (file: ImportRecord) => void;
  moveFile: (attachmentId: string, folderId: string | null) => Promise<void>;
  onCopyFile: (fileId: string, fileName: string) => void;
  onCutFile: (fileId: string, fileName: string) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

/**
 * FileListView component that renders files and sub-folders as a sortable, paginated table.
 * Supports column sorting, drag-and-drop for moving files, selection, and inline actions.
 */
export const FileListView: React.FC<FileListViewProps> = ({
  files,
  subFolders,
  folders,
  selectedFileIds,
  onFileSelect,
  onFileToggle,
  onFolderNavigate,
  onRefresh,
  onPreview,
  moveFile,
  onCopyFile,
  onCutFile,
  onContextMenu,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('uploadedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const {
    draggingFileId,
    dragOverFolderId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useFileDragDrop(onRefresh);

  /* Sorting */
  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'fileName') {
        cmp = a.fileName.localeCompare(b.fileName);
      } else if (sortKey === 'referenceId') {
        cmp = a.referenceId.localeCompare(b.referenceId);
      } else if (sortKey === 'uploadedAt') {
        cmp =
          new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      } else if (sortKey === 'sizeBytes') {
        cmp = a.sizeBytes - b.sizeBytes;
      } else if (sortKey === 'status') {
        cmp = ((a as any).status || '').localeCompare(
          (b as any).status || '',
        );
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [files, sortKey, sortDir]);

  /* Pagination */
  const totalPages = Math.max(1, Math.ceil(sortedFiles.length / PAGE_SIZE));
  const paginatedFiles = useMemo(
    () =>
      sortedFiles.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [sortedFiles, currentPage],
  );

  /* Reset to first page when file list changes */
  React.useEffect(() => {
    setCurrentPage(1);
  }, [files.length]);

  /* Container-level drop target for moving to current folder */
  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    handleDrop(e, null);
  };

  const hasSubFolders = subFolders.length > 0;
  const hasFiles = paginatedFiles.length > 0;
  const showEmptyState = !hasSubFolders && !hasFiles;

  return (
    <div
      className="flex flex-col flex-1 min-w-0 bg-white rounded-xl border border-slate-100 overflow-hidden"
      onDragOver={handleContainerDragOver}
      onDrop={handleContainerDrop}
    >
      {/* Column headers */}
      <div className="grid grid-cols-[24px_1fr_140px_120px_100px_100px_32px] items-center gap-2 px-4 py-2 bg-slate-50/60 border-b border-slate-100">
        <div />
        <ColumnHeader
          label="Name"
          sortKey="fileName"
          currentSort={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
        <ColumnHeader
          label="Type"
          sortKey="referenceId"
          currentSort={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
        <ColumnHeader
          label="Date"
          sortKey="uploadedAt"
          currentSort={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
        <ColumnHeader
          label="Size"
          sortKey="sizeBytes"
          currentSort={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
        <ColumnHeader
          label="Status"
          sortKey="status"
          currentSort={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
        <div />
      </div>

      {/* Rows */}
      <div
        className="flex-1 overflow-y-auto"
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu?.(e);
        }}
      >
        {/* Sub-folder rows */}
        {subFolders.map((folder) => (
          <FolderRow
            key={folder.id}
            folder={folder}
            onNavigate={onFolderNavigate}
          />
        ))}

        {/* File rows */}
        {paginatedFiles.length === 0 && !hasSubFolders ? (
          <div className="flex flex-col items-center justify-center h-48 text-sm text-slate-400">
            <FolderOpen className="w-10 h-10 mb-2 text-slate-200" />
            <p>This folder is empty</p>
          </div>
        ) : (
          paginatedFiles.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              folders={folders}
              isSelected={selectedFileIds.includes(file.id)}
              onSelect={onFileSelect}
              onToggle={onFileToggle}
              onPreview={onPreview}
              moveFile={moveFile}
              onCopyFile={onCopyFile}
              onCutFile={onCutFile}
              dragOverFolderId={dragOverFolderId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Drag-and-drop overlay feedback */}
      {draggingFileId && (
        <div
          className="fixed inset-0 z-40 pointer-events-none"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(e, null);
          }}
        >
          <div className="absolute inset-0 bg-emerald-500/5 border-2 border-dashed border-brand-400/40 rounded-xl m-2 flex items-center justify-center">
            <p className="text-xs font-semibold text-emerald-600 bg-white px-3 py-1.5 rounded-lg shadow-sm">
              Drop here to move to current folder
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
