/**
 * SIVI WALLET - Receipt OCR Modal (Gemini Vision)
 */

import React, { useState } from 'react';
import { Camera, Upload, Sparkles, Check, X, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { apiService } from '../services/api';
import { ReceiptOCRResult, Wallet, Category } from '../types';
import { formatVND } from '../lib/formatters';

interface ReceiptOCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  categories: Category[];
  onSuccess: () => void;
}

// Sample dummy receipts for quick testing without uploading
const SAMPLE_RECEIPTS = [
  {
    name: 'Phở Hòa Pasteur (65.000 đ)',
    url: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop&q=80',
    data: {
      merchantName: 'Phở Hòa Pasteur',
      totalAmount: 65000,
      transactionDate: new Date().toISOString().split('T')[0],
      category: 'Ăn uống',
      paymentMethod: 'Ví MoMo',
      items: [
        { name: 'Phở tái nạm gầu', price: 60000, quantity: 1 },
        { name: 'Trà đá', price: 5000, quantity: 1 },
      ],
    },
  },
  {
    name: 'Siêu thị WinMart+ (185.000 đ)',
    url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80',
    data: {
      merchantName: 'Siêu thị WinMart+',
      totalAmount: 185000,
      transactionDate: new Date().toISOString().split('T')[0],
      category: 'Mua sắm',
      paymentMethod: 'Tiền mặt',
      items: [
        { name: 'Sữa tươi TH True Milk 1L', price: 38000, quantity: 2 },
        { name: 'Bánh mì gối Sandwich', price: 25000, quantity: 1 },
        { name: 'Táo Red Delicious 1kg', price: 84000, quantity: 1 },
      ],
    },
  },
];

