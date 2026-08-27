/**
 * SIVI WALLET - Add / Edit Wallet Modal
 */

import React, { useState } from 'react';
import { X, Wallet as WalletIcon, Building2, Smartphone, Banknote } from 'lucide-react';
import { api } from '../services/api';
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

      await api.wallets.create({
        name: name.trim(),
        type,
        balance: parsedBalance,
        accountNumber: accountNumber ? accountNumber.trim() : undefined,
        bankName: type === 'BANK' ? bankName : undefined,
        icon,
        color,
      });

      onSuccess();
      onClose();
      // Reset form
      setName('');
      setBalanceInput('');
      setAccountNumber('');
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo ví');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#2D2926]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden border border-[#EAE7DC] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAE7DC] bg-[#FAF9F5] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#7D8F69]/15 text-[#7D8F69] flex items-center justify-center">
              <WalletIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#2D2926]">
                Thêm Ví / Tài Khoản Mới
              </h2>
              <p className="text-[11px] text-[#8C857D]">
                Quản lý tiền mặt, ngân hàng hoặc ví điện tử
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8C857D] hover:text-[#2D2926] hover:bg-[#EAE7DC] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Wallet Type Selection */}
          <div>
            <label className="text-xs font-bold text-[#4A443F] block mb-2">
              Loại ví / tài khoản:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('BANK');
                  setName('Vietcombank');
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 text-xs font-bold transition ${
                  type === 'BANK'
                    ? 'border-[#7D8F69] bg-[#7D8F69]/10 text-[#2D2926] ring-1 ring-[#7D8F69]'
                    : 'border-[#EAE7DC] bg-[#FAF9F5] text-[#8C857D] hover:bg-[#F1EFE7]'
                }`}
              >
                <Building2 className="w-5 h-5 text-[#7D8F69]" /> Ngân Hàng
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('E_WALLET');
                  setName('Ví MoMo');
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 text-xs font-bold transition ${
                  type === 'E_WALLET'
                    ? 'border-[#D98B72] bg-[#D98B72]/10 text-[#2D2926] ring-1 ring-[#D98B72]'
                    : 'border-[#EAE7DC] bg-[#FAF9F5] text-[#8C857D] hover:bg-[#F1EFE7]'
                }`}
              >
                <Smartphone className="w-5 h-5 text-[#D98B72]" /> Ví Điện Tử
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('CASH');
                  setName('Tiền Mặt');
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 text-xs font-bold transition ${
                  type === 'CASH'
                    ? 'border-[#4A443F] bg-[#4A443F]/10 text-[#2D2926] ring-1 ring-[#4A443F]'
                    : 'border-[#EAE7DC] bg-[#FAF9F5] text-[#8C857D] hover:bg-[#F1EFE7]'
                }`}
              >
                <Banknote className="w-5 h-5 text-[#4A443F]" /> Tiền Mặt
              </button>
            </div>
          </div>

          {/* Quick presets */}
          {type === 'BANK' && (
            <div>
              <span className="text-[11px] text-[#8C857D] font-bold block mb-1">Gợi ý Ngân hàng:</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_BANKS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      setBankName(b);
                      setName(b);
                    }}
                    className="px-2.5 py-1 text-xs rounded-xl bg-[#FAF9F5] border border-[#EAE7DC] text-[#4A443F] font-semibold hover:bg-[#EAE7DC] transition"
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === 'E_WALLET' && (
            <div>
              <span className="text-[11px] text-[#8C857D] font-bold block mb-1">Gợi ý Ví điện tử:</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_EWALLETS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setName(w)}
                    className="px-2.5 py-1 text-xs rounded-xl bg-[#FAF9F5] border border-[#EAE7DC] text-[#4A443F] font-semibold hover:bg-[#EAE7DC] transition"
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Wallet Name */}
          <div>
            <label className="text-xs font-bold text-[#4A443F] block mb-1">
              Tên gợi nhớ ví: <span className="text-[#D98B72]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Vietcombank Lương, MoMo Chi Tiêu..."
              className="w-full p-2.5 text-xs font-semibold rounded-2xl border border-[#EAE7DC] bg-[#FAF9F5] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
            />
          </div>

          {/* Initial Balance */}
          <div>
            <label className="text-xs font-bold text-[#4A443F] block mb-1">
              Số dư ban đầu:
            </label>
            <div className="relative">
              <input
                type="text"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                placeholder="0 hoặc 5tr, 500k..."
                className="w-full p-2.5 text-sm font-bold rounded-2xl border border-[#EAE7DC] bg-[#FAF9F5] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none pr-28"
              />
              <span className="absolute right-3 top-2.5 text-xs font-bold text-[#7D8F69] truncate max-w-[100px]">
                = {formatVND(parsedBalance)}
              </span>
            </div>
          </div>

          {/* Account Number */}
          {type !== 'CASH' && (
            <div>
              <label className="text-xs font-bold text-[#4A443F] block mb-1">
                Số tài khoản / Số điện thoại ví:
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="1012398765..."
                className="w-full p-2.5 text-xs rounded-2xl border border-[#EAE7DC] bg-[#FAF9F5] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
              />
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-xl bg-[#D98B72]/15 border border-[#D98B72]/30 text-xs font-bold text-[#D98B72] animate-in fade-in">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#8C857D] hover:bg-[#FAF9F5] rounded-xl transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-extrabold text-white bg-[#7D8F69] hover:bg-[#687856] rounded-xl shadow-xs transition"
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo Ví Mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
