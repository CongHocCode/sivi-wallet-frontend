/**
 * SIVI WALLET - Unified Backend API Service Layer
 * Supports both modern modular namespaced API (api.wallets.getAll)
 * and backward-compatible direct calls (apiService.getWallets)
 */

import {
  User,
  Wallet,
  Category,
  Transaction,
  Group,
  GroupMember,
  GroupBill,
  SplitDetail,
  BillItem,
  DebtSummary,
  ReceiptOCRResult,
  NLPParsedTransaction,
  FinancialCoachResponse,
  GetTransactionsParams,
  CreateWalletDto,
  TransferWalletDto,
  CreateTransactionDto,
  CreateGroupDto,
  AddGroupMemberDto,
  CreateBillDto,
  LoginDto,
  RegisterDto,
} from '../types';
import { formatLocalISO } from '../lib/formatters';
import {
  INITIAL_USER,
  INITIAL_WALLETS,
  INITIAL_CATEGORIES,
  INITIAL_GROUPS,
  INITIAL_BILLS,
  INITIAL_TRANSACTIONS,
  calculateDebtMatrix,
} from './mockData';
import { geminiService } from './geminiService';

// API Base URL config from env or default
const metaEnv = (import.meta as any).env || {};
const API_BASE_URL =
  (metaEnv.VITE_API_URL as string) ||
  (metaEnv.NEXT_PUBLIC_API_URL as string) ||
  'http://localhost:8080/api/v1';

// Keys for LocalStorage persistence
const STORAGE_KEYS = {
  TOKEN: 'sivi_token',
  USER: 'sivi_user',
  WALLETS: 'sivi_wallets',
  CATEGORIES: 'sivi_categories',
  GROUPS: 'sivi_groups',
  BILLS: 'sivi_bills',
  TRANSACTIONS: 'sivi_transactions',
  USE_MOCK: 'sivi_use_mock_mode',
  CUSTOM_API_URL: 'sivi_custom_api_url',
};

class ApiClient {
  private token: string | null = null;
  private isMockMode: boolean = false;
  private customApiUrl: string = API_BASE_URL;

  constructor() {
    const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (storedToken) {
      this.token = storedToken;
    } else {
      const storedUser = this.getFromStorage<User>(STORAGE_KEYS.USER);
      if (storedUser?.token) {
        this.token = storedUser.token;
        localStorage.setItem(STORAGE_KEYS.TOKEN, storedUser.token);
      }
    }

    const savedUrl = localStorage.getItem(STORAGE_KEYS.CUSTOM_API_URL);
    if (savedUrl) {
      this.customApiUrl = savedUrl;
    }

    const savedMode = localStorage.getItem(STORAGE_KEYS.USE_MOCK);
    if (savedMode !== null) {
      this.isMockMode = savedMode === 'true';
    } else {
      // Default to false when token is present so real API calls are executed
      this.isMockMode = false;
    }

    this.initializeMockDataIfEmpty();
  }

  public getApiUrl(): string {
    return this.customApiUrl;
  }

  public setApiUrl(url: string) {
    this.customApiUrl = url;
    localStorage.setItem(STORAGE_KEYS.CUSTOM_API_URL, url);
  }

  public getIsMockMode(): boolean {
    return this.isMockMode;
  }

  public setIsMockMode(val: boolean) {
    this.isMockMode = val;
    localStorage.setItem(STORAGE_KEYS.USE_MOCK, String(val));
  }

  public getToken(): string | null {
    return this.token || localStorage.getItem(STORAGE_KEYS.TOKEN);
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
    }
  }

  public isAuthenticated(): boolean {
    return !!(this.token || localStorage.getItem(STORAGE_KEYS.TOKEN));
  }

  public async checkBackendHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.customApiUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public getFromStorage<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  public setToStorage<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving to storage:', e);
    }
  }

  public initializeMockDataIfEmpty(): void {
    if (!this.getFromStorage(STORAGE_KEYS.USER)) {
      this.setToStorage(STORAGE_KEYS.USER, INITIAL_USER);
    }
    if (!this.getFromStorage(STORAGE_KEYS.WALLETS)) {
      this.setToStorage(STORAGE_KEYS.WALLETS, INITIAL_WALLETS);
    }
    if (!this.getFromStorage(STORAGE_KEYS.CATEGORIES)) {
      this.setToStorage(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    }
    if (!this.getFromStorage(STORAGE_KEYS.GROUPS)) {
      this.setToStorage(STORAGE_KEYS.GROUPS, INITIAL_GROUPS);
    }
    if (!this.getFromStorage(STORAGE_KEYS.BILLS)) {
      this.setToStorage(STORAGE_KEYS.BILLS, INITIAL_BILLS);
    }
    if (!this.getFromStorage(STORAGE_KEYS.TRANSACTIONS)) {
      this.setToStorage(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    }
  }

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (this.isMockMode) {
      throw new Error('MOCK_MODE_ACTIVE');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.customApiUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      throw new Error(errData.message || errData.error || `HTTP ${response.status}`);
    }

    const json = await response.json();
    if (json && typeof json === 'object' && 'data' in json && json.data !== undefined) {
      return json.data as T;
    }
    return json as T;
  }
}

export const apiClient = new ApiClient();

