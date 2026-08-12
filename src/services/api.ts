/**
 * SIVI WALLET - API Service Layer
 * Decoupled Spring Boot REST API integration with LocalStorage Fallback
 */

import {
  User,
  Wallet,
  Category,
  Transaction,
  Group,
  GroupBill,
  DebtSummary,
  ReceiptOCRResult,
  NLPParsedTransaction,
  FinancialCoachResponse,
} from '../types';
import {
  INITIAL_USER,
  INITIAL_WALLETS,
  INITIAL_CATEGORIES,
  INITIAL_GROUPS,
  INITIAL_BILLS,
  INITIAL_TRANSACTIONS,
  calculateDebtMatrix,
} from './mockData';

// API Base URL config from env or default
const metaEnv = (import.meta as any).env || {};
const API_BASE_URL =
  (metaEnv.VITE_API_URL as string) ||
  (metaEnv.NEXT_PUBLIC_API_URL as string) ||
  'http://localhost:8080/api';

// Keys for LocalStorage fallback persistence
const STORAGE_KEYS = {
  USER: 'sivi_user',
  WALLETS: 'sivi_wallets',
  CATEGORIES: 'sivi_categories',
  GROUPS: 'sivi_groups',
  BILLS: 'sivi_bills',
  TRANSACTIONS: 'sivi_transactions',
  USE_MOCK: 'sivi_use_mock_mode',
  CUSTOM_API_URL: 'sivi_custom_api_url',
};

class ApiService {
  private token: string | null = null;
  private isMockMode: boolean = false;
  private customApiUrl: string = API_BASE_URL;

  constructor() {
    // Check stored user token
    const storedUser = this.getFromStorage<User>(STORAGE_KEYS.USER);
    if (storedUser?.token) {
      this.token = storedUser.token;
    }

    // Check custom API URL or stored mode preference
    const savedUrl = localStorage.getItem(STORAGE_KEYS.CUSTOM_API_URL);
    if (savedUrl) {
      this.customApiUrl = savedUrl;
    }

    const savedMode = localStorage.getItem(STORAGE_KEYS.USE_MOCK);
    if (savedMode !== null) {
      this.isMockMode = savedMode === 'true';
    } else {
      // Default to mock mode for smooth initial preview unless backend responds
      this.isMockMode = true;
    }

    this.initializeMockDataIfEmpty();
  }

  // --- Configuration & Mode Handlers ---
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

