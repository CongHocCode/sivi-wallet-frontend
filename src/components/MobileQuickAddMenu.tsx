/**
 * SIVI WALLET - Mobile Quick Add Menu (Action Sheet)
 * Triggers when clicking the floating '+' button on mobile or desktop.
 * Allows choosing between AI Voice/Text, OCR Scan, Manual Expense/Income, Transfer, or Group Bill.
 */

import React from 'react';
import {
  X,
  Sparkles,
  Camera,
  Edit3,
  ArrowRightLeft,
  Users,
  ChevronRight,
  Zap,
} from 'lucide-react';

interface MobileQuickAddMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: 'nlp' | 'ocr' | 'manual' | 'transfer' | 'bill') => void;
}

export const MobileQuickAddMenu: React.FC<MobileQuickAddMenuProps> = ({
  isOpen,
  onClose,
  onSelectOption,
}) => {
  if (!isOpen) return null;

  const handleChoice = (option: 'nlp' | 'ocr' | 'manual' | 'transfer' | 'bill') => {
    onSelectOption(option);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200 p-0 sm:p-4">
      {/* Sheet / Modal Container */}
      <div className="w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] border border-[#EAE7DC] p-5 sm:p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EAE7DC]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#7D8F69] text-white flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#2D2926]">Thêm Giao Dịch Mới</h3>
              <p className="text-[10px] text-[#8C857D]">Chọn phương thức nhập phù hợp nhu cầu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8C857D] hover:text-[#2D2926] hover:bg-[#F9F8F3] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options List */}
        <div className="space-y-2.5">
          {/* Option 1: AI Voice/Text */}
          <button
            onClick={() => handleChoice('nlp')}
            className="w-full p-3.5 bg-[#F9F8F3] hover:bg-[#F1EFE7] active:scale-[0.99] rounded-2xl border border-[#EAE7DC] flex items-center justify-between transition group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#7D8F69] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#2D2926]">AI Giọng Nói & Câu Nhập</span>
                  <span className="px-2 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-extrabold rounded-full">
                    Nhanh 1-chạm
                  </span>
                </div>
                <p className="text-[11px] text-[#8C857D] mt-0.5">
                  Đọc hoặc gõ câu: "Trưa nay ăn cơm tấm 45k bằng MoMo..."
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8C857D] group-hover:translate-x-0.5 transition" />
          </button>

          {/* Option 2: OCR Receipt Scan */}
          <button
            onClick={() => handleChoice('ocr')}
            className="w-full p-3.5 bg-[#F9F8F3] hover:bg-[#F1EFE7] active:scale-[0.99] rounded-2xl border border-[#EAE7DC] flex items-center justify-between transition group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2D2926] text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#2D2926]">Quét Hóa Đơn AI (OCR)</span>
                  <span className="px-2 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-extrabold rounded-full">
                    Chính xác
                  </span>
                </div>
                <p className="text-[11px] text-[#8C857D] mt-0.5">
                  Chụp hoặc tải ảnh hóa đơn nhà hàng, siêu thị để AI tự bóc tách
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8C857D] group-hover:translate-x-0.5 transition" />
          </button>

          {/* Option 3: Manual Expense/Income */}
          <button
            onClick={() => handleChoice('manual')}
            className="w-full p-3.5 bg-[#F9F8F3] hover:bg-[#F1EFE7] active:scale-[0.99] rounded-2xl border border-[#EAE7DC] flex items-center justify-between transition group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D98B72] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#2D2926] block">
                  Ghi Thu / Chi Thủ Công
                </span>
                <p className="text-[11px] text-[#8C857D] mt-0.5">
                  Nhập nhanh số tiền, chọn ví và chọn biểu tượng danh mục
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8C857D] group-hover:translate-x-0.5 transition" />
          </button>

          {/* Option 4: Wallet Transfer */}
          <button
            onClick={() => handleChoice('transfer')}
            className="w-full p-3.5 bg-[#F9F8F3] hover:bg-[#F1EFE7] active:scale-[0.99] rounded-2xl border border-[#EAE7DC] flex items-center justify-between transition group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#2D2926] block">
                  Chuyển Tiền Giữa Các Ví
                </span>
                <p className="text-[11px] text-[#8C857D] mt-0.5">
                  Nạp tiền, rút ATM hoặc chuyển từ Ví Ngân Hàng sang MoMo
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8C857D] group-hover:translate-x-0.5 transition" />
          </button>

          {/* Option 5: Group Bill */}
          <button
            onClick={() => handleChoice('bill')}
            className="w-full p-3.5 bg-[#F9F8F3] hover:bg-[#F1EFE7] active:scale-[0.99] rounded-2xl border border-[#EAE7DC] flex items-center justify-between transition group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#2D2926] block">
                  Ghi Kèo / Chia Tiền Nhóm
                </span>
                <p className="text-[11px] text-[#8C857D] mt-0.5">
                  Tạo kèo chi chung nhóm, tự động tính số tiền nợ từng bạn
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8C857D] group-hover:translate-x-0.5 transition" />
          </button>
        </div>
      </div>
    </div>
  );
};
