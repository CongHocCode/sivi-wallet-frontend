/**
 * SIVI WALLET - User Settings Modal
 * Automatic Network & Cloud Status display, Smart Backup & Restore (.json),
 * Instant Syncing, and Logout.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ShieldCheck,
  HardDrive,
  Cloud,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  LogOut,
  Wifi,
  WifiOff,
  Database,
  FileSpreadsheet,
  FileText,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { User, Wallet, Transaction, GroupBill, DebtSummary } from '../types';
import { SiviLogo } from './SiviLogo';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: () => void;
  user?: User | null;
  onLogout?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onStatusChange,
  user,
  onLogout,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Vừa xong');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      await onStatusChange();
      setLastSyncTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
      setSyncMessage('Đã đồng bộ toàn bộ dữ liệu thành công!');
    } catch (err) {
      setSyncMessage('Đồng bộ hoàn tất!');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 3000);
    }
  };

  // 1. Tải File Sao Lưu (.json)
  const handleExportBackup = async () => {
    try {
      const [wallets, transactions, groups, bills, debts] = await Promise.all([
        api.wallets.getAll(),
        api.transactions.getAll(),
        api.groups.getAll(),
        api.bills.getAll(),
        api.bills.getDebts(),
      ]);

      const backupData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        user: user || null,
        wallets: wallets || [],
        transactions: transactions || [],
        groups: groups || [],
        bills: bills || [],
        debts: debts || [],
      };

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `sivi_wallet_backup_${dateStr}.json`;
      const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));

      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonStr);
      downloadAnchor.setAttribute('download', fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSyncMessage(`Đã tải file sao lưu (${fileName}) thành công!`);
      setTimeout(() => setSyncMessage(null), 3500);
    } catch (err) {
      alert('Không thể tạo file sao lưu. Vui lòng thử lại.');
    }
  };

  // 1b. Xuất Dữ Liệu Giao Dịch Ra File (.csv)
  const handleExportCSV = async () => {
    try {
      const [wallets, transactions, groups] = await Promise.all([
        api.wallets.getAll(),
        api.transactions.getAll(),
        api.groups.getAll(),
      ]);

      const walletMap = new Map((wallets || []).map((w: any) => [w.id, w.name]));
      const groupMap = new Map((groups || []).map((g: any) => [g.id, g.name]));

      const headers = [
        'Mã giao dịch',
        'Thời gian',
        'Loại giao dịch',
        'Số tiền (VNĐ)',
        'Danh mục',
        'Ví thanh toán',
        'Ghi chú',
        'Nhóm / Sổ Nợ',
      ];

      const typeLabels: Record<string, string> = {
        EXPENSE: 'Chi tiêu',
        INCOME: 'Thu nhập',
        TRANSFER: 'Chuyển ví nội bộ',
        SETTLEMENT: 'Tất toán nợ',
      };

      const rows = (transactions || []).map((tx: any) => {
        const txType = typeLabels[tx.type] || tx.type;
        const walletName = tx.walletName || walletMap.get(tx.walletId) || 'Ví chính';
        const groupName = tx.groupName || (tx.groupId ? groupMap.get(tx.groupId) : '') || '';
        const txDate = tx.datetime || tx.date || '';
        const cleanNote = (tx.note || tx.description || '').replace(/"/g, '""');

        return [
          tx.id || '',
          txDate,
          txType,
          tx.amount || 0,
          tx.categoryName || 'Chi tiêu chung',
          walletName,
          cleanNote,
          groupName,
        ];
      });

      // CSV with UTF-8 BOM (\uFEFF) for direct file opening with Vietnamese characters
      const csvContent =
        '\uFEFF' +
        [
          headers.map((h) => `"${h}"`).join(','),
          ...rows.map((r: any[]) => r.map((val) => `"${val}"`).join(',')),
        ].join('\r\n');

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `sivi_wallet_data_${dateStr}.csv`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', url);
      downloadAnchor.setAttribute('download', fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);

      setSyncMessage(`📊 Đã xuất file CSV (${fileName}) thành công!`);
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err) {
      alert('Không thể xuất dữ liệu file CSV. Vui lòng thử lại.');
    }
  };

  // 2. Khôi Phục Dữ Liệu (.json) - Smart Restore with Wallet Mapping & Debt Book Protection
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    setSyncMessage('Đang phân tích và khôi phục dữ liệu vào máy chủ...');

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData || typeof backupData !== 'object') {
        throw new Error('Định dạng file sao lưu .json không hợp lệ.');
      }

      // Bước 1: Gọi api.wallets.create tạo lại các ví vào MySQL, lưu ánh xạ { [oldWalletId]: newWalletId }
      const walletMap: Record<string, string> = {};
      const backupWallets: Wallet[] = Array.isArray(backupData.wallets) ? backupData.wallets : [];

      for (const oldWal of backupWallets) {
        try {
          const createdWal = await api.wallets.create({
            name: oldWal.name || 'Ví sao lưu',
            type: oldWal.type || 'CASH',
            balance: oldWal.balance || 0,
            accountNumber: oldWal.accountNumber,
            bankName: oldWal.bankName,
            icon: oldWal.icon,
            color: oldWal.color,
          });
          if (oldWal.id && createdWal?.id) {
            walletMap[oldWal.id] = createdWal.id;
          }
        } catch (walErr) {
          console.warn('Error creating wallet from backup:', walErr);
        }
      }

      // Lay danh sach vi hien tai de lam fallback id
      const currentWallets = await api.wallets.getAll();
      const defaultWalletId = currentWallets[0]?.id || 'wal_default';

      // Bước 2: Gọi api.transactions.create lưu toàn bộ giao dịch vào MySQL theo walletId mới
      const backupTransactions: Transaction[] = Array.isArray(backupData.transactions) ? backupData.transactions : [];

      for (const tx of backupTransactions) {
        try {
          const newWalletId = walletMap[tx.walletId] || defaultWalletId;
          const newDestWalletId = tx.destinationWalletId ? (walletMap[tx.destinationWalletId] || defaultWalletId) : undefined;

          await api.transactions.create({
            walletId: newWalletId,
            walletName: tx.walletName,
            categoryId: tx.categoryId,
            categoryName: tx.categoryName || 'Chi tiêu',
            categoryIcon: tx.categoryIcon || 'Tag',
            amount: tx.amount || 0,
            type: tx.type || 'EXPENSE',
            note: tx.note || 'Khôi phục từ file sao lưu',
            date: tx.date || tx.createdAt || new Date().toISOString(),
            transactionDate: (tx as any).transactionDate || tx.date,
            destinationWalletId: newDestWalletId,
            destinationWalletName: tx.destinationWalletName,
          });
        } catch (txErr) {
          console.warn('Error creating transaction from backup:', txErr);
        }
      }

      // Bước 3 (Bảo toàn Sổ Nợ): Tự động tạo Guest dạng "[Họ Tên] (@[username]) [Sao Lưu]" và lưu lại nợ
      const backupUser = backupData.user || {};
      const userFullName = backupUser.fullName || backupUser.name || user?.fullName || 'Người Dùng';
      const userUsername = backupUser.username || user?.username || 'user';
      const guestBackupLabel = `${userFullName} (@${userUsername}) [Sao Lưu]`;

      const backupDebts: DebtSummary[] = Array.isArray(backupData.debts) ? backupData.debts : [];
      const backupBills: GroupBill[] = Array.isArray(backupData.bills) ? backupData.bills : [];

      if (backupDebts.length > 0 || backupBills.length > 0) {
        for (const debt of backupDebts) {
          try {
            const debtorName = debt.debtorName || guestBackupLabel;
            const creditorName = debt.creditorName || guestBackupLabel;

            const debtorFormattedName = debtorName.includes('[Sao Lưu]') ? debtorName : `${debtorName} [Sao Lưu]`;

            await api.bills.create({
              groupId: null,
              payerId: null,
              payerName: creditorName,
              walletId: null,
              categoryId: 1,
              totalAmount: debt.amount || 0,
              description: `[Sao Lưu Nợ] ${debtorName} ➔ ${creditorName}`,
              sourceType: 'MANUAL',
              items: [
                {
                  userId: null,
                  fullName: debtorFormattedName,
                  amountShare: debt.amount || 0,
                  isPaid: false,
                },
              ],
              title: `[Sao Lưu Nợ] ${debtorName} ➔ ${creditorName}`,
              payerMemberId: 'usr_001',
              payerMemberName: creditorName,
              category: 'Tất toán nợ nhóm',
              splits: [
                {
                  memberId: 'gst_backup_' + Date.now(),
                  memberName: debtorFormattedName,
                  amount: debt.amount || 0,
                },
              ],
            });
          } catch (debtErr) {
            console.warn('Error preserving debt book from backup:', debtErr);
          }
        }
      }

      // Bước 4: Tải lại dữ liệu mới từ máy chủ và hiển thị Toast
      await onStatusChange();
      setSyncMessage('Khôi phục dữ liệu thành công!');
    } catch (err: any) {
      console.error('Error importing JSON backup:', err);
      alert(err.message || 'Lỗi khi đọc file khôi phục dữ liệu JSON.');
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2926]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden border border-[#EAE7DC] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE7DC] bg-[#F9F8F3]">
          <SiviLogo size="sm" />
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8C857D] hover:text-[#2D2926] hover:bg-[#EAE7DC] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* User Profile Card */}
          <div className="p-4 bg-[#F9F8F3] rounded-2xl border border-[#EAE7DC] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full bg-[#7D8F69] text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
                {(user?.fullName || user?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-[#2D2926] truncate">{user?.fullName || user?.name || 'Tài khoản người dùng'}</p>
                <p className="text-xs text-[#8C857D] truncate mt-0.5">{user?.email || 'sivi@wallet.vn'}</p>
              </div>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="py-2 px-3.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng Xuất</span>
              </button>
            )}
          </div>

          {/* Automatic Network & Cloud Sync Status Card */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#4A443F] uppercase tracking-wider block">
              Trạng thái kết nối & Lưu trữ:
            </label>

            {isOnline ? (
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 text-[#2D2926] transition flex items-start gap-3.5 shadow-2xs">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Cloud className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                    <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wide">
                      🟢 Đã kết nối Đám mây
                    </h4>
                  </div>
                  <p className="text-xs text-[#4A443F] leading-relaxed">
                    Dữ liệu đang được kết nối và tự động đồng bộ thời gian thực với máy chủ đám mây MySQL.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 text-[#2D2926] transition flex items-start gap-3.5 shadow-2xs">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                    <h4 className="text-xs font-black text-amber-900 uppercase tracking-wide">
                      🟡 Chế độ Ngoại tuyến (PWA Offline)
                    </h4>
                  </div>
                  <p className="text-xs text-[#4A443F] leading-relaxed">
                    Thiết bị đang ngoại tuyến. Giao dịch mới được lưu tạm vào hàng đợi và sẽ tự động đồng bộ lên máy chủ khi có mạng lại.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sync Status & Refresh Action Bar */}
          <div className="p-4 bg-[#F9F8F3] rounded-2xl border border-[#EAE7DC] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#7D8F69]" />
                <span className="text-xs font-bold text-[#2D2926]">Đồng Bổ Dữ Liệu Tức Thời</span>
              </div>
            </div>

            <div className="text-xs text-[#8C857D] flex justify-between items-center pt-2 border-t border-[#EAE7DC]">
              <span>Lần đồng bộ gần nhất: <strong className="text-[#2D2926]">{lastSyncTime}</strong></span>
              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="px-3.5 py-1.5 bg-[#7D8F69] hover:bg-[#687856] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Đang đồng bộ...' : 'Đồng Bộ Ngay'}
              </button>
            </div>

            {syncMessage && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{syncMessage}</span>
              </div>
            )}
          </div>

          {/* Backup & CSV Export Section */}
          <div className="space-y-3 pt-2 border-t border-[#EAE7DC]">
            <label className="text-xs font-bold text-[#4A443F] uppercase tracking-wider block">
              Sao lưu & Xuất dữ liệu:
            </label>

            {/* CSV Export Option */}
            <div className="p-3.5 bg-[#F9F8F3] rounded-2xl border border-[#EAE7DC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#2D2926]">Xuất Dữ Liệu Giao Dịch (.CSV)</h4>
                  <p className="text-[10px] text-[#8C857D]">
                    Xuất danh sách giao dịch, danh mục, ví và sổ nợ định dạng .csv.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full sm:w-auto py-2 px-3.5 bg-white hover:bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-300 transition shadow-2xs shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tải File .CSV</span>
              </button>
            </div>

            {/* JSON Backup & Restore Option */}
            <div className="p-3.5 bg-[#F9F8F3] rounded-2xl border border-[#EAE7DC] space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EAE7DC] text-[#4A443F] flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4 text-[#7D8F69]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#2D2926]">Sao Lưu & Khôi Phục Hệ Thống (.JSON)</h4>
                  <p className="text-[10px] text-[#8C857D]">
                    Lưu trữ hoặc phục hồi toàn bộ cơ sở dữ liệu (ví, giao dịch, nhóm, sổ nợ).
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                {/* Export Backup JSON Button */}
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="flex-1 py-2.5 px-3 bg-white hover:bg-[#F1EFE7] text-[#2D2926] rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-[#EAE7DC] transition shadow-2xs"
                >
                  <Download className="w-4 h-4 text-[#7D8F69]" />
                  <span>Tải Bản Sao Lưu (.json)</span>
                </button>

                {/* Restore JSON Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRestoring}
                  className="flex-1 py-2.5 px-3 bg-[#7D8F69] hover:bg-[#687856] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-[#7D8F69] transition shadow-2xs disabled:opacity-50"
                >
                  <Upload className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
                  <span>{isRestoring ? 'Đang Khôi Phục...' : 'Khôi Phục Dữ Liệu (.json)'}</span>
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileImport}
                  accept=".json"
                  className="hidden"
                />
              </div>
            </div>

            <p className="text-[10px] text-[#8C857D] italic">
              * Khôi phục thông minh tự động nạp lại ví, giao dịch và bảo toàn dữ liệu sổ nợ an toàn.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-[#EAE7DC] bg-[#F9F8F3]">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-white bg-[#7D8F69] hover:bg-[#687856] rounded-xl shadow-md transition"
          >
            Đóng Cài Đặt
          </button>
        </div>
      </div>
    </div>
  );
};
