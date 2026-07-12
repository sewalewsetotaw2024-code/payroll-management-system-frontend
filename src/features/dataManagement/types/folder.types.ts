/**
 * A single node in the folder tree hierarchy, supporting nested children.
 */
export interface FolderTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  fileCount: number;
  children: FolderTreeNode[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Data returned when exporting a folder's contents.
 */
export interface FolderExportData {
  folderName: string;
  attachments: { fileName: string; downloadUrl: string }[];
}
