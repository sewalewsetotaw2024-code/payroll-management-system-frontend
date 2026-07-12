import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Database,
  HardDrive,
  AlertCircle,
  Upload,
  Download,
  FileText,
  History,
  Loader2,
  RefreshCw,
  Users,
  BarChart3,
  Settings,
  FolderOpen,
  Clock,
  Calendar,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '../../../components/ui/Card/Card';
import { Button } from '../../../components/ui/Button/Button';
import { Pagination } from '../../../components/ui/Pagination/Pagination';
import { cn, getFileExtension } from '../../../lib/utils';
import { Skeleton } from '../../../components/ui';
import { toast } from '../../../components/ui/Toast';
import { dataManagementApi } from '../api/dataManagementApi';
import { folderApi } from '../api/folderApi';
import { ImportModal } from '../components/ImportModal';
import { ExplorerLayout } from '../components/explorer/ExplorerLayout';
import type { ImportType, ImportRecord } from '../types/dataManagement.types';
import type { FolderTreeNode } from '../types/folder.types';
import { AttendanceImportFlow } from '../components/AttendanceImportFlow';
/** Sample historical archive data for display. */
const ARCHIVE_DATA = [
  { period: 'March 2026', employees: 1248, total: 45200000, status: 'current' as const },
  { period: 'February 2026', employees: 1232, total: 43800000, status: 'archived' as const },
  { period: 'January 2026', employees: 1220, total: 42500000, status: 'archived' as const },
];

/** Available report export templates shown on the page. */
const EXPORT_TEMPLATES = [
  { name: 'Payroll Summary Report', description: 'Monthly payroll breakdown by department', format: 'Excel' },
  { name: 'Employee Payslips (Bulk)', description: 'Individual payslip for all employees', format: 'PDF' },
  { name: 'Tax & Pension Reports', description: 'MoR and POESSA submission format', format: 'Excel' },
];

