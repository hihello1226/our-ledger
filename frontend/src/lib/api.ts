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

// Entries API
export const entriesAPI = {
  list: (params?: { month?: string; category_id?: string; payer_member_id?: string; shared?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.month) searchParams.append('month', params.month);
    if (params?.category_id) searchParams.append('category_id', params.category_id);
    if (params?.payer_member_id) searchParams.append('payer_member_id', params.payer_member_id);
    if (params?.shared !== undefined) searchParams.append('shared', String(params.shared));

    const query = searchParams.toString();
    return fetchAPI<
      Array<{
        id: string;
        type: string;
        amount: number;
        date: string;
        category_id: string | null;
        category_name: string | null;
        memo: string | null;
        payer_member_id: string;
        payer_name: string | null;
        shared: boolean;
      }>
    >(`/api/entries${query ? `?${query}` : ''}`);
  },

  create: (data: {
    type: string;
    amount: number;
    date: string;
    category_id?: string;
    memo?: string;
    payer_member_id: string;
    shared?: boolean;
  }) =>
    fetchAPI('/api/entries', { method: 'POST', body: data }),

  update: (id: string, data: Partial<{
    type: string;
    amount: number;
    date: string;
    category_id: string;
    memo: string;
    payer_member_id: string;
    shared: boolean;
  }>) =>
    fetchAPI(`/api/entries/${id}`, { method: 'PUT', body: data }),

  delete: (id: string) =>
    fetchAPI(`/api/entries/${id}`, { method: 'DELETE' }),

  getCategories: () =>
    fetchAPI<Array<{ id: string; name: string; type: string }>>('/api/entries/categories'),
};

// Summary API
export const summaryAPI = {
  get: (month?: string) =>
    fetchAPI<{
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
    }>(`/api/summary${month ? `?month=${month}` : ''}`),
};

// Settlement API
export const settlementAPI = {
  get: (month?: string) =>
    fetchAPI<{
      month: string;
      total_shared_expense: number;
      settlements: Array<{
        from_member_id: string;
        from_member_name: string;
        to_member_id: string;
        to_member_name: string;
        amount: number;
      }>;
    }>(`/api/settlement${month ? `?month=${month}` : ''}`),
};