  // --- LocalStorage Helpers ---
  private getFromStorage<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  private setToStorage<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving to storage:', e);
    }
  }

  private initializeMockDataIfEmpty(): void {
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

  // --- HTTP Request Client with Bearer Token ---
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (this.isMockMode) {
      throw new Error('MOCK_MODE_ACTIVE');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.customApiUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ message: 'Lỗi từ máy chủ Spring Boot' }));
      throw new Error(errData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // --- USER & AUTHENTICATION ---
  public async getCurrentUser(): Promise<User> {
    if (!this.isMockMode) {
      try {
        return await this.request<User>('/auth/me');
      } catch {
        // fallback
      }
    }
    return this.getFromStorage<User>(STORAGE_KEYS.USER) || INITIAL_USER;
  }

  public async login(email: string, name?: string): Promise<User> {
    const user: User = {
      id: 'usr_' + Date.now(),
      email,
      name: name || email.split('@')[0],
      isGuest: false,
      token: 'jwt_mock_token_' + Date.now(),
      createdAt: new Date().toISOString(),
    };

    if (!this.isMockMode) {
      try {
        const res = await this.request<User>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, name }),
        });
        this.token = res.token || 'jwt_token';
        return res;
      } catch {
        // fallback to mock
      }
    }

    this.token = user.token || null;
    this.setToStorage(STORAGE_KEYS.USER, user);
    return user;
  }

  // --- WALLET MANAGEMENT ---
  public async getWallets(): Promise<Wallet[]> {
    if (!this.isMockMode) {
      try {
        return await this.request<Wallet[]>('/wallets');
      } catch {
        // fallback
      }
    }
    const wallets = this.getFromStorage<Wallet[]>(STORAGE_KEYS.WALLETS) || INITIAL_WALLETS;
    return wallets.filter((w) => w.isActive);
  }

  public async addWallet(walletData: Omit<Wallet, 'id' | 'userId' | 'currency' | 'isActive'>): Promise<Wallet> {
    const newWallet: Wallet = {
      ...walletData,
      id: 'wal_' + Date.now(),
      userId: 'usr_001',
      currency: 'VND',
      isActive: true,
    };

    if (!this.isMockMode) {
      try {
        return await this.request<Wallet>('/wallets', {
          method: 'POST',
          body: JSON.stringify(walletData),
        });
      } catch {
        // fallback
      }
    }

    const wallets = this.getFromStorage<Wallet[]>(STORAGE_KEYS.WALLETS) || INITIAL_WALLETS;
    const updated = [newWallet, ...wallets];
    this.setToStorage(STORAGE_KEYS.WALLETS, updated);
    return newWallet;
  }

  public async updateWallet(id: string, walletData: Partial<Wallet>): Promise<Wallet> {
    if (!this.isMockMode) {
      try {
        return await this.request<Wallet>(`/wallets/${id}`, {
          method: 'PUT',
          body: JSON.stringify(walletData),
        });
      } catch {
        // fallback
      }
    }

    const wallets = this.getFromStorage<Wallet[]>(STORAGE_KEYS.WALLETS) || INITIAL_WALLETS;
    let target: Wallet | null = null;
    const updated = wallets.map((w) => {
      if (w.id === id) {
        target = { ...w, ...walletData };
        return target;
      }
      return w;
    });
    this.setToStorage(STORAGE_KEYS.WALLETS, updated);
    return target || wallets[0];
  }

  public async deleteWallet(id: string): Promise<boolean> {
    if (!this.isMockMode) {
      try {
        await this.request(`/wallets/${id}`, { method: 'DELETE' });
        return true;
      } catch {
        // fallback
      }
    }

    const wallets = this.getFromStorage<Wallet[]>(STORAGE_KEYS.WALLETS) || INITIAL_WALLETS;
    const updated = wallets.map((w) => (w.id === id ? { ...w, isActive: false } : w));
    this.setToStorage(STORAGE_KEYS.WALLETS, updated);
    return true;
  }

  public async transferWallet(fromWalletId: string, toWalletId: string, amount: number, note?: string): Promise<boolean> {
    if (!this.isMockMode) {
      try {
        await this.request('/wallets/transfer', {
          method: 'POST',
          body: JSON.stringify({ fromWalletId, toWalletId, amount, note }),
        });
        return true;
      } catch {
        // fallback
      }
    }

    const wallets = this.getFromStorage<Wallet[]>(STORAGE_KEYS.WALLETS) || INITIAL_WALLETS;
    const fromWal = wallets.find((w) => w.id === fromWalletId);
    const toWal = wallets.find((w) => w.id === toWalletId);

    if (!fromWal || !toWal) throw new Error('Ví không tồn tại');
    if (fromWal.balance < amount) throw new Error('Số dư ví gửi không đủ');

    fromWal.balance -= amount;
    toWal.balance += amount;

    this.setToStorage(STORAGE_KEYS.WALLETS, wallets);

    // Record internal transfer transaction
    await this.addTransaction({
      walletId: fromWalletId,
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
  }

  // --- CATEGORIES ---
  public async getCategories(): Promise<Category[]> {
    if (!this.isMockMode) {
      try {
        return await this.request<Category[]>('/categories');
      } catch {
        // fallback
      }
    }
    return this.getFromStorage<Category[]>(STORAGE_KEYS.CATEGORIES) || INITIAL_CATEGORIES;
  }

  public async addCategory(cat: Omit<Category, 'id' | 'isDefault'>): Promise<Category> {
    const newCat: Category = {
      ...cat,
      id: 'cat_' + Date.now(),
      isDefault: false,
    };

    if (!this.isMockMode) {
      try {
        return await this.request<Category>('/categories', {
          method: 'POST',
          body: JSON.stringify(cat),
        });
      } catch {
        // fallback
      }
    }

    const categories = this.getFromStorage<Category[]>(STORAGE_KEYS.CATEGORIES) || INITIAL_CATEGORIES;
    this.setToStorage(STORAGE_KEYS.CATEGORIES, [...categories, newCat]);
    return newCat;
  }

  // --- TRANSACTIONS ---
  public async getTransactions(): Promise<Transaction[]> {
    if (!this.isMockMode) {
      try {
        return await this.request<Transaction[]>('/transactions');
      } catch {
        // fallback
      }
    }
    return this.getFromStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS) || INITIAL_TRANSACTIONS;
  }

  public async addTransaction(
    txData: Omit<Transaction, 'id' | 'userId' | 'createdAt'>
  ): Promise<Transaction> {
    const newTx: Transaction = {
      ...txData,
      id: 'tx_' + Date.now(),
      userId: 'usr_001',
      createdAt: new Date().toISOString(),
    };

    if (!this.isMockMode) {
      try {
        return await this.request<Transaction>('/transactions', {
          method: 'POST',
          body: JSON.stringify(txData),
        });
      } catch {
        // fallback
      }
    }

    // Update wallet balance automatically
    const wallets = this.getFromStorage<Wallet[]>(STORAGE_KEYS.WALLETS) || INITIAL_WALLETS;
    const targetWallet = wallets.find((w) => w.id === txData.walletId);
    if (targetWallet) {
      if (txData.type === 'EXPENSE') {
        targetWallet.balance -= txData.amount;
      } else if (txData.type === 'INCOME' || txData.type === 'SETTLEMENT') {
        targetWallet.balance += txData.amount;
      }
      this.setToStorage(STORAGE_KEYS.WALLETS, wallets);
    }

    const transactions = this.getFromStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS) || INITIAL_TRANSACTIONS;
    const updated = [newTx, ...transactions];
    this.setToStorage(STORAGE_KEYS.TRANSACTIONS, updated);
    return newTx;
  }

  public async deleteTransaction(id: string): Promise<boolean> {
    if (!this.isMockMode) {
      try {
        await this.request(`/transactions/${id}`, { method: 'DELETE' });
        return true;
      } catch {
        // fallback
      }
    }

    const transactions = this.getFromStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS) || INITIAL_TRANSACTIONS;
    const tx = transactions.find((t) => t.id === id);

    if (tx) {
      // Revert wallet balance
      const wallets = this.getFromStorage<Wallet[]>(STORAGE_KEYS.WALLETS) || INITIAL_WALLETS;
      const targetWallet = wallets.find((w) => w.id === tx.walletId);
      if (targetWallet) {
        if (tx.type === 'EXPENSE') {
          targetWallet.balance += tx.amount;
        } else if (tx.type === 'INCOME' || tx.type === 'SETTLEMENT') {
          targetWallet.balance -= tx.amount;
        }
        this.setToStorage(STORAGE_KEYS.WALLETS, wallets);
      }
    }

    const updated = transactions.filter((t) => t.id !== id);
    this.setToStorage(STORAGE_KEYS.TRANSACTIONS, updated);
    return true;
  }

  // --- GROUPS & SPLIT BILL ENGINE ---
  public async getGroups(): Promise<Group[]> {
    if (!this.isMockMode) {
      try {
        return await this.request<Group[]>('/groups');
      } catch {
        // fallback
      }
    }
    return this.getFromStorage<Group[]>(STORAGE_KEYS.GROUPS) || INITIAL_GROUPS;
  }

  public async createGroup(name: string, description?: string, members?: { name: string; isGuest: boolean; email?: string }[]): Promise<Group> {
    const memberList: import('../types').GroupMember[] = members
      ? members.map((m, idx) => ({ id: `m_${Date.now()}_${idx}`, name: m.name, isGuest: m.isGuest, email: m.email, userId: m.isGuest ? undefined : 'usr_' + idx }))
      : [{ id: 'usr_001', name: 'Trần Minh Nam (Tôi)', isGuest: false, userId: 'usr_001' }];

    // Ensure creator is in members
    if (!memberList.some((m) => m.id === 'usr_001' || m.userId === 'usr_001')) {
      memberList.unshift({ id: 'usr_001', name: 'Trần Minh Nam (Tôi)', isGuest: false, userId: 'usr_001' });
    }

    const newGroup: Group = {
      id: 'grp_' + Date.now(),
      name,
      description,
      members: memberList,
      createdAt: new Date().toISOString(),
    };

    if (!this.isMockMode) {
      try {
        return await this.request<Group>('/groups', {
          method: 'POST',
          body: JSON.stringify({ name, description, members }),
        });
      } catch {
        // fallback
      }
    }

    const groups = this.getFromStorage<Group[]>(STORAGE_KEYS.GROUPS) || INITIAL_GROUPS;
    this.setToStorage(STORAGE_KEYS.GROUPS, [...groups, newGroup]);
    return newGroup;
  }

  public async getGroupBills(groupId?: string): Promise<GroupBill[]> {
    if (!this.isMockMode) {
      try {
        return await this.request<GroupBill[]>(groupId ? `/groups/${groupId}/bills` : '/bills');
      } catch {
        // fallback
      }
    }

    const bills = this.getFromStorage<GroupBill[]>(STORAGE_KEYS.BILLS) || INITIAL_BILLS;
    if (groupId) {
      return bills.filter((b) => b.groupId === groupId);
    }
    return bills;
  }

  public async addGroupBill(billData: Omit<GroupBill, 'id'>): Promise<GroupBill> {
    const newBill: GroupBill = {
      ...billData,
      id: 'bill_' + Date.now(),
    };

    if (!this.isMockMode) {
      try {
        return await this.request<GroupBill>(`/groups/${billData.groupId}/bills`, {
          method: 'POST',
          body: JSON.stringify(billData),
        });
      } catch {
        // fallback
      }
    }

    const bills = this.getFromStorage<GroupBill[]>(STORAGE_KEYS.BILLS) || INITIAL_BILLS;
    this.setToStorage(STORAGE_KEYS.BILLS, [newBill, ...bills]);

    // If I paid for this bill, record my personal expense share
    const mySplit = billData.splits.find((s) => s.memberId === 'usr_001');
    if (mySplit && mySplit.amount > 0 && billData.payerMemberId === 'usr_001') {
      const wallets = await this.getWallets();
      const defaultWal = wallets[0];
      if (defaultWal) {
        await this.addTransaction({
          walletId: defaultWal.id,
          walletName: defaultWal.name,
          amount: mySplit.amount,
          type: 'EXPENSE',
          note: `Phần của tôi: ${billData.title} (${billData.groupName})`,
          date: billData.date,
          groupId: billData.groupId,
          groupName: billData.groupName,
          categoryName: billData.category || 'Ăn uống',
          categoryIcon: 'Users',
        });
      }
    }

    return newBill;
  }

  public async getDebtLedger(): Promise<DebtSummary[]> {
    const bills = await this.getGroupBills();
    return calculateDebtMatrix(bills);
  }

  // --- 1-CLICK SETTLEMENT ENGINE ---
  public async settleDebt(
    debtorName: string,
    creditorName: string,
    amount: number,
    targetWalletId: string,
    groupName: string
  ): Promise<boolean> {
    if (!this.isMockMode) {
      try {
        await this.request('/groups/settlement', {
          method: 'POST',
          body: JSON.stringify({ debtorName, creditorName, amount, targetWalletId, groupName }),
        });
        return true;
      } catch {
        // fallback
      }
    }

    const wallets = await this.getWallets();
    const targetWallet = wallets.find((w) => w.id === targetWalletId) || wallets[0];

    // Trigger settlement income transaction into selected wallet
    await this.addTransaction({
      walletId: targetWallet.id,
      walletName: targetWallet.name,
      amount,
      type: 'SETTLEMENT',
      note: `Thanh toán nợ: ${debtorName} trả cho ${creditorName} (${groupName})`,
      settlementDebtorName: debtorName,
      date: new Date().toISOString(),
      categoryName: 'Thanh toán nợ nhóm',
      categoryIcon: 'CheckCircle2',
    });

    return true;
  }

  // --- GOOGLE GEMINI AI INTEGRATIONS ---
  public async scanReceiptOCR(base64Image: string): Promise<ReceiptOCRResult> {
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
  }

  public async parseNaturalLanguageTransaction(vietnamesePrompt: string): Promise<NLPParsedTransaction> {
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
  }

  public async getFinancialCoachAdvice(
    monthlyIncome: number,
    monthlyExpense: number,
    transactions: Transaction[]
  ): Promise<FinancialCoachResponse> {
    const response = await fetch('/api/gemini/financial-coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyIncome, monthlyExpense, transactions }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini Financial Coach Error: ${errorText}`);
    }

    return response.json();
  }

  public async askFinancialCoachQuestion(
    question: string,
    monthlyIncome: number,
    monthlyExpense: number,
    transactions: Transaction[]
  ): Promise<{ answer: string }> {
    const response = await fetch('/api/gemini/chat-advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, monthlyIncome, monthlyExpense, transactions }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini Chat Advisor Error: ${errorText}`);
    }

    return response.json();
  }
}

export const apiService = new ApiService();
