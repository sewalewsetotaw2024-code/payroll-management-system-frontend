import React, { useRef } from 'react';
import {
  FolderPlus,
  Upload,
  LayoutList,
  Grid3X3,
  Search,
  RefreshCw,
  Check,
  X,
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { Button } from '../../../../components/ui/Button/Button';
import type { ViewMode } from '../../hooks/useFileExplorer';

/**
 * Props for the ExplorerToolbar component.
 */
interface ExplorerToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  onUpload: () => void;
  /** File count badge */
  fileCount: number;
  /** Selection count */
  selectedCount: number;
  /** New folder / sub-folder inline creation */
  creatingFolder: boolean;
  newFolderName: string;
  activeFolderId?: string | null;
  onNewFolderNameChange: (name: string) => void;
  onCreateFolder: () => void;
  onCancelCreateFolder: () => void;
  onStartCreateFolder: () => void;
  /** Clipboard paste */
  hasClipboard: boolean;
  clipboardFileName: string | null;
  clipboardAction: 'copy' | 'cut' | null;
  onPasteFiles: () => void;
  onClearClipboard: () => void;
}

/**
 * ExplorerToolbar component providing folder creation, file upload, view toggling,
 * search, refresh, and clipboard paste actions for the file explorer.
 */
export const ExplorerToolbar: React.FC<ExplorerToolbarProps> = ({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  onRefresh,
  onUpload,
  fileCount,
  selectedCount,
  creatingFolder,
  newFolderName,
  activeFolderId,
  onNewFolderNameChange,
  onCreateFolder,
  onCancelCreateFolder,
  onStartCreateFolder,
  hasClipboard,
  clipboardFileName,
  clipboardAction,
  onPasteFiles,
  onClearClipboard,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const folderPlaceholder = activeFolderId ? 'Sub-folder name...' : 'Folder name...';

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-slate-100 flex-wrap">
      {/* New Folder */}
      {creatingFolder ? (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => onNewFolderNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCreateFolder();
              if (e.key === 'Escape') onCancelCreateFolder();
            }}
            placeholder={folderPlaceholder}
            className="w-36 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            autoFocus
          />
          <button
            onClick={onCreateFolder}
            className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
            aria-label="Confirm create folder"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={onCancelCreateFolder}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Cancel create folder"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={onStartCreateFolder}>
          <FolderPlus className="w-3.5 h-3.5" /> New
        </Button>
      )}

      {/* Upload */}
      <Button variant="primary" size="sm" onClick={onUpload}>
        <Upload className="w-3.5 h-3.5" /> Upload
      </Button>

      {/* File count badge */}
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        {fileCount} {fileCount === 1 ? 'file' : 'files'}
      </div>

      {/* Selection count badge */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          {selectedCount} selected
        </div>
      )}

      {/* Divider */}
      <div className="w-px h-5 bg-slate-200" />

      {/* View Toggle */}
      <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
        <button
          type="button"
          onClick={() => onViewModeChange('list')}
          className={cn(
            'px-2 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer',
            viewMode === 'list'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-400 hover:text-slate-600',
          )}
          aria-label="List view"
          aria-pressed={viewMode === 'list'}
        >
          <LayoutList className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('grid')}
          className={cn(
            'px-2 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer',
            viewMode === 'grid'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-400 hover:text-slate-600',
          )}
          aria-label="Grid view"
          aria-pressed={viewMode === 'grid'}
        >
          <Grid3X3 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="relative flex-1 min-w-[120px] max-w-[240px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search files..."
          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          aria-label="Search files"
        />
      </div>

      {/* Refresh */}
      <button
        type="button"
        onClick={onRefresh}
        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        aria-label="Refresh"
      >
        <RefreshCw className="w-4 h-4" />
      </button>

      {/* Clipboard paste chip */}
      {hasClipboard && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-medium">
          <span className="text-indigo-700 truncate max-w-[120px]">
            {clipboardFileName}
          </span>
          <span className="text-indigo-400 text-[10px] uppercase font-bold">
            ({clipboardAction === 'copy' ? 'copied' : 'cut'})
          </span>
          <div className="w-px h-4 bg-indigo-200" />
          <button
            onClick={onPasteFiles}
            className="text-indigo-600 hover:text-indigo-800 font-bold transition-colors cursor-pointer"
            aria-label="Paste files here"
          >
            Paste here
          </button>
          <button
            onClick={onClearClipboard}
            className="p-0.5 rounded text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer"
            aria-label="Clear clipboard"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
