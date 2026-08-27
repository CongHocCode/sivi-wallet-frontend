import React from 'react';
import { Users, Plus, Receipt, ChevronRight, UserPlus, ArrowUpRight } from 'lucide-react';
import { Group, GroupBill, DebtSummary } from '../types';
import { formatVND } from '../lib/formatters';

interface GroupsViewProps {
  groups: Group[];
  bills: GroupBill[];
  debts?: DebtSummary[];
  onOpenAddBill: (groupId?: string) => void;
  onOpenAddGroup: () => void;
  onSelectGroupDetail?: (group: Group) => void;
}

export const GroupsView: React.FC<GroupsViewProps> = ({
  groups = [],
  bills = [],
  debts = [],
  onOpenAddBill,
  onOpenAddGroup,
  onSelectGroupDetail,
}) => {
  // Defensive array unpacking
  const safeGroups = Array.isArray(groups) ? groups : ((groups as any)?.data || (groups as any)?.groups || []);
  const safeBills = Array.isArray(bills) ? bills : ((bills as any)?.data || (bills as any)?.bills || []);
  const safeDebts = Array.isArray(debts) ? debts : ((debts as any)?.data || (debts as any)?.debts || []);

  return (
    <div id="groups-view-container" className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#2D2926]">Nhóm Chi Tiêu & Chia Hóa Đơn</h2>
          <p className="text-xs text-[#8C857D]">
            Quản lý chuyến đi chơi, phòng trọ, kèo ăn uống, tự động tính toán công nợ sòng phẳng
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-groups-add-bill"
            onClick={() => onOpenAddBill()}
            className="px-4 py-2.5 bg-[#F1EFE7] hover:bg-[#EAE7DC] text-[#2D2926] rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <Receipt className="w-4 h-4 text-[#D98B72]" />
            <span>Thêm Hóa Đơn Nhóm</span>
          </button>
          <button
            id="btn-groups-create-group"
            onClick={onOpenAddGroup}
            className="px-4 py-2.5 bg-[#7D8F69] hover:bg-[#687856] text-white rounded-2xl text-xs font-black shadow-xs transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Nhóm Mới</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {safeGroups.length === 0 ? (
        <div className="bg-white border border-[#EAE7DC] rounded-3xl p-10 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-[#7D8F69]/10 text-[#7D8F69] flex items-center justify-center mx-auto text-2xl">
            <Users className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-[#2D2926]">Chưa có nhóm chi tiêu nào</h3>
            <p className="text-xs text-[#8C857D]">
              Tạo nhóm cho chuyến du lịch, tiền phòng trọ, ăn trưa văn phòng để Sivi tự động chia tiền sòng phẳng.
            </p>
          </div>
          <button
            onClick={onOpenAddGroup}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7D8F69] hover:bg-[#687856] text-white text-xs font-black rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Nhóm Đầu Tiên</span>
          </button>
        </div>
      ) : (
        /* Groups Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {safeGroups.map((g) => {
            if (!g) return null;
            const members = Array.isArray(g?.members) ? g.members : [];
            const groupBills = safeBills.filter((b) => b && b.groupId === g.id);
            const groupTotal = groupBills.reduce((sum, b) => sum + (Number(b?.totalAmount) || 0), 0);
            const groupDebts = safeDebts.filter((d) => d && d.groupId === g.id);
            const totalOutstandingDebt = groupDebts.reduce((sum, d) => sum + (Number(d?.amount) || 0), 0);

            return (
              <div
                key={g.id || Math.random()}
                onClick={() => onSelectGroupDetail && onSelectGroupDetail(g)}
                className="bg-white border border-[#EAE7DC] rounded-[28px] p-6 shadow-sm flex flex-col justify-between hover:border-[#7D8F69]/60 transition cursor-pointer group"
              >
                <div>
                  {/* Top bar */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#7D8F69]" />
                      <span className="text-sm font-black text-[#2D2926] tracking-tight">{g.name}</span>
                    </div>
                    <span className="text-[11px] bg-[#7D8F69]/10 text-[#7D8F69] px-3 py-1 rounded-full font-bold">
                      {members.length} Thành viên
                    </span>
                  </div>

                  {g.description && <p className="text-xs text-[#8C857D] mb-4 line-clamp-2">{g.description}</p>}

                  {/* Member Avatars */}
                  <div className="flex items-center -space-x-2 mb-4 overflow-x-auto py-1">
                    {members.map((m, idx) => (
                      <div
                        key={m?.id || idx}
                        className="w-8 h-8 rounded-full border-2 border-white bg-[#7D8F69] text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs shrink-0"
                        title={`${m?.name || 'Thành viên'} ${m?.isGuest ? '(Khách)' : ''}`}
                      >
                        {(m?.name || 'T').charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {members.length === 0 && (
                      <span className="text-xs text-[#8C857D] italic">Chưa có thành viên</span>
                    )}
                  </div>

                  {/* Metrics Box */}
                  <div className="p-3.5 bg-[#FAF9F5] rounded-2xl border border-[#EAE7DC] space-y-2">
                    <div className="flex justify-between text-xs font-medium text-[#8C857D]">
                      <span>Tổng chi tiêu nhóm:</span>
                      <span className="font-bold text-[#2D2926]">{formatVND(groupTotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium text-[#8C857D]">
                      <span>Số kèo hóa đơn:</span>
                      <span className="font-bold text-[#2D2926]">{groupBills.length} hóa đơn</span>
                    </div>
                    {totalOutstandingDebt > 0 && (
                      <div className="flex justify-between text-xs font-medium pt-1 border-t border-[#EAE7DC]/60">
                        <span className="text-[#D98B72] font-semibold">Công nợ chưa quyết toán:</span>
                        <span className="font-extrabold text-[#D98B72]">{formatVND(totalOutstandingDebt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-3 border-t border-[#FAF9F5] flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAddBill(g.id);
                    }}
                    className="flex-1 py-2.5 bg-[#F1EFE7] hover:bg-[#EAE7DC] rounded-xl text-xs font-bold text-[#4A443F] transition text-center flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Kèo Chi</span>
                  </button>
                  {onSelectGroupDetail && (
                    <button
                      onClick={() => onSelectGroupDetail(g)}
                      className="px-3.5 py-2.5 bg-[#FAF9F5] hover:bg-[#F1EFE7] border border-[#EAE7DC] rounded-xl text-xs font-bold text-[#7D8F69] transition flex items-center gap-1"
                    >
                      <span>Chi tiết</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
