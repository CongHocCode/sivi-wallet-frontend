/**
 * SIVI WALLET - Wallets Management View & Statement Drawer ("Quản Lý Ví & Sao Kê Dòng Tiền Từng Ví")
 * Natural Tones Theme: #7D8F69, #D98B72, #F1EFE7, #EAE7DC, #2D2926, #FAF9F5
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Wallet as WalletIcon,
  Building2,
  Smartphone,
  Banknote,
  Plus,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Edit2,
  Trash2,
  X,
  Search,
  Check,
  FileSpreadsheet,
  Clock,
  Camera,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Eye,
  EyeOff,
  AlertTriangle,
  Receipt,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Wallet, Transaction, Category, WalletType } from '../types';
import { formatVND, formatVNDShort, getTxDate, formatTxDateTime } from '../lib/formatters';
import { api } from '../services/api';

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
  // Global & Drawer State
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [showGlobalBalance, setShowGlobalBalance] = useState(true);
  const [showDrawerBalance, setShowDrawerBalance] = useState(true);

  // Edit Wallet State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<WalletType>('BANK');
  const [editBankName, setEditBankName] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Alert State
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Statement Search & Timeframe Filter
  const [statementSearch, setStatementSearch] = useState('');
  const [statementFilter, setStatementFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER'>('ALL');
  const [timeframe, setTimeframe] = useState<'THIS_MONTH' | 'ALL_TIME'>('THIS_MONTH');

  // Currently selected wallet with reactive sync
  const selectedWallet = useMemo(() => {
    if (!selectedWalletId) return null;
    return wallets.find((w) => w.id === selectedWalletId) || null;
  }, [wallets, selectedWalletId]);

  // Sync edit form when opening wallet drawer or selectedWallet updates
  const handleOpenWalletDrawer = (wallet: Wallet) => {
    setSelectedWalletId(wallet.id);
    setIsEditing(false);
    setEditName(wallet.name);
    setEditType(wallet.type || 'BANK');
    setEditBankName(wallet.bankName || '');
    setEditAccountNumber(wallet.accountNumber || '');
    setEditError(null);
    setDeleteWarning(null);
    setStatementSearch('');
    setStatementFilter('ALL');
    setTimeframe('THIS_MONTH');
  };

  const handleCloseWalletDrawer = () => {
    setSelectedWalletId(null);
    setIsEditing(false);
    setDeleteWarning(null);
  };

  // Current month bounds for accurate monthly stats
  const currentMonthDate = new Date();
  const currentMonth = currentMonthDate.getMonth();
  const currentYear = currentMonthDate.getFullYear();

  // Calculate statistics for the selected wallet (Both this month and all-time)
  const walletStats = useMemo(() => {
    if (!selectedWallet) return { thisMonthInflow: 0, thisMonthOutflow: 0, thisMonthNet: 0, thisMonthTxCount: 0, allInflow: 0, allOutflow: 0, allTxCount: 0 };

    let thisMonthIn = 0;
    let thisMonthOut = 0;
    let thisMonthCount = 0;

    let allIn = 0;
    let allOut = 0;
    let allCount = 0;

    transactions.forEach((tx) => {
      const isSource = tx.walletId === selectedWallet.id;
      const isDestination = tx.destinationWalletId === selectedWallet.id;

      if (isSource || isDestination) {
        allCount++;
        const d = getTxDate(tx);
        const isCurrentMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;

        if (isCurrentMonth) thisMonthCount++;

        if (tx.type === 'INCOME' || tx.type === 'SETTLEMENT') {
          if (isSource) {
            allIn += tx.amount;
            if (isCurrentMonth) thisMonthIn += tx.amount;
          }
        } else if (tx.type === 'EXPENSE') {
          if (isSource) {
            allOut += tx.amount;
            if (isCurrentMonth) thisMonthOut += tx.amount;
          }
        } else if (tx.type === 'TRANSFER') {
          if (isSource && !isDestination) {
            allOut += tx.amount;
            if (isCurrentMonth) thisMonthOut += tx.amount;
          }
          if (isDestination && !isSource) {
            allIn += tx.amount;
            if (isCurrentMonth) thisMonthIn += tx.amount;
          }
        }
      }
    });

    return {
      thisMonthInflow: thisMonthIn,
      thisMonthOutflow: thisMonthOut,
      thisMonthNet: thisMonthIn - thisMonthOut,
      thisMonthTxCount: thisMonthCount,
      allInflow: allIn,
      allOutflow: allOut,
      allTxCount: allCount,
    };
  }, [selectedWallet, transactions, currentMonth, currentYear]);

  // Filter statement transactions for selected wallet
  const walletTransactions = useMemo(() => {
    if (!selectedWallet) return [];

    return transactions
      .filter((tx) => {
        const isSource = tx.walletId === selectedWallet.id;
        const isDestination = tx.destinationWalletId === selectedWallet.id;
        if (!isSource && !isDestination) return false;

        // Timeframe filter
        if (timeframe === 'THIS_MONTH') {
          const d = getTxDate(tx);
          if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) {
            return false;
          }
        }

        // Filter type
        if (statementFilter === 'EXPENSE' && tx.type !== 'EXPENSE') return false;
        if (statementFilter === 'INCOME' && tx.type !== 'INCOME' && tx.type !== 'SETTLEMENT') return false;
        if (statementFilter === 'TRANSFER' && tx.type !== 'TRANSFER') return false;

        // Search query
        if (statementSearch.trim()) {
          const query = statementSearch.toLowerCase().trim();
          const matchNote = (tx.note || '').toLowerCase().includes(query);
          const matchCategory = (tx.categoryName || '').toLowerCase().includes(query);
          const matchAmount = tx.amount.toString().includes(query);
          return matchNote || matchCategory || matchAmount;
        }

        return true;
      })
      .sort((a, b) => getTxDate(b).getTime() - getTxDate(a).getTime());
  }, [selectedWallet, transactions, statementFilter, statementSearch, timeframe, currentMonth, currentYear]);

  // Save wallet edits (Rename / Bank / STK)
  const handleSaveEdit = async () => {
    if (!selectedWallet) return;
    if (!editName.trim()) {
      setEditError('Tên ví không được để trống');
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);
    try {
      await api.wallets.update(selectedWallet.id, {
        name: editName.trim(),
        type: editType,
        bankName: editType === 'BANK' ? editBankName.trim() || undefined : undefined,
        accountNumber: editType !== 'CASH' ? editAccountNumber.trim() || undefined : undefined,
      });
      await onRefreshData();
      setIsEditing(false);
    } catch (err: any) {
      setEditError(err.message || 'Lỗi khi cập nhật ví');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete wallet with strict protection if only 1 wallet remains
  const handleDeleteWallet = async () => {
    if (!selectedWallet) return;

    if (wallets.length <= 1) {
      setDeleteWarning('Bạn cần duy trì ít nhất 1 ví trong hệ thống. Không thể xóa ví duy nhất còn lại!');
      return;
    }

    const isConfirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa ví "${selectedWallet.name}"?\n(Dữ liệu các giao dịch lịch sử vẫn được bảo toàn an toàn trong hệ thống)`
    );
    if (!isConfirmed) return;

    setIsDeleting(true);
    try {
      await api.wallets.delete(selectedWallet.id);
      await onRefreshData();
      handleCloseWalletDrawer();
    } catch (err: any) {
      setDeleteWarning(err.message || 'Lỗi khi xóa ví');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper Badge for Wallet Types
  const getWalletBadge = (type: Wallet['type']) => {
    if (type === 'BANK') {
      return (
        <span className="px-2.5 py-0.5 bg-[#7D8F69]/15 text-[#7D8F69] font-bold text-[11px] rounded-full border border-[#7D8F69]/30 flex items-center gap-1 shrink-0">
          <Building2 className="w-3 h-3" /> Ngân Hàng
        </span>
      );
    }
    if (type === 'E_WALLET') {
      return (
        <span className="px-2.5 py-0.5 bg-[#D98B72]/15 text-[#D98B72] font-bold text-[11px] rounded-full border border-[#D98B72]/30 flex items-center gap-1 shrink-0">
          <Smartphone className="w-3 h-3" /> Ví Điện Tử
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 bg-[#4A443F]/15 text-[#4A443F] font-bold text-[11px] rounded-full border border-[#4A443F]/30 flex items-center gap-1 shrink-0">
        <Banknote className="w-3 h-3" /> Tiền Mặt
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-black text-[#2D2926] tracking-tight">
              Quản Lý Ví & Tài Khoản
            </h2>
            <button
              onClick={() => setShowGlobalBalance(!showGlobalBalance)}
              className="p-1.5 rounded-lg text-[#8C857D] hover:text-[#2D2926] hover:bg-[#F1EFE7] transition"
              title={showGlobalBalance ? 'Ẩn tổng tài sản' : 'Hiện tổng tài sản'}
            >
              {showGlobalBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-[#8C857D] mt-0.5 font-medium flex items-center gap-1.5 flex-wrap">
            <span>Tổng tài sản khả dụng:</span>
            <span className="font-black text-[#7D8F69] text-sm sm:text-base">
              {showGlobalBalance ? formatVND(totalBalance) : '•••••••• ₫'}
            </span>
            <span className="text-[#8C857D]">({wallets.length} ví hoạt động)</span>
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onOpenTransfer()}
            className="px-3.5 py-2.5 bg-[#F1EFE7] hover:bg-[#EAE7DC] text-[#2D2926] rounded-2xl text-xs font-extrabold transition flex items-center gap-1.5 border border-[#EAE7DC] active:scale-95 shadow-2xs"
            title="Chuyển tiền qua lại giữa các ví của bạn"
          >
            <ArrowRightLeft className="w-4 h-4 text-[#7D8F69]" />
            <span>Chuyển Khoản Nội Bộ</span>
          </button>
          <button
            onClick={onOpenAddWallet}
            className="px-4 py-2.5 bg-[#7D8F69] hover:bg-[#687856] text-white rounded-2xl text-xs font-extrabold shadow-md transition flex items-center gap-1.5 active:scale-95"
            title="Thêm ví tiền mặt, tài khoản ngân hàng hoặc ví điện tử mới"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tạo Ví Mới</span>
          </button>
        </div>
      </div>

      {/* Wallets Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {wallets.map((w) => {
          // Quick stats for this wallet card
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
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold transition-transform group-hover:scale-105 shrink-0 ${
                        w.type === 'BANK'
                          ? 'bg-[#7D8F69]/15 text-[#7D8F69]'
                          : w.type === 'E_WALLET'
                          ? 'bg-[#D98B72]/15 text-[#D98B72]'
                          : 'bg-[#F1EFE7] text-[#4A443F]'
                      }`}
                    >
                      {w.type === 'BANK' ? (
                        <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                      ) : w.type === 'E_WALLET' ? (
                        <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
                      ) : (
                        <Banknote className="w-5 h-5 sm:w-6 sm:h-6" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3
                        className="font-extrabold text-sm sm:text-base text-[#2D2926] group-hover:text-[#7D8F69] transition truncate"
                        title={w.name}
                      >
                        {w.name}
                      </h3>
                      <p className="text-[11px] text-[#8C857D] truncate">
                        {w.type === 'BANK'
                          ? w.bankName || 'Tài khoản Ngân hàng'
                          : w.type === 'E_WALLET'
                          ? 'Ví điện tử'
                          : 'Tiền mặt trong ví'}
                      </p>
                    </div>
                  </div>

                  {getWalletBadge(w.type)}
                </div>

                {w.accountNumber && (
                  <div className="mt-1">
                    <span className="text-[10px] sm:text-[11px] text-[#8C857D] font-mono bg-[#FAF9F5] px-2.5 py-0.5 rounded-md inline-block border border-[#EAE7DC]/80 truncate max-w-full">
                      STK: {w.accountNumber}
                    </span>
                  </div>
                )}
              </div>

              {/* Card Bottom / Balance */}
              <div className="mt-4 pt-3.5 border-t border-[#FAF9F5]">
                <span className="text-[10px] text-[#8C857D] uppercase font-extrabold tracking-wider block">
                  Số dư hiện tại
                </span>
                <p className="text-xl sm:text-2xl font-black text-[#7D8F69] mt-0.5 tracking-tight truncate">
                  {showGlobalBalance ? formatVND(w.balance) : '•••••••• ₫'}
                </p>

                {/* Quick Flow Mini Indicators */}
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#FAF9F5] text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[#7D8F69] font-bold truncate">
                      +{formatVNDShort(inAmt)}
                    </span>
                    <span className="text-[#8C857D]">•</span>
                    <span className="text-[#D98B72] font-bold truncate">
                      -{formatVNDShort(outAmt)}
                    </span>
                  </div>

                  <span className="text-[#7D8F69] font-extrabold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform shrink-0">
                    Chi tiết <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* WALLET DETAIL & STATEMENT DRAWER / MODAL */}
      {/* ========================================================================= */}
      {selectedWallet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:p-4 bg-[#2D2926]/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full sm:max-w-xl md:max-w-2xl bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-[#EAE7DC] flex flex-col h-[92vh] sm:h-[88vh] animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-[#EAE7DC] bg-[#FAF9F5] shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                      selectedWallet.type === 'BANK'
                        ? 'bg-[#7D8F69]/15 text-[#7D8F69]'
                        : selectedWallet.type === 'E_WALLET'
                        ? 'bg-[#D98B72]/15 text-[#D98B72]'
                        : 'bg-[#F1EFE7] text-[#4A443F]'
                    }`}
                  >
                    {selectedWallet.type === 'BANK' ? (
                      <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    ) : selectedWallet.type === 'E_WALLET' ? (
                      <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
                    ) : (
                      <Banknote className="w-5 h-5 sm:w-6 sm:h-6" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className="font-extrabold text-base sm:text-lg text-[#2D2926] truncate max-w-[200px] sm:max-w-xs"
                        title={selectedWallet.name}
                      >
                        {selectedWallet.name}
                      </h3>
                      {getWalletBadge(selectedWallet.type)}
                    </div>
                    <p className="text-[11px] text-[#8C857D] truncate mt-0.5">
                      {selectedWallet.bankName ? `${selectedWallet.bankName} ` : ''}
                      {selectedWallet.accountNumber ? `• STK: ${selectedWallet.accountNumber}` : ''}
                      {!selectedWallet.bankName && !selectedWallet.accountNumber && 'Tài khoản quản lý chi tiêu'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseWalletDrawer}
                  className="p-2 rounded-full text-[#8C857D] hover:text-[#2D2926] hover:bg-[#EAE7DC] transition shrink-0"
                  title="Đóng bảng sao kê"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Balance Banner & Top Actions */}
              <div className="mt-3.5 p-4 bg-white rounded-2xl border border-[#EAE7DC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#8C857D] uppercase font-bold tracking-wider">
                      Số dư ví hiện tại
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDrawerBalance(!showDrawerBalance)}
                      className="text-[#8C857D] hover:text-[#2D2926] transition p-0.5"
                      title={showDrawerBalance ? 'Ẩn số dư' : 'Hiện số dư'}
                    >
                      {showDrawerBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-[#7D8F69] tracking-tight truncate mt-0.5">
                    {showDrawerBalance ? formatVND(selectedWallet.balance) : '•••••••• ₫'}
                  </p>
                </div>

                {/* 3 Main Action Buttons: Transfer, Edit, Delete */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenTransfer(selectedWallet.id);
                    }}
                    className="px-3 py-1.5 bg-[#4A443F] hover:bg-[#2D2926] text-white text-xs font-bold rounded-xl transition flex items-center gap-1 shadow-2xs"
                    title="Chuyển tiền từ ví này sang ví khác"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-[#7D8F69]" />
                    <span>Chuyển Tiền</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(!isEditing);
                      setDeleteWarning(null);
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1 border ${
                      isEditing
                        ? 'bg-[#7D8F69] text-white border-[#7D8F69]'
                        : 'bg-[#FAF9F5] hover:bg-[#EAE7DC] text-[#2D2926] border-[#EAE7DC]'
                    }`}
                    title="Sửa tên ví & thông tin"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Đổi Tên</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteWallet}
                    disabled={isDeleting}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition flex items-center gap-1 border border-rose-200 disabled:opacity-50"
                    title="Xóa ví khỏi hệ thống"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeleting ? 'Đang xóa...' : 'Xóa Ví'}</span>
                  </button>
                </div>
              </div>

              {/* Warning Alert if Cannot Delete or Error */}
              {deleteWarning && (
                <div className="mt-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-start gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">{deleteWarning}</div>
                  <button
                    type="button"
                    onClick={() => setDeleteWarning(null)}
                    className="text-rose-500 hover:text-rose-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Inline Edit Form */}
              {isEditing && (
                <div className="mt-3 p-4 bg-[#FAF9F5] border border-[#EAE7DC] rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#2D2926] flex items-center gap-1.5">
                      <Edit2 className="w-3.5 h-3.5 text-[#7D8F69]" /> Chỉnh sửa thông tin ví
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="text-xs text-[#8C857D] hover:text-[#2D2926]"
                    >
                      Hủy
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-[#4A443F] block mb-1">
                        Tên gợi nhớ ví: <span className="text-[#D98B72]">*</span>
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="VD: Vietcombank Lương, Tiền Mặt..."
                        className="w-full p-2.5 rounded-xl bg-white border border-[#EAE7DC] text-[#2D2926] font-bold focus:outline-none focus:ring-2 focus:ring-[#7D8F69]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#4A443F] block mb-1">
                        Loại ví:
                      </label>
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value as WalletType)}
                        className="w-full p-2.5 rounded-xl bg-white border border-[#EAE7DC] text-[#2D2926] font-semibold focus:outline-none focus:ring-2 focus:ring-[#7D8F69]"
                      >
                        <option value="BANK">Ngân Hàng</option>
                        <option value="E_WALLET">Ví Điện Tử</option>
                        <option value="CASH">Tiền Mặt</option>
                      </select>
                    </div>

                    {editType === 'BANK' && (
                      <div>
                        <label className="text-[11px] font-bold text-[#4A443F] block mb-1">
                          Tên ngân hàng:
                        </label>
                        <input
                          type="text"
                          value={editBankName}
                          onChange={(e) => setEditBankName(e.target.value)}
                          placeholder="VD: Vietcombank, Techcombank..."
                          className="w-full p-2.5 rounded-xl bg-white border border-[#EAE7DC] text-[#2D2926] focus:outline-none focus:ring-2 focus:ring-[#7D8F69]"
                        />
                      </div>
                    )}

                    {editType !== 'CASH' && (
                      <div className={editType === 'E_WALLET' ? 'sm:col-span-1' : 'sm:col-span-2'}>
                        <label className="text-[11px] font-bold text-[#4A443F] block mb-1">
                          Số tài khoản / SĐT ví:
                        </label>
                        <input
                          type="text"
                          value={editAccountNumber}
                          onChange={(e) => setEditAccountNumber(e.target.value)}
                          placeholder="Số tài khoản..."
                          className="w-full p-2.5 rounded-xl bg-white border border-[#EAE7DC] text-[#2D2926] focus:outline-none focus:ring-2 focus:ring-[#7D8F69]"
                        />
                      </div>
                    )}
                  </div>

                  {editError && (
                    <p className="text-xs font-bold text-[#D98B72]">{editError}</p>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-xs font-bold text-[#8C857D] hover:bg-[#EAE7DC] rounded-xl transition"
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
                      <span>{isSavingEdit ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Prompt Bar: "+ Ghi giao dịch từ ví này" */}
            <div className="p-3 sm:px-6 bg-[#F1EFE7]/80 border-b border-[#EAE7DC] flex items-center justify-between gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onOpenAddTransaction(selectedWallet.id, 'expense');
                }}
                className="flex-1 py-2.5 px-3.5 bg-[#7D8F69] hover:bg-[#687856] text-white rounded-xl text-xs font-extrabold shadow-xs flex items-center justify-center gap-1.5 transition active:scale-98"
                title="Ghi giao dịch chi tiêu hoặc thu nhập mới và điền sẵn ví này"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span className="truncate">+ Ghi Giao Dịch Từ Ví Này</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenTransfer(selectedWallet.id);
                }}
                className="py-2.5 px-3.5 bg-white hover:bg-[#FAF9F5] text-[#2D2926] border border-[#EAE7DC] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-98 shadow-2xs shrink-0"
                title="Chuyển tiền nội bộ"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-[#7D8F69]" />
                <span className="hidden xs:inline">Chuyển Ví</span>
              </button>
            </div>

            {/* Drawer Body: Stats + Statement List */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
              {/* Cash Flow Statistics of this Specific Wallet */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <h4 className="text-xs font-extrabold text-[#4A443F] uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-[#7D8F69]" />
                    <span>Dòng Tiền {timeframe === 'THIS_MONTH' ? 'Tháng Này' : 'Toàn Thời Gian'} Của Ví Này</span>
                  </h4>

                  {/* Timeframe Switcher */}
                  <div className="flex items-center gap-1 p-0.5 bg-[#FAF9F5] rounded-xl border border-[#EAE7DC]">
                    <button
                      type="button"
                      onClick={() => setTimeframe('THIS_MONTH')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition ${
                        timeframe === 'THIS_MONTH'
                          ? 'bg-[#7D8F69] text-white shadow-2xs'
                          : 'text-[#8C857D] hover:text-[#2D2926]'
                      }`}
                    >
                      Tháng này
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeframe('ALL_TIME')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition ${
                        timeframe === 'ALL_TIME'
                          ? 'bg-[#7D8F69] text-white shadow-2xs'
                          : 'text-[#8C857D] hover:text-[#2D2926]'
                      }`}
                    >
                      Tất cả
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  {/* Inflow */}
                  <div className="p-3.5 bg-[#7D8F69]/10 border border-[#7D8F69]/25 rounded-2xl">
                    <span className="text-[10px] font-bold text-[#7D8F69] uppercase tracking-wider block">
                      Tổng Thu Ví Này (+)
                    </span>
                    <p className="text-base sm:text-lg font-black text-[#7D8F69] mt-0.5 truncate">
                      +{formatVND(timeframe === 'THIS_MONTH' ? walletStats.thisMonthInflow : walletStats.allInflow)}
                    </p>
                  </div>

                  {/* Outflow */}
                  <div className="p-3.5 bg-[#D98B72]/10 border border-[#D98B72]/25 rounded-2xl">
                    <span className="text-[10px] font-bold text-[#D98B72] uppercase tracking-wider block">
                      Tổng Chi Ví Này (-)
                    </span>
                    <p className="text-base sm:text-lg font-black text-[#D98B72] mt-0.5 truncate">
                      -{formatVND(timeframe === 'THIS_MONTH' ? walletStats.thisMonthOutflow : walletStats.allOutflow)}
                    </p>
                  </div>

                  {/* Transaction Count */}
                  <div className="col-span-2 sm:col-span-1 p-3.5 bg-[#FAF9F5] border border-[#EAE7DC] rounded-2xl">
                    <span className="text-[10px] font-bold text-[#8C857D] uppercase tracking-wider block">
                      Tổng Số Giao Dịch
                    </span>
                    <p className="text-base sm:text-lg font-black text-[#2D2926] mt-0.5 truncate">
                      {timeframe === 'THIS_MONTH' ? walletStats.thisMonthTxCount : walletStats.allTxCount} giao dịch
                    </p>
                  </div>
                </div>
              </div>

              {/* Statement List & Search / Filter */}
              <div className="space-y-3 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <h4 className="text-xs font-extrabold text-[#4A443F] uppercase tracking-wider flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-[#7D8F69]" />
                    <span>Lịch Sử Sao Kê Chi Tiết ({walletTransactions.length})</span>
                  </h4>

                  {/* Filter Chips */}
                  <div className="flex items-center gap-1 p-1 bg-[#FAF9F5] rounded-xl border border-[#EAE7DC] overflow-x-auto no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setStatementFilter('ALL')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-lg whitespace-nowrap transition ${
                        statementFilter === 'ALL'
                          ? 'bg-white text-[#2D2926] shadow-2xs font-extrabold'
                          : 'text-[#8C857D] hover:text-[#2D2926]'
                      }`}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatementFilter('EXPENSE')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-lg whitespace-nowrap transition ${
                        statementFilter === 'EXPENSE'
                          ? 'bg-white text-[#D98B72] shadow-2xs font-extrabold'
                          : 'text-[#8C857D] hover:text-[#D98B72]'
                      }`}
                    >
                      Chi tiêu
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatementFilter('INCOME')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-lg whitespace-nowrap transition ${
                        statementFilter === 'INCOME'
                          ? 'bg-white text-[#7D8F69] shadow-2xs font-extrabold'
                          : 'text-[#8C857D] hover:text-[#7D8F69]'
                      }`}
                    >
                      Thu nhập
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatementFilter('TRANSFER')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-lg whitespace-nowrap transition ${
                        statementFilter === 'TRANSFER'
                          ? 'bg-white text-blue-600 shadow-2xs font-extrabold'
                          : 'text-[#8C857D] hover:text-blue-600'
                      }`}
                    >
                      Chuyển ví
                    </button>
                  </div>
                </div>

                {/* Search in Statement */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#8C857D] absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={statementSearch}
                    onChange={(e) => setStatementSearch(e.target.value)}
                    placeholder="Tìm sao kê theo nội dung, danh mục, số tiền..."
                    className="w-full pl-8 pr-8 py-2 text-xs rounded-xl bg-[#FAF9F5] border border-[#EAE7DC] focus:outline-none focus:ring-2 focus:ring-[#7D8F69] text-[#2D2926] placeholder:text-[#8C857D]"
                  />
                  {statementSearch && (
                    <button
                      type="button"
                      onClick={() => setStatementSearch('')}
                      className="absolute right-2.5 top-2.5 text-[#8C857D] hover:text-[#2D2926]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Statement Items List */}
                <div className="space-y-2">
                  {walletTransactions.length === 0 ? (
                    <div className="text-center py-10 bg-[#FAF9F5] rounded-2xl border border-dashed border-[#EAE7DC] text-[#8C857D] space-y-2 p-4">
                      <FileSpreadsheet className="w-8 h-8 mx-auto text-[#8C857D]/50" />
                      <p className="text-xs font-semibold">
                        Chưa có giao dịch sao kê nào cho ví này theo bộ lọc hiện tại.
                      </p>
                      <button
                        type="button"
                        onClick={() => onOpenAddTransaction(selectedWallet.id, 'expense')}
                        className="text-xs font-extrabold text-[#7D8F69] hover:underline block mx-auto pt-1"
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
                          className="flex items-center justify-between p-3 bg-white hover:bg-[#FAF9F5] border border-[#EAE7DC] rounded-2xl transition cursor-pointer gap-3 group shadow-2xs"
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
                                <p
                                  className="font-bold text-xs sm:text-sm text-[#2D2926] truncate max-w-[150px] sm:max-w-xs"
                                  title={tx.note || 'Giao dịch'}
                                >
                                  {tx.note || 'Giao dịch'}
                                </p>
                                {tx.categoryName && (
                                  <span className="px-1.5 py-0.2 bg-[#FAF9F5] text-[#4A443F] text-[10px] font-bold rounded border border-[#EAE7DC] truncate">
                                    {tx.categoryName}
                                  </span>
                                )}
                                {tx.receiptImageUrl && (
                                  <span className="px-1.5 py-0.2 bg-amber-50 text-amber-800 text-[10px] font-bold rounded border border-amber-200 flex items-center gap-0.5 shrink-0">
                                    <Camera className="w-2.5 h-2.5" /> Hóa đơn
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[10px] text-[#8C857D] mt-0.5 flex-wrap">
                                <span className="flex items-center gap-1 shrink-0">
                                  <Clock className="w-2.5 h-2.5" />
                                  {formatTxDateTime(tx)}
                                </span>

                                {tx.type === 'TRANSFER' && (
                                  <span className="text-blue-600 font-bold truncate">
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
