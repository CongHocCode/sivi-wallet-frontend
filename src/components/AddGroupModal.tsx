/**
 * SIVI WALLET - Add Group Modal with Guest User Pattern support
 */

import React, { useState } from 'react';
import { X, Users, UserPlus, Trash2, UserCheck } from 'lucide-react';
import { api } from '../services/api';

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface MemberFormState {
  name: string;
  isGuest: boolean;
  email?: string;
}

export const AddGroupModal: React.FC<AddGroupModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<MemberFormState[]>([
    { name: 'Nguyễn Văn Hùng', isGuest: true },
    { name: 'Lê Thị Lan', isGuest: false, email: 'lan.le@gmail.com' },
  ]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberIsGuest, setNewMemberIsGuest] = useState(true);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    setMembers([
      ...members,
      { name: newMemberName.trim(), isGuest: newMemberIsGuest, email: newMemberEmail || undefined },
    ]);
    setNewMemberName('');
    setNewMemberEmail('');
  };

  const handleRemoveMember = (idx: number) => {
    setMembers(members.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên nhóm');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.groups.create({
        name: name.trim(),
        description: description ? description.trim() : undefined,
        members,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo nhóm');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#2D2926]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden border border-[#EAE7DC] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAE7DC] bg-[#F9F8F3] shrink-0">
          <h2 className="text-sm font-extrabold text-[#2D2926] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#7D8F69]" /> Tạo Nhóm Chia Tiền Mới
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
          {/* Group Name */}
          <div>
            <label className="text-xs font-bold text-[#4A443F] block mb-1">Tên nhóm:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Đi Đà Lạt 3N2Đ, Nhà Trọ 402, Ăn Trưa..."
              className="w-full p-2.5 text-xs font-bold rounded-2xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-[#4A443F] block mb-1">Mô tả nhóm:</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ví dụ: Quản lý tiền đi chơi du lịch tháng 8..."
              className="w-full p-2.5 text-xs rounded-2xl border border-[#EAE7DC] bg-[#F9F8F3] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
            />
          </div>

          {/* Member Addition Area */}
          <div className="space-y-2 pt-1 border-t border-[#EAE7DC]">
            <label className="text-xs font-bold text-[#4A443F] uppercase tracking-wider block">
              Thành viên nhóm:
            </label>

            {/* Always include self */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#7D8F69]/10 text-xs font-bold text-[#2D2926] border border-[#7D8F69]/20">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[#7D8F69]" /> Trần Minh Nam (Tôi)
              </span>
              <span className="text-[10px] uppercase font-bold text-[#7D8F69]">Trưởng nhóm</span>
            </div>

            {/* Added members list */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {members.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#F9F8F3] text-xs font-semibold text-[#2D2926] border border-[#EAE7DC]"
                >
                  <div className="flex items-center gap-2">
                    <span>{m.name}</span>
                    {m.isGuest ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAE7DC] text-[#4A443F]">
                        Thành viên ngoài
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7D8F69]/15 text-[#7D8F69]">
                        Thành viên chính
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(idx)}
                    className="p-1 text-[#8C857D] hover:text-[#D98B72] transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Member Input form */}
            <div className="p-3 rounded-2xl bg-[#F9F8F3] border border-[#EAE7DC] space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Tên bạn bè..."
                  className="w-full p-2 text-xs rounded-xl border border-[#EAE7DC] bg-white text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
                />
                <select
                  value={newMemberIsGuest ? 'guest' : 'user'}
                  onChange={(e) => setNewMemberIsGuest(e.target.value === 'guest')}
                  className="w-full p-2 text-xs font-semibold rounded-xl border border-[#EAE7DC] bg-white text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
                >
                  <option value="guest">Khách (Không cần app)</option>
                  <option value="user">Người dùng SIVI</option>
                </select>
              </div>

              {!newMemberIsGuest && (
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="Email người dùng SIVI..."
                  className="w-full p-2 text-xs rounded-xl border border-[#EAE7DC] bg-white text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
                />
              )}

              <button
                type="button"
                onClick={handleAddMember}
                className="w-full py-2 text-xs font-bold text-[#7D8F69] bg-[#7D8F69]/10 hover:bg-[#7D8F69]/20 rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <UserPlus className="w-3.5 h-3.5" /> Thêm Bạn Vào Danh Sách
              </button>
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
              {isSubmitting ? 'Đang tạo...' : 'Tạo Nhóm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
