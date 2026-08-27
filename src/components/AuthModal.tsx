/**
 * SIVI WALLET - Authentication & Sign-in Modal
 * Harmonized with Natural Tones design theme: #7D8F69, #D98B72, #F1EFE7, #EAE7DC, #2D2926
 */

import React, { useState } from 'react';
import {
  Wallet,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onAuthSuccess: (user: User) => void;
  canDismiss?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  canDismiss = false,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email');
      return;
    }

    if (isRegister && !name.trim()) {
      setError('Vui lòng nhập họ và tên của bạn');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let user: User;
      if (isRegister) {
        user = await api.auth.register(email.trim(), name.trim(), password);
      } else {
        user = await api.auth.login(email.trim(), name.trim() || undefined, password);
      }
      onAuthSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Đăng nhập không thành công. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await api.auth.login('demo.user@sivi.vn', 'Trần Minh Nam', 'demo123');
      onAuthSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi kích hoạt phiên khách');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2926]/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#EAE7DC] animate-in zoom-in-95 duration-200">
        {/* Decorative Top Accent Banner */}
        <div className="bg-[#7D8F69] p-6 text-white relative overflow-hidden">
          {canDismiss && onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-xs">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight leading-none">SIVI WALLET</h2>
              <span className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest">
                Quản lý chi tiêu & Chia tiền nhóm
              </span>
            </div>
          </div>
          <p className="text-xs text-emerald-50/90 font-medium">
            {isRegister
              ? 'Tạo tài khoản mới để đồng bộ dữ liệu ví trên mọi thiết bị'
              : 'Đăng nhập để xem báo cáo tài chính và sổ nợ thông minh'}
          </p>

          {/* Decorative Circle */}
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full pointer-events-none" />
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#F1EFE7] rounded-2xl border border-[#EAE7DC]">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition ${
                !isRegister ? 'bg-white text-[#2D2926] shadow-xs' : 'text-[#8C857D]'
              }`}
            >
              Đăng Nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition ${
                isRegister ? 'bg-white text-[#2D2926] shadow-xs' : 'text-[#8C857D]'
              }`}
            >
              Đăng Ký Mới
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && (
              <div>
                <label className="text-xs font-bold text-[#4A443F] block mb-1">
                  Họ và tên của bạn:
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#8C857D] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Trần Minh Nam"
                    className="w-full pl-10 pr-3 py-2.5 text-xs font-semibold rounded-2xl bg-[#F9F8F3] border border-[#EAE7DC] text-[#2D2926] focus:outline-none focus:ring-2 focus:ring-[#7D8F69]"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-[#4A443F] block mb-1">
                Địa chỉ Email:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8C857D] absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="VD: nam.tran@example.com"
                  className="w-full pl-10 pr-3 py-2.5 text-xs font-semibold rounded-2xl bg-[#F9F8F3] border border-[#EAE7DC] text-[#2D2926] focus:outline-none focus:ring-2 focus:ring-[#7D8F69]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#4A443F] block mb-1">
                Mật khẩu {isRegister ? '' : '(Tùy chọn khi dùng thử)'}:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8C857D] absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 text-xs font-semibold rounded-2xl bg-[#F9F8F3] border border-[#EAE7DC] text-[#2D2926] focus:outline-none focus:ring-2 focus:ring-[#7D8F69]"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-2xl bg-[#D98B72]/10 border border-[#D98B72]/30 text-[#D98B72] text-xs flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#7D8F69] hover:bg-[#687856] disabled:opacity-50 text-white rounded-2xl text-xs font-extrabold shadow-md transition flex items-center justify-center gap-2 active:scale-98"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? 'Tạo Tài Khoản & Bắt Đầu' : 'Đăng Nhập Vào Ví'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo / Instant Access */}
          <div className="pt-2 border-t border-[#EAE7DC] text-center space-y-2">
            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#F1EFE7] hover:bg-[#EAE7DC] text-[#4A443F] rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-[#EAE7DC]"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Dùng Thử Nhanh (Trần Minh Nam - Khách)</span>
            </button>
            <p className="text-[10px] text-[#8C857D]">
              Dữ liệu được lưu an toàn cục bộ và đồng bộ khi có kết nối mạng.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
