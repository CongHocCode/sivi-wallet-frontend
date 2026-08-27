/**
 * SIVI WALLET - Settlement Modal
 */

import React, { useState } from 'react';
import { X, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { DebtSummary, Wallet } from '../types';
import { formatVND } from '../lib/formatters';

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtSummary | null;
  wallets: Wallet[];
  onSuccess: () => void;
}

export const SettlementModal: React.FC<SettlementModalProps> = ({
  isOpen,
  onClose,
  debt,
  wallets,
  onSuccess,
}) => {
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync selected wallet to first available wallet when opening or when wallets load
  React.useEffect(() => {
    if (isOpen && wallets && wallets.length > 0) {
      const exists = wallets.some((w) => w.id === selectedWalletId);
      if (!selectedWalletId || !exists) {
        setSelectedWalletId(wallets[0].id);
      }
      setError(null);
    }
  }, [isOpen, wallets, selectedWalletId]);

  if (!isOpen || !debt) return null;

  const effectiveWalletId = selectedWalletId || wallets[0]?.id || '';

  const handleSettle = async () => {
    if (!effectiveWalletId) {
      setError('Vui lòng chọn ví nhận tiền thanh toán');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.bills.settleDebt(
        debt.debtorName,
        debt.creditorName,
        debt.amount,
        effectiveWalletId,
        debt.groupName
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi thanh toán khoản nợ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#2D2926]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden border border-[#EAE7DC]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAE7DC] bg-[#FAF9F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#7D8F69]/15 text-[#7D8F69] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#2D2926]">
                Xác Nhận Tất Toán Nợ
              </h2>
              <p className="text-[11px] text-[#8C857D]">
                Ghi nhận thanh toán và cập nhật số dư ví thực tế
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8C857D] hover:text-[#2D2926] hover:bg-[#EAE7DC] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Debt Summary Box */}
          <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#EAE7DC] space-y-3">
            <span className="text-[11px] font-bold text-[#8C857D] uppercase tracking-wider block">
              Nhóm: {debt.groupName}
            </span>

            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <span className="text-[11px] text-[#8C857D] block font-medium">Người trả:</span>
                <p className="font-bold text-[#D98B72] text-sm">{debt.debtorName}</p>
              </div>

              <div className="flex flex-col items-center px-3">
                <ArrowRight className="w-4 h-4 text-[#7D8F69]" />
              </div>

              <div className="text-center flex-1">
                <span className="text-[11px] text-[#8C857D] block font-medium">Người nhận:</span>
                <p className="font-bold text-[#7D8F69] text-sm">{debt.creditorName}</p>
              </div>
            </div>

            <div className="pt-2.5 border-t border-[#EAE7DC] text-center">
              <span className="text-xs text-[#8C857D] block font-medium">Số tiền thanh toán:</span>
              <p className="text-2xl font-black text-[#D98B72] mt-0.5">
                {formatVND(debt.amount)}
              </p>
            </div>
          </div>

          {/* Select wallet to deposit settlement */}
          <div>
            <label className="text-xs font-bold text-[#4A443F] block mb-1">
              Ghi nhận số tiền này vào ví nào của bạn?
            </label>
            <select
              value={effectiveWalletId}
              onChange={(e) => {
                setSelectedWalletId(e.target.value);
                setError(null);
              }}
              className="w-full p-2.5 text-xs font-bold rounded-2xl border border-[#EAE7DC] bg-[#FAF9F5] text-[#2D2926] focus:outline-none focus:ring-2 focus:ring-[#7D8F69]"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (Số dư hiện tại: {formatVND(w.balance)})
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-[#D98B72]/15 border border-[#D98B72]/30 text-xs font-bold text-[#D98B72] animate-in fade-in">
              {error}
            </div>
          )}

          <button
            onClick={handleSettle}
            disabled={isSubmitting}
            className="w-full py-3 text-xs font-bold text-white bg-[#7D8F69] hover:bg-[#687856] rounded-2xl shadow-xs flex items-center justify-center gap-2 transition"
          >
            {isSubmitting ? 'Đang thực hiện...' : 'Xác Nhận Đã Nhận Tiền & Cập Nhật Số Dư'}
          </button>
        </div>
      </div>
    </div>
  );
};

