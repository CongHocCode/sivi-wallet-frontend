/**
 * SIVI WALLET - Analytics & Reports View
 * Rich interactive charts using Recharts: Pie chart for category distribution,
 * Area/Bar charts for monthly income vs expense trends, financial health insights,
 * and comprehensive Top 5 largest expenses list.
 */

import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  BarChart2,
  Calendar,
  Wallet as WalletIcon,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  PiggyBank,
  CheckCircle2,
  AlertTriangle,
  Award,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  X,
  Tag,
} from 'lucide-react';
import { Transaction, Category, Wallet } from '../types';
import { formatVND, getTxDate, formatTxDateTime } from '../lib/formatters';

interface AnalyticsViewProps {
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
}

export type TimeMode =
  | 'today'
  | 'this_month'
  | 'last_month'
  | 'custom_month'
  | 'custom_year'
  | 'last_6_months'
  | 'all';

// Color palette matching Sivi's warm organic theme
const CATEGORY_COLORS = [
  '#7D8F69', // Olive Sage
  '#D98B72', // Terracotta
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#64748B', // Slate
];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  transactions,
  categories,
  wallets,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [timeMode, setTimeMode] = useState<TimeMode>('this_month');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Available Years from transactions
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

  // Date filtering logic
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const curMonthIndex = now.getMonth();
    const curYear = now.getFullYear();

    return transactions.filter((tx) => {
      const txDate = getTxDate(tx);
      if (isNaN(txDate.getTime())) return false;

      if (timeMode === 'today') {
        return (
          txDate.getDate() === now.getDate() &&
          txDate.getMonth() === curMonthIndex &&
          txDate.getFullYear() === curYear
        );
      }
      if (timeMode === 'this_month') {
        return txDate.getMonth() === curMonthIndex && txDate.getFullYear() === curYear;
      }
      if (timeMode === 'last_month') {
        const lastMonthIndex = curMonthIndex === 0 ? 11 : curMonthIndex - 1;
        const year = curMonthIndex === 0 ? curYear - 1 : curYear;
        return txDate.getMonth() === lastMonthIndex && txDate.getFullYear() === year;
      }
      if (timeMode === 'custom_month') {
        return (
          txDate.getMonth() === selectedMonth - 1 &&
          txDate.getFullYear() === selectedYear
        );
      }
      if (timeMode === 'custom_year') {
        return txDate.getFullYear() === selectedYear;
      }
      if (timeMode === 'last_6_months') {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        return txDate >= sixMonthsAgo;
      }
      return true; // 'all'
    });
  }, [transactions, timeMode, selectedMonth, selectedYear]);

  // Compute key metrics
  const totalIncome = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'INCOME' || t.type === 'SETTLEMENT')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const totalExpense = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Category Breakdown for Pie Chart
  const categoryData = useMemo(() => {
    const expenses = filteredTransactions.filter((t) => t.type === 'EXPENSE');
    const catMap: Record<string, { name: string; value: number }> = {};

    expenses.forEach((t) => {
      const catName = t.categoryName || 'Khác';
      if (!catMap[catName]) {
        catMap[catName] = { name: catName, value: 0 };
      }
      catMap[catName].value += t.amount;
    });

    const list = Object.values(catMap).sort((a, b) => b.value - a.value);
    return list;
  }, [filteredTransactions]);

  // Monthly / Period Trend Data for Bar/Area Chart
  const trendData = useMemo(() => {
    const monthMap: Record<string, { name: string; Thu: number; Chi: number }> = {};

    transactions.forEach((t) => {
      const d = getTxDate(t);
      const monthKey = `T${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { name: monthKey, Thu: 0, Chi: 0 };
      }

      if (t.type === 'INCOME' || t.type === 'SETTLEMENT') {
        monthMap[monthKey].Thu += t.amount;
      } else if (t.type === 'EXPENSE') {
        monthMap[monthKey].Chi += t.amount;
      }
    });

    return Object.values(monthMap).slice(-6);
  }, [transactions]);

  // Top 5 largest expenses in period
  const topExpenses = useMemo(() => {
    return [...filteredTransactions]
      .filter((t) => t.type === 'EXPENSE')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredTransactions]);

  // Max expense amount among top 5 for proportional bar filling
  const maxExpenseAmount = useMemo(() => {
    return topExpenses.length > 0 ? topExpenses[0].amount : 1;
  }, [topExpenses]);

  // Human-readable time filter label
  const getTimeLabel = () => {
    if (timeMode === 'today') return 'Hôm nay';
    if (timeMode === 'this_month') return 'Tháng này';
    if (timeMode === 'last_month') return 'Tháng trước';
    if (timeMode === 'custom_month') return `Tháng ${selectedMonth}/${selectedYear}`;
    if (timeMode === 'custom_year') return `Cả Năm ${selectedYear}`;
    if (timeMode === 'last_6_months') return '6 Tháng gần đây';
    return 'Tất cả thời gian';
  };

  // Custom tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#2D2926] text-white p-3 rounded-2xl shadow-xl text-xs space-y-1 border border-white/10">
          <p className="font-bold border-b border-white/20 pb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-mono font-bold">{formatVND(entry.value)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Filter Controls Bar */}
      <div className="bg-white border border-[#EAE7DC] rounded-2xl sm:rounded-[28px] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#2D2926] flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-[#7D8F69]" /> Báo Cáo & Phân Tích Tài Chính
            </h2>
            <p className="text-xs text-[#8C857D] mt-0.5">
              Thống kê thu chi, tỉ lệ tiết kiệm và danh mục chi tiêu theo kỳ
            </p>
          </div>

          {/* Time Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="px-3.5 py-2 bg-[#F9F8F3] hover:bg-[#F1EFE7] text-[#2D2926] rounded-2xl border border-[#EAE7DC] text-xs font-bold transition flex items-center justify-between gap-2 shadow-2xs shrink-0"
          >
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#7D8F69]" />
              <span>Kỳ báo cáo: <strong className="text-[#7D8F69]">{getTimeLabel()}</strong></span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-[#8C857D] transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expandable Filter Selection Drawer */}
        {isFilterOpen && (
          <div className="pt-3 border-t border-[#EAE7DC] space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-[#8C857D] tracking-wider">
                Chọn mốc thời gian xem báo cáo
              </span>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="text-xs text-[#8C857D] hover:text-[#2D2926] font-bold"
              >
                Đóng ✕
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => { setTimeMode('today'); setIsFilterOpen(false); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  timeMode === 'today' ? 'bg-[#7D8F69] text-white shadow-2xs' : 'bg-[#F9F8F3] text-[#8C857D] hover:text-[#2D2926]'
                }`}
              >
                Hôm nay (Theo ngày)
              </button>
              <button
                type="button"
                onClick={() => { setTimeMode('this_month'); setIsFilterOpen(false); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  timeMode === 'this_month' ? 'bg-[#7D8F69] text-white shadow-2xs' : 'bg-[#F9F8F3] text-[#8C857D] hover:text-[#2D2926]'
                }`}
              >
                Tháng này
              </button>
              <button
                type="button"
                onClick={() => { setTimeMode('last_month'); setIsFilterOpen(false); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  timeMode === 'last_month' ? 'bg-[#7D8F69] text-white shadow-2xs' : 'bg-[#F9F8F3] text-[#8C857D] hover:text-[#2D2926]'
                }`}
              >
                Tháng trước
              </button>
              <button
                type="button"
                onClick={() => { setTimeMode('last_6_months'); setIsFilterOpen(false); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  timeMode === 'last_6_months' ? 'bg-[#7D8F69] text-white shadow-2xs' : 'bg-[#F9F8F3] text-[#8C857D] hover:text-[#2D2926]'
                }`}
              >
                6 Tháng gần đây
              </button>
              <button
                type="button"
                onClick={() => { setTimeMode('all'); setIsFilterOpen(false); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  timeMode === 'all' ? 'bg-[#7D8F69] text-white shadow-2xs' : 'bg-[#F9F8F3] text-[#8C857D] hover:text-[#2D2926]'
                }`}
              >
                Tất cả thời gian
              </button>
            </div>

            {/* Custom Month & Custom Year Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#F9F8F3]">
              {/* Custom Month Picker */}
              <div className="bg-[#F9F8F3] p-2.5 rounded-2xl border border-[#EAE7DC] space-y-2">
                <span className="text-[11px] font-bold text-[#4A443F] block">📅 Theo Tháng Cụ Thể</span>
                <div className="flex gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(Number(e.target.value));
                      setTimeMode('custom_month');
                    }}
                    className="flex-1 p-2 text-xs font-semibold rounded-xl bg-white border border-[#EAE7DC] text-[#2D2926]"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>Tháng {m}</option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(Number(e.target.value));
                      setTimeMode('custom_month');
                    }}
                    className="w-24 p-2 text-xs font-semibold rounded-xl bg-white border border-[#EAE7DC] text-[#2D2926]"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>Năm {y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Year Picker */}
              <div className="bg-[#F9F8F3] p-2.5 rounded-2xl border border-[#EAE7DC] space-y-2">
                <span className="text-[11px] font-bold text-[#4A443F] block">📊 Theo Cả Năm Cụ Thể</span>
                <div className="flex gap-2">
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(Number(e.target.value));
                      setTimeMode('custom_year');
                    }}
                    className="w-full p-2 text-xs font-semibold rounded-xl bg-white border border-[#EAE7DC] text-[#2D2926]"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>Báo cáo Cả Năm {y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Income Card */}
        <div className="bg-white border border-[#EAE7DC] rounded-2xl sm:rounded-[24px] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#8C857D] uppercase tracking-wider">
              Tổng Thu Nhập
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-base sm:text-xl font-black text-[#7D8F69]">
              +{formatVND(totalIncome)}
            </h3>
            <p className="text-[10px] text-[#8C857D] mt-0.5">Trong kỳ: {getTimeLabel()}</p>
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-white border border-[#EAE7DC] rounded-2xl sm:rounded-[24px] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#8C857D] uppercase tracking-wider">
              Tổng Chi Tiêu
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-base sm:text-xl font-black text-[#D98B72]">
              -{formatVND(totalExpense)}
            </h3>
            <p className="text-[10px] text-[#8C857D] mt-0.5">Trong kỳ: {getTimeLabel()}</p>
          </div>
        </div>

        {/* Net Savings Card */}
        <div className="bg-white border border-[#EAE7DC] rounded-2xl sm:rounded-[24px] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#8C857D] uppercase tracking-wider">
              Dư Tích Lũy
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3
              className={`text-base sm:text-xl font-black ${
                netSavings >= 0 ? 'text-[#2D2926]' : 'text-rose-600'
              }`}
            >
              {netSavings >= 0 ? '+' : ''}
              {formatVND(netSavings)}
            </h3>
            <p className="text-[10px] text-[#8C857D] mt-0.5">Thu nhập trừ chi tiêu</p>
          </div>
        </div>

        {/* Savings Rate Card */}
        <div className="bg-white border border-[#EAE7DC] rounded-2xl sm:rounded-[24px] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#8C857D] uppercase tracking-wider">
              Tỉ Lệ Tiết Kiệm
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-base sm:text-xl font-black text-[#2D2926]">
              {savingsRate.toFixed(1)}%
            </h3>
            <p className="text-[10px] text-[#8C857D] mt-0.5">
              {savingsRate >= 20 ? 'Mục tiêu đạt chuẩn' : 'Cần tiết kiệm thêm'}
            </p>
          </div>
        </div>
      </div>

      {/* Top 5 Largest Expenses Card Section */}
      <div className="bg-white border border-[#EAE7DC] rounded-2xl sm:rounded-[28px] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#F9F8F3] pb-2.5">
          <h3 className="font-bold text-[#2D2926] text-sm sm:text-base flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-[#D98B72]" /> Top 5 Khoản Chi Lớn Nhất ({getTimeLabel()})
          </h3>
          <span className="text-[11px] font-extrabold text-[#7D8F69] bg-[#F9F8F3] px-2.5 py-1 rounded-xl border border-[#EAE7DC]">
            {topExpenses.length}/5 khoản
          </span>
        </div>

        {topExpenses.length === 0 ? (
          <div className="py-8 text-center text-[#8C857D] space-y-1">
            <p className="text-xs font-bold">Chưa có khoản chi tiêu nào trong kỳ báo cáo này.</p>
            <p className="text-[11px]">Hãy chọn mốc thời gian khác hoặc nhập thêm giao dịch mới.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {topExpenses.map((tx, idx) => {
              const txDate = getTxDate(tx);
              const walletName = wallets.find((w) => w.id === tx.walletId)?.name || 'Ví tài khoản';
              const percentOfTotal = totalExpense > 0 ? (tx.amount / totalExpense) * 100 : 0;
              const barWidthPercent = Math.min(100, Math.max(8, (tx.amount / maxExpenseAmount) * 100));

              // Rank color accents
              const rankColorClass =
                idx === 0
                  ? 'bg-amber-500 text-white font-black'
                  : idx === 1
                  ? 'bg-[#D98B72] text-white font-black'
                  : idx === 2
                  ? 'bg-[#7D8F69] text-white font-black'
                  : 'bg-[#F1EFE7] text-[#4A443F] font-bold';

              return (
                <div
                  key={tx.id || idx}
                  className="bg-[#F9F8F3] border border-[#EAE7DC] rounded-2xl p-3 sm:p-3.5 space-y-2 hover:border-[#7D8F69] transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Rank & Note */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 ${rankColorClass}`}>
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-extrabold text-[#2D2926] truncate">
                          {tx.note || tx.categoryName || 'Chi tiêu'}
                        </p>
                        <p className="text-[10px] sm:text-xs text-[#8C857D] flex items-center gap-1.5 truncate mt-0.5">
                          <span className="font-semibold text-[#4A443F]">{tx.categoryName || 'Khác'}</span>
                          <span>•</span>
                          <span>{walletName}</span>
                          <span>•</span>
                          <span>{formatTxDateTime(txDate, true)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Amount & Percent */}
                    <div className="text-right shrink-0">
                      <span className="font-black text-xs sm:text-sm text-[#D98B72] block">
                        -{formatVND(tx.amount)}
                      </span>
                      <span className="text-[10px] font-bold text-[#8C857D]">
                        {percentOfTotal.toFixed(1)}% tổng chi
                      </span>
                    </div>
                  </div>

                  {/* Proportional Progress Fill Bar */}
                  <div className="w-full bg-[#EAE7DC]/60 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#D98B72] rounded-full transition-all duration-500"
                      style={{ width: `${barWidthPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Charts Section: Pie Chart + Bar/Area Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Spending Donut/Pie Chart (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#EAE7DC] rounded-2xl sm:rounded-[28px] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#2D2926] text-sm flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-[#7D8F69]" /> Cơ Cấu Chi Tiêu Danh Mục
              </h3>
              <span className="text-[10px] text-[#8C857D] bg-[#F9F8F3] px-2 py-1 rounded-md font-semibold">
                {categoryData.length} danh mục
              </span>
            </div>

            {categoryData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-[#8C857D]">
                <p className="text-xs">Chưa có dữ liệu chi tiêu trong kỳ này.</p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Category Percentage Breakdown List */}
          {categoryData.length > 0 && (
            <div className="space-y-2 mt-4 pt-3 border-t border-[#F9F8F3] max-h-48 overflow-y-auto pr-1">
              {categoryData.map((cat, idx) => {
                const percent = totalExpense > 0 ? (cat.value / totalExpense) * 100 : 0;
                const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-2 font-semibold text-[#2D2926]">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: color }}
                        />
                        {cat.name}
                      </span>
                      <span className="font-bold text-[#4A443F]">
                        {formatVND(cat.value)}{' '}
                        <span className="text-[#8C857D] font-normal">({percent.toFixed(1)}%)</span>
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-[#F1EFE7] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Monthly Income vs Expense Trend Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#EAE7DC] rounded-2xl sm:rounded-[28px] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#2D2926] text-sm flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#7D8F69]" /> Biểu Đồ So Sánh Thu - Chi Các Tháng
              </h3>

              <div className="flex gap-1 p-0.5 bg-[#F9F8F3] rounded-xl border border-[#EAE7DC]">
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
                    chartType === 'bar' ? 'bg-white text-[#2D2926] shadow-2xs' : 'text-[#8C857D]'
                  }`}
                >
                  Cột
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('area')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
                    chartType === 'area' ? 'bg-white text-[#2D2926] shadow-2xs' : 'text-[#8C857D]'
                  }`}
                >
                  Miền
                </button>
              </div>
            </div>

            {trendData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-[#8C857D]">
                <p className="text-xs">Chưa có lịch sử giao dịch qua các tháng.</p>
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={trendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#8C857D" fontSize={11} tickLine={false} />
                      <YAxis
                        stroke="#8C857D"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(v) => (v >= 1000000 ? `${v / 1000000}tr` : `${v / 1000}k`)}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                        formatter={(val) => <span className="text-[#4A443F] font-bold">{val}</span>}
                      />
                      <Bar dataKey="Thu" name="Thu Nhập" fill="#7D8F69" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Chi" name="Chi Tiêu" fill="#D98B72" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  ) : (
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#8C857D" fontSize={11} tickLine={false} />
                      <YAxis
                        stroke="#8C857D"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(v) => (v >= 1000000 ? `${v / 1000000}tr` : `${v / 1000}k`)}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                        formatter={(val) => <span className="text-[#4A443F] font-bold">{val}</span>}
                      />
                      <Area
                        type="monotone"
                        dataKey="Thu"
                        name="Thu Nhập"
                        stroke="#7D8F69"
                        fill="#7D8F69"
                        fillOpacity={0.2}
                      />
                      <Area
                        type="monotone"
                        dataKey="Chi"
                        name="Chi Tiêu"
                        stroke="#D98B72"
                        fill="#D98B72"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* AI Financial Health Advice Box */}
          <div className="mt-4 p-3.5 bg-[#F9F8F3] rounded-2xl border border-[#EAE7DC] flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#7D8F69] text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#2D2926]">Nhận xét tài chính Sivi AI</h4>
              <p className="text-[11px] text-[#8C857D] leading-relaxed mt-0.5">
                {savingsRate >= 30
                  ? 'Sức khỏe tài chính xuất sắc! Bạn đang duy trì mức tích lũy trên 30% thu nhập.'
                  : savingsRate >= 10
                  ? 'Sức khỏe tài chính tốt! Hãy cố gắng duy trì chi tiêu ăn uống hợp lý để tăng quỹ dự phòng.'
                  : 'Chi tiêu trong kỳ này cao gần bằng hoặc vượt thu nhập. Bạn nên rà soát lại các khoản mua sắm cá nhân.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
