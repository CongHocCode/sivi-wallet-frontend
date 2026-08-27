/**
 * SIVI WALLET - Natural Tones Design Theme Main Application
 */

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Wallet as WalletIcon,
  Users,
  Receipt,
  ReceiptText,
  Sparkles,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Camera,
  Mic,
  Settings as SettingsIcon,
  CheckCircle2,
  Trash2,
  Send,
  Building2,
  Smartphone,
  Banknote,
  AlertTriangle,
  RefreshCw,
  Server,
  Database,
  Search,
  ChevronRight,
  UserCheck,
  UtensilsCrossed,
  Car,
  ShoppingBag,
  HeartPulse,
  TrendingUp,
  Tag,
  PieChart as PieChartIcon,
  Scale,
  ScanLine,
  AudioLines,
} from 'lucide-react';

import { apiService } from './services/api';
import { MobileQuickAddMenu } from './components/MobileQuickAddMenu';
import { AnalyticsView } from './components/AnalyticsView';
import { AICoachView } from './components/AICoachView';
import { HealthWarningCard } from './components/HealthWarningCard';
import {
  User,
  Wallet,
  Category,
  Transaction,
  Group,
  GroupBill,
  DebtSummary,
  TransactionType,
} from './types';
import { formatVND, formatVNDShort } from './lib/formatters';

// Modals & Views
import { AddTransactionModal } from './components/AddTransactionModal';
import { AddWalletModal } from './components/AddWalletModal';
import { WalletsView } from './components/WalletsView';
import { AddGroupModal } from './components/AddGroupModal';
import { AddBillModal } from './components/AddBillModal';
import { SettlementModal } from './components/SettlementModal';
import { ReceiptOCRModal } from './components/ReceiptOCRModal';
import { NLPTransactionModal } from './components/NLPTransactionModal';
import { FinancialCoachWidget } from './components/FinancialCoachWidget';
import { SettingsModal } from './components/SettingsModal';
import { QuickRecordWidget } from './components/QuickRecordWidget';
import { GroupDebtDetailModal } from './components/GroupDebtDetailModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { TransactionHistoryView } from './components/TransactionHistoryView';
import { TransactionDetailModal } from './components/TransactionDetailModal';

import { geminiService } from './services/geminiService';

type ActiveTab = 'overview' | 'transactions' | 'wallets' | 'groups' | 'debts' | 'analytics' | 'coach';

