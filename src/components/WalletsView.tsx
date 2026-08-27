/**
 * SIVI WALLET - Wallets Management View & Statement Drawer ("Quản Lý Ví & Sao Kê Từng Ví")
 * Harmonized with Natural Tones design theme: #7D8F69, #D98B72, #F1EFE7, #EAE7DC, #2D2926
 */

import React, { useState, useMemo } from 'react';
import {
  Wallet as WalletIcon,
  Building2,
  Smartphone,
  Banknote,
  Plus,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  Edit2,
  Trash2,
  X,
  Search,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Clock,
  Sparkles,
  Camera,
  Layers,
  TrendingUp,
  TrendingDown,
  ChevronRight,
} from 'lucide-react';
import { Wallet, Transaction, Category } from '../types';
import { formatVND, formatVNDShort } from '../lib/formatters';
import { apiService } from '../services/api';

interface WalletsViewProps {
  wallets: Wallet[];
  transactions: Transaction[];
  categories: Category[];
  totalBalance: number;
  onRefreshData: () => Promise<void> | void;
  onOpenAddWallet: () => void;
  onOpenTransfer: (preselectedWalletId?: string) => void;
  onOpenAddTransaction: (walletId?: string, tab?: 'expense' | 'income' | 'transfer') => void;
  onSelectTransactionDetail?: (tx: Transaction) => void;
}

