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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#2D2926]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden border border-[#EAE7DC] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAE7DC] bg-[#F9F8F3] shrink-0">
          <h2 className="text-sm font-extrabold text-[#2D2926] flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#D98B72]" /> Thêm Hóa Đơn Chia Tiền Nhóm
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8C857D] hover:text-[#2D2926] hover:bg-[#EAE7DC] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Select Group */}
          <div>
            <label className="text-xs font-bold text-[#4A443F] block mb-1">Chọn Nhóm:</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full p-2.5 text-xs font-bold rounded-2xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
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
            <label className="text-xs font-bold text-[#4A443F] block mb-1">Nội dung chi tiêu:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Ăn lẩu lươn, Xe khách Đà Lạt, Tiền phòng..."
              className="w-full p-2.5 text-xs font-semibold rounded-2xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
            />
          </div>

          {/* Total Amount */}
          <div>
            <label className="text-xs font-bold text-[#4A443F] block mb-1">
              Tổng số tiền hóa đơn (Hỗ trợ nhập 840k, 1.2tr):
            </label>
            <div className="relative">
              <input
                type="text"
                value={totalAmountInput}
                onChange={(e) => setTotalAmountInput(e.target.value)}
                placeholder="840k hoặc 1200000..."
                className="w-full p-3 text-lg font-black rounded-2xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
              />
              <span className="absolute right-3 top-3.5 text-xs font-bold text-[#D98B72]">
                = {formatVND(totalAmount)}
              </span>
            </div>
          </div>

          {/* Single Payer Selection */}
          <div>
            <label className="text-xs font-bold text-[#4A443F] block mb-1">
              Ai là người đã ứng tiền trước (Người trả)?
            </label>
            <select
              value={payerMemberId}
              onChange={(e) => setPayerMemberId(e.target.value)}
              className="w-full p-2.5 text-xs font-bold rounded-2xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
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
            <label className="text-xs font-bold text-[#4A443F] block mb-1.5">
              Hình thức chia tiền:
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F9F8F3] rounded-2xl border border-[#EAE7DC]">
              <button
                type="button"
                onClick={() => setSplitType('EQUAL')}
                className={`py-2 text-xs font-bold rounded-xl transition ${
                  splitType === 'EQUAL'
                    ? 'bg-[#7D8F69] text-white shadow-xs'
                    : 'text-[#8C857D] hover:text-[#2D2926]'
                }`}
              >
                Chia Đều ({currentGroup.members.length} người)
              </button>
              <button
                type="button"
                onClick={() => setSplitType('EXACT')}
                className={`py-2 text-xs font-bold rounded-xl transition ${
                  splitType === 'EXACT'
                    ? 'bg-[#7D8F69] text-white shadow-xs'
                    : 'text-[#8C857D] hover:text-[#2D2926]'
                }`}
              >
                Tự Điền Số Tiền
              </button>
            </div>
          </div>

          {/* Splits list preview */}
          <div className="space-y-2 pt-2 border-t border-[#EAE7DC]">
            <span className="text-xs font-bold text-[#4A443F] uppercase tracking-wider block">
              Phân chia cho từng thành viên:
            </span>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {getSplits().map((s) => (
                <div
                  key={s.memberId}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#F9F8F3] border border-[#EAE7DC] text-xs"
                >
                  <span className="font-bold text-[#2D2926]">{s.memberName}</span>
                  {splitType === 'EQUAL' ? (
                    <span className="font-extrabold text-[#D98B72]">
                      {formatVND(s.amount)}
                    </span>
                  ) : (
                    <input
                      type="number"
                      value={customSplits[s.memberId] || 0}
                      onChange={(e) =>
                        setCustomSplits({ ...customSplits, [s.memberId]: Number(e.target.value) })
                      }
                      className="w-28 p-1 text-right font-bold rounded-lg border border-[#EAE7DC] bg-white text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-xs font-bold text-[#D98B72]">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#8C857D] hover:bg-[#F9F8F3] rounded-xl transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-extrabold text-white bg-[#7D8F69] hover:bg-[#687856] rounded-xl shadow-xs transition"
            >
              {isSubmitting ? 'Đang tạo...' : 'Lưu Hóa Đơn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
