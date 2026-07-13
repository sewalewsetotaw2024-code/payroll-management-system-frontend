import { tokenStorage } from "../../../lib/token";

const BASE_URL = import.meta.env.VITE_API_URL || 'https://payroll-management-system-backend-d2y9.onrender.com/api/v1';

/**
 * Downloads the Excel payment export for a run via fetch with auth header.
 * Creates a blob URL and triggers browser download.
 */
export async function downloadPaymentExcel(runId: string): Promise<void> {
  const token = tokenStorage.getToken();
  const res = await fetch(`${BASE_URL}/payment-export/${runId}/excel`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `payment-run-${runId.slice(0, 8)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads the CSV payment export for a run via fetch with auth header.
 */
export async function downloadPaymentCsv(runId: string): Promise<void> {
  const token = tokenStorage.getToken();
  const res = await fetch(`${BASE_URL}/payment-export/${runId}/csv`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `payment-run-${runId.slice(0, 8)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