// Helper to determine top spending category
const getTopCategoryName = (txs: Transaction[]): string => {
  const expenseTransactions = txs.filter((t) => t.type === 'EXPENSE');
  if (expenseTransactions.length === 0) return 'Chi tiêu chung';
  const categoryTotals: Record<string, number> = {};
  expenseTransactions.forEach((t) => {
    const catName = t.categoryName || 'Khác';
    categoryTotals[catName] = (categoryTotals[catName] || 0) + t.amount;
  });
  let topCat = 'Chi tiêu chung';
  let maxAmount = -1;
  Object.entries(categoryTotals).forEach(([catName, total]) => {
    if (total > maxAmount) {
      maxAmount = total;
      topCat = catName;
    }
  });
  return topCat;
};

// --- AUTH SUB-MODULE ---
const authModule = {
  isAuthenticated: () => apiClient.isAuthenticated(),
  getToken: () => apiClient.getToken(),
  setToken: (token: string | null) => apiClient.setToken(token),

  getMe: async (): Promise<User> => {
    if (!apiClient.getIsMockMode()) {
      try {
        return await apiClient.request<User>('/auth/me');
      } catch {}
    }
    return apiClient.getFromStorage<User>(STORAGE_KEYS.USER) || INITIAL_USER;
  },

  getCurrentUser: async (): Promise<User> => {
    return authModule.getMe();
  },

  login: async (
    dtoOrUsername: LoginDto | string,
    nameParam?: string,
    passwordParam?: string
  ): Promise<User> => {
    let username: string;
    let password: string | undefined;

    if (typeof dtoOrUsername === 'object' && dtoOrUsername !== null) {
      username = String(dtoOrUsername.username || dtoOrUsername.email || 'user1');
      password = dtoOrUsername.password;
    } else {
      username = String(dtoOrUsername || 'user1');
      password = passwordParam;
    }

    try {
      const res = await apiClient.request<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password: password || '123456',
        }),
      });

      const token = res?.accessToken || res?.data?.accessToken || res?.token || 'jwt_sivi_token_' + Date.now();
      apiClient.setToken(token);
      apiClient.setIsMockMode(false);

      const user: User = {
        id: res?.userId || 'usr_' + username,
        username: username,
        name: res?.username || res?.fullName || username,
        fullName: res?.fullName || username,
        email: `${username}@sivi.vn`,
        token,
        isGuest: false,
      };

      apiClient.setToStorage(STORAGE_KEYS.USER, user);
      return user;
    } catch (err: any) {
      console.warn('Backend login notice, falling back to session token:', err.message);
      const token = 'jwt_sivi_token_' + Date.now();
      apiClient.setToken(token);
      apiClient.setIsMockMode(false);

      const user: User = {
        id: 'usr_' + username,
        username,
        name: username,
        fullName: username,
        email: `${username}@sivi.vn`,
        token,
        isGuest: false,
      };

      apiClient.setToStorage(STORAGE_KEYS.USER, user);
      return user;
    }
  },

  register: async (
    dtoOrUsername: RegisterDto | string,
    nameParam?: string,
    passwordParam?: string
  ): Promise<User> => {
    let username: string;
    let fullName: string;
    let email: string;
    let password: string | undefined;

    if (typeof dtoOrUsername === 'object' && dtoOrUsername !== null) {
      username = String(dtoOrUsername.username || '');
      fullName = String(dtoOrUsername.fullName || dtoOrUsername.username || '');
      email = String(dtoOrUsername.email || (username.includes('@') ? username : `${username || 'user'}@sivi.vn`));
      password = dtoOrUsername.password;
    } else {
      username = String(dtoOrUsername || '');
      fullName = String(nameParam || dtoOrUsername || '');
      email = username.includes('@') ? username : `${username || 'user'}@sivi.vn`;
      password = passwordParam;
    }

    const user: User = {
      id: 'usr_' + Date.now(),
      email,
      name: fullName,
      fullName,
      isGuest: false,
      token: 'jwt_sivi_token_' + Date.now(),
      createdAt: new Date().toISOString(),
    };

    if (!apiClient.getIsMockMode()) {
      try {
        const res = await apiClient.request<User>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            username,
            fullName,
            email,
            password,
          }),
        });
        if (res.token) {
          apiClient.setToken(res.token);
        }
        apiClient.setToStorage(STORAGE_KEYS.USER, res);
        return res;
      } catch {}
    }

    apiClient.setToken(user.token || null);
    apiClient.setToStorage(STORAGE_KEYS.USER, user);
    return user;
  },

  logout: () => {
    apiClient.setToken(null);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  searchUsers: async (keyword: string): Promise<User[]> => {
    const q = (keyword || '').toLowerCase().trim();
    if (!apiClient.getIsMockMode() && q) {
      try {
        const res = await apiClient.request<User[]>(`/users/search?keyword=${encodeURIComponent(q)}`);
        if (Array.isArray(res)) return res;
      } catch {}
    }

    // Default registered/system member pool for SIVI WALLET
    const systemMembers: User[] = [
      {
        id: 'usr_002',
        username: 'an.nguyen',
        name: 'Nguyễn Văn An',
        fullName: 'Nguyễn Văn An',
        email: 'an.nguyen@sivi.vn',
        isGuest: false,
      },
      {
        id: 'usr_003',
        username: 'lan.le',
        name: 'Lê Thị Lan',
        fullName: 'Lê Thị Lan',
        email: 'lan.le@gmail.com',
        isGuest: false,
      },
      {
        id: 'usr_004',
        username: 'hoang.pn',
        name: 'Phạm Nhật Hoàng',
        fullName: 'Phạm Nhật Hoàng',
        email: 'hoang.pn@sivi.vn',
        isGuest: false,
      },
      {
        id: 'usr_005',
        username: 'khoa.vu',
        name: 'Vũ Anh Khoa',
        fullName: 'Vũ Anh Khoa',
        email: 'khoa.vu@gmail.com',
        isGuest: false,
      },
      {
        id: 'usr_006',
        username: 'hung.nguyen',
        name: 'Nguyễn Văn Hùng',
        fullName: 'Nguyễn Văn Hùng',
        email: 'hung.nguyen@sivi.vn',
        isGuest: false,
      },
      {
        id: 'usr_007',
        username: 'yen.hoang',
        name: 'Hoàng Yến',
        fullName: 'Hoàng Yến',
        email: 'yen.hoang@sivi.vn',
        isGuest: false,
      },
      {
        id: 'usr_008',
        username: 'bao.dang',
        name: 'Đặng Quốc Bảo',
        fullName: 'Đặng Quốc Bảo',
        email: 'bao.dang@sivi.vn',
        isGuest: false,
      },
      {
        id: 'usr_009',
        username: 'minh.tran',
        name: 'Trần Đức Minh',
        fullName: 'Trần Đức Minh',
        email: 'ducminh.dev@gmail.com',
        isGuest: false,
      },
      {
        id: 'usr_010',
        username: 'phuong.le',
        name: 'Lê Thu Phương',
        fullName: 'Lê Thu Phương',
        email: 'phuong.le@gmail.com',
        isGuest: false,
      },
      {
        id: 'gst_001',
        name: 'Bác Ba Quán Nước',
        fullName: 'Bác Ba Quán Nước',
        isGuest: true,
      },
      {
        id: 'gst_002',
        name: 'Anh Shipper Grab',
        fullName: 'Anh Shipper Grab',
        isGuest: true,
      },
    ];

    if (!q) {
      return systemMembers;
    }

    return systemMembers.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  },
};

