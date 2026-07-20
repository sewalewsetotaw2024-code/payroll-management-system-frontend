import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FileText,
  Clock,
  Calendar,
  ChevronDown,
  ChevronRight,
  Folder as FolderIcon,
  FolderOpen,
  Archive,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Scissors,
  ClipboardPaste,
  Download,
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { toast } from '../../../../components/ui/Toast';
import { folderApi } from '../../api/folderApi';
import { useFolderOperations } from '../../hooks/useFolderOperations';
import { useFolderClipboard } from '../../hooks/useFolderClipboard';
import type { CategoryFilter } from '../../hooks/useFileExplorer';
import type { FolderTreeNode } from '../../types/folder.types';
import type { ImportRecord } from '../../types/dataManagement.types';

/**
 * Props for the Sidebar component.
 */
interface SidebarProps {
  folders: FolderTreeNode[];
  activeFolderId: string | null;
  activeCategory: CategoryFilter;
  recentImports: ImportRecord[];
  thisMonthImports: ImportRecord[];
  onFolderSelect: (folderId: string | null) => void;
  onCategorySelect: (category: CategoryFilter) => void;
  onNavigateToRecent: () => void;
  onNavigateToThisMonth: () => void;
  onNavigateToArchive: () => void;
  onRefresh: () => Promise<void>;
}

/* ---------- Category config ---------- */
/** Configuration for each file category filter shown in the sidebar. */
const CATEGORIES = [
  { key: 'EMPLOYEE', label: 'Employee', color: 'bg-brand-500' },
  { key: 'ATTENDANCE', label: 'Attendance', color: 'bg-blue-500' },
  { key: 'ADJUSTMENT', label: 'Adjustment', color: 'bg-amber-500' },
] as const;

/* ---------- Context Menu ---------- */

/**
 * State for the folder context menu position and target folder.
 */
interface ContextMenuState {
  x: number;
  y: number;
  folder: FolderTreeNode;
}

/**
 * ContextMenu component that renders a right-click context menu for a folder in the sidebar.
 * Provides actions for rename, copy, cut, paste, export, and delete.
 */
function ContextMenu({
  x,
  y,
  folder,
  onClose,
  onRename,
  onDelete,
  onCopy,
  onCut,
  onPaste,
  onExport,
  hasClipboard,
}: {
  x: number;
  y: number;
  folder: FolderTreeNode;
  onClose: () => void;
  onRename: (folder: FolderTreeNode) => void;
  onDelete: (folder: FolderTreeNode) => void;
  onCopy: (folder: FolderTreeNode) => void;
  onCut: (folder: FolderTreeNode) => void;
  onPaste: () => void;
  onExport: (folder: FolderTreeNode) => void;
  hasClipboard: boolean;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 min-w-[180px]"
      style={{ left: x, top: y }}
    >
      <button
        type="button"
        onClick={() => { onRename(folder); onClose(); }}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <Pencil className="w-3.5 h-3.5 text-slate-400" /> Rename
      </button>
      <button
        type="button"
        onClick={() => { onCopy(folder); onClose(); }}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <Copy className="w-3.5 h-3.5 text-slate-400" /> Copy
      </button>
      <button
        type="button"
        onClick={() => { onCut(folder); onClose(); }}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <Scissors className="w-3.5 h-3.5 text-slate-400" /> Cut
      </button>
      {hasClipboard && (
        <button
          type="button"
          onClick={() => { onPaste(); onClose(); }}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ClipboardPaste className="w-3.5 h-3.5 text-slate-400" /> Paste here
        </button>
      )}
      <div className="border-t border-slate-100 my-1" />
      <button
        type="button"
        onClick={() => { onExport(folder); onClose(); }}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <Download className="w-3.5 h-3.5 text-slate-400" /> Export
      </button>
      <button
        type="button"
        onClick={() => { onDelete(folder); onClose(); }}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete
      </button>
    </div>
  );
}

/* ---------- Folder Tree Node ---------- */

/**
 * Props for the FolderTreeNodeItem component.
 */
interface FolderTreeNodeItemProps {
  node: FolderTreeNode;
  activeFolderId: string | null;
  depth: number;
  onSelect: (folderId: string | null) => void;
  onContextMenu: (e: React.MouseEvent, folder: FolderTreeNode) => void;
}

/**
 * FolderTreeNodeItem component that renders a single folder in the sidebar tree.
 * Supports expand/collapse, selection highlighting, and right-click context menu.
 */
