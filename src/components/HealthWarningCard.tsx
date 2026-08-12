/**
 * SIVI WALLET - Health Warning Card ("Cảnh Báo Sức Khỏe Sổ Thu Chi")
 * Displayed on the main Dashboard (Overview tab).
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Flame, ChevronRight } from 'lucide-react';
import { Transaction } from '../types';
import { apiService } from '../services/api';

interface HealthWarningCardProps {
  monthlyIncome: number;
  monthlyExpense: number;
  transactions: Transaction[];
  onOpenCoachTab: () => void;
}

export const HealthWarningCard: React.FC<HealthWarningCardProps> = ({
  monthlyIncome,
  monthlyExpense,
  transactions,
  onOpenCoachTab,
}) => {
  const [score, setScore] = useState<number>(76);
  const [roastText, setRoastText] = useState<string>(
    'Tháng này chi tiêu khá năng nổ đấy nhé! Đừng để tiền ra đi nhanh hơn người yêu cũ. Hãy duy trì tỉ lệ tiết kiệm tối thiểu 20%.'
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchSummary = async () => {
      setIsLoading(true);
      try {
        const advice = await apiService.getFinancialCoachAdvice(
          monthlyIncome,
          monthlyExpense,
          transactions
        );
        if (isMounted && advice) {
          setScore(advice.score || 76);
          setRoastText(advice.roastSummary || roastText);
        }
      } catch (err) {
        if (isMounted) {
          const ratio = monthlyIncome > 0 ? monthlyExpense / monthlyIncome : 0;
          const calculatedScore = ratio > 1 ? 42 : ratio > 0.7 ? 65 : 82;
          setScore(calculatedScore);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchSummary();
    return () => {
      isMounted = false;
    };
  }, [monthlyIncome, monthlyExpense, transactions.length]);

  return (
    <div className="bg-white border border-[#EAE7DC] rounded-2xl sm:rounded-[32px] p-5 sm:p-6 shadow-sm flex flex-col justify-between relative overflow-hidden h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center font-bold shrink-0">
            <Flame className="w-5 h-5 text-amber-600 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs sm:text-sm text-[#2D2926]">
              Cảnh Báo Sức Khỏe Sổ Thu Chi
            </h3>
            <p className="text-[10px] text-[#8C857D]">Đánh giá bởi Cố Vấn Sivi AI</p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-slate-900 text-amber-300 font-black text-xs sm:text-sm border border-slate-800 shadow-2xs shrink-0">
          {score}/100
        </span>
      </div>

      <div className="bg-[#F9F8F3] p-3.5 rounded-2xl border border-[#EAE7DC] my-2">
        <p className="text-xs text-[#4A443F] font-medium leading-relaxed italic">
          "{isLoading ? 'Sivi AI đang phân tích dòng tiền của bạn...' : roastText}"
        </p>
      </div>

      <button
        onClick={onOpenCoachTab}
        className="w-full mt-2 py-2.5 px-3 bg-[#F1EFE7] hover:bg-[#EAE7DC] text-[#2D2926] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
        <span>Xem Trang Cố Vấn AI & Chat</span>
        <ChevronRight className="w-4 h-4 text-[#8C857D]" />
      </button>
    </div>
  );
};
