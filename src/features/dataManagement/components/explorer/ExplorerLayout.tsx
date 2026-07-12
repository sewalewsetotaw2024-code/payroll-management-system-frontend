import React, { useCallback, useMemo, useState } from 'react';
import { useFileExplorer } from '../../hooks/useFileExplorer';
import type { CategoryFilter } from '../../hooks/useFileExplorer';
import { useFolderOperations } from '../../hooks/useFolderOperations';
import { useFileClipboard } from '../../hooks/useFileClipboard';
import { folderApi } from '../../api/folderApi';
import { toast } from '../../../../components/ui/Toast';
import { Sidebar } from './Sidebar';
import { BreadcrumbNav } from './BreadcrumbNav';
import { ExplorerToolbar } from './ExplorerToolbar';
import { FileListView } from './FileListView';
import { FileGridView } from './FileGridView';
import { PreviewPane } from './PreviewPane';
import { FileContextMenu, type ContextMenuTarget, type ContextMenuActions } from './FileContextMenu';
import type { ImportRecord } from '../../types/dataManagement.types';
import type { FolderTreeNode } from '../../types/folder.types';

/**
 * Props for the ExplorerLayout component.
 */
interface ExplorerLayoutProps {
  allImports: ImportRecord[];
  folders: FolderTreeNode[];
  onRefresh: () => Promise<void>;
  onUpload: () => void;
  onPreviewFile: (file: ImportRecord) => void;
  previewFile: ImportRecord | null;
  onClearPreview: () => void;
  onActiveFolderChange?: (folderId: string | null) => void;
}

/**
 * Walks the folder tree to find a node by its ID.
 *
 * @param nodes - The folder tree nodes to search.
 * @param targetId - The ID of the folder node to find.
 * @returns The matching folder node, or null if not found.
 */
