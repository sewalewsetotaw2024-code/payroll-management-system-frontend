/**
 * Ethiopian-style currency formatting (last 3 digits, then 2-digit groups).
 * Matches the backend's Handlebars `formatCurrency` helper.
 *
 * E.g., 159500.00 → "1,59,500.00"
 */

export function formatETB(amount: number | null | undefined): string {
  if (amount == null || isNaN(Number(amount))) return '0.00';

  const n = Math.abs(amount);
  const [intPart, decPart] = n.toFixed(2).split('.');
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  const grouped = rest
    ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`
    : last3;

  return `${amount < 0 ? '-' : ''}${grouped}.${decPart}`;
}

/**
 * Masks all but the last 4 digits of an account number.
 * Matches the backend's `maskAccount` helper.
 */
export function maskAccount(acc: string | null | undefined): string {
  if (!acc || acc.length <= 4) return acc || '';
  return '**** **** **** ' + acc.slice(-4);
}