// --- WALLETS SUB-MODULE ---
const walletsModule = {
  getAll: async (): Promise<Wallet[]> => {
    if (!apiClient.getIsMockMode()) {
      try {
        const res = await apiClient.request<any>('/wallets');
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.wallets)) return res.wallets;
        if (res && Array.isArray(res.data)) return res.data;
        return [];
      } catch {}
    }
    const wallets = apiClient.getFromStorage<Wallet[]>(STORAGE_KEYS.WALLETS) || INITIAL_WALLETS;
    return (Array.isArray(wallets) ? wallets : []).filter((w) => w?.isActive !== false);
  },

  getById: async (id: string): Promise<Wallet | undefined> => {
    const wallets = await walletsModule.getAll();
    return wallets.find((w) => w.id === id);
  },

  create: async (walletData: CreateWalletDto): Promise<Wallet> => {
    const newWallet: Wallet = {
      id: 'wal_' + Date.now(),
      userId: 'usr_001',
      name: walletData.name,
      type: walletData.type,
      balance: walletData.balance || 0,
      currency: 'VND',
      accountNumber: walletData.accountNumber,
      bankName: walletData.bankName,
      icon: walletData.icon || (walletData.type === 'BANK' ? 'Building2' : walletData.type === 'E_WALLET' ? 'Smartphone' : 'Banknote'),
      color: walletData.color || (walletData.type === 'BANK' ? '#3B82F6' : walletData.type === 'E_WALLET' ? '#EC4899' : '#10B981'),
      isActive: true,
    };

    if (!apiClient.getIsMockMode()) {
      try {
        return await apiClient.request<Wallet>('/wallets', {
          method: 'POST',
          body: JSON.stringify(walletData),
        });
      } catch {}
    }

    const wallets = apiClient.getFromStorage<Wallet[]>(STORAGE_KEYS.WALLETS) || INITIAL_WALLETS;
    const updated = [newWallet, ...wallets];
    apiClient.setToStorage(STORAGE_KEYS.WALLETS, updated);
    return newWallet;
  },

  update: async (id: string, walletData: Partial<Wallet>): Promise<Wallet> => {
    if (!apiClient.getIsMockMode()) {
      try {
        return await apiClient.request<Wallet>(`/wallets/${id}`, {
          method: 'PUT',
          body: JSON.stringify(walletData),
        });
      } catch {}
    }

    const wallets = apiClient.getFromStorage<Wallet[]>(STORAGE_KEYS.WALLETS) || INITIAL_WALLETS;
    let target: Wallet | null = null;
    const updated = wallets.map((w) => {
      if (w.id === id) {
        target = { ...w, ...walletData };
        return target;
      }
      return w;
    });
    apiClient.setToStorage(STORAGE_KEYS.WALLETS, updated);
    return target || wallets[0];
  },

  delete: async (id: string): Promise<boolean> => {
    if (!apiClient.getIsMockMode()) {
      try {
        await apiClient.request(`/wallets/${id}`, { method: 'DELETE' });
        return true;
      } catch {}
    }

    const wallets = apiClient.getFromStorage<Wallet[]>(STORAGE_KEYS.WALLETS) || INITIAL_WALLETS;
    const updated = wallets.map((w) => (w.id === id ? { ...w, isActive: false } : w));
    apiClient.setToStorage(STORAGE_KEYS.WALLETS, updated);
    return true;
  },

  transfer: async (
    dtoOrFrom: TransferWalletDto | string,
    toWalletIdParam?: string,
    amountParam?: number,
    noteParam?: string
  ): Promise<boolean> => {
    let fromWalletId: string;
    let toWalletId: string;
    let amount: number;
    let note: string | undefined;

    if (typeof dtoOrFrom === 'object') {
      fromWalletId = String(dtoOrFrom.fromWalletId);
      toWalletId = String(dtoOrFrom.toWalletId);
      amount = dtoOrFrom.amount;
      note = dtoOrFrom.note;
    } else {
      fromWalletId = String(dtoOrFrom);
      toWalletId = String(toWalletIdParam!);
      amount = amountParam!;
      note = noteParam;
    }

    if (!apiClient.getIsMockMode()) {
      try {
        await apiClient.request('/wallets/transfer', {
          method: 'POST',
          body: JSON.stringify({ fromWalletId, toWalletId, amount, note }),
        });
        return true;
      } catch {}
    }

    const wallets = apiClient.getFromStorage<Wallet[]>(STORAGE_KEYS.WALLETS) || INITIAL_WALLETS;
    const fromWal = wallets.find((w) => w.id === fromWalletId);
    const toWal = wallets.find((w) => w.id === toWalletId);

    if (!fromWal || !toWal) throw new Error('Ví không tồn tại');
    if (fromWal.balance < amount) throw new Error('Số dư ví gửi không đủ để thực hiện chuyển khoản');

    fromWal.balance -= amount;
    toWal.balance += amount;

    apiClient.setToStorage(STORAGE_KEYS.WALLETS, wallets);

    await transactionsModule.create({
      walletId: fromWalletId,
      walletName: fromWal.name,
      amount,
      type: 'TRANSFER',
      note: note || `Chuyển tiền sang ví ${toWal.name}`,
      date: new Date().toISOString(),
      destinationWalletId: toWalletId,
      destinationWalletName: toWal.name,
      categoryName: 'Chuyển khoản',
      categoryIcon: 'ArrowRightLeft',
    });

    return true;
  },
};

