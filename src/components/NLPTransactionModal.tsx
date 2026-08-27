/**
 * SIVI WALLET - Natural Language / Voice Logger Modal (Gemini NLP)
 * Features: Category Grid selector, Wallet auto-matching, transactionDate normalization
 */

import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  Send,
  Check,
  X,
  AlertCircle,
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Receipt,
  HeartPulse,
  Wallet as WalletIcon,
  TrendingUp,
  Tag,
} from 'lucide-react';
import { api } from '../services/api';
import { geminiService } from '../services/geminiService';
import { NLPParsedTransaction, Wallet, Category } from '../types';
import { formatVND } from '../lib/formatters';

interface NLPTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  categories: Category[];
  onSuccess: () => void;
}

const EXAMPLES = [
  'Sáng nay ăn bún bò 45k trả bằng Ví MoMo',
  'Mới chuyển khoản VCB trả tiền điện 450k',
  'Nhận lương 25 triệu vào Vietcombank',
  'Mua áo Uniqlo 450k bằng Tiền mặt',
];

/** Map icon name or category name to a Lucide icon component */
const getCategoryIcon = (iconName?: string, name?: string) => {
  const n = (name || '').toLowerCase();
  if (iconName === 'UtensilsCrossed' || iconName === 'Utensils' || n.includes('ăn') || n.includes('uống'))
    return UtensilsCrossed;
  if (iconName === 'Car' || n.includes('đi lại') || n.includes('xe')) return Car;
  if (iconName === 'ShoppingBag' || n.includes('mua sắm') || n.includes('chợ')) return ShoppingBag;
  if (iconName === 'Receipt' || n.includes('hóa đơn') || n.includes('điện')) return Receipt;
  if (iconName === 'Sparkles' || n.includes('giải trí') || n.includes('phim')) return Sparkles;
  if (iconName === 'HeartPulse' || n.includes('sức khỏe') || n.includes('thuốc')) return HeartPulse;
  if (iconName === 'Wallet' || n.includes('lương') || n.includes('thu nhập')) return WalletIcon;
  if (iconName === 'TrendingUp' || n.includes('thưởng') || n.includes('lãi')) return TrendingUp;
  return Tag;
};

/** Fuzzy match a string against category names */
const findMatchingCategory = (text: string, categories: Category[]): Category | undefined => {
  const lower = (text || '').toLowerCase().trim();
  if (!lower) return undefined;
  // Exact match
  const exact = categories.find((c) => c.name.toLowerCase() === lower);
  if (exact) return exact;
  // Partial includes
  const partial = categories.find(
    (c) => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase())
  );
  return partial;
};

/** Fuzzy match a string against wallet names */
const findMatchingWallet = (text: string, wallets: Wallet[]): Wallet | undefined => {
  const lower = (text || '').toLowerCase().trim();
  if (!lower) return undefined;
  const exact = wallets.find((w) => w.name.toLowerCase() === lower);
  if (exact) return exact;
  const partial = wallets.find(
    (w) =>
      w.name.toLowerCase().includes(lower) ||
      lower.includes(w.name.toLowerCase())
  );
  return partial;
};

