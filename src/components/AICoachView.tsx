/**
 * SIVI WALLET - Full Page AI Financial Coach & Roast View
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Flame,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Send,
  MessageSquare,
  Bot,
  User as UserIcon,
  CheckCircle2,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { api, apiService } from '../services/api';
import { geminiService } from '../services/geminiService';
import { Transaction, FinancialCoachResponse } from '../types';
import { formatVND } from '../lib/formatters';

const getTopCategory = (txs: Transaction[]): string => {
  const expenseTransactions = txs.filter((t) => t.type === 'EXPENSE');
  if (expenseTransactions.length === 0) return 'Không có chi tiêu';
  const categoryTotals: Record<string, number> = {};
  expenseTransactions.forEach((t) => {
    const catName = t.categoryName || 'Khác';
    categoryTotals[catName] = (categoryTotals[catName] || 0) + t.amount;
  });
  let topCat = 'Khác';
  let maxAmount = -1;
  Object.entries(categoryTotals).forEach(([catName, total]) => {
    if (total > maxAmount) {
      maxAmount = total;
      topCat = catName;
    }
  });
  return topCat;
};

interface AICoachViewProps {
  monthlyIncome: number;
  monthlyExpense: number;
  transactions: Transaction[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const AICoachView: React.FC<AICoachViewProps> = ({
  monthlyIncome,
  monthlyExpense,
  transactions,
}) => {
  const [coachData, setCoachData] = useState<FinancialCoachResponse | null>(null);
  const [isLoadingCoach, setIsLoadingCoach] = useState(false);
  const [completedTips, setCompletedTips] = useState<Record<number, boolean>>({});

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Chào bạn! Mình là Sivi AI - Cố vấn tài chính cá nhân của bạn. Bạn có thắc mắc gì về thu chi, tiết kiệm hay cách săn deal không? Hỏi mình ngay nhé!',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const fetchAdvice = async () => {
    setIsLoadingCoach(true);
    try {
      const data = await api.coach.getAdvice(
        monthlyIncome,
        monthlyExpense,
        transactions
      );
      
      const topCategory = getTopCategory(transactions);
      try {
        const geminiRoast = await geminiService.generateRoast({
          totalIncome: monthlyIncome,
          totalExpense: monthlyExpense,
          topCategory,
        });
        data.roastSummary = geminiRoast;
      } catch (roastErr) {
        console.error('Failed to generate Gemini roast:', roastErr);
      }

      setCoachData(data);
    } catch (err) {
      console.error(err);
      // Fallback response
      const fallbackData: FinancialCoachResponse = {
        title: 'Cố Vấn Sivi: Cảnh Báo Sức Khỏe Sổ Thu Chi',
        roastSummary:
          'Tháng này chi tiêu khá năng nổ đấy nhé! Đừng để tiền ra đi nhanh hơn người yêu cũ. Hãy duy trì tỉ lệ tiết kiệm tối thiểu 20% trước khi lướt các sàn thương mại điện tử nè.',
        score: monthlyIncome > monthlyExpense ? 76 : 42,
        mood: monthlyIncome > monthlyExpense ? 'PRAISE' : 'ROAST',
        actionableTips: [
          'Hạn chế đặt trà sữa & đồ ăn ngoài 2 lần/tuần để tiết kiệm 450.000đ',
          'Trích lập quỹ tiết kiệm tự động ngay khi vừa nhận lương',
          'Thiết lập hạn mức cảnh báo ví điện tử ở mức 1.500.000đ/tuần',
        ],
        categoryAlerts: [
          { category: 'Ăn uống', text: 'Top 1 khoản chi tiêu lớn nhất tháng này' },
          { category: 'Mua sắm', text: 'Các hóa đơn phát sinh ngẫu hứng cần chú ý' },
        ],
      };

      const topCategory = getTopCategory(transactions);
      try {
        const geminiRoast = await geminiService.generateRoast({
          totalIncome: monthlyIncome,
          totalExpense: monthlyExpense,
          topCategory,
        });
        fallbackData.roastSummary = geminiRoast;
      } catch (roastErr) {
        console.error('Failed to generate Gemini roast for fallback:', roastErr);
      }

      setCoachData(fallbackData);
    } finally {
      setIsLoadingCoach(false);
    }
  };

  useEffect(() => {
    fetchAdvice();
  }, [transactions.length, monthlyIncome, monthlyExpense]);

  const handleSendChat = async (promptText?: string) => {
    const textToSend = promptText || chatInput;
    if (!textToSend.trim() || isSendingChat) return;

    const userMsg: ChatMessage = {
      id: 'user_' + Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!promptText) setChatInput('');
    setIsSendingChat(true);

    try {
      const res = await api.coach.askQuestion(
        textToSend,
        monthlyIncome,
        monthlyExpense,
        transactions
      );

      const aiMsg: ChatMessage = {
        id: 'ai_' + Date.now(),
        sender: 'ai',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: 'ai_err_' + Date.now(),
        sender: 'ai',
        text: 'Rất tiếc, kết nối mạng đang gián đoạn. Bạn thử lại sau ít phút nhen!',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const toggleTip = (idx: number) => {
    setCompletedTips((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getMoodBadge = (mood: string) => {
    switch (mood) {
      case 'PRAISE':
        return {
          bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
          icon: <TrendingUp className="w-4 h-4 text-emerald-600" />,
          label: 'Khen Thưởng 🎉',
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
          label: 'Cảnh Báo ⚠️',
        };
      default:
        return {
          bg: 'bg-rose-500/10 text-rose-700 border-rose-500/30',
          icon: <Flame className="w-4 h-4 text-rose-600 animate-bounce" />,
          label: 'Financial Roast 🔥',
        };
    }
  };

  const netSavings = monthlyIncome - monthlyExpense;
  const savingsRate = monthlyIncome > 0 ? Math.round((netSavings / monthlyIncome) * 100) : 0;

  const quickQuestions = [
    '💡 Làm sao để tiết kiệm 3 triệu/tháng?',
    '📱 Có nên mua điện thoại trả góp?',
    '🧋 Đánh giá chi tiêu ăn uống của tôi',
    '📊 Nguyên tắc phân bổ lương 50/30/20',
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* View Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#EAE7DC] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-emerald-500 text-white flex items-center justify-center shadow-md shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#2D2926]">Cố Vấn Tài Chính Sivi AI</h2>
            <p className="text-xs text-[#8C857D]">
              Đánh giá thói quen tiêu xài, roast mặn mà & tư vấn tài chính cá nhân bằng AI
            </p>
          </div>
        </div>

        <button
          onClick={fetchAdvice}
          disabled={isLoadingCoach}
          className="px-4 py-2.5 bg-[#7D8F69] hover:bg-[#687856] text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingCoach ? 'animate-spin' : ''}`} />
          Tải Lại Nhận Xét
        </button>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#EAE7DC] shadow-sm">
          <span className="text-[11px] font-bold text-[#8C857D] uppercase">Thu nhập tháng</span>
          <p className="text-lg font-black text-[#7D8F69] mt-1">{formatVND(monthlyIncome)}</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#EAE7DC] shadow-sm">
          <span className="text-[11px] font-bold text-[#8C857D] uppercase">Chi tiêu tháng</span>
          <p className="text-lg font-black text-[#D98B72] mt-1">{formatVND(monthlyExpense)}</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#EAE7DC] shadow-sm">
          <span className="text-[11px] font-bold text-[#8C857D] uppercase">Tỉ lệ dư tích lũy</span>
          <p
            className={`text-lg font-black mt-1 ${
              savingsRate >= 20 ? 'text-emerald-600' : savingsRate >= 0 ? 'text-amber-600' : 'text-rose-600'
            }`}
          >
            {savingsRate}% ({formatVND(netSavings)})
          </p>
        </div>
      </div>

      {/* Main Roast & Advice Hero Box */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 shadow-xl border border-slate-800">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {isLoadingCoach ? (
          <div className="py-12 text-center space-y-3">
            <Sparkles className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-300">
              Cố vấn Sivi đang nghiền ngẫm sổ thu chi của bạn...
            </p>
          </div>
        ) : coachData ? (
          <div className="space-y-5">
            {/* Title & Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="text-sm sm:text-base font-black text-amber-300">{coachData.title}</h3>
              </div>
              {(() => {
                const badge = getMoodBadge(coachData.mood);
                return (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shrink-0 ${badge.bg}`}
                  >
                    {badge.icon} {badge.label}
                  </span>
                );
              })()}
            </div>

            {/* Score Bar */}
            <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span>Điểm Sức Khỏe Tài Chính:</span>
                <span className="text-emerald-400 text-sm">{coachData.score}/100</span>
              </div>
              <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(0, coachData.score))}%` }}
                ></div>
              </div>
            </div>

            {/* Roast Summary Commentary */}
            <div className="bg-slate-800/40 p-4 rounded-2xl border-l-4 border-amber-400 border-y border-r border-slate-700/40">
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium italic">
                "{coachData.roastSummary}"
              </p>
            </div>

            {/* Category Alerts */}
            {coachData.categoryAlerts && coachData.categoryAlerts.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Điểm Nóng Cần Chú Ý:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {coachData.categoryAlerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-300"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-300 block">{alert.category}</strong>
                        <span>{alert.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actionable Tips Checklist */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-400" /> Nhiệm Vụ Cải Thiện Tài Chính:
              </span>
              <div className="space-y-2">
                {coachData.actionableTips.map((tip, idx) => {
                  const isDone = completedTips[idx];
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleTip(idx)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center gap-3 ${
                        isDone
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-slate-400 line-through'
                          : 'bg-slate-800/70 border-slate-700 hover:border-slate-600 text-slate-200'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition ${
                          isDone
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-500 text-transparent'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-medium flex-1">{tip}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Interactive AI Chat Assistant */}
      <div className="bg-white rounded-3xl border border-[#EAE7DC] shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-[#EAE7DC] pb-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#2D2926]">Hỏi Đáp Trực Tiếp Với Sivi AI</h3>
            <p className="text-[11px] text-[#8C857D]">Hỏi bất kỳ thắc mắc nào về quản lý tiền bạc</p>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-2">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendChat(q)}
              disabled={isSendingChat}
              className="px-3 py-1.5 bg-[#F9F8F3] hover:bg-[#F1EFE7] text-[#4A443F] rounded-xl text-xs font-semibold border border-[#EAE7DC] transition text-left active:scale-95"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat History Container */}
        <div className="bg-[#F9F8F3] rounded-2xl p-4 border border-[#EAE7DC] max-h-80 overflow-y-auto space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                  m.sender === 'user'
                    ? 'bg-[#7D8F69] text-white'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {m.sender === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[82%] sm:max-w-[75%] p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-2xs ${
                  m.sender === 'user'
                    ? 'bg-[#7D8F69] text-white rounded-tr-none'
                    : 'bg-white text-[#2D2926] border border-[#EAE7DC] rounded-tl-none'
                }`}
              >
                <p>{m.text}</p>
                <span
                  className={`text-[9px] block mt-1 text-right ${
                    m.sender === 'user' ? 'text-emerald-100' : 'text-[#8C857D]'
                  }`}
                >
                  {m.timestamp}
                </span>
              </div>
            </div>
          ))}

          {isSendingChat && (
            <div className="flex items-center gap-2 text-xs text-[#8C857D] p-2 bg-white rounded-xl border border-[#EAE7DC] w-fit">
              <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
              <span>Sivi AI đang suy nghĩ câu trả lời...</span>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
            placeholder="Hỏi Sivi AI: ví dụ 'Làm sao giảm tiền ăn?'..."
            className="flex-1 px-4 py-2.5 text-xs rounded-2xl bg-[#F9F8F3] border border-[#EAE7DC] focus:outline-none focus:ring-1 focus:ring-[#7D8F69]"
          />
          <button
            onClick={() => handleSendChat()}
            disabled={!chatInput.trim() || isSendingChat}
            className="px-4 py-2.5 bg-[#7D8F69] hover:bg-[#687856] disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
