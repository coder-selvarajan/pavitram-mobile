import { Bill, Payment, VendorSummary, SalesBill, SalesPayment, CustomerSummary } from '../types';

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
 * Format date as DD/MM/YYYY (e.g., 05/11/2024)
 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Calculate vendor summary: paid, outstanding, pendingApproval
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
 * Calculate customer summary: paid, outstanding, pendingApproval (for sales)
 */
export function getCustomerSummary(
  bills: SalesBill[],
  payments: SalesPayment[],
  customerId: string
): CustomerSummary {
  const paid = payments
    .filter((p) => p.customer_id === customerId)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const approvedBills = bills
    .filter(
      (b) =>
        (b.status === 'approved' || b.status === 'payment_processed') &&
        b.customer_id === customerId
    )
    .reduce((sum, b) => sum + (Number(b.amount) - Number(b.discount)), 0);

  const outstanding = approvedBills - paid;

  const pendingApproval = bills
    .filter((b) => b.status === 'submitted' && b.customer_id === customerId)
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

/**
 * Calculate project sales outstanding total.
 * Outstanding = sum(approved + payment_processed sales bills) - sum(sales payments)
 */
export function getProjectSalesOutstanding(bills: SalesBill[], payments: SalesPayment[]): number {
  const totalApproved = bills
    .filter((b) => b.status === 'approved' || b.status === 'payment_processed')
    .reduce((sum, b) => sum + (Number(b.amount) - Number(b.discount)), 0);

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return totalApproved - totalPaid;
}
