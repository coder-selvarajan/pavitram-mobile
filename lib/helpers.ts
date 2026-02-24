import { Bill, Payment, VendorSummary } from '../types';

/**
 * Format amount as Indian rupee currency: ₹1,23,456
 * Matches web app pattern: '₹' + n.toLocaleString('en-IN')
 */
export function formatCurrency(amount: number): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const formatted = absAmount.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });

  return `${isNegative ? '-' : ''}₹${formatted}`;
}

/**
 * Format date as DD-Mmm-YY (e.g., 05-Nov-24)
 * Matches web app: padStart(2,'0')-Mon-YY
 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const day = d.getDate().toString().padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear().toString().slice(-2);

  return `${day}-${month}-${year}`;
}

/**
 * Calculate vendor summary: paid, outstanding, pendingApproval
 *
 * Web app logic (adapted for Supabase schema):
 * - paid = sum of all payments for the vendor
 * - approvedBills = sum of (amount - discount) for bills with status 'approved' or 'payment_processed'
 * - outstanding = approvedBills - paid
 * - pendingApproval = sum of (amount - discount) for bills with status 'submitted'
 */
export function getVendorSummary(
  bills: Bill[],
  payments: Payment[],
  vendorId: string
): VendorSummary {
  const paid = payments
    .filter((p) => p.vendor_id === vendorId)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const approvedBills = bills
    .filter(
      (b) =>
        (b.status === 'approved' || b.status === 'payment_processed') &&
        b.vendor_id === vendorId
    )
    .reduce((sum, b) => sum + (Number(b.amount) - Number(b.discount)), 0);

  const outstanding = approvedBills - paid;

  const pendingApproval = bills
    .filter((b) => b.status === 'submitted' && b.vendor_id === vendorId)
    .reduce((sum, b) => sum + (Number(b.amount) - Number(b.discount)), 0);

  return { paid, outstanding, pendingApproval };
}

/**
 * Calculate project outstanding total (used in project list).
 * Outstanding = sum(approved + payment_processed bills) - sum(payments)
 */
export function getProjectOutstanding(bills: Bill[], payments: Payment[]): number {
  const totalApproved = bills
    .filter((b) => b.status === 'approved' || b.status === 'payment_processed')
    .reduce((sum, b) => sum + (Number(b.amount) - Number(b.discount)), 0);

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return totalApproved - totalPaid;
}
