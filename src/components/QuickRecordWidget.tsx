/**
 * SIVI WALLET - Unified Quick Record Transaction Widget
 * Consolidates AI NLP prompt, Voice, Receipt OCR, and Manual entry in ONE clean place.
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Mic,
  Camera,
  Edit3,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Upload,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { api, apiService } from '../services/api';
import { geminiService } from '../services/geminiService';
import { Wallet, Category, TransactionType } from '../types';
import { formatVND, parseVNDInput } from '../lib/formatters';

interface QuickRecordWidgetProps {
  wallets: Wallet[];
  categories: Category[];
  onSuccess: () => void;
  onOpenOcrFull?: () => void;
  onOpenNlpFull?: () => void;
}

type RecordTab = 'nlp' | 'ocr' | 'manual';

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
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);

  // OCR State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);

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
    try {
      const selectedWallet = wallets.find((w) => w.id === manualWalletId) || wallets[0];
      const selectedCategory = categories.find((c) => c.id === manualCatId) || categories[0];

      const validManualDate = manualDate ? new Date(manualDate) : new Date();
      const safeManualDate = isNaN(validManualDate.getTime()) ? new Date() : validManualDate;
      const transactionDate = safeManualDate.toISOString().slice(0, 19);

      await api.transactions.create({
        walletId: selectedWallet.id,
        walletName: selectedWallet.name,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        categoryIcon: selectedCategory.icon || 'Tag',
        amount: parsedAmt,
        type: manualType,
        note: manualNote || (manualType === 'EXPENSE' ? 'Chi tiêu' : 'Thu nhập'),
        date: transactionDate,
        transactionDate,
      });

      setManualAmount('');
      setManualNote('');
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setIsManualSubmitting(false);
    }
  };

  // OCR Image select
  const handleImageFile = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleOcrProcess = async () => {
    if (!selectedFile) return;
    setIsOcrLoading(true);
    try {
      const res = await geminiService.scanReceipt(selectedFile);
      if (res) {
        const defaultWallet = wallets[0];
        const defaultCat = categories[0];
        const transactionDate = new Date().toISOString().slice(0, 19);

        await api.transactions.create({
          walletId: defaultWallet?.id || '',
          walletName: defaultWallet?.name,
          categoryId: defaultCat?.id,
          categoryName: 'Ăn uống',
          categoryIcon: 'Utensils',
          amount: res.totalAmount || 0,
          type: 'EXPENSE',
          note: `Quét hóa đơn ${res.merchantName || ''}`,
          date: transactionDate,
          transactionDate,
        });
        setSelectedFile(null);
        setPreviewUrl(null);
        onSuccess();
      }
    } catch (err) {
      if (onOpenOcrFull) onOpenOcrFull();
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
            <div className="p-2.5 bg-[#7D8F69]/10 text-[#7D8F69] rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {nlpSuccessMsg}
            </div>
          )}
        </form>
      )}

      {/* TAB 2: OCR RECEIPT SCAN */}
      {activeTab === 'ocr' && (
        <div className="space-y-3">
          {!previewUrl ? (
            <label className="border-2 border-dashed border-[#EAE7DC] hover:border-[#7D8F69] bg-[#F9F8F3] rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center">
              <Upload className="w-6 h-6 text-[#7D8F69] mb-1" />
              <span className="text-xs font-bold text-[#2D2926]">Tải lên hoặc chụp ảnh hóa đơn</span>
              <span className="text-[10px] text-[#8C857D]">Hỗ trợ JPG, PNG, WEBP</span>
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
            <div className="flex items-center gap-4 bg-[#F9F8F3] p-3 rounded-2xl border border-[#EAE7DC]">
              <img src={previewUrl} alt="Receipt preview" className="w-16 h-16 object-cover rounded-xl" />
              <div className="flex-1">
                <p className="text-xs font-bold text-[#2D2926]">{selectedFile?.name || 'Đã chọn ảnh'}</p>
                <p className="text-[10px] text-[#8C857D]">Sẵn sàng quét dữ liệu bằng Gemini Vision</p>
              </div>
              <button
                type="button"
                onClick={handleOcrProcess}
                disabled={isOcrLoading}
                className="px-4 py-2 bg-[#7D8F69] text-white rounded-xl text-xs font-bold hover:bg-[#687856] transition"
              >
                {isOcrLoading ? 'Đang bóc tách...' : 'Phân Tích'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MANUAL FORM */}
      {activeTab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="flex bg-[#F9F8F3] p-1 rounded-xl border border-[#EAE7DC]">
              <button
                type="button"
                onClick={() => setManualType('EXPENSE')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  manualType === 'EXPENSE' ? 'bg-[#D98B72] text-white' : 'text-[#8C857D]'
                }`}
              >
                Chi
              </button>
              <button
                type="button"
                onClick={() => setManualType('INCOME')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  manualType === 'INCOME' ? 'bg-[#7D8F69] text-white' : 'text-[#8C857D]'
                }`}
              >
                Thu
              </button>
            </div>

            <input
              type="text"
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              placeholder="Số tiền (45k, 1.5tr)"
              className="p-2 text-xs font-bold rounded-xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] focus:outline-none focus:ring-1 focus:ring-[#7D8F69]"
            />

            <select
              value={manualWalletId}
              onChange={(e) => setManualWalletId(e.target.value)}
              className="p-2 text-xs font-semibold rounded-xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926]"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              placeholder="Ghi chú (Cơm trưa...)"
              className="p-2 text-xs font-medium rounded-xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926]"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isManualSubmitting || !manualAmount}
              className="px-5 py-2 bg-[#7D8F69] hover:bg-[#687856] text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              {isManualSubmitting ? 'Lưu...' : 'Lưu Giao Dịch'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
