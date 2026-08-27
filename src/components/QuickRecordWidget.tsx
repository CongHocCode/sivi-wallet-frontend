/**
 * SIVI WALLET - Unified Quick Record Transaction Widget
 * Consolidates AI NLP prompt, Voice, Receipt OCR (with note, drag & drop), and Manual entry (with quick category chips) in ONE clean place.
 */

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Mic,
  Camera,
  Edit3,
  Upload,
  CheckCircle2,
  AlertCircle,
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Receipt,
  HeartPulse,
  Wallet as WalletIcon,
  TrendingUp,
  Tag,
  ShoppingCart,
  Film,
  X,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';
import { api } from '../services/api';
import { geminiService } from '../services/geminiService';
import { Wallet, Category, TransactionType } from '../types';
import { formatVND, parseVNDInput, toDateTimeLocalString } from '../lib/formatters';

interface QuickRecordWidgetProps {
  wallets: Wallet[];
  categories: Category[];
  onSuccess: () => void;
  onOpenOcrFull?: () => void;
  onOpenNlpFull?: () => void;
}

type RecordTab = 'nlp' | 'ocr' | 'manual';

const getCategoryIconComponent = (iconName?: string, name?: string) => {
  const lowercaseName = (name || '').toLowerCase();
  if (
    iconName === 'UtensilsCrossed' ||
    iconName === 'Utensils' ||
    lowercaseName.includes('ăn') ||
    lowercaseName.includes('uống') ||
    lowercaseName.includes('cơm') ||
    lowercaseName.includes('cafe') ||
    lowercaseName.includes('cà phê')
  ) {
    return UtensilsCrossed;
  }
  if (
    iconName === 'Car' ||
    lowercaseName.includes('đi lại') ||
    lowercaseName.includes('xe') ||
    lowercaseName.includes('xăng') ||
    lowercaseName.includes('di chuyển')
  ) {
    return Car;
  }
  if (
    iconName === 'ShoppingBag' ||
    lowercaseName.includes('mua sắm') ||
    lowercaseName.includes('quần áo')
  ) {
    return ShoppingBag;
  }
  if (lowercaseName.includes('chợ') || lowercaseName.includes('siêu thị')) {
    return ShoppingCart;
  }
  if (
    iconName === 'Receipt' ||
    lowercaseName.includes('hóa đơn') ||
    lowercaseName.includes('điện') ||
    lowercaseName.includes('nước') ||
    lowercaseName.includes('internet')
  ) {
    return Receipt;
  }
  if (
    iconName === 'Sparkles' ||
    lowercaseName.includes('giải trí') ||
    lowercaseName.includes('phim') ||
    lowercaseName.includes('game')
  ) {
    return Film;
  }
  if (
    iconName === 'HeartPulse' ||
    lowercaseName.includes('sức khỏe') ||
    lowercaseName.includes('thuốc') ||
    lowercaseName.includes('khám')
  ) {
    return HeartPulse;
  }
  if (
    iconName === 'Wallet' ||
    lowercaseName.includes('lương') ||
    lowercaseName.includes('thu nhập')
  ) {
    return WalletIcon;
  }
  if (
    iconName === 'TrendingUp' ||
    lowercaseName.includes('thưởng') ||
    lowercaseName.includes('lãi') ||
    lowercaseName.includes('đầu tư')
  ) {
    return TrendingUp;
  }
  return Tag;
};

