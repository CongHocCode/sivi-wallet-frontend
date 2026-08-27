/**
 * SIVI WALLET - Add Group Modal with Smart Member Search (Name, Username, Email, Guest)
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Users, UserPlus, Search, UserCheck } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface GroupMemberItem {
  id: string;
  name: string;
  isGuest: boolean;
  email?: string;
  username?: string;
  userId?: string;
}

export const AddGroupModal: React.FC<AddGroupModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<GroupMemberItem[]>([
    {
      id: 'usr_003',
      name: 'Lê Thị Lan',
      username: 'lan.le',
      email: 'lan.le@gmail.com',
      isGuest: false,
      userId: 'usr_003',
    },
    {
      id: 'usr_004',
      name: 'Phạm Nhật Hoàng',
      username: 'hoang.pn',
      email: 'hoang.pn@sivi.vn',
      isGuest: false,
      userId: 'usr_004',
    },
  ]);

  // Smart Search & Autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search users via API (name, username, email) with 300ms debounce
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      setIsSearchingUsers(false);
      return;
    }

    setIsSearchingUsers(true);
    let isMounted = true;
    const timer = setTimeout(() => {
      api.auth
        .searchUsers(q)
        .then((users) => {
          if (isMounted) {
            setSearchResults(users || []);
            setIsSearchingUsers(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setSearchResults([]);
            setIsSearchingUsers(false);
          }
        });
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSearchQuery('');
      setShowSearchDropdown(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Add real registered user from search result
  const handleAddRealUser = (userItem: User) => {
    const displayName = userItem.fullName || userItem.name || userItem.username || 'Thành viên';
    const newMember: GroupMemberItem = {
      id: String(userItem.id || 'usr_' + Date.now()),
      name: displayName,
      username: userItem.username,
      email: userItem.email,
      isGuest: false,
      userId: userItem.id ? String(userItem.id) : undefined,
    };
    setMembers((prev) => [...prev, newMember]);
    setSearchQuery('');
    setShowSearchDropdown(false);
    setError(null);
  };

  // Add guest member
  const handleAddGuest = (guestName: string) => {
    const cleanName = guestName.trim();
    if (!cleanName) return;
    const newMember: GroupMemberItem = {
      id: 'guest_' + Date.now(),
      name: cleanName,
      isGuest: true,
    };
    setMembers((prev) => [...prev, newMember]);
    setSearchQuery('');
    setShowSearchDropdown(false);
    setError(null);
  };

  // Remove member from group list
  const handleRemoveMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên nhóm chia tiền');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.groups.create({
        name: name.trim(),
        description: description ? description.trim() : undefined,
        members: members.map((m) => ({
          name: m.name,
          isGuest: m.isGuest,
          email: m.email,
          userId: m.userId,
        })),
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
      <div className="relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden border border-[#EAE7DC] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAE7DC] bg-[#FAF9F5] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#7D8F69]/15 text-[#7D8F69] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#2D2926]">
                Tạo Nhóm Chia Tiền Mới
              </h2>
              <p className="text-[11px] text-[#8C857D]">
                Quản lý chi tiêu chung, chia tiền tự động & theo dõi công nợ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8C857D] hover:text-[#2D2926] hover:bg-[#EAE7DC] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Group Name */}
          <div>
            <label className="text-xs font-bold text-[#4A443F] block mb-1">
              1. Tên nhóm: <span className="text-[#D98B72]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Đi Đà Lạt 3N2Đ, Nhà Trọ 402, Ăn Trưa Văn Phòng..."
              className="w-full p-2.5 text-xs font-bold rounded-2xl border border-[#EAE7DC] bg-[#FAF9F5] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none placeholder:font-normal placeholder:text-[#8C857D]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-[#4A443F] block mb-1">
              2. Mô tả nhóm (Tùy chọn):
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ví dụ: Quản lý tiền phòng, tiền ăn uống đi chơi..."
              className="w-full p-2.5 text-xs rounded-2xl border border-[#EAE7DC] bg-[#FAF9F5] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none placeholder:text-[#8C857D]"
            />
          </div>

          {/* Member Addition Area */}
          <div className="space-y-2 pt-2 border-t border-[#EAE7DC]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#4A443F] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#7D8F69]" />
                <span>3. Thành viên nhóm ({members.length + 1} người):</span>
              </label>
            </div>

            {/* Leader (Self - Non-removable) */}
            <div className="flex items-center justify-between p-2.5 px-3 rounded-2xl bg-[#7D8F69]/10 text-xs font-bold text-[#2D2926] border border-[#7D8F69]/25">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#7D8F69] text-white flex items-center justify-center text-xs font-black shrink-0">
                  N
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#2D2926] truncate">Trần Minh Nam (Tôi)</p>
                  <p className="text-[10px] text-[#7D8F69] truncate font-medium">@nam.tm • nam.tm@sivi.vn</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-[#7D8F69] text-white shrink-0">
                Trưởng nhóm
              </span>
            </div>

            {/* Added members list */}
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {members.map((m) => {
                const displayName = m.name;
                const uname = m.username ? `@${m.username}` : m.email || '';
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 px-3 rounded-2xl bg-[#FAF9F5] text-xs font-semibold text-[#2D2926] border border-[#EAE7DC] hover:border-[#7D8F69]/40 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        m.isGuest ? 'bg-[#D98B72]/15 text-[#D98B72]' : 'bg-[#7D8F69]/15 text-[#7D8F69]'
                      }`}>
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#2D2926] truncate">{displayName}</p>
                        {uname && <p className="text-[10px] text-[#8C857D] truncate font-normal">{uname}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {m.isGuest ? (
                        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-[#D98B72]/15 text-[#D98B72] border border-[#D98B72]/30">
                          Khách
                        </span>
                      ) : (
                        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-[#7D8F69]/15 text-[#7D8F69] border border-[#7D8F69]/30">
                          Thành viên {m.username ? `(@${m.username})` : ''}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id)}
                        className="p-1 text-[#8C857D] hover:text-[#D98B72] hover:bg-rose-50 rounded-lg transition"
                        title="Xóa khỏi nhóm"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Smart Search & Auto-complete Box */}
            <div ref={searchContainerRef} className="relative pt-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8C857D] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  onFocus={() => {
                    if (searchQuery.trim()) setShowSearchDropdown(true);
                  }}
                  placeholder="🔍 Tìm kiếm theo tên, @username, email hoặc gõ tên khách mới..."
                  className="w-full pl-8 pr-10 py-2 text-xs font-semibold rounded-xl border border-[#EAE7DC] bg-[#FAF9F5] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none placeholder:text-[#8C857D]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearchDropdown(false);
                    }}
                    className="absolute right-2.5 top-2.5 text-[#8C857D] hover:text-[#2D2926]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown Search Results */}
              {showSearchDropdown && searchQuery.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-[#EAE7DC] shadow-xl z-40 overflow-hidden divide-y divide-[#FAF9F5] animate-in fade-in zoom-in-95 duration-150 max-h-60 overflow-y-auto">
                  {isSearchingUsers && searchResults.length === 0 && (
                    <div className="p-3 text-center text-xs text-[#8C857D] font-semibold">
                      Đang tìm kiếm thành viên...
                    </div>
                  )}

                  {/* Real Users */}
                  {searchResults
                    .filter(
                      (u) =>
                        !members.some(
                          (m) =>
                            (m.userId && String(m.userId) === String(u.id)) ||
                            m.id === u.id ||
                            m.name.toLowerCase().trim() === (u.fullName || u.name || '').toLowerCase().trim()
                        )
                    )
                    .map((userItem) => {
                      const displayName = userItem.fullName || userItem.name || userItem.username;
                      const detailLine = [
                        userItem.username ? `@${userItem.username}` : '',
                        userItem.email || '',
                      ]
                        .filter(Boolean)
                        .join(' • ');

                      return (
                        <div
                          key={userItem.id}
                          onClick={() => handleAddRealUser(userItem)}
                          className="p-2.5 px-3 flex items-center justify-between hover:bg-[#F9F8F3] cursor-pointer transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-[#7D8F69]/15 text-[#7D8F69] flex items-center justify-center text-xs font-black shrink-0">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#2D2926] truncate">{displayName}</p>
                              {detailLine && (
                                <p className="text-[10px] text-[#8C857D] truncate">{detailLine}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-[#7D8F69]/15 text-[#7D8F69] border border-[#7D8F69]/30">
                              Thành viên {userItem.username ? `(@${userItem.username})` : ''}
                            </span>
                            <span className="text-[10px] font-bold text-[#7D8F69] flex items-center gap-0.5 ml-1">
                              <UserPlus className="w-3 h-3" /> Thêm
                            </span>
                          </div>
                        </div>
                      );
                    })}

                  {/* Always bottom option: Add new guest */}
                  <div
                    onClick={() => handleAddGuest(searchQuery.trim())}
                    className="p-2.5 px-3 flex items-center justify-between bg-[#7D8F69]/8 hover:bg-[#7D8F69]/15 cursor-pointer transition text-[#7D8F69]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#D98B72]/15 text-[#D98B72] flex items-center justify-center text-xs font-black shrink-0">
                        +
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#2D2926] truncate">
                          ➕ Thêm khách mới: &ldquo;<span className="text-[#D98B72] font-black">{searchQuery.trim()}</span>&rdquo;
                        </p>
                        <p className="text-[10px] text-[#8C857D]">Tạo nhanh thành viên khách (Guest)</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#7D8F69] text-white shrink-0 hover:bg-[#687856] shadow-2xs">
                      + Thêm khách
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-[#D98B72]/15 border border-[#D98B72]/30 text-xs font-bold text-[#D98B72] animate-in fade-in">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EAE7DC]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#8C857D] hover:bg-[#FAF9F5] rounded-xl transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-extrabold text-white bg-[#7D8F69] hover:bg-[#687856] disabled:opacity-50 rounded-xl shadow-xs transition"
            >
              {isSubmitting ? 'Đang tạo nhóm...' : 'Tạo Nhóm Mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