// --- CATEGORIES SUB-MODULE ---
const categoriesModule = {
  getAll: async (): Promise<Category[]> => {
    if (!apiClient.getIsMockMode()) {
      try {
        const res = await apiClient.request<any>('/categories');
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.categories)) return res.categories;
        if (res && Array.isArray(res.data)) return res.data;
        return [];
      } catch {}
    }
    const categories = apiClient.getFromStorage<Category[]>(STORAGE_KEYS.CATEGORIES) || INITIAL_CATEGORIES;
    return Array.isArray(categories) ? categories : [];
  },

  create: async (cat: Omit<Category, 'id' | 'isDefault'>): Promise<Category> => {
    const newCat: Category = {
      ...cat,
      id: 'cat_' + Date.now(),
      isDefault: false,
    };

    if (!apiClient.getIsMockMode()) {
      try {
        return await apiClient.request<Category>('/categories', {
          method: 'POST',
          body: JSON.stringify(cat),
        });
      } catch {}
    }

    const categories = apiClient.getFromStorage<Category[]>(STORAGE_KEYS.CATEGORIES) || INITIAL_CATEGORIES;
    apiClient.setToStorage(STORAGE_KEYS.CATEGORIES, [...categories, newCat]);
    return newCat;
  },
};

// --- TRANSACTIONS SUB-MODULE ---
const transactionsModule = {
  getAll: async (params?: GetTransactionsParams): Promise<Transaction[]> => {
    let endpoint = '/transactions';
    if (params) {
      const query = new URLSearchParams();
      if (params.month && params.month !== 'ALL') query.append('month', String(params.month));
      if (params.year && params.year !== 'ALL') query.append('year', String(params.year));
      if (params.walletId && params.walletId !== 'ALL') query.append('walletId', String(params.walletId));
      if (params.type && params.type !== 'ALL') query.append('type', params.type);
      const qs = query.toString();
      if (qs) endpoint += `?${qs}`;
    }

    if (!apiClient.getIsMockMode()) {
      try {
        const res = await apiClient.request<any>(endpoint);
        let list: Transaction[] = [];
        if (Array.isArray(res)) list = res;
        else if (res && Array.isArray(res.transactions)) list = res.transactions;
        else if (res && Array.isArray(res.data)) list = res.data;
        return list;
      } catch {}
    }

    let transactions = apiClient.getFromStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS) || INITIAL_TRANSACTIONS;
    if (!Array.isArray(transactions)) transactions = [];

    if (params) {
      transactions = transactions.filter((t) => {
        if (params.type && params.type !== 'ALL' && t.type !== params.type) return false;
        if (
          params.walletId &&
          params.walletId !== 'ALL' &&
          t.walletId !== String(params.walletId) &&
          t.destinationWalletId !== String(params.walletId)
        ) {
          return false;
        }
        if (params.year && params.year !== 'ALL') {
          const y = new Date(t.date).getFullYear();
          if (y !== params.year) return false;
        }
        if (params.month && params.month !== 'ALL') {
          const m = new Date(t.date).getMonth() + 1;
          if (m !== params.month) return false;
        }
        return true;
      });
    }

    return transactions;
  },

  getById: async (id: string): Promise<Transaction | undefined> => {
    const transactions = await transactionsModule.getAll();
    return transactions.find((t) => t.id === id);
  },

  create: async (txData: CreateTransactionDto): Promise<Transaction> => {
    // Preserve local transactionDate raw string (YYYY-MM-DDTHH:mm:ss) without UTC shifting
    const rawDate = txData.transactionDate || txData.date || formatLocalISO(new Date());
    let transactionDate = String(rawDate).replace('Z', '').trim();
    if (transactionDate.length === 16) {
      transactionDate = `${transactionDate}:00`;
    }

    const newTx: Transaction = {
      ...txData,
      id: 'tx_' + Date.now(),
      userId: 'usr_001',
      date: transactionDate,
      createdAt: transactionDate,
    };

    if (!apiClient.getIsMockMode()) {
      const payload = {
        ...txData,
        transactionDate,
        date: transactionDate,
      };
      return await apiClient.request<Transaction>('/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    const wallets = apiClient.getFromStorage<Wallet[]>(STORAGE_KEYS.WALLETS) || INITIAL_WALLETS;
    const targetWallet = wallets.find((w) => w.id === txData.walletId);
    if (targetWallet) {
      if (txData.type === 'EXPENSE') {
        targetWallet.balance -= txData.amount;
      } else if (txData.type === 'INCOME' || txData.type === 'SETTLEMENT') {
        targetWallet.balance += txData.amount;
      }
      apiClient.setToStorage(STORAGE_KEYS.WALLETS, wallets);
    }

    const transactions = apiClient.getFromStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS) || INITIAL_TRANSACTIONS;
    const updated = [newTx, ...transactions];
    apiClient.setToStorage(STORAGE_KEYS.TRANSACTIONS, updated);
    return newTx;
  },

  update: async (id: string, txData: Partial<Transaction>): Promise<Transaction> => {
    if (!apiClient.getIsMockMode()) {
      try {
        return await apiClient.request<Transaction>(`/transactions/${id}`, {
          method: 'PUT',
          body: JSON.stringify(txData),
        });
      } catch {}
    }

    const transactions = apiClient.getFromStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS) || INITIAL_TRANSACTIONS;
    let target: Transaction | null = null;
    const updated = transactions.map((t) => {
      if (t.id === id) {
        target = { ...t, ...txData };
        return target;
      }
      return t;
    });
    apiClient.setToStorage(STORAGE_KEYS.TRANSACTIONS, updated);
    return target || transactions[0];
  },

  delete: async (id: string): Promise<boolean> => {
    if (!apiClient.getIsMockMode()) {
      try {
        await apiClient.request(`/transactions/${id}`, { method: 'DELETE' });
        return true;
      } catch {}
    }

    const transactions = apiClient.getFromStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS) || INITIAL_TRANSACTIONS;
    const tx = transactions.find((t) => t.id === id);

    if (tx) {
      const wallets = apiClient.getFromStorage<Wallet[]>(STORAGE_KEYS.WALLETS) || INITIAL_WALLETS;
      const targetWallet = wallets.find((w) => w.id === tx.walletId);
      if (targetWallet) {
        if (tx.type === 'EXPENSE') {
          targetWallet.balance += tx.amount;
        } else if (tx.type === 'INCOME' || tx.type === 'SETTLEMENT') {
          targetWallet.balance -= tx.amount;
        }
        apiClient.setToStorage(STORAGE_KEYS.WALLETS, wallets);
      }
    }

    const updated = transactions.filter((t) => t.id !== id);
    apiClient.setToStorage(STORAGE_KEYS.TRANSACTIONS, updated);
    return true;
  },
};

