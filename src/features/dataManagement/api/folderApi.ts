import axios from 'axios';
import type { FolderTreeNode, FolderExportData } from '../types/folder.types';
import { tokenStorage } from '../../../lib/token';

const folderAxios = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || '/api/v1'}/folders`,
});

folderAxios.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * API client for folder management operations.
 */
export const folderApi = {
  /**
   * Fetches the complete folder tree structure.
   *
   * @returns Promise resolving to an array of folder tree nodes.
   */
  list: async (): Promise<FolderTreeNode[]> => {
    const response = await folderAxios.get('/');
    return response.data.data ?? [];
  },

  /**
   * Creates a new folder with the given name, optionally nested under a parent.
   *
   * @param name - The display name for the new folder.
   * @param parentId - Optional ID of the parent folder.
   * @returns Promise resolving to the newly created folder.
   */
  create: async (name: string, parentId?: string): Promise<{ id: string; name: string; parentId: string | null }> => {
    const response = await folderAxios.post('/', { name, parentId });
    return response.data.data;
  },

  /**
   * Updates the name of an existing folder.
   *
   * @param id - The ID of the folder to update.
   * @param name - The new name for the folder.
   * @returns Promise that resolves when the update completes.
   */
  update: async (id: string, name: string): Promise<void> => {
    await folderAxios.put(`/${id}`, { name });
  },

  /**
   * Renames a folder and optionally moves it to a different parent.
   *
   * @param id - The ID of the folder to rename.
   * @param name - The new name for the folder.
   * @param parentId - Optional new parent folder ID to move the folder under.
   * @returns Promise that resolves when the rename completes.
   */
  rename: async (id: string, name: string, parentId?: string): Promise<void> => {
    await folderAxios.put(`/${id}`, { name, parentId });
  },

  /**
   * Deletes a folder by its ID.
   *
   * @param id - The ID of the folder to delete.
   * @returns Promise that resolves when the deletion completes.
   */
  remove: async (id: string): Promise<void> => {
    await folderAxios.delete(`/${id}`);
  },

  /**
   * Exports all files in a folder, returning download URLs.
   *
   * @param id - The ID of the folder to export.
   * @returns Promise resolving to the export data with download URLs.
   */
  exportFolder: async (id: string): Promise<FolderExportData> => {
    const response = await folderAxios.get(`/${id}/export`);
    return response.data.data;
  },

  /**
   * Moves a file attachment to a different folder (or removes it from a folder).
   *
   * @param attachmentId - The ID of the attachment to move.
   * @param folderId - The target folder ID, or null to move to the root.
   * @returns Promise that resolves when the move completes.
   */
  moveFile: async (attachmentId: string, folderId: string | null): Promise<void> => {
    await folderAxios.patch('/move-file', { attachmentId, folderId });
  },

  /**
   * Copies a file attachment to the specified folder.
   *
   * @param attachmentId - The ID of the attachment to copy.
   * @param folderId - The target folder ID, or null to copy to the root.
   * @returns Promise that resolves when the copy completes.
   */
  copyFile: async (attachmentId: string, folderId: string | null): Promise<void> => {
    await folderAxios.patch('/copy-file', { attachmentId, folderId });
  },
};