export const ReceiptOCRModal: React.FC<ReceiptOCRModalProps> = ({
  isOpen,
  onClose,
  wallets,
  categories,
  onSuccess,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<ReceiptOCRResult | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string>(wallets[0]?.id || '');

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      processOCR(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = (sample: typeof SAMPLE_RECEIPTS[0]) => {
    setImagePreview(sample.url);
    setIsLoading(true);
    setError(null);
    setTimeout(() => {
      setOcrResult(sample.data as ReceiptOCRResult);
      setIsLoading(false);
    }, 1200);
  };

  const processOCR = async (base64Img: string) => {
    setIsLoading(true);
    setError(null);
    setOcrResult(null);

    try {
      const res = await apiService.scanReceiptOCR(base64Img);
      setOcrResult(res);
    } catch (err: any) {
      console.error(err);
      setError('Không thể phân tích hóa đơn bằng Gemini AI. Vui lòng thử lại hoặc dùng ảnh mẫu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTransaction = async () => {
    if (!ocrResult || !selectedWalletId) return;

    try {
      const wallet = wallets.find((w) => w.id === selectedWalletId);
      const cat = categories.find((c) => c.name.toLowerCase().includes(ocrResult.category.toLowerCase())) || categories[0];

      await apiService.addTransaction({
        walletId: selectedWalletId,
        walletName: wallet?.name,
        categoryId: cat.id,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        amount: ocrResult.totalAmount,
        type: 'EXPENSE',
        note: `[Quét Hóa Đơn] ${ocrResult.merchantName} (${ocrResult.items.map((i) => i.name).join(', ')})`,
        date: ocrResult.transactionDate || new Date().toISOString(),
        receiptImageUrl: imagePreview || undefined,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError('Lỗi khi lưu giao dịch. Vui lòng thử lại.');
    }
  };

  const updateItem = (index: number, field: string, val: any) => {
    if (!ocrResult) return;
    const updatedItems = [...ocrResult.items];
    updatedItems[index] = { ...updatedItems[index], [field]: val };
    const newTotal = updatedItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
    setOcrResult({ ...ocrResult, items: updatedItems, totalAmount: newTotal });
  };

  const addItem = () => {
    if (!ocrResult) return;
    setOcrResult({
      ...ocrResult,
      items: [...ocrResult.items, { name: 'Món mới', price: 20000, quantity: 1 }],
      totalAmount: ocrResult.totalAmount + 20000,
    });
  };

  const removeItem = (index: number) => {
    if (!ocrResult) return;
    const item = ocrResult.items[index];
    const updatedItems = ocrResult.items.filter((_, i) => i !== index);
    const newTotal = Math.max(0, ocrResult.totalAmount - (item.price || 0) * (item.quantity || 1));
    setOcrResult({ ...ocrResult, items: updatedItems, totalAmount: newTotal });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quét Hóa Đơn bằng Gemini AI (OCR)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Trích xuất tự động món ăn, tổng tiền & thông tin cửa hàng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Upload Area / Sample selector */}
          {!imagePreview ? (
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                  <div className="p-3 mb-3 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <Camera className="w-8 h-8" />
                  </div>
                  <p className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Nhấp để tải lên hoặc kéo thả ảnh hóa đơn
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Hỗ trợ JPG, PNG, WEBP (chụp hóa đơn nhà hàng, siêu thị, phiếu thu...)
                  </p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>

              {/* Sample receipts quick test */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Hoặc chọn hóa đơn mẫu trải nghiệm nhanh:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SAMPLE_RECEIPTS.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectSample(s)}
                      className="flex items-center gap-3 p-3 text-left rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition group"
                    >
                      <img src={s.url} alt={s.name} className="w-12 h-12 object-cover rounded-lg shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-600">
                          {s.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Bấm để tự động trích xuất</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Image & OCR Result Split View */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Image Preview Box */}
              <div className="md:col-span-4 flex flex-col items-center">
                <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                  <img src={imagePreview} alt="Receipt" className="w-full h-full object-contain" />
                </div>
                <button
                  onClick={() => {
                    setImagePreview(null);
                    setOcrResult(null);
                  }}
                  className="mt-3 text-xs font-semibold text-rose-500 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Chọn ảnh khác
                </button>
              </div>

              {/* Result Details */}
              <div className="md:col-span-8 space-y-4">
                {isLoading && (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center space-y-3">
                    <Sparkles className="w-8 h-8 text-amber-500 animate-spin" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Gemini Vision AI đang đọc & bóc tách hóa đơn...
                    </p>
                  </div>
                )}

                {error && (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {ocrResult && !isLoading && (
                  <div className="space-y-4">
                    {/* Merchant & Total */}
                    <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Cửa hàng / Địa điểm
                          </label>
                          <input
                            type="text"
                            value={ocrResult.merchantName}
                            onChange={(e) => setOcrResult({ ...ocrResult, merchantName: e.target.value })}
                            className="w-full text-base font-bold text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="text-right">
                          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Tổng cộng
                          </label>
                          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                            {formatVND(ocrResult.totalAmount)}
                          </p>
                        </div>
                      </div>

                      {/* Wallet picker */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                            Chọn ví thanh toán:
                          </label>
                          <select
                            value={selectedWalletId}
                            onChange={(e) => setSelectedWalletId(e.target.value)}
                            className="w-full p-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                          >
                            {wallets.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.name} ({formatVND(w.balance)})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                            Danh mục:
                          </label>
                          <input
                            type="text"
                            value={ocrResult.category}
                            onChange={(e) => setOcrResult({ ...ocrResult, category: e.target.value })}
                            className="w-full p-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Items table */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Chi tiết các món ({ocrResult.items.length})
                        </span>
                        <button
                          onClick={addItem}
                          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm món
                        </button>
                      </div>

                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                        {ocrResult.items.map((item, idx) => (
                          <div key={idx} className="p-2.5 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/30">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateItem(idx, 'name', e.target.value)}
                              className="flex-1 text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
                            />
                            <div className="flex items-center gap-2 shrink-0">
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) => updateItem(idx, 'price', Number(e.target.value))}
                                className="w-20 text-xs text-right font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 text-slate-900 dark:text-white"
                              />
                              <span className="text-[11px] text-slate-400">đ</span>
                              <button
                                onClick={() => removeItem(idx)}
                                className="text-slate-400 hover:text-rose-500 p-1"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Hủy
          </button>
          {ocrResult && (
            <button
              onClick={handleSaveTransaction}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition"
            >
              <Check className="w-4 h-4" /> Lưu Giao Dịch
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