// --- GROUPS SUB-MODULE ---
const groupsModule = {
  getAll: async (): Promise<Group[]> => {
    if (!apiClient.getIsMockMode()) {
      try {
        const res = await apiClient.request<any>('/groups');
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.groups)) return res.groups;
        if (res && Array.isArray(res.data)) return res.data;
        return [];
      } catch {}
    }
    const groups = apiClient.getFromStorage<Group[]>(STORAGE_KEYS.GROUPS) || INITIAL_GROUPS;
    return Array.isArray(groups) ? groups : [];
  },

  getMyGroups: async (): Promise<Group[]> => {
    return groupsModule.getAll();
  },

  getById: async (id: string): Promise<Group | undefined> => {
    const groups = await groupsModule.getAll();
    return groups.find((g) => g.id === id);
  },

  create: async (
    groupDataOrName: CreateGroupDto | string,
    description?: string,
    members?: { name: string; isGuest: boolean; email?: string }[]
  ): Promise<Group> => {
    let name: string;
    let desc: string | undefined;
    let memberInputs: { name: string; isGuest: boolean; email?: string }[] | undefined;

    if (typeof groupDataOrName === 'object') {
      name = groupDataOrName.name;
      desc = groupDataOrName.description;
      memberInputs = groupDataOrName.members;
    } else {
      name = groupDataOrName;
      desc = description;
      memberInputs = members;
    }

    const memberList: GroupMember[] = memberInputs
      ? memberInputs.map((m: any, idx: number) => ({
          id: m.id || `m_${Date.now()}_${idx}`,
          name: m.name,
          fullName: m.name,
          isGuest: m.isGuest,
          email: m.email,
          userId: m.userId ? String(m.userId) : (m.isGuest ? undefined : 'usr_' + idx),
        }))
      : [{ id: 'usr_001', name: 'Trần Minh Nam (Tôi)', fullName: 'Trần Minh Nam', isGuest: false, userId: 'usr_001' }];

    if (!memberList.some((m) => m.id === 'usr_001' || m.userId === 'usr_001')) {
      memberList.unshift({
        id: 'usr_001',
        name: 'Trần Minh Nam (Tôi)',
        fullName: 'Trần Minh Nam',
        isGuest: false,
        userId: 'usr_001',
      });
    }

    const newGroup: Group = {
      id: 'grp_' + Date.now(),
      name,
      description: desc,
      members: memberList,
      createdAt: new Date().toISOString(),
    };

    if (!apiClient.getIsMockMode()) {
      try {
        return await apiClient.request<Group>('/groups', {
          method: 'POST',
          body: JSON.stringify({ name, description: desc, members: memberInputs }),
        });
      } catch {}
    }

    const groups = apiClient.getFromStorage<Group[]>(STORAGE_KEYS.GROUPS) || INITIAL_GROUPS;
    apiClient.setToStorage(STORAGE_KEYS.GROUPS, [...groups, newGroup]);
    return newGroup;
  },

  addMember: async (groupId: string | number, memberData: AddGroupMemberDto): Promise<Group> => {
    const targetGroupId = String(groupId);
    const newMember: GroupMember = {
      id: `m_${Date.now()}`,
      name: memberData.name || memberData.fullName || 'Thành viên',
      fullName: memberData.fullName || memberData.name,
      isGuest: memberData.isGuest !== false,
      email: memberData.email,
      userId: memberData.userId ? String(memberData.userId) : undefined,
    };

    if (!apiClient.getIsMockMode()) {
      try {
        return await apiClient.request<Group>(`/groups/${targetGroupId}/members`, {
          method: 'POST',
          body: JSON.stringify(memberData),
        });
      } catch {}
    }

    const groups = apiClient.getFromStorage<Group[]>(STORAGE_KEYS.GROUPS) || INITIAL_GROUPS;
    let updatedGroup: Group | null = null;
    const updated = groups.map((g) => {
      if (g.id === targetGroupId) {
        updatedGroup = { ...g, members: [...g.members, newMember] };
        return updatedGroup;
      }
      return g;
    });
    apiClient.setToStorage(STORAGE_KEYS.GROUPS, updated);
    return updatedGroup || groups[0];
  },

  delete: async (id: string): Promise<boolean> => {
    if (!apiClient.getIsMockMode()) {
      try {
        await apiClient.request(`/groups/${id}`, { method: 'DELETE' });
        return true;
      } catch {}
    }
    const groups = apiClient.getFromStorage<Group[]>(STORAGE_KEYS.GROUPS) || INITIAL_GROUPS;
    apiClient.setToStorage(STORAGE_KEYS.GROUPS, groups.filter((g) => g.id !== id));
    return true;
  },
};

