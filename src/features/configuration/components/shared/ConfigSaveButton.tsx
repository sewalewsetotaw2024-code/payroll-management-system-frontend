import React from 'react';
import { Save } from 'lucide-react';
import { Button } from '../../../../components/ui';

interface ConfigSaveButtonProps {
  onClick: () => void;
  saving?: boolean;
  label?: string;
  className?: string;
}

/**
 * ConfigSaveButton component for triggering save operations.
 * Displays a loading spinner while saving and shows a Save icon by default.
 *
 * @param props - Component props with click handler, saving state, and label.
 * @returns A save action button.
 */
export const ConfigSaveButton: React.FC<ConfigSaveButtonProps> = ({
  onClick,
  saving = false,
  label = 'Save Configuration',
  className,
}) => (
  <Button onClick={onClick} disabled={saving} className={`w-full sm:w-auto px-6 sm:px-10 shadow shadow-emerald-200/50 ${className ?? ''}`}>
    {saving ? (
      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
    ) : (
      <Save className="w-4 h-4" />
    )}
    {label}
  </Button>
);
