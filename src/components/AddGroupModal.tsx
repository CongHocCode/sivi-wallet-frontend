/**
 * SIVI WALLET - Add Group Modal with Guest User Pattern support
 */

import React, { useState } from 'react';
import { X, Users, UserPlus, Trash2, UserCheck } from 'lucide-react';
import { apiService } from '../services/api';

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
      await apiService.createGroup(name, description, members);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo nhóm');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Tạo Nhóm Chia Tiền Mới
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Group Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Tên nhóm:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Đi Đà Lạt 3N2Đ, Nhà Trọ 402, Ăn Trưa..."
              className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Mô tả nhóm:</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ví dụ: Quản lý tiền đi chơi du lịch tháng 8..."
              className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Member Addition Area */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Thành viên nhóm (Thành viên chính thức hoặc Khách):
            </label>

            {/* Always include self */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" /> Trần Minh Nam (Tôi)
              </span>
              <span className="text-[10px] uppercase font-bold text-emerald-600">Trưởng nhóm</span>
            </div>

            {/* Added members list */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {members.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
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
                    className="p-1 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Member Input form */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Tên bạn bè (ví dụ: Hùng)..."
                  className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
                <select
                  value={newMemberIsGuest ? 'guest' : 'user'}
                  onChange={(e) => setNewMemberIsGuest(e.target.value === 'guest')}
                  className="w-full p-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="guest">Thành viên linh hoạt (Không cần tài khoản)</option>
                  <option value="user">Người dùng hệ thống</option>
                </select>
              </div>

              {!newMemberIsGuest && (
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="Email người dùng SIVI..."
                  className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              )}

              <button
                type="button"
                onClick={handleAddMember}
                className="w-full py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 rounded-lg flex items-center justify-center gap-1 transition"
              >
                <UserPlus className="w-3.5 h-3.5" /> Thêm Bạn Vào Nhóm
              </button>
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
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-600/20"
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo Nhóm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
