/**
 * SIVI WALLET - Manual Add/Edit Transaction Modal
 * Supporting EXPENSE, INCOME, and TRANSFER types with rich category chips & presets.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Receipt,
  Sparkles,
  HeartPulse,
  Wallet as WalletIcon,
  TrendingUp,
  Tag,
  Check,
} from 'lucide-react';
import { apiService } from '../services/api';
import { Wallet, Category, TransactionType } from '../types';
import { formatVND, parseVNDInput } from '../lib/formatters';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  categories: Category[];
  onSuccess: () => void;
}

const getCategoryIconComponent = (iconName?: string, name?: string) => {
  const lowercaseName = (name || '').toLowerCase();
  if (
    iconName === 'UtensilsCrossed' ||
    iconName === 'Utensils' ||
    lowercaseName.includes('ăn') ||
    lowercaseName.includes('uống')
  ) {
    return UtensilsCrossed;
  }
  if (iconName === 'Car' || lowercaseName.includes('đi lại') || lowercaseName.includes('xe')) {
    return Car;
  }
  if (iconName === 'ShoppingBag' || lowercaseName.includes('mua sắm') || lowercaseName.includes('chợ')) {
    return ShoppingBag;
  }
  if (iconName === 'Receipt' || lowercaseName.includes('hóa đơn') || lowercaseName.includes('điện')) {
    return Receipt;
  }
  if (iconName === 'Sparkles' || lowercaseName.includes('giải trí') || lowercaseName.includes('phim')) {
    return Sparkles;
  }
  if (iconName === 'HeartPulse' || lowercaseName.includes('sức khỏe') || lowercaseName.includes('thuốc')) {
    return HeartPulse;
  }
  if (iconName === 'Wallet' || lowercaseName.includes('lương') || lowercaseName.includes('thu nhập')) {
    return WalletIcon;
  }
  if (iconName === 'TrendingUp' || lowercaseName.includes('thưởng') || lowercaseName.includes('lãi')) {
    return TrendingUp;
  }
  return Tag;
};

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  wallets,
  categories,
  onSuccess,
}) => {
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amountInput, setAmountInput] = useState('');
  const [fromWalletId, setFromWalletId] = useState(wallets[0]?.id || '');
  const [toWalletId, setToWalletId] = useState(wallets[1]?.id || wallets[0]?.id || '');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter categories matching current transaction type
  const availableCategories = categories.filter((c) =>
    type === 'INCOME' ? c.type === 'INCOME' : c.type === 'EXPENSE' || !c.type
  );

  useEffect(() => {
    if (availableCategories.length > 0 && !categoryId) {
      setCategoryId(availableCategories[0].id);
    }
  }, [type, categories]);

  if (!isOpen) return null;

  const parsedAmount = parseVNDInput(amountInput);

  const handleQuickAddAmount = (addVal: number) => {
    const current = parseVNDInput(amountInput);
    const updated = current + addVal;
    setAmountInput(updated.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ (> 0)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (type === 'TRANSFER') {
        if (!fromWalletId || !toWalletId) {
          throw new Error('Vui lòng chọn ví gửi và ví nhận');
        }
        if (fromWalletId === toWalletId) {
          throw new Error('Ví gửi và ví nhận không thể trùng nhau');
        }

        await apiService.transferWallet(
          fromWalletId,
          toWalletId,
          parsedAmount,
          note || 'Chuyển khoản nội bộ'
        );
      } else {
        if (!fromWalletId) {
          throw new Error('Vui lòng chọn ví thanh toán');
        }

        const selectedWallet = wallets.find((w) => w.id === fromWalletId);
        const selectedCategory = categories.find((c) => c.id === categoryId);

        await apiService.addTransaction({
          walletId: fromWalletId,
          walletName: selectedWallet?.name,
          categoryId: selectedCategory?.id,
          categoryName: selectedCategory?.name || (type === 'EXPENSE' ? 'Chi tiêu' : 'Thu nhập'),
          categoryIcon: selectedCategory?.icon || 'Tag',
          amount: parsedAmount,
          type,
          note: note || (type === 'EXPENSE' ? 'Chi tiêu cá nhân' : 'Thu nhập'),
          date: new Date(date).toISOString(),
        });
      }

      onSuccess();
      onClose();
      // Reset form
      setAmountInput('');
      setNote('');
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu giao dịch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden border border-[#EAE7DC] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAE7DC] bg-[#F9F8F3] shrink-0">
          <h2 className="text-sm font-extrabold text-[#2D2926] flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#7D8F69]" /> Thêm Giao Dịch
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8C857D] hover:text-[#2D2926] hover:bg-[#EAE7DC] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Transaction Type Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F9F8F3] rounded-2xl border border-[#EAE7DC]">
            <button
              type="button"
              onClick={() => {
                setType('EXPENSE');
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition ${
                type === 'EXPENSE'
                  ? 'bg-[#D98B72] text-white shadow-xs'
                  : 'text-[#8C857D] hover:text-[#2D2926]'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Chi Tiêu
            </button>
            <button
              type="button"
              onClick={() => {
                setType('INCOME');
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition ${
                type === 'INCOME'
                  ? 'bg-[#7D8F69] text-white shadow-xs'
                  : 'text-[#8C857D] hover:text-[#2D2926]'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" /> Thu Nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setType('TRANSFER');
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition ${
                type === 'TRANSFER'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[#8C857D] hover:text-[#2D2926]'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Chuyển Ví
            </button>
          </div>

          {/* Amount input + Presets */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#4A443F]">
                Số tiền giao dịch:
              </label>
              <span className="text-xs font-black text-[#7D8F69]">
                {formatVND(parsedAmount)}
              </span>
            </div>
            <input
              type="text"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder='Nhập số tiền (VD: "50k", "1.5tr")'
              className="w-full p-3 text-xl font-black rounded-2xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
              autoFocus
            />

            {/* Quick Amount Preset Chips */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar pb-1">
              {[20000, 50000, 100000, 200000, 500000, 1000000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleQuickAddAmount(preset)}
                  className="px-2.5 py-1 bg-[#F1EFE7] hover:bg-[#EAE7DC] active:scale-95 text-[#4A443F] text-[10px] font-bold rounded-lg border border-[#EAE7DC] whitespace-nowrap transition"
                >
                  +{preset >= 1000000 ? `${preset / 1000000}tr` : `${preset / 1000}k`}
                </button>
              ))}
            </div>
          </div>

          {/* Category Visual Grid (For Expense and Income) */}
          {type !== 'TRANSFER' && (
            <div>
              <label className="text-xs font-bold text-[#4A443F] block mb-1.5">
                Danh mục phân loại:
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {availableCategories.map((cat) => {
                  const IconC = getCategoryIconComponent(cat.icon, cat.name);
                  const isSelected = categoryId === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`p-2.5 rounded-2xl border text-left flex flex-col items-center justify-center gap-1.5 transition ${
                        isSelected
                          ? 'border-[#7D8F69] bg-[#7D8F69]/10 text-[#7D8F69] font-bold shadow-2xs'
                          : 'border-[#EAE7DC] bg-[#F9F8F3] text-[#4A443F] hover:bg-[#F1EFE7]'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-[#7D8F69] text-white' : 'bg-[#EAE7DC] text-[#4A443F]'
                        }`}
                      >
                        <IconC className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-semibold text-center line-clamp-1">
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Wallet Selection */}
          {type === 'TRANSFER' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#4A443F] block mb-1">
                  Ví nguồn (Chuyển đi):
                </label>
                <select
                  value={fromWalletId}
                  onChange={(e) => setFromWalletId(e.target.value)}
                  className="w-full p-2.5 text-xs font-semibold rounded-2xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] focus:ring-[#7D8F69]"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatVND(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#4A443F] block mb-1">
                  Ví đích (Nhận tiền):
                </label>
                <select
                  value={toWalletId}
                  onChange={(e) => setToWalletId(e.target.value)}
                  className="w-full p-2.5 text-xs font-semibold rounded-2xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] focus:ring-[#7D8F69]"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatVND(w.balance)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-[#4A443F] block mb-1">
                Tài khoản ví thanh toán:
              </label>
              <select
                value={fromWalletId}
                onChange={(e) => setFromWalletId(e.target.value)}
                className="w-full p-2.5 text-xs font-semibold rounded-2xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] focus:ring-[#7D8F69]"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatVND(w.balance)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Note & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#4A443F] block mb-1">Ghi chú:</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú thêm (VD: Cơm trưa, Xăng xe)..."
                className="w-full p-2.5 text-xs rounded-2xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#4A443F] block mb-1">Ngày giao dịch:</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 text-xs rounded-2xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926]"
              />
            </div>
          </div>

          {error && <p className="text-xs font-bold text-[#D98B72]">{error}</p>}

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-[#8C857D] hover:bg-[#F9F8F3] rounded-2xl transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-extrabold text-white bg-[#7D8F69] hover:bg-[#687856] rounded-2xl shadow-md transition"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu Giao Dịch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
