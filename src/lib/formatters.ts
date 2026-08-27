/**
 * SIVI WALLET - Formatting & Utility Helpers
 */

import { WalletType } from '../types';

/**
 * Safely extract a valid Date object from a transaction or raw date input.
 * Falls back to current Date if missing or invalid, preventing any 'Invalid Date' errors.
 */
export function getTxDate(tx: any): Date {
  if (!tx) return new Date();
  if (tx instanceof Date) {
    return isNaN(tx.getTime()) ? new Date() : tx;
  }
  const raw = typeof tx === 'object' ? (tx.transactionDate || tx.date || tx.createdAt) : tx;
  if (!raw) return new Date();
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Format date nicely to 'dd/MM/yyyy HH:mm' or 'dd/MM/yyyy'
 */
export function formatTxDateTime(txOrDate: any, includeTime = true): string {
  const d = getTxDate(txOrDate);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  if (!includeTime) {
    return `${day}/${month}/${year}`;
  }

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Format number to VND currency display: e.g. 45000 -> "45.000 đ"
 */
export function formatVND(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0 đ';
  }
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('vi-VN').format(absAmount);
  return `${isNegative ? '-' : ''}${formatted} đ`;
}

/**
 * Short VND display format: e.g. 1500000 -> "1,5 triệu đ", 45000 -> "45k đ"
 */
export function formatVNDShort(amount: number): string {
  if (isNaN(amount)) return '0 đ';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(1).replace('.0', '')} tỷ đ`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1).replace('.0', '')} tr đ`;
  }
  if (abs >= 1000) {
    return `${sign}${(abs / 1000).toFixed(0)}k đ`;
  }
  return `${sign}${abs} đ`;
}

/**
 * Format ISO string or Transaction to Vietnamese readable date e.g. "11/08/2026 14:30" or "Hôm nay, 14:30"
 */
export function formatDate(dateOrTx: any): string {
  try {
    const d = getTxDate(dateOrTx);

    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    if (isToday) {
      return `Hôm nay, ${hours}:${minutes}`;
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return formatTxDateTime(dateOrTx);
  }
}

/**
 * Get display label for wallet types
 */
export function getWalletTypeLabel(type: WalletType): string {
  switch (type) {
    case 'CASH':
      return 'Tiền mặt';
    case 'BANK':
      return 'Ngân hàng';
    case 'E_WALLET':
      return 'Ví điện tử';
    default:
      return type;
  }
}

/**
 * Parse money input string in Vietnamese format (e.g. "45k", "1.5tr", "50000") to number
 */
export function parseVNDInput(input: string): number {
  if (!input) return 0;
  let cleaned = input.toLowerCase().trim().replace(/,/g, '.').replace(/\s+/g, '');
  
  if (cleaned.endsWith('k')) {
    const val = parseFloat(cleaned.replace('k', ''));
    return isNaN(val) ? 0 : Math.round(val * 1000);
  }
  if (cleaned.endsWith('tr') || cleaned.endsWith('m')) {
    const val = parseFloat(cleaned.replace(/tr|m/g, ''));
    return isNaN(val) ? 0 : Math.round(val * 1_000_000);
  }
  if (cleaned.endsWith('ty') || cleaned.endsWith('b')) {
    const val = parseFloat(cleaned.replace(/ty|b/g, ''));
    return isNaN(val) ? 0 : Math.round(val * 1_000_000_000);
  }

  // Pure digits or formatted number with dots
  cleaned = cleaned.replace(/\./g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}
