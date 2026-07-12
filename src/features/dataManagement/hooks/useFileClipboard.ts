import { useState, useCallback } from 'react';
import { toast } from '../../../components/ui/Toast';
import { folderApi } from '../api/folderApi';

/**
 * A clipboard entry for a single file with an id and display name.
 */
interface ClipboardFile {
  id: string;
  name: string;
}

/**
 * Represents a clipboard item with an action type (copy or cut) and the list of files.
 */
interface ClipboardItem {
  action: 'copy' | 'cut';
  files: ClipboardFile[];
}

/**
 * Return type for the useFileClipboard hook.
 */
interface UseFileClipboardReturn {
  clipboard: ClipboardItem | null;
  hasClipboard: boolean;
  clipboardCount: number;
  /** Copy a single file to clipboard (for row/card action buttons). */
  handleCopyFile: (fileId: string, fileName: string) => void;
  /** Cut a single file to clipboard (for row/card action buttons). */
  handleCutFile: (fileId: string, fileName: string) => void;
  /** Copy multiple selected files to clipboard. */
  handleCopySelected: (files: ClipboardFile[]) => void;
  /** Cut multiple selected files to clipboard. */
  handleCutSelected: (files: ClipboardFile[]) => void;
  /** Paste all clipboard files to the target folder. */
  handlePasteFile: (targetFolderId: string | null) => Promise<void>;
  clearClipboard: () => void;
}

/**
 * Hook that manages file clipboard operations (copy, cut, paste) for the file explorer.
 * Supports single-file and multi-file clipboard entries with paste that moves or copies files via the API.
 *
 * @param onRefresh - Callback invoked after a successful paste to refresh the file list.
 * @returns Clipboard state and handler functions.
 */
export function useFileClipboard(onRefresh: () => Promise<void>): UseFileClipboardReturn {
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);

  const clearClipboard = useCallback(() => {
    setClipboard(null);
  }, []);

  const handleCopyFile = useCallback((fileId: string, fileName: string) => {
    setClipboard({ action: 'copy', files: [{ id: fileId, name: fileName }] });
    toast.success(`Copied: ${fileName}`);
  }, []);

  const handleCutFile = useCallback((fileId: string, fileName: string) => {
    setClipboard({ action: 'cut', files: [{ id: fileId, name: fileName }] });
    toast.success(`Cut: ${fileName}`);
  }, []);

  const handleCopySelected = useCallback((files: ClipboardFile[]) => {
    if (files.length === 0) return;
    setClipboard({ action: 'copy', files });
    toast.success(`Copied ${files.length} ${files.length === 1 ? 'file' : 'files'}`);
  }, []);

  const handleCutSelected = useCallback((files: ClipboardFile[]) => {
    if (files.length === 0) return;
    setClipboard({ action: 'cut', files });
    toast.success(`Cut ${files.length} ${files.length === 1 ? 'file' : 'files'}`);
  }, []);

  const handlePasteFile = useCallback(
    async (targetFolderId: string | null) => {
      if (!clipboard || clipboard.files.length === 0) return;
      const isCut = clipboard.action === 'cut';
      let successCount = 0;
      let failCount = 0;

      let copyEndpointMissing = false;

      for (const f of clipboard.files) {
        try {
          if (isCut) {
            await folderApi.moveFile(f.id, targetFolderId);
          } else {
            await folderApi.copyFile(f.id, targetFolderId);
          }
          successCount++;
        } catch (err: any) {
          failCount++;
          const status = err?.response?.status;

          // Copy endpoint not found / not implemented — stop everything and suggest Cut
          if (!isCut && (status === 404 || status === 501)) {
            copyEndpointMissing = true;
            toast.error('Copy not supported by server. Try Cut instead.');
            break;
          }

          // Cut failure is destructive — stop immediately
          if (isCut) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to move file';
            toast.error(msg);
            break;
          }
        }
      }

      // Don't clear clipboard if copy failed — user can try Cut
      if (copyEndpointMissing) {
        return;
      }

      if (successCount > 0) {
        toast.success(
          isCut
            ? `Moved ${successCount} ${successCount === 1 ? 'file' : 'files'}`
            : `Copied ${successCount} ${successCount === 1 ? 'file' : 'files'}`,
        );
      }

      // If copy had other failures, show a summary
      if (!isCut && failCount > 0) {
        toast.error(`${failCount} ${failCount === 1 ? 'file' : 'files'} failed to copy`);
      }

      setClipboard(null);
      await onRefresh();
    },
    [clipboard, onRefresh],
  );

  return {
    clipboard,
    hasClipboard: clipboard !== null,
    clipboardCount: clipboard?.files.length ?? 0,
    handleCopyFile,
    handleCutFile,
    handleCopySelected,
    handleCutSelected,
    handlePasteFile,
    clearClipboard,
  };
}
