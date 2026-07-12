import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Extract a short, readable file extension from a filename (e.g. "report.xlsx" → "xlsx"). */
export function getFileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  if (dot === -1) return '';
  return fileName.slice(dot + 1).toLowerCase();
}

/**
 * Format a number as a currency string. Falls back to 'ETB' if no currency symbol is provided.
 *
 * @param amount - The numeric amount to format.
 * @param currency - Optional currency symbol/code (e.g., "ETB", "USD", "EUR"). Defaults to "ETB".
 * @returns The formatted currency string (e.g., "ETB 1,000.00").
 */
/** Default currency code used throughout the app when no currency context is available. */
export const DEFAULT_CURRENCY = 'ETB';

/**
 * Format a number as a currency string.
 *
 * @param amount - The numeric amount to format.
 * @param currency - Optional currency symbol/code (e.g., "ETB", "USD", "EUR"). Defaults to DEFAULT_CURRENCY.
 * @returns The formatted currency string (e.g., "ETB 1,000.00").
 */
export function formatCurrency(amount: number | null | undefined, currency = DEFAULT_CURRENCY): string {
  if (amount == null || isNaN(Number(amount))) return `${currency} 0`;
  return `${currency} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
