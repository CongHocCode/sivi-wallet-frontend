/**
 * SIVI WALLET - Transaction Detail Modal
 */

import React, { useState } from 'react';
import {
  X,
  Calendar,
  Wallet as WalletIcon,
  Tag,
  Store,
  FileText,
  Trash2,
  Sparkles,
  Camera,
  Mic,
  ArrowRightLeft,
  CheckCircle2,
  Receipt,
  Users,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import { Transaction, Wallet, Category } from '../types';
import { formatVND } from '../lib/formatters';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  wallets: Wallet[];
  categories: Category[];
  onDelete?: (id: string) => Promise<void> | void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  transaction,
  wallets,
  categories,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);

  if (!isOpen || !transaction) return null;

  const wallet = wallets.find((w) => w.id === transaction.walletId);
  const destWallet = transaction.destinationWalletId
    ? wallets.find((w) => w.id === transaction.destinationWalletId)
    : null;
  const category = categories.find((c) => c.id === transaction.categoryId);

  // Check if AI generated
  const isOCR =
    !!transaction.receiptImageUrl ||
    transaction.note.toLowerCase().includes('[quét hóa đơn]') ||
    !!transaction.merchantName;
  const isVoiceOrNLP =
    transaction.note.toLowerCase().includes('[ai voice]') ||
    transaction.note.toLowerCase().includes('[nlp]') ||
    transaction.note.toLowerCase().includes('[giọng nói]');

  // Format date & time nicely
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return new Intl.DateTimeFormat('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa giao dịch này? Số dư ví sẽ được hoàn lại tự động.')) {
      setIsDeleting(true);
      try {
        await onDelete(transaction.id);
        onClose();
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#7D8F69]/10 text-[#7D8F69]">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2D2926] dark:text-white">Chi Tiết Giao Dịch</h2>
              <p className="text-[11px] text-[#8C857D] dark:text-slate-400 font-mono">ID: {transaction.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Main Amount Card */}
          <div className="text-center p-5 rounded-2xl bg-[#F9F8F3] dark:bg-slate-800/60 border border-[#EAE7DC] dark:border-slate-700/60 space-y-2">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                transaction.type === 'EXPENSE'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                  : transaction.type === 'INCOME' || transaction.type === 'SETTLEMENT'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
              }`}
            >
              {transaction.type === 'EXPENSE' && '💸 Chi tiêu'}
              {transaction.type === 'INCOME' && '💰 Thu nhập'}
              {transaction.type === 'TRANSFER' && '↔ Chuyển khoản'}
              {transaction.type === 'SETTLEMENT' && '🤝 Tất toán nợ'}
            </span>

            <h1
              className={`text-3xl font-black ${
                transaction.type === 'EXPENSE'
                  ? 'text-[#D98B72] dark:text-rose-400'
                  : transaction.type === 'INCOME' || transaction.type === 'SETTLEMENT'
                  ? 'text-[#7D8F69] dark:text-emerald-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}
            >
              {transaction.type === 'EXPENSE' ? '-' : transaction.type === 'INCOME' || transaction.type === 'SETTLEMENT' ? '+' : ''}
              {formatVND(transaction.amount)}
            </h1>

            {/* AI Source Badges */}
            <div className="flex items-center justify-center gap-2 pt-1">
              {isOCR && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <Camera className="w-3 h-3" /> 📸 Quét Hóa Đơn AI
                </span>
              )}
              {isVoiceOrNLP && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                  <Mic className="w-3 h-3" /> 🗣️ Giọng nói / NLP
                </span>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
            {/* Merchant / Location */}
            {transaction.merchantName && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-[#8C857D] dark:text-slate-400 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-amber-500" /> Cửa hàng / Địa điểm:
                </span>
                <span className="text-xs font-bold text-[#2D2926] dark:text-white">{transaction.merchantName}</span>
              </div>
            )}

            {/* Category */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-semibold text-[#8C857D] dark:text-slate-400 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-[#7D8F69]" /> Danh mục:
              </span>
              <span className="text-xs font-bold text-[#2D2926] dark:text-white">
                {transaction.categoryName || category?.name || 'Chung'}
              </span>
            </div>

            {/* Wallet Used */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-semibold text-[#8C857D] dark:text-slate-400 flex items-center gap-1.5">
                <WalletIcon className="w-4 h-4 text-[#7D8F69]" /> Ví thanh toán:
              </span>
              <span className="text-xs font-bold text-[#2D2926] dark:text-white">
                {transaction.walletName || wallet?.name || 'Ví mặc định'}
              </span>
            </div>

            {/* Destination Wallet if Transfer */}
            {destWallet && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-[#8C857D] dark:text-slate-400 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-blue-500" /> Ví nhận:
                </span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{destWallet.name}</span>
              </div>
            )}

            {/* Group or Settlement */}
            {transaction.groupName && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-[#8C857D] dark:text-slate-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#7D8F69]" /> Nhóm chi tiêu:
                </span>
                <span className="text-xs font-bold text-[#2D2926] dark:text-white">{transaction.groupName}</span>
              </div>
            )}

            {/* Date & Time */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-semibold text-[#8C857D] dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-500" /> Thời gian:
              </span>
              <span className="text-xs font-bold text-[#2D2926] dark:text-white text-right">
                {formatDate(transaction.date)}
              </span>
            </div>

            {/* Note */}
            <div className="pt-2 space-y-1">
              <span className="text-xs font-semibold text-[#8C857D] dark:text-slate-400 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500" /> Ghi chú:
              </span>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-medium">
                {transaction.note || '(Không có ghi chú)'}
              </div>
            </div>
          </div>

          {/* Extracted Receipt Items List */}
          {transaction.items && transaction.items.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Chi tiết các món đã bóc tách ({transaction.items.length})
              </span>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {transaction.items.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs bg-slate-50/50 dark:bg-slate-800/30">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {item.name} <span className="text-slate-400 font-normal">x{item.quantity}</span>
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
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
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" /> Ảnh hóa đơn đính kèm
              </span>
              <div
                onClick={() => setShowImageZoom(!showImageZoom)}
                className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer group max-h-48 bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
              >
                <img
                  src={transaction.receiptImageUrl}
                  alt="Receipt"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                  <ExternalLink className="w-4 h-4" /> Bấm để xem rõ
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          {onDelete ? (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> {isDeleting ? 'Đang xóa...' : 'Xóa Giao Dịch'}
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-white bg-[#7D8F69] hover:bg-[#687856] rounded-xl shadow-md transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
