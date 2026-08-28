/**
 * SIVI WALLET - Receipt OCR Modal (Gemini Vision)
 * Allows direct camera capture on mobile or uploading image from gallery/device.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Sparkles, Check, X, AlertCircle, Plus, Trash2, MessageSquare, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { api } from '../services/api';
import { geminiService } from '../services/geminiService';
import { ReceiptOCRResult, Wallet, Category, TransactionType } from '../types';
import { formatVND, formatLocalISO, toDateTimeLocalString } from '../lib/formatters';

interface ReceiptOCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  categories: Category[];
  onSuccess: () => void;
  onSave?: (transactionData: any) => Promise<void> | void;
}

export const ReceiptOCRModal: React.FC<ReceiptOCRModalProps> = ({
  isOpen,
  onClose,
  wallets,
  categories,
  onSuccess,
  onSave,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<ReceiptOCRResult | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string>(wallets[0]?.id || '');
  const [userNote, setUserNote] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize and initialize selectedWalletId whenever wallets or modal open state change
  useEffect(() => {
    if (wallets.length > 0) {
      if (!selectedWalletId || !wallets.some((w) => w.id === selectedWalletId)) {
        setSelectedWalletId(wallets[0].id);
      }
    }
  }, [wallets, isOpen]);

  if (!isOpen) return null;

  const handleImageFileSelect = (file: File) => {
    setSelectedFile(file);
    setOcrResult(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleImageFileSelect(file);
    }
  };

  const resetAll = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setOcrResult(null);
    setIsLoading(false);
    setError(null);
    setUserNote('');
  };

  // Step 1 -> Step 2 -> Step 3 Trigger
  const handleAnalyzeReceipt = async () => {
    if (!imagePreview || !selectedFile) return;

    setIsLoading(true);
    setError(null);
    setOcrResult(null);

    try {
      // Real Gemini AI multimodal OCR scan
      const result = await geminiService.scanReceipt(selectedFile, userNote || undefined);
      const nowLocal = toDateTimeLocalString(new Date());
      const mappedResult: ReceiptOCRResult = {
        merchantName: result.merchantName || 'Cửa hàng không rõ',
        totalAmount: result.totalAmount || 0,
        transactionDate: result.transactionDate || nowLocal,
        category: result.category || 'Khác',
        paymentMethod: result.paymentMethod || 'Tiền mặt',
        items: (result.items || []).map((item: any) => ({
          name: item.name || item.itemName || 'Món ăn/Hàng hóa',
          price: item.price || item.totalPrice || 0,
          quantity: item.quantity || 1,
        })),
        rawNotes: result.note || undefined,
      };
      setOcrResult(mappedResult);
      if (!userNote && result.note) {
        setUserNote(result.note);
      }

      // Auto-match wallet from Gemini extracted info, paymentMethod, or note
      const textToCheck = `${result.paymentMethod || ''} ${result.note || ''} ${userNote || ''}`.toLowerCase();
      const matchedWallet = wallets.find((w) => {
        const wName = w.name.toLowerCase();
        const bName = (w.bankName || '').toLowerCase();
        return (
          textToCheck.includes(wName) ||
          (bName && textToCheck.includes(bName)) ||
          (w.type === 'E_WALLET' && (textToCheck.includes('momo') || textToCheck.includes('ví') || textToCheck.includes('zalopay'))) ||
          (w.type === 'CASH' && (textToCheck.includes('tiền mặt') || textToCheck.includes('cash'))) ||
          (w.type === 'BANK' && (textToCheck.includes('vcb') || textToCheck.includes('vietcombank') || textToCheck.includes('ngân hàng') || textToCheck.includes('chuyển khoản') || textToCheck.includes('bank') || textToCheck.includes('techcombank') || textToCheck.includes('mbbank') || textToCheck.includes('acb') || textToCheck.includes('bidv')))
        );
      });
      if (matchedWallet) {
        setSelectedWalletId(matchedWallet.id);
      }
    } catch (err: any) {
      console.error(err);
      setError('Không thể phân tích hóa đơn bằng Gemini AI. Vui lòng thử lại hoặc chọn ảnh khác.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTransaction = async () => {
    if (!ocrResult) return;

    const finalWalletId = selectedWalletId || wallets[0]?.id;
    if (!finalWalletId) {
      setError('Vui lòng tạo ít nhất một ví để lưu giao dịch.');
      return;
    }

    try {
      const wallet = wallets.find((w) => w.id === finalWalletId) || wallets[0];
      const cat = categories.find((c) => c.name.toLowerCase().includes(ocrResult.category.toLowerCase())) || categories[0];

      const noteItems = ocrResult.items.map((i) => i.name).join(', ');
      const baseNote = `[Quét Hóa Đơn] ${ocrResult.merchantName} (${noteItems})`;
      const combinedNote = userNote
        ? `${baseNote} — ${userNote}${ocrResult.rawNotes ? ' | ' + ocrResult.rawNotes : ''}`
        : `${baseNote}${ocrResult.rawNotes ? ' — ' + ocrResult.rawNotes : ''}`;

      const parsedDate = ocrResult.transactionDate ? new Date(ocrResult.transactionDate) : new Date();
      const safeDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
      const transactionDate = formatLocalISO(safeDate);

      const newTransaction = {
        walletId: finalWalletId,
        walletName: wallet?.name,
        categoryId: cat?.id,
        categoryName: cat?.name || 'Chi tiêu',
        categoryIcon: cat?.icon || 'Tag',
        amount: ocrResult.totalAmount,
        type: 'EXPENSE' as TransactionType,
        note: combinedNote,
        date: transactionDate,
        transactionDate,
        receiptImageUrl: imagePreview || undefined,
        items: ocrResult.items,
        merchantName: ocrResult.merchantName,
        userNote: userNote,
      };

      if (onSave) {
        await onSave(newTransaction);
      } else {
        await api.transactions.create(newTransaction);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      // Keep modal open on error – show API error message
      const apiMsg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu giao dịch';
      setError(apiMsg);
    }
  };

  const updateItem = (index: number, field: string, val: any) => {
    if (!ocrResult) return;
    const updatedItems = [...ocrResult.items];
    updatedItems[index] = { ...updatedItems[index], [field]: val };
    setOcrResult({ ...ocrResult, items: updatedItems });
  };

  const addItem = () => {
    if (!ocrResult) return;
    setOcrResult({
      ...ocrResult,
      items: [...ocrResult.items, { name: 'Món mới', price: 0, quantity: 1 }],
    });
  };

  const removeItem = (index: number) => {
    if (!ocrResult) return;
    const updatedItems = ocrResult.items.filter((_, i) => i !== index);
    setOcrResult({ ...ocrResult, items: updatedItems });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#2D2926]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden border border-[#EAE7DC] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAE7DC] bg-[#F9F8F3] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[#7D8F69]/15 text-[#7D8F69]">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#2D2926]">Quét Hóa Đơn AI</h2>
              <p className="text-xs text-[#8C857D]">Tự động đọc hóa đơn & áp dụng lời dặn tùy chỉnh</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8C857D] hover:text-[#2D2926] hover:bg-[#EAE7DC] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Hidden inputs for Camera Capture & File Upload */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileInputChange}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* STEP 1A: Camera Capture & File Upload Selector (When no image is loaded yet) */}
          {!imagePreview && (
            <div className="space-y-4">
              <p className="text-xs font-extrabold text-[#4A443F] uppercase tracking-wider">
                Chọn phương thức tải hóa đơn:
              </p>

              {/* Mobile / Primary Dual Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Direct Camera Capture Button */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-5 rounded-2xl bg-[#7D8F69] hover:bg-[#687856] text-white flex flex-col items-center justify-center gap-3 transition active:scale-[0.98] shadow-sm text-center group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-extrabold block">Chụp Từ Camera</span>
                    <span className="text-[11px] text-white/80 mt-0.5 block">Mở máy ảnh điện thoại chụp hóa đơn</span>
                  </div>
                </button>

                {/* Upload Image from Gallery Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 rounded-2xl bg-[#F9F8F3] hover:bg-[#F1EFE7] text-[#2D2926] border border-[#EAE7DC] hover:border-[#7D8F69] flex flex-col items-center justify-center gap-3 transition active:scale-[0.98] text-center group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#7D8F69]/10 text-[#7D8F69] flex items-center justify-center group-hover:scale-110 transition">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-extrabold block">Chọn Từ Thư Viện</span>
                    <span className="text-[11px] text-[#8C857D] mt-0.5 block">Tải ảnh hóa đơn có sẵn từ thiết bị</span>
                  </div>
                </button>
              </div>

              {/* Drag and Drop Zone - Hidden on mobile, visible on Desktop/Tablets (md:) */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`hidden md:flex p-5 border-2 border-dashed rounded-2xl cursor-pointer text-center transition flex-col items-center justify-center ${
                  isDragOver
                    ? 'border-[#7D8F69] bg-[#7D8F69]/10 scale-[1.01]'
                    : 'border-[#EAE7DC] hover:border-[#7D8F69] bg-[#F9F8F3]'
                }`}
              >
                <Upload className="w-6 h-6 text-[#8C857D] mb-1.5" />
                <p className="text-xs font-bold text-[#2D2926]">
                  Hoặc kéo thả ảnh hóa đơn vào khung này
                </p>
                <p className="text-[10px] text-[#8C857D] mt-0.5">
                  Hỗ trợ định dạng JPG, PNG, WEBP
                </p>
              </div>
            </div>
          )}

          {/* STEP 1B, STEP 2, & STEP 3: Split View when Image is Present */}
          {imagePreview && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Image Preview Box */}
              <div className="md:col-span-4 flex flex-col items-center">
                <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-[#EAE7DC] bg-[#F9F8F3]">
                  <img src={imagePreview} alt="Receipt Preview" className="w-full h-full object-contain" />
                </div>
                <button
                  onClick={resetAll}
                  className="mt-3 text-xs font-bold text-[#D98B72] hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Chọn ảnh khác
                </button>
              </div>

              {/* Right Column: Dynamic Steps (Prompting -> Loading -> Review) */}
              <div className="md:col-span-8 space-y-4">
                {/* STEP 1B: Image Ready + Prompting Input + Phân Tích Button */}
                {!ocrResult && !isLoading && (
                  <div className="space-y-4 bg-[#F9F8F3] p-4 rounded-2xl border border-[#EAE7DC]">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#2D2926] flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-[#7D8F69]" /> Lời dặn cho AI (Tùy chọn)
                      </label>
                      <textarea
                        value={userNote}
                        onChange={(e) => setUserNote(e.target.value)}
                        placeholder="VD: Món xúc xích là của bạn tôi nên trừ ra; Chia đôi bill này với Nam..."
                        rows={3}
                        className="w-full p-3 text-xs font-medium rounded-2xl bg-white border border-[#EAE7DC] text-[#2D2926] placeholder:text-[#8C857D] focus:outline-none focus:ring-2 focus:ring-[#7D8F69] transition resize-none"
                      />
                      <p className="text-[11px] text-[#8C857D]">
                        Nhập yêu cầu đặc biệt (loại trừ món, tính riêng, chia tiền...) để AI tự động áp dụng.
                      </p>
                    </div>

                    {error && (
                      <div className="p-3 rounded-xl bg-[#D98B72]/10 border border-[#D98B72]/30 text-[#D98B72] text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    )}

                    <button
                      onClick={handleAnalyzeReceipt}
                      className="w-full py-3 px-4 text-xs font-bold text-white bg-[#7D8F69] hover:bg-[#687856] rounded-2xl shadow-sm flex items-center justify-center gap-2 transition"
                    >
                      <Sparkles className="w-4 h-4" /> Phân Tích Bằng AI
                    </button>
                  </div>
                )}

                {/* STEP 2: Loading State */}
                {isLoading && (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-center space-y-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-4 border-[#7D8F69]/20 border-t-[#7D8F69] animate-spin" />
                      <Sparkles className="w-6 h-6 text-[#7D8F69] absolute inset-0 m-auto animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#2D2926]">
                        AI đang đọc hóa đơn và áp dụng lời dặn...
                      </p>
                      <p className="text-xs text-[#8C857D] mt-1">
                        Bóc tách món ăn, tính toán lại tổng tiền & ghi chú...
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP 3: Review & Confirm Form */}
                {ocrResult && !isLoading && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    {error && (
                      <div className="p-3 rounded-xl bg-[#D98B72]/10 border border-[#D98B72]/30 text-[#D98B72] text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Merchant & Total */}
                    <div className="p-4 rounded-2xl bg-[#F9F8F3] border border-[#EAE7DC] space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-[11px] font-bold text-[#8C857D] uppercase tracking-wider">
                            Cửa hàng / Địa điểm
                          </label>
                          <input
                            type="text"
                            value={ocrResult.merchantName}
                            onChange={(e) => setOcrResult({ ...ocrResult, merchantName: e.target.value })}
                            className="w-full text-base font-bold text-[#2D2926] bg-transparent border-b border-dashed border-[#EAE7DC] focus:outline-none focus:border-[#7D8F69]"
                          />
                        </div>
                        <div className="text-right">
                          <label className="text-[11px] font-bold text-[#8C857D] uppercase tracking-wider block">
                            Tổng cộng
                          </label>
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              value={ocrResult.totalAmount === 0 ? '' : ocrResult.totalAmount}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                setOcrResult({ ...ocrResult, totalAmount: val });
                              }}
                              placeholder="0"
                              className="w-36 text-right text-base font-black text-[#D98B72] bg-transparent border-b border-dashed border-[#EAE7DC] focus:outline-none focus:border-[#7D8F69]"
                            />
                            <span className="text-xs font-bold text-[#D98B72]">đ</span>
                          </div>
                        </div>
                      </div>

                      {/* Wallet, Category, Date-Time picker */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div>
                          <label className="text-xs font-bold text-[#4A443F] block mb-1">
                            Ví thanh toán:
                          </label>
                          <select
                            value={selectedWalletId}
                            onChange={(e) => setSelectedWalletId(e.target.value)}
                            className="w-full p-2 text-xs font-bold rounded-xl bg-white border border-[#EAE7DC] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
                          >
                            {wallets.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.name} ({formatVND(w.balance)})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-[#4A443F] block mb-1">
                            Danh mục:
                          </label>
                          <input
                            type="text"
                            value={ocrResult.category}
                            onChange={(e) => setOcrResult({ ...ocrResult, category: e.target.value })}
                            className="w-full p-2 text-xs font-bold rounded-xl bg-white border border-[#EAE7DC] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-[#4A443F] block mb-1">
                            Ngày & giờ giao dịch:
                          </label>
                          <input
                            type="datetime-local"
                            value={ocrResult.transactionDate ? ocrResult.transactionDate.substring(0, 16) : ''}
                            onChange={(e) => setOcrResult({ ...ocrResult, transactionDate: e.target.value })}
                            className="w-full p-2 text-xs font-bold rounded-xl bg-white border border-[#EAE7DC] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Items table */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#4A443F] uppercase tracking-wider">
                          Chi tiết các món ({ocrResult.items.length})
                        </span>
                        <button
                          onClick={addItem}
                          className="text-xs font-bold text-[#7D8F69] hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm món
                        </button>
                      </div>

                      <div className="border border-[#EAE7DC] rounded-2xl overflow-hidden divide-y divide-[#EAE7DC] max-h-44 overflow-y-auto custom-scrollbar">
                        {ocrResult.items.map((item, idx) => (
                          <div key={idx} className="p-2.5 flex items-center gap-2 bg-[#F9F8F3]">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateItem(idx, 'name', e.target.value)}
                              className="flex-1 text-xs font-semibold bg-transparent text-[#2D2926] focus:outline-none"
                            />
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-[#8C857D]">SL:</span>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                                className="w-12 text-xs text-center font-bold bg-white border border-[#EAE7DC] rounded-lg px-1 py-1 text-[#2D2926] focus:outline-none focus:ring-1 focus:ring-[#7D8F69]"
                              />
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) => updateItem(idx, 'price', Number(e.target.value))}
                                className="w-20 text-xs text-right font-bold bg-white border border-[#EAE7DC] rounded-lg px-1.5 py-1 text-[#2D2926] focus:outline-none focus:ring-1 focus:ring-[#7D8F69]"
                              />
                              <span className="text-[11px] text-[#8C857D]">đ</span>
                              <button
                                onClick={() => removeItem(idx)}
                                className="text-[#8C857D] hover:text-[#D98B72] p-1"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Editable Note / Split info */}
                    <div className="p-3.5 rounded-2xl bg-[#F9F8F3] border border-[#EAE7DC]">
                      <label className="text-[11px] font-bold text-[#4A443F] uppercase tracking-wider flex items-center gap-1 mb-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-[#7D8F69]" /> Ghi chú / Chia tiền
                      </label>
                      <textarea
                        value={userNote}
                        onChange={(e) => setUserNote(e.target.value)}
                        placeholder="VD: Chia đôi với Nam, Tiền ăn lẩu..."
                        rows={2}
                        className="w-full p-2.5 text-xs font-medium rounded-xl bg-white border border-[#EAE7DC] text-[#2D2926] placeholder:text-[#8C857D] focus:outline-none focus:ring-2 focus:ring-[#7D8F69] transition resize-none"
                      />
                      {ocrResult.rawNotes && (
                        <p className="mt-1.5 text-[10px] text-[#8C857D] flex items-center gap-1 italic">
                          <Sparkles className="w-3 h-3 text-[#7D8F69] shrink-0" /> Ghi chú từ AI: {ocrResult.rawNotes}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[#EAE7DC] bg-[#F9F8F3] shrink-0">
          <div>
            {imagePreview && (
              <button
                onClick={resetAll}
                className="px-3 py-1.5 text-xs font-bold text-[#8C857D] hover:text-[#2D2926] flex items-center gap-1.5 hover:bg-[#EAE7DC] rounded-xl transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Chọn ảnh khác
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#8C857D] hover:bg-[#EAE7DC] rounded-xl transition"
            >
              Hủy
            </button>
            {ocrResult && !isLoading && (
              <button
                onClick={handleSaveTransaction}
                className="px-5 py-2.5 text-xs font-extrabold text-white bg-[#7D8F69] hover:bg-[#687856] rounded-xl shadow-xs flex items-center gap-2 transition"
              >
                <Check className="w-4 h-4" /> Lưu Giao Dịch
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
