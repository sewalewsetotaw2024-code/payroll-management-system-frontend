import React from 'react';
import { FolderOpen, ChevronRight } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import type { FolderTreeNode } from '../../types/folder.types';

/**
 * A single segment in the breadcrumb trail.
 */
interface BreadcrumbSegment {
  id: string | null;
  name: string;
}

/**
 * Props for the BreadcrumbNav component.
 */
interface BreadcrumbNavProps {
  folders: FolderTreeNode[];
  activeFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
}

/**
 * Builds the breadcrumb segment trail from the root to the active folder.
 *
 * @param folders - The full folder tree to search through.
 * @param activeFolderId - The currently active folder ID, or null for root.
 * @returns An ordered array of breadcrumb segments from root to active folder.
 */
function buildBreadcrumbs(
  folders: FolderTreeNode[],
  activeFolderId: string | null,
): BreadcrumbSegment[] {
  if (!activeFolderId) return [{ id: null, name: 'All Files' }];

  const segments: BreadcrumbSegment[] = [{ id: null, name: 'All Files' }];

  const findPath = (nodes: FolderTreeNode[], targetId: string): BreadcrumbSegment[] | null => {
    for (const node of nodes) {
      if (node.id === targetId) {
        return [{ id: node.id, name: node.name }];
      }
      if (node.children) {
        const found = findPath(node.children, targetId);
        if (found) {
          return [{ id: node.id, name: node.name }, ...found];
        }
      }
    }
    return null;
  };

  const path = findPath(folders, activeFolderId);
  if (path) {
    segments.push(...path);
  }

  return segments;
}

/**
 * BreadcrumbNav component that displays the current folder path as a clickable trail.
 * Each segment navigates to the corresponding folder level. The last segment is
 * rendered as the current location.
 */
export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({
  folders,
  activeFolderId,
  onNavigate,
}) => {
  const segments = React.useMemo(
    () => buildBreadcrumbs(folders, activeFolderId),
    [folders, activeFolderId],
  );

  return (
    <nav className="flex items-center gap-1 px-4 py-2.5 bg-white border-b border-slate-100 text-sm" aria-label="Breadcrumb">
      {segments.map((segment, idx) => (
        <React.Fragment key={segment.id ?? 'root'}>
          {idx > 0 && (
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          )}
          <button
            type="button"
            onClick={() => onNavigate(segment.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-colors',
              idx === segments.length - 1
                ? 'text-slate-900 font-semibold cursor-default'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 cursor-pointer',
            )}
            aria-current={idx === segments.length - 1 ? 'page' : undefined}
          >
            {idx === 0 && <FolderOpen className="w-3.5 h-3.5" />}
            {segment.name}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};
