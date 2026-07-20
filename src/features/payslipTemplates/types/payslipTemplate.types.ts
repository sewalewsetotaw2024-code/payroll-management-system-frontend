export interface PayslipTemplate {
  id: string;
  companyId: number;
  name: string;
  companyLogo: string | null;
  templateUrl: string | null;
  language: string;
  customFields: Record<string, any> | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratePayslipResult {
  pdfUrl: string;
  payslipId: string;
  employeeName: string;
}

export interface BatchGenerateResult {
  total: number;
  succeeded: number;
  failed: number;
  pdfs: Array<{
    employeeName: string;
    pdfUrl: string;
    error?: string;
  }>;
}