// --- BILLS & DEBTS SUB-MODULE ---
const billsModule = {
  getAll: async (groupId?: string): Promise<GroupBill[]> => {
    if (!apiClient.getIsMockMode()) {
      try {
        const res = await apiClient.request<any>(groupId ? `/groups/${groupId}/bills` : '/bills');
        let list: GroupBill[] = [];
        if (Array.isArray(res)) list = res;
        else if (res && Array.isArray(res.bills)) list = res.bills;
        else if (res && Array.isArray(res.data)) list = res.data;
        if (groupId) return list.filter((b) => b.groupId === groupId);
        return list;
      } catch {}
    }

    const bills = apiClient.getFromStorage<GroupBill[]>(STORAGE_KEYS.BILLS) || INITIAL_BILLS;
    const safeBills = Array.isArray(bills) ? bills : [];
    if (groupId) {
      return safeBills.filter((b) => b.groupId === groupId);
    }
    return safeBills;
  },

  create: async (billData: CreateBillDto | Omit<GroupBill, 'id'>): Promise<GroupBill> => {
    const title = billData.description || billData.title || 'Hóa đơn chi tiêu';
    const effectiveGroupId = billData.groupId && billData.groupId !== 'none' ? String(billData.groupId) : null;
    const groupName = billData.groupName || (effectiveGroupId ? 'Nhóm' : 'Chia lẻ cá nhân');
    const payerId = String(billData.payerMemberId || (billData as any).payerId || 'usr_001');
    const isMePayer = payerId === 'usr_001' || payerId.includes('usr_001') || (billData.payerMemberName || '').includes('(Tôi)');
    const payerName = billData.payerMemberName || (billData as any).payerName || (isMePayer ? 'Trần Minh Nam (Tôi)' : 'Bạn bè');

    // Ensure splits are populated even if only items was sent
    let splits: SplitDetail[] = billData.splits || [];
    if ((!splits || splits.length === 0) && billData.items && billData.items.length > 0) {
      splits = billData.items.map((item) => ({
        memberId: String(item.userId),
        memberName: item.isPaid ? payerName : `Thành viên (${item.userId})`,
        amount: item.amountShare,
      }));
    }

    const newBill: GroupBill = {
      ...billData,
      id: 'bill_' + Date.now(),
      groupId: effectiveGroupId,
      groupName,
      title,
      description: title,
      payerMemberId: payerId,
      payerId: payerId,
      payerMemberName: payerName,
      payerName: payerName,
      splitType: billData.splitType || 'EQUAL',
      splits,
      date: billData.date || new Date().toISOString(),
    };

    if (!apiClient.getIsMockMode()) {
      try {
        const endpoint = effectiveGroupId ? `/groups/${effectiveGroupId}/bills` : '/bills';
        return await apiClient.request<GroupBill>(endpoint, {
          method: 'POST',
          body: JSON.stringify({
            groupId: effectiveGroupId,
            walletId: isMePayer ? billData.walletId : undefined,
            categoryId: billData.categoryId,
            totalAmount: billData.totalAmount,
            description: title,
            items: billData.items || splits.map((s) => ({
              userId: s.memberId,
              amountShare: s.amount,
              isPaid: s.memberId === payerId,
            })),
            title,
            payerMemberId: payerId,
            payerMemberName: payerName,
            splits,
            date: newBill.date,
          }),
        });
      } catch {}
    }

    const bills = apiClient.getFromStorage<GroupBill[]>(STORAGE_KEYS.BILLS) || INITIAL_BILLS;
    apiClient.setToStorage(STORAGE_KEYS.BILLS, [newBill, ...bills]);

    // Handle wallet deduction & transaction log ONLY when "Tôi" is payer
    if (isMePayer) {
      const wallets = await walletsModule.getAll();
      const selectedWallet = billData.walletId
        ? wallets.find((w) => w.id === billData.walletId) || wallets[0]
        : wallets[0];

      const categories = await categoriesModule.getAll();
      const selectedCategory = billData.categoryId
        ? categories.find((c) => c.id === billData.categoryId)
        : categories.find((c) => c.name.includes('Ăn') || c.name.includes('Nhóm')) || categories[0];

      if (selectedWallet) {
        const expenseAmount = billData.totalAmount || 0;
        await transactionsModule.create({
          walletId: selectedWallet.id,
          walletName: selectedWallet.name,
          categoryId: selectedCategory?.id,
          categoryName: selectedCategory?.name || billData.category || 'Chi tiêu nhóm',
          categoryIcon: selectedCategory?.icon || 'Users',
          amount: expenseAmount,
          type: 'EXPENSE',
          note: `Thanh toán: ${title} (${groupName})`,
          date: newBill.date,
          groupId: effectiveGroupId || undefined,
          groupName,
        });
      }
    }

    return newBill;
  },

  getDebts: async (): Promise<DebtSummary[]> => {
    if (!apiClient.getIsMockMode()) {
      try {
        const res = await apiClient.request<any>('/bills/debts');
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.debts)) return res.debts;
        if (res && Array.isArray(res.data)) return res.data;
      } catch {}
    }
    const bills = await billsModule.getAll();
    return calculateDebtMatrix(bills);
  },

  getDebtLedger: async (): Promise<DebtSummary[]> => {
    return billsModule.getDebts();
  },

  settleDebt: async (
    billDetailIdOrDebtor: string | number,
    targetWalletIdOrCreditor: string | number,
    amountParam?: number,
    targetWalletIdParam?: string | number,
    groupNameParam?: string
  ): Promise<boolean> => {
    let debtorName: string;
    let creditorName: string;
    let amount: number;
    let targetWalletId: string;
    let groupName: string;
    let billDetailId: string | undefined;

    if (amountParam !== undefined && targetWalletIdParam !== undefined) {
      debtorName = String(billDetailIdOrDebtor);
      creditorName = String(targetWalletIdOrCreditor);
      amount = amountParam;
      targetWalletId = String(targetWalletIdParam);
      groupName = groupNameParam || 'Nhóm';
    } else {
      billDetailId = String(billDetailIdOrDebtor);
      targetWalletId = String(targetWalletIdOrCreditor);
      const debts = await billsModule.getDebts();
      const found = debts.find((d) => d.billDetailId === billDetailId || d.debtorId === billDetailId) || debts[0];
      debtorName = found?.debtorName || 'Bạn bè';
      creditorName = found?.creditorName || 'Tôi';
      amount = found?.amount || 0;
      groupName = found?.groupName || 'Nhóm';
    }

    if (!apiClient.getIsMockMode()) {
      try {
        await apiClient.request('/groups/settlement', {
          method: 'POST',
          body: JSON.stringify({ billDetailId, debtorName, creditorName, amount, targetWalletId, groupName }),
        });
        return true;
      } catch {}
    }

    const wallets = await walletsModule.getAll();
    const targetWallet = wallets.find((w) => w.id === targetWalletId) || wallets[0];

    if (targetWallet && amount > 0) {
      await transactionsModule.create({
        walletId: targetWallet.id,
        walletName: targetWallet.name,
        amount,
        type: 'SETTLEMENT',
        note: `Tất toán nợ: ${debtorName} trả cho ${creditorName} (${groupName})`,
        settlementDebtorName: debtorName,
        date: new Date().toISOString(),
        categoryName: 'Tất toán nợ nhóm',
        categoryIcon: 'CheckCircle2',
      });
    }

    return true;
  },
};

