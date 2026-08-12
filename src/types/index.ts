/**
 * SIVI WALLET - TypeScript Types & DTOs
 */

export type WalletType = 'CASH' | 'BANK' | 'E_WALLET';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isGuest: boolean;
  token?: string;
  createdAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  type: WalletType;
  balance: number;
  currency: 'VND';
  accountNumber?: string;
  bankName?: string;
  isActive: boolean;
  icon?: string;
  color?: string;
}

export type CategoryType = 'EXPENSE' | 'INCOME';

export interface Category {
  id: string;
  userId?: string | null;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  isDefault: boolean;
}

export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'SETTLEMENT';

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  walletName?: string;
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  amount: number;
  type: TransactionType;
  note: string;
  date: string; // ISO format string
  destinationWalletId?: string;
  destinationWalletName?: string;
  groupId?: string;
  groupName?: string;
  receiptImageUrl?: string;
  settlementDebtorName?: string;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  name: string;
  isGuest: boolean;
  userId?: string;
  email?: string;
  avatarUrl?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  members: GroupMember[];
  createdAt: string;
}

export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE';

export interface SplitDetail {
  memberId: string;
  memberName: string;
  amount: number;
}

export interface GroupBill {
  id: string;
  groupId: string;
  groupName?: string;
  title: string;
  totalAmount: number;
  payerMemberId: string;
  payerMemberName: string;
  splitType: SplitType;
  splits: SplitDetail[];
  date: string;
  category?: string;
  note?: string;
}

export interface DebtSummary {
  debtorId: string;
  debtorName: string;
  creditorId: string;
  creditorName: string;
  amount: number;
  groupId: string;
  groupName: string;
}

export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
}

export interface ReceiptOCRResult {
  merchantName: string;
  totalAmount: number;
  transactionDate: string;
  category: string;
  paymentMethod: string;
  items: ReceiptItem[];
  confidenceScore?: number;
  rawNotes?: string;
}

export interface NLPParsedTransaction {
  type: TransactionType;
  amount: number;
  note: string;
  category: string;
  walletName: string;
  date: string;
  targetPerson?: string;
  isGroupBill?: boolean;
}

export interface FinancialCoachResponse {
  title: string;
  roastSummary: string;
  score: number; // 0 to 100
  mood: 'ROAST' | 'PRAISE' | 'WARNING';
  actionableTips: string[];
  categoryAlerts: { category: string; text: string }[];
}
