/**
 * SIVI WALLET - Group Detail Modal
 * Detailed view of a spend group: Header (Name, Creator, Total spent),
 * Members list with badges and join date, Recent group bills, and actions (+ Add Member, + Create Bill).
 */

import React, { useState } from 'react';
import { X, Users, Receipt, Plus, UserPlus, Shield, UserCheck, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Group, GroupBill, DebtSummary, GroupMember } from '../types';
import { formatVND, formatTxDateTime } from '../lib/formatters';
import { api } from '../services/api';

interface GroupDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  bills?: GroupBill[];
  debts?: DebtSummary[];
  onAddBill?: (groupId: string) => void;
  onRefreshGroupData?: () => void;
  onSettleDebt?: (debt: DebtSummary) => void;
}

export const GroupDetailModal: React.FC<GroupDetailModalProps> = ({
  isOpen,
  onClose,
  group,
  bills = [],
  debts = [],
  onAddBill,
  onRefreshGroupData,
  onSettleDebt,
}) => {
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);

  if (!isOpen || !group) return null;

  // Defensive array handling
  const safeMembers: GroupMember[] = Array.isArray(group.members) ? group.members : [];
  const safeBills: GroupBill[] = Array.isArray(bills) ? bills.filter((b) => b && b.groupId === group.id) : [];
  const safeDebts: DebtSummary[] = Array.isArray(debts) ? debts.filter((d) => d && d.groupId === group.id) : [];

  // Metrics
  const totalGroupSpent = safeBills.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
  const totalOutstandingDebt = safeDebts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  // Creator identification
  const creatorMember = safeMembers.find(
    (m) => m.role === 'ADMIN' || (m as any).isCreator || (group as any).creatorId === m.id
  ) || safeMembers[0];
  const creatorName = (group as any).creatorName || (group as any).createdBy || creatorMember?.name || 'Trưởng nhóm';

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      setAddMemberError('Vui lòng nhập tên thành viên');
      return;
    }

    setIsAddingMember(true);
    setAddMemberError(null);

    try {
      await api.groups.addMember(group.id, {
        name: newMemberName.trim(),
        isGuest: !newMemberEmail.trim(),
        email: newMemberEmail.trim() || undefined,
      });

      setNewMemberName('');
      setNewMemberEmail('');
      setShowAddMember(false);
      if (onRefreshGroupData) onRefreshGroupData();
    } catch (err: any) {
      setAddMemberError(err.message || 'Lỗi khi thêm thành viên');
    } finally {
      setIsAddingMember(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#2D2926]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden border border-[#EAE7DC] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE7DC] bg-[#FAF9F5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#7D8F69]/15 text-[#7D8F69] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#2D2926]">{group.name}</h2>
              <p className="text-xs text-[#8C857D] flex items-center gap-1.5 mt-0.5">
                <span>Tạo bởi: <strong className="text-[#4A443F]">{creatorName}</strong></span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#8C857D] hover:text-[#2D2926] hover:bg-[#EAE7DC] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Group Overview Card */}
          <div className="p-4 bg-gradient-to-br from-[#FAF9F5] to-[#F1EFE7] rounded-2xl border border-[#EAE7DC] grid grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] font-bold text-[#8C857D] uppercase tracking-wider block">
                Tổng Chi Tiêu Nhóm
              </span>
              <p className="text-xl font-black text-[#7D8F69] mt-1">
                {formatVND(totalGroupSpent)}
              </p>
              <p className="text-[10px] text-[#8C857D] mt-0.5">{safeBills.length} hóa đơn đã chia</p>
            </div>

            <div className="border-l border-[#EAE7DC] pl-4">
              <span className="text-[11px] font-bold text-[#8C857D] uppercase tracking-wider block">
                Công Nợ Chưa Tất Toán
              </span>
              <p className={`text-xl font-black mt-1 ${totalOutstandingDebt > 0 ? 'text-[#D98B72]' : 'text-emerald-600'}`}>
                {totalOutstandingDebt > 0 ? formatVND(totalOutstandingDebt) : '0 VNĐ (Đã xong)'}
              </p>
              <p className="text-[10px] text-[#8C857D] mt-0.5">{safeDebts.length} giao dịch nợ</p>
            </div>
          </div>

          {/* Members List Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#2D2926] uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#7D8F69]" />
                <span>Thành viên nhóm ({safeMembers.length})</span>
              </h3>
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="px-3 py-1.5 bg-[#7D8F69]/10 hover:bg-[#7D8F69]/20 text-[#7D8F69] text-xs font-bold rounded-xl transition flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{showAddMember ? 'Đóng' : '+ Thêm Thành Viên'}</span>
              </button>
            </div>

            {/* Add Member Form */}
            {showAddMember && (
              <form onSubmit={handleAddMember} className="p-4 bg-[#FAF9F5] rounded-2xl border border-[#EAE7DC] space-y-3 animate-in fade-in duration-200">
                <h4 className="text-xs font-bold text-[#2D2926]">Thêm thành viên mới vào nhóm</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Tên thành viên (bắt buộc)..."
                    className="w-full p-2.5 text-xs rounded-xl border border-[#EAE7DC] bg-white text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
                  />
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="Email (tùy chọn)..."
                    className="w-full p-2.5 text-xs rounded-xl border border-[#EAE7DC] bg-white text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
                  />
                </div>
                {addMemberError && <p className="text-xs text-[#D98B72] font-bold">{addMemberError}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddMember(false)}
                    className="px-3 py-1.5 text-xs text-[#8C857D] rounded-xl hover:bg-[#EAE7DC]/50 transition"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingMember}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-[#7D8F69] hover:bg-[#687856] rounded-xl transition shadow-2xs"
                  >
                    {isAddingMember ? 'Đang lưu...' : 'Thêm Ngay'}
                  </button>
                </div>
              </form>
            )}

            {/* Members Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {safeMembers.map((m, idx) => {
                const isAdmin = m.role === 'ADMIN' || (m as any).isCreator || idx === 0;
                const isGuest = m.isGuest;
                const joinedDateStr = m.joinedAt || (m as any).createdAt || group.createdAt || Date.now();

                return (
                  <div
                    key={m.id || idx}
                    className="p-3 bg-white border border-[#EAE7DC] rounded-2xl flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#7D8F69] text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                        {(m.name || 'T').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#2D2926] flex items-center gap-1.5">
                          <span>{m.name}</span>
                        </p>
                        <p className="text-[10px] text-[#8C857D] flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-[#8C857D]" />
                          <span>Tham gia: {formatTxDateTime(joinedDateStr, false)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Member Badge */}
                    <div>
                      {isAdmin ? (
                        <span className="px-2 py-0.5 bg-[#7D8F69]/15 text-[#7D8F69] text-[10px] font-extrabold rounded-full flex items-center gap-1">
                          <Shield className="w-3 h-3" /> ADMIN
                        </span>
                      ) : isGuest ? (
                        <span className="px-2 py-0.5 bg-[#D98B72]/15 text-[#D98B72] text-[10px] font-bold rounded-full">
                          Khách
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-[#FAF9F5] border border-[#EAE7DC] text-[#8C857D] text-[10px] font-bold rounded-full">
                          Thành viên
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pairwise Debts Breakdown (If Any) */}
          {safeDebts.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-[#EAE7DC]">
              <h3 className="text-xs font-bold text-[#2D2926] uppercase tracking-wider">
                Chi tiết công nợ nhóm ({safeDebts.length})
              </h3>
              <div className="space-y-2">
                {safeDebts.map((d, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#FAF9F5] border border-[#EAE7DC] rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#D98B72]">{d.debtorName}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#8C857D]" />
                      <span className="font-bold text-[#7D8F69]">{d.creditorName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#D98B72]">{formatVND(d.amount)}</span>
                      {onSettleDebt && (
                        <button
                          onClick={() => {
                            onSettleDebt(d);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-[#7D8F69] hover:bg-[#687856] text-white text-[10px] font-bold rounded-lg transition"
                        >
                          Trả
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Group Bills Section */}
          <div className="space-y-3 pt-4 border-t border-[#EAE7DC]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#2D2926] uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#D98B72]" />
                <span>Hóa đơn gần đây ({safeBills.length})</span>
              </h3>
              {onAddBill && (
                <button
                  onClick={() => {
                    onAddBill(group.id);
                    onClose();
                  }}
                  className="text-xs font-bold text-[#7D8F69] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Tạo Hóa Đơn
                </button>
              )}
            </div>

            {safeBills.length === 0 ? (
              <p className="text-xs text-[#8C857D] italic text-center py-4 bg-[#FAF9F5] rounded-2xl border border-[#EAE7DC]">
                Chưa có hóa đơn nào được tạo trong nhóm này.
              </p>
            ) : (
              <div className="space-y-2">
                {safeBills.map((b) => {
                  const billDate = b.date || b.createdAt || Date.now();
                  return (
                    <div
                      key={b.id}
                      className="p-3.5 bg-white rounded-2xl border border-[#EAE7DC] flex items-center justify-between hover:border-[#7D8F69]/40 transition"
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-[#2D2926]">{b.title}</p>
                        <p className="text-[10px] text-[#8C857D]">
                          {formatTxDateTime(billDate, true)} • Người trả: <strong className="text-[#4A443F]">{b.payerMemberName || b.payerName || 'Thành viên'}</strong>
                        </p>
                      </div>
                      <span className="text-xs font-extrabold text-[#2D2926] bg-[#FAF9F5] px-2.5 py-1 rounded-xl border border-[#EAE7DC]">
                        {formatVND(b.totalAmount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-[#EAE7DC] bg-[#FAF9F5] flex items-center justify-between gap-3">
          <button
            onClick={() => setShowAddMember(true)}
            className="px-4 py-2.5 bg-[#F1EFE7] hover:bg-[#EAE7DC] text-[#2D2926] rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <UserPlus className="w-4 h-4 text-[#7D8F69]" />
            <span>Thêm Thành Viên</span>
          </button>

          {onAddBill && (
            <button
              onClick={() => {
                onAddBill(group.id);
                onClose();
              }}
              className="px-4 py-2.5 bg-[#7D8F69] hover:bg-[#687856] text-white rounded-2xl text-xs font-black shadow-xs transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Hóa Đơn Cho Nhóm Này</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
