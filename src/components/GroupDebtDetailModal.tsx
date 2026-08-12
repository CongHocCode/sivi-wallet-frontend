/**
 * SIVI WALLET - Group Debt Detail Modal
 * Shows breakdown of debts within a specific group and allows quick settlement
 */

import React from 'react';
import { X, Users, ArrowRight, Receipt, CheckCircle2, Plus } from 'lucide-react';
import { Group, DebtSummary, GroupBill } from '../types';
import { formatVND } from '../lib/formatters';

interface GroupDebtDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  debts: DebtSummary[];
  bills: GroupBill[];
  onSettleDebt: (debt: DebtSummary) => void;
  onAddBill: (groupId: string) => void;
}

export const GroupDebtDetailModal: React.FC<GroupDebtDetailModalProps> = ({
  isOpen,
  onClose,
  group,
  debts,
  bills,
  onSettleDebt,
  onAddBill,
}) => {
  if (!isOpen || !group) return null;

  const groupDebts = debts.filter((d) => d.groupId === group.id);
  const totalGroupDebt = groupDebts.reduce((sum, d) => sum + d.amount, 0);
  const groupBills = bills.filter((b) => b.groupId === group.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2926]/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-[28px] shadow-2xl overflow-hidden border border-[#EAE7DC] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE7DC] bg-[#F1EFE7]">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#7D8F69]" />
              <h2 className="text-base font-bold text-[#2D2926]">{group.name}</h2>
            </div>
            <p className="text-xs text-[#8C857D] mt-0.5">Chi tiết các khoản nợ & hóa đơn nhóm</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#8C857D] hover:text-[#2D2926] hover:bg-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Group Overview Stats */}
          <div className="p-4 rounded-2xl bg-[#F9F8F3] border border-[#EAE7DC] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#8C857D] uppercase tracking-wider block">
                Tổng nợ chưa tất toán
              </span>
              <p className="text-2xl font-black text-[#D98B72] mt-0.5">
                {totalGroupDebt > 0 ? formatVND(totalGroupDebt) : '0 VNĐ (Đã cân bằng)'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#8C857D] block">Thành viên:</span>
              <span className="text-xs font-bold text-[#2D2926]">{group.members.length} người</span>
            </div>
          </div>

          {/* Pairwise Debts Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-[#4A443F] uppercase tracking-wider">
                Danh sách khoản nợ ({groupDebts.length})
              </h3>
            </div>

            {groupDebts.length === 0 ? (
              <div className="p-4 text-center bg-[#F9F8F3] rounded-2xl border border-[#EAE7DC] text-[#8C857D] text-xs">
                <CheckCircle2 className="w-8 h-8 text-[#7D8F69] mx-auto mb-1" />
                <p className="font-bold text-[#2D2926]">Tất cả thành viên đã sòng phẳng!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {groupDebts.map((d, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-white border border-[#EAE7DC] rounded-2xl flex items-center justify-between gap-3 shadow-xs hover:border-[#7D8F69] transition"
                  >
                    <div className="flex items-center gap-2 text-xs flex-1">
                      <span className="font-bold text-[#D98B72]">{d.debtorName}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#8C857D] shrink-0" />
                      <span className="font-bold text-[#7D8F69]">{d.creditorName}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-extrabold text-[#D98B72]">
                        {formatVND(d.amount)}
                      </span>
                      <button
                        onClick={() => {
                          onSettleDebt(d);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-[#7D8F69] hover:bg-[#687856] text-white rounded-xl text-[11px] font-bold transition shadow-xs"
                      >
                        Thanh Toán
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Group Bills Section */}
          <div className="space-y-3 pt-2 border-t border-[#EAE7DC]">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-[#4A443F] uppercase tracking-wider">
                Hóa đơn gần đây ({groupBills.length})
              </h3>
              <button
                onClick={() => {
                  onAddBill(group.id);
                  onClose();
                }}
                className="text-xs font-bold text-[#7D8F69] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm Hóa Đơn
              </button>
            </div>

            {groupBills.length === 0 ? (
              <p className="text-xs text-[#8C857D] italic">Chưa có hóa đơn nào được tạo trong nhóm này.</p>
            ) : (
              <div className="space-y-2">
                {groupBills.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 bg-[#F9F8F3] rounded-2xl border border-[#EAE7DC] flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#2D2926]">{b.title}</p>
                      <p className="text-[10px] text-[#8C857D]">
                        {new Date(b.date).toLocaleDateString('vi-VN')} • Trả bởi {b.payerName}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#2D2926]">{formatVND(b.totalAmount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#EAE7DC] bg-[#F1EFE7] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-[#4A443F] bg-white border border-[#EAE7DC] hover:bg-[#F9F8F3] rounded-xl transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