export const QuickRecordWidget: React.FC<QuickRecordWidgetProps> = ({
  wallets,
  categories,
  onSuccess,
  onOpenOcrFull,
  onOpenNlpFull,
}) => {
  const [activeTab, setActiveTab] = useState<RecordTab>('nlp');

  // NLP State
  const [nlpPrompt, setNlpPrompt] = useState('');
  const [isNlpLoading, setIsNlpLoading] = useState(false);
  const [nlpSuccessMsg, setNlpSuccessMsg] = useState<string | null>(null);

  // Manual State
  const [manualType, setManualType] = useState<TransactionType>('EXPENSE');
  const [manualAmount, setManualAmount] = useState('');
  const [manualWalletId, setManualWalletId] = useState(wallets[0]?.id || '');
  const [manualCatId, setManualCatId] = useState(categories[0]?.id || '');
  const [manualNote, setManualNote] = useState('');
  const [manualDate, setManualDate] = useState<string>(toDateTimeLocalString(new Date()));
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);
  const [manualSuccessMsg, setManualSuccessMsg] = useState<string | null>(null);

  // OCR State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [ocrNote, setOcrNote] = useState('');
  const [ocrWalletId, setOcrWalletId] = useState<string>('');
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState<string | null>(null);
  const [ocrErrorMsg, setOcrErrorMsg] = useState<string | null>(null);

  // Available categories filtered by active manualType
  const availableCategories = useMemo(() => {
    const filtered = categories.filter((c) => {
      if (manualType === 'EXPENSE') return c.type === 'EXPENSE' || !c.type;
      if (manualType === 'INCOME') return c.type === 'INCOME';
      return true;
    });
    return filtered.length > 0 ? filtered : categories;
  }, [categories, manualType]);

  // Current selected category object
  const currentCategory = useMemo(() => {
    return categories.find((c) => c.id === manualCatId) || availableCategories[0] || categories[0];
  }, [categories, availableCategories, manualCatId]);

  // Update selected category when type changes if needed
  const handleTypeChange = (type: TransactionType) => {
    setManualType(type);
    const matching = categories.filter((c) => (type === 'EXPENSE' ? c.type === 'EXPENSE' || !c.type : c.type === 'INCOME'));
    if (matching.length > 0 && !matching.some((c) => c.id === manualCatId)) {
      setManualCatId(matching[0].id);
    }
  };

  // NLP Submit
  const handleNlpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlpPrompt.trim()) return;

    setIsNlpLoading(true);
    setNlpSuccessMsg(null);
    try {
      const parsed = await api.coach.parseNLP(nlpPrompt);
      const matchedWallet =
        wallets.find((w) =>
          w.name.toLowerCase().includes((parsed.walletName || '').toLowerCase())
        ) || wallets[0];

      const matchedCat =
        categories.find((c) =>
          c.name.toLowerCase().includes((parsed.category || '').toLowerCase())
        ) || categories[0];

      if (matchedWallet) {
        const parsedDate = parsed.date ? new Date(parsed.date) : new Date();
        const safeDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
        const transactionDate = safeDate.toISOString().slice(0, 19);

        await api.transactions.create({
          walletId: matchedWallet.id,
          walletName: matchedWallet.name,
          categoryId: matchedCat?.id,
          categoryName: matchedCat?.name || 'Chi tiêu',
          categoryIcon: matchedCat?.icon || 'Tag',
          amount: parsed.amount,
          type: parsed.type || 'EXPENSE',
          note: parsed.note,
          date: transactionDate,
          transactionDate,
        });
        setNlpSuccessMsg(`Đã ghi nhận: ${parsed.note} (${formatVND(parsed.amount)})`);
        setNlpPrompt('');
        onSuccess();
        setTimeout(() => setNlpSuccessMsg(null), 4000);
      }
    } catch (err) {
      if (onOpenNlpFull) onOpenNlpFull();
    } finally {
      setIsNlpLoading(false);
    }
  };

  // Manual Submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseVNDInput(manualAmount);
    if (!parsedAmt || parsedAmt <= 0) return;

    setIsManualSubmitting(true);
    setManualSuccessMsg(null);
    try {
      const selectedWallet = wallets.find((w) => w.id === manualWalletId) || wallets[0];
      const selectedCategory = categories.find((c) => c.id === manualCatId) || availableCategories[0] || categories[0];

      const validManualDate = manualDate ? new Date(manualDate) : new Date();
      const safeManualDate = isNaN(validManualDate.getTime()) ? new Date() : validManualDate;
      const transactionDate = safeManualDate.toISOString().slice(0, 19);

      // If user does not provide note, use the selected category name as the note!
      const categoryName = selectedCategory?.name || (manualType === 'EXPENSE' ? 'Chi tiêu' : 'Thu nhập');
      const finalNote = manualNote.trim() ? manualNote.trim() : categoryName;

      await api.transactions.create({
        walletId: selectedWallet.id,
        walletName: selectedWallet.name,
        categoryId: selectedCategory?.id,
        categoryName: selectedCategory?.name || categoryName,
        categoryIcon: selectedCategory?.icon || 'Tag',
        amount: parsedAmt,
        type: manualType,
        note: finalNote,
        date: transactionDate,
        transactionDate,
      });

      setManualAmount('');
      setManualNote('');
      setManualSuccessMsg(`Đã thêm: ${finalNote} (${formatVND(parsedAmt)})`);
      onSuccess();
      setTimeout(() => setManualSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Manual transaction submit error:', err);
    } finally {
      setIsManualSubmitting(false);
    }
  };

  // OCR Image select & Drag-and-drop
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setOcrErrorMsg('Vui lòng chọn file hình ảnh (JPG, PNG, WEBP...)');
      return;
    }
    setOcrErrorMsg(null);
    setOcrSuccessMsg(null);
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleOcrProcess = async () => {
    if (!selectedFile) return;
    setIsOcrLoading(true);
    setOcrErrorMsg(null);
    setOcrSuccessMsg(null);

    try {
      const res = await geminiService.scanReceipt(selectedFile, ocrNote || undefined);
      if (res) {
        // Choose wallet: explicit selection > matched wallet > first wallet
        let chosenWallet = wallets.find((w) => w.id === ocrWalletId);
        if (!chosenWallet) {
          const textToCheck = `${res.paymentMethod || ''} ${res.rawNotes || ''} ${res.note || ''} ${ocrNote || ''}`.toLowerCase();
          chosenWallet = wallets.find((w) => {
            const wName = w.name.toLowerCase();
            return (
              textToCheck.includes(wName) ||
              (w.type === 'E_WALLET' && (textToCheck.includes('momo') || textToCheck.includes('zalopay') || textToCheck.includes('ví'))) ||
              (w.type === 'CASH' && (textToCheck.includes('tiền mặt') || textToCheck.includes('cash'))) ||
              (w.type === 'BANK' && (textToCheck.includes('chuyển khoản') || textToCheck.includes('bank') || textToCheck.includes('ngân hàng')))
            );
          }) || wallets[0];
        }

        // Match category from extracted OCR category or fallback
        const resCat = (res.category || '').toLowerCase();
        const matchedCat = categories.find((c) =>
          c.name.toLowerCase().includes(resCat)
        ) || categories.find((c) => c.name.toLowerCase().includes('ăn')) || categories[0];

        // Format combined note
        const noteItems = (res.items || []).map((i: any) => i.name || i.itemName).filter(Boolean).join(', ');
        const itemsSummary = noteItems ? ` (${noteItems})` : '';
        const baseNote = `[Quét Hóa Đơn] ${res.merchantName || 'Hóa đơn'}${itemsSummary}`;
        const finalNote = ocrNote.trim()
          ? `${baseNote} — ${ocrNote.trim()}`
          : (res.rawNotes ? `${baseNote} — ${res.rawNotes}` : (res.note ? `${baseNote} — ${res.note}` : baseNote));

        const parsedDate = res.transactionDate ? new Date(res.transactionDate) : new Date();
        const safeDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
        const transactionDate = safeDate.toISOString().slice(0, 19);

        await api.transactions.create({
          walletId: chosenWallet?.id || wallets[0]?.id || '',
          walletName: chosenWallet?.name,
          categoryId: matchedCat?.id,
          categoryName: matchedCat?.name || 'Ăn uống',
          categoryIcon: matchedCat?.icon || 'Utensils',
          amount: res.totalAmount || 0,
          type: 'EXPENSE',
          note: finalNote,
          date: transactionDate,
          transactionDate,
        });

        setOcrSuccessMsg(`Đã lưu hóa đơn: ${res.merchantName || 'Hóa đơn'} (${formatVND(res.totalAmount || 0)}) vào ví ${chosenWallet?.name || 'mặc định'}`);
        setSelectedFile(null);
        setPreviewUrl(null);
        setOcrNote('');
        onSuccess();
        setTimeout(() => setOcrSuccessMsg(null), 5000);
      } else {
        setOcrErrorMsg('Không nhận diện được nội dung hóa đơn. Bạn có thể mở giao diện quét chi tiết.');
      }
    } catch (err: any) {
      console.error('Quick OCR Process error:', err);
      const msg = err?.message || 'Có lỗi khi phân tích hóa đơn với Gemini AI';
      setOcrErrorMsg(msg);
    } finally {
      setIsOcrLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#EAE7DC] rounded-2xl sm:rounded-[28px] p-3.5 sm:p-5 shadow-sm space-y-3.5">
      {/* Tab Switchers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#EAE7DC] pb-2.5 gap-2">
        <span className="text-[11px] sm:text-xs font-extrabold text-[#4A443F] uppercase tracking-wider">
          Ghi giao dịch nhanh
        </span>

        <div className="flex items-center gap-1 bg-[#F9F8F3] p-0.5 sm:p-1 rounded-xl sm:rounded-2xl border border-[#EAE7DC] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('nlp')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition whitespace-nowrap ${
              activeTab === 'nlp'
                ? 'bg-[#7D8F69] text-white shadow-2xs'
                : 'text-[#8C857D] hover:text-[#2D2926]'
            }`}
          >
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> AI Nhập nhanh
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ocr')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition whitespace-nowrap ${
              activeTab === 'ocr'
                ? 'bg-[#7D8F69] text-white shadow-2xs'
                : 'text-[#8C857D] hover:text-[#2D2926]'
            }`}
          >
            <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Quét Hóa Đơn
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition whitespace-nowrap ${
              activeTab === 'manual'
                ? 'bg-[#7D8F69] text-white shadow-2xs'
                : 'text-[#8C857D] hover:text-[#2D2926]'
            }`}
          >
            <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Thủ Công
          </button>
        </div>
      </div>

      {/* TAB 1: NLP / VOICE ENTRY */}
      {activeTab === 'nlp' && (
        <form onSubmit={handleNlpSubmit} className="space-y-3">
          <div className="flex items-center gap-2 bg-[#F9F8F3] border border-[#EAE7DC] rounded-2xl p-2.5">
            <button
              type="button"
              onClick={() => onOpenNlpFull && onOpenNlpFull()}
              className="w-9 h-9 bg-[#7D8F69] text-white rounded-xl flex items-center justify-center shrink-0 hover:bg-[#687856] transition"
              title="Ghi âm giọng nói"
            >
              <Mic className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={nlpPrompt}
              onChange={(e) => setNlpPrompt(e.target.value)}
              placeholder='Ví dụ: "Trưa nay ăn cơm tấm 45k trả bằng MoMo với Nam"'
              className="flex-1 bg-transparent text-xs font-medium text-[#2D2926] outline-none placeholder-[#8C857D]"
            />
            <button
              type="submit"
              disabled={isNlpLoading || !nlpPrompt.trim()}
              className="bg-[#2D2926] hover:bg-[#1a1816] text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 transition shrink-0"
            >
              {isNlpLoading ? (
                <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-300" />
              ) : (
                'Ghi Nhận'
              )}
            </button>
          </div>

          {nlpSuccessMsg && (
            <div className="p-2.5 bg-[#7D8F69]/10 text-[#7D8F69] rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {nlpSuccessMsg}
            </div>
          )}
        </form>
      )}

      {/* TAB 2: OCR RECEIPT SCAN WITH NOTE & DRAG AND DROP */}
      {activeTab === 'ocr' && (
        <div className="space-y-3">
          {!previewUrl ? (
            <label
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition text-center group ${
                isDragging
                  ? 'border-[#7D8F69] bg-[#7D8F69]/10 scale-[1.01] ring-2 ring-[#7D8F69]/30'
                  : 'border-[#EAE7DC] hover:border-[#7D8F69] bg-[#F9F8F3] hover:bg-[#F1EFE7]/50'
              }`}
            >
              <div className="w-11 h-11 rounded-2xl bg-white shadow-2xs border border-[#EAE7DC] flex items-center justify-center mb-2 group-hover:scale-105 transition">
                <Upload className="w-5 h-5 text-[#7D8F69]" />
              </div>
              <span className="text-xs font-bold text-[#2D2926]">
                {isDragging ? 'Thả ảnh hóa đơn vào đây ngay...' : 'Kéo thả hoặc nhấn để chọn ảnh hóa đơn'}
              </span>
              <span className="text-[10px] text-[#8C857D] mt-0.5">
                Hỗ trợ JPG, PNG, WEBP — Gemini Vision bóc tách món ăn, tổng tiền & tự động lưu
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleImageFile(e.target.files[0]);
                  }
                }}
              />
            </label>
          ) : (
            <div className="space-y-3">
              {/* Image Preview Card */}
              <div className="relative flex items-center gap-3 bg-[#F9F8F3] p-2.5 rounded-2xl border border-[#EAE7DC]">
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  className="w-14 h-14 object-cover rounded-xl shrink-0 border border-[#EAE7DC]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#7D8F69] shrink-0" />
                    <p className="text-xs font-bold text-[#2D2926] truncate">
                      {selectedFile?.name || 'Ảnh hóa đơn'}
                    </p>
                  </div>
                  <p className="text-[10px] text-[#8C857D] mt-0.5">
                    {isOcrLoading ? (
                      <span className="text-[#7D8F69] font-bold animate-pulse">
                        Đang phân tích với Gemini Vision AI...
                      </span>
                    ) : (
                      'Sẵn sàng bóc tách tự động khi nhấn Quét & Ghi nhận'
                    )}
                  </p>
                </div>
                {!isOcrLoading && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setOcrErrorMsg(null);
                    }}
                    className="p-1.5 text-[#8C857D] hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                    title="Đổi ảnh khác"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Optional Fields: Note & Wallet */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={ocrNote}
                    onChange={(e) => setOcrNote(e.target.value)}
                    disabled={isOcrLoading}
                    placeholder="Ghi chú thêm (không bắt buộc, vd: liên hoan team, mua đồ gia đình...)"
                    className="w-full p-2 text-xs font-medium rounded-xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] placeholder:text-[#8C857D] focus:outline-none focus:ring-1.5 focus:ring-[#7D8F69] disabled:opacity-50"
                  />
                </div>
                <div>
                  <select
                    value={ocrWalletId}
                    onChange={(e) => setOcrWalletId(e.target.value)}
                    disabled={isOcrLoading}
                    className="w-full p-2 text-xs font-semibold rounded-xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] disabled:opacity-50"
                  >
                    <option value="">Ví: Tự động nhận diện</option>
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Error Notification */}
              {ocrErrorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center justify-between gap-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span className="truncate">{ocrErrorMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOcrProcess}
                    className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[11px] font-bold shrink-0 hover:bg-rose-700 transition"
                  >
                    Thử lại
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => onOpenOcrFull && onOpenOcrFull()}
                  className="text-[11px] font-bold text-[#7D8F69] hover:underline"
                >
                  Mở quét hóa đơn nâng cao →
                </button>
                <button
                  type="button"
                  onClick={handleOcrProcess}
                  disabled={isOcrLoading}
                  className="px-5 py-2.5 bg-[#7D8F69] hover:bg-[#687856] text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isOcrLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang bóc tách & lưu...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Quét & Ghi Nhận</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {ocrSuccessMsg && (
            <div className="p-2.5 bg-[#7D8F69]/10 border border-[#7D8F69]/20 text-[#7D8F69] rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#7D8F69]" />
              <span>{ocrSuccessMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MANUAL FORM WITH QUICK CATEGORY MENU */}
      {activeTab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="space-y-3">
          {/* Quick Category Chips / Menu */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-[#8C857D] uppercase tracking-wider">
                Chọn nhanh danh mục:
              </span>
              <span className="text-[11px] font-bold text-[#7D8F69]">
                Đang chọn: {currentCategory?.name || 'Chi tiêu'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {availableCategories.map((cat) => {
                const IconComponent = getCategoryIconComponent(cat.icon, cat.name);
                const isSelected = manualCatId === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setManualCatId(cat.id)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 border cursor-pointer ${
                      isSelected
                        ? 'bg-[#7D8F69] text-white border-[#7D8F69] shadow-2xs'
                        : 'bg-[#F9F8F3] text-[#4A443F] border-[#EAE7DC] hover:bg-[#F1EFE7]'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5 shrink-0" />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Type selector */}
            <div className="flex bg-[#F9F8F3] p-1 rounded-xl border border-[#EAE7DC]">
              <button
                type="button"
                onClick={() => handleTypeChange('EXPENSE')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  manualType === 'EXPENSE' ? 'bg-[#D98B72] text-white shadow-2xs' : 'text-[#8C857D]'
                }`}
              >
                Chi
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('INCOME')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  manualType === 'INCOME' ? 'bg-[#7D8F69] text-white shadow-2xs' : 'text-[#8C857D]'
                }`}
              >
                Thu
              </button>
            </div>

            {/* Amount input */}
            <input
              type="text"
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              placeholder="Số tiền (vd: 45k, 1.5tr)"
              className="p-2 text-xs font-bold rounded-xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] placeholder:text-[#8C857D] focus:outline-none focus:ring-1 focus:ring-[#7D8F69]"
            />

            {/* Wallet selector */}
            <select
              value={manualWalletId}
              onChange={(e) => setManualWalletId(e.target.value)}
              className="p-2 text-xs font-semibold rounded-xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] focus:outline-none focus:ring-1 focus:ring-[#7D8F69]"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatVND(w.balance)})
                </option>
              ))}
            </select>
          </div>

          {/* Note & Datetime */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <input
                type="text"
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                placeholder={`Ghi chú (để trống sẽ dùng: "${currentCategory?.name || 'Chi tiêu'}")`}
                className="w-full p-2 text-xs font-medium rounded-xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] placeholder:text-[#8C857D] focus:outline-none focus:ring-1 focus:ring-[#7D8F69]"
              />
            </div>
            <div>
              <input
                type="datetime-local"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full p-2 text-xs font-semibold rounded-xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] focus:outline-none focus:ring-1 focus:ring-[#7D8F69]"
              />
            </div>
          </div>

          {manualSuccessMsg && (
            <div className="p-2.5 bg-[#7D8F69]/10 text-[#7D8F69] rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {manualSuccessMsg}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-[#8C857D]">
              * Nếu không nhập ghi chú, hệ thống tự động dùng tên danh mục.
            </span>
            <button
              type="submit"
              disabled={isManualSubmitting || !manualAmount}
              className="px-5 py-2 bg-[#7D8F69] hover:bg-[#687856] text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {isManualSubmitting ? 'Đang lưu...' : 'Lưu Giao Dịch'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
