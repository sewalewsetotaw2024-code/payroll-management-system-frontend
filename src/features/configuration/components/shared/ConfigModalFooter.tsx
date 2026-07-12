import React from 'react';
import { Button } from '../../../../components/ui';

interface ConfigModalFooterProps {
  onCancel: () => void;
  onSave: () => void;
  isEdit: boolean;
  saving?: boolean;
  saveLabel?: string;
  editLabel?: string;
}

/**
 * ConfigModalFooter component providing standard Cancel and Save/Update buttons.
 * Used across configuration modals for consistent footer actions.
 *
 * @param props - Component props with cancel/save handlers and display labels.
 * @returns A modal footer with action buttons.
 */
export const ConfigModalFooter: React.FC<ConfigModalFooterProps> = ({
  onCancel,
  onSave,
  isEdit,
  saving,
  saveLabel = 'Add',
  editLabel = 'Update',
}) => (
  <>
    <Button variant="outline" onClick={onCancel} disabled={saving} className="w-full sm:w-auto">Cancel</Button>
    <Button onClick={onSave} isLoading={saving} className="w-full sm:w-auto">{isEdit ? editLabel : saveLabel}</Button>
  </>
);