const FolderTreeNodeItem: React.FC<FolderTreeNodeItemProps> = ({
  node,
  activeFolderId,
  depth,
  onSelect,
  onContextMenu,
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isActive = activeFolderId === node.id;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  };

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all select-none',
          isActive
            ? 'bg-brand-50 text-emerald-700'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        {/* Expand/collapse */}
        <button
          type="button"
          onClick={toggleExpand}
          className={cn(
            'p-0.5 rounded transition-colors shrink-0',
            hasChildren
              ? 'text-slate-400 hover:text-slate-600 cursor-pointer'
              : 'invisible',
          )}
          aria-label={expanded ? 'Collapse folder' : 'Expand folder'}
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>
        {/* Icon */}
        {isActive ? (
          <FolderOpen className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
        ) : (
          <FolderIcon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        )}
        {/* Name */}
        <span className="truncate flex-1">{node.name}</span>
        {/* File count */}
        {node.fileCount > 0 && (
          <span className="shrink-0 text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full leading-none">
            {node.fileCount}
          </span>
        )}
        {/* More button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onContextMenu(e, node);
          }}
          className="p-0.5 rounded text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
          aria-label="More options"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <FolderTreeNodeItem
              key={child.id}
              node={child}
              activeFolderId={activeFolderId}
              depth={depth + 1}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ---------- Sidebar Section ---------- */

/**
 * SidebarSection component that renders a collapsible section within the sidebar.
 *
 * @param title - The section header title.
 * @param children - The content rendered inside the section.
 * @param defaultOpen - Whether the section is expanded by default.
 */
function SidebarSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1 w-full mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-slate-600 transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {title}
      </button>
      {open && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}

/* ---------- Main Sidebar ---------- */

/**
 * Sidebar component that provides navigation between favorites (All Files, Recent, This Month),
 * the folder tree, file categories, and archive access. Supports inline folder renaming
 * and right-click context menus for folder operations.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  folders,
  activeFolderId,
  activeCategory,
  recentImports,
  thisMonthImports,
  onFolderSelect,
  onCategorySelect,
  onNavigateToRecent,
  onNavigateToThisMonth,
  onNavigateToArchive,
  onRefresh,
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<FolderTreeNode | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const { handleDeleteFolder, handleExportFolder } = useFolderOperations(folders, onRefresh);
  const { clipboard, handleCopy, handleCut, handlePaste } = useFolderClipboard(onRefresh);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, folder: FolderTreeNode) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, folder });
    },
    [],
  );

  const startRename = useCallback((folder: FolderTreeNode) => {
    setRenamingFolder(folder);
    setRenameValue(folder.name);
    setContextMenu(null);
  }, []);

  const confirmRename = useCallback(async () => {
    if (renamingFolder && renameValue.trim()) {
      try {
        await folderApi.update(renamingFolder.id, renameValue.trim());
        await onRefresh();
        toast.success('Folder renamed');
        setRenamingFolder(null);
        setRenameValue('');
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Failed to rename folder');
      }
    }
  }, [renamingFolder, renameValue, onRefresh]);

  const confirmDelete = useCallback(
    async (folder: FolderTreeNode) => {
      await handleDeleteFolder(folder.id);
      setContextMenu(null);
    },
    [handleDeleteFolder],
  );

  // Derive total uncategorized file count across all root folders
  const totalRootFiles = React.useMemo(
    () => folders.reduce((sum, f) => sum + f.fileCount, 0),
    [folders],
  );

  return (
    <>
      <aside className="w-[200px] shrink-0 bg-white border-r border-slate-100 flex flex-col overflow-y-auto overflow-x-hidden">
        {/* Favorites */}
        <SidebarSection title="Favorites">
          <button
            type="button"
            onClick={() => onFolderSelect(null)}
            className={cn(
              'flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
              activeFolderId === null && activeCategory === null
                ? 'bg-brand-50 text-emerald-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
            )}
          >
            <FileText className="w-4 h-4 shrink-0 text-emerald-500" />
            <span className="truncate flex-1 text-left">All Files</span>
            <span className="shrink-0 text-[10px] font-bold text-slate-500">
              {totalRootFiles}
            </span>
          </button>

          <button
            type="button"
            onClick={onNavigateToRecent}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer"
          >
            <Clock className="w-4 h-4 shrink-0 text-slate-400" />
            <span className="truncate flex-1 text-left">Recent</span>
            {recentImports.length > 0 && (
              <span className="shrink-0 text-[10px] font-bold text-slate-500">
                {recentImports.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onNavigateToThisMonth}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer"
          >
            <Calendar className="w-4 h-4 shrink-0 text-slate-400" />
            <span className="truncate flex-1 text-left">This Month</span>
            {thisMonthImports.length > 0 && (
              <span className="shrink-0 text-[10px] font-bold text-slate-500">
                {thisMonthImports.length}
              </span>
            )}
          </button>
        </SidebarSection>

        {/* Folders */}
        <SidebarSection title="Folders">
          {folders.length === 0 && (
            <p className="px-2 py-1.5 text-[11px] text-slate-400 italic">No folders yet</p>
          )}
          {folders.map((folder) => (
            <FolderTreeNodeItem
              key={folder.id}
              node={folder}
              activeFolderId={activeFolderId}
              depth={0}
              onSelect={onFolderSelect}
              onContextMenu={handleContextMenu}
            />
          ))}
        </SidebarSection>

        {/* Inline rename input */}
        {renamingFolder && (
          <div className="px-4 py-2 border-t border-slate-100">
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRename();
                if (e.key === 'Escape') setRenamingFolder(null);
              }}
              className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              autoFocus
              placeholder="Folder name..."
            />
          </div>
        )}

        {/* Categories */}
        <SidebarSection title="Categories">
          {CATEGORIES.map((cat) => {
            const isActiveCat = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => onCategorySelect(isActiveCat ? null : cat.key)}
                className={cn(
                  'flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                  isActiveCat
                    ? 'bg-brand-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                )}
              >
                <span className={cn('w-2 h-2 rounded-full shrink-0', cat.color)} />
                <span className="truncate flex-1 text-left">{cat.label}</span>
              </button>
            );
          })}
        </SidebarSection>

        {/* Archive */}
        <div className="mt-auto border-t border-slate-100 px-3 py-2.5">
          <button
            type="button"
            onClick={onNavigateToArchive}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <Archive className="w-4 h-4 shrink-0" />
            <span className="truncate text-left">Archive</span>
          </button>
        </div>
      </aside>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          folder={contextMenu.folder}
          onClose={() => setContextMenu(null)}
          onRename={startRename}
          onDelete={confirmDelete}
          onCopy={(f) => handleCopy(f.id, f.name)}
          onCut={(f) => handleCut(f.id, f.name)}
          onPaste={() => handlePaste(contextMenu.folder.id)}
          onExport={(f) => handleExportFolder(f.id)}
          hasClipboard={clipboard !== null}
        />
      )}
    </>
  );
};
