import React, { useEffect, useState, useCallback } from 'react';
import {
  FileText, Plus, Edit2, Trash2, Download, Eye,
  AlertTriangle, CheckCircle2, Loader2,
} from 'lucide-react';
import { payslipTemplateApi } from '../api/payslipTemplateApi';
import type { PayslipTemplate } from '../types/payslipTemplate.types';
import { PayslipTemplateEditor } from '../components/PayslipTemplateEditor';
import { ConfigSection } from '../../configuration/components/shared/ConfigSection';
import { ConfigEmptyState } from '../../configuration/components/shared/ConfigEmptyState';

const languageLabel: Record<string, string> = {
  en: 'English',
  am: 'Amharic',
};

export const PayslipTemplateListPage: React.FC = () => {
  const [templates, setTemplates] = useState<PayslipTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PayslipTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await payslipTemplateApi.list();
      setTemplates(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  const handleEdit = (template: PayslipTemplate) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const handleSave = async (data: {
    name: string;
    language: string;
    isDefault: boolean;
    htmlContent: string;
  }) => {
    setSaving(true);
    try {
      if (editingTemplate) {
        await payslipTemplateApi.update(editingTemplate.id, data);
      } else {
        await payslipTemplateApi.create(data);
      }
      setEditorOpen(false);
      setEditingTemplate(null);
      await fetchTemplates();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Save failed';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (template: PayslipTemplate) => {
    if (!window.confirm(`Delete template "${template.name}"? This cannot be undone.`)) return;
    try {
      await payslipTemplateApi.delete(template.id);
      await fetchTemplates();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Delete failed');
    }
  };

  const handlePreview = async (template: PayslipTemplate) => {
    setPreviewLoading(true);
    try {
      const html = await payslipTemplateApi.preview(template.id);
      setPreviewHtml(html);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <ConfigSection
      id="payslip-templates"
      title="Payslip Templates"
      description="Manage payslip HTML templates for PDF generation"
      actionButton={
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-bold"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      }
    >
      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-700">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {error}
          <button onClick={fetchTemplates} className="ml-auto text-sm font-bold text-red-700 hover:text-red-800 underline">
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && templates.length === 0 && (
        <ConfigEmptyState
          icon={<FileText className="w-8 h-8" />}
          title="No templates yet"
          message="Create your first payslip template to start generating PDF payslips."
        />
      )}

      {/* Template list */}
      {!loading && !error && templates.length > 0 && (
        <div className="grid gap-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{template.name}</h4>
                    {template.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-100/50 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {languageLabel[template.language] || template.language}
                    {template.templateUrl ? ' — HTML uploaded' : ' — No HTML'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handlePreview(template)}
                  disabled={!template.templateUrl || previewLoading}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Preview"
                >
                  {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                </button>
                <a
                  href={payslipTemplateApi.downloadUrl(template.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors ${!template.templateUrl ? 'opacity-30 pointer-events-none' : ''}`}
                  title="Download HTML"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => handleEdit(template)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(template)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {previewHtml && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setPreviewHtml(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Template Preview</h3>
              <button
                onClick={() => setPreviewHtml(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <span className="sr-only">Close</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-[60vh] border-0 rounded-xl"
                title="Template Preview"
                sandbox=""
              />
            </div>
          </div>
        </div>
      )}

      {/* Editor modal */}
      <PayslipTemplateEditor
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditingTemplate(null); }}
        onSave={handleSave}
        template={editingTemplate}
        saving={saving}
      />
    </ConfigSection>
  );
};
