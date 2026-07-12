import { useState, useCallback } from 'react';
import { folderApi } from '../api/folderApi';
import { toast } from '../../../components/ui/Toast';
import type { FolderTreeNode } from '../types/folder.types';

/**
 * Hook that provides folder CRUD operations and related state management.
 * Handles creating, renaming, deleting, and exporting folders, along with
 * inline creation of sub-folders.
 *
 * @param folders - The current folder tree structure.
 * @param onRefresh - Callback invoked after any successful folder operation.
 * @returns Folder operation state and handler functions.
 */
export function useFolderOperations(
  folders: FolderTreeNode[],
  onRefresh: () => Promise<void>,
) {
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [creatingSubFolder, setCreatingSubFolder] = useState<{
    parentId: string;
    parentName: string;
  } | null>(null);
  const [newSubFolderName, setNewSubFolderName] = useState('');

  const handleCreateFolder = useCallback(
    async (parentId?: string | null) => {
      const name = parentId !== undefined ? newSubFolderName.trim() : newFolderName.trim();
      if (!name) return;
      try {
        await folderApi.create(name, parentId ?? undefined);
        if (parentId !== undefined) {
          setNewSubFolderName('');
          setCreatingSubFolder(null);
          toast.success(`Sub-folder "${name}" created`);
        } else {
          setNewFolderName('');
          setCreatingFolder(false);
          toast.success(`Folder "${name}" created`);
        }
        await onRefresh();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Failed to create folder');
      }
    },
    [newFolderName, newSubFolderName, onRefresh],
  );

  const handleRenameFolder = useCallback(
    async (id: string) => {
      const name = renameValue.trim();
      if (!name) return;
      try {
        await folderApi.update(id, name);
        setRenamingFolder(null);
        setRenameValue('');
        await onRefresh();
        toast.success('Folder renamed');
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Failed to rename folder');
      }
    },
    [renameValue, onRefresh],
  );

  const handleDeleteFolder = useCallback(
    async (id: string) => {
      try {
        await folderApi.remove(id);
        await onRefresh();
        toast.success('Folder deleted');
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Failed to delete folder');
      }
    },
    [onRefresh],
  );

  const handleExportFolder = useCallback(
    async (id: string) => {
      try {
        const data = await folderApi.exportFolder(id);
        for (const file of data.attachments) {
          window.open(file.downloadUrl, '_blank');
        }
        toast.success(`Opening ${data.attachments.length} file(s) from "${data.folderName}"`);
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Failed to export folder');
      }
    },
    [],
  );

  const findFolder = useCallback(
    (nodes: FolderTreeNode[], id: string): FolderTreeNode | null => {
      for (const n of nodes) {
        if (n.id === id) return n;
        if (n.children) {
          const found = findFolder(n.children, id);
          if (found) return found;
        }
      }
      return null;
    },
    [],
  );

  return {
    creatingFolder,
    newFolderName,
    renamingFolder,
    renameValue,
    creatingSubFolder,
    newSubFolderName,
    setCreatingFolder,
    setNewFolderName,
    setRenamingFolder,
    setRenameValue,
    setCreatingSubFolder,
    setNewSubFolderName,
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleExportFolder,
    findFolder,
  };
}
