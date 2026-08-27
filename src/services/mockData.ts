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

export const INITIAL_GROUPS: Group[] = [
  {
    id: 'grp_001',
    name: 'Chuyến Đi Đà Lạt 3N2Đ 🌲',
    description: 'Du lịch nhóm bạn thân tháng 8',
    createdAt: '2026-08-01T10:00:00Z',
    members: [
      { id: 'usr_001', name: 'Trần Minh Nam (Tôi)', isGuest: false, userId: 'usr_001' },
      { id: 'm_002', name: 'Nguyễn Văn Hùng', isGuest: true },
      { id: 'm_003', name: 'Lê Thị Lan', isGuest: false, email: 'lan.le@gmail.com' },
      { id: 'm_004', name: 'Tuấn (Bạn Hùng)', isGuest: true },
    ],
  },
  {
    id: 'grp_002',
    name: 'Nhà Trọ 402 🏠',
    description: 'Chia tiền điện, nước, internet hàng tháng',
    createdAt: '2026-07-15T08:00:00Z',
    members: [
      { id: 'usr_001', name: 'Trần Minh Nam (Tôi)', isGuest: false, userId: 'usr_001' },
      { id: 'm_005', name: 'Phạm Nhật Hoàng', isGuest: true },
      { id: 'm_006', name: 'Vũ Anh Khoa', isGuest: false, email: 'khoa.vu@gmail.com' },
    ],
  },
];

export const INITIAL_BILLS: GroupBill[] = [
  {
    id: 'bill_001',
    groupId: 'grp_001',
    groupName: 'Chuyến Đi Đà Lạt 3N2Đ 🌲',
    title: 'Tiền xe khách khứ hồi Sài Gòn - Đà Lạt',
    totalAmount: 1200000,
    payerMemberId: 'usr_001',
    payerMemberName: 'Trần Minh Nam (Tôi)',
    splitType: 'EQUAL',
    category: 'Đi lại & Xe cộ',
    date: '2026-08-02T14:20:00Z',
    splits: [
      { memberId: 'usr_001', memberName: 'Trần Minh Nam (Tôi)', amount: 30000 },
      { memberId: 'm_002', memberName: 'Nguyễn Văn Hùng', amount: 300000 },
      { memberId: 'm_003', memberName: 'Lê Thị Lan', amount: 300000 },
      { memberId: 'm_004', memberName: 'Tuấn (Bạn Hùng)', amount: 300000 },
    ],
  },
  {
    id: 'bill_002',
    groupId: 'grp_001',
    groupName: 'Chuyến Đi Đà Lạt 3N2Đ 🌲',
    title: 'Ăn lẩu gà lá é & Bánh ướt lòng gà',
    totalAmount: 840000,
    payerMemberId: 'm_003',
    payerMemberName: 'Lê Thị Lan',
    splitType: 'EQUAL',
    category: 'Ăn uống',
    date: '2026-08-03T19:30:00Z',
    splits: [
      { memberId: 'usr_001', memberName: 'Trần Minh Nam (Tôi)', amount: 210000 },
      { memberId: 'm_002', memberName: 'Nguyễn Văn Hùng', amount: 210000 },
      { memberId: 'm_003', memberName: 'Lê Thị Lan', amount: 210000 },
      { memberId: 'm_004', memberName: 'Tuấn (Bạn Hùng)', amount: 210000 },
    ],
  },
  {
    id: 'bill_003',
    groupId: 'grp_002',
    groupName: 'Nhà Trọ 402 🏠',
    title: 'Tiền điện nước + Internet T7/2026',
    totalAmount: 1350000,
    payerMemberId: 'usr_001',
    payerMemberName: 'Trần Minh Nam (Tôi)',
    splitType: 'EQUAL',
    category: 'Hóa đơn & Tiện ích',
    date: '2026-08-05T09:00:00Z',
    splits: [
      { memberId: 'usr_001', memberName: 'Trần Minh Nam (Tôi)', amount: 450000 },
      { memberId: 'm_005', memberName: 'Phạm Nhật Hoàng', amount: 450000 },
      { memberId: 'm_006', memberName: 'Vũ Anh Khoa', amount: 450000 },
    ],
  },
];

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
    walletId: 'wal_002',
    walletName: 'Vietcombank',
    categoryId: 'cat_002',
    categoryName: 'Đi lại & Xe cộ',
    categoryIcon: 'Car',
    amount: 300000,
    type: 'EXPENSE',
    note: 'Tiền xe khách khứ hồi (Đà Lạt)',
    groupId: 'grp_001',
    groupName: 'Chuyến Đi Đà Lạt 3N2Đ 🌲',
    date: '2026-08-02T14:20:00Z',
    createdAt: '2026-08-02T14:20:00Z',
  },
  {
    id: 'tx_004',
    userId: 'usr_001',
    walletId: 'wal_001',
    walletName: 'Tiền mặt',
    categoryId: 'cat_003',
    categoryName: 'Mua sắm',
    categoryIcon: 'ShoppingBag',
    amount: 450000,
    type: 'EXPENSE',
    note: 'Mua áo sơ mi công sở Uniqlo',
    date: '2026-08-09T18:30:00Z',
    createdAt: '2026-08-09T18:30:00Z',
  },
  {
    id: 'tx_005',
    userId: 'usr_001',
    walletId: 'wal_003',
    walletName: 'Ví MoMo',
    categoryId: 'cat_010',
    categoryName: 'Thanh toán nợ nhóm',
    categoryIcon: 'CheckCircle2',
    amount: 450000,
    type: 'SETTLEMENT',
    note: 'Hoàng chuyển khoản trả tiền điện nhà trọ',
    settlementDebtorName: 'Phạm Nhật Hoàng',
    date: '2026-08-08T15:00:00Z',
    createdAt: '2026-08-08T15:00:00Z',
  },
];

// Helper to calculate debt matrix from group bills
export function calculateDebtMatrix(bills: GroupBill[]): DebtSummary[] {
  const balances: Record<string, { memberId: string; name: string; balance: number; groupId: string; groupName: string }> = {};

  bills.forEach((bill) => {
    const payerId = String(bill.payerMemberId || bill.payerId || 'usr_001');
    const payerName = bill.payerMemberName || bill.payerName || 'Tôi';
    const groupId = bill.groupId ? String(bill.groupId) : 'direct_split';
    const groupName = bill.groupName || (bill.groupId ? 'Nhóm' : 'Chia lẻ cá nhân');

    (bill.splits || []).forEach((split) => {
      const memberId = String(split.memberId);
      if (memberId === payerId) return; // Self debt offset

      // Payer is owed money (+), split member owes money (-)
      const keyPayer = `${groupId}:::${payerId}`;
      const keyMember = `${groupId}:::${memberId}`;

      if (!balances[keyPayer]) {
        balances[keyPayer] = { memberId: payerId, name: payerName, balance: 0, groupId: bill.groupId || '', groupName };
      }
      if (!balances[keyMember]) {
        balances[keyMember] = { memberId, name: split.memberName, balance: 0, groupId: bill.groupId || '', groupName };
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
        debts.push({
          debtorId: b2.memberId,
          debtorName: b2.name,
          creditorId: b1.memberId,
          creditorName: b1.name,
          amount: Math.round(debtAmount),
          groupId: b1.groupId || null,
          groupName: b1.groupName,
        });

        b1.balance -= debtAmount;
        b2.balance += debtAmount;
      }
    });
  });

  return debts;
}
