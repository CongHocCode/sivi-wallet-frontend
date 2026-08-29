/**
 * SIVI WALLET - Unified Transaction & Debt History View ("Sổ Thu Chi & Sổ Nợ")
 * Harmonized with Natural Tones design theme: #7D8F69, #D98B72, #F1EFE7, #EAE7DC, #2D2926
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  ReceiptText,
  ScanLine,
  AudioLines,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Scale,
  CalendarDays,
  Wallet2,
  SlidersHorizontal,
  Layers,
  CheckCircle2,
  ChevronRight,
  X,
  Users2,
  Check,
  AlertCircle,
  ArrowRight,
  Clock,
  Tag,
  Trash2,
  Split,
} from 'lucide-react';
import { Transaction, Wallet, Category, TransactionType, DebtSummary, Group, GroupBill } from '../types';
import { formatVND, formatVNDShort, getTxDate } from '../lib/formatters';
import { TransactionDetailModal } from './TransactionDetailModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface TransactionHistoryViewProps {
  transactions: Transaction[];
  wallets: Wallet[];
  categories: Category[];
  debts?: DebtSummary[];
  groups?: Group[];
  bills?: GroupBill[];
  initialSubTab?: 'transactions' | 'debts';
  onDeleteTransaction: (id: string) => Promise<void> | void;
  onOpenAddModal?: () => void;
  onOpenOcrModal?: () => void;
  onOpenNlpModal?: () => void;
  onSettleDebt?: (debt: DebtSummary) => void;
  onOpenAddBill?: (groupId?: string) => void;
  onOpenAddGroup?: () => void;
}

export const TransactionHistoryView: React.FC<TransactionHistoryViewProps> = ({
  transactions,
  wallets,
  categories,
  debts = [],
  groups = [],
  bills = [],
  initialSubTab = 'transactions',
  onDeleteTransaction,
  onOpenAddModal,
  onOpenOcrModal,
  onOpenNlpModal,
  onSettleDebt,
  onOpenAddBill,
  onOpenAddGroup,
}) => {
  // Main Sub-Tab: 'transactions' (Sổ Giao Dịch) vs 'debts' (Sổ Nợ)
  const [subTab, setSubTab] = useState<'transactions' | 'debts'>(initialSubTab);

  // Filters for Transactions
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | TransactionType>('ALL');
  
  // Date filters: Year & Month
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Active filters count for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedWalletId !== 'ALL') count++;
    if (selectedType !== 'ALL') count++;
    if (selectedMonth !== 'ALL') count++;
    if (selectedYear !== 'ALL') count++;
    return count;
  }, [selectedWalletId, selectedType, selectedMonth, selectedYear]);

  // Selected transaction for detail modal
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  // Filter for Debts: 'ALL' or specific group
  const [selectedDebtGroupId, setSelectedDebtGroupId] = useState<string>('ALL');

  // Available Years in transactions
  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    transactions.forEach((tx) => {
      try {
        const d = getTxDate(tx);
        const y = d.getFullYear();
        if (!isNaN(y)) years.add(y);
      } catch {}
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions, currentYear]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Type filter
        if (selectedType !== 'ALL' && tx.type !== selectedType) return false;

        // Wallet filter
        if (selectedWalletId !== 'ALL' && tx.walletId !== selectedWalletId && tx.destinationWalletId !== selectedWalletId) {
          return false;
        }

        // Date filter
        try {
          const d = getTxDate(tx);
          if (selectedYear !== 'ALL' && d.getFullYear() !== selectedYear) return false;
          if (selectedMonth !== 'ALL' && d.getMonth() + 1 !== selectedMonth) return false;
        } catch {}

        // Search text
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchesNote = (tx.note || '').toLowerCase().includes(q);
          const matchesMerchant = (tx.merchantName || '').toLowerCase().includes(q);
          const matchesCat = (tx.categoryName || '').toLowerCase().includes(q);
          const matchesWallet = (tx.walletName || '').toLowerCase().includes(q);
          const matchesAmount = tx.amount.toString().includes(q);
          if (!matchesNote && !matchesMerchant && !matchesCat && !matchesWallet && !matchesAmount) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => getTxDate(b).getTime() - getTxDate(a).getTime());
  }, [transactions, selectedType, selectedWalletId, selectedYear, selectedMonth, searchTerm]);

  // Summary statistics for transactions
  const txSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let transfers = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.type === 'INCOME' || tx.type === 'SETTLEMENT') {
        income += tx.amount;
      } else if (tx.type === 'EXPENSE') {
        expense += tx.amount;
      } else if (tx.type === 'TRANSFER') {
        transfers += tx.amount;
      }
    });

    return {
      income,
      expense,
      net: income - expense,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Summary statistics for debts
  const debtSummary = useMemo(() => {
    const totalActiveDebt = (debts || []).reduce((sum, d) => sum + (Number(d?.amount) || 0), 0);
    const personalDebtsCount = (debts || []).filter(
      (d) =>
        !d.groupId ||
        d.groupId === 'none' ||
        d.groupId === 'direct_split' ||
        d.groupId === 'PERSONAL' ||
        d.groupName === 'Chia lẻ cá nhân' ||
        d.groupName === 'Chia lẻ' ||
        !d.groupName
    ).length;

    const filteredDebts = (debts || []).filter((d) => {
      if (selectedDebtGroupId === 'ALL') return true;
      if (selectedDebtGroupId === 'PERSONAL') {
        return (
          !d.groupId ||
          d.groupId === 'none' ||
          d.groupId === 'direct_split' ||
          d.groupId === 'PERSONAL' ||
          d.groupName === 'Chia lẻ cá nhân' ||
          d.groupName === 'Chia lẻ' ||
          !d.groupName
        );
      }
      return String(d.groupId) === String(selectedDebtGroupId);
    });

    return {
      total: totalActiveDebt,
      count: (debts || []).length,
      personalCount: personalDebtsCount,
      filteredDebts,
    };
  }, [debts, selectedDebtGroupId]);

  // Group transactions by date string (YYYY-MM-DD)
  const groupedTransactions = useMemo(() => {
    const groupsMap: { [key: string]: Transaction[] } = {};
    filteredTransactions.forEach((tx) => {
      const d = getTxDate(tx);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      if (!groupsMap[dateKey]) {
        groupsMap[dateKey] = [];
      }
      groupsMap[dateKey].push(tx);
    });
    return groupsMap;
  }, [filteredTransactions]);

  // Format nice header for date group
  const formatDateGroupHeader = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      
      const todayObj = new Date();
      const today = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
      const yesterdayObj = new Date(Date.now() - 86400000);
      const yesterday = `${yesterdayObj.getFullYear()}-${String(yesterdayObj.getMonth() + 1).padStart(2, '0')}-${String(yesterdayObj.getDate()).padStart(2, '0')}`;

      let prefix = '';
      if (dateStr === today) prefix = 'Hôm nay, ';
      else if (dateStr === yesterday) prefix = 'Hôm qua, ';

      const formatted = new Intl.DateTimeFormat('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);

      return prefix + formatted;
    } catch {
      return dateStr;
    }
  };

  const formatTimeOnly = (txOrDate: any) => {
    try {
      const d = getTxDate(txOrDate);
      return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header & Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#F1EFE7] flex items-center justify-center text-[#7D8F69]">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#2D2926] tracking-tight">
              Sổ Thu Chi & Nợ
            </h2>
            <p className="text-xs text-[#8C857D]">
              Quản lý tập trung toàn bộ giao dịch, hóa đơn & công nợ nhóm
            </p>
          </div>
        </div>
      </div>

      {/* Main Segmented Toggle: Sổ Giao Dịch vs Sổ Nợ */}
      <div className="bg-[#F1EFE7] p-1 rounded-2xl flex items-center max-w-md border border-[#EAE7DC]">
        <button
          onClick={() => setSubTab('transactions')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            subTab === 'transactions'
              ? 'bg-white text-[#2D2926] shadow-xs'
              : 'text-[#8C857D] hover:text-[#2D2926]'
          }`}
        >
          <ReceiptText className={`w-4 h-4 ${subTab === 'transactions' ? 'text-[#7D8F69]' : ''}`} />
          <span>Sổ Giao Dịch</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            subTab === 'transactions' ? 'bg-[#F1EFE7] text-[#7D8F69]' : 'bg-[#EAE7DC] text-[#8C857D]'
          }`}>
            {transactions.length}
          </span>
        </button>

        <button
          onClick={() => setSubTab('debts')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 relative ${
            subTab === 'debts'
              ? 'bg-white text-[#2D2926] shadow-xs'
              : 'text-[#8C857D] hover:text-[#2D2926]'
          }`}
        >
          <Scale className={`w-4 h-4 ${subTab === 'debts' ? 'text-[#D98B72]' : ''}`} />
          <span>Sổ Nợ & Tất Toán</span>
          {debts.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D98B72]/15 text-[#D98B72]">
              {debts.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: SỔ GIAO DỊCH (TRANSACTIONS)                     */}
      {/* ========================================================= */}
      {subTab === 'transactions' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Summary Stat Cards - With Mobile Overflow Protection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Expense */}
            <div className="bg-white border border-[#EAE7DC] rounded-2xl p-4 shadow-2xs flex items-center justify-between min-w-0">
              <div className="min-w-0 flex-1 pr-2">
                <span className="text-[11px] font-bold text-[#8C857D] uppercase tracking-wider block truncate">
                  Tổng Chi Tiêu
                </span>
                <p
                  className="text-base sm:text-lg font-black text-[#D98B72] mt-0.5 truncate"
                  title={formatVND(txSummary.expense)}
                >
                  -{formatVND(txSummary.expense)}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#D98B72]/10 text-[#D98B72] flex items-center justify-center shrink-0">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </div>

            {/* Total Income */}
            <div className="bg-white border border-[#EAE7DC] rounded-2xl p-4 shadow-2xs flex items-center justify-between min-w-0">
              <div className="min-w-0 flex-1 pr-2">
                <span className="text-[11px] font-bold text-[#8C857D] uppercase tracking-wider block truncate">
                  Tổng Thu Nhập
                </span>
                <p
                  className="text-base sm:text-lg font-black text-[#7D8F69] mt-0.5 truncate"
                  title={formatVND(txSummary.income)}
                >
                  +{formatVND(txSummary.income)}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#7D8F69]/10 text-[#7D8F69] flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>

            {/* Net Flow */}
            <div className="bg-white border border-[#EAE7DC] rounded-2xl p-4 shadow-2xs flex items-center justify-between min-w-0">
              <div className="min-w-0 flex-1 pr-2">
                <span className="text-[11px] font-bold text-[#8C857D] uppercase tracking-wider block truncate">
                  Dòng Tiền Thuần ({txSummary.count} GD)
                </span>
                <p
                  className={`text-base sm:text-lg font-black mt-0.5 truncate ${
                    txSummary.net >= 0 ? 'text-[#7D8F69]' : 'text-[#D98B72]'
                  }`}
                  title={formatVND(txSummary.net)}
                >
                  {txSummary.net >= 0 ? '+' : ''}
                  {formatVND(txSummary.net)}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#F1EFE7] text-[#4A443F] flex items-center justify-center font-bold text-xs shrink-0">
                {txSummary.count}
              </div>
            </div>
          </div>

          {/* Consolidated Filter Bar */}
          <div className="bg-white border border-[#EAE7DC] rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-[#8C857D] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm nội dung, địa điểm, số tiền..."
                  className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl bg-[#F9F8F3] border border-[#EAE7DC] text-[#2D2926] placeholder:text-[#8C857D] focus:outline-none focus:ring-1.5 focus:ring-[#7D8F69]"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-[#8C857D] hover:text-[#2D2926]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Toggle Button */}
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 shrink-0 ${
                  isFilterOpen || activeFiltersCount > 0
                    ? 'bg-[#7D8F69] text-white border-[#7D8F69] shadow-2xs'
                    : 'bg-[#F9F8F3] text-[#4A443F] border-[#EAE7DC] hover:bg-[#F1EFE7]'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Bộ Lọc</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white text-[#7D8F69] text-[10px] font-black flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {/* Active Filters Bar */}
            {(activeFiltersCount > 0 || searchTerm) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#F9F8F3]">
                <span className="text-[10px] font-bold text-[#8C857D] uppercase tracking-wider">Đang lọc:</span>
                {selectedType !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#F1EFE7] text-[#4A443F] text-[11px] font-bold">
                    {selectedType === 'EXPENSE' && 'Chi tiêu'}
                    {selectedType === 'INCOME' && 'Thu nhập'}
                    {selectedType === 'TRANSFER' && 'Chuyển tiền'}
                    {selectedType === 'SETTLEMENT' && 'Tất toán'}
                    <button onClick={() => setSelectedType('ALL')} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedWalletId !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#F1EFE7] text-[#4A443F] text-[11px] font-bold">
                    Ví: {wallets.find(w => w.id === selectedWalletId)?.name || 'Đã chọn'}
                    <button onClick={() => setSelectedWalletId('ALL')} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedMonth !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#F1EFE7] text-[#4A443F] text-[11px] font-bold">
                    Tháng {selectedMonth}
                    <button onClick={() => setSelectedMonth('ALL')} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedYear !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#F1EFE7] text-[#4A443F] text-[11px] font-bold">
                    Năm {selectedYear}
                    <button onClick={() => setSelectedYear('ALL')} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedWalletId('ALL');
                    setSelectedType('ALL');
                    setSelectedMonth('ALL');
                    setSelectedYear('ALL');
                  }}
                  className="ml-auto text-[11px] font-bold text-[#D98B72] hover:underline"
                >
                  Xóa tất cả
                </button>
              </div>
            )}

            {/* Expandable Filter Details */}
            {isFilterOpen && (
              <div className="pt-2 border-t border-[#EAE7DC] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
                {/* Type Filter */}
                <div>
                  <label className="text-[10px] font-extrabold text-[#8C857D] uppercase block mb-1">Loại Giao Dịch</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                    className="w-full p-2 text-xs font-semibold rounded-xl bg-[#F9F8F3] border border-[#EAE7DC] text-[#2D2926]"
                  >
                    <option value="ALL">Tất cả loại giao dịch</option>
                    <option value="EXPENSE">Chi tiêu</option>
                    <option value="INCOME">Thu nhập</option>
                    <option value="TRANSFER">Chuyển tiền</option>
                    <option value="SETTLEMENT">Tất toán nợ</option>
                  </select>
                </div>

                {/* Wallet Filter */}
                <div>
                  <label className="text-[10px] font-extrabold text-[#8C857D] uppercase block mb-1">Ví Tài Khoản</label>
                  <select
                    value={selectedWalletId}
                    onChange={(e) => setSelectedWalletId(e.target.value)}
                    className="w-full p-2 text-xs font-semibold rounded-xl bg-[#F9F8F3] border border-[#EAE7DC] text-[#2D2926]"
                  >
                    <option value="ALL">Tất cả ví ({wallets.length})</option>
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                {/* Month Filter */}
                <div>
                  <label className="text-[10px] font-extrabold text-[#8C857D] uppercase block mb-1">Tháng</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                    className="w-full p-2 text-xs font-semibold rounded-xl bg-[#F9F8F3] border border-[#EAE7DC] text-[#2D2926]"
                  >
                    <option value="ALL">Tất cả các tháng</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>Tháng {m}</option>
                    ))}
                  </select>
                </div>

                {/* Year Filter */}
                <div>
                  <label className="text-[10px] font-extrabold text-[#8C857D] uppercase block mb-1">Năm</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                    className="w-full p-2 text-xs font-semibold rounded-xl bg-[#F9F8F3] border border-[#EAE7DC] text-[#2D2926]"
                  >
                    <option value="ALL">Tất cả các năm</option>
                    {availableYears.map((y) => (
                      <option key={y} value={y}>Năm {y}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Transactions List */}
          <div className="space-y-4">
            {filteredTransactions.length === 0 ? (
              <div className="bg-white border border-[#EAE7DC] rounded-3xl p-10 text-center text-[#8C857D] space-y-2">
                <ReceiptText className="w-10 h-10 text-[#8C857D]/50 mx-auto" />
                <p className="text-sm font-bold text-[#2D2926]">Không có giao dịch nào phù hợp</p>
                <p className="text-xs">Thử thay đổi bộ lọc hoặc thêm giao dịch mới.</p>
              </div>
            ) : (
              Object.keys(groupedTransactions).map((dateKey) => {
                const dayTxs = groupedTransactions[dateKey];
                const dayExpense = dayTxs
                  .filter((t) => t.type === 'EXPENSE')
                  .reduce((sum, t) => sum + t.amount, 0);
                const dayIncome = dayTxs
                  .filter((t) => t.type === 'INCOME' || t.type === 'SETTLEMENT')
                  .reduce((sum, t) => sum + t.amount, 0);

                return (
                  <div key={dateKey} className="space-y-1.5">
                    {/* Date Group Header */}
                    <div className="flex items-center justify-between px-2 text-xs">
                      <span className="font-bold text-[#4A443F]">
                        {formatDateGroupHeader(dateKey)}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-[#8C857D]">
                        {dayIncome > 0 && <span className="text-[#7D8F69]">+{formatVND(dayIncome)}</span>}
                        {dayExpense > 0 && <span className="text-[#D98B72]">-{formatVND(dayExpense)}</span>}
                      </div>
                    </div>

                    {/* Cards in this Date Group */}
                    <div className="bg-white border border-[#EAE7DC] rounded-2xl divide-y divide-[#F1EFE7] overflow-hidden shadow-2xs">
                      {dayTxs.map((tx) => {
                        const isOCR = !!tx.receiptImageUrl || tx.note.toLowerCase().includes('[quét hóa đơn]') || !!tx.merchantName;
                        const isVoice = tx.note.toLowerCase().includes('[ai voice]') || tx.note.toLowerCase().includes('[nlp]');

                        // Clean styling for icon badge
                        let iconBg = 'bg-[#D98B72]/10 text-[#D98B72]';
                        let IconComponent = ArrowDownRight;

                        if (tx.type === 'INCOME') {
                          iconBg = 'bg-[#7D8F69]/10 text-[#7D8F69]';
                          IconComponent = ArrowUpRight;
                        } else if (tx.type === 'TRANSFER') {
                          iconBg = 'bg-[#F1EFE7] text-[#4A443F]';
                          IconComponent = ArrowLeftRight;
                        } else if (tx.type === 'SETTLEMENT') {
                          iconBg = 'bg-[#7D8F69]/15 text-[#7D8F69]';
                          IconComponent = CheckCircle2;
                        }

                        return (
                          <div
                            key={tx.id}
                            onClick={() => setSelectedTxForDetail(tx)}
                            className="p-3 sm:p-3.5 flex items-center justify-between gap-2.5 sm:gap-3 hover:bg-[#F9F8F3] transition cursor-pointer group"
                          >
                            {/* Left: Icon & Description with min-w-0 to prevent layout distortion */}
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${iconBg}`}>
                                <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
                              </div>

                              <div className="min-w-0 flex-1 space-y-0.5">
                                {/* Merchant / Note preview */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-xs sm:text-sm font-bold text-[#2D2926] truncate max-w-full">
                                    {tx.merchantName || tx.note || tx.categoryName || 'Giao dịch'}
                                  </p>

                                  {/* AI / Voice / OCR Badges */}
                                  {isOCR && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#F1EFE7] text-[#7D8F69] border border-[#EAE7DC] shrink-0">
                                      <ScanLine className="w-2.5 h-2.5" /> Hóa đơn
                                    </span>
                                  )}
                                  {isVoice && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#F1EFE7] text-[#D98B72] border border-[#EAE7DC] shrink-0">
                                      <AudioLines className="w-2.5 h-2.5" /> Giọng nói
                                    </span>
                                  )}
                                </div>

                                {/* Tags: Wallet, Category, Time */}
                                <div className="flex items-center gap-1.5 text-[11px] text-[#8C857D] truncate">
                                  <span className="shrink-0">{formatTimeOnly(tx)}</span>
                                  <span>•</span>
                                  <span className="font-semibold text-[#4A443F] truncate">
                                    {tx.walletName || 'Ví chính'}
                                  </span>
                                  {tx.categoryName && (
                                    <>
                                      <span>•</span>
                                      <span className="truncate">{tx.categoryName}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Amount & Details chevron - strictly bounded */}
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 text-right">
                              <div className="min-w-[85px] sm:min-w-[110px] text-right">
                                <p
                                  className={`text-xs sm:text-sm font-black whitespace-nowrap ${
                                    tx.type === 'EXPENSE'
                                      ? 'text-[#D98B72]'
                                      : tx.type === 'INCOME' || tx.type === 'SETTLEMENT'
                                      ? 'text-[#7D8F69]'
                                      : 'text-[#4A443F]'
                                  }`}
                                  title={formatVND(tx.amount)}
                                >
                                  {tx.type === 'EXPENSE'
                                    ? '-'
                                    : tx.type === 'INCOME' || tx.type === 'SETTLEMENT'
                                    ? '+'
                                    : ''}
                                  {formatVND(tx.amount)}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTxToDelete(tx);
                                }}
                                className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-[#8C857D] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer shrink-0"
                                title="Xóa giao dịch"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <ChevronRight className="w-4 h-4 text-[#8C857D] group-hover:text-[#2D2926] group-hover:translate-x-0.5 transition shrink-0" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Action Bar for Sổ Giao Dịch (Quét, Nói, Ghi giao dịch) - Hidden on mobile as floating '+' button already exists */}
          <div className="pt-2 pb-1 sticky bottom-4 z-20 hidden sm:block">
            <div className="bg-white/95 backdrop-blur-md border border-[#EAE7DC] rounded-2xl p-2 shadow-lg shadow-black/5 flex items-center justify-between gap-2 max-w-md mx-auto">
              {onOpenOcrModal && (
                <button
                  type="button"
                  onClick={onOpenOcrModal}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#F1EFE7] hover:bg-[#EAE7DC] text-[#4A443F] text-xs font-bold transition flex items-center justify-center gap-1.5 border border-[#EAE7DC] shadow-2xs"
                  title="Quét hóa đơn qua Camera/OCR"
                >
                  <ScanLine className="w-4 h-4 text-[#7D8F69]" />
                  <span className="truncate">Quét Hóa Đơn</span>
                </button>
              )}
              {onOpenNlpModal && (
                <button
                  type="button"
                  onClick={onOpenNlpModal}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#F1EFE7] hover:bg-[#EAE7DC] text-[#4A443F] text-xs font-bold transition flex items-center justify-center gap-1.5 border border-[#EAE7DC] shadow-2xs"
                  title="Ghi chép nhanh bằng giọng nói hoặc văn bản tự nhiên"
                >
                  <AudioLines className="w-4 h-4 text-[#D98B72]" />
                  <span className="truncate">Giọng Nói</span>
                </button>
              )}
              {onOpenAddModal && (
                <button
                  type="button"
                  onClick={onOpenAddModal}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#7D8F69] hover:bg-[#687856] text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                  title="Ghi giao dịch thủ công"
                >
                  <Plus className="w-4 h-4" />
                  <span className="truncate">Ghi Giao Dịch</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: SỔ NỢ & TẤT TOÁN (DEBTS & SETTLEMENTS)         */}
      {/* ========================================================= */}
      {subTab === 'debts' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Debt Summary Banner */}
          <div className="bg-white border border-[#EAE7DC] rounded-3xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-[#8C857D] uppercase tracking-wider block">
                Tổng Công Nợ Đang Treo
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#D98B72] mt-0.5">
                {formatVND(debtSummary.total)}
              </h3>
              <p className="text-xs text-[#8C857D] mt-1">
                {debtSummary.count === 0
                  ? 'Tất cả các nhóm đều đã sòng phẳng.'
                  : `Hiện có ${debtSummary.count} khoản nợ cần thanh toán.`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onOpenAddBill && (
                <button
                  onClick={() => onOpenAddBill()}
                  className="px-3.5 py-2 bg-[#F1EFE7] hover:bg-[#EAE7DC] text-[#2D2926] rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-[#EAE7DC]"
                >
                  <Plus className="w-4 h-4 text-[#D98B72]" /> Thêm Kèo Chi
                </button>
              )}
              {onOpenAddGroup && (
                <button
                  onClick={onOpenAddGroup}
                  className="px-3.5 py-2 bg-[#7D8F69] hover:bg-[#687856] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Users2 className="w-4 h-4" /> Tạo Nhóm
                </button>
              )}
            </div>
          </div>

          {/* Group & Chia Lẻ Filter for Debts */}
          {((debts && debts.length > 0) || groups.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedDebtGroupId('ALL')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                  selectedDebtGroupId === 'ALL'
                    ? 'bg-[#7D8F69] text-white shadow-2xs'
                    : 'bg-[#F1EFE7] text-[#8C857D] hover:text-[#2D2926]'
                }`}
              >
                Tất cả ({debtSummary.count})
              </button>

              {debtSummary.personalCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDebtGroupId('PERSONAL')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
                    selectedDebtGroupId === 'PERSONAL'
                      ? 'bg-[#D98B72] text-white shadow-2xs'
                      : 'bg-[#F1EFE7] text-[#8C857D] hover:text-[#2D2926]'
                  }`}
                >
                  <Split className="w-3.5 h-3.5" />
                  <span>Chia lẻ cá nhân</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                      selectedDebtGroupId === 'PERSONAL'
                        ? 'bg-white/20 text-white'
                        : 'bg-[#D98B72]/15 text-[#D98B72]'
                    }`}
                  >
                    {debtSummary.personalCount}
                  </span>
                </button>
              )}

              {groups.map((g) => {
                const count = (debts || []).filter((d) => String(d.groupId) === String(g.id)).length;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedDebtGroupId(g.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
                      selectedDebtGroupId === g.id
                        ? 'bg-[#7D8F69] text-white shadow-2xs'
                        : 'bg-[#F1EFE7] text-[#8C857D] hover:text-[#2D2926]'
                    }`}
                  >
                    <span>{g.name}</span>
                    {count > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                          selectedDebtGroupId === g.id
                            ? 'bg-white/20 text-white'
                            : 'bg-[#D98B72]/15 text-[#D98B72]'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Debts List */}
          <div className="space-y-3">
            {debtSummary.filteredDebts.length === 0 ? (
              <div className="bg-white border border-[#EAE7DC] rounded-3xl p-12 text-center text-[#8C857D] space-y-2">
                <CheckCircle2 className="w-12 h-12 text-[#7D8F69] mx-auto" />
                <p className="text-sm font-bold text-[#2D2926]">Sạch nợ! Không còn khoản nào cần thanh toán.</p>
                <p className="text-xs">
                  {selectedDebtGroupId === 'PERSONAL'
                    ? 'Không có khoản nợ chia lẻ cá nhân nào đang chờ thanh toán.'
                    : selectedDebtGroupId !== 'ALL'
                    ? 'Nhóm này đã thanh toán sòng phẳng.'
                    : 'Tất cả các khoản chia tiền đều đã sòng phẳng.'}
                </p>
              </div>
            ) : (
              debtSummary.filteredDebts.map((d, idx) => {
                const isChiaLe =
                  !d.groupId ||
                  d.groupId === 'none' ||
                  d.groupId === 'direct_split' ||
                  d.groupId === 'PERSONAL' ||
                  d.groupName === 'Chia lẻ cá nhân' ||
                  d.groupName === 'Chia lẻ' ||
                  !d.groupName;

                // Helper to format clean real name
                const cleanPersonName = (raw?: string | null) => {
                  if (!raw) return '';
                  let res = String(raw).trim();
                  if (res.startsWith('name_')) res = res.replace(/^name_/, '');
                  if (res.startsWith('gst_')) res = res.replace(/^gst_/, '');
                  return res;
                };

                const otherName =
                  cleanPersonName(d.otherUserName) ||
                  (d.type === 'YOU_OWE'
                    ? cleanPersonName(d.creditorName)
                    : cleanPersonName(d.debtorName)) ||
                  'Bạn bè';

                const isYouOwe =
                  d.type === 'YOU_OWE' ||
                  (!d.type && (d.debtorName === 'Tôi' || d.debtorName?.includes('(Tôi)')));

                // Strict render matching prompt:
                // If debt.type === 'YOU_OWE': "Bạn (Tôi) phải trả cho [debt.otherUserName]"
                // If debt.type === 'OWES_YOU': "[debt.otherUserName] phải trả cho Bạn (Tôi)"
                const debtorDisplay = isYouOwe ? 'Bạn (Tôi)' : otherName;
                const creditorDisplay = isYouOwe ? otherName : 'Bạn (Tôi)';

                return (
                  <div
                    key={idx}
                    className="bg-white border border-[#EAE7DC] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:border-[#7D8F69] transition"
                  >
                    {/* Left: Debtor and Creditor Flow */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          isChiaLe ? 'bg-[#D98B72]/10 text-[#D98B72]' : 'bg-[#7D8F69]/10 text-[#7D8F69]'
                        }`}
                      >
                        {isChiaLe ? 'LẺ' : 'NHÓM'}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-bold text-[#2D2926] flex items-center gap-1.5 flex-wrap">
                          <span className="text-[#D98B72] font-black">{debtorDisplay}</span>
                          <span className="text-[#8C857D] font-normal text-xs">phải trả cho</span>
                          <span className="text-[#7D8F69] font-black">{creditorDisplay}</span>
                        </p>
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {isChiaLe ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FAF9F5] text-[#8C857D] text-[11px] font-semibold border border-[#EAE7DC]">
                              <Split className="w-3 h-3 text-[#D98B72]" /> Kèo chia lẻ cá nhân
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#7D8F69]/10 text-[#5F6E4E] text-[11px] font-semibold">
                              <Users2 className="w-3 h-3 text-[#7D8F69]" /> Nhóm: {d.groupName || 'Nhóm chung'}
                            </span>
                          )}
                          {isYouOwe ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600 text-[10.5px] font-bold border border-rose-200">
                              Bạn cần trả
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10.5px] font-bold border border-emerald-200">
                              Bạn cần thu
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Action Button */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F9F8F3]">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-[#8C857D] uppercase font-bold block sm:hidden">
                          Số tiền:
                        </span>
                        <span
                          className={`text-base sm:text-lg font-black whitespace-nowrap ${
                            isYouOwe ? 'text-[#D98B72]' : 'text-[#7D8F69]'
                          }`}
                          title={formatVND(d.amount)}
                        >
                          {formatVND(d.amount)}
                        </span>
                      </div>

                      {onSettleDebt && (
                        <button
                          type="button"
                          onClick={() => onSettleDebt(d)}
                          className="px-4 py-2 bg-[#7D8F69] hover:bg-[#687856] text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5 shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" /> Tất Toán Ngay
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        isOpen={!!selectedTxForDetail}
        onClose={() => setSelectedTxForDetail(null)}
        transaction={selectedTxForDetail}
        wallets={wallets}
        categories={categories}
        onDelete={async (id) => {
          await onDeleteTransaction(id);
          setSelectedTxForDetail(null);
        }}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!txToDelete}
        transaction={txToDelete}
        onClose={() => setTxToDelete(null)}
        onConfirm={async (id) => {
          await onDeleteTransaction(id);
          setTxToDelete(null);
        }}
      />
    </div>
  );
};
