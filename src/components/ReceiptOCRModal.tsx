/**
 * SIVI WALLET - Receipt OCR Modal (Gemini Vision)
 */

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Sparkles, Check, X, AlertCircle, Plus, Trash2, MessageSquare, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { geminiService } from '../services/geminiService';
import { ReceiptOCRResult, Wallet, Category, TransactionType } from '../types';
import { formatVND } from '../lib/formatters';

interface ReceiptOCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  categories: Category[];
  onSuccess: () => void;
  onSave?: (transactionData: any) => Promise<void> | void;
}

// Sample dummy receipts for quick testing without uploading
const SAMPLE_RECEIPTS = [
  {
    name: 'Phở Hòa Pasteur (65.000 đ)',
    url: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop&q=80',
    data: {
      merchantName: 'Phở Hòa Pasteur',
      totalAmount: 65000,
      transactionDate: new Date().toISOString().substring(0, 16),
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
      transactionDate: new Date().toISOString().substring(0, 16),
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
  onSave,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedSample, setSelectedSample] = useState<typeof SAMPLE_RECEIPTS[0] | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<ReceiptOCRResult | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string>(wallets[0]?.id || '');
  const [userNote, setUserNote] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
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
    setSelectedSample(null);
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

  const handleSelectSample = (sample: typeof SAMPLE_RECEIPTS[0]) => {
    setSelectedSample(sample);
    setSelectedFile(null);
    setImagePreview(sample.url);
    setOcrResult(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
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
    setSelectedSample(null);
    setOcrResult(null);
    setIsLoading(false);
    setError(null);
    setUserNote('');
  };

  // Step 1 -> Step 2 -> Step 3 Trigger
  const handleAnalyzeReceipt = async () => {
    if (!imagePreview) return;

    setIsLoading(true);
    setError(null);
    setOcrResult(null);

    try {
      if (selectedFile) {
        // Real Gemini AI multimodal OCR scan
        const result = await geminiService.scanReceipt(selectedFile, userNote || undefined);
        const nowLocal = new Date().toISOString().substring(0, 16);
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
      } else if (selectedSample) {
        // Sample receipt simulation with prompt delay
        await new Promise((res) => setTimeout(res, 1200));
        setOcrResult(selectedSample.data as ReceiptOCRResult);
        if (!userNote) {
          setUserNote('Hóa đơn mẫu - ' + selectedSample.name);
        }

        const sampleText = `${selectedSample.data.paymentMethod || ''} ${selectedSample.name}`.toLowerCase();
        const matchedWallet = wallets.find((w) => {
          const wName = w.name.toLowerCase();
          return (
            sampleText.includes(wName) ||
            (w.type === 'E_WALLET' && sampleText.includes('momo')) ||
            (w.type === 'CASH' && sampleText.includes('tiền mặt'))
          );
        });
        if (matchedWallet) {
          setSelectedWalletId(matchedWallet.id);
        }
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

      const newTransaction = {
        walletId: finalWalletId,
        walletName: wallet?.name,
        categoryId: cat?.id,
        categoryName: cat?.name || 'Chi tiêu',
        categoryIcon: cat?.icon || 'Tag',
        amount: ocrResult.totalAmount,
        type: 'EXPENSE' as TransactionType,
        note: combinedNote,
        date: ocrResult.transactionDate || new Date().toISOString(),
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
    } catch (err) {
      setError('Lỗi khi lưu giao dịch. Vui lòng thử lại.');
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
          {/* STEP 1A: Dropzone & Sample Receipts Selector (If no image is picked yet) */}
          {!imagePreview && (
            <div className="space-y-4">
              <label
                className={`flex flex-col items-center justify-center w-full h-48 sm:h-52 border-2 border-dashed rounded-2xl cursor-pointer transition-all group ${
                  isDragOver
                    ? 'border-[#7D8F69] bg-[#7D8F69]/10 scale-[1.01]'
                    : 'border-[#EAE7DC] hover:border-[#7D8F69] hover:bg-[#F9F8F3]'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                  <div className={`p-3 mb-3 rounded-full bg-[#7D8F69]/15 text-[#7D8F69] transition-transform ${isDragOver ? 'scale-125' : 'group-hover:scale-110'}`}>
                    {isDragOver ? <Upload className="w-7 h-7" /> : <Camera className="w-7 h-7" />}
                  </div>
                  <p className="mb-1 text-sm font-bold text-[#2D2926]">
                    {isDragOver ? 'Thả ảnh hóa đơn vào đây!' : 'Nhấp để tải lên hoặc kéo thả ảnh hóa đơn'}
                  </p>
                  <p className="text-xs text-[#8C857D]">
                    Hỗ trợ JPG, PNG, WEBP (chụp hóa đơn nhà hàng, siêu thị, phiếu thu...)
                  </p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInputChange} />
              </label>

              {/* Sample receipts quick test */}
              <div className="pt-2">
                <p className="text-xs font-bold text-[#8C857D] uppercase tracking-wider mb-2">
                  Hoặc chọn hóa đơn mẫu trải nghiệm nhanh:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SAMPLE_RECEIPTS.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectSample(s)}
                      className="flex items-center gap-3 p-3 text-left rounded-2xl border border-[#EAE7DC] hover:border-[#7D8F69] bg-[#F9F8F3] hover:bg-[#F1EFE7] transition group"
                    >
                      <img src={s.url} alt={s.name} className="w-12 h-12 object-cover rounded-xl shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#2D2926] truncate group-hover:text-[#7D8F69]">
                          {s.name}
                        </p>
                        <p className="text-[11px] text-[#8C857D]">Bấm để chọn mẫu</p>
                      </div>
                    </button>
                  ))}
                </div>
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
                        <MessageSquare className="w-4 h-4 text-[#D98B72]" /> 💬 Lời dặn cho AI (Tùy chọn)
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
                        <MessageSquare className="w-3.5 h-3.5 text-[#D98B72]" /> 💬 Ghi chú / Chia tiền
                      </label>
                      <textarea
                        value={userNote}
                        onChange={(e) => setUserNote(e.target.value)}
                        placeholder="VD: Chia đôi với Nam, Tiền ăn lẩu..."
                        rows={2}
                        className="w-full p-2.5 text-xs font-medium rounded-xl bg-white border border-[#EAE7DC] text-[#2D2926] placeholder:text-[#8C857D] focus:outline-none focus:ring-2 focus:ring-[#7D8F69] transition resize-none"
                      />
                      {ocrResult.rawNotes && (
                        <p className="mt-1.5 text-[10px] text-[#8C857D] italic">
                          💡 AI trích xuất: {ocrResult.rawNotes}
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
