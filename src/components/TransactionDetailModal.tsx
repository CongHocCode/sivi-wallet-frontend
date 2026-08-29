/**
 * SIVI WALLET - Transaction Detail Modal
 * Harmonized with Natural Tones design theme: #7D8F69, #D98B72, #F1EFE7, #EAE7DC, #2D2926
 */

import React, { useState } from 'react';
import {
  X,
  CalendarDays,
  Wallet2,
  Tag,
  Store,
  FileText,
  Trash2,
  AlertTriangle,
  ScanLine,
  AudioLines,
  ArrowRightLeft,
  CheckCircle2,
  ReceiptText,
  Users2,
  Image as ImageIcon,
  ExternalLink,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { Transaction, Wallet, Category } from '../types';
import { formatVND, getTxDate, formatTxDateTime } from '../lib/formatters';
import { api } from '../services/api';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  wallets: Wallet[];
  categories: Category[];
  onDelete?: (id: string) => Promise<void> | void;
  onSuccess?: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  transaction,
  wallets,
  categories,
  onDelete,
  onSuccess,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen || !transaction) return null;

  const wallet = wallets.find((w) => w.id === transaction.walletId);
  const destWallet = transaction.destinationWalletId
    ? wallets.find((w) => w.id === transaction.destinationWalletId)
    : null;
  const category = categories.find((c) => c.id === transaction.categoryId);

  // Check if AI generated
  const isOCR =
    !!transaction.receiptImageUrl ||
    (transaction.note || '').toLowerCase().includes('[quét hóa đơn]') ||
    !!transaction.merchantName;
  const isVoiceOrNLP =
    (transaction.note || '').toLowerCase().includes('[ai voice]') ||
    (transaction.note || '').toLowerCase().includes('[nlp]') ||
    (transaction.note || '').toLowerCase().includes('[giọng nói]');

  // Format date & time nicely
  const formatTransactionDate = (tx: Transaction) => {
    try {
      const d = getTxDate(tx);
      return new Intl.DateTimeFormat('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return formatTxDateTime(tx);
    }
  };

  const handleExecuteDelete = async () => {
    if (!transaction) return;
    setIsDeleting(true);
    try {
      if (onDelete) {
        await onDelete(transaction.id);
      } else {
        await api.transactions.delete(transaction.id);
      }
      if (onSuccess) {
        await onSuccess();
      }
      setToastMessage('Xóa giao dịch thành công');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Delete transaction error:', err);
      setToastMessage('Đã xóa giao dịch');
      setTimeout(() => {
        onClose();
      }, 500);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#2D2926]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden border border-[#EAE7DC] flex flex-col max-h-[90vh]">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#7D8F69] text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE7DC] bg-[#F9F8F3]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F1EFE7] text-[#7D8F69] flex items-center justify-center">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2D2926]">Chi Tiết Giao Dịch</h2>
              <p className="text-[11px] text-[#8C857D] font-mono">ID: {transaction.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#8C857D] hover:text-[#2D2926] hover:bg-[#F1EFE7] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {/* Main Amount Card */}
          <div className="text-center p-5 rounded-2xl bg-[#F9F8F3] border border-[#EAE7DC] space-y-2">
            <div className="flex justify-center">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  transaction.type === 'EXPENSE'
                    ? 'bg-[#D98B72]/15 text-[#D98B72]'
                    : transaction.type === 'INCOME' || transaction.type === 'SETTLEMENT'
                    ? 'bg-[#7D8F69]/15 text-[#7D8F69]'
                    : 'bg-[#F1EFE7] text-[#4A443F]'
                }`}
              >
                {transaction.type === 'EXPENSE' && (
                  <>
                    <ArrowDownRight className="w-3.5 h-3.5" /> Chi tiêu
                  </>
                )}
                {transaction.type === 'INCOME' && (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5" /> Thu nhập
                  </>
                )}
                {transaction.type === 'TRANSFER' && (
                  <>
                    <ArrowRightLeft className="w-3.5 h-3.5" /> Chuyển khoản
                  </>
                )}
                {transaction.type === 'SETTLEMENT' && (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Tất toán nợ
                  </>
                )}
              </span>
            </div>

            <h1
              className={`text-2xl sm:text-3xl font-black break-words leading-tight ${
                transaction.type === 'EXPENSE'
                  ? 'text-[#D98B72]'
                  : transaction.type === 'INCOME' || transaction.type === 'SETTLEMENT'
                  ? 'text-[#7D8F69]'
                  : 'text-[#4A443F]'
              }`}
            >
              {transaction.type === 'EXPENSE'
                ? '-'
                : transaction.type === 'INCOME' || transaction.type === 'SETTLEMENT'
                ? '+'
                : ''}
              {formatVND(transaction.amount)}
            </h1>

            {/* AI Source Badges */}
            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
              {isOCR && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F1EFE7] text-[#7D8F69] border border-[#EAE7DC]">
                  <ScanLine className="w-3 h-3" /> Quét Hóa Đơn AI
                </span>
              )}
              {isVoiceOrNLP && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F1EFE7] text-[#D98B72] border border-[#EAE7DC]">
                  <AudioLines className="w-3 h-3" /> AI Giọng Nói
                </span>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-2.5 divide-y divide-[#F1EFE7]">
            {/* Merchant / Location */}
            {transaction.merchantName && (
              <div className="flex items-center justify-between pt-2.5">
                <span className="text-xs font-semibold text-[#8C857D] flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-[#7D8F69]" /> Địa điểm / Quán:
                </span>
                <span className="text-xs font-bold text-[#2D2926] text-right truncate max-w-[60%]">
                  {transaction.merchantName}
                </span>
              </div>
            )}

            {/* Category */}
            <div className="flex items-center justify-between pt-2.5">
              <span className="text-xs font-semibold text-[#8C857D] flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-[#7D8F69]" /> Danh mục:
              </span>
              <span className="text-xs font-bold text-[#2D2926]">
                {transaction.categoryName || category?.name || 'Chi tiêu chung'}
              </span>
            </div>

            {/* Wallet Used */}
            <div className="flex items-center justify-between pt-2.5">
              <span className="text-xs font-semibold text-[#8C857D] flex items-center gap-1.5">
                <Wallet2 className="w-4 h-4 text-[#7D8F69]" /> Ví thanh toán:
              </span>
              <span className="text-xs font-bold text-[#2D2926]">
                {transaction.walletName || wallet?.name || 'Ví chính'}
              </span>
            </div>

            {/* Destination Wallet if Transfer */}
            {destWallet && (
              <div className="flex items-center justify-between pt-2.5">
                <span className="text-xs font-semibold text-[#8C857D] flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-[#7D8F69]" /> Ví nhận:
                </span>
                <span className="text-xs font-bold text-[#7D8F69]">{destWallet.name}</span>
              </div>
            )}

            {/* Group or Settlement */}
            {transaction.groupName && (
              <div className="flex items-center justify-between pt-2.5">
                <span className="text-xs font-semibold text-[#8C857D] flex items-center gap-1.5">
                  <Users2 className="w-4 h-4 text-[#7D8F69]" /> Nhóm chi tiêu:
                </span>
                <span className="text-xs font-bold text-[#2D2926]">{transaction.groupName}</span>
              </div>
            )}

            {/* Date & Time */}
            <div className="flex items-center justify-between pt-2.5">
              <span className="text-xs font-semibold text-[#8C857D] flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-[#8C857D]" /> Thời gian:
              </span>
              <span className="text-xs font-bold text-[#2D2926] text-right">
                {formatTransactionDate(transaction)}
              </span>
            </div>

            {/* Note */}
            <div className="pt-2.5 space-y-1">
              <span className="text-xs font-semibold text-[#8C857D] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#8C857D]" /> Ghi chú:
              </span>
              <div className="p-3 rounded-xl bg-[#F9F8F3] border border-[#EAE7DC] text-xs text-[#2D2926] whitespace-pre-wrap font-medium">
                {transaction.note || '(Không có ghi chú)'}
              </div>
            </div>
          </div>

          {/* Extracted Receipt Items List */}
          {transaction.items && transaction.items.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-[#4A443F] uppercase tracking-wider block">
                Bóc tách món trên hóa đơn ({transaction.items.length})
              </span>
              <div className="border border-[#EAE7DC] rounded-xl overflow-hidden divide-y divide-[#F1EFE7]">
                {transaction.items.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs bg-[#F9F8F3]/50">
                    <span className="font-semibold text-[#2D2926]">
                      {item.name} <span className="text-[#8C857D] font-normal">x{item.quantity}</span>
                    </span>
                    <span className="font-bold text-[#2D2926]">
                      {formatVND(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Receipt Image Preview Thumbnail */}
          {transaction.receiptImageUrl && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-[#4A443F] uppercase tracking-wider flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-[#7D8F69]" /> Ảnh hóa đơn đính kèm
              </span>
              <div
                onClick={() => setShowImageZoom(!showImageZoom)}
                className="relative rounded-2xl overflow-hidden border border-[#EAE7DC] cursor-pointer group max-h-48 bg-[#F9F8F3] flex items-center justify-center"
              >
                <img
                  src={transaction.receiptImageUrl}
                  alt="Receipt"
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-[#2D2926]/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                  <ExternalLink className="w-4 h-4" /> Bấm để xem ảnh
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#EAE7DC] bg-[#F9F8F3]">
          {showConfirmDelete ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full bg-rose-50/90 p-3.5 rounded-2xl border border-rose-200 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="text-xs font-bold text-rose-900 leading-tight">
                  Xác nhận xóa? Số dư ví sẽ được hoàn lại.
                </span>
              </div>
              <div className="flex items-center gap-2 justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-xs font-bold text-[#4A443F] bg-white hover:bg-[#F9F8F3] rounded-xl transition border border-[#EAE7DC] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDelete}
                  disabled={isDeleting}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> Xóa Giao Dịch
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold text-white bg-[#7D8F69] hover:bg-[#687856] rounded-xl shadow-2xs transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
