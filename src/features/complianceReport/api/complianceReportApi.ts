import { tokenStorage } from "../../../lib/token";

const BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ReportablePeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  runId: string;
  employeeCount: number;
  totalTax: number;
  totalPension: number;
  totalNet: number;
  finalizedAt: string | null;
}

export interface ReportablePeriodsResponse {
  success: boolean;
  data: ReportablePeriod[];
}

export interface JobStatusResponse {
  success: boolean;
  data: {
    jobId: string;
    state: string;
    type: string;
    payrollRunId: string;
    failedReason: string | null;
    processedAt: string | null;
    finishedAt: string | null;
  };
}

export interface EnqueueResponse {
  success: boolean;
  jobId: string | null;
  alreadyGenerated: boolean;
  type: string;
  payrollRunId: string;
}

export interface ExistsResponse {
  success: boolean;
  data: { exists: boolean; runId: string; type: string };
}

// ── Fetch periods ──────────────────────────────────────────────────────────

export async function fetchReportablePeriods(): Promise<ReportablePeriod[]> {
  const token = tokenStorage.getToken();
  const res = await fetch(`${BASE_URL}/reports/periods`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Failed to fetch periods: ${res.status}`);
  const body: ReportablePeriodsResponse = await res.json();
  return body.data;
}

// ── Generate (enqueue BullMQ job) ──────────────────────────────────────────

export async function enqueueGeneration(
  runId: string,
  periodLabel: string,
  type: "tax" | "pension" | "bank",
): Promise<EnqueueResponse> {
  const token = tokenStorage.getToken();
  const res = await fetch(`${BASE_URL}/reports/generate`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payrollRunId: runId, periodLabel, type }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `Generate request failed: ${res.status}`);
  }
  return res.json();
}

// ── Poll job status ─────────────────────────────────────────────────────────

export async function fetchJobStatus(jobId: string): Promise<JobStatusResponse["data"]> {
  const token = tokenStorage.getToken();
  const res = await fetch(`${BASE_URL}/reports/jobs/${jobId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Failed to fetch job status: ${res.status}`);
  const body: JobStatusResponse = await res.json();
  return body.data;
}

// ── Check if report file already exists ─────────────────────────────────────

export async function checkReportExists(
  runId: string,
  type: "tax" | "pension" | "bank",
): Promise<boolean> {
  const token = tokenStorage.getToken();
  const res = await fetch(`${BASE_URL}/reports/generated/${runId}/${type}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Failed to check report: ${res.status}`);
  const body: ExistsResponse = await res.json();
  return body.data.exists;
}

// ── Download URL ───────────────────────────────────────────────────────────

export function getReportDownloadUrl(runId: string, type: string): string {
  return `${BASE_URL}/reports/download/${runId}/${type}`;
}

/** Trigger a pre-generated report download in the browser (proxied through backend). */
export async function downloadGeneratedReport(
  runId: string,
  type: "tax" | "pension" | "bank",
  filename: string,
): Promise<void> {
  const token = tokenStorage.getToken();
  const url = getReportDownloadUrl(runId, type);
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `Download failed: ${res.status}`);
  }

  // Backend proxies the file from Cloudinary — response is the XLSX blob
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}
