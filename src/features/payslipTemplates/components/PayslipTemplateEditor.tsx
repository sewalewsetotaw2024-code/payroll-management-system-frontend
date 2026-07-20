import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Toggle } from '../../../components/ui';
import type { PayslipTemplate } from '../types/payslipTemplate.types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    language: string;
    isDefault: boolean;
    htmlContent: string;
  }) => Promise<void>;
  template?: PayslipTemplate | null;
  saving?: boolean;
}

export const PayslipTemplateEditor: React.FC<Props> = ({
  open,
  onClose,
  onSave,
  template,
  saving,
}) => {
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('en');
  const [isDefault, setIsDefault] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    if (template) {
      setName(template.name);
      setLanguage(template.language || 'en');
      setIsDefault(template.isDefault);
      setHtmlContent('');
    } else {
      setName('');
      setLanguage('en');
      setIsDefault(false);
      setHtmlContent('');
    }
  }, [template, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSave({ name: name.trim(), language, isDefault, htmlContent });
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={template ? 'Edit Template' : 'Create Template'}
      size="2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Template Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Standard Payslip"
            required
          />
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          >
            <option value="en">English</option>
            <option value="am">Amharic</option>
          </select>
        </div>

        {/* Default toggle */}
        <div className="flex items-center gap-3">
          <Toggle checked={isDefault} onChange={setIsDefault} />
          <span className="text-sm font-medium text-slate-700">Set as default template</span>
        </div>

        {/* HTML content */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">
            HTML Template Content
            {template && (
              <span className="font-normal text-slate-400 ml-2">(leave empty to keep existing)</span>
            )}
          </label>
          <textarea
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            placeholder={template ? 'Paste new Handlebars HTML content...' : '<html>...your Handlebars template...</html>'}
            rows={16}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 resize-y"
          />
        </div>
      </form>
    </Modal>
  );
};