export const NLPTransactionModal: React.FC<NLPTransactionModalProps> = ({
  isOpen,
  onClose,
  wallets,
  categories,
  onSuccess,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedTx, setParsedTx] = useState<NLPParsedTransaction | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const safeWallets = Array.isArray(wallets) ? wallets : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  useEffect(() => {
    if (safeWallets.length > 0 && !selectedWalletId) {
      setSelectedWalletId(safeWallets[0].id);
    }
  }, [wallets]);

  useEffect(() => {
    if (safeCategories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(safeCategories[0].id);
    }
  }, [categories]);

  const updateParsedTx = (field: keyof NLPParsedTransaction, value: any) => {
    if (!parsedTx) return;
    setParsedTx({ ...parsedTx, [field]: value });
  };

  if (!isOpen) return null;

  // Web Speech API Voice Recognition
  const toggleVoiceRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Trình duyệt của bạn chưa hỗ trợ thu âm trực tiếp Web Speech API. Vui lòng gõ chữ bên dưới.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setPrompt(transcript);
      setIsRecording(false);
      processNLP(transcript);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const processNLP = async (inputText: string) => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError(null);
    setParsedTx(null);

    try {
      const result = await geminiService.parseNaturalLanguage(inputText);
      const mappedResult: NLPParsedTransaction = {
        type: 'EXPENSE',
        amount: result.amount || 0,
        note: result.note || inputText,
        category: result.category || 'Khác',
        walletName: result.wallet || '',
        date: new Date().toISOString().split('T')[0],
        splitWith: result.splitWith || [],
      };
      setParsedTx(mappedResult);

      // Auto-match category from Gemini result
      if (mappedResult.category) {
        const matchedCat = findMatchingCategory(mappedResult.category, safeCategories);
        if (matchedCat) {
          setSelectedCategoryId(matchedCat.id);
        }
      }

      // Auto-match wallet from Gemini result
      if (mappedResult.walletName) {
        const matchedWallet = findMatchingWallet(mappedResult.walletName, safeWallets);
        if (matchedWallet) {
          setSelectedWalletId(matchedWallet.id);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('Lỗi phân tích cú pháp câu nói bằng Gemini AI. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!parsedTx || !selectedWalletId) return;

    setIsSaving(true);
    setError(null);

    try {
      const wallet = safeWallets.find((w) => w.id === selectedWalletId);
      const cat = safeCategories.find((c) => c.id === selectedCategoryId) || safeCategories[0];

      let finalNote = parsedTx.note;
      if (parsedTx.splitWith && parsedTx.splitWith.length > 0) {
        finalNote += ` (Chia với: ${parsedTx.splitWith.join(', ')})`;
      }

      const transactionDate = new Date(parsedTx.date || Date.now()).toISOString().slice(0, 19);

      await api.transactions.create({
        walletId: selectedWalletId,
        walletName: wallet?.name,
        categoryId: cat?.id,
        categoryName: cat?.name || 'Chi tiêu',
        categoryIcon: cat?.icon || 'Tag',
        amount: parsedTx.amount,
        type: parsedTx.type || 'EXPENSE',
        note: finalNote,
        date: transactionDate,
        transactionDate,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      // Keep modal open on error – show API error message
      const apiMsg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu giao dịch';
      setError(apiMsg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#2D2926]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden border border-[#EAE7DC] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAE7DC] bg-[#F9F8F3] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[#7D8F69]/15 text-[#7D8F69]">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#2D2926]">Nhập Bằng Giọng Nói / Câu Tự Nhiên</h2>
              <p className="text-xs text-[#8C857D]">Tự động phân tích số tiền, ví &amp; danh mục</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8C857D] hover:text-[#2D2926] hover:bg-[#EAE7DC] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Input box + Voice button */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#4A443F] uppercase tracking-wider block">
              Nói hoặc gõ câu chi tiêu bất kỳ:
            </label>
            <div className="relative flex items-center">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='Ví dụ: "Sáng nay ăn bún bò 45k bằng MoMo với Nam"...'
                className="w-full p-3.5 pr-12 text-sm font-medium rounded-2xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] placeholder:text-[#8C857D] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none min-h-[90px] resize-none"
              />
              <button
                type="button"
                onClick={toggleVoiceRecording}
                className={`absolute right-3 top-3 p-2.5 rounded-2xl transition-all shadow-xs ${
                  isRecording
                    ? 'bg-[#D98B72] text-white animate-bounce ring-4 ring-[#D98B72]/20'
                    : 'bg-[#7D8F69] hover:bg-[#687856] text-white'
                }`}
                title={isRecording ? 'Đang lắng nghe tiếng Việt...' : 'Nói trực tiếp bằng giọng nói'}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
            {isRecording && (
              <p className="text-xs font-bold text-[#D98B72] animate-pulse flex items-center gap-1.5 pt-1">
                <span className="w-2 h-2 rounded-full bg-[#D98B72] animate-ping"></span>
                Đang lắng nghe giọng nói tiếng Việt... Hãy nói câu chi tiêu của bạn
              </p>
            )}
          </div>

          {/* Prompt Examples */}
          <div>
            <span className="text-[11px] font-bold text-[#8C857D] uppercase tracking-wider block mb-1.5">
              Gợi ý câu mẫu thử ngay:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(ex);
                    processNLP(ex);
                  }}
                  className="px-2.5 py-1 text-xs font-medium rounded-xl bg-[#F9F8F3] border border-[#EAE7DC] hover:bg-[#EAE7DC] text-[#4A443F] transition"
                >
                  "{ex}"
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => processNLP(prompt)}
            disabled={isLoading || !prompt.trim()}
            className="w-full py-2.5 text-xs font-extrabold text-white bg-[#7D8F69] hover:bg-[#687856] disabled:opacity-50 rounded-2xl shadow-xs flex items-center justify-center gap-2 transition"
          >
            {isLoading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-amber-200" />
                AI đang phân tích...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Phân Tích Bằng AI
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-[#D98B72]/10 border border-[#D98B72]/30 text-[#D98B72] text-xs flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Parsed Result Preview */}
          {parsedTx && !isLoading && (
            <div className="p-4 rounded-2xl bg-[#F9F8F3] border border-[#EAE7DC] space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-[#EAE7DC]">
                <span className="text-xs font-extrabold text-[#7D8F69] uppercase tracking-wider">
                  Kết quả phân tích AI:
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-[#8C857D]">Loại:</span>
                  <select
                    value={parsedTx.type}
                    onChange={(e) => updateParsedTx('type', e.target.value)}
                    className="p-1 text-[10px] font-extrabold uppercase rounded-lg bg-white border border-[#EAE7DC] text-[#2D2926] focus:outline-none"
                  >
                    <option value="EXPENSE">Khoản chi</option>
                    <option value="INCOME">Khoản thu</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#8C857D] font-bold block text-[11px]">Nội dung:</span>
                  <input
                    type="text"
                    value={parsedTx.note}
                    onChange={(e) => updateParsedTx('note', e.target.value)}
                    className="w-full mt-0.5 p-2 text-xs font-semibold rounded-xl bg-white border border-[#EAE7DC] text-[#2D2926] focus:outline-none focus:ring-1 focus:ring-[#7D8F69]"
                  />
                </div>
                <div>
                  <span className="text-[#8C857D] font-bold block text-[11px]">Số tiền:</span>
                  <input
                    type="number"
                    value={parsedTx.amount}
                    onChange={(e) => updateParsedTx('amount', Number(e.target.value))}
                    className="w-full mt-0.5 p-2 text-xs font-bold rounded-xl bg-white border border-[#EAE7DC] text-[#D98B72] focus:outline-none focus:ring-1 focus:ring-[#7D8F69]"
                  />
                </div>

                {/* Category Grid Icon Selector */}
                <div className="col-span-2">
                  <span className="text-[#8C857D] font-bold block text-[11px] mb-1.5">Chọn danh mục:</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {safeCategories.map((cat) => {
                      const IconComp = getCategoryIcon(cat.icon, cat.name);
                      const isSelected = selectedCategoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategoryId(cat.id);
                            updateParsedTx('category', cat.name);
                          }}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all text-center ${
                            isSelected
                              ? 'bg-[#7D8F69]/15 border-[#7D8F69] ring-1 ring-[#7D8F69]/40 shadow-sm'
                              : 'bg-white border-[#EAE7DC] hover:bg-[#F9F8F3] hover:border-[#8C857D]/30'
                          }`}
                          title={cat.name}
                        >
                          <IconComp
                            className={`w-4 h-4 ${
                              isSelected ? 'text-[#7D8F69]' : 'text-[#8C857D]'
                            }`}
                          />
                          <span
                            className={`text-[9px] font-bold leading-tight line-clamp-1 ${
                              isSelected ? 'text-[#7D8F69]' : 'text-[#8C857D]'
                            }`}
                          >
                            {cat.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="col-span-2">
                  <span className="text-[#8C857D] font-bold block text-[11px]">Chọn ví ghi nhận:</span>
                  <select
                    value={selectedWalletId}
                    onChange={(e) => setSelectedWalletId(e.target.value)}
                    className="w-full mt-0.5 p-2 text-xs font-bold rounded-xl bg-white border border-[#EAE7DC] text-[#2D2926] focus:outline-none focus:ring-1 focus:ring-[#7D8F69]"
                  >
                    {safeWallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({formatVND(w.balance)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <span className="text-[#8C857D] font-bold block text-[11px]">Chia tiền với (dấu phẩy ngăn cách):</span>
                  <input
                    type="text"
                    value={parsedTx.splitWith ? parsedTx.splitWith.join(', ') : ''}
                    onChange={(e) => updateParsedTx('splitWith', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                    placeholder="Ví dụ: Nam, An"
                    className="w-full mt-0.5 p-2 text-xs font-semibold rounded-xl bg-white border border-[#EAE7DC] text-[#2D2926] focus:outline-none focus:ring-1 focus:ring-[#7D8F69]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#EAE7DC] bg-[#F9F8F3] shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[#8C857D] hover:bg-[#EAE7DC] rounded-xl transition"
          >
            Hủy
          </button>
          {parsedTx && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 text-xs font-extrabold text-white bg-[#7D8F69] hover:bg-[#687856] disabled:opacity-50 rounded-xl shadow-xs flex items-center gap-2 transition"
            >
              {isSaving ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" /> Đang lưu...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Xác Nhận & Lưu
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