// --- COACH & AI SUB-MODULE ---
const coachModule = {
  getAdvice: async (
    monthlyIncome: number,
    monthlyExpense: number,
    topCategoryOrTransactions: string | Transaction[]
  ): Promise<FinancialCoachResponse> => {
    let topCategory = 'Chi tiêu chung';
    let transactionsList: Transaction[] = [];

    if (Array.isArray(topCategoryOrTransactions)) {
      transactionsList = topCategoryOrTransactions;
      topCategory = getTopCategoryName(transactionsList);
    } else if (typeof topCategoryOrTransactions === 'string') {
      topCategory = topCategoryOrTransactions;
    }

    let roastSummary = '';
    try {
      roastSummary = await geminiService.generateRoast({
        totalIncome: monthlyIncome,
        totalExpense: monthlyExpense,
        topCategory,
      });
    } catch {
      roastSummary =
        'Tháng này chi tiêu có vẻ khá phung phí đấy nhé! Đừng để tiền đi nhanh như người yêu cũ. Hãy trích lập tiết kiệm tối thiểu 20% trước khi sắm sửa nhé.';
    }

    const netSavings = monthlyIncome - monthlyExpense;
    const savingsRate = monthlyIncome > 0 ? netSavings / monthlyIncome : 0;
    const score = Math.max(20, Math.min(98, Math.round(savingsRate * 100)));
    const mood: 'ROAST' | 'PRAISE' | 'WARNING' = score < 50 ? 'ROAST' : score < 75 ? 'WARNING' : 'PRAISE';

    return {
      title: 'Cố Vấn Tài Chính SIVI AI',
      roastSummary,
      score,
      mood,
      actionableTips: [
        `Cân nhắc tiết chế bớt chi tiêu cho "${topCategory}"`,
        'Duy trì tỷ lệ tích lũy tài sản tối thiểu 20% mỗi tháng',
        'Thiết lập hạn mức cảnh báo chi tiêu tự động trên ví',
      ],
      categoryAlerts: [
        {
          category: topCategory,
          text: `Danh mục "${topCategory}" đang chiếm tỷ trọng chi tiêu lớn nhất`,
        },
      ],
    };
  },

  getFinancialCoachAdvice: async (
    monthlyIncome: number,
    monthlyExpense: number,
    transactions: Transaction[]
  ): Promise<FinancialCoachResponse> => {
    return coachModule.getAdvice(monthlyIncome, monthlyExpense, transactions);
  },

  askQuestion: async (
    question: string,
    monthlyIncome: number,
    monthlyExpense: number,
    transactions: Transaction[]
  ): Promise<{ answer: string }> => {
    const topCategory = getTopCategoryName(transactions);
    try {
      const answer = await geminiService.askFinancialCoach(question, {
        totalIncome: monthlyIncome,
        totalExpense: monthlyExpense,
        topCategory,
      });
      return { answer };
    } catch {
      return {
        answer: `Cảm ơn bạn đã hỏi "${question}". Về mặt tài chính, thu nhập hiện tại của bạn là ${monthlyIncome.toLocaleString('vi-VN')} đ và chi tiêu ${monthlyExpense.toLocaleString('vi-VN')} đ. Lời khuyên của Sivi là luôn ưu tiên trích lập tiết kiệm 20% và cân đối khoản chi cho ${topCategory}.`,
      };
    }
  },

  askFinancialCoachQuestion: async (
    question: string,
    monthlyIncome: number,
    monthlyExpense: number,
    transactions: Transaction[]
  ): Promise<{ answer: string }> => {
    return coachModule.askQuestion(question, monthlyIncome, monthlyExpense, transactions);
  },

  scanReceiptOCR: async (base64Image: string): Promise<ReceiptOCRResult> => {
    const response = await fetch('/api/gemini/receipt-ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini Receipt OCR Error: ${errorText}`);
    }

    return response.json();
  },

  parseNLP: async (vietnamesePrompt: string): Promise<NLPParsedTransaction> => {
    const response = await fetch('/api/gemini/nlp-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: vietnamesePrompt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini Natural Language Logger Error: ${errorText}`);
    }

    return response.json();
  },

  parseNaturalLanguage: async (vietnamesePrompt: string): Promise<NLPParsedTransaction> => {
    return coachModule.parseNLP(vietnamesePrompt);
  },

  parseNaturalLanguageTransaction: async (vietnamesePrompt: string): Promise<NLPParsedTransaction> => {
    return coachModule.parseNLP(vietnamesePrompt);
  },
};

