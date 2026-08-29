/**
 * SIVI WALLET - Authentication & Sign-in Modal
 * Harmonized with Natural Tones design theme: #7D8F69, #D98B72, #F1EFE7, #EAE7DC, #2D2926
 * Supports Login, Registration, and Instant Quick-Demo Access with Toast feedback.
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
  AtSign,
} from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';
import { getGreetingName } from '../lib/formatters';
import { SiviLogo } from './SiviLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onAuthSuccess?: (user: User) => void;
  onSuccess?: () => void;
  canDismiss?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  onSuccess,
  canDismiss = false,
}) => {
  const [isRegister, setIsRegister] = useState(false);

  // Login Form States
  const [emailOrUsername, setEmailOrUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Register Form States
  const [registerUsername, setRegisterUsername] = useState<string>('');
  const [registerFullName, setRegisterFullName] = useState<string>('');
  const [registerEmail, setRegisterEmail] = useState<string>('');
  const [registerPassword, setRegisterPassword] = useState<string>('');

  // Feedback & Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const safeInput = String(emailOrUsername || '').trim();
    if (!safeInput) {
      showToast('error', 'Vui lòng nhập Tên đăng nhập hoặc Email');
      return;
    }

    const isEmail = (emailOrUsername || '').includes('@');

    setIsLoading(true);
    setToastMessage(null);

    try {
      const user = await api.auth.login({
        username: safeInput,
        email: isEmail ? safeInput : undefined,
        password: String(loginPassword || ''),
      });

      showToast('success', `Đăng nhập thành công! Chào mừng ${getGreetingName(user)}.`);
      
      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess(user);
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }, 500);
    } catch (err: any) {
      showToast('error', err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const safeUsername = String(registerUsername || '').trim();
    const safeFullName = String(registerFullName || '').trim();
    const safeEmail = String(registerEmail || '').trim();

    if (!safeUsername) {
      showToast('error', 'Vui lòng nhập Tên đăng nhập');
      return;
    }
    if (!safeFullName) {
      showToast('error', 'Vui lòng nhập Họ và tên');
      return;
    }

    setIsLoading(true);
    setToastMessage(null);

    try {
      const user = await api.auth.register({
        username: safeUsername,
        fullName: safeFullName,
        email: safeEmail || undefined,
        password: String(registerPassword || ''),
      });

      showToast('success', 'Tạo tài khoản thành công! Đang thiết lập ví của bạn...');

      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess(user);
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }, 600);
    } catch (err: any) {
      showToast('error', err.message || 'Đăng ký không thành công. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestDemoLogin = async () => {
    setEmailOrUsername('user1');
    setLoginPassword('123456');
    setIsLoading(true);
    setToastMessage(null);

    try {
      const user = await api.auth.login({
        username: 'user1',
        password: '123456',
      });

      showToast('success', 'Đang đăng nhập bằng Tài khoản Demo (user1)...');

      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess(user);
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }, 400);
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi đăng nhập tài khoản Demo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2926]/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#EAE7DC] animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Decorative Header Banner */}
        <div className="bg-[#7D8F69] p-6 text-white relative overflow-hidden shrink-0">
          {canDismiss && onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-10"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="mb-2 relative z-10">
            <SiviLogo
              size="lg"
              variant="light"
              showTagline={true}
              taglineText="Quản lý chi tiêu & Chia tiền nhóm"
            />
          </div>
          <p className="text-xs text-emerald-50/90 font-medium relative z-10 mt-1">
            {isRegister
              ? 'Tạo tài khoản mới để đồng bộ dữ liệu ví trên mọi thiết bị'
              : 'Đăng nhập để xem báo cáo tài chính và sổ nợ thông minh'}
          </p>

          {/* Subtle Decorative Circle */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Toast / Notification Banner */}
          {toastMessage && (
            <div
              className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 font-bold animate-in fade-in slide-in-from-top-1 duration-200 ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-[#D98B72]/10 border-[#D98B72]/30 text-[#D98B72]'
              }`}
            >
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#D98B72] shrink-0" />
              )}
              <span className="flex-1">{toastMessage.text}</span>
            </div>
          )}

          {/* Smooth Tab Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#F1EFE7] rounded-2xl border border-[#EAE7DC]">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setToastMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition ${
                !isRegister ? 'bg-white text-[#2D2926] shadow-xs' : 'text-[#8C857D] hover:text-[#2D2926]'
              }`}
            >
              Đăng Nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setToastMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition ${
                isRegister ? 'bg-white text-[#2D2926] shadow-xs' : 'text-[#8C857D] hover:text-[#2D2926]'
              }`}
            >
              Đăng Ký Mới
            </button>
          </div>

          {/* LOGIN FORM */}
          {!isRegister ? (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#4A443F] block mb-1">
                  Tên đăng nhập hoặc Email:
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#8C857D] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    placeholder="VD: minhtran hoặc nam@sivi.vn"
                    className="w-full pl-10 pr-3 py-2.5 text-xs font-semibold rounded-2xl bg-[#F9F8F3] border border-[#EAE7DC] text-[#2D2926] placeholder:text-[#8C857D]/60 focus:outline-none focus:ring-2 focus:ring-[#7D8F69]"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-[#4A443F]">
                    Mật khẩu:
                  </label>
                  <span className="text-[10px] text-[#8C857D]">Tùy chọn khi dùng thử</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8C857D] absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-2.5 text-xs font-semibold rounded-2xl bg-[#F9F8F3] border border-[#EAE7DC] text-[#2D2926] placeholder:text-[#8C857D]/60 focus:outline-none focus:ring-2 focus:ring-[#7D8F69]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#7D8F69] hover:bg-[#687856] disabled:opacity-50 text-white rounded-2xl text-xs font-extrabold shadow-md transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Đăng Nhập</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#4A443F] block mb-1">
                  Tên đăng nhập: <span className="text-[#D98B72]">*</span>
                </label>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-[#8C857D] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    placeholder="VD: minhtran"
                    className="w-full pl-10 pr-3 py-2.5 text-xs font-semibold rounded-2xl bg-[#F9F8F3] border border-[#EAE7DC] text-[#2D2926] placeholder:text-[#8C857D]/60 focus:outline-none focus:ring-2 focus:ring-[#7D8F69]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#4A443F] block mb-1">
                  Họ và tên: <span className="text-[#D98B72]">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#8C857D] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={registerFullName}
                    onChange={(e) => setRegisterFullName(e.target.value)}
                    placeholder="VD: Trần Minh Nam"
                    className="w-full pl-10 pr-3 py-2.5 text-xs font-semibold rounded-2xl bg-[#F9F8F3] border border-[#EAE7DC] text-[#2D2926] placeholder:text-[#8C857D]/60 focus:outline-none focus:ring-2 focus:ring-[#7D8F69]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#4A443F] block mb-1">
                  Địa chỉ Email (tùy chọn):
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8C857D] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="VD: nam.tran@example.com"
                    className="w-full pl-10 pr-3 py-2.5 text-xs font-semibold rounded-2xl bg-[#F9F8F3] border border-[#EAE7DC] text-[#2D2926] placeholder:text-[#8C857D]/60 focus:outline-none focus:ring-2 focus:ring-[#7D8F69]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#4A443F] block mb-1">
                  Mật khẩu:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8C857D] absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-2.5 text-xs font-semibold rounded-2xl bg-[#F9F8F3] border border-[#EAE7DC] text-[#2D2926] placeholder:text-[#8C857D]/60 focus:outline-none focus:ring-2 focus:ring-[#7D8F69]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#7D8F69] hover:bg-[#687856] disabled:opacity-50 text-white rounded-2xl text-xs font-extrabold shadow-md transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Đăng Ký Tài Khoản</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Access Button */}
          <div className="pt-3 border-t border-[#EAE7DC] text-center space-y-2">
            <button
              type="button"
              onClick={handleGuestDemoLogin}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#F1EFE7] hover:bg-[#EAE7DC] text-[#4A443F] rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 border border-[#EAE7DC] cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>⚡ Dùng Thử Nhanh (Demo Account)</span>
            </button>
            <p className="text-[10px] text-[#8C857D]">
              Dữ liệu ví & sổ nợ nhóm được bảo mật và đồng bộ tự động.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
