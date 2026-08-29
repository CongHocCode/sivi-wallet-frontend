/**
 * SIVI WALLET - Initial Seed Mock Data & LocalStorage Management
 */

import { User, Wallet, Category, Transaction, Group, GroupBill, DebtSummary } from '../types';

export const INITIAL_USER: User = {
  id: 'usr_001',
  name: 'Trần Minh Nam',
  email: 'nam.tran@sivi.vn',
  isGuest: false,
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  createdAt: new Date().toISOString(),
};

export const INITIAL_WALLETS: Wallet[] = [
  {
    id: 'wal_001',
    userId: 'usr_001',
    name: 'Tiền mặt',
    type: 'CASH',
    balance: 1450000,
    currency: 'VND',
    isActive: true,
    icon: 'Banknote',
    color: '#10B981',
  },
  {
    id: 'wal_002',
    userId: 'usr_001',
    name: 'Vietcombank',
    type: 'BANK',
    balance: 18500000,
    currency: 'VND',
    accountNumber: '1012398765',
    bankName: 'VCB Digital',
    isActive: true,
    icon: 'Building2',
    color: '#3B82F6',
  },
  {
    id: 'wal_003',
    userId: 'usr_001',
    name: 'Ví MoMo',
    type: 'E_WALLET',
    balance: 3200000,
    currency: 'VND',
    accountNumber: '0909123456',
    isActive: true,
    icon: 'Smartphone',
    color: '#EC4899',
  },
  {
    id: 'wal_004',
    userId: 'usr_001',
    name: 'Techcombank',
    type: 'BANK',
    balance: 42000000,
    currency: 'VND',
    accountNumber: '1903487123',
    bankName: 'TCB Mobile',
    isActive: true,
    icon: 'Building2',
    color: '#EF4444',
  },
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat_001', name: 'Ăn uống', type: 'EXPENSE', icon: 'UtensilsCrossed', color: '#F59E0B', isDefault: true },
  { id: 'cat_002', name: 'Đi lại & Xe cộ', type: 'EXPENSE', icon: 'Car', color: '#3B82F6', isDefault: true },
  { id: 'cat_003', name: 'Mua sắm', type: 'EXPENSE', icon: 'ShoppingBag', color: '#EC4899', isDefault: true },
  { id: 'cat_004', name: 'Hóa đơn & Tiện ích', type: 'EXPENSE', icon: 'Receipt', color: '#8B5CF6', isDefault: true },
  { id: 'cat_005', name: 'Giải trí & Du lịch', type: 'EXPENSE', icon: 'Sparkles', color: '#10B981', isDefault: true },
  { id: 'cat_006', name: 'Sức khỏe & Y tế', type: 'EXPENSE', icon: 'HeartPulse', color: '#EF4444', isDefault: true },
  { id: 'cat_007', name: 'Lương & Thu nhập', type: 'INCOME', icon: 'Wallet', color: '#10B981', isDefault: true },
  { id: 'cat_008', name: 'Thưởng & Đầu tư', type: 'INCOME', icon: 'TrendingUp', color: '#06B6D4', isDefault: true },
  { id: 'cat_009', name: 'Chuyển khoản', type: 'EXPENSE', icon: 'ArrowRightLeft', color: '#6B7280', isDefault: true },
  { id: 'cat_010', name: 'Thanh toán nợ nhóm', type: 'INCOME', icon: 'CheckCircle2', color: '#10B981', isDefault: true },
];

export const INITIAL_GROUPS: Group[] = [];

export const INITIAL_BILLS: GroupBill[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_001',
    userId: 'usr_001',
    walletId: 'wal_003',
    walletName: 'Ví MoMo',
    categoryId: 'cat_001',
    categoryName: 'Ăn uống',
    categoryIcon: 'UtensilsCrossed',
    amount: 55000,
    type: 'EXPENSE',
    note: 'Ăn sáng phở tái nạm',
    date: '2026-08-11T08:15:00Z',
    createdAt: '2026-08-11T08:15:00Z',
  },
  {
    id: 'tx_002',
    userId: 'usr_001',
    walletId: 'wal_002',
    walletName: 'Vietcombank',
    categoryId: 'cat_007',
    categoryName: 'Lương & Thu nhập',
    categoryIcon: 'Wallet',
    amount: 25000000,
    type: 'INCOME',
    note: 'Nhận lương tháng 8/2026',
    date: '2026-08-05T10:00:00Z',
    createdAt: '2026-08-05T10:00:00Z',
  },
  {
    id: 'tx_003',
    userId: 'usr_001',
    walletId: 'wal_001',
    walletName: 'Tiền mặt',
    categoryId: 'cat_003',
    categoryName: 'Mua sắm',
    categoryIcon: 'ShoppingBag',
    amount: 450000,
    type: 'EXPENSE',
    note: 'Mua sắm đồ dùng cá nhân',
    date: '2026-08-09T18:30:00Z',
    createdAt: '2026-08-09T18:30:00Z',
  },
];

