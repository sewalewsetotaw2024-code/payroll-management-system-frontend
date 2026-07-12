import { useState, useCallback } from 'react';
import { toast } from '../../../components/ui/Toast';
import { folderApi } from '../api/folderApi';

/**
 * Hook that manages drag-and-drop state for moving files between folders in the explorer.
 * Tracks the currently dragged file and the folder being hovered over.
 *
 * @param onFileMoved - Callback invoked after a successful drop-and-move operation.
 * @returns Drag state and event handler functions.
 */
export function useFileDragDrop(onFileMoved: () => void) {
  const [draggingFileId, setDraggingFileId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const handleDragStart = useCallback(
    (e: React.DragEvent, fileId: string) => {
      e.dataTransfer.setData('text/attachment-id', fileId);
      e.dataTransfer.effectAllowed = 'move';
      setDraggingFileId(fileId);
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingFileId(null);
    setDragOverFolderId(null);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, folderId: string | null) => {
      e.preventDefault();
      setDragOverFolderId(folderId);
    },
    [],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverFolderId(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, folderId: string | null) => {
      e.preventDefault();
      const attachmentId = e.dataTransfer.getData('text/attachment-id');
      if (attachmentId) {
        try {
          await folderApi.moveFile(attachmentId, folderId);
          toast.success('File moved successfully');
          onFileMoved();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Failed to move file');
        }
      }
      setDragOverFolderId(null);
      setDraggingFileId(null);
    },
    [onFileMoved],
  );

  return {
    draggingFileId,
    dragOverFolderId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