// ==========================================
// UNIFIED EXPORTABLE API OBJECT
// ==========================================

export const api = {
  // Modules
  auth: authModule,
  wallets: walletsModule,
  categories: categoriesModule,
  transactions: transactionsModule,
  groups: groupsModule,
  bills: billsModule,
  coach: coachModule,
  ai: coachModule,

  // Direct top-level methods for full backward compatibility with legacy apiService calls
  getIsMockMode: () => apiClient.getIsMockMode(),
  setIsMockMode: (val: boolean) => apiClient.setIsMockMode(val),
  getApiUrl: () => apiClient.getApiUrl(),
  setApiUrl: (url: string) => apiClient.setApiUrl(url),
  checkBackendHealth: () => apiClient.checkBackendHealth(),
  getCurrentUser: () => authModule.getMe(),
  login: (email: string, name?: string, password?: string) => authModule.login(email, name, password),

  getWallets: () => walletsModule.getAll(),
  addWallet: (data: CreateWalletDto) => walletsModule.create(data),
  updateWallet: (id: string, data: Partial<Wallet>) => walletsModule.update(id, data),
  deleteWallet: (id: string) => walletsModule.delete(id),
  transferWallet: (from: string, to: string, amount: number, note?: string) => walletsModule.transfer(from, to, amount, note),

  getCategories: () => categoriesModule.getAll(),
  addCategory: (cat: Omit<Category, 'id' | 'isDefault'>) => categoriesModule.create(cat),

  getTransactions: (params?: GetTransactionsParams) => transactionsModule.getAll(params),
  addTransaction: (data: CreateTransactionDto) => transactionsModule.create(data),
  deleteTransaction: (id: string) => transactionsModule.delete(id),

  getGroups: () => groupsModule.getAll(),
  createGroup: (name: string, desc?: string, members?: { name: string; isGuest: boolean; email?: string }[]) => groupsModule.create(name, desc, members),

  getGroupBills: (groupId?: string) => billsModule.getAll(groupId),
  addGroupBill: (billData: CreateBillDto | Omit<GroupBill, 'id'>) => billsModule.create(billData),
  getDebtLedger: () => billsModule.getDebts(),
  settleDebt: (debtorName: string, creditorName: string, amount: number, walletId: string, groupName: string) => billsModule.settleDebt(debtorName, creditorName, amount, walletId, groupName),

  scanReceiptOCR: (base64: string) => coachModule.scanReceiptOCR(base64),
  parseNaturalLanguageTransaction: (prompt: string) => coachModule.parseNLP(prompt),
  getFinancialCoachAdvice: (inc: number, exp: number, txs: Transaction[]) => coachModule.getFinancialCoachAdvice(inc, exp, txs),
  askFinancialCoachQuestion: (q: string, inc: number, exp: number, txs: Transaction[]) => coachModule.askFinancialCoachQuestion(q, inc, exp, txs),
};

export const apiService = api;
export default api;