// Helper to clean and format member display name
function cleanMemberName(rawName?: string | null, userId?: string | number | null): string {
  if (!rawName) {
    if (userId !== undefined && userId !== null && userId !== '') {
      if (String(userId) === '1' || String(userId) === 'usr_001') return 'Tôi';
      return `Thành viên #${userId}`;
    }
    return 'Thành viên';
  }
  let clean = String(rawName).trim();
  if (clean.startsWith('name_')) {
    clean = clean.replace(/^name_/, '');
  }
  if (clean.startsWith('gst_')) {
    clean = clean.replace(/^gst_/, '');
  }
  return clean || 'Thành viên';
}

// Helper to calculate debt matrix from group & personal bills
export function calculateDebtMatrix(bills: GroupBill[]): DebtSummary[] {
  const balances: Record<string, { memberId: string; name: string; balance: number; groupId: string; groupName: string }> = {};

  (bills || []).forEach((bill) => {
    const rawPayerId = bill.payerMemberId || bill.payerId;
    const rawPayerName = bill.payerMemberName || bill.payerName;
    const isChiaLe = !bill.groupId || bill.groupId === 'none' || bill.groupId === 'direct_split';
    const groupId = isChiaLe ? 'direct_split' : String(bill.groupId);
    const groupName = bill.groupName || (isChiaLe ? 'Chia lẻ cá nhân' : 'Nhóm');

    // Build normalized split list from either bill.splits or bill.items
    const splitList: { memberId: string; name: string; amount: number; isPaid?: boolean }[] = [];

    if (Array.isArray(bill.splits) && bill.splits.length > 0) {
      bill.splits.forEach((s, idx) => {
        const sName = cleanMemberName(s.memberName, s.memberId);
        splitList.push({
          memberId: String(s.memberId || `spl_${idx}`),
          name: sName,
          amount: Number(s.amount || 0),
        });
      });
    } else if (Array.isArray(bill.items) && bill.items.length > 0) {
      bill.items.forEach((it, idx) => {
        const hasUserId = it.userId !== undefined && it.userId !== null && it.userId !== '';
        const mId = hasUserId
          ? String(it.userId)
          : it.fullName
          ? `name_${it.fullName}`
          : `item_${idx}`;
        
        const mName = cleanMemberName(it.fullName, it.userId);
        
        splitList.push({
          memberId: mId,
          name: mName,
          amount: Number(it.amountShare || 0),
          isPaid: it.isPaid,
        });
      });
    }

    // Determine payer
    let payerId = rawPayerId ? String(rawPayerId) : 'usr_001';
    let payerName = cleanMemberName(rawPayerName, payerId);

    // If payer is identified via isPaid item
    const paidItem = splitList.find((s) => s.isPaid === true);
    if ((!rawPayerName || rawPayerName === 'Tôi') && paidItem && paidItem.name && paidItem.name !== 'Tôi') {
      payerId = paidItem.memberId;
      payerName = paidItem.name;
    }

    splitList.forEach((split) => {
      const memberId = String(split.memberId);
      if (memberId === payerId || split.isPaid === true) return; // Skip if self or already paid

      if (split.amount <= 0) return;

      const keyPayer = `${groupId}:::${payerId}`;
      const keyMember = `${groupId}:::${memberId}`;

      if (!balances[keyPayer]) {
        balances[keyPayer] = { memberId: payerId, name: payerName, balance: 0, groupId: isChiaLe ? '' : (bill.groupId || ''), groupName };
      }
      if (!balances[keyMember]) {
        balances[keyMember] = { memberId, name: split.name, balance: 0, groupId: isChiaLe ? '' : (bill.groupId || ''), groupName };
      }

      balances[keyPayer].balance += split.amount;
      balances[keyMember].balance -= split.amount;
    });
  });

  const debts: DebtSummary[] = [];

  // Convert net balances into pairwise debts
  Object.keys(balances).forEach((key1) => {
    const b1 = balances[key1];
    if (b1.balance <= 0) return; // b1 is owed money (creditor)

    Object.keys(balances).forEach((key2) => {
      const b2 = balances[key2];
      if (b2.groupId !== b1.groupId || b2.balance >= 0) return; // b2 owes money (debtor)

      const debtAmount = Math.min(b1.balance, Math.abs(b2.balance));
      if (debtAmount > 100) {
        const isB2Me = b2.memberId === 'usr_001' || b2.memberId === '1' || b2.name === 'Tôi' || b2.name.includes('(Tôi)');
        const isB1Me = b1.memberId === 'usr_001' || b1.memberId === '1' || b1.name === 'Tôi' || b1.name.includes('(Tôi)');

        const type: 'YOU_OWE' | 'OWES_YOU' = isB2Me ? 'YOU_OWE' : 'OWES_YOU';
        const otherUserId = isB2Me ? b1.memberId : b2.memberId;
        const otherUserName = isB2Me ? b1.name : b2.name;

        debts.push({
          debtorId: b2.memberId,
          debtorName: isB2Me ? 'Tôi' : b2.name || 'Người nợ',
          creditorId: b1.memberId,
          creditorName: isB1Me ? 'Tôi' : b1.name || 'Người nhận',
          otherUserId,
          otherUserName,
          type,
          amount: Math.round(debtAmount),
          groupId: b1.groupId ? b1.groupId : null,
          groupName: b1.groupName || (b1.groupId ? 'Nhóm' : 'Chia lẻ cá nhân'),
        });

        b1.balance -= debtAmount;
        b2.balance += debtAmount;
      }
    });
  });

  return debts;
}
