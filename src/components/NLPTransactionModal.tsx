/**
 * SIVI WALLET - Natural Language / Voice Logger Modal (Gemini NLP)
 */

import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Sparkles, Send, Check, X, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api';
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
  const [error, setError] = useState<string | null>(null);
  const [parsedTx, setParsedTx] = useState<NLPParsedTransaction | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');

  useEffect(() => {
    if (wallets.length > 0) {
      setSelectedWalletId(wallets[0].id);
    }
  }, [wallets]);

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
      const result = await apiService.parseNaturalLanguageTransaction(inputText);
      setParsedTx(result);

      // Try matching wallet
      if (result.walletName) {
        const matchedWallet = wallets.find((w) =>
          w.name.toLowerCase().includes(result.walletName.toLowerCase())
        );
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

    try {
      const wallet = wallets.find((w) => w.id === selectedWalletId);
      const cat = categories.find((c) => c.name.toLowerCase().includes(parsedTx.category.toLowerCase())) || categories[0];

      await apiService.addTransaction({
        walletId: selectedWalletId,
        walletName: wallet?.name,
        categoryId: cat.id,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        amount: parsedTx.amount,
        type: parsedTx.type || 'EXPENSE',
        note: parsedTx.note,
        date: parsedTx.date || new Date().toISOString(),
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError('Không thể lưu giao dịch. Vui lòng thử lại.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Nhập Liệu Tiếng Việt / Giọng Nói</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tự động phân tích số tiền, ví & danh mục bằng AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Input box + Voice button */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Nói hoặc gõ câu chi tiêu bất kỳ:
            </label>
            <div className="relative flex items-center">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='Ví dụ: "Sáng nay ăn bún bò 45k bằng MoMo với Nam"...'
                className="w-full p-3.5 pr-12 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[90px] resize-none"
              />
              <button
                type="button"
                onClick={toggleVoiceRecording}
                className={`absolute right-3 top-3 p-2.5 rounded-xl transition-all shadow-md ${
                  isRecording
                    ? 'bg-rose-500 text-white animate-bounce ring-4 ring-rose-200 dark:ring-rose-900'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
                title={isRecording ? 'Đang lắng nghe tiếng Việt...' : 'Nói trực tiếp bằng giọng nói'}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
            {isRecording && (
              <p className="text-xs font-bold text-rose-500 animate-pulse flex items-center gap-1.5 pt-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                Đang lắng nghe giọng nói tiếng Việt... Hãy nói câu chi tiêu của bạn
              </p>
            )}
          </div>

          {/* Prompt Examples */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
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
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 text-slate-600 dark:text-slate-300 transition"
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
            className="w-full py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
          >
            {isLoading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                Gemini AI đang phân tích...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Phân Tích Bằng AI
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Parsed Result Preview */}
          {parsedTx && !isLoading && (
            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 dark:border-emerald-800/50">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Kết quả phân tích Gemini AI:
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                  {parsedTx.type}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Nội dung:</span>
                  <p className="font-bold text-slate-900 dark:text-white">{parsedTx.note}</p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Số tiền:</span>
                  <p className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                    {formatVND(parsedTx.amount)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Danh mục:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{parsedTx.category}</p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Chọn ví ghi nhận:</span>
                  <select
                    value={selectedWalletId}
                    onChange={(e) => setSelectedWalletId(e.target.value)}
                    className="w-full mt-0.5 p-1.5 text-xs font-bold rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({formatVND(w.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Hủy
          </button>
          {parsedTx && (
            <button
              onClick={handleSave}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition"
            >
              <Check className="w-4 h-4" /> Xác Nhận & Lưu
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
