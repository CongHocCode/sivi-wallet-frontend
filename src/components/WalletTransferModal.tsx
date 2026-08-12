/**
 * SIVI WALLET - Internal Wallet Transfer Modal
 */

import React, { useState } from 'react';
import { X, ArrowRightLeft, ArrowRight } from 'lucide-react';
import { apiService } from '../services/api';
import { Wallet } from '../types';
import { formatVND, parseVNDInput } from '../lib/formatters';

interface WalletTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  onSuccess: () => void;
}

export const WalletTransferModal: React.FC<WalletTransferModalProps> = ({
  isOpen,
  onClose,
  wallets,
  onSuccess,
}) => {
  const [fromWalletId, setFromWalletId] = useState(wallets[0]?.id || '');
  const [toWalletId, setToWalletId] = useState(wallets[1]?.id || wallets[0]?.id || '');
  const [amountInput, setAmountInput] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const parsedAmount = parseVNDInput(amountInput);
  const fromWallet = wallets.find((w) => w.id === fromWalletId);
  const toWallet = wallets.find((w) => w.id === toWalletId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromWalletId === toWalletId) {
      setError('Ví nguồn và ví đích không được trùng nhau');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Số tiền chuyển phải lớn hơn 0');
      return;
    }
    if (fromWallet && fromWallet.balance < parsedAmount) {
      setError(`Số dư ví ${fromWallet.name} không đủ (Số dư: ${formatVND(fromWallet.balance)})`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiService.transferWallet(fromWalletId, toWalletId, parsedAmount, note);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi thực hiện chuyển tiền nội bộ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Chuyển Tiền Nội Bộ Giữa Các Ví
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Transfer visual boxes */}
          <div className="grid grid-cols-11 items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="col-span-5 space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Ví gửi:</label>
              <select
                value={fromWalletId}
                onChange={(e) => setFromWalletId(e.target.value)}
                className="w-full p-2 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatVND(w.balance)})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1 flex items-center justify-center pt-4">
              <ArrowRight className="w-4 h-4 text-emerald-500 shrink-0" />
            </div>

            <div className="col-span-5 space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Ví nhận:</label>
              <select
                value={toWalletId}
                onChange={(e) => setToWalletId(e.target.value)}
                className="w-full p-2 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatVND(w.balance)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Số tiền chuyển (ví dụ "500k", "2tr"):
            </label>
            <div className="relative">
              <input
                type="text"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="500k hoặc 2000000"
                className="w-full p-3 text-lg font-black rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="absolute right-3 top-3.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                = {formatVND(parsedAmount)}
              </span>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Ghi chú chuyển khoản:
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Chuyển tiền sang ví MoMo ăn trưa..."
              className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {error && <p className="text-xs font-semibold text-rose-500">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20"
            >
              {isSubmitting ? 'Đang chuyển...' : 'Xác Nhận Chuyển Tiền'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
