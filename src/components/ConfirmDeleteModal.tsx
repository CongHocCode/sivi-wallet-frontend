import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, Wallet as WalletIcon, Calendar } from 'lucide-react';
import { Transaction } from '../types';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void> | void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !transaction) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(String(transaction.id));
      onClose();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(num)) + ' ₫';
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-[#2D2926]/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-[#EAE7DC] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0 shadow-2xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#2D2926] text-base">Xóa Giao Dịch</h3>
              <p className="text-xs text-[#8C857D]">Hành động này sẽ cập nhật lại số dư ví</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8C857D] hover:text-[#2D2926] hover:bg-[#F9F8F3] rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transaction Summary Card */}
        <div className="p-3.5 bg-[#F9F8F3] rounded-2xl border border-[#EAE7DC] space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8C857D] font-medium">Khoản giao dịch:</span>
            <span
              className={`text-sm font-black ${
                transaction.type === 'EXPENSE'
                  ? 'text-[#D98B72]'
                  : transaction.type === 'INCOME'
                  ? 'text-[#7D8F69]'
                  : 'text-blue-600'
              }`}
            >
              {transaction.type === 'EXPENSE' ? '-' : transaction.type === 'INCOME' ? '+' : '↔'}{' '}
              {formatVND(transaction.amount)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8C857D] font-medium">Mô tả / Ghi chú:</span>
            <span className="font-bold text-[#2D2926] truncate max-w-[200px]">
              {transaction.note || transaction.merchantName || 'Giao dịch'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8C857D] font-medium flex items-center gap-1">
              <WalletIcon className="w-3 h-3 text-[#7D8F69]" /> Ví liên quan:
            </span>
            <span className="font-semibold text-[#4A443F]">
              {transaction.walletName || 'Ví thanh toán'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8C857D] font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#8C857D]" /> Ngày ghi nhận:
            </span>
            <span className="text-[#4A443F]">
              {transaction.date || transaction.transactionDate?.slice(0, 10) || 'Hôm nay'}
            </span>
          </div>
        </div>

        {/* Notice */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs mb-5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {transaction.type === 'EXPENSE'
              ? 'Số tiền này sẽ được hoàn lại vào số dư ví của bạn.'
              : transaction.type === 'INCOME'
              ? 'Số tiền này sẽ được khấu trừ khỏi số dư ví của bạn.'
              : 'Giao dịch chuyển tiền sẽ được hoàn tác an toàn.'}
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full py-2.5 px-4 text-xs font-bold text-[#4A443F] bg-[#F1EFE7] hover:bg-[#EAE7DC] rounded-xl transition cursor-pointer border border-[#EAE7DC]"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="w-full py-2.5 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
          </button>
        </div>
      </div>
    </div>
  );
};
