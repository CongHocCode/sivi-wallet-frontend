/**
 * SIVI WALLET - Add / Edit Wallet Modal
 */

import React, { useState } from 'react';
import { X, Wallet as WalletIcon, Building2, Smartphone, Banknote } from 'lucide-react';
import { apiService } from '../services/api';
import { WalletType } from '../types';
import { parseVNDInput, formatVND } from '../lib/formatters';

interface AddWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_BANKS = ['Vietcombank', 'Techcombank', 'MB Bank', 'VPBank', 'BIDV', 'VietinBank', 'ACB', 'TPBank'];
const PRESET_EWALLETS = ['Ví MoMo', 'ZaloPay', 'Viettel Money', 'ShopeePay'];

export const AddWalletModal: React.FC<AddWalletModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('BANK');
  const [balanceInput, setBalanceInput] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('Vietcombank');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const parsedBalance = parseVNDInput(balanceInput);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên ví');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let icon = 'Wallet';
      let color = '#10B981';

      if (type === 'BANK') {
        icon = 'Building2';
        color = '#3B82F6';
      } else if (type === 'E_WALLET') {
        icon = 'Smartphone';
        color = '#EC4899';
      } else {
        icon = 'Banknote';
        color = '#10B981';
      }

      await apiService.addWallet({
        name,
        type,
        balance: parsedBalance,
        accountNumber: accountNumber || undefined,
        bankName: type === 'BANK' ? bankName : undefined,
        icon,
        color,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo ví');
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
            <WalletIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Thêm Ví / Tài Khoản Mới
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
          {/* Wallet Type Selection */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
              Loại ví / tài khoản:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('BANK');
                  setName('Vietcombank');
                }}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition ${
                  type === 'BANK'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Building2 className="w-5 h-5" /> Ngân Hàng
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('E_WALLET');
                  setName('Ví MoMo');
                }}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition ${
                  type === 'E_WALLET'
                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Smartphone className="w-5 h-5" /> Ví Điện Tử
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('CASH');
                  setName('Tiền Mặt');
                }}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition ${
                  type === 'CASH'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Banknote className="w-5 h-5" /> Tiền Mặt
              </button>
            </div>
          </div>

          {/* Quick presets */}
          {type === 'BANK' && (
            <div>
              <span className="text-[11px] text-slate-400 font-semibold block mb-1">Gợi ý Ngân hàng:</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_BANKS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      setBankName(b);
                      setName(b);
                    }}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-blue-100 dark:hover:bg-blue-900"
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === 'E_WALLET' && (
            <div>
              <span className="text-[11px] text-slate-400 font-semibold block mb-1">Gợi ý Ví điện tử:</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_EWALLETS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setName(w)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-pink-100 dark:hover:bg-pink-900"
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Wallet Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Tên gợi nhớ ví:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Vietcombank Lương, MoMo Chi Tiêu..."
              className="w-full p-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Initial Balance */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Số dư ban đầu:
            </label>
            <div className="relative">
              <input
                type="text"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                placeholder="0 hoặc 5tr, 500k..."
                className="w-full p-2.5 text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <span className="absolute right-3 top-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                = {formatVND(parsedBalance)}
              </span>
            </div>
          </div>

          {/* Account Number */}
          {type !== 'CASH' && (
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Số tài khoản / Số điện thoại ví:
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="1012398765..."
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          )}

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
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-600/20"
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo Ví Mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
