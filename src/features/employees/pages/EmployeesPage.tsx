import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Download, UserPlus, RefreshCw, AlertCircle, Users, DollarSign, Building2, ArrowRightLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { EmployeeTable } from '../components/EmployeeTable';
import { EmployeeFilters } from '../components/EmployeeFilters';
import { EmployeeDetailModal } from '../components/EmployeeDetailModal';
import { getEmployees, getEmployeeById, triggerEmployeeSync, type PayrollEmployee, type PaginationMeta } from '../api/employeeApi';
import { Pagination, Skeleton } from '../../../components/ui';
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
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employee Profiles</h1>
          <p className="text-slate-500 text-sm">Manage employee records synced from Employee Module</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <button
              onClick={handleSync}
              disabled={syncing || loading}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg',
                syncing || loading
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-emerald-300 shadow-slate-200/50'
              )}
            >
              <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
              {syncing ? 'Syncing...' : 'Refresh & Sync'}
            </button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
              <Download className="w-4 h-4" /> Export Data
            </button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <button className="px-4 py-2 bg-[#047857] text-white rounded-lg text-sm font-bold hover:bg-[#036246] transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/10">
              <UserPlus className="w-4 h-4" /> Add Employee
            </button>
          </motion.div>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <ArrowRightLeft className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-emerald-800 text-sm font-medium">{successMsg}</p>
          <button onClick={() => setSuccessMsg('')} className="ml-auto text-emerald-600 hover:text-emerald-800 text-lg">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <p className="text-rose-800 text-sm font-medium">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-rose-600 hover:text-rose-800 text-lg">
            ×
          </button>
        </div>
      )}

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : totalItems > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Employees', value: totalItems, icon: Users, color: 'text-slate-400', bgColor: 'bg-white' },
            { label: 'Active', value: employees.filter((e) => e.status?.toUpperCase() === 'ACTIVE').length, icon: Users, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
            { label: 'Departments', value: new Set(employees.filter((e) => e.departmentName).map((e) => e.departmentName)).size || 0, icon: Building2, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { label: 'Avg Basic Salary', value: employees.length > 0 ? `${Math.round(employees.filter((e) => e.basicSalary != null).reduce((acc, e) => acc + Number(e.basicSalary || 0), 0) / employees.filter((e) => e.basicSalary != null).length || 0).toLocaleString()} ETB` : '-', icon: DollarSign, color: 'text-amber-600', bgColor: 'bg-amber-50' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ translateY: -2 }}
              className={cn("border border-slate-200 rounded-2xl p-4 shadow-sm", stat.bgColor)}
            >
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={cn("w-4 h-4", stat.color)} />
                <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1 tracking-tight">{stat.value}</p>
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
