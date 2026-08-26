/**
 * SIVI WALLET - Full Transaction History View ("Sổ Giao Dịch")
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Wallet as WalletIcon,
  Tag,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  CheckCircle2,
  Camera,
  Mic,
  Trash2,
  Sparkles,
  Receipt,
  Download,
  Plus,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { Transaction, Wallet, Category, TransactionType } from '../types';
import { formatVND, formatVNDShort } from '../lib/formatters';
import { TransactionDetailModal } from './TransactionDetailModal';

interface TransactionHistoryViewProps {
  transactions: Transaction[];
  wallets: Wallet[];
  categories: Category[];
  onDeleteTransaction: (id: string) => Promise<void> | void;
  onOpenAddModal?: () => void;
  onOpenOcrModal?: () => void;
  onOpenNlpModal?: () => void;
}

export const TransactionHistoryView: React.FC<TransactionHistoryViewProps> = ({
  transactions,
  wallets,
  categories,
  onDeleteTransaction,
  onOpenAddModal,
  onOpenOcrModal,
  onOpenNlpModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | TransactionType>('ALL');
  
  // Date filters: Year & Month
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-indexed

  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>('ALL');

  // Selected transaction for detail modal
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);

  // Available Years in transactions
  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    transactions.forEach((tx) => {
      try {
        const y = new Date(tx.date).getFullYear();
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
          const d = new Date(tx.date);
          if (selectedYear !== 'ALL' && d.getFullYear() !== selectedYear) return false;
          if (selectedMonth !== 'ALL' && d.getMonth() + 1 !== selectedMonth) return false;
        } catch {}

        // Search text
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchesNote = tx.note.toLowerCase().includes(q);
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
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedType, selectedWalletId, selectedYear, selectedMonth, searchTerm]);

  // Summary statistics for the filtered transactions
  const summary = useMemo(() => {
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

  // Group transactions by date string (YYYY-MM-DD)
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    filteredTransactions.forEach((tx) => {
      const dateKey = tx.date ? tx.date.split('T')[0] : 'Không rõ ngày';
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tx);
    });
    return groups;
  }, [filteredTransactions]);

  // Format nice header for date group
  const formatDateGroupHeader = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      let prefix = '';
      if (dateStr === today) prefix = 'Hôm nay, ';
      else if (dateStr === yesterday) prefix = 'Hôm qua, ';

      const formatted = new Intl.DateTimeFormat('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);

      return prefix + formatted;
    } catch {
      return dateStr;
    }
  };

  const formatTimeOnly = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return '';
    }
  };

  // Helper for category icons
  const getCategoryColor = (tx: Transaction) => {
    if (tx.type === 'EXPENSE') return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400';
    if (tx.type === 'INCOME' || tx.type === 'SETTLEMENT') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400';
    return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#2D2926] dark:text-white flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-[#7D8F69]" /> Sổ Giao Dịch
          </h2>
          <p className="text-xs text-[#8C857D] dark:text-slate-400 mt-0.5">
            Toàn bộ lịch sử chi tiêu, thu nhập & giao dịch từ AI Scanner
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenOcrModal && (
            <button
              onClick={onOpenOcrModal}
              className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Camera className="w-4 h-4" /> 📸 Quét Hóa Đơn
            </button>
          )}
          {onOpenNlpModal && (
            <button
              onClick={onOpenNlpModal}
              className="px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Mic className="w-4 h-4" /> 🗣️ Nhập Giọng Nói
            </button>
          )}
          {onOpenAddModal && (
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2 rounded-xl bg-[#7D8F69] hover:bg-[#687856] text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Thêm Giao Dịch
            </button>
          )}
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Expense */}
        <div className="bg-white dark:bg-slate-900 border border-[#EAE7DC] dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#8C857D] uppercase tracking-wider block">
              Tổng Chi Tiêu
            </span>
            <p className="text-xl font-black text-[#D98B72] dark:text-rose-400 mt-0.5">
              -{formatVND(summary.expense)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Total Income */}
        <div className="bg-white dark:bg-slate-900 border border-[#EAE7DC] dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#8C857D] uppercase tracking-wider block">
              Tổng Thu Nhập
            </span>
            <p className="text-xl font-black text-[#7D8F69] dark:text-emerald-400 mt-0.5">
              +{formatVND(summary.income)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-[#7D8F69] dark:text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Net Flow */}
        <div className="bg-white dark:bg-slate-900 border border-[#EAE7DC] dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#8C857D] uppercase tracking-wider block">
              Dòng Tiền Thuần ({summary.count} GD)
            </span>
            <p
              className={`text-xl font-black mt-0.5 ${
                summary.net >= 0 ? 'text-[#7D8F69] dark:text-emerald-400' : 'text-[#D98B72] dark:text-rose-400'
              }`}
            >
              {summary.net >= 0 ? '+' : ''}
              {formatVND(summary.net)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F1EFE7] dark:bg-slate-800 text-[#4A443F] dark:text-slate-300 flex items-center justify-center font-bold text-xs">
            {summary.count}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-[#EAE7DC] dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-[#8C857D] absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo ghi chú, quán ăn, danh mục..."
              className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl bg-[#F9F8F3] dark:bg-slate-800 border border-[#EAE7DC] dark:border-slate-700 text-[#2D2926] dark:text-white placeholder:text-[#8C857D] focus:outline-none focus:ring-2 focus:ring-[#7D8F69]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Month Selector */}
          <div className="lg:col-span-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="w-full p-2 text-xs font-semibold rounded-xl bg-[#F9F8F3] dark:bg-slate-800 border border-[#EAE7DC] dark:border-slate-700 text-[#2D2926] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#7D8F69]"
            >
              <option value="ALL">Tất cả các tháng</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div className="lg:col-span-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="w-full p-2 text-xs font-semibold rounded-xl bg-[#F9F8F3] dark:bg-slate-800 border border-[#EAE7DC] dark:border-slate-700 text-[#2D2926] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#7D8F69]"
            >
              <option value="ALL">Tất cả các năm</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
          </div>

          {/* Wallet Selector */}
          <div className="lg:col-span-2">
            <select
              value={selectedWalletId}
              onChange={(e) => setSelectedWalletId(e.target.value)}
              className="w-full p-2 text-xs font-semibold rounded-xl bg-[#F9F8F3] dark:bg-slate-800 border border-[#EAE7DC] dark:border-slate-700 text-[#2D2926] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#7D8F69]"
            >
              <option value="ALL">Tất cả ví ({wallets.length})</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatVNDShort(w.balance)})
                </option>
              ))}
            </select>
          </div>

          {/* Transaction Type Filter Tabs */}
          <div className="lg:col-span-2 flex items-center justify-end">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full p-2 text-xs font-semibold rounded-xl bg-[#F9F8F3] dark:bg-slate-800 border border-[#EAE7DC] dark:border-slate-700 text-[#2D2926] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#7D8F69]"
            >
              <option value="ALL">Tất cả loại GD</option>
              <option value="EXPENSE">💸 Chi tiêu</option>
              <option value="INCOME">💰 Thu nhập</option>
              <option value="TRANSFER">↔ Chuyển khoản</option>
              <option value="SETTLEMENT">🤝 Tất toán nợ</option>
            </select>
          </div>
        </div>

        {/* Quick Type Filter Chips */}
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition whitespace-nowrap ${
              selectedType === 'ALL'
                ? 'bg-[#7D8F69] text-white shadow-sm'
                : 'bg-[#F1EFE7] dark:bg-slate-800 text-[#8C857D] hover:text-[#2D2926]'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setSelectedType('EXPENSE')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition whitespace-nowrap ${
              selectedType === 'EXPENSE'
                ? 'bg-[#D98B72] text-white shadow-sm'
                : 'bg-[#F1EFE7] dark:bg-slate-800 text-[#8C857D] hover:text-[#2D2926]'
            }`}
          >
            💸 Chi tiêu
          </button>
          <button
            onClick={() => setSelectedType('INCOME')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition whitespace-nowrap ${
              selectedType === 'INCOME'
                ? 'bg-[#7D8F69] text-white shadow-sm'
                : 'bg-[#F1EFE7] dark:bg-slate-800 text-[#8C857D] hover:text-[#2D2926]'
            }`}
          >
            💰 Thu nhập
          </button>
          <button
            onClick={() => setSelectedType('TRANSFER')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition whitespace-nowrap ${
              selectedType === 'TRANSFER'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-[#F1EFE7] dark:bg-slate-800 text-[#8C857D] hover:text-[#2D2926]'
            }`}
          >
            ↔ Chuyển tiền
          </button>
          <button
            onClick={() => setSelectedType('SETTLEMENT')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition whitespace-nowrap ${
              selectedType === 'SETTLEMENT'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-[#F1EFE7] dark:bg-slate-800 text-[#8C857D] hover:text-[#2D2926]'
            }`}
          >
            🤝 Tất toán
          </button>

          {(searchTerm || selectedWalletId !== 'ALL' || selectedType !== 'ALL' || selectedMonth !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedWalletId('ALL');
                setSelectedType('ALL');
                setSelectedMonth('ALL');
                setSelectedYear(currentYear);
              }}
              className="ml-auto px-2.5 py-1 text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1 shrink-0"
            >
              <X className="w-3.5 h-3.5" /> Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-6">
        {filteredTransactions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-[#EAE7DC] dark:border-slate-800 rounded-3xl p-12 text-center text-[#8C857D] space-y-3">
            <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-sm font-bold text-[#2D2926] dark:text-white">Không tìm thấy giao dịch nào phù hợp</p>
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
              <div key={dateKey} className="space-y-2">
                {/* Date Group Header */}
                <div className="flex items-center justify-between px-2 text-xs">
                  <span className="font-bold text-[#4A443F] dark:text-slate-300">
                    {formatDateGroupHeader(dateKey)}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-[#8C857D]">
                    {dayIncome > 0 && <span className="text-[#7D8F69]">+{formatVND(dayIncome)}</span>}
                    {dayExpense > 0 && <span className="text-[#D98B72]">-{formatVND(dayExpense)}</span>}
                  </div>
                </div>

                {/* Cards in this Date Group */}
                <div className="bg-white dark:bg-slate-900 border border-[#EAE7DC] dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
                  {dayTxs.map((tx) => {
                    const isOCR = !!tx.receiptImageUrl || tx.note.toLowerCase().includes('[quét hóa đơn]') || !!tx.merchantName;
                    const isVoice = tx.note.toLowerCase().includes('[ai voice]') || tx.note.toLowerCase().includes('[nlp]');

                    return (
                      <div
                        key={tx.id}
                        onClick={() => setSelectedTxForDetail(tx)}
                        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-[#F9F8F3] dark:hover:bg-slate-800/60 transition cursor-pointer group"
                      >
                        {/* Left: Icon & Description */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${getCategoryColor(
                              tx
                            )}`}
                          >
                            {tx.type === 'TRANSFER' ? (
                              <ArrowRightLeft className="w-5 h-5" />
                            ) : tx.type === 'SETTLEMENT' ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <Tag className="w-5 h-5" />
                            )}
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            {/* Merchant / Note preview */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs sm:text-sm font-bold text-[#2D2926] dark:text-white truncate">
                                {tx.merchantName || tx.note || tx.categoryName || 'Giao dịch'}
                              </p>

                              {/* AI Badges */}
                              {isOCR && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                  <Camera className="w-2.5 h-2.5" /> OCR
                                </span>
                              )}
                              {isVoice && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                                  <Mic className="w-2.5 h-2.5" /> AI
                                </span>
                              )}
                            </div>

                            {/* Tags: Wallet, Category, Time */}
                            <div className="flex items-center gap-2 text-[11px] text-[#8C857D] dark:text-slate-400">
                              <span>{formatTimeOnly(tx.date)}</span>
                              <span>•</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {tx.walletName || 'Ví mặc định'}
                              </span>
                              {tx.categoryName && (
                                <>
                                  <span>•</span>
                                  <span>{tx.categoryName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Amount & Details arrow */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <p
                              className={`text-xs sm:text-sm font-black ${
                                tx.type === 'EXPENSE'
                                  ? 'text-[#D98B72] dark:text-rose-400'
                                  : tx.type === 'INCOME' || tx.type === 'SETTLEMENT'
                                  ? 'text-[#7D8F69] dark:text-emerald-400'
                                  : 'text-blue-600 dark:text-blue-400'
                              }`}
                            >
                              {tx.type === 'EXPENSE'
                                ? '-'
                                : tx.type === 'INCOME' || tx.type === 'SETTLEMENT'
                                ? '+'
                                : '↔ '}
                              {formatVND(tx.amount)}
                            </p>
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition" />
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

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        isOpen={!!selectedTxForDetail}
        onClose={() => setSelectedTxForDetail(null)}
        transaction={selectedTxForDetail}
        wallets={wallets}
        categories={categories}
        onDelete={onDeleteTransaction}
      />
    </div>
  );
};
