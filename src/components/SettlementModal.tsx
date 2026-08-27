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
  const [selectedWalletId, setSelectedWalletId] = useState(wallets[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !debt) return null;

  const handleSettle = async () => {
    if (!selectedWalletId) {
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
        selectedWalletId,
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAE7DC] bg-[#F9F8F3]">
          <h2 className="text-sm font-extrabold text-[#2D2926] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#7D8F69]" /> Xác Nhận Thanh Toán Khoản Nợ
          </h2>
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
          <div className="p-4 rounded-2xl bg-[#F9F8F3] border border-[#EAE7DC] space-y-3">
            <span className="text-[11px] font-bold text-[#8C857D] uppercase tracking-wider block">
              Nhóm: {debt.groupName}
            </span>

            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <span className="text-[11px] text-[#8C857D] block">Người trả:</span>
                <p className="font-bold text-[#D98B72] text-sm">{debt.debtorName}</p>
              </div>

              <div className="flex flex-col items-center px-3">
                <ArrowRight className="w-5 h-5 text-[#7D8F69]" />
              </div>

              <div className="text-center flex-1">
                <span className="text-[11px] text-[#8C857D] block">Người nhận:</span>
                <p className="font-bold text-[#7D8F69] text-sm">{debt.creditorName}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#EAE7DC] text-center">
              <span className="text-xs text-[#8C857D] block">Số tiền thanh toán:</span>
              <p className="text-2xl font-black text-[#D98B72]">
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
              value={selectedWalletId}
              onChange={(e) => setSelectedWalletId(e.target.value)}
              className="w-full p-2.5 text-xs font-bold rounded-xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] focus:outline-none focus:ring-2 focus:ring-[#7D8F69]"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (Số dư hiện tại: {formatVND(w.balance)})
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs font-semibold text-[#D98B72]">{error}</p>}

          <button
            onClick={handleSettle}
            disabled={isSubmitting}
            className="w-full py-3 text-xs font-bold text-white bg-[#7D8F69] hover:bg-[#687856] rounded-xl shadow-md flex items-center justify-center gap-2 transition"
          >
            {isSubmitting ? 'Đang thực hiện...' : 'Xác Nhận Đã Nhận Tiền & Cập Nhật Số Dư'}
          </button>
        </div>
      </div>
    </div>
  );
};

