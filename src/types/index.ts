/**
 * SIVI WALLET - TypeScript Types & DTOs
 * Flexible definitions supporting string/number IDs and backend/frontend DTO synchronization
 */

export type WalletType = 'CASH' | 'BANK' | 'E_WALLET';

export interface User {
  id: string | number;
  email: string;
  name: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string;
  isGuest?: boolean;
  token?: string;
  createdAt?: string;
}

export interface Wallet {
  id: string;
  userId?: string | number;
  name: string;
  type: WalletType;
  balance: number;
  currency?: 'VND' | string;
  accountNumber?: string;
  bankName?: string;
  isActive?: boolean;
  icon?: string;
  color?: string;
}

export type CategoryType = 'EXPENSE' | 'INCOME';

export interface Category {
  id: string;
  userId?: string | number | null;
  name: string;
  type: CategoryType;
  icon: string;
  color?: string;
  isDefault?: boolean;
}

export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'SETTLEMENT';

export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
}

export interface Transaction {
  id: string;
  userId?: string | number;
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
  items?: ReceiptItem[];
  merchantName?: string;
  userNote?: string;
  createdAt?: string;
}

export interface GroupMember {
  id: string;
  name: string;
  fullName?: string;
  isGuest?: boolean;
  userId?: string | number;
  email?: string;
  avatarUrl?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  members: GroupMember[];
  createdAt?: string;
}

export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE';

export interface SplitDetail {
  memberId: string;
  memberName: string;
  amount: number;
  percent?: number;
}

export interface GroupBill {
  id: string;
  groupId: string;
  groupName?: string;
  title: string;
  totalAmount: number;
  payerMemberId?: string;
  payerId?: string;
  payerMemberName?: string;
  payerName?: string;
  splitType: SplitType;
  splits: SplitDetail[];
  date: string;
  category?: string;
  note?: string;
}

export interface DebtSummary {
  debtorId?: string;
  debtorName: string;
  creditorId?: string;
  creditorName: string;
  amount: number;
  groupId: string;
  groupName: string;
  billDetailId?: string;
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
  splitWith?: string[];
}

export interface FinancialCoachResponse {
  title: string;
  roastSummary: string;
  score: number; // 0 to 100
  mood: 'ROAST' | 'PRAISE' | 'WARNING';
  actionableTips: string[];
  categoryAlerts: { category: string; text: string }[];
}

// --- API DTOs ---
export interface GetTransactionsParams {
  month?: number | 'ALL';
  year?: number | 'ALL';
  walletId?: string;
  type?: TransactionType | 'ALL';
  page?: number;
  limit?: number;
}

export interface CreateWalletDto {
  name: string;
  type: WalletType;
  balance: number;
  accountNumber?: string;
  bankName?: string;
  icon?: string;
  color?: string;
}

export interface TransferWalletDto {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  note?: string;
}

export interface CreateTransactionDto {
  walletId: string;
  walletName?: string;
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  amount: number;
  type: TransactionType;
  note: string;
  date?: string;
  transactionDate?: string;
  sourceType?: string;
  destinationWalletId?: string;
  destinationWalletName?: string;
  groupId?: string;
  groupName?: string;
  receiptImageUrl?: string;
  settlementDebtorName?: string;
  items?: ReceiptItem[];
  merchantName?: string;
  userNote?: string;
}

export interface CreateGroupDto {
  name: string;
  description?: string;
  members?: { name: string; isGuest: boolean; email?: string }[];
}

export interface AddGroupMemberDto {
  name?: string;
  fullName?: string;
  isGuest?: boolean;
  email?: string;
  userId?: string | number;
  role?: string;
}

export interface CreateBillDto {
  groupId: string;
  groupName?: string;
  title: string;
  totalAmount: number;
  payerMemberId?: string;
  payerId?: string;
  payerMemberName?: string;
  payerName?: string;
  splitType: SplitType;
  splits: SplitDetail[];
  date?: string;
  category?: string;
  note?: string;
}

export interface SettleDebtDto {
  billDetailId?: string;
  walletId: string;
  debtorName?: string;
  creditorName?: string;
  amount?: number;
  groupName?: string;
}

export interface LoginDto {
  username?: string;
  email?: string;
  password?: string;
}

export interface RegisterDto {
  username: string;
  fullName?: string;
  email?: string;
  password?: string;
}
