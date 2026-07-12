import { useState, useCallback } from 'react';
import { toast } from '../../../components/ui/Toast';
import { folderApi } from '../api/folderApi';

/**
 * Tracks the current folder clipboard operation (copy or cut).
 */
interface ClipboardState {
  action: 'cut' | 'copy';
  folderId: string;
  folderName: string;
}

/**
 * Hook that manages folder clipboard operations (copy, cut, paste) for the sidebar.
 * Supports moving or duplicating folders within the folder tree.
 *
 * @param onRefresh - Callback invoked after a successful paste to refresh the folder tree.
 * @returns Clipboard state and handler functions.
 */
export function useFolderClipboard(onRefresh: () => Promise<void>) {
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);

  const handleCopy = useCallback(
    (folderId: string, folderName: string) => {
      setClipboard({ action: 'copy', folderId, folderName });
      toast.info(`"${folderName}" copied`);
    },
    [],
  );

  const handleCut = useCallback(
    (folderId: string, folderName: string) => {
      setClipboard({ action: 'cut', folderId, folderName });
      toast.info(`"${folderName}" cut — right-click a folder to paste`);
    },
    [],
  );

  const handlePaste = useCallback(
    async (targetFolderId: string) => {
      if (!clipboard) return;
      try {
        if (clipboard.action === 'cut') {
          await folderApi.rename(clipboard.folderId, clipboard.folderName, targetFolderId);
          toast.success(`"${clipboard.folderName}" moved`);
        } else {
          await folderApi.create(clipboard.folderName + ' (copy)', targetFolderId);
          toast.success(`"${clipboard.folderName}" copied`);
        }
        setClipboard(null);
        await onRefresh();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Failed to paste folder');
      }
    },
    [clipboard, onRefresh],
  );

  const clearClipboard = useCallback(() => {
    setClipboard(null);
  }, []);

  return {
    clipboard,
    handleCopy,
    handleCut,
    handlePaste,
    clearClipboard,
  };
}
