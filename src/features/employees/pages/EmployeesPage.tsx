import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Download, UserPlus, RefreshCw, AlertCircle, Users, DollarSign, Building2, ArrowRightLeft, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EmployeeTable } from '../components/EmployeeTable';
import { EmployeeFilters } from '../components/EmployeeFilters';
import { EmployeeDetailModal } from '../components/EmployeeDetailModal';
import { getEmployees, getEmployeeById, triggerEmployeeSync, exportEmployees, type PayrollEmployee, type PaginationMeta } from '../api/employeeApi';
import { Pagination, Skeleton, Button } from '../../../components/ui';
import { cn } from '../../../lib/utils';

const DEFAULT_PAGE_SIZE = 10;

/**
 * EmployeesPage component that serves as the main entry point for the Employee Profiles feature.
 * Provides employee search/filtering, a paginated employee table, sync functionality,
 * and a detailed employee modal with salary and allowance breakdowns.
 */
export const EmployeesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const filterDebounceRef = useRef<any>(null);

  // Employees & pagination
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Get unique departments from current page
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach((e) => {
      if (e.departmentName) depts.add(e.departmentName);
    });
    return ['All Departments', ...Array.from(depts).sort()];
  }, [employees]);

  // Total items from server, or from client-side department filter
  const totalItems = pagination?.totalItems ?? 0;
  const totalPages = pagination?.totalPages ?? 0;

  // Auto-open detail modal if employeeId in URL
  useEffect(() => {
    if (employees.length > 0) {
      const urlId = searchParams.get('employeeId');
      if (urlId) {
        const match = employees.find(e => e.id === urlId);
        if (match) setSelectedEmployee(match);
      }
    }
  }, [employees, searchParams]);

  // Update URL when modal opens/closes
  useEffect(() => {
    if (selectedEmployee) {
      setSearchParams({ employeeId: selectedEmployee.id }, { replace: true });
    } else if (searchParams.has('employeeId')) {
      setSearchParams({}, { replace: true });
    }
  }, [selectedEmployee, setSearchParams, searchParams]);

  /** Fetch employees from the API with pagination, search, and status filter. */
  const loadEmployees = useCallback(async (p: number, size: number, search?: string, status?: string) => {
    setLoading(true);
    setError('');
    try {
      const { data, pagination: meta } = await getEmployees({
        search: search || undefined,
        status: status || undefined,
        page: p,
        limit: size,
      });
      setEmployees(data);
      setPagination(meta);
    } catch (err: any) {
      console.error('Failed to load employees:', err);
      setError(err?.message || 'Failed to load employees');
      setEmployees([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load employees on mount (page 1)
  useEffect(() => {
    loadEmployees(1, pageSize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced fetch when search or status changes
  useEffect(() => {
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(() => {
      const statusParam = selectedStatus !== 'All Status' ? selectedStatus.toUpperCase() : undefined;
      loadEmployees(1, pageSize, searchTerm, statusParam);
      setPage(1);
    }, 400);
    return () => { if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current); };
  }, [searchTerm, selectedStatus, pageSize, loadEmployees]);

  // Apply server-side filters, then client-side department filter
  const filteredEmployees = useMemo(() => {
    if (selectedDept === 'All Departments') return employees;
    return employees.filter((e) => e.departmentName === selectedDept);
  }, [employees, selectedDept]);

  /** Navigate to a specific page, reloading data from the API. */
  const handlePageChange = (newPage: number) => {
    const statusParam = selectedStatus !== 'All Status' ? selectedStatus.toUpperCase() : undefined;
    loadEmployees(newPage, pageSize, searchTerm, statusParam);
    setPage(newPage);
  };

  /** Change the number of rows per page, resetting to page 1. */
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    const statusParam = selectedStatus !== 'All Status' ? selectedStatus.toUpperCase() : undefined;
    loadEmployees(1, newSize, searchTerm, statusParam);
    setPage(1);
  };

  /** Trigger an employee sync from the external Employee Module via the backend API. */
  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setError('');
    setSuccessMsg('');

    try {
      const result = await triggerEmployeeSync();
      const count = result?.employees || 0;
      setSuccessMsg(`Sync completed! ${count} employee(s) synced from Employee Module.`);
      await loadEmployees(1, pageSize);
      setPage(1);
    } catch (err: any) {
      console.error('Sync failed:', err);
      setError(err?.message || 'Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  /** Export all employees to XLSX. */
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    setError('');
    try {
        const statusParam = selectedStatus !== 'All Status' ? selectedStatus.toUpperCase() : undefined;
        await exportEmployees(searchTerm, statusParam);
    } catch (err: any) {
        console.error('Export failed:', err);
        setError(err?.message || 'Export failed. Please try again.');
    } finally {
        setExporting(false);
    }
  };

  /** Refresh a specific employee's details (e.g. after adding a deduction in the modal). */
  const handleRefreshEmployee = async (id: string) => {
    try {
      const fullEmp = await getEmployeeById(id);
      if (fullEmp && selectedEmployee?.id === id) {
        setSelectedEmployee(fullEmp);
      }
    } catch (err) {
      console.error('Failed to refresh employee details:', err);
    }
  };

  /** Fetch full employee details when the eye icon is clicked. */
  const handleViewEmployee = async (emp: PayrollEmployee) => {
    setSelectedEmployee(emp); // Set basic info immediately for UI responsiveness
    setLoadingDetail(true);
    try {
      const fullEmp = await getEmployeeById(emp.id);
      if (fullEmp) {
        setSelectedEmployee(fullEmp);
      }
    } catch (err) {
      console.error('Failed to fetch full employee details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-10 pb-12 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Personnel Intelligence</h1>
          <p className="text-slate-500 font-medium mt-1">Master directory of records synced from ERP</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={handleSync}
            disabled={syncing || loading}
            variant="secondary"
            className="shadow-lg border-white"
          >
            <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
            {syncing ? 'Synchronizing...' : 'ERP Sync'}
          </Button>
          
          <Button
              onClick={handleExport}
              disabled={exporting}
              variant="secondary"
              className="shadow-lg border-white"
          >
              <Download className="w-4 h-4" /> Export
          </Button>

          <Button className="shadow-brand-900/20">
            <UserPlus className="w-4 h-4" /> Onboard New
          </Button>
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-brand-50 border border-emerald-100 rounded-[2rem] p-5 flex items-center gap-4 shadow-sm"
          >
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-emerald-800 text-sm font-bold">{successMsg}</p>
            <button onClick={() => setSuccessMsg('')} className="ml-auto p-2 hover:bg-white rounded-xl text-emerald-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <p className="text-rose-800 text-sm font-medium">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-rose-600 hover:text-rose-800 text-lg">
            ×
          </button>
        </div>
      )}

      {/* Stats - Bento Row */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Skeleton className="h-32 rounded-[2rem]" />
          <Skeleton className="h-32 rounded-[2rem]" />
          <Skeleton className="h-32 rounded-[2rem]" />
          <Skeleton className="h-32 rounded-[2rem]" />
        </div>
      ) : totalItems > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Strength', value: totalItems, icon: Users, color: 'text-brand-primary', bgColor: 'bg-white/50' },
            { label: 'Active Service', value: employees.filter((e) => e.status?.toUpperCase() === 'ACTIVE').length, icon: Users, color: 'text-brand-secondary', bgColor: 'bg-white/50' },
            { label: 'Business Units', value: new Set(employees.filter((e) => e.departmentName).map((e) => e.departmentName)).size || 0, icon: Building2, color: 'text-blue-500', bgColor: 'bg-white/50' },
            { label: 'Avg Base Pay', value: employees.length > 0 ? `${Math.round(employees.filter((e) => e.basicSalary != null).reduce((acc, e) => acc + Number(e.basicSalary || 0), 0) / employees.filter((e) => e.basicSalary != null).length || 0).toLocaleString()} ETB` : '-', icon: DollarSign, color: 'text-amber-500', bgColor: 'bg-white/50' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn("glass rounded-[2rem] p-6 shadow-xl border-white group hover:-translate-y-1 transition-all duration-300", stat.bgColor)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={cn("w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center ring-1 ring-slate-100 group-hover:scale-110 transition-transform", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight font-mono">{stat.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filters */}
      <EmployeeFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedDept={selectedDept}
        setSelectedDept={setSelectedDept}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        showAdvanced={showAdvanced}
        setShowAdvanced={setShowAdvanced}
        departments={departments}
      />

      {/* Table */}
      <EmployeeTable
        employees={filteredEmployees}
        onViewEmployee={handleViewEmployee}
        loading={loading}
        onSync={totalItems === 0 && !loading ? handleSync : undefined}
        syncing={syncing}
      />

      {/* Pagination */}
      {totalPages > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={handlePageChange}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Detail Modal */}
      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          loading={loadingDetail}
          onClose={() => setSelectedEmployee(null)}
          onRefresh={() => handleRefreshEmployee(selectedEmployee.id)}
          onEdit={(emp) => {
            // Placeholder — navigate to edit form or open edit panel
            console.log('Edit employee:', emp.id);
          }}
        />
      )}
    </div>
  );
};
