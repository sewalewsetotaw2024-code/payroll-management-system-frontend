import React, { useEffect, useRef } from 'react';
import {
  FolderPlus,
  Upload,
  ClipboardPaste,
  CheckSquare,
  Eye,
  Copy,
  Scissors,
  FolderUp,
  Download,
  FolderOpen,
  Pencil,
  Trash2,
} from 'lucide-react';

/**
 * Describes the target of a context menu: an empty area, a file, or a folder.
 */
export type ContextMenuTarget =
  | { type: 'empty'; x: number; y: number }
  | { type: 'file'; x: number; y: number; fileId: string; fileName: string }
  | { type: 'folder'; x: number; y: number; folderId: string; folderName: string; fileCount: number };

/**
 * Actions available from the context menu, categorized by target type.
 */
export interface ContextMenuActions {
  onNewFolder: () => void;
  onUploadHere: () => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onPreviewFile: (fileId: string) => void;
  onCopyFile: (fileId: string, fileName: string) => void;
  onCutFile: (fileId: string, fileName: string) => void;
  onMoveFile: (fileId: string) => void;
  onDownloadFile: (fileId: string) => void;
  onOpenFolder: (folderId: string) => void;
  onNewSubFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, folderName: string) => void;
  onCopyFolder: (folderId: string) => void;
  onCutFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  hasClipboard: boolean;
}

/**
 * Props for the FileContextMenu component.
 */
interface FileContextMenuProps {
  target: ContextMenuTarget;
  actions: ContextMenuActions;
  onClose: () => void;
}

/**
 * FileContextMenu component that renders a right-click context menu.
 * Displays different menu items based on whether the target is an empty area,
 * a file, or a folder. Closes on outside click or Escape key.
 */
export const FileContextMenu: React.FC<FileContextMenuProps> = ({ target, actions, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    window.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', keyHandler);
    };
  }, [onClose]);

  const renderSeparator = () => <div className="border-t border-slate-100 my-1" />;

  const menuItem = (label: string, icon: React.ReactNode, onClick: () => void, danger = false) => (
    <button
      type="button"
      onClick={() => { onClick(); onClose(); }}
      className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
        danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center [&>svg]:w-3.5 [&>svg]:h-3.5">
        {icon}
      </span>
      {label}
    </button>
  );

  const x = target.x;
  const y = target.y;

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 min-w-[180px]"
      style={{ left: x, top: y }}
    >
      {target.type === 'empty' && (
        <>
          {menuItem('New Folder', <FolderPlus className="text-slate-400" />, actions.onNewFolder)}
          {menuItem('Upload here', <Upload className="text-slate-400" />, actions.onUploadHere)}
          {actions.hasClipboard && renderSeparator()}
          {actions.hasClipboard && menuItem('Paste', <ClipboardPaste className="text-slate-400" />, actions.onPaste)}
          {renderSeparator()}
          {menuItem('Select All', <CheckSquare className="text-slate-400" />, actions.onSelectAll)}
        </>
      )}

      {target.type === 'file' && (
        <>
          {menuItem('Preview', <Eye className="text-slate-400" />, () => actions.onPreviewFile(target.fileId))}
          {renderSeparator()}
          {menuItem('Copy', <Copy className="text-slate-400" />, () => actions.onCopyFile(target.fileId, target.fileName))}
          {menuItem('Cut', <Scissors className="text-slate-400" />, () => actions.onCutFile(target.fileId, target.fileName))}
          {menuItem('Move to folder', <FolderUp className="text-slate-400" />, () => actions.onMoveFile(target.fileId))}
          {renderSeparator()}
          {menuItem('Download', <Download className="text-slate-400" />, () => actions.onDownloadFile(target.fileId))}
        </>
      )}

      {target.type === 'folder' && (
        <>
          {menuItem('Open', <FolderOpen className="text-slate-400" />, () => actions.onOpenFolder(target.folderId))}
          {menuItem('New Sub-folder', <FolderPlus className="text-slate-400" />, () => actions.onNewSubFolder(target.folderId))}
          {menuItem('Upload here', <Upload className="text-slate-400" />, actions.onUploadHere)}
          {renderSeparator()}
          {menuItem('Rename', <Pencil className="text-slate-400" />, () => actions.onRenameFolder(target.folderId, target.folderName))}
          {menuItem('Copy', <Copy className="text-slate-400" />, () => actions.onCopyFolder(target.folderId))}
          {menuItem('Cut', <Scissors className="text-slate-400" />, () => actions.onCutFolder(target.folderId))}
          {actions.hasClipboard && menuItem('Paste here', <ClipboardPaste className="text-slate-400" />, actions.onPaste)}
          {renderSeparator()}
          {menuItem('Delete', <Trash2 className="text-red-500" />, () => actions.onDeleteFolder(target.folderId), true)}
        </>
      )}
    </div>
  );
};
