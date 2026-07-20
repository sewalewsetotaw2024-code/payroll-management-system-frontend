import { useState, useCallback, useMemo } from 'react';
import type { ImportRecord, ImportType } from '../types/dataManagement.types';

/**
 * Determines the display mode for the file explorer: list or grid.
 */
export type ViewMode = 'list' | 'grid';

/**
 * Filters the file list by a specific import category, or null for all categories.
 */
export type CategoryFilter = ImportType | null;

/**
 * Hook that manages file explorer state including active folder, search query,
 * view mode, file selection, and category filtering. Provides derived data
 * such as filtered imports, recent imports, and this-month imports.
 *
 * @param allImports - The complete list of import records to manage.
 * @returns Explorer state, setters, and derived data.
 */
export function useFileExplorer(allImports: ImportRecord[] = []) {
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>(null);

  const clearSelection = useCallback(() => {
    setSelectedFileIds([]);
  }, []);

  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId],
    );
  }, []);

  const selectAllFiles = useCallback((allFileIds: string[]) => {
    setSelectedFileIds(allFileIds);
  }, []);

  const isFileSelected = useCallback(
    (fileId: string) => selectedFileIds.includes(fileId),
    [selectedFileIds],
  );

  const selectedFile = useMemo(() => {
    if (selectedFileIds.length === 0) return null;
    return allImports.find((f) => f.id === selectedFileIds[0]) ?? null;
  }, [selectedFileIds, allImports]);

  const filteredImports = useMemo(() => {
    let result = allImports;

    // Filter by folder
    if (activeFolderId) {
      result = result.filter((f) => f.folderId === activeFolderId);
    }

    // Filter by category
    if (activeCategory) {
      result = result.filter((f) => f.referenceId === activeCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.fileName.toLowerCase().includes(q) ||
          f.referenceId.toLowerCase().includes(q),
      );
    }

    return result;
  }, [allImports, activeFolderId, activeCategory, searchQuery]);

  const folderFilesCount = useCallback(
    (folderId: string) => allImports.filter((f) => f.folderId === folderId).length,
    [allImports],
  );

  const recentImports = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return allImports.filter((f) => new Date(f.uploadedAt) >= sevenDaysAgo);
  }, [allImports]);

  const thisMonthImports = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return allImports.filter((f) => {
      const d = new Date(f.uploadedAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [allImports]);

  return {
    // State
    activeFolderId,
    searchQuery,
    viewMode,
    selectedFileIds,
    activeCategory,
    // Setters
    setActiveFolderId,
    setSearchQuery,
    setViewMode,
    setSelectedFileIds,
    setActiveCategory,
    clearSelection,
    toggleFileSelection,
    selectAllFiles,
    isFileSelected,
    // Derived
    selectedFile,
    filteredImports,
    folderFilesCount,
    // Smart folder counts
    recentImports,
    thisMonthImports,
  };
}