export const WalletsView: React.FC<WalletsViewProps> = ({
  wallets,
  transactions,
  categories,
  totalBalance,
  onRefreshData,
  onOpenAddWallet,
  onOpenTransfer,
  onOpenAddTransaction,
  onSelectTransactionDetail,
}) => {
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBankName, setEditBankName] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Statement search & filter state
  const [statementSearch, setStatementSearch] = useState('');
  const [statementFilter, setStatementFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER'>('ALL');

  // Currently selected wallet
  const selectedWallet = useMemo(() => {
    return wallets.find((w) => w.id === selectedWalletId) || null;
  }, [wallets, selectedWalletId]);

  // When opening wallet detail drawer
  const handleOpenWalletDrawer = (wallet: Wallet) => {
    setSelectedWalletId(wallet.id);
    setIsEditing(false);
    setEditName(wallet.name);
    setEditBankName(wallet.bankName || '');
    setEditAccountNumber(wallet.accountNumber || '');
    setEditError(null);
    setStatementSearch('');
    setStatementFilter('ALL');
  };

  const handleCloseWalletDrawer = () => {
    setSelectedWalletId(null);
    setIsEditing(false);
  };

  // Calculate statistics for the selected wallet
  const walletStats = useMemo(() => {
    if (!selectedWallet) return { inflow: 0, outflow: 0, net: 0, txCount: 0 };

    let inflow = 0;
    let outflow = 0;
    let count = 0;

    transactions.forEach((tx) => {
      const isSource = tx.walletId === selectedWallet.id;
      const isDestination = tx.destinationWalletId === selectedWallet.id;

      if (isSource || isDestination) {
        count++;
        if (tx.type === 'INCOME') {
          if (isSource) inflow += tx.amount;
        } else if (tx.type === 'EXPENSE') {
          if (isSource) outflow += tx.amount;
        } else if (tx.type === 'TRANSFER') {
          if (isSource && !isDestination) outflow += tx.amount;
          if (isDestination && !isSource) inflow += tx.amount;
        } else if (tx.type === 'SETTLEMENT') {
          if (isSource) inflow += tx.amount;
        }
      }
    });

    return {
      inflow,
      outflow,
      net: inflow - outflow,
      txCount: count,
    };
  }, [selectedWallet, transactions]);

  // Filter statement transactions for selected wallet
  const walletTransactions = useMemo(() => {
    if (!selectedWallet) return [];

    return transactions
      .filter((tx) => {
        const isSource = tx.walletId === selectedWallet.id;
        const isDestination = tx.destinationWalletId === selectedWallet.id;
        if (!isSource && !isDestination) return false;

        // Filter type
        if (statementFilter === 'EXPENSE' && tx.type !== 'EXPENSE') return false;
        if (statementFilter === 'INCOME' && tx.type !== 'INCOME' && tx.type !== 'SETTLEMENT') return false;
        if (statementFilter === 'TRANSFER' && tx.type !== 'TRANSFER') return false;

        // Search query
        if (statementSearch.trim()) {
          const query = statementSearch.toLowerCase();
          const matchNote = (tx.note || '').toLowerCase().includes(query);
          const matchCategory = (tx.categoryName || '').toLowerCase().includes(query);
          const matchAmount = tx.amount.toString().includes(query);
          return matchNote || matchCategory || matchAmount;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedWallet, transactions, statementFilter, statementSearch]);

  // Save wallet edits (Rename / Bank details)
  const handleSaveEdit = async () => {
    if (!selectedWallet) return;
    if (!editName.trim()) {
      setEditError('Tên ví không được để trống');
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);
    try {
      await apiService.updateWallet(selectedWallet.id, {
        name: editName.trim(),
        bankName: editBankName.trim() || undefined,
        accountNumber: editAccountNumber.trim() || undefined,
      });
      await onRefreshData();
      setIsEditing(false);
    } catch (err: any) {
      setEditError(err.message || 'Lỗi khi cập nhật ví');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete wallet with protection for only remaining wallet
  const handleDeleteWallet = async () => {
    if (!selectedWallet) return;

    if (wallets.length <= 1) {
      alert('Không thể xóa ví duy nhất còn lại. Bạn cần duy trì ít nhất 1 ví trong hệ thống!');
      return;
    }

    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn xóa ví "${selectedWallet.name}"?\n(Các giao dịch trong quá khứ vẫn sẽ được lưu trữ an toàn)`
    );
    if (!confirmDelete) return;

    try {
      await apiService.deleteWallet(selectedWallet.id);
      await onRefreshData();
      handleCloseWalletDrawer();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa ví');
    }
  };

  const getWalletBadge = (type: Wallet['type']) => {
    if (type === 'BANK') {
      return (
        <span className="px-2 py-0.5 bg-[#7D8F69]/15 text-[#7D8F69] font-bold text-[10px] sm:text-[11px] rounded-lg border border-[#7D8F69]/30 flex items-center gap-1">
          <Building2 className="w-3 h-3" /> Ngân Hàng
        </span>
      );
    }
    if (type === 'E_WALLET') {
      return (
        <span className="px-2 py-0.5 bg-[#D98B72]/15 text-[#D98B72] font-bold text-[10px] sm:text-[11px] rounded-lg border border-[#D98B72]/30 flex items-center gap-1">
          <Smartphone className="w-3 h-3" /> Ví Điện Tử
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-[#4A443F]/15 text-[#4A443F] font-bold text-[10px] sm:text-[11px] rounded-lg border border-[#4A443F]/30 flex items-center gap-1">
        <Banknote className="w-3 h-3" /> Tiền Mặt
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#2D2926]">Quản Lý Ví & Tài Khoản</h2>
          <p className="text-xs text-[#8C857D] mt-0.5">
            Tổng tài sản khả dụng:{' '}
            <span className="font-extrabold text-[#7D8F69] text-sm sm:text-base">
              {formatVND(totalBalance)}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenTransfer()}
            className="px-4 py-2.5 bg-[#F1EFE7] hover:bg-[#EAE7DC] text-[#2D2926] rounded-2xl text-xs font-extrabold transition flex items-center gap-1.5 border border-[#EAE7DC] active:scale-95 shadow-2xs"
          >
            <ArrowRightLeft className="w-4 h-4 text-[#7D8F69]" /> Chuyển Khoản Nội Bộ
          </button>
          <button
            onClick={onOpenAddWallet}
            className="px-4 py-2.5 bg-[#7D8F69] hover:bg-[#687856] text-white rounded-2xl text-xs font-extrabold shadow-md transition flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Tạo Ví Mới
          </button>
        </div>
      </div>

      {/* Wallets Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {wallets.map((w) => {
          // Calculate quick stats for this card
          let inAmt = 0;
          let outAmt = 0;
          transactions.forEach((tx) => {
            if (tx.walletId === w.id) {
              if (tx.type === 'INCOME' || tx.type === 'SETTLEMENT') inAmt += tx.amount;
              else if (tx.type === 'EXPENSE' || tx.type === 'TRANSFER') outAmt += tx.amount;
            } else if (tx.destinationWalletId === w.id && tx.type === 'TRANSFER') {
              inAmt += tx.amount;
            }
          });

          return (
            <div
              key={w.id}
              onClick={() => handleOpenWalletDrawer(w)}
              className="group relative bg-white border border-[#EAE7DC] hover:border-[#7D8F69] rounded-[28px] p-5 sm:p-6 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
            >
              {/* Card Top */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold transition-transform group-hover:scale-105 ${
                        w.type === 'BANK'
                          ? 'bg-[#7D8F69]/15 text-[#7D8F69]'
                          : w.type === 'E_WALLET'
                          ? 'bg-[#D98B72]/15 text-[#D98B72]'
                          : 'bg-[#F1EFE7] text-[#4A443F]'
                      }`}
                    >
                      {w.type === 'BANK' ? (
                        <Building2 className="w-6 h-6" />
                      ) : w.type === 'E_WALLET' ? (
                        <Smartphone className="w-6 h-6" />
                      ) : (
                        <Banknote className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-[#2D2926] group-hover:text-[#7D8F69] transition line-clamp-1">
                        {w.name}
                      </h3>
                      <p className="text-xs text-[#8C857D]">
                        {w.type === 'BANK'
                          ? w.bankName || 'Ngân hàng'
                          : w.type === 'E_WALLET'
                          ? 'Ví điện tử'
                          : 'Tiền mặt'}
                      </p>
                    </div>
                  </div>

                  {getWalletBadge(w.type)}
                </div>

                {w.accountNumber && (
                  <p className="text-[11px] text-[#8C857D] font-mono bg-[#F9F8F3] px-2.5 py-1 rounded-lg inline-block border border-[#EAE7DC]/60 mb-2">
                    STK: {w.accountNumber}
                  </p>
                )}
              </div>

              {/* Card Bottom / Balance */}
              <div className="mt-4 pt-4 border-t border-[#F9F8F3]">
                <span className="text-[10px] text-[#8C857D] uppercase font-extrabold tracking-wider block">
                  Số dư hiện tại
                </span>
                <p className="text-2xl font-black text-[#7D8F69] mt-0.5 tracking-tight">
                  {formatVND(w.balance)}
                </p>

                {/* Quick Flow Mini Indicators */}
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#F9F8F3] text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="text-[#7D8F69] font-bold">+{formatVNDShort(inAmt)}</span>
                    <span className="text-[#8C857D]">•</span>
                    <span className="text-[#D98B72] font-bold">-{formatVNDShort(outAmt)}</span>
                  </div>

                  <span className="text-[#7D8F69] font-extrabold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Xem sao kê <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* WALLET DETAIL & STATEMENT DRAWER / MODAL */}
      {selectedWallet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:p-4 bg-[#2D2926]/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full sm:max-w-xl md:max-w-2xl bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-[#EAE7DC] flex flex-col h-[90vh] sm:h-[88vh] animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-[#EAE7DC] bg-[#F9F8F3] shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                      selectedWallet.type === 'BANK'
                        ? 'bg-[#7D8F69]/15 text-[#7D8F69]'
                        : selectedWallet.type === 'E_WALLET'
                        ? 'bg-[#D98B72]/15 text-[#D98B72]'
                        : 'bg-[#F1EFE7] text-[#4A443F]'
                    }`}
                  >
                    {selectedWallet.type === 'BANK' ? (
                      <Building2 className="w-5 h-5" />
                    ) : selectedWallet.type === 'E_WALLET' ? (
                      <Smartphone className="w-5 h-5" />
                    ) : (
                      <Banknote className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg text-[#2D2926]">
                      {selectedWallet.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {getWalletBadge(selectedWallet.type)}
                      {selectedWallet.accountNumber && (
                        <span className="text-[11px] font-mono text-[#8C857D]">
                          STK: {selectedWallet.accountNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCloseWalletDrawer}
                  className="p-2 rounded-full text-[#8C857D] hover:text-[#2D2926] hover:bg-[#EAE7DC] transition"
                  title="Đóng bảng sao kê"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Balance Banner & Top Actions */}
              <div className="mt-4 p-4 bg-white rounded-2xl border border-[#EAE7DC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <span className="text-[10px] text-[#8C857D] uppercase font-bold tracking-wider">
                    Số dư ví hiện tại
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-[#7D8F69] tracking-tight">
                    {formatVND(selectedWallet.balance)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => {
                      onOpenTransfer(selectedWallet.id);
                    }}
                    className="px-3 py-1.5 bg-[#4A443F] hover:bg-[#2D2926] text-white text-xs font-bold rounded-xl transition flex items-center gap-1 shadow-2xs"
                    title="Chuyển tiền từ ví này"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" /> Chuyển Tiền
                  </button>

                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-3 py-1.5 bg-[#F1EFE7] hover:bg-[#EAE7DC] text-[#2D2926] text-xs font-bold rounded-xl transition flex items-center gap-1 border border-[#EAE7DC]"
                    title="Sửa tên ví & thông tin"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#7D8F69]" /> Sửa Tên
                  </button>

                  <button
                    onClick={handleDeleteWallet}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition flex items-center gap-1 border border-rose-200"
                    title="Xóa ví"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xóa Ví
                  </button>
                </div>
              </div>

              {/* Inline Edit Form */}
              {isEditing && (
                <div className="mt-3 p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-amber-900 flex items-center gap-1">
                      <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa thông tin ví
                    </span>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-xs text-stone-500 hover:text-stone-800"
                    >
                      Hủy
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[11px] font-bold text-stone-700 block mb-1">
                        Tên ví:
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full p-2 rounded-xl bg-white border border-amber-200 text-[#2D2926] focus:outline-none focus:ring-1 focus:ring-[#7D8F69]"
                      />
                    </div>

                    {selectedWallet.type === 'BANK' && (
                      <div>
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">
                          Tên ngân hàng:
                        </label>
                        <input
                          type="text"
                          value={editBankName}
                          onChange={(e) => setEditBankName(e.target.value)}
                          placeholder="VD: Vietcombank, Techcombank"
                          className="w-full p-2 rounded-xl bg-white border border-amber-200 text-[#2D2926] focus:outline-none focus:ring-1 focus:ring-[#7D8F69]"
                        />
                      </div>
                    )}

                    {(selectedWallet.type === 'BANK' || selectedWallet.type === 'E_WALLET') && (
                      <div>
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">
                          Số tài khoản / SĐT ví:
                        </label>
                        <input
                          type="text"
                          value={editAccountNumber}
                          onChange={(e) => setEditAccountNumber(e.target.value)}
                          placeholder="Số tài khoản..."
                          className="w-full p-2 rounded-xl bg-white border border-amber-200 text-[#2D2926] focus:outline-none focus:ring-1 focus:ring-[#7D8F69]"
                        />
                      </div>
                    )}
                  </div>

                  {editError && <p className="text-xs font-bold text-[#D98B72]">{editError}</p>}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-200/50 rounded-xl"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSavingEdit}
                      className="px-4 py-1.5 text-xs font-extrabold text-white bg-[#7D8F69] hover:bg-[#687856] rounded-xl shadow-2xs transition flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {isSavingEdit ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Prompt Bar */}
            <div className="p-3 sm:px-6 bg-[#F1EFE7]/60 border-b border-[#EAE7DC] flex items-center justify-between gap-2 shrink-0">
              <button
                onClick={() => {
                  onOpenAddTransaction(selectedWallet.id, 'expense');
                }}
                className="flex-1 py-2 px-3 bg-[#7D8F69] hover:bg-[#687856] text-white rounded-xl text-xs font-extrabold shadow-2xs flex items-center justify-center gap-1.5 transition active:scale-98"
              >
                <Plus className="w-4 h-4" /> Ghi Giao Dịch Từ Ví Này
              </button>

              <button
                onClick={() => {
                  onOpenTransfer(selectedWallet.id);
                }}
                className="py-2 px-3 bg-white hover:bg-[#EAE7DC] text-[#2D2926] border border-[#EAE7DC] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-[#7D8F69]" /> Chuyển Ví
              </button>
            </div>

            {/* Drawer Body: Stats + Statement List */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
              {/* Cash Flow Statistics for this Wallet */}
              <div>
                <h4 className="text-xs font-extrabold text-[#4A443F] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#7D8F69]" /> Dòng Tiền Riêng Của Ví Này
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-[#7D8F69]/10 border border-[#7D8F69]/25 rounded-2xl">
                    <span className="text-[10px] font-bold text-[#7D8F69] uppercase tracking-wider block">
                      Tổng tiền vào (+)
                    </span>
                    <p className="text-base sm:text-lg font-black text-[#7D8F69] mt-0.5 truncate">
                      +{formatVND(walletStats.inflow)}
                    </p>
                  </div>

                  <div className="p-3.5 bg-[#D98B72]/10 border border-[#D98B72]/25 rounded-2xl">
                    <span className="text-[10px] font-bold text-[#D98B72] uppercase tracking-wider block">
                      Tổng tiền ra (-)
                    </span>
                    <p className="text-base sm:text-lg font-black text-[#D98B72] mt-0.5 truncate">
                      -{formatVND(walletStats.outflow)}
                    </p>
                  </div>

                  <div className="col-span-2 sm:col-span-1 p-3.5 bg-[#F9F8F3] border border-[#EAE7DC] rounded-2xl">
                    <span className="text-[10px] font-bold text-[#8C857D] uppercase tracking-wider block">
                      Tổng số giao dịch
                    </span>
                    <p className="text-base sm:text-lg font-black text-[#2D2926] mt-0.5">
                      {walletStats.txCount} giao dịch
                    </p>
                  </div>
                </div>
              </div>

              {/* Statement List & Search / Filter */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <h4 className="text-xs font-extrabold text-[#4A443F] uppercase tracking-wider flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-[#7D8F69]" /> Lịch Sử Sao Kê Chi Tiết ({walletTransactions.length})
                  </h4>

                  {/* Filter Chips */}
                  <div className="flex items-center gap-1 p-1 bg-[#F9F8F3] rounded-xl border border-[#EAE7DC] overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => setStatementFilter('ALL')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-lg whitespace-nowrap transition ${
                        statementFilter === 'ALL'
                          ? 'bg-white text-[#2D2926] shadow-2xs'
                          : 'text-[#8C857D]'
                      }`}
                    >
                      Tất cả
                    </button>
                    <button
                      onClick={() => setStatementFilter('EXPENSE')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-lg whitespace-nowrap transition ${
                        statementFilter === 'EXPENSE'
                          ? 'bg-white text-[#D98B72] shadow-2xs'
                          : 'text-[#8C857D]'
                      }`}
                    >
                      Chi tiêu
                    </button>
                    <button
                      onClick={() => setStatementFilter('INCOME')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-lg whitespace-nowrap transition ${
                        statementFilter === 'INCOME'
                          ? 'bg-white text-[#7D8F69] shadow-2xs'
                          : 'text-[#8C857D]'
                      }`}
                    >
                      Thu nhập
                    </button>
                    <button
                      onClick={() => setStatementFilter('TRANSFER')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-lg whitespace-nowrap transition ${
                        statementFilter === 'TRANSFER'
                          ? 'bg-white text-blue-600 shadow-2xs'
                          : 'text-[#8C857D]'
                      }`}
                    >
                      Chuyển ví
                    </button>
                  </div>
                </div>

                {/* Search in Statement */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#8C857D] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={statementSearch}
                    onChange={(e) => setStatementSearch(e.target.value)}
                    placeholder="Tìm sao kê theo nội dung, danh mục, số tiền..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#F9F8F3] border border-[#EAE7DC] focus:outline-none focus:ring-1 focus:ring-[#7D8F69] text-[#2D2926]"
                  />
                </div>

                {/* Statement Items */}
                <div className="space-y-2">
                  {walletTransactions.length === 0 ? (
                    <div className="text-center py-10 bg-[#F9F8F3] rounded-2xl border border-dashed border-[#EAE7DC] text-[#8C857D] space-y-2">
                      <FileSpreadsheet className="w-8 h-8 mx-auto text-[#8C857D]/50" />
                      <p className="text-xs font-semibold">
                        Chưa có giao dịch sao kê nào cho ví này.
                      </p>
                      <button
                        onClick={() => onOpenAddTransaction(selectedWallet.id, 'expense')}
                        className="text-xs font-extrabold text-[#7D8F69] hover:underline"
                      >
                        + Ghi giao dịch đầu tiên ngay
                      </button>
                    </div>
                  ) : (
                    walletTransactions.map((tx) => {
                      const isSource = tx.walletId === selectedWallet.id;
                      const isDest = tx.destinationWalletId === selectedWallet.id;

                      let isIncoming = false;
                      if (tx.type === 'INCOME' || tx.type === 'SETTLEMENT') {
                        isIncoming = true;
                      } else if (tx.type === 'TRANSFER' && isDest) {
                        isIncoming = true;
                      }

                      return (
                        <div
                          key={tx.id}
                          onClick={() => onSelectTransactionDetail && onSelectTransactionDetail(tx)}
                          className="flex items-center justify-between p-3 bg-white hover:bg-[#F9F8F3] border border-[#EAE7DC] rounded-2xl transition cursor-pointer gap-3 group shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                                isIncoming
                                  ? 'bg-[#7D8F69]/15 text-[#7D8F69]'
                                  : 'bg-[#D98B72]/15 text-[#D98B72]'
                              }`}
                            >
                              {isIncoming ? (
                                <ArrowDownLeft className="w-4 h-4" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-xs sm:text-sm text-[#2D2926] truncate max-w-[160px] sm:max-w-xs">
                                  {tx.note}
                                </p>
                                {tx.categoryName && (
                                  <span className="px-1.5 py-0.5 bg-[#F1EFE7] text-[#4A443F] text-[10px] font-bold rounded border border-[#EAE7DC]">
                                    {tx.categoryName}
                                  </span>
                                )}
                                {tx.receiptImageUrl && (
                                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold rounded border border-amber-200 flex items-center gap-0.5">
                                    <Camera className="w-2.5 h-2.5" /> Hóa đơn
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[10px] text-[#8C857D] mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {new Date(tx.date).toLocaleDateString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>

                                {tx.type === 'TRANSFER' && (
                                  <span className="text-blue-600 font-bold">
                                    {isSource
                                      ? `→ ${tx.destinationWalletName || 'Ví nhận'}`
                                      : `← ${tx.walletName || 'Ví gửi'}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p
                              className={`font-black text-xs sm:text-sm ${
                                isIncoming ? 'text-[#7D8F69]' : 'text-[#D98B72]'
                              }`}
                            >
                              {isIncoming ? '+' : '-'} {formatVND(tx.amount)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