const renderCategoryIcon = (tx: Transaction) => {
  const icon = tx.categoryIcon || '';
  const name = (tx.categoryName || '').toLowerCase();
  const type = tx.type;

  let IconComp = Tag;
  let bg = 'bg-amber-100 text-amber-800';

  if (type === 'TRANSFER') {
    IconComp = ArrowRightLeft;
    bg = 'bg-blue-100 text-blue-800';
  } else if (type === 'SETTLEMENT') {
    IconComp = CheckCircle2;
    bg = 'bg-emerald-100 text-emerald-800';
  } else if (
    icon === 'UtensilsCrossed' ||
    icon === 'Utensils' ||
    name.includes('ăn') ||
    name.includes('uống') ||
    name.includes('cơm') ||
    name.includes('phở') ||
    name.includes('bún') ||
    name.includes('nhà hàng')
  ) {
    IconComp = UtensilsCrossed;
    bg = 'bg-amber-100 text-amber-800';
  } else if (
    icon === 'Car' ||
    name.includes('đi lại') ||
    name.includes('xe') ||
    name.includes('xăng') ||
    name.includes('grab') ||
    name.includes('vé')
  ) {
    IconComp = Car;
    bg = 'bg-blue-100 text-blue-800';
  } else if (
    icon === 'ShoppingBag' ||
    name.includes('mua sắm') ||
    name.includes('chợ') ||
    name.includes('siêu thị') ||
    name.includes('quần áo')
  ) {
    IconComp = ShoppingBag;
    bg = 'bg-pink-100 text-pink-800';
  } else if (
    icon === 'Receipt' ||
    name.includes('hóa đơn') ||
    name.includes('điện') ||
    name.includes('nước') ||
    name.includes('mạng') ||
    name.includes('tiện ích')
  ) {
    IconComp = Receipt;
    bg = 'bg-purple-100 text-purple-800';
  } else if (
    icon === 'Sparkles' ||
    name.includes('giải trí') ||
    name.includes('du lịch') ||
    name.includes('phim') ||
    name.includes('chơi')
  ) {
    IconComp = Sparkles;
    bg = 'bg-emerald-100 text-emerald-800';
  } else if (
    icon === 'HeartPulse' ||
    name.includes('sức khỏe') ||
    name.includes('thuốc') ||
    name.includes('y tế') ||
    name.includes('bệnh viện')
  ) {
    IconComp = HeartPulse;
    bg = 'bg-rose-100 text-rose-800';
  } else if (
    type === 'INCOME' ||
    icon === 'Wallet' ||
    name.includes('lương') ||
    name.includes('thu nhập')
  ) {
    IconComp = WalletIcon;
    bg = 'bg-emerald-100 text-emerald-800';
  } else if (
    icon === 'TrendingUp' ||
    name.includes('thưởng') ||
    name.includes('đầu tư') ||
    name.includes('lãi')
  ) {
    IconComp = TrendingUp;
    bg = 'bg-cyan-100 text-cyan-800';
  }

  return (
    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${bg} flex items-center justify-center shrink-0 shadow-2xs`}>
      <IconComp className="w-4 h-4 sm:w-5 sm:h-5" />
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Core App State
  const [user, setUser] = useState<User | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [bills, setBills] = useState<GroupBill[]>([]);
  const [debts, setDebts] = useState<DebtSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Quick NLP Prompt State in Top Search Bar
  const [quickNlpPrompt, setQuickNlpPrompt] = useState('');
  const [isNlpLoading, setIsNlpLoading] = useState(false);

  // Filter & Search State
  const [txFilter, setTxFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Control States
  const [isQuickAddMenuOpen, setIsQuickAddMenuOpen] = useState(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [addTxInitialTab, setAddTxInitialTab] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [addTxPreselectedWalletId, setAddTxPreselectedWalletId] = useState<string | undefined>(undefined);
  const [isAddWalletOpen, setIsAddWalletOpen] = useState(false);
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [selectedGroupIdForBill, setSelectedGroupIdForBill] = useState<string | undefined>(undefined);
  const [selectedDebtForSettle, setSelectedDebtForSettle] = useState<DebtSummary | null>(null);
  const [selectedGroupForDetail, setSelectedGroupForDetail] = useState<Group | null>(null);
  const [isGroupDetailOpen, setIsGroupDetailOpen] = useState(false);
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [isNlpOpen, setIsNlpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);

  // Quick Open Transaction & Transfer Handlers
  const handleOpenAddTx = (walletId?: string, tab: 'expense' | 'income' | 'transfer' = 'expense') => {
    setAddTxInitialTab(tab);
    setAddTxPreselectedWalletId(walletId);
    setIsAddTxOpen(true);
  };

  const handleOpenTransfer = (preselectedWalletId?: string) => {
    setAddTxInitialTab('transfer');
    setAddTxPreselectedWalletId(preselectedWalletId);
    setIsAddTxOpen(true);
  };

  // Load All Data from API / LocalStorage
  const loadAppData = async () => {
    setIsLoading(true);
    try {
      const [uData, wData, cData, tData, gData, bData, dData] = await Promise.all([
        apiService.getCurrentUser(),
        apiService.getWallets(),
        apiService.getCategories(),
        apiService.getTransactions(),
        apiService.getGroups(),
        apiService.getGroupBills(),
        apiService.getDebtLedger(),
      ]);

      setUser(uData);
      setWallets(wData);
      setCategories(cData);
      setTransactions(tData);
      setGroups(gData);
      setBills(bData);
      setDebts(dData);
    } catch (err) {
      console.error('Error loading Sivi Wallet data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppData();
  }, []);

  // Calculated Metrics
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  const monthlyIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpense = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  const todayExpense = transactions
    .filter(
      (t) =>
        t.type === 'EXPENSE' &&
        new Date(t.date).toDateString() === new Date().toDateString()
    )
    .reduce((sum, t) => sum + t.amount, 0);

  // Handlers
  const handleDeleteTransaction = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
      await apiService.deleteTransaction(id);
      loadAppData();
    }
  };

  const handleQuickNlpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNlpPrompt.trim()) return;

    setIsNlpLoading(true);
    try {
      const parsed = await apiService.parseNaturalLanguageTransaction(quickNlpPrompt);
      const matchedWallet = wallets.find((w) =>
        w.name.toLowerCase().includes((parsed.walletName || '').toLowerCase())
      ) || wallets[0];

      const matchedCat = categories.find((c) =>
        c.name.toLowerCase().includes((parsed.category || '').toLowerCase())
      ) || categories[0];

      if (matchedWallet) {
        await apiService.addTransaction({
          walletId: matchedWallet.id,
          walletName: matchedWallet.name,
          categoryId: matchedCat?.id,
          categoryName: matchedCat?.name || 'Chi tiêu',
          categoryIcon: matchedCat?.icon || 'Tag',
          amount: parsed.amount,
          type: parsed.type || 'EXPENSE',
          note: parsed.note,
          date: parsed.date || new Date().toISOString(),
        });
        setQuickNlpPrompt('');
        loadAppData();
      }
    } catch (err) {
      // Open modal if parse needs review
      setIsNlpOpen(true);
    } finally {
      setIsNlpLoading(false);
    }
  };

  // Filtered Transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesFilter = txFilter === 'ALL' || t.type === txFilter;
    const matchesSearch =
      !searchTerm ||
      t.note.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.categoryName && t.categoryName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.walletName && t.walletName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#F9F8F3] font-sans text-[#2D2926] overflow-hidden relative">
      <PWAInstallPrompt />

      {/* MOBILE TOP BAR (visible on screens < md) */}
      <header className="md:hidden flex items-center justify-between px-4 py-2.5 bg-white border-b border-[#EAE7DC] shrink-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#7D8F69] rounded-xl flex items-center justify-center text-white shadow-xs">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-black tracking-tight text-[#4A443F] block leading-none">
              SIVI WALLET
            </span>
            <span className="text-[9px] text-[#7D8F69] font-bold tracking-wider uppercase">
              Quản lý chi tiêu
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('wallets')}
            className={`p-2 rounded-xl border transition ${
              activeTab === 'wallets'
                ? 'bg-[#7D8F69] text-white border-[#7D8F69]'
                : 'bg-[#F9F8F3] text-[#8C857D] hover:text-[#2D2926] border-[#EAE7DC]'
            }`}
            title="Ví của tôi"
          >
            <WalletIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`p-2 rounded-xl border transition ${
              activeTab === 'groups'
                ? 'bg-[#7D8F69] text-white border-[#7D8F69]'
                : 'bg-[#F9F8F3] text-[#8C857D] hover:text-[#2D2926] border-[#EAE7DC]'
            }`}
            title="Nhóm chi tiêu"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-8 h-8 rounded-full bg-[#D98B72] border-2 border-white shadow-xs flex items-center justify-center text-white font-black text-xs hover:opacity-90 transition shrink-0 ml-1"
            title="Cài đặt & Tài khoản"
          >
            {(user?.name || 'T').charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      {/* LEFT NAVIGATION SIDEBAR (Desktop) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-[#EAE7DC] flex-col p-6 shrink-0">
        {/* Brand Logo Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-[#7D8F69] rounded-xl flex items-center justify-center text-white shadow-sm">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </svg>
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-[#4A443F] block leading-none">
              SIVI WALLET
            </span>
            <span className="text-[10px] text-[#8C857D] font-medium tracking-wider uppercase">
              Chân thực • Tự nhiên
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-[#F1EFE7] text-[#7D8F69]'
                : 'text-[#8C857D] hover:bg-[#F9F8F3] hover:text-[#2D2926]'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" /> Tổng quan
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'transactions' || activeTab === 'debts'
                ? 'bg-[#F1EFE7] text-[#7D8F69]'
                : 'text-[#8C857D] hover:bg-[#F9F8F3] hover:text-[#2D2926]'
            }`}
          >
            <div className="flex items-center gap-3">
              <ReceiptText className="w-5 h-5 text-[#7D8F69]" />
              <span>Sổ Thu Chi & Nợ</span>
            </div>
            {debts.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#D98B72]" title={`${debts.length} khoản nợ cần theo dõi`} />
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'analytics'
                ? 'bg-[#F1EFE7] text-[#7D8F69]'
                : 'text-[#8C857D] hover:bg-[#F9F8F3] hover:text-[#2D2926]'
            }`}
          >
            <PieChartIcon className="w-5 h-5" /> Báo cáo & Thống kê
          </button>

          <button
            onClick={() => setActiveTab('coach')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'coach'
                ? 'bg-[#F1EFE7] text-[#7D8F69]'
                : 'text-[#8C857D] hover:bg-[#F9F8F3] hover:text-[#2D2926]'
            }`}
          >
            <Sparkles className="w-5 h-5 text-amber-500" /> Cố vấn Sivi AI 🔥
          </button>

          <button
            onClick={() => setActiveTab('wallets')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'wallets'
                ? 'bg-[#F1EFE7] text-[#7D8F69]'
                : 'text-[#8C857D] hover:bg-[#F9F8F3] hover:text-[#2D2926]'
            }`}
          >
            <WalletIcon className="w-5 h-5" /> Ví của tôi ({wallets.length})
          </button>

          <button
            onClick={() => setActiveTab('groups')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'groups'
                ? 'bg-[#F1EFE7] text-[#7D8F69]'
                : 'text-[#8C857D] hover:bg-[#F9F8F3] hover:text-[#2D2926]'
            }`}
          >
            <Users className="w-5 h-5" /> Nhóm chi tiêu ({groups.length})
          </button>
        </nav>

        {/* User Account & Settings Footer */}
        <div className="mt-auto p-4 bg-[#F1EFE7] rounded-2xl border border-[#EAE7DC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#7D8F69]"></div>
            <span className="text-xs font-bold text-[#4A443F]">Tài khoản Sivi Wallet</span>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 text-[#8C857D] hover:text-[#2D2926] hover:bg-white rounded-lg transition"
            title="Cài đặt hệ thống"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* CENTER MAIN CONTENT AREA */}
      <main className="flex-1 p-4 pb-28 md:p-8 flex flex-col gap-6 overflow-y-auto">
        {/* OVERVIEW TAB CONTENT */}
        {activeTab === 'overview' && (
          <>
            {/* Overview Header: Dynamic Greeting & Quick Add Button */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-[#2D2926] tracking-tight truncate">
                  {(() => {
                    const hour = new Date().getHours();
                    if (hour < 12) return 'Chào buổi sáng';
                    if (hour < 18) return 'Chào buổi chiều';
                    return 'Chào buổi tối';
                  })()}, {user?.name ? user.name.split(' ').pop() || user.name : 'Nam'}!
                </h1>
                <p className="text-xs text-[#8C857D] font-medium mt-0.5">
                  Hôm nay bạn đã chi tiêu <span className="font-bold text-[#D98B72]">{formatVND(todayExpense)}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsQuickAddMenuOpen(true)}
                  className="px-3.5 py-2 bg-[#7D8F69] hover:bg-[#687856] active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Ghi giao dịch</span>
                </button>
              </div>
            </div>

            {/* Top Stat Cards Section */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Total Balance Hero Card */}
              <div className="lg:col-span-2 bg-[#7D8F69] rounded-2xl sm:rounded-[32px] p-5 sm:p-7 text-white relative overflow-hidden shadow-sm flex flex-col justify-between min-h-[200px]">
                <div className="relative z-10 space-y-3.5">
                  <div>
                    <p className="text-[10px] sm:text-xs opacity-80 uppercase tracking-widest font-bold">
                      Tổng số dư khả dụng
                    </p>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mt-1 tracking-tight">{formatVND(totalBalance)}</h2>
                  </div>

                  <div className="flex gap-2.5 sm:gap-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex-1 border border-white/10">
                      <p className="text-[10px] sm:text-[11px] opacity-80 uppercase font-semibold">Thu nhập tháng này</p>
                      <p className="font-extrabold text-sm sm:text-base text-emerald-100">+{formatVND(monthlyIncome)}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex-1 border border-white/10">
                      <p className="text-[10px] sm:text-[11px] opacity-80 uppercase font-semibold">Chi tiêu tháng này</p>
                      <p className="font-extrabold text-sm sm:text-base text-rose-100">-{formatVND(monthlyExpense)}</p>
                    </div>
                  </div>

                  {/* Asset Expense-to-Income Ratio */}
                  <div className="pt-2.5 border-t border-white/20 space-y-1">
                    <div className="flex justify-between items-center text-[11px] sm:text-xs font-bold">
                      <span className="opacity-90">Tỉ lệ tài sản Chi / Thu:</span>
                      <span className="text-amber-200">
                        {monthlyIncome > 0 ? ((monthlyExpense / monthlyIncome) * 100).toFixed(1) : '0'}%
                      </span>
                    </div>
                    <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          monthlyIncome > 0 && monthlyExpense / monthlyIncome > 1
                            ? 'bg-rose-300'
                            : monthlyIncome > 0 && monthlyExpense / monthlyIncome > 0.7
                            ? 'bg-amber-300'
                            : 'bg-emerald-200'
                        }`}
                        style={{
                          width: `${
                            monthlyIncome > 0
                              ? Math.min((monthlyExpense / monthlyIncome) * 100, 100)
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-[10px] opacity-80 font-medium">
                      {monthlyIncome > 0 && monthlyExpense / monthlyIncome <= 0.7
                        ? 'An toàn: Chi tiêu dưới 70% thu nhập.'
                        : monthlyIncome > 0 && monthlyExpense / monthlyIncome <= 1
                        ? 'Cảnh báo: Chi tiêu tiệm cận thu nhập.'
                        : 'Báo động: Chi tiêu đã vượt thu nhập!'}
                    </p>
                  </div>
                </div>

                {/* Decorative Background Circles */}
                <div className="absolute -right-10 -bottom-10 w-52 h-52 sm:w-64 sm:h-64 bg-white/5 rounded-full pointer-events-none"></div>
              </div>

              {/* Single Health Warning Card */}
              <HealthWarningCard
                monthlyIncome={monthlyIncome}
                monthlyExpense={monthlyExpense}
                transactions={transactions}
                onOpenCoachTab={() => setActiveTab('coach')}
              />
            </section>

            {/* Unified Quick Record Transaction Widget */}
            <QuickRecordWidget
              wallets={wallets}
              categories={categories}
              onSuccess={loadAppData}
              onOpenOcrFull={() => setIsOcrOpen(true)}
              onOpenNlpFull={() => setIsNlpOpen(true)}
            />

            {/* Recent Transactions List Section */}
            <section className="flex-1 bg-white border border-[#EAE7DC] rounded-2xl sm:rounded-[32px] p-4 sm:p-6 shadow-sm flex flex-col min-h-[280px]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center justify-between mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-[#4A443F] text-sm sm:text-base">Giao dịch gần đây</h3>
                    <span className="text-[11px] font-medium text-[#8C857D]">
                      ({filteredTransactions.length})
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className="text-xs font-bold text-[#7D8F69] hover:underline ml-3"
                  >
                    Xem tất cả ({transactions.length}) →
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#8C857D] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Tìm giao dịch..."
                      className="w-full sm:w-44 lg:w-52 pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#F9F8F3] border border-[#EAE7DC] focus:outline-none focus:ring-1 focus:ring-[#7D8F69]"
                    />
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-[#F9F8F3] rounded-xl border border-[#EAE7DC] overflow-x-auto no-scrollbar max-w-full">
                    <button
                      onClick={() => setTxFilter('ALL')}
                      className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg whitespace-nowrap transition ${
                        txFilter === 'ALL' ? 'bg-white text-[#2D2926] shadow-2xs' : 'text-[#8C857D]'
                      }`}
                    >
                      Tất cả
                    </button>
                    <button
                      onClick={() => setTxFilter('EXPENSE')}
                      className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg whitespace-nowrap transition ${
                        txFilter === 'EXPENSE' ? 'bg-white text-[#D98B72] shadow-2xs' : 'text-[#8C857D]'
                      }`}
                    >
                      Chi tiêu
                    </button>
                    <button
                      onClick={() => setTxFilter('INCOME')}
                      className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg whitespace-nowrap transition ${
                        txFilter === 'INCOME' ? 'bg-white text-[#7D8F69] shadow-2xs' : 'text-[#8C857D]'
                      }`}
                    >
                      Thu nhập
                    </button>
                    <button
                      onClick={() => setTxFilter('TRANSFER')}
                      className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg whitespace-nowrap transition ${
                        txFilter === 'TRANSFER' ? 'bg-white text-blue-600 shadow-2xs' : 'text-[#8C857D]'
                      }`}
                    >
                      Chuyển khoản
                    </button>
                    <button
                      onClick={() => setTxFilter('SETTLEMENT')}
                      className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg whitespace-nowrap transition ${
                        txFilter === 'SETTLEMENT' ? 'bg-white text-emerald-600 shadow-2xs' : 'text-[#8C857D]'
                      }`}
                    >
                      Tất toán
                    </button>
                  </div>
                </div>
              </div>

              {/* List */}
              <div className="space-y-2 overflow-y-auto pr-0.5 flex-1">
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-10 text-[#8C857D]">
                    <p className="text-xs font-medium">Chưa có giao dịch nào được ghi nhận.</p>
                  </div>
                ) : (
                  filteredTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => setSelectedTxForDetail(tx)}
                      className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-[#F9F8F3] rounded-2xl group transition-colors border-b border-[#F9F8F3] last:border-none gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {renderCategoryIcon(tx)}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-xs sm:text-sm text-[#2D2926] truncate max-w-[160px] sm:max-w-xs md:max-w-sm lg:max-w-md">
                              {tx.note}
                            </p>
                            {tx.categoryName && (
                              <span className="px-2 py-0.5 bg-[#F1EFE7] text-[#4A443F] font-bold text-[10px] sm:text-[11px] rounded-md border border-[#EAE7DC] whitespace-nowrap">
                                {tx.categoryName}
                              </span>
                            )}
                            {tx.groupName && (
                              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-semibold text-[10px] sm:text-[11px] rounded-md border border-purple-100 whitespace-nowrap">
                                {tx.groupName}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap text-[10px] sm:text-xs text-[#8C857D]">
                            {/* Type Tag */}
                            {tx.type === 'EXPENSE' && (
                              <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 font-extrabold text-[9px] sm:text-[10px] rounded border border-rose-200 uppercase tracking-wider whitespace-nowrap">
                                Chi tiêu
                              </span>
                            )}
                            {tx.type === 'INCOME' && (
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-[9px] sm:text-[10px] rounded border border-emerald-200 uppercase tracking-wider whitespace-nowrap">
                                Thu nhập
                              </span>
                            )}
                            {tx.type === 'TRANSFER' && (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 font-extrabold text-[9px] sm:text-[10px] rounded border border-blue-200 uppercase tracking-wider whitespace-nowrap">
                                Chuyển khoản
                              </span>
                            )}
                            {tx.type === 'SETTLEMENT' && (
                              <span className="px-1.5 py-0.5 bg-teal-50 text-teal-700 font-extrabold text-[9px] sm:text-[10px] rounded border border-teal-200 uppercase tracking-wider whitespace-nowrap">
                                Tất toán
                              </span>
                            )}

                            <span className="font-semibold text-[#4A443F] truncate">
                              {tx.walletName || 'Ví thanh toán'}
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(tx.date).toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="text-right">
                          <p
                            className={`font-black text-xs sm:text-sm ${
                              tx.type === 'EXPENSE'
                                ? 'text-[#D98B72]'
                                : tx.type === 'INCOME' || tx.type === 'SETTLEMENT'
                                ? 'text-[#7D8F69]'
                                : 'text-blue-600'
                            }`}
                          >
                            {tx.type === 'EXPENSE' ? '-' : tx.type === 'INCOME' || tx.type === 'SETTLEMENT' ? '+' : '↔'} {formatVND(tx.amount)}
                          </p>
                        </div>

                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 text-[#8C857D] hover:text-rose-500 rounded-lg transition"
                          title="Xóa giao dịch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}

        {/* TRANSACTIONS & DEBTS UNIFIED TAB (SỔ THU CHI & NỢ) */}
        {(activeTab === 'transactions' || activeTab === 'debts') && (
          <TransactionHistoryView
            transactions={transactions}
            wallets={wallets}
            categories={categories}
            debts={debts}
            groups={groups}
            bills={bills}
            initialSubTab={activeTab === 'debts' ? 'debts' : 'transactions'}
            onDeleteTransaction={handleDeleteTransaction}
            onOpenAddModal={() => setIsAddTxOpen(true)}
            onOpenOcrModal={() => setIsOcrOpen(true)}
            onOpenNlpModal={() => setIsNlpOpen(true)}
            onSettleDebt={(debt) => {
              setSelectedDebtForSettle(debt);
              setIsSettleOpen(true);
            }}
            onOpenAddBill={(groupId) => {
              setSelectedGroupIdForBill(groupId);
              setIsAddBillOpen(true);
            }}
            onOpenAddGroup={() => setIsAddGroupOpen(true)}
          />
        )}

        {/* WALLETS TAB CONTENT */}
        {activeTab === 'wallets' && (
          <WalletsView
            wallets={wallets}
            transactions={transactions}
            categories={categories}
            totalBalance={totalBalance}
            onRefreshData={loadAppData}
            onOpenAddWallet={() => setIsAddWalletOpen(true)}
            onOpenTransfer={handleOpenTransfer}
            onOpenAddTransaction={handleOpenAddTx}
            onSelectTransactionDetail={(tx) => setSelectedTxForDetail(tx)}
          />
        )}

        {/* GROUPS TAB CONTENT */}
        {activeTab === 'groups' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#2D2926]">Nhóm Chi Tiêu & Chia Hóa Đơn</h2>
                <p className="text-xs text-[#8C857D]">Quản lý chuyến đi chơi, phòng trọ, kèo ăn uống</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsAddBillOpen(true)}
                  className="px-4 py-2 bg-[#F1EFE7] hover:bg-[#EAE7DC] text-[#2D2926] rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <Receipt className="w-4 h-4 text-[#D98B72]" /> Thêm Hóa Đơn Nhóm
                </button>
                <button
                  onClick={() => setIsAddGroupOpen(true)}
                  className="px-4 py-2 bg-[#7D8F69] hover:bg-[#687856] text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Tạo Nhóm Mới
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {groups.map((g) => {
                const groupBills = bills.filter((b) => b.groupId === g.id);
                const groupTotal = groupBills.reduce((sum, b) => sum + b.totalAmount, 0);

                return (
                  <div
                    key={g.id}
                    className="bg-white border border-[#EAE7DC] rounded-[28px] p-6 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-[#8C857D] uppercase tracking-wider">
                          {g.name}
                        </span>
                        <span className="text-[10px] bg-[#7D8F69]/10 text-[#7D8F69] px-2.5 py-0.5 rounded-full font-bold">
                          {g.members.length} Thành viên
                        </span>
                      </div>

                      {g.description && <p className="text-xs text-[#8C857D] mb-4">{g.description}</p>}

                      {/* Member Avatars */}
                      <div className="flex items-center -space-x-2 mb-4">
                        {g.members.map((m, idx) => (
                          <div
                            key={m.id}
                            className="w-8 h-8 rounded-full border-2 border-white bg-[#7D8F69] text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs"
                            title={`${m.name} ${m.isGuest ? '(Khách)' : ''}`}
                          >
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                      </div>

                      <div className="p-3 bg-[#F9F8F3] rounded-2xl border border-[#EAE7DC] space-y-1">
                        <div className="flex justify-between text-xs font-medium text-[#8C857D]">
                          <span>Tổng chi tiêu nhóm:</span>
                          <span className="font-bold text-[#2D2926]">{formatVND(groupTotal)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-medium text-[#8C857D]">
                          <span>Số kèo hóa đơn:</span>
                          <span className="font-bold text-[#2D2926]">{groupBills.length} hóa đơn</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#F9F8F3] flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedGroupIdForBill(g.id);
                          setIsAddBillOpen(true);
                        }}
                        className="w-full py-2 bg-[#F1EFE7] hover:bg-[#EAE7DC] rounded-xl text-xs font-bold text-[#4A443F] transition text-center"
                      >
                        + Thêm Kèo Chi Nhóm
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ANALYTICS TAB CONTENT */}
        {activeTab === 'analytics' && (
          <AnalyticsView
            transactions={transactions}
            categories={categories}
            wallets={wallets}
          />
        )}

        {/* AI COACH TAB CONTENT */}
        {activeTab === 'coach' && (
          <AICoachView
            monthlyIncome={monthlyIncome}
            monthlyExpense={monthlyExpense}
            transactions={transactions}
          />
        )}
      </main>

      {/* RIGHT SIDEBAR - WALLETS & GROUP DEBTS SUMMARY (Desktop) */}
      <aside className="hidden xl:flex w-80 bg-[#F1EFE7]/50 border-l border-[#EAE7DC] flex-col p-6 gap-6 shrink-0 overflow-y-auto">
        {/* Ví Của Tôi Card */}
        <div className="bg-white border border-[#EAE7DC] rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-sm text-[#4A443F]">Ví của tôi</h3>
            <button
              onClick={() => setActiveTab('wallets')}
              className="text-[#7D8F69] text-xs font-bold hover:underline"
            >
              Tất cả ({wallets.length})
            </button>
          </div>

          <div className="space-y-2.5 my-1">
            {wallets.length === 0 ? (
              <p className="text-xs text-[#8C857D] italic">Chưa tạo ví nào.</p>
            ) : (
              wallets.slice(0, 4).map((w) => (
                <div key={w.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-[#F9F8F3] transition">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#F1EFE7] flex items-center justify-center text-[#7D8F69] font-extrabold text-[10px] uppercase shrink-0">
                      {w.type === 'BANK' ? 'ATM' : w.type === 'E_WALLET' ? 'MOMO' : 'CASH'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#2D2926] truncate">{w.name}</p>
                      <p className="text-[11px] font-semibold text-[#8C857D]">{formatVND(w.balance)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-[#F9F8F3] mt-2">
            <button
              onClick={() => setIsAddWalletOpen(true)}
              className="flex-1 py-2 text-xs font-bold bg-[#F1EFE7] hover:bg-[#EAE7DC] text-[#4A443F] rounded-xl transition text-center"
            >
              + Thêm Ví
            </button>
            <button
              onClick={() => handleOpenTransfer()}
              className="flex-1 py-2 text-xs font-bold bg-[#F1EFE7] hover:bg-[#EAE7DC] text-[#4A443F] rounded-xl transition text-center"
            >
              Chuyển Tiền
            </button>
          </div>
        </div>

        {/* Group Debt Summary Card */}
        <div className="bg-white border border-[#EAE7DC] rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-[#4A443F] text-sm">Tóm tắt nợ nhóm</h3>
            <button
              onClick={() => setIsAddGroupOpen(true)}
              className="text-xs p-1 px-2 bg-[#F1EFE7] hover:bg-[#EAE7DC] rounded-lg border border-[#EAE7DC] text-[#8C857D] font-bold"
            >
              + Thêm
            </button>
          </div>

          <div className="space-y-3">
            {groups.length === 0 ? (
              <p className="text-xs text-[#8C857D] italic">Chưa tạo nhóm nào.</p>
            ) : (
              groups.slice(0, 3).map((g) => {
                const groupDebts = debts.filter((d) => d.groupId === g.id);
                const groupTotalDebt = groupDebts.reduce((sum, d) => sum + d.amount, 0);

                return (
                  <div
                    key={g.id}
                    onClick={() => {
                      setSelectedGroupForDetail(g);
                      setIsGroupDetailOpen(true);
                    }}
                    className="p-3 bg-[#F9F8F3] hover:bg-[#F1EFE7] rounded-2xl border border-[#EAE7DC] cursor-pointer transition"
                  >
                    <p className="text-[10px] font-bold text-[#8C857D] uppercase mb-1">{g.name}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8C857D]">Tổng nợ nhóm:</span>
                      <span className="font-bold text-[#D98B72]">
                        {groupTotalDebt > 0 ? formatVND(groupTotalDebt) : '0đ (Sòng phẳng)'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION DOCK (PWA Native Bottom Bar - Optimized 5 Items) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EAE7DC] px-2 py-2 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center gap-1 p-1 text-center transition flex-1 ${
            activeTab === 'overview' ? 'text-[#7D8F69] font-bold' : 'text-[#8C857D]'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Tổng quan</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center gap-1 p-1 text-center transition flex-1 relative ${
            activeTab === 'transactions' || activeTab === 'debts'
              ? 'text-[#7D8F69] font-bold'
              : 'text-[#8C857D]'
          }`}
        >
          <ReceiptText className="w-5 h-5" />
          <span className="text-[10px]">Sổ Thu & Nợ</span>
          {debts.length > 0 && (
            <span className="absolute top-0.5 right-2 w-2 h-2 rounded-full bg-[#D98B72] ring-2 ring-white" />
          )}
        </button>

        {/* Floating Quick Action Button (+) */}
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => setIsQuickAddMenuOpen(true)}
            className="w-12 h-12 bg-[#7D8F69] active:scale-95 hover:bg-[#687856] text-white rounded-full flex items-center justify-center -mt-6 border-4 border-[#F9F8F3] shadow-lg transition"
            title="Ghi giao dịch nhanh"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex flex-col items-center gap-1 p-1 text-center transition flex-1 ${
            activeTab === 'analytics' ? 'text-[#7D8F69] font-bold' : 'text-[#8C857D]'
          }`}
        >
          <PieChartIcon className="w-5 h-5" />
          <span className="text-[10px]">Báo cáo</span>
        </button>

        <button
          onClick={() => setActiveTab('coach')}
          className={`flex flex-col items-center gap-1 p-1 text-center transition flex-1 ${
            activeTab === 'coach' ? 'text-amber-600 font-bold' : 'text-[#8C857D]'
          }`}
        >
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span className="text-[10px]">Cố vấn AI</span>
        </button>
      </nav>

      {/* ALL MODALS */}
      <GroupDebtDetailModal
        isOpen={isGroupDetailOpen}
        onClose={() => {
          setIsGroupDetailOpen(false);
          setSelectedGroupForDetail(null);
        }}
        group={selectedGroupForDetail}
        debts={debts}
        bills={bills}
        onSettleDebt={(debt) => {
          setSelectedDebtForSettle(debt);
          setIsSettleOpen(true);
        }}
        onAddBill={(groupId) => {
          setSelectedGroupIdForBill(groupId);
          setIsAddBillOpen(true);
        }}
      />
      <MobileQuickAddMenu
        isOpen={isQuickAddMenuOpen}
        onClose={() => setIsQuickAddMenuOpen(false)}
        onSelectOption={(option) => {
          if (option === 'nlp') setIsNlpOpen(true);
          else if (option === 'ocr') setIsOcrOpen(true);
          else if (option === 'manual') handleOpenAddTx(undefined, 'expense');
          else if (option === 'transfer') handleOpenTransfer();
          else if (option === 'bill') setIsAddBillOpen(true);
        }}
      />

      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => {
          setIsAddTxOpen(false);
          setAddTxPreselectedWalletId(undefined);
        }}
        wallets={wallets}
        categories={categories}
        onSuccess={loadAppData}
        initialTab={addTxInitialTab}
        preselectedWalletId={addTxPreselectedWalletId}
      />

      <AddWalletModal
        isOpen={isAddWalletOpen}
        onClose={() => setIsAddWalletOpen(false)}
        onSuccess={loadAppData}
      />

      <AddGroupModal
        isOpen={isAddGroupOpen}
        onClose={() => setIsAddGroupOpen(false)}
        onSuccess={loadAppData}
      />

      <AddBillModal
        isOpen={isAddBillOpen}
        onClose={() => {
          setIsAddBillOpen(false);
          setSelectedGroupIdForBill(undefined);
        }}
        groups={groups}
        selectedGroupId={selectedGroupIdForBill}
        onSuccess={loadAppData}
      />

      <SettlementModal
        isOpen={isSettleOpen}
        onClose={() => {
          setIsSettleOpen(false);
          setSelectedDebtForSettle(null);
        }}
        debt={selectedDebtForSettle}
        wallets={wallets}
        onSuccess={loadAppData}
      />

      <ReceiptOCRModal
        isOpen={isOcrOpen}
        onClose={() => setIsOcrOpen(false)}
        wallets={wallets}
        categories={categories}
        onSuccess={loadAppData}
        onSave={async (newTx) => {
          await apiService.addTransaction({
            walletId: newTx.walletId,
            walletName: newTx.walletName,
            categoryId: newTx.categoryId,
            categoryName: newTx.categoryName,
            categoryIcon: newTx.categoryIcon,
            amount: newTx.amount,
            type: (newTx.type || 'EXPENSE') as TransactionType,
            note: newTx.note,
            date: newTx.date,
            receiptImageUrl: newTx.receiptImageUrl,
            items: newTx.items,
            merchantName: newTx.merchantName,
          });
          await loadAppData();
          setIsOcrOpen(false);
        }}
      />

      <NLPTransactionModal
        isOpen={isNlpOpen}
        onClose={() => setIsNlpOpen(false)}
        wallets={wallets}
        categories={categories}
        onSuccess={loadAppData}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onStatusChange={loadAppData}
      />

      <TransactionDetailModal
        isOpen={!!selectedTxForDetail}
        onClose={() => setSelectedTxForDetail(null)}
        transaction={selectedTxForDetail}
        wallets={wallets}
        categories={categories}
        onDelete={handleDeleteTransaction}
      />
    </div>
  );
}
