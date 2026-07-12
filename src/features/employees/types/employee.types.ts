import { EmployeeStatus, Employee } from '../../../types/api.types';

/**
 * Represents the current state of employee filter controls.
 */
export interface EmployeeFilterState {
  searchTerm: string;
  selectedDept: string;
  selectedStatus: string;
  showAdvanced: boolean;
}
