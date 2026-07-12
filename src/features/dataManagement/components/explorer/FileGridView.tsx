import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Users,
  Clock,
  FileSpreadsheet,
  Folder,
  FolderOpen,
  GripVertical,
  Eye,
  MoreHorizontal,
  FolderUp,
  Copy,
  Scissors,
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { toast } from '../../../../components/ui/Toast';
import { useFileDragDrop } from '../../hooks/useFileDragDrop';
import type { ImportRecord } from '../../types/dataManagement.types';
import type { FolderTreeNode } from '../../types/folder.types';

/* ---------- Helpers ---------- */

/**
 * Returns the user-facing label for a given reference type ID.
 *
 * @param refId - The reference type identifier (e.g. EMPLOYEE, ATTENDANCE).
 * @returns A human-readable label for the type.
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
 * @returns A ReactNode containing the icon for the type.
 */
const typeIcon = (refId: string): React.ReactNode => {
  const map: Record<string, React.ReactNode> = {
    EMPLOYEE: <Users className="w-8 h-8" />,
    ATTENDANCE: <Clock className="w-8 h-8" />,
    ADJUSTMENT: <FileSpreadsheet className="w-8 h-8" />,
  };
  return map[refId] || <FileText className="w-8 h-8" />;
};

/**
 * Returns the Tailwind text color class for the icon of a given reference type.
 *
 * @param refId - The reference type identifier.
 * @returns A Tailwind text color class.
 */
const typeIconColor = (refId: string): string => {
  const map: Record<string, string> = {
    EMPLOYEE: 'text-emerald-500',
    ATTENDANCE: 'text-blue-500',
    ADJUSTMENT: 'text-amber-500',
  };
  return map[refId] || 'text-slate-400';
};

/**
 * Formats a byte count into a human-readable string (e.g. "1.5 MB").
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
 * @returns A formatted date string (e.g. "Jan 15, 2026").
 */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

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
 * Popover component that displays a folder tree for moving a file to a different folder.
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

  const renderFolderOptions = (nodes: FolderTreeNode[], depth: number = 0): React.ReactNode[] => {
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

/* ---------- Folder Card ---------- */

/**
 * Props for the FolderCard component.
 */
interface FolderCardProps {
  folder: FolderTreeNode;
  onNavigate: (folderId: string) => void;
}

/**
 * FolderCard component that renders a clickable folder card in grid view,
 * showing the folder name, type badge, and file count.
 */
const FolderCard: React.FC<FolderCardProps> = ({ folder, onNavigate }) => {
  return (
    <button
      type="button"
      data-folder-id={folder.id}
      onClick={() => onNavigate(folder.id)}
      className="group relative bg-white border border-sky-200 rounded-xl p-3 flex flex-col gap-2 transition-all cursor-pointer hover:border-sky-300 hover:shadow-sm hover:bg-sky-50/30 text-left"
    >
      {/* Folder icon area */}
      <div className="flex items-center justify-center h-20 rounded-lg bg-sky-50 text-sky-400 group-hover:bg-sky-100 transition-colors">
        <Folder className="w-10 h-10" />
      </div>

      {/* Folder name */}
      <p className="text-xs font-semibold text-sky-800 truncate" title={folder.name}>
        {folder.name}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-1">
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700">
          Folder
        </span>
      </div>

      {/* File count */}
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span>{folder.fileCount} {folder.fileCount === 1 ? 'file' : 'files'}</span>
      </div>
    </button>
  );
};

/* ---------- File Card ---------- */

/**
 * Props for the FileCard component.
 */
interface FileCardProps {
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
 * FileCard component that renders a draggable, selectable file card in grid view.
 * Displays the file icon, name, type badge, size, date, and hover action buttons
 * for preview, copy, cut, and move-to-folder.
 */
const FileCard: React.FC<FileCardProps> = ({
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

  const handleCardClick = (e: React.MouseEvent) => {
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
        'group relative bg-white border rounded-xl p-3 flex flex-col gap-2 transition-all cursor-pointer select-none',
        isSelected
          ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30'
          : dragOverFolderId === file.id
            ? 'border-emerald-400 bg-emerald-50/20'
            : 'border-slate-100 hover:border-slate-200 hover:shadow-sm',
      )}
      draggable
      onDragStart={(e) => onDragStart(e, file.id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, file.id)}
      onDragLeave={onDragLeave}
      onClick={handleCardClick}
    >
      {/* Icon area */}
      <div className={cn('flex items-center justify-center h-20 rounded-lg bg-slate-50', typeIconColor(file.referenceId))}>
        {typeIcon(file.referenceId)}
      </div>

      {/* File name */}
      <p className="text-xs font-semibold text-slate-800 truncate" title={file.fileName}>
        {file.fileName}
      </p>

      {/* Meta row */}
      <div className="flex items-center justify-between gap-1">
        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', typeColor(file.referenceId))}>
          {typeLabel(file.referenceId)}
        </span>
        <span className="text-[10px] text-slate-400">{formatBytes(file.sizeBytes)}</span>
      </div>

      {/* Bottom meta */}
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span>{formatDate(file.uploadedAt)}</span>
      </div>

      {/* Hover actions overlay */}
      <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview(file);
          }}
          className="p-1 rounded bg-white/90 backdrop-blur-sm text-slate-400 hover:text-slate-600 hover:bg-slate-100 shadow-sm transition-colors cursor-pointer"
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
            className="p-1 rounded bg-white/90 backdrop-blur-sm text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 shadow-sm transition-colors cursor-pointer"
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
            className="p-1 rounded bg-white/90 backdrop-blur-sm text-slate-400 hover:text-amber-600 hover:bg-amber-50 shadow-sm transition-colors cursor-pointer"
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
            className="p-1 rounded bg-white/90 backdrop-blur-sm text-slate-400 hover:text-slate-600 hover:bg-slate-100 shadow-sm transition-colors cursor-pointer"
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

      {/* Drag handle */}
      <div className="absolute top-2 left-2 p-0.5 rounded text-slate-200 opacity-0 group-hover:opacity-100 hover:text-slate-400 transition-all cursor-grab active:cursor-grabbing">
        <GripVertical className="w-3 h-3" />
      </div>
    </div>
  );
};