/** Configuration for the upload type cards on the page. */
const UPLOAD_CARDS: {
  type: ImportType;
  label: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}[] = [
    {
      type: 'EMPLOYEE',
      label: 'Employee Master Data',
      sub: 'Excel (.xlsx) or CSV (.csv)',
      icon: <Users className="w-5 h-5" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      type: 'ATTENDANCE',
      label: 'Attendance & Overtime',
      sub: 'CSV (.csv) from biometric system',
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      type: 'ADJUSTMENT',
      label: 'Bulk Adjustments',
      sub: 'Loans, deductions, and advances',
      icon: <Settings className="w-5 h-5" />,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
  ];

const DEFAULT_PAGE_SIZE = 5;

/**
 * DataManagementPage component that serves as the main entry point for the Data Management feature.
 * Displays import/export cards, recent imports table, file explorer, and historical archive sections.
 */
export const DataManagementPage: React.FC = () => {
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [allImports, setAllImports] = useState<ImportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImportType, setSelectedImportType] = useState<ImportType>('EMPLOYEE');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [folders, setFolders] = useState<FolderTreeNode[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImportType = useRef<ImportType | null>(null);
  const currentPageRef = useRef(1);
  const pageSizeRef = useRef(DEFAULT_PAGE_SIZE);
  const [selectedFile, setSelectedFile] = useState<ImportRecord | null>(null);
  const activeFolderIdRef = useRef<string | null>(null);
  const [attendanceFlowOpen, setAttendanceFlowOpen] = useState(false);

  const loadFolders = useCallback(async () => {
    setFoldersLoading(true);
    try {
      const tree = await folderApi.list();
      setFolders(Array.isArray(tree) ? tree : []);
    } catch {
      // silently fail — folders are optional
      setFolders([]);
    } finally {
      setFoldersLoading(false);
    }
  }, []);

  const loadImports = useCallback(async (targetPage: number, customPageSize?: number) => {
    setLoading(true);
    setError(null);
    try {
      const limit = customPageSize ?? pageSizeRef.current;
      const res = await dataManagementApi.getImportHistory({ page: targetPage, limit });
      setImports(Array.isArray(res?.imports) ? res.imports : []);
      setTotalItems(res.totalItems);
      setCurrentPage(res.currentPage);
      setTotalPages(res.totalPages);
      currentPageRef.current = res.currentPage;
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load imports');
      setImports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllImports = useCallback(async () => {
    try {
      // Fetch pages with a conservative limit so servers with max-page-size caps don't reject
      const PAGE_LIMIT = 100;
      const first = await dataManagementApi.getImportHistory({ page: 1, limit: PAGE_LIMIT });
      let allRecords: ImportRecord[] = Array.isArray(first?.imports) ? first.imports : [];
      const totalPages = first.totalPages || 1;

      // Fetch remaining pages if the server paginated the response
      for (let p = 2; p <= totalPages; p++) {
        const page = await dataManagementApi.getImportHistory({ page: p, limit: PAGE_LIMIT });
        const records = Array.isArray(page?.imports) ? page.imports : [];
        allRecords = allRecords.concat(records);
      }

      setAllImports(allRecords);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Unknown error';
      toast.error(`Failed to load file explorer data: ${msg}`);
      console.error('loadAllImports error:', err);
    }
  }, []);

  const reloadAllImports = useCallback(() => {
    setAllImports([]);
    loadAllImports();
  }, [loadAllImports]);

  const reloadImports = useCallback(() => {
    loadImports(currentPageRef.current);
  }, [loadImports]);

  const handleUploadClick = (type: ImportType, folderId?: string | null) => {
    if (type === 'ATTENDANCE') {
      setAttendanceFlowOpen(true);
      return;
    }
    pendingImportType.current = type;
    activeFolderIdRef.current = folderId ?? null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingImportType.current) return;
    setSelectedImportType(pendingImportType.current);
    setPendingFile(file);
    setModalOpen(true);
  };

  const handlePageChange = (newPage: number) => {
    loadImports(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    pageSizeRef.current = newSize;
    setCurrentPage(1);
    currentPageRef.current = 1;
    loadImports(1, newSize);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const typeLabel = (refId: string) => {
    const map: Record<string, string> = {
      EMPLOYEE: 'Employee Data',
      ATTENDANCE: 'Attendance',
      ADJUSTMENT: 'Adjustments',
    };
    return map[refId] || refId;
  };

  const typeColor = (refId: string) => {
    const map: Record<string, string> = {
      EMPLOYEE: 'bg-emerald-100 text-emerald-700',
      ATTENDANCE: 'bg-blue-100 text-blue-700',
      ADJUSTMENT: 'bg-amber-100 text-amber-700',
    };
    return map[refId] || 'bg-slate-100 text-slate-700';
  };

  const stats = useMemo(() => {
    const totalFiles = totalItems;
    const now = new Date();
    const thisMonth = imports.filter(i => {
      const d = new Date(i.uploadedAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const totalSize = imports.reduce((sum, i) => sum + i.sizeBytes, 0);
    return { totalFiles, thisMonth, totalSize };
  }, [imports, totalItems]);

  // Upload handler adapter for ExplorerLayout
  const handleExplorerUpload = useCallback(() => {
    handleUploadClick('EMPLOYEE', activeFolderId);
  }, [handleUploadClick, activeFolderId]);

  const handleRefreshAll = useCallback(async () => {
    setAllImports([]);
    await Promise.all([
      loadFolders(),
      loadAllImports(),
      loadImports(currentPageRef.current),
    ]);
  }, [loadFolders, loadAllImports, loadImports]);

  const handleImportComplete = useCallback(() => {
    setModalOpen(false);
    setPendingFile(null);
    handleRefreshAll();
  }, [handleRefreshAll]);

  useEffect(() => {
    loadImports(1);
    loadFolders();
    loadAllImports();
  }, [loadImports, loadFolders, loadAllImports]);

  return (
    <div className="min-h-screen space-y-6 p-6 xl:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl xl:text-3xl font-bold text-slate-900 tracking-tight">Data & Document Management</h1>
          <p className="text-sm text-slate-500 mt-1">Upload, download, and manage payroll data</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button variant="outline" size="sm" onClick={() => toast.info('Export coming soon')} className="rounded-xl font-bold">
              <Download className="w-4 h-4" /> Export Data
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button variant="primary" size="sm" onClick={reloadImports} className="rounded-xl font-bold">
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Refresh
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div whileHover={{ translateY: -2 }}>
          <Card className="!p-5 hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Files</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-200">
                <Database className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 font-mono tracking-tight">{stats.totalFiles}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <p className="text-xs text-emerald-600 font-medium">All time imports</p>
            </div>
          </Card>
        </motion.div>

        <motion.div whileHover={{ translateY: -2 }}>
          <Card className="!p-5 hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">This Month</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
                <Upload className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 font-mono tracking-tight">{stats.thisMonth}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <p className="text-xs text-emerald-600 font-medium">Current period</p>
            </div>
          </Card>
        </motion.div>

        <motion.div whileHover={{ translateY: -2 }}>
          <Card className="!p-5 hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Storage Used</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-sm shadow-violet-200">
                <HardDrive className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 font-mono tracking-tight">{formatSize(stats.totalSize)}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <p className="text-xs text-slate-400 font-medium">Cloudinary storage</p>
            </div>
          </Card>
        </motion.div>

        <motion.div whileHover={{ translateY: -2 }}>
          <Card className="!p-5 hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Import Errors</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm shadow-amber-200">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 font-mono tracking-tight">0</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <p className="text-xs text-slate-400 font-medium">Last 30 days</p>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Section */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <Upload className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Import Data</h3>
                <p className="text-xs text-slate-500 mt-0.5">Upload employee and payroll data files</p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelected}
            />

            <div className="space-y-3">
              {UPLOAD_CARDS.map((card) => (
                <button
                  key={card.type}
                  onClick={() => handleUploadClick(card.type, activeFolderId)}
                  className="w-full flex items-center gap-4 p-4 border-2 border-dashed border-emerald-200/60 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm hover:shadow-emerald-100 transition-all cursor-pointer group"
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110',
                    card.bgColor,
                  )}>
                    <div className={cn(card.color, 'transition-all')}>{card.icon}</div>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-slate-800">{card.label}</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">{card.sub}</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-white border border-emerald-100 flex items-center justify-center group-hover:bg-emerald-50 transition-colors shrink-0">
                    <Upload className="w-4 h-4 text-emerald-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Supported Upload Types</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Employee master data (salary, allowances, deductions)
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  Attendance and overtime records
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  Loan, advance, and bonus adjustments
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Export Section */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <Download className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Generate Reports</h3>
                <p className="text-xs text-slate-500 mt-0.5">Download standard report templates</p>
              </div>
            </div>

            <div className="space-y-3">
              {EXPORT_TEMPLATES.map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => toast.info('Export coming soon')}
                  className={cn(
                    'w-full flex items-center justify-between p-4 border border-slate-200 border-l-4 rounded-xl hover:shadow-sm hover:bg-slate-50/60 transition-all group cursor-pointer',
                    idx === 0 && 'border-l-emerald-500 hover:border-l-emerald-600',
                    idx === 1 && 'border-l-blue-500 hover:border-l-blue-600',
                    idx === 2 && 'border-l-amber-500 hover:border-l-amber-600',
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                      idx === 0 && 'bg-emerald-50',
                      idx === 1 && 'bg-blue-50',
                      idx === 2 && 'bg-amber-50',
                    )}>
                      <FileText className={cn(
                        'w-4 h-4',
                        idx === 0 && 'text-emerald-600',
                        idx === 1 && 'text-blue-600',
                        idx === 2 && 'text-amber-600',
                      )} />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate">{template.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{template.description}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          idx === 0 && 'bg-emerald-500',
                          idx === 1 && 'bg-blue-500',
                          idx === 2 && 'bg-amber-500',
                        )} />
                        <span className="text-[10px] font-semibold text-slate-500">{template.format}</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center group-hover:bg-emerald-50 group-hover:border-emerald-200 transition-all shrink-0 ml-3">
                    <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Recent Imports */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card noPadding>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-8 pt-8 pb-0 mb-0">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h3 className="font-bold text-slate-900 text-sm">Recent Imports</h3>
              <span className="text-xs text-slate-400 ml-1">({imports.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={reloadImports}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors cursor-pointer"
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </button>
            </div>
          </div>

          {loading && imports.length === 0 ? (
            <div className="p-8 space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
              <p className="text-sm text-red-600 font-medium mb-2">{error}</p>
              <Button variant="secondary" size="sm" onClick={reloadImports}>
                Try Again
              </Button>
            </div>
          ) : imports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <Upload className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-500">No imports yet</p>
              <p className="text-xs text-slate-400 mt-1">Upload a file above to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-100 bg-white/80 backdrop-blur-sm">
                    <th className="px-8 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">File Name</th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Size</th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Format</th>
                    <th className="px-8 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {imports.map((file, idx) => (
                    <motion.tr
                      key={file.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.03 }}
                      className={`transition-all text-sm cursor-default hover:bg-slate-50 ${idx % 2 === 1 ? 'bg-slate-50/40' : ''}`}
                    >
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-5 h-5 text-emerald-500 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-800 truncate">{file.fileName}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'px-2.5 py-1 rounded-lg text-[11px] font-bold',
                            typeColor(file.referenceId),
                          )}>
                            {typeLabel(file.referenceId)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="text-xs font-mono">{formatDate(file.uploadedAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-slate-600 font-mono">{formatSize(file.sizeBytes)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{getFileExtension(file.fileName)}</span>
                      </td>
                      <td className="px-8 py-4 text-right relative">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={file.filePath?.replace('/upload/', '/upload/fl_attachment/') ?? '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition-all"
                            download
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={handlePageChange}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          )}
        </Card>
      </motion.div>

      {/* File Explorer */}
      <ExplorerLayout
        allImports={allImports}
        folders={folders}
        onRefresh={handleRefreshAll}
        onUpload={handleExplorerUpload}
        onPreviewFile={setSelectedFile}
        previewFile={selectedFile}
        onClearPreview={() => setSelectedFile(null)}
        onActiveFolderChange={setActiveFolderId}
      />

      {/* Historical Archive */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
      >
        <Card>
          <div className="flex items-center gap-2 mb-6">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="font-bold text-slate-900 text-sm">Historical Payroll Archive</h3>
          </div>

          <div className="space-y-4">
            {ARCHIVE_DATA.map((archive, idx) => (
              <motion.div
                key={archive.period}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.3 + idx * 0.05 }}
                className={cn(
                  'p-5 rounded-2xl border-2 transition-all',
                  archive.status === 'current'
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-slate-200 bg-white',
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <FolderOpen className={cn(
                      'w-5 h-5',
                      archive.status === 'current' ? 'text-emerald-600' : 'text-slate-400',
                    )} />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{archive.period}</h4>
                      {archive.status === 'current' && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Current</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">View Details</Button>
                    <Button variant="primary" size="sm">Download All</Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium">Employees</p>
                    <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">{archive.employees}</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium">Total Payroll</p>
                    <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">{archive.total.toLocaleString()}</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium">Status</p>
                    <span className={cn(
                      'inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase',
                      archive.status === 'current'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500',
                    )}>
                      {archive.status}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="sm">
                <Calendar className="w-3.5 h-3.5" /> View All Archives
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-3.5 h-3.5" /> Export Historical Data
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {attendanceFlowOpen && (
        <AttendanceImportFlow
          folders={folders}
          existingImports={[]}
          onComplete={() => {
            setAttendanceFlowOpen(false);
            handleRefreshAll();
          }}
          onCancel={() => setAttendanceFlowOpen(false)}
        />
      )}
      {/* Import Modal */}
      <ImportModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setPendingFile(null);
        }}
        importType={selectedImportType}
        initialFile={pendingFile}
        onComplete={handleImportComplete}
        folders={folders}
        initialFolderId={activeFolderIdRef.current}
      />
    </div>
  );
};
