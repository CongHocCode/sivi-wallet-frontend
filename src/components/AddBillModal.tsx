/**
 * SIVI WALLET - Add Group Bill Modal (Equal / Custom Split Engine)
 */

import React, { useState, useEffect } from 'react';
import { X, Receipt, Users, Calculator } from 'lucide-react';
import { apiService } from '../services/api';
import { Group, SplitType, SplitDetail } from '../types';
import { formatVND, parseVNDInput } from '../lib/formatters';

interface AddBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  selectedGroupId?: string;
  onSuccess: () => void;
}

export const AddBillModal: React.FC<AddBillModalProps> = ({
  isOpen,
  onClose,
  groups,
  selectedGroupId,
  onSuccess,
}) => {
  const [groupId, setGroupId] = useState<string>(selectedGroupId || groups[0]?.id || '');
  const [title, setTitle] = useState('');
  const [totalAmountInput, setTotalAmountInput] = useState('');
  const [payerMemberId, setPayerMemberId] = useState<string>('usr_001');
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentGroup = groups.find((g) => g.id === groupId) || groups[0];

  useEffect(() => {
    if (selectedGroupId) {
      setGroupId(selectedGroupId);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    if (currentGroup) {
      setPayerMemberId(currentGroup.members[0]?.id || 'usr_001');
    }
  }, [groupId]);

  if (!isOpen || !currentGroup) return null;

  const totalAmount = parseVNDInput(totalAmountInput);

  // Calculate split amounts
  const getSplits = (): SplitDetail[] => {
    const members = currentGroup.members;
    if (members.length === 0) return [];

    if (splitType === 'EQUAL') {
      const perPerson = Math.round(totalAmount / members.length);
      return members.map((m) => ({
        memberId: m.id,
        memberName: m.name,
        amount: perPerson,
      }));
    } else {
      return members.map((m) => ({
        memberId: m.id,
        memberName: m.name,
        amount: customSplits[m.id] || 0,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tên hóa đơn/kèo ăn');
      return;
    }
    if (!totalAmount || totalAmount <= 0) {
      setError('Số tiền phải lớn hơn 0');
      return;
    }

    const splits = getSplits();
    const sumSplits = splits.reduce((acc, s) => acc + s.amount, 0);

    if (splitType === 'EXACT' && Math.abs(sumSplits - totalAmount) > 1000) {
      setError(`Tổng tiền phân chia (${formatVND(sumSplits)}) chưa khớp tổng hóa đơn (${formatVND(totalAmount)})`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payer = currentGroup.members.find((m) => m.id === payerMemberId);

      await apiService.addGroupBill({
        groupId: currentGroup.id,
        groupName: currentGroup.name,
        title,
        totalAmount,
        payerMemberId,
        payerMemberName: payer?.name || 'Thành viên',
        splitType,
        splits,
        date: new Date().toISOString(),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi thêm hóa đơn');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-500" /> Thêm Hóa Đơn / Kèo Chia Tiền Nhóm
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Select Group */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Chọn Nhóm:</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.members.length} thành viên)
                </option>
              ))}
            </select>
          </div>

          {/* Bill Title */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Nội dung chi tiêu:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Ăn lẩu lươn, Xe khách Đà Lạt, Tiền phòng..."
              className="w-full p-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Total Amount */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Tổng số tiền hóa đơn (Hỗ trợ nhập 840k, 1.2tr):
            </label>
            <div className="relative">
              <input
                type="text"
                value={totalAmountInput}
                onChange={(e) => setTotalAmountInput(e.target.value)}
                placeholder="840k hoặc 1200000..."
                className="w-full p-3 text-lg font-black rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
              />
              <span className="absolute right-3 top-3.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                = {formatVND(totalAmount)}
              </span>
            </div>
          </div>

          {/* Single Payer Selection */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Ai là người đã ứng tiền trước (Single Payer)?
            </label>
            <select
              value={payerMemberId}
              onChange={(e) => setPayerMemberId(e.target.value)}
              className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {currentGroup.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.isGuest ? '(Khách)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Split Method Toggle */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Hình thức chia tiền:
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setSplitType('EQUAL')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  splitType === 'EQUAL'
                    ? 'bg-amber-500 text-white shadow'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Chia Đều ({currentGroup.members.length} người)
              </button>
              <button
                type="button"
                onClick={() => setSplitType('EXACT')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  splitType === 'EXACT'
                    ? 'bg-amber-500 text-white shadow'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Tự Điền Số Tiền
              </button>
            </div>
          </div>

          {/* Splits list preview */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Phân chia cho từng thành viên:
            </span>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {getSplits().map((s) => (
                <div
                  key={s.memberId}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <span className="font-bold text-slate-800 dark:text-slate-200">{s.memberName}</span>
                  {splitType === 'EQUAL' ? (
                    <span className="font-extrabold text-amber-600 dark:text-amber-400">
                      {formatVND(s.amount)}
                    </span>
                  ) : (
                    <input
                      type="number"
                      value={customSplits[s.memberId] || 0}
                      onChange={(e) =>
                        setCustomSplits({ ...customSplits, [s.memberId]: Number(e.target.value) })
                      }
                      className="w-28 p-1 text-right font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-rose-500">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-lg shadow-amber-500/20"
            >
              {isSubmitting ? 'Đang tạo...' : 'Lưu Hóa Đơn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