function findFolderNode(nodes: FolderTreeNode[], targetId: string): FolderTreeNode | null {
  for (const n of nodes) {
    if (n.id === targetId) return n;
    if (n.children) {
      const found = findFolderNode(n.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * ExplorerLayout component that orchestrates the entire file explorer experience.
 * Composes the sidebar, breadcrumb navigation, toolbar, file view (list/grid),
 * preview pane, context menu, and keyboard shortcuts into a cohesive layout.
 */
export const ExplorerLayout: React.FC<ExplorerLayoutProps> = ({
  allImports,
  folders,
  onRefresh,
  onUpload,
  onPreviewFile,
  previewFile,
  onClearPreview,
  onActiveFolderChange,
}) => {
  const explorerRef = React.useRef<HTMLDivElement>(null);

  const {
    activeFolderId,
    setActiveFolderId,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    selectedFileIds,
    setSelectedFileIds,
    activeCategory,
    setActiveCategory,
    filteredImports,
    recentImports,
    thisMonthImports,
    clearSelection,
    toggleFileSelection,
    selectAllFiles,
  } = useFileExplorer(allImports);

  const {
    creatingFolder,
    newFolderName,
    setCreatingFolder,
    setNewFolderName,
    handleCreateFolder,
    creatingSubFolder,
    newSubFolderName,
    setCreatingSubFolder,
    setNewSubFolderName,
  } = useFolderOperations(folders, onRefresh);

  const {
    clipboard,
    hasClipboard,
    handleCopyFile,
    handleCutFile,
    handleCopySelected,
    handleCutSelected,
    handlePasteFile,
    clearClipboard,
  } = useFileClipboard(onRefresh);

  const [contextMenu, setContextMenu] = useState<ContextMenuTarget | null>(null);

  // Move file between folders
  const moveFile = useCallback(
    async (attachmentId: string, folderId: string | null) => {
      try {
        await folderApi.moveFile(attachmentId, folderId);
        toast.success('File moved successfully');
        await onRefresh();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Failed to move file');
      }
    },
    [onRefresh],
  );

  // Derived: files to display in the active view
  const activeFolderFiles = React.useMemo(() => {
    const folderId = activeFolderId;
    return filteredImports.filter((f) => {
      if (activeCategory) {
        return f.referenceId === activeCategory;
      }
      if (folderId) {
        return f.folderId === folderId;
      }
      return true;
    });
  }, [filteredImports, activeFolderId, activeCategory]);

  // Derived: sub-folders of the currently active folder
  const activeSubFolders = useMemo(() => {
    if (activeFolderId === null) {
      // Root level: top-level folders from the tree
      // (folders with parentId === null or no explicit parent)
      return folders;
    }
    const node = findFolderNode(folders, activeFolderId);
    return node?.children ?? [];
  }, [folders, activeFolderId]);

  // Navigation helpers
  const handleFolderSelect = useCallback(
    (folderId: string | null) => {
      setActiveFolderId(folderId);
      setActiveCategory(null);
      clearSelection();
      onActiveFolderChange?.(folderId);
    },
    [setActiveFolderId, setActiveCategory, clearSelection, onActiveFolderChange],
  );

  const handleCategorySelect = useCallback(
    (category: CategoryFilter) => {
      setActiveCategory(category);
      setActiveFolderId(null);
      clearSelection();
    },
    [setActiveCategory, setActiveFolderId, clearSelection],
  );

  const handleNavigateToRecent = useCallback(() => {
    setActiveFolderId(null);
    setActiveCategory(null);
  }, [setActiveFolderId, setActiveCategory]);

  const handleNavigateToThisMonth = useCallback(() => {
    setActiveFolderId(null);
    setActiveCategory(null);
  }, [setActiveFolderId, setActiveCategory]);

  const handleNavigateToArchive = useCallback(() => {
    setActiveFolderId(null);
    setActiveCategory(null);
  }, [setActiveFolderId, setActiveCategory]);

  // Single-click: select + preview
  const handleFileSelect = useCallback(
    (fileId: string | null) => {
      setSelectedFileIds(fileId ? [fileId] : []);
      if (fileId) {
        const file = filteredImports.find((f) => f.id === fileId);
        if (file) onPreviewFile(file);
      } else {
        onClearPreview();
      }
    },
    [filteredImports, onPreviewFile, onClearPreview, setSelectedFileIds],
  );

  // Ctrl+Click: toggle file selection
  const handleFileToggle = useCallback(
    (fileId: string) => {
      toggleFileSelection(fileId);
    },
    [toggleFileSelection],
  );

  // Double-click folder to navigate
  const handleFolderNavigate = useCallback(
    (folderId: string) => {
      setActiveFolderId(folderId);
      setActiveCategory(null);
      clearSelection();
      onActiveFolderChange?.(folderId);
    },
    [setActiveFolderId, setActiveCategory, clearSelection, onActiveFolderChange],
  );

  // Create folder in current context
  const handleCreateFolderInContext = useCallback(() => {
    if (activeFolderId) {
      handleCreateFolder(activeFolderId);
    } else {
      handleCreateFolder();
    }
  }, [activeFolderId, handleCreateFolder]);

  const handleStartCreateFolder = useCallback(() => {
    if (activeFolderId) {
      setCreatingSubFolder({ parentId: activeFolderId, parentName: '' });
    } else {
      setCreatingFolder(true);
    }
  }, [activeFolderId, setCreatingSubFolder, setCreatingFolder]);

  const handleCancelCreateFolder = useCallback(() => {
    if (activeFolderId) {
      setCreatingSubFolder(null);
      setNewSubFolderName('');
    } else {
      setCreatingFolder(false);
      setNewFolderName('');
    }
  }, [activeFolderId, setCreatingSubFolder, setNewSubFolderName, setCreatingFolder, setNewFolderName]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const fileEl = target.closest('[data-file-id]');
    const folderEl = target.closest('[data-folder-id]');

  if (fileEl) {
    const fileId = fileEl.getAttribute('data-file-id');
    if (!fileId) {
      setContextMenu({ type: 'empty', x: e.clientX, y: e.clientY });
      return;
    }
    const file = allImports.find((f) => f.id === fileId);
    setContextMenu({
      type: 'file',
      x: e.clientX,
      y: e.clientY,
      fileId,
      fileName: file?.fileName ?? 'Unknown',
    });
  } else if (folderEl) {
      const folderId = folderEl.getAttribute('data-folder-id');
      if (!folderId) {
        setContextMenu({ type: 'empty', x: e.clientX, y: e.clientY });
        return;
      }
      const folder = findFolderNode(folders, folderId);
      setContextMenu({
        type: 'folder',
        x: e.clientX,
        y: e.clientY,
        folderId,
        folderName: folder?.name ?? 'Unknown',
        fileCount: folder?.fileCount ?? 0,
      });
    } else {
      setContextMenu({
        type: 'empty',
        x: e.clientX,
        y: e.clientY,
      });
    }
  }, [allImports, folders]);

  const contextMenuActions: ContextMenuActions = useMemo(() => ({
    onNewFolder: () => handleStartCreateFolder(),
    onUploadHere: () => onUpload(),
    onPaste: () => handlePasteFile(activeFolderId),
    onSelectAll: () => selectAllFiles(activeFolderFiles.map((f) => f.id)),
    onPreviewFile: (fileId: string) => {
      const file = allImports.find((f) => f.id === fileId);
      if (file) onPreviewFile(file);
    },
    onCopyFile: (fileId, fileName) => handleCopyFile(fileId, fileName),
    onCutFile: (fileId, fileName) => handleCutFile(fileId, fileName),
    onMoveFile: (fileId: string) => handleFileSelect(fileId),
    onDownloadFile: (fileId: string) => {
      const file = allImports.find((f) => f.id === fileId);
      if (file?.filePath) {
        const url = file.filePath.replace('/upload/', '/upload/fl_attachment/');
        window.open(url, '_blank');
      }
    },
    onOpenFolder: (folderId: string) => handleFolderNavigate(folderId),
    onNewSubFolder: (folderId: string) => {
      setCreatingSubFolder({ parentId: folderId, parentName: '' });
    },
    onRenameFolder: (_folderId: string, _folderName: string) => {
      // Placeholder — rename via sidebar for now
    },
    onCopyFolder: (_folderId: string) => {
      // Placeholder — folder clipboard ops via sidebar for now
    },
    onCutFolder: (_folderId: string) => {
      // Placeholder — folder clipboard ops via sidebar for now
    },
    onDeleteFolder: async (folderId: string) => {
      const folder = findFolderNode(folders, folderId);
      if (folder && window.confirm(`Delete folder "${folder.name}"?`)) {
        try {
          await folderApi.remove(folderId);
          toast.success(`Folder "${folder.name}" deleted`);
          await onRefresh();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Failed to delete folder');
        }
      }
    },
    hasClipboard,
  }), [
    handleStartCreateFolder, onUpload, handlePasteFile, activeFolderId,
    selectAllFiles, activeFolderFiles, allImports, onPreviewFile,
    handleCopyFile, handleCutFile, handleFileSelect, handleFolderNavigate,
    setCreatingSubFolder, folders, hasClipboard, onRefresh,
  ]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key === 'a') {
        e.preventDefault();
        selectAllFiles(activeFolderFiles.map((f) => f.id));
        return;
      }

      if (isCtrl && e.key === 'c' && selectedFileIds.length > 0) {
        e.preventDefault();
        const files = selectedFileIds
          .map((id) => {
            const f = allImports.find((r) => r.id === id);
            return f ? { id: f.id, name: f.fileName } : null;
          })
          .filter((x): x is { id: string; name: string } => x !== null);
        if (files.length > 0) handleCopySelected(files);
        return;
      }

      if (isCtrl && e.key === 'x' && selectedFileIds.length > 0) {
        e.preventDefault();
        const files = selectedFileIds
          .map((id) => {
            const f = allImports.find((r) => r.id === id);
            return f ? { id: f.id, name: f.fileName } : null;
          })
          .filter((x): x is { id: string; name: string } => x !== null);
        if (files.length > 0) handleCutSelected(files);
        return;
      }

      if (isCtrl && e.key === 'v' && hasClipboard) {
        e.preventDefault();
        handlePasteFile(activeFolderId);
        return;
      }

      if (e.key === 'Escape') {
        setContextMenu(null);
        clearSelection();
        clearClipboard();
        onClearPreview();
      }
    },
    [
      selectAllFiles, activeFolderFiles, selectedFileIds, allImports,
      handleCopySelected, handleCutSelected,
      hasClipboard, handlePasteFile, activeFolderId,
      clearSelection, clearClipboard, onClearPreview,
      setContextMenu,
    ],
  );

  const selectedCount = selectedFileIds.length;
  const clipboardFileName = clipboard?.files[0]?.name ?? null;

  // Toolbar sub-folder creation state
  const isCreatingSubFolder = activeFolderId ? creatingSubFolder !== null : false;
  const currentSubFolderName = activeFolderId ? newSubFolderName : '';

  return (
    <div
      ref={explorerRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="flex h-full max-h-[800px] border border-slate-200 rounded-xl overflow-hidden bg-white outline-none"
    >
      {/* Sidebar */}
      <Sidebar
        folders={folders}
        activeFolderId={activeFolderId}
        activeCategory={activeCategory}
        recentImports={recentImports}
        thisMonthImports={thisMonthImports}
        onFolderSelect={handleFolderSelect}
        onCategorySelect={handleCategorySelect}
        onNavigateToRecent={handleNavigateToRecent}
        onNavigateToThisMonth={handleNavigateToThisMonth}
        onNavigateToArchive={handleNavigateToArchive}
        onRefresh={onRefresh}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Breadcrumbs */}
        <BreadcrumbNav
          folders={folders}
          activeFolderId={activeFolderId}
          onNavigate={handleFolderSelect}
        />

        {/* Toolbar */}
        <ExplorerToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={onRefresh}
          onUpload={onUpload}
          fileCount={activeFolderFiles.length}
          selectedCount={selectedCount}
          activeFolderId={activeFolderId}
          creatingFolder={activeFolderId ? isCreatingSubFolder : creatingFolder}
          newFolderName={activeFolderId ? currentSubFolderName : newFolderName}
          onNewFolderNameChange={activeFolderId ? setNewSubFolderName : setNewFolderName}
          onCreateFolder={handleCreateFolderInContext}
          onCancelCreateFolder={handleCancelCreateFolder}
          onStartCreateFolder={handleStartCreateFolder}
          hasClipboard={hasClipboard}
          clipboardFileName={clipboardFileName}
          clipboardAction={clipboard?.action ?? null}
          onPasteFiles={() => handlePasteFile(activeFolderId)}
          onClearClipboard={clearClipboard}
        />

        {/* File view + Preview */}
        <div className="flex flex-1 min-h-0">
          {viewMode === 'list' ? (
            <FileListView
              files={activeFolderFiles}
              subFolders={activeSubFolders}
              folders={folders}
              selectedFileIds={selectedFileIds}
              onFileSelect={handleFileSelect}
              onFileToggle={handleFileToggle}
              onFolderNavigate={handleFolderNavigate}
              onRefresh={onRefresh}
              onPreview={onPreviewFile}
              moveFile={moveFile}
              onCopyFile={handleCopyFile}
              onCutFile={handleCutFile}
              onContextMenu={handleContextMenu}
            />
          ) : (
            <FileGridView
              files={activeFolderFiles}
              subFolders={activeSubFolders}
              folders={folders}
              selectedFileIds={selectedFileIds}
              onFileSelect={handleFileSelect}
              onFileToggle={handleFileToggle}
              onFolderNavigate={handleFolderNavigate}
              onRefresh={onRefresh}
              onPreview={onPreviewFile}
              moveFile={moveFile}
              onCopyFile={handleCopyFile}
              onCutFile={handleCutFile}
              onContextMenu={handleContextMenu}
            />
          )}

          {/* Preview Pane */}
          <PreviewPane
            file={previewFile}
            folders={folders}
            onClose={onClearPreview}
            onMoveFile={moveFile}
          />
        </div>
      </div>

      {contextMenu && (
        <FileContextMenu
          target={contextMenu}
          actions={contextMenuActions}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};
