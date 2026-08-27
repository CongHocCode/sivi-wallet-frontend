/**
 * SIVI WALLET - Unified Add/Edit Transaction & Internal Transfer Modal
 * Supporting EXPENSE, INCOME, and TRANSFER types with rich category chips & presets.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowRight,
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Receipt,
  Sparkles,
  HeartPulse,
  Wallet as WalletIcon,
  TrendingUp,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { Wallet, Category, TransactionType } from '../types';
import { formatVND, parseVNDInput } from '../lib/formatters';

export type AddTransactionTab = 'expense' | 'income' | 'transfer' | 'EXPENSE' | 'INCOME' | 'TRANSFER';

export interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  categories: Category[];
  onSuccess: () => void;
  initialTab?: AddTransactionTab;
  preselectedWalletId?: string | number;
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

const normalizeTab = (tab?: string): TransactionType => {
  const t = (tab || 'expense').toUpperCase();
  if (t === 'INCOME') return 'INCOME';
  if (t === 'TRANSFER') return 'TRANSFER';
  return 'EXPENSE';
};

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  wallets,
  categories,
  onSuccess,
  initialTab = 'expense',
  preselectedWalletId,
}) => {
  const [type, setType] = useState<TransactionType>(normalizeTab(initialTab));
  const [amountInput, setAmountInput] = useState('');
  const [fromWalletId, setFromWalletId] = useState<string>('');
  const [toWalletId, setToWalletId] = useState<string>('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      const normalizedType = normalizeTab(initialTab);
      setType(normalizedType);
      setError(null);
      setAmountInput('');
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);

      // Set initial wallet IDs
      const targetPreselected = preselectedWalletId ? String(preselectedWalletId) : '';
      const validFrom =
        wallets.find((w) => w.id === targetPreselected)?.id ||
        wallets[0]?.id ||
        '';

      setFromWalletId(validFrom);

      // Default toWalletId to a different wallet if possible
      const otherWallet = wallets.find((w) => w.id !== validFrom);
      setToWalletId(otherWallet ? otherWallet.id : validFrom);
    }
  }, [isOpen, initialTab, preselectedWalletId, wallets]);

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
  const selectedFromWallet = wallets.find((w) => w.id === fromWalletId);
  const selectedToWallet = wallets.find((w) => w.id === toWalletId);

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
        if (selectedFromWallet && selectedFromWallet.balance < parsedAmount) {
          throw new Error(`Số dư ví "${selectedFromWallet.name}" (${formatVND(selectedFromWallet.balance)}) không đủ để chuyển ${formatVND(parsedAmount)}`);
        }

        await api.wallets.transfer({
          fromWalletId,
          toWalletId,
          amount: parsedAmount,
          note: note || `Chuyển tiền sang ví ${selectedToWallet?.name || ''}`,
        });
      } else {
        if (!fromWalletId) {
          throw new Error('Vui lòng chọn ví thanh toán');
        }

        const selectedCategory = categories.find((c) => c.id === categoryId);
        const transactionDate = new Date(date || Date.now()).toISOString().slice(0, 19);

        await api.transactions.create({
          walletId: fromWalletId,
          walletName: selectedFromWallet?.name,
          categoryId: selectedCategory?.id,
          categoryName: selectedCategory?.name || (type === 'EXPENSE' ? 'Chi tiêu' : 'Thu nhập'),
          categoryIcon: selectedCategory?.icon || 'Tag',
          amount: parsedAmount,
          type,
          note: note || (type === 'EXPENSE' ? 'Chi tiêu cá nhân' : 'Thu nhập'),
          date: transactionDate,
          transactionDate,
        });
      }

      onSuccess();
      onClose();
      // Reset form
      setAmountInput('');
      setNote('');
    } catch (err: any) {
      // Keep modal open on error – show API error message
      const apiMsg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu giao dịch';
      setError(apiMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#2D2926]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden border border-[#EAE7DC] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAE7DC] bg-[#F9F8F3] shrink-0">
          <h2 className="text-sm font-extrabold text-[#2D2926] flex items-center gap-2">
            {type === 'TRANSFER' ? (
              <>
                <ArrowRightLeft className="w-5 h-5 text-[#4A443F]" /> Chuyển Tiền Nội Bộ Giữa Các Ví
              </>
            ) : type === 'INCOME' ? (
              <>
                <ArrowDownLeft className="w-5 h-5 text-[#7D8F69]" /> Thêm Khoản Thu Nhập
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-[#D98B72]" /> Thêm Khoản Chi Tiêu
              </>
            )}
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
                  ? 'bg-[#4A443F] text-white shadow-xs'
                  : 'text-[#8C857D] hover:text-[#2D2926]'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Chuyển Ví
            </button>
          </div>

          {/* TRANSFER VISUAL WALLET SELECTOR */}
          {type === 'TRANSFER' ? (
            <div className="grid grid-cols-11 items-center gap-2 p-3.5 bg-[#F9F8F3] rounded-2xl border border-[#EAE7DC]">
              <div className="col-span-5 space-y-1">
                <label className="text-[10px] font-bold text-[#8C857D] uppercase tracking-wider block">
                  Ví gửi (Nguồn):
                </label>
                <select
                  value={fromWalletId}
                  onChange={(e) => setFromWalletId(e.target.value)}
                  className="w-full p-2 text-xs font-bold rounded-xl bg-white border border-[#EAE7DC] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatVND(w.balance)})
                    </option>
                  ))}
                </select>
                {selectedFromWallet && (
                  <span className="text-[10px] text-[#8C857D] block truncate">
                    Số dư: <b className="text-[#2D2926]">{formatVND(selectedFromWallet.balance)}</b>
                  </span>
                )}
              </div>

              <div className="col-span-1 flex items-center justify-center pt-2">
                <ArrowRight className="w-4 h-4 text-[#7D8F69] shrink-0" />
              </div>

              <div className="col-span-5 space-y-1">
                <label className="text-[10px] font-bold text-[#8C857D] uppercase tracking-wider block">
                  Ví nhận (Đích):
                </label>
                <select
                  value={toWalletId}
                  onChange={(e) => setToWalletId(e.target.value)}
                  className="w-full p-2 text-xs font-bold rounded-xl bg-white border border-[#EAE7DC] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatVND(w.balance)})
                    </option>
                  ))}
                </select>
                {selectedToWallet && (
                  <span className="text-[10px] text-[#8C857D] block truncate">
                    Số dư: <b className="text-[#2D2926]">{formatVND(selectedToWallet.balance)}</b>
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* EXPENSE / INCOME WALLET SELECTOR */
            <div>
              <label className="text-xs font-bold text-[#4A443F] block mb-1">
                Tài khoản ví thanh toán:
              </label>
              <select
                value={fromWalletId}
                onChange={(e) => setFromWalletId(e.target.value)}
                className="w-full p-2.5 text-xs font-bold rounded-2xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} (Khả dụng: {formatVND(w.balance)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Amount input + Presets */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#4A443F]">
                {type === 'TRANSFER' ? 'Số tiền chuyển:' : 'Số tiền giao dịch:'}
              </label>
              <span
                className={`text-xs font-black ${
                  type === 'EXPENSE'
                    ? 'text-[#D98B72]'
                    : type === 'INCOME'
                    ? 'text-[#7D8F69]'
                    : 'text-[#4A443F]'
                }`}
              >
                = {formatVND(parsedAmount)}
              </span>
            </div>
            <input
              type="text"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder='Nhập số tiền (VD: "50k", "500k", "1.5tr")'
              className="w-full p-3 text-xl font-black rounded-2xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
              autoFocus
            />

            {/* Quick Amount Preset Chips */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar pb-1">
              {[20000, 50000, 100000, 200000, 500000, 1000000, 2000000].map((preset) => (
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
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto no-scrollbar p-0.5">
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
                          ? 'border-[#7D8F69] bg-[#7D8F69]/10 text-[#7D8F69] font-bold shadow-2xs ring-1 ring-[#7D8F69]'
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

          {/* Note & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#4A443F] block mb-1">
                {type === 'TRANSFER' ? 'Ghi chú chuyển khoản:' : 'Ghi chú giao dịch:'}
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  type === 'TRANSFER'
                    ? `Chuyển tiền sang ${selectedToWallet?.name || 'ví'}`
                    : 'Ghi chú thêm (VD: Cơm trưa, Xăng xe)...'
                }
                className="w-full p-2.5 text-xs rounded-2xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#4A443F] block mb-1">Ngày giao dịch:</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 text-xs rounded-2xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-[#D98B72]/10 border border-[#D98B72]/30 text-[#D98B72] text-xs flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
              className={`px-6 py-2.5 text-xs font-extrabold text-white rounded-2xl shadow-md transition ${
                type === 'TRANSFER'
                  ? 'bg-[#4A443F] hover:bg-[#2D2926]'
                  : type === 'INCOME'
                  ? 'bg-[#7D8F69] hover:bg-[#687856]'
                  : 'bg-[#D98B72] hover:bg-[#C27961]'
              }`}
            >
              {isSubmitting
                ? 'Đang xử lý...'
                : type === 'TRANSFER'
                ? 'Xác Nhận Chuyển Tiền'
                : 'Lưu Giao Dịch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
