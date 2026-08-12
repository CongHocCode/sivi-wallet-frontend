/**
 * SIVI WALLET - Financial Coach Widget ("Financial Roast")
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Flame, RefreshCw, AlertTriangle, TrendingUp, Lightbulb } from 'lucide-react';
import { apiService } from '../services/api';
import { Transaction, FinancialCoachResponse } from '../types';
import { formatVND } from '../lib/formatters';

interface FinancialCoachWidgetProps {
  monthlyIncome: number;
  monthlyExpense: number;
  transactions: Transaction[];
}

export const FinancialCoachWidget: React.FC<FinancialCoachWidgetProps> = ({
  monthlyIncome,
  monthlyExpense,
  transactions,
}) => {
  const [coachData, setCoachData] = useState<FinancialCoachResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdvice = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.getFinancialCoachAdvice(monthlyIncome, monthlyExpense, transactions);
      setCoachData(data);
    } catch (err: any) {
      console.error(err);
      // Fallback response if offline/error
      setCoachData({
        title: 'Cố Vấn Sivi: Cảnh Báo Ví Tiền Tháng 8',
        roastSummary:
          'Tháng này chi tiêu có vẻ bay bổng phết nhỉ! Đừng để tiền đi nhanh như xe ôm công nghệ giờ cao điểm. Hãy dành 20% thu nhập tiết kiệm trước khi mua sắm nhen.',
        score: monthlyIncome > monthlyExpense ? 78 : 45,
        mood: monthlyIncome > monthlyExpense ? 'PRAISE' : 'ROAST',
        actionableTips: [
          'Hạn chế ăn ngoài 2 bữa/tuần tiết kiệm ngay 400.000 đ',
          'Rút bớt tiền khỏi ví điện tử tránh bấm chốt đơn ngẫu hứng',
          'Đặt hạn mức cảnh báo chi tiêu tuần không quá 1.500.000 đ',
        ],
        categoryAlerts: [
          { category: 'Ăn uống', text: 'Top 1 tốn kém nhất tháng này' },
          { category: 'Mua sắm', text: 'Cần kiểm soát thêm các hóa đơn ngẫu hứng' },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvice();
  }, [transactions.length, monthlyIncome, monthlyExpense]);

  const getMoodBadge = (mood: string) => {
    switch (mood) {
      case 'PRAISE':
        return {
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          icon: <TrendingUp className="w-4 h-4" />,
          label: 'Khen Thưởng',
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          icon: <AlertTriangle className="w-4 h-4" />,
          label: 'Cảnh Báo',
        };
      default:
        return {
          bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
          icon: <Flame className="w-4 h-4" />,
          label: 'Financial Roast 🔥',
        };
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-5 shadow-xl border border-slate-700/60">
      {/* Background Accent Glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none"></div>
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none"></div>

      {/* Header */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-500 text-white shadow-md">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-200">
              Cố Vấn Tài Chính Sivi AI
            </h3>
            <p className="text-[11px] text-slate-400">Đánh giá & Lời khuyên dí dỏm hàng tháng</p>
          </div>
        </div>

        <button
          onClick={fetchAdvice}
          disabled={isLoading}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
          title="Tải lại đánh giá AI"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-8 text-center space-y-2">
          <Sparkles className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-300 font-medium">Cố vấn Sivi đang nghiền ngẫm ví của bạn...</p>
        </div>
      ) : coachData ? (
        <div className="relative space-y-4">
          {/* Title & Score Bar */}
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-300 leading-snug">{coachData.title}</h4>
              {(() => {
                const badge = getMoodBadge(coachData.mood);
                return (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 shrink-0 ${badge.bg}`}>
                    {badge.icon} {badge.label}
                  </span>
                );
              })()}
            </div>

            {/* Score progress bar */}
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                <span>Chỉ số sức khỏe tài chính:</span>
                <span className="font-extrabold text-emerald-400">{coachData.score}/100</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, coachData.score))}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Roast Summary */}
          <p className="text-xs text-slate-200 leading-relaxed font-medium italic border-l-2 border-amber-400 pl-3">
            "{coachData.roastSummary}"
          </p>

          {/* Actionable Tips */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Gợi ý hành động từ Sivi:
            </span>
            <ul className="space-y-1 text-xs text-slate-300">
              {coachData.actionableTips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-slate-800/40 p-2 rounded-lg border border-slate-700/40">
                  <span className="text-emerald-400 font-bold shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
};
