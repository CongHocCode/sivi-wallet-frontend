/**
 * SIVI WALLET - Add Bill & Split Expense Modal (Splitwise-style Minimalist UI)
 * Features:
 * 1. Modal Header: "Thêm Chi Phí & Chia Tiền"
 * 2. Section 1 [Nhóm hoặc Cá nhân]: Dropdown "Chia lẻ cá nhân (Không có nhóm)" or select specific Group
 * 3. Section 2 [Nội dung chi phí]: Description input with smart placeholders ("Ăn lẩu Haidilao", "Mua chuột máy tính hộ Nam"...)
 * 4. Section 3 [Số tiền]: Amount input (supports 500k, 1.2tr shorthand, formatted VND live preview)
 * 5. Section 4 [Người thanh toán]: Toggle between "Tôi đã trả tiền" (with wallet selector) vs "Người khác trả" (with payer friend selector)
 * 6. Section 5 [Phần tiền chia cho]: Checkbox list of participants with "Chia Đều" / "Tự gõ số tiền", quick contact search & add,
 *    and live debt preview ("Nam nợ Tôi", "Tôi nợ Nam", or split summary).
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Receipt,
  Wallet as WalletIcon,
  UserCheck,
  AlertCircle,
  Search,
  UserPlus,
  Users,
  Check,
  ArrowRightLeft,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  Info,
  CheckSquare,
  Square,
} from 'lucide-react';
import { api } from '../services/api';
import { Group, SplitType, SplitDetail, Wallet, Category, User, BillItem } from '../types';
import { formatVND, parseVNDInput } from '../lib/formatters';

interface Participant {
  id: string;
  name: string;
  isMe?: boolean;
  isGuest?: boolean;
  userId?: string | number;
}

interface AddBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  wallets?: Wallet[];
  categories?: Category[];
  user?: User | null;
  selectedGroupId?: string;
  onSuccess: () => void;
}

export const AddBillModal: React.FC<AddBillModalProps> = ({
  isOpen,
  onClose,
  groups,
  wallets,
  categories,
  user,
  selectedGroupId,
  onSuccess,
}) => {
  // Mục 1: Nhóm hoặc Cá nhân ('none' cho Chia lẻ cá nhân)
  const [groupId, setGroupId] = useState<string>(selectedGroupId || (groups[0]?.id ? groups[0].id : 'none'));

  // Mục 2: Nội dung chi phí
  const [title, setTitle] = useState('');

  // Mục 3: Số tiền
  const [totalAmountInput, setTotalAmountInput] = useState('');

  // Mục 4: Người thanh toán ('ME' = Tôi đã trả tiền, 'OTHER' = Người khác trả)
  const [payerType, setPayerType] = useState<'ME' | 'OTHER'>('ME');
  const [walletId, setWalletId] = useState<string>('');
  const [otherPayerId, setOtherPayerId] = useState<string>('');

  // Mục 5: Danh sách thành viên tham gia & chọn người chịu tiền
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});

  // Danh mục chi tiêu
  const [categoryId, setCategoryId] = useState<string>('');

  // Auto-complete tìm kiếm & thêm nhanh (User thật vs Khách)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Trạng thái xử lý & Thông báo
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cache dữ liệu nội bộ
  const [localWallets, setLocalWallets] = useState<Wallet[]>(wallets || []);
  const [localCategories, setLocalCategories] = useState<Category[]>(categories || []);
  const [localUser, setLocalUser] = useState<User | null>(user || null);

  const currentUserName = localUser?.fullName || localUser?.name || 'Trần Minh Nam';
  const myParticipant: Participant = useMemo(
    () => ({
      id: 'usr_001',
      name: `${currentUserName} (Tôi)`,
      isMe: true,
      isGuest: false,
      userId: localUser?.id || 'usr_001',
    }),
    [currentUserName, localUser]
  );

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tải ví & danh mục
  useEffect(() => {
    if (wallets && wallets.length > 0) {
      setLocalWallets(wallets);
      if (!walletId) setWalletId(wallets[0].id);
    } else {
      api.wallets.getAll().then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setLocalWallets(data);
          if (!walletId) setWalletId(data[0].id);
        }
      });
    }
  }, [wallets, isOpen]);

  useEffect(() => {
    if (categories && categories.length > 0) {
      setLocalCategories(categories);
      if (!categoryId) {
        const defaultCat =
          categories.find((c) => c.type === 'EXPENSE' && (c.name.includes('Ăn') || c.name.includes('Nhóm'))) ||
          categories[0];
        if (defaultCat) setCategoryId(defaultCat.id);
      }
    } else {
      api.categories.getAll().then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setLocalCategories(data);
          if (!categoryId) {
            const defaultCat =
              data.find((c) => c.type === 'EXPENSE' && (c.name.includes('Ăn') || c.name.includes('Nhóm'))) || data[0];
            if (defaultCat) setCategoryId(defaultCat.id);
          }
        }
      });
    }
  }, [categories, isOpen]);

  useEffect(() => {
    if (user) {
      setLocalUser(user);
    } else {
      api.auth.getMe().then((u) => {
        if (u) setLocalUser(u);
      });
    }
  }, [user, isOpen]);

  // Cập nhật selectedGroupId từ props
  useEffect(() => {
    if (selectedGroupId && selectedGroupId !== 'none') {
      setGroupId(selectedGroupId);
    }
  }, [selectedGroupId]);

  // Khởi tạo danh sách người tham gia khi đổi Nhóm hoặc mở Modal
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccessToast(null);
      setSearchQuery('');
      setShowSearchDropdown(false);
      return;
    }

    if (groupId && groupId !== 'none') {
      const g = groups.find((grp) => grp.id === groupId);
      if (g && g.members && g.members.length > 0) {
        const mapped: Participant[] = g.members.map((m) => {
          const isMe =
            m.id === 'usr_001' ||
            m.name.includes('(Tôi)') ||
            (localUser?.id && String(m.userId) === String(localUser.id));
          return {
            id: m.id,
            name: isMe ? `${currentUserName} (Tôi)` : m.name,
            isMe: !!isMe,
            isGuest: !!m.isGuest,
            userId: m.userId,
          };
        });
        if (!mapped.some((p) => p.isMe)) {
          mapped.unshift(myParticipant);
        }
        setParticipants(mapped);
        setSelectedMemberIds(new Set(mapped.map((p) => p.id)));
      } else {
        setParticipants([myParticipant]);
        setSelectedMemberIds(new Set([myParticipant.id]));
      }
    } else {
      // Chia lẻ cá nhân: khởi tạo với Tôi
      const initial = [myParticipant];
      setParticipants(initial);
      setSelectedMemberIds(new Set(initial.map((p) => p.id)));
    }
  }, [groupId, groups, isOpen, myParticipant, currentUserName]);

  // Tìm kiếm User thật qua api.auth.searchUsers khi người dùng gõ từ khóa (Debounce 300ms, độ dài tối thiểu >= 2 ký tự)
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

  const totalAmount = parseVNDInput(totalAmountInput);

  // Thêm thành viên là User thật từ kết quả tìm kiếm
  const handleAddRealUser = (userItem: User) => {
    const newParticipant: Participant = {
      id: String(userItem.id || 'usr_' + Date.now()),
      name: userItem.fullName || userItem.name || userItem.username || 'Thành viên',
      isMe: false,
      isGuest: false,
      userId: userItem.id,
    };
    setParticipants((prev) => [...prev, newParticipant]);
    setSelectedMemberIds((prev) => new Set([...prev, newParticipant.id]));
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  // Thêm nhanh thành viên Khách (Guest) mới
  const handleAddGuest = (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const guestParticipant: Participant = {
      id: 'guest_' + Date.now(),
      name: cleanName,
      isMe: false,
      isGuest: true,
    };
    setParticipants((prev) => [...prev, guestParticipant]);
    setSelectedMemberIds((prev) => new Set([...prev, guestParticipant.id]));
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  // Xóa thành viên khỏi kèo
  const handleRemoveParticipant = (id: string) => {
    if (participants.length <= 1) return;
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (otherPayerId === id) {
      setOtherPayerId('');
    }
  };

  // Bật/tắt người chịu tiền trong kèo
  const toggleMemberSelection = (id: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) {
          next.delete(id);
        }
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Xác định người thanh toán
  const otherParticipants = participants.filter((p) => !p.isMe);
  const effectiveOtherPayerId = otherPayerId || otherParticipants[0]?.id || '';
  const effectiveOtherPayer = otherParticipants.find((p) => p.id === effectiveOtherPayerId) || otherParticipants[0];

  const actualPayerId = payerType === 'ME' ? myParticipant.id : effectiveOtherPayer?.id || 'guest_friend';
  const actualPayerName = payerType === 'ME' ? myParticipant.name : effectiveOtherPayer?.name || 'Bạn bè';

  // Tính toán số tiền phân chia cho các thành viên được chọn
  const selectedList = participants.filter((p) => selectedMemberIds.has(p.id));
  const selectedCount = selectedList.length;

  const splitsBreakdown: SplitDetail[] = useMemo(() => {
    if (selectedCount === 0 || totalAmount <= 0) {
      return participants.map((p) => ({
        memberId: p.id,
        memberName: p.name,
        amount: 0,
      }));
    }

    if (splitType === 'EQUAL') {
      const perPerson = Math.round(totalAmount / selectedCount);
      return participants.map((p) => ({
        memberId: p.id,
        memberName: p.name,
        amount: selectedMemberIds.has(p.id) ? perPerson : 0,
      }));
    } else {
      return participants.map((p) => ({
        memberId: p.id,
        memberName: p.name,
        amount: selectedMemberIds.has(p.id) ? customAmounts[p.id] || 0 : 0,
      }));
    }
  }, [participants, selectedMemberIds, totalAmount, selectedCount, splitType, customAmounts]);

  // Tóm tắt công nợ thông minh chuẩn Splitwise
  const smartSummary = useMemo(() => {
    if (totalAmount <= 0 || selectedCount === 0) return null;

    const meId = myParticipant.id;
    const isMePayer = payerType === 'ME';

    // Trường hợp 1: Tôi trả tiền
    if (isMePayer) {
      const debtors = splitsBreakdown.filter((s) => s.memberId !== meId && s.amount > 0);
      if (debtors.length === 0) {
        return {
          type: 'self_only',
          text: 'Bạn tự trả tiền cho chính mình (không phát sinh nợ nhóm).',
        };
      }
      if (debtors.length === 1 && !selectedMemberIds.has(meId)) {
        // Trả hộ 100% cho 1 người
        return {
          type: 'single_debtor',
          text: `👉 ${debtors[0].memberName} nợ bạn ${formatVND(debtors[0].amount)}`,
          highlight: `${debtors[0].memberName} nợ bạn ${formatVND(debtors[0].amount)}`,
        };
      }
      if (debtors.length === 1) {
        return {
          type: 'single_debtor',
          text: `👉 Bạn đã trả ${formatVND(totalAmount)}. ${debtors[0].memberName} nợ bạn ${formatVND(debtors[0].amount)}`,
        };
      }
      // Nhiều người nợ
      const namesAndAmounts = debtors.map((d) => `${d.memberName} (${formatVND(d.amount)})`).join(', ');
      return {
        type: 'multiple_debtors',
        text: `👉 Bạn đã trả ${formatVND(totalAmount)}. Ghi nhận nợ: ${namesAndAmounts}`,
      };
    }

    // Trường hợp 2: Người khác trả tiền
    const payerName = actualPayerName;
    const myShare = splitsBreakdown.find((s) => s.memberId === meId)?.amount || 0;

    if (myShare > 0) {
      if (selectedCount === 1 && selectedMemberIds.has(meId)) {
        // Người khác trả hộ 100% cho tôi
        return {
          type: 'i_owe_single',
          text: `👉 Bạn nợ ${payerName} ${formatVND(myShare)}`,
          highlight: `Bạn nợ ${payerName} ${formatVND(myShare)}`,
        };
      }
      return {
        type: 'i_owe',
        text: `👉 ${payerName} đã trả ${formatVND(totalAmount)}. Phần của bạn: Bạn nợ ${payerName} ${formatVND(myShare)}`,
      };
    } else {
      return {
        type: 'others_only',
        text: `👉 ${payerName} đã trả tiền. Bạn không tham gia chịu tiền kèo này.`,
      };
    }
  }, [totalAmount, selectedCount, myParticipant.id, payerType, splitsBreakdown, selectedMemberIds, actualPayerName]);

  // Xử lý gửi Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Vui lòng nhập nội dung chi phí');
      return;
    }
    if (!totalAmount || totalAmount <= 0) {
      setError('Số tiền chi phí phải lớn hơn 0');
      return;
    }
    if (payerType === 'ME' && !walletId) {
      setError('Vui lòng chọn ví dùng để thanh toán');
      return;
    }
    if (payerType === 'OTHER' && !effectiveOtherPayer) {
      setError('Vui lòng chọn người đã đứng ra thanh toán');
      return;
    }
    if (selectedCount === 0) {
      setError('Vui lòng tích chọn ít nhất 1 người chịu chi phí');
      return;
    }

    // Kiểm tra tổng tiền nếu tự gõ
    const activeSplits = splitsBreakdown.filter((s) => s.amount > 0);
    const sumActiveSplits = activeSplits.reduce((sum, s) => sum + s.amount, 0);

    if (splitType === 'EXACT' && Math.abs(sumActiveSplits - totalAmount) > 1000) {
      setError(`Tổng tiền chia (${formatVND(sumActiveSplits)}) chưa khớp với tổng chi phí (${formatVND(totalAmount)})`);
      return;
    }

    // Payload items chuẩn
    const itemsPayload: BillItem[] = participants.map((p) => {
      const isPayer = p.id === actualPayerId;
      const splitObj = splitsBreakdown.find((s) => s.memberId === p.id);
      const amountShare = splitObj ? splitObj.amount : 0;

      return {
        userId: p.userId ? String(p.userId) : p.id,
        amountShare,
        isPaid: isPayer,
      };
    });

    setIsSubmitting(true);

    try {
      const isGroupSelected = groupId && groupId !== 'none';
      const selectedGroup = isGroupSelected ? groups.find((g) => g.id === groupId) : null;

      await api.bills.create({
        groupId: isGroupSelected ? groupId : null,
        walletId: payerType === 'ME' ? walletId : undefined,
        categoryId: categoryId || 'cat_001',
        totalAmount,
        description: title.trim(),
        items: itemsPayload,
        title: title.trim(),
        groupName: isGroupSelected ? selectedGroup?.name || 'Nhóm' : 'Chia lẻ cá nhân',
        payerMemberId: actualPayerId,
        payerMemberName: actualPayerName,
        splitType,
        splits: activeSplits,
        date: new Date().toISOString(),
      });

      setSuccessToast(
        payerType === 'ME'
          ? `Đã lưu chi phí "${title}" thành công!`
          : `Đã lưu chi phí! Tự động cập nhật vào Sổ Nợ: bạn nợ ${actualPayerName}.`
      );

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu chi phí và chia tiền');
      setIsSubmitting(false);
    }
  };

  const isStandalone = !groupId || groupId === 'none';

  if (!isOpen) return null;

  return (
    <div
      id="add-bill-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#2D2926]/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="add-bill-modal-container"
        className="relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden border border-[#EAE7DC] max-h-[94vh] flex flex-col"
      >
        {/* Header */}
        <div
          id="add-bill-modal-header"
          className="flex items-center justify-between px-5 py-4 border-b border-[#EAE7DC] bg-[#FAF9F5] shrink-0"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#7D8F69]/15 text-[#7D8F69] flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#2D2926]">
                Thêm Chi Phí & Chia Tiền
              </h2>
              <p className="text-[11px] text-[#8C857D]">
                {isStandalone ? 'Chia lẻ cá nhân 1-1 hoặc bạn bè' : 'Chia tiền theo nhóm & tự động đối soát nợ'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-add-bill-modal"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8C857D] hover:text-[#2D2926] hover:bg-[#EAE7DC] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* MỤC 1: Nhóm hoặc Cá nhân */}
          <div id="section-bill-group">
            <label className="text-xs font-bold text-[#4A443F] block mb-1">
              1. Nhóm hoặc Cá nhân:
            </label>
            <div className="relative">
              <select
                id="select-bill-group"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full p-2.5 pl-3 pr-8 text-xs font-bold rounded-2xl border border-[#EAE7DC] bg-[#FAF9F5] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none appearance-none"
              >
                <option value="none">👤 Chia lẻ cá nhân (Không có nhóm)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    👥 Nhóm: {g.name} ({g.members?.length || 0} thành viên)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#8C857D] absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* MỤC 2 & 3: Nội dung chi phí & Số tiền */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* MỤC 2: Nội dung */}
            <div id="section-bill-title" className="sm:col-span-7">
              <label className="text-xs font-bold text-[#4A443F] block mb-1">
                2. Nội dung chi phí: <span className="text-[#D98B72]">*</span>
              </label>
              <input
                id="input-bill-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ăn lẩu Haidilao, Cafe, Mua đồ hộ..."
                className="w-full p-2.5 text-xs font-semibold rounded-2xl border border-[#EAE7DC] bg-[#FAF9F5] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
              />
            </div>

            {/* MỤC 3: Số tiền */}
            <div id="section-bill-amount" className="sm:col-span-5">
              <label className="text-xs font-bold text-[#4A443F] block mb-1">
                3. Số tiền: <span className="text-[#D98B72]">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-bill-amount"
                  type="text"
                  value={totalAmountInput}
                  onChange={(e) => setTotalAmountInput(e.target.value)}
                  placeholder="500k, 1.2tr..."
                  className="w-full p-2.5 pr-2 text-xs font-black rounded-2xl border border-[#EAE7DC] bg-[#FAF9F5] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
                />
              </div>
              {totalAmount > 0 && (
                <div className="text-[11px] font-extrabold text-[#7D8F69] mt-1 text-right">
                  = {formatVND(totalAmount)}
                </div>
              )}
            </div>
          </div>

          {/* MỤC 4: Người thanh toán */}
          <div id="section-bill-payer" className="space-y-2">
            <label className="text-xs font-bold text-[#4A443F] block">
              4. Người thanh toán:
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#FAF9F5] rounded-2xl border border-[#EAE7DC]">
              <button
                id="btn-payer-me"
                type="button"
                onClick={() => setPayerType('ME')}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                  payerType === 'ME'
                    ? 'bg-[#7D8F69] text-white shadow-xs'
                    : 'text-[#8C857D] hover:text-[#2D2926]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Tôi đã trả tiền</span>
              </button>

              <button
                id="btn-payer-other"
                type="button"
                onClick={() => setPayerType('OTHER')}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                  payerType === 'OTHER'
                    ? 'bg-[#D98B72] text-white shadow-xs'
                    : 'text-[#8C857D] hover:text-[#2D2926]'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Người khác trả</span>
              </button>
            </div>

            {/* Chi tiết người thanh toán */}
            {payerType === 'ME' ? (
              <div id="payer-me-wallet-select" className="pt-1">
                <label className="text-[11px] font-semibold text-[#8C857D] block mb-1">
                  Chọn ví của bạn để trừ tiền:
                </label>
                <div className="relative">
                  <select
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full p-2 pl-8 text-xs font-bold rounded-xl border border-[#EAE7DC] bg-[#FAF9F5] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
                  >
                    {localWallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} (Số dư: {formatVND(w.balance)})
                      </option>
                    ))}
                  </select>
                  <WalletIcon className="w-3.5 h-3.5 text-[#8C857D] absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>
            ) : (
              <div id="payer-other-friend-select" className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/80 space-y-1.5">
                <label className="text-[11px] font-bold text-amber-900 block">
                  Chọn người đã đứng ra thanh toán:
                </label>
                {otherParticipants.length > 0 ? (
                  <select
                    value={effectiveOtherPayerId}
                    onChange={(e) => setOtherPayerId(e.target.value)}
                    className="w-full p-2 text-xs font-bold rounded-xl border border-amber-300 bg-white text-[#2D2926] focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {otherParticipants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.isGuest ? '(Khách)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[11px] text-amber-800">
                    Vui lòng thêm bạn bè vào danh sách bên dưới để chọn người trả tiền hộ.
                  </p>
                )}
                <p className="text-[10.5px] text-amber-800/80">
                  ℹ️ Ví cá nhân của bạn sẽ không bị trừ tiền. Hệ thống sẽ ghi nhận bạn nợ người này trong Sổ Nợ.
                </p>
              </div>
            )}
          </div>

          {/* MỤC 5: Phần tiền chia cho (Ai là người chịu tiền) */}
          <div id="section-bill-split" className="pt-2 border-t border-[#EAE7DC] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#4A443F] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#7D8F69]" />
                <span>5. Phần tiền chia cho ({selectedCount}/{participants.length} người):</span>
              </label>
            </div>

            {/* Chế độ chia: Chia đều / Tự gõ */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSplitType('EQUAL')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition ${
                  splitType === 'EQUAL'
                    ? 'bg-[#7D8F69] text-white border-[#7D8F69] shadow-2xs'
                    : 'bg-[#FAF9F5] border-[#EAE7DC] text-[#8C857D] hover:text-[#2D2926]'
                }`}
              >
                Chia Đều ({selectedCount > 0 ? formatVND(Math.round(totalAmount / selectedCount)) : '0 ₫'}/người)
              </button>
              <button
                type="button"
                onClick={() => setSplitType('EXACT')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition ${
                  splitType === 'EXACT'
                    ? 'bg-[#7D8F69] text-white border-[#7D8F69] shadow-2xs'
                    : 'bg-[#FAF9F5] border-[#EAE7DC] text-[#8C857D] hover:text-[#2D2926]'
                }`}
              >
                Tự gõ
              </button>
            </div>

            {/* Danh sách người đã được chọn vào kèo */}
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {participants.map((p) => {
                const isSelected = selectedMemberIds.has(p.id);
                const splitItem = splitsBreakdown.find((s) => s.memberId === p.id);
                const calculatedAmount = splitItem ? splitItem.amount : 0;
                const isPayer = p.id === actualPayerId;

                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border transition ${
                      isSelected
                        ? 'bg-[#FAF9F5] border-[#7D8F69]/40'
                        : 'bg-gray-50/60 border-[#EAE7DC] opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <label className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1 select-none">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMemberSelection(p.id)}
                          className="hidden"
                        />
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#7D8F69] shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-[#8C857D] shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-[#2D2926] truncate">{p.name}</span>
                            {isPayer && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-[#7D8F69]/15 text-[#7D8F69]">
                                Người trả
                              </span>
                            )}
                            {p.isGuest && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-[#D98B72]/15 text-[#D98B72]">
                                Khách
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSelected && (
                        <div>
                          {splitType === 'EQUAL' ? (
                            <span className="text-xs font-black text-[#D98B72]">
                              {formatVND(calculatedAmount)}
                            </span>
                          ) : (
                            <input
                              type="number"
                              value={customAmounts[p.id] || 0}
                              onChange={(e) =>
                                setCustomAmounts({
                                  ...customAmounts,
                                  [p.id]: Number(e.target.value),
                                })
                              }
                              placeholder="Số tiền..."
                              className="w-24 p-1 text-right text-xs font-bold rounded-lg border border-[#EAE7DC] bg-white text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
                            />
                          )}
                        </div>
                      )}

                      {!p.isMe && participants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(p.id)}
                          className="p-1 text-[#8C857D] hover:text-[#D98B72] hover:bg-rose-50 rounded-lg transition"
                          title="Xóa khỏi kèo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ô tìm kiếm thông minh */}
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

              {/* Dropdown kết quả tìm kiếm */}
              {showSearchDropdown && searchQuery.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-[#EAE7DC] shadow-xl z-40 overflow-hidden divide-y divide-[#FAF9F5] animate-in fade-in zoom-in-95 duration-150 max-h-60 overflow-y-auto">
                  {isSearchingUsers && searchResults.length === 0 && (
                    <div className="p-3 text-center text-xs text-[#8C857D] font-semibold">
                      Đang tìm kiếm thành viên...
                    </div>
                  )}

                  {/* Danh sách User thật tìm được */}
                  {searchResults
                    .filter(
                      (u) =>
                        !participants.some(
                          (p) =>
                            (p.userId && String(p.userId) === String(u.id)) ||
                            p.id === u.id ||
                            p.name.toLowerCase().trim() === (u.fullName || u.name || '').toLowerCase().trim()
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
                                <p className="text-[10px] text-[#8C857D] truncate font-normal">{detailLine}</p>
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

                  {/* Dòng dưới cùng luôn hiển thị nút thêm khách mới */}
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

            {/* Smart Debt Preview Banner */}
            {smartSummary && (
              <div className="p-3 rounded-2xl bg-[#7D8F69]/10 border border-[#7D8F69]/30 text-xs font-bold text-[#2D2926] flex items-start gap-2 animate-in fade-in">
                <Sparkles className="w-4 h-4 text-[#7D8F69] shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="text-[10px] uppercase tracking-wider text-[#7D8F69] block font-black mb-0.5">
                    Tóm tắt công nợ tự động
                  </span>
                  <span>{smartSummary.text}</span>
                </div>
              </div>
            )}
          </div>

          {/* Danh mục chi tiêu (Gọn gàng) */}
          {localCategories.length > 0 && (
            <div id="section-bill-category" className="pt-1">
              <label className="text-[11px] font-bold text-[#8C857D] block mb-1">
                Danh mục chi tiêu:
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-2 text-xs font-semibold rounded-xl border border-[#EAE7DC] bg-[#FAF9F5] text-[#2D2926] focus:ring-2 focus:ring-[#7D8F69] focus:outline-none"
              >
                {localCategories
                  .filter((c) => c.type === 'EXPENSE')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Thông báo lỗi */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Thông báo thành công */}
          {successToast && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Footer nút hành động */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              id="btn-cancel-add-bill"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-[#8C857D] hover:bg-[#FAF9F5] rounded-xl transition"
            >
              Hủy
            </button>
            <button
              id="btn-submit-add-bill"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-black text-white bg-[#7D8F69] hover:bg-[#687856] rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Đang lưu...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Lưu Chi Phí & Ghi Nợ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
