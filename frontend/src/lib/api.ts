const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

export async function fetchAPI<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'API request failed');
  }

  return response.json();
}

// Auth API
export const authAPI = {
  register: (data: { email: string; password: string; name: string }) =>
    fetchAPI<{ access_token: string }>('/api/auth/register', {
      method: 'POST',
      body: data,
    }),

  login: (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    return fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || 'Login failed');
      }
      return res.json() as Promise<{ access_token: string }>;
    });
  },

  getMe: () => fetchAPI<{ id: string; email: string; name: string }>('/api/auth/me'),
};

// Household API
export const householdAPI = {
  get: () => fetchAPI<{ id: string; name: string; invite_code: string } | null>('/api/household'),

  create: (name: string) =>
    fetchAPI<{ id: string; name: string; invite_code: string }>('/api/household', {
      method: 'POST',
      body: { name },
    }),

  join: (invite_code: string) =>
    fetchAPI<{ id: string; name: string; invite_code: string }>('/api/household/join', {
      method: 'POST',
      body: { invite_code },
    }),

  getMembers: () =>
    fetchAPI<
      Array<{
        id: string;
        user_id: string;
        user_name: string;
        user_email: string;
        role: string;
      }>
    >('/api/household/members'),
};

// Types for entries
export interface Entry {
  id: string;
  type: string;
  amount: number;
  date: string;
  occurred_at: string | null;
  category_id: string | null;
  category_name: string | null;
  memo: string | null;
  payer_member_id: string;
  payer_name: string | null;
  shared: boolean;
  account_id: string | null;
  account_name: string | null;
  transfer_from_account_id: string | null;
  transfer_from_account_name: string | null;
  transfer_to_account_id: string | null;
  transfer_to_account_name: string | null;
}

export interface EntryCreateData {
  type: string;
  amount: number;
  date: string;
  occurred_at?: string;
  category_id?: string;
  memo?: string;
  payer_member_id: string;
  shared?: boolean;
  account_id?: string;
  transfer_from_account_id?: string;
  transfer_to_account_id?: string;
}

// Entries API
export const entriesAPI = {
  list: (params?: {
    month?: string;
    category_id?: string;
    payer_member_id?: string;
    shared?: boolean;
    type?: string;
    account_ids?: string[];
    sort_by?: string;
    sort_order?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.month) searchParams.append('month', params.month);
    if (params?.category_id) searchParams.append('category_id', params.category_id);
    if (params?.payer_member_id) searchParams.append('payer_member_id', params.payer_member_id);
    if (params?.shared !== undefined) searchParams.append('shared', String(params.shared));
    if (params?.type) searchParams.append('type', params.type);
    if (params?.account_ids?.length) searchParams.append('account_ids', params.account_ids.join(','));
    if (params?.sort_by) searchParams.append('sort_by', params.sort_by);
    if (params?.sort_order) searchParams.append('sort_order', params.sort_order);

    const query = searchParams.toString();
    return fetchAPI<Entry[]>(`/api/entries${query ? `?${query}` : ''}`);
  },

  create: (data: EntryCreateData) =>
    fetchAPI<Entry>('/api/entries', { method: 'POST', body: data }),

  update: (id: string, data: Partial<EntryCreateData>) =>
    fetchAPI<Entry>(`/api/entries/${id}`, { method: 'PUT', body: data }),

  delete: (id: string) =>
    fetchAPI(`/api/entries/${id}`, { method: 'DELETE' }),

  getCategories: () =>
    fetchAPI<Array<{ id: string; name: string; type: string }>>('/api/entries/categories'),
};

// Account types
export interface Account {
  id: string;
  owner_user_id: string;
  household_id: string | null;
  name: string;
  bank_name: string | null;
  type: string;
  balance: number | null;
  is_shared_visible: boolean;
  created_at: string;
  updated_at: string;
  owner_name: string | null;
}

export interface AccountCreateData {
  name: string;
  bank_name?: string;
  type: string;
  balance?: number;
  is_shared_visible?: boolean;
  household_id?: string;
}

// Accounts API
export const accountsAPI = {
  list: () => fetchAPI<Account[]>('/api/accounts'),

  get: (id: string) => fetchAPI<Account>(`/api/accounts/${id}`),

  create: (data: AccountCreateData) =>
    fetchAPI<Account>('/api/accounts', { method: 'POST', body: data }),

  update: (id: string, data: Partial<AccountCreateData>) =>
    fetchAPI<Account>(`/api/accounts/${id}`, { method: 'PATCH', body: data }),

  delete: (id: string) =>
    fetchAPI(`/api/accounts/${id}`, { method: 'DELETE' }),
};

// Summary types
export interface CumulativeSettlement {
  user_id: string;
  user_name: string;
  cumulative_balance: number;
}

export interface MonthlySummary {
  month: string;
  total_income: number;
  total_expense: number;
  balance: number;
  by_category: Array<{ category_id: string | null; category_name: string; total: number }>;
  by_member: Array<{
    member_id: string;
    member_name: string;
    total_expense: number;
    total_income: number;
    shared_expense: number;
  }>;
  cumulative_settlement: CumulativeSettlement[];
  net_balance: number;
  filtered_account_ids: string[];
}

