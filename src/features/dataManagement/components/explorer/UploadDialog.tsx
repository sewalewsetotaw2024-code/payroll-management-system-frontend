import React, { useState, useRef, useCallback } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  Upload,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { Modal } from '../../../../components/ui/Modal/Modal';
import { Button } from '../../../../components/ui/Button/Button';
import { cn } from '../../../../lib/utils';
import type { FolderTreeNode } from '../../types/folder.types';

/**
 * Props for the UploadDialog component.
 */
interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderTreeNode[];
  onConfirm: (file: File, folderId: string | null) => void;
}

/* ── Recursive folder tree item ── */

/**
 * Props for the FolderTreeItem component.
 */
interface FolderTreeItemProps {
  node: FolderTreeNode;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  depth: number;
}

/**
 * FolderTreeItem component that renders a single folder selection item in the upload dialog tree.
 * Supports recursive rendering of child folders.
 */
const FolderTreeItem: React.FC<FolderTreeItemProps> = ({
  node,
  selectedId,
  onSelect,
  depth,
}) => {
  const isSelected = selectedId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left cursor-pointer',
          isSelected
            ? 'bg-sky-50 text-sky-800 border border-sky-200'
            : 'text-slate-700 hover:bg-slate-50 border border-transparent',
        )}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {isSelected ? (
          <FolderOpen className="w-4 h-4 text-sky-500 shrink-0" />
        ) : (
          <Folder className="w-4 h-4 text-slate-400 shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
        <span className="ml-auto text-[10px] text-slate-400 shrink-0">
          {node.fileCount}
        </span>
      </button>
      {hasChildren && node.children.map((child) => (
        <FolderTreeItem
          key={child.id}
          node={child}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </>
  );
};

/* ── Main UploadDialog ── */

/**
 * UploadDialog component displayed as a modal for uploading files.
 * Allows selecting a destination folder from the folder tree and choosing a file.
 */
export const UploadDialog: React.FC<UploadDialogProps> = ({
  isOpen,
  onClose,
  folders,
  onConfirm,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!selectedFile) return;
    onConfirm(selectedFile, selectedFolderId);
    setSelectedFile(null);
    setSelectedFolderId(null);
  }, [selectedFile, selectedFolderId, onConfirm]);

  const handleClose = useCallback(() => {
    setSelectedFile(null);
    setSelectedFolderId(null);
    onClose();
  }, [onClose]);

  const findFolderName = (nodes: FolderTreeNode[], id: string): string | null => {
    for (const n of nodes) {
      if (n.id === id) return n.name;
      if (n.children) {
        const found = findFolderName(n.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedFolderName = selectedFolderId
    ? findFolderName(folders, selectedFolderId) ?? 'Unknown'
    : 'Root / No folder';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Files"
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            disabled={!selectedFile}
          >
            <Upload className="w-3.5 h-3.5" /> Upload
          </Button>
        </div>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div className="flex gap-6 min-h-[300px]">
        <div className="w-1/2 border border-slate-200 rounded-xl p-2 overflow-y-auto max-h-[400px]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
            Destination Folder
          </div>
          <button
            type="button"
            onClick={() => setSelectedFolderId(null)}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left cursor-pointer',
              selectedFolderId === null
                ? 'bg-sky-50 text-sky-800 border border-sky-200'
                : 'text-slate-700 hover:bg-slate-50 border border-transparent',
            )}
          >
            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Root / No folder</span>
          </button>
          <div className="border-t border-slate-100 my-1" />
          {folders.map((folder) => (
            <FolderTreeItem
              key={folder.id}
              node={folder}
              selectedId={selectedFolderId}
              onSelect={setSelectedFolderId}
              depth={0}
            />
          ))}
          {folders.length === 0 && (
            <p className="text-xs text-slate-400 px-3 py-4 text-center">
              No folders yet
            </p>
          )}
        </div>

        <div className="w-1/2 flex flex-col gap-4">
          <div className="border border-slate-200 rounded-xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Selected Location
            </div>
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-sky-500 shrink-0" />
              <span className="text-sm font-semibold text-slate-800 truncate">
                {selectedFolderName}
              </span>
            </div>
          </div>

          <div className="border border-dashed border-slate-300 rounded-xl p-6 flex-1 flex flex-col items-center justify-center gap-3 bg-slate-50/50">
            {selectedFile ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <FileSpreadsheet className="w-10 h-10 text-emerald-500" />
                <p className="text-sm font-semibold text-slate-800">{selectedFile.name}</p>
                <p className="text-xs text-slate-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-500 text-center">
                  Select a file to upload
                </p>
                <Button variant="outline" size="sm" onClick={handleSelectFiles}>
                  <Upload className="w-3.5 h-3.5" /> Choose File
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