/* ---------- Main FileGridView ---------- */

/**
 * Props for the FileGridView component.
 */
interface FileGridViewProps {
  files: ImportRecord[];
  /** Sub-folders to display as clickable cards above the file cards */
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
 * FileGridView component that renders files and sub-folders as a responsive grid of cards.
 * Supports drag-and-drop for moving files, selection, context menus, and inline move-to-folder popovers.
 */
export const FileGridView: React.FC<FileGridViewProps> = ({
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
  const {
    draggingFileId,
    dragOverFolderId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useFileDragDrop(onRefresh);

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    handleDrop(e, null);
  };

  const hasSubFolders = subFolders.length > 0;
  const hasFiles = files.length > 0;
  const showEmptyState = !hasSubFolders && !hasFiles;

  return (
    <div
      className="flex flex-col flex-1 min-w-0 bg-white rounded-xl border border-slate-100 overflow-hidden"
      onDragOver={handleContainerDragOver}
      onDrop={handleContainerDrop}
    >
      <div
        className="flex-1 overflow-y-auto p-4"
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu?.(e);
        }}
      >
        {showEmptyState ? (
          <div className="flex flex-col items-center justify-center h-48 text-sm text-slate-400">
            <FolderOpen className="w-10 h-10 mb-2 text-slate-200" />
            <p>This folder is empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {/* Sub-folder cards */}
            {subFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onNavigate={onFolderNavigate}
              />
            ))}

            {/* File cards */}
            {files.map((file) => (
              <FileCard
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
            ))}
          </div>
        )}
      </div>

      {/* DnD overlay */}
      {draggingFileId && (
        <div
          className="fixed inset-0 z-40 pointer-events-none"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(e, null);
          }}
        >
          <div className="absolute inset-0 bg-emerald-500/5 border-2 border-dashed border-emerald-400/40 rounded-xl m-2 flex items-center justify-center">
            <p className="text-xs font-semibold text-emerald-600 bg-white px-3 py-1.5 rounded-lg shadow-sm">
              Drop here to move to current folder
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