// Summary API
export const summaryAPI = {
  get: (month?: string, account_ids?: string[]) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (account_ids?.length) params.append('account_ids', account_ids.join(','));
    const query = params.toString();
    return fetchAPI<MonthlySummary>(`/api/summary${query ? `?${query}` : ''}`);
  },
};

// Settlement types
export interface SettlementItem {
  from_member_id: string;
  from_member_name: string;
  to_member_id: string;
  to_member_name: string;
  amount: number;
}

export interface MonthlySettlementRecord {
  id: string;
  user_id: string;
  user_name: string;
  month: string;
  settlement_amount: number;
  is_finalized: boolean;
}

export interface SettlementResponse {
  month: string;
  total_shared_expense: number;
  settlements: SettlementItem[];
  cumulative_settlements: CumulativeSettlement[];
  monthly_records: MonthlySettlementRecord[];
}

// Settlement API
export const settlementAPI = {
  get: (month?: string) =>
    fetchAPI<SettlementResponse>(`/api/settlement${month ? `?month=${month}` : ''}`),

  save: (month: string, user_id: string, settlement_amount: number) =>
    fetchAPI<MonthlySettlementRecord>(`/api/settlement/save?month=${month}`, {
      method: 'POST',
      body: { user_id, settlement_amount },
    }),

  finalize: (month: string) =>
    fetchAPI(`/api/settlement/finalize`, {
      method: 'POST',
      body: { month },
    }),
};

// CSV Import types
export interface CSVColumnMapping {
  date: string;
  amount: string;
  type?: string;
  category?: string;
  subcategory?: string;
  memo?: string;
  account?: string;
}

export interface CSVPreviewRow {
  row_number: number;
  date: string;
  amount: number;
  type: string;
  category: string | null;
  memo: string | null;
  account: string | null;
  is_duplicate: boolean;
  error: string | null;
}

export interface CSVUploadResponse {
  file_id: string;
  total_rows: number;
  preview_rows: CSVPreviewRow[];
  detected_columns: string[];
  suggested_mapping: CSVColumnMapping;
}

export interface ImportConfirmResponse {
  imported_count: number;
  skipped_count: number;
  error_count: number;
  errors: string[];
}

// CSV Import API
export const importAPI = {
  uploadCSV: async (file: File, encoding: string = 'utf-8') => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('encoding', encoding);

    const response = await fetch(`${API_URL}/api/import/csv/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json() as Promise<CSVUploadResponse>;
  },

  confirmCSV: (data: {
    file_id: string;
    column_mapping: CSVColumnMapping;
    default_account_id?: string;
    default_payer_member_id: string;
    skip_duplicates?: boolean;
  }) =>
    fetchAPI<ImportConfirmResponse>('/api/import/csv/confirm', {
      method: 'POST',
      body: data,
    }),
};

// External Data Source types
export interface ExternalDataSource {
  id: string;
  household_id: string;
  created_by_user_id: string;
  type: string;
  sheet_id: string;
  sheet_name: string;
  account_id: string | null;
  column_mapping: Record<string, number | string>;
  sync_direction: string;
  last_synced_at: string | null;
  last_synced_row: number | null;
  created_at: string;
  updated_at: string;
}

export interface SyncImportResponse {
  imported_count: number;
  updated_count: number;
  skipped_count: number;
  last_synced_row: number;
}

export interface SyncExportResponse {
  exported_count: number;
  last_synced_row: number;
}

// External Sources API
export const externalSourcesAPI = {
  list: () => fetchAPI<ExternalDataSource[]>('/api/external-sources'),

  get: (id: string) => fetchAPI<ExternalDataSource>(`/api/external-sources/${id}`),

  createGoogleSheet: (data: {
    type: string;
    sheet_id: string;
    sheet_name?: string;
    account_id?: string;
    column_mapping?: Record<string, number | string>;
    sync_direction?: string;
  }) =>
    fetchAPI<ExternalDataSource>('/api/external-sources/google-sheet', {
      method: 'POST',
      body: data,
    }),

  update: (id: string, data: {
    sheet_name?: string;
    account_id?: string;
    column_mapping?: Record<string, number | string>;
    sync_direction?: string;
  }) =>
    fetchAPI<ExternalDataSource>(`/api/external-sources/${id}`, {
      method: 'PATCH',
      body: data,
    }),

  delete: (id: string) =>
    fetchAPI(`/api/external-sources/${id}`, { method: 'DELETE' }),

  syncImport: (id: string, payer_member_id: string) =>
    fetchAPI<SyncImportResponse>(`/api/external-sources/${id}/sync-import`, {
      method: 'POST',
      body: { payer_member_id },
    }),

  syncExport: (id: string) =>
    fetchAPI<SyncExportResponse>(`/api/external-sources/${id}/sync-export`, {
      method: 'POST',
    }),
};
