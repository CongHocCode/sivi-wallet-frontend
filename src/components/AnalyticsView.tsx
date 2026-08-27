/**
 * SIVI WALLET - Analytics & Reports View
 * Rich interactive charts using Recharts: Pie chart for category distribution,
 * Area/Bar charts for monthly income vs expense trends, and financial health insights.
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
} from 'lucide-react';
import { Transaction, Category, Wallet } from '../types';
import { formatVND, getTxDate } from '../lib/formatters';

interface AnalyticsViewProps {
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
}

type TimeRange = 'this_month' | 'last_month' | 'last_6_months' | 'all';

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
  const [timeRange, setTimeRange] = useState<TimeRange>('this_month');
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');

  // Date filtering logic
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions.filter((tx) => {
      const txDate = getTxDate(tx);

      if (timeRange === 'this_month') {
        return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      }
      if (timeRange === 'last_month') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const year = currentMonth === 0 ? currentYear - 1 : currentYear;
        return txDate.getMonth() === lastMonth && txDate.getFullYear() === year;
      }
      if (timeRange === 'last_6_months') {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        return txDate >= sixMonthsAgo;
      }
      return true; // 'all'
    });
  }, [transactions, timeRange]);

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

    // Sort chronologically if keys available or return last 6 entries
    return Object.values(monthMap).slice(-6);
  }, [transactions]);

  // Top 5 largest expenses
  const topExpenses = useMemo(() => {
    return [...filteredTransactions]
      .filter((t) => t.type === 'EXPENSE')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredTransactions]);

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
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#EAE7DC] rounded-2xl sm:rounded-[28px] p-4 sm:p-6 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-[#2D2926] flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-[#7D8F69]" /> Báo Cáo & Phân Tích Tài Chính
          </h2>
          <p className="text-xs text-[#8C857D] mt-0.5">
            Thống kê chi tiết thu chi, tỉ lệ tiết kiệm và danh mục mua sắm
          </p>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center gap-1 bg-[#F9F8F3] p-1 rounded-2xl border border-[#EAE7DC] overflow-x-auto no-scrollbar">
          <button
            onClick={() => setTimeRange('this_month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              timeRange === 'this_month'
                ? 'bg-[#7D8F69] text-white shadow-2xs'
                : 'text-[#8C857D] hover:text-[#2D2926]'
            }`}
          >
            Tháng này
          </button>
          <button
            onClick={() => setTimeRange('last_month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              timeRange === 'last_month'
                ? 'bg-[#7D8F69] text-white shadow-2xs'
                : 'text-[#8C857D] hover:text-[#2D2926]'
            }`}
          >
            Tháng trước
          </button>
          <button
            onClick={() => setTimeRange('last_6_months')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              timeRange === 'last_6_months'
                ? 'bg-[#7D8F69] text-white shadow-2xs'
                : 'text-[#8C857D] hover:text-[#2D2926]'
            }`}
          >
            6 Tháng gần nhất
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              timeRange === 'all'
                ? 'bg-[#7D8F69] text-white shadow-2xs'
                : 'text-[#8C857D] hover:text-[#2D2926]'
            }`}
          >
            Tất cả
          </button>
        </div>
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
            <p className="text-[10px] text-[#8C857D] mt-0.5">Trong kỳ báo cáo</p>
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
            <p className="text-[10px] text-[#8C857D] mt-0.5">Trong kỳ báo cáo</p>
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
                <BarChart2 className="w-4 h-4 text-[#7D8F69]" /> Biểu Đồ So Sánh Thu - Chi
              </h3>

              <div className="flex gap-1 p-0.5 bg-[#F9F8F3] rounded-xl border border-[#EAE7DC]">
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
                    chartType === 'bar' ? 'bg-white text-[#2D2926] shadow-2xs' : 'text-[#8C857D]'
                  }`}
                >
                  Cột
                </button>
                <button
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
                  : 'Chi tiêu tháng này cao gần bằng hoặc vượt thu nhập. Bạn nên rà soát lại các khoản mua sắm cá nhân.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Largest Expenses Section */}
      <div className="bg-white border border-[#EAE7DC] rounded-2xl sm:rounded-[28px] p-5 shadow-xs space-y-3">
        <h3 className="font-bold text-[#2D2926] text-sm flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-[#D98B72]" /> Top 5 Khoản Chi Lớn Nhất Trong Kỳ
        </h3>

        {topExpenses.length === 0 ? (
          <p className="text-xs text-[#8C857D] py-4 text-center">Không có khoản chi tiêu nào.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topExpenses.map((tx, i) => (
              <div
                key={tx.id}
                className="p-3 bg-[#F9F8F3] rounded-2xl border border-[#EAE7DC] flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#D98B72]/15 text-[#D98B72] font-black text-xs flex items-center justify-center">
                    #{i + 1}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#2D2926] line-clamp-1">{tx.note}</p>
                    <p className="text-[10px] text-[#8C857D]">
                      {tx.categoryName || 'Khác'} • {new Date(tx.date).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
                <span className="font-extrabold text-xs text-[#D98B72]">
                  -{formatVND(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
