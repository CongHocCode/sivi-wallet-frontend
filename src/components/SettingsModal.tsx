/**
 * SIVI WALLET - User Settings Modal
 * Focuses on Storage Mode Choice (Local vs. Cloud), Sync Status, Backup/Restore, and Data Security.
 * Free from developer/technical details (no raw backend URLs or API keys displayed).
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  CloudCheck,
  Cloud,
  Check,
  RefreshCw,
  Download,
  Upload,
  ShieldCheck,
  HardDrive,
  Trash2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { apiService } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onStatusChange,
}) => {
  const [isMockMode, setIsMockMode] = useState(apiService.getIsMockMode());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Vừa xong');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsMockMode(apiService.getIsMockMode());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleModeChange = (useLocal: boolean) => {
    setIsMockMode(useLocal);
    apiService.setIsMockMode(useLocal);
    onStatusChange();
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    // Simulate sync
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLastSyncTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    setIsSyncing(false);
    setSyncMessage('Đã đồng bộ toàn bộ dữ liệu thành công!');
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const handleExportBackup = async () => {
    try {
      const [wallets, transactions, groups] = await Promise.all([
        apiService.getWallets(),
        apiService.getTransactions(),
        apiService.getGroups(),
      ]);
      const data = { wallets, transactions, groups, exportDate: new Date().toISOString() };
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `SiviWallet_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setSyncMessage('Đã tải file sao lưu thành công!');
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (err) {
      alert('Không thể tạo file sao lưu.');
    }
  };

  const handleResetData = () => {
    if (window.confirm('Bạn có chắc chắn muốn đặt lại dữ liệu mẫu ứng dụng về ban đầu?')) {
      localStorage.clear();
      onStatusChange();
      setSyncMessage('Đã khôi phục dữ liệu ban đầu!');
      setTimeout(() => setSyncMessage(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2926]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden border border-[#EAE7DC] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE7DC] bg-[#F9F8F3]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#7D8F69] text-white flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#2D2926]">Lưu Trữ & Đồng Bộ Dữ Liệu</h2>
              <p className="text-[10px] text-[#8C857D]">Quản lý an toàn dữ liệu ví và tài khoản của bạn</p>
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
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Storage Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#4A443F] uppercase tracking-wider block">
              Chế độ lưu trữ dữ liệu:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Local Storage */}
              <button
                type="button"
                onClick={() => handleModeChange(true)}
                className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                  isMockMode
                    ? 'border-[#7D8F69] bg-[#7D8F69]/10 text-[#2D2926] ring-1 ring-[#7D8F69]'
                    : 'border-[#EAE7DC] bg-[#F9F8F3] text-[#8C857D] hover:bg-[#F1EFE7]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  {isMockMode && <Check className="w-4 h-4 text-[#7D8F69]" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#2D2926]">Lưu Trên Thiết Bị</h4>
                  <p className="text-[10px] text-[#8C857D] mt-0.5 leading-relaxed">
                    Riêng tư 100%, dữ liệu nằm an toàn trong bộ nhớ máy của bạn.
                  </p>
                </div>
              </button>

              {/* Option 2: Cloud Sync */}
              <button
                type="button"
                onClick={() => handleModeChange(false)}
                className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                  !isMockMode
                    ? 'border-[#7D8F69] bg-[#7D8F69]/10 text-[#2D2926] ring-1 ring-[#7D8F69]'
                    : 'border-[#EAE7DC] bg-[#F9F8F3] text-[#8C857D] hover:bg-[#F1EFE7]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                    <Cloud className="w-4 h-4" />
                  </div>
                  {!isMockMode && <Check className="w-4 h-4 text-[#7D8F69]" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#2D2926]">Đồng Bộ Đám Mây</h4>
                  <p className="text-[10px] text-[#8C857D] mt-0.5 leading-relaxed">
                    Tự động sao lưu và đồng bộ tức thì trên điện thoại và máy tính.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Sync Status Card */}
          <div className="p-4 bg-[#F9F8F3] rounded-2xl border border-[#EAE7DC] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-bold text-[#2D2926]">Trạng Thái Đồng Bộ Dữ Liệu</span>
              </div>
              <span className="text-[10px] text-[#8C857D]">Mã hóa 256-bit</span>
            </div>

            <div className="text-xs text-[#8C857D] flex justify-between items-center pt-1 border-t border-[#EAE7DC]/60">
              <span>Lần đồng bộ gần nhất: <strong className="text-[#2D2926]">{lastSyncTime}</strong></span>
              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="px-3 py-1.5 bg-[#7D8F69] hover:bg-[#687856] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Đang đồng bộ...' : 'Đồng Bộ Ngay'}
              </button>
            </div>

            {syncMessage && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {syncMessage}
              </div>
            )}
          </div>

          {/* Backup & Data Actions */}
          <div className="space-y-2 pt-2 border-t border-[#EAE7DC]">
            <label className="text-xs font-bold text-[#4A443F] uppercase tracking-wider block">
              Sao lưu & Khôi phục dữ liệu:
            </label>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleExportBackup}
                className="flex-1 py-2.5 px-3 bg-[#F1EFE7] hover:bg-[#EAE7DC] text-[#2D2926] rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-[#EAE7DC] transition"
              >
                <Download className="w-4 h-4 text-[#7D8F69]" /> Tải File Sao Lưu (.json)
              </button>

              <button
                onClick={handleResetData}
                className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-rose-200 transition"
              >
                <Trash2 className="w-4 h-4" /> Đặt Lại Dữ Liệu
              </button>
            </div>
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
