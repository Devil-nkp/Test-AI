/**
 * PrepVista AI — Backend API Client
 * Centralized HTTP client for all backend communication.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ApiUser {
  id: string;
  email: string;
  full_name: string | null;
  plan: string;
  subscription_status: string;
  onboarding_completed: boolean;
  prep_goal: string | null;
  usage: { plan: string; used: number; limit: number; remaining: number };
}

interface AuthTokensResponse {
  access_token: string;
  refresh_token: string;
}

interface ErrorDetailObject {
  message?: string;
}

interface ErrorResponse {
  detail?: string | ErrorDetailObject | unknown;
}

interface ApiOptions {
  method?: RequestInit['method'];
  body?: BodyInit | Record<string, unknown> | null;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

class ApiClient {
  private token: string | null = null;
  private refreshToken: string | null = null;

  setTokens(access: string, refresh: string) {
    this.token = access;
    this.refreshToken = refresh;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pv_access_token', access);
      localStorage.setItem('pv_refresh_token', refresh);
    }
  }

  loadTokens() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('pv_access_token');
      this.refreshToken = localStorage.getItem('pv_refresh_token');
    }
  }

  clearTokens() {
    this.token = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pv_access_token');
      localStorage.removeItem('pv_refresh_token');
    }
  }

  getToken() {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('pv_access_token');
    }
    return this.token;
  }

  async request<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, isFormData = false } = options;

    const requestHeaders: Record<string, string> = { ...headers };
    const currentToken = this.getToken();
    if (currentToken) {
      requestHeaders['Authorization'] = `Bearer ${currentToken}`;
    }
    if (!isFormData) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    const config: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body !== undefined && body !== null) {
      config.body = isFormData ? body as BodyInit : JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(`${API_URL}${path}`, config);
    } catch {
      throw new Error(
        'Unable to reach the PrepVista backend. Check NEXT_PUBLIC_API_URL and make sure the backend allows your frontend domain.'
      );
    }

    // Handle 401 — try token refresh
    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        requestHeaders['Authorization'] = `Bearer ${this.token}`;
        const retryResponse = await fetch(`${API_URL}${path}`, { ...config, headers: requestHeaders });
        if (!retryResponse.ok) throw await this.parseError(retryResponse);
        return retryResponse.json() as Promise<T>;
      }
    }

    if (!response.ok) {
      throw await this.parseError(response);
    }

    return response.json() as Promise<T>;
  }

  private async tryRefresh(): Promise<boolean> {
    try {
      const resp = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });
      if (resp.ok) {
        const data = await resp.json() as AuthTokensResponse;
        this.setTokens(data.access_token, data.refresh_token);
        return true;
      }
    } catch { /* refresh failed */ }
    this.clearTokens();
    return false;
  }

  private async parseError(response: Response): Promise<Error> {
    try {
      const data = await response.json() as ErrorResponse;
      const detail =
        typeof data.detail === 'string'
          ? data.detail
          : typeof data.detail === 'object' &&
              data.detail !== null &&
              'message' in data.detail &&
              typeof (data.detail as ErrorDetailObject).message === 'string'
            ? (data.detail as ErrorDetailObject).message
            : data.detail
              ? JSON.stringify(data.detail)
              : 'An error occurred';
      return new Error(detail);
    } catch {
      return new Error(`Request failed with status ${response.status}`);
    }
  }

  // ── Auth ─────────────────────────────────
  async signup(email: string, password: string, fullName: string) {
    const data = await this.request<AuthTokensResponse>('/auth/signup', {
      method: 'POST',
      body: { email, password, full_name: fullName },
    });
    if (data.access_token) this.setTokens(data.access_token, data.refresh_token);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request<AuthTokensResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (data.access_token) this.setTokens(data.access_token, data.refresh_token);
    return data;
  }

  async getMe<T = ApiUser>() {
    return this.request<T>('/auth/me');
  }

  async completeOnboarding(prepGoal: string, fullName: string) {
    return this.request('/auth/onboarding', {
      method: 'POST',
      body: { prep_goal: prepGoal, full_name: fullName },
    });
  }

  logout() {
    this.clearTokens();
  }

  // ── Dashboard ────────────────────────────
  async getDashboard<T = unknown>() {
    return this.request<T>('/dashboard');
  }

  async getSessionHistory<T = unknown>(limit = 20, offset = 0) {
    return this.request<T>(`/dashboard/sessions?limit=${limit}&offset=${offset}`);
  }

  async getSkills<T = unknown>() {
    return this.request<T>('/dashboard/skills');
  }

  // ── Interviews ────────────────────────────
  async setupInterview<T = unknown>(formData: FormData) {
    return this.request<T>('/interviews/setup', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  }

  async submitAnswer<T = unknown>(sessionId: string, userText: string, accessToken: string) {
    return this.request<T>(`/interviews/${sessionId}/answer`, {
      method: 'POST',
      body: { user_text: userText, access_token: accessToken },
    });
  }

  async finishInterview<T = unknown>(sessionId: string, accessToken: string, durationActual?: number) {
    return this.request<T>(`/interviews/${sessionId}/finish`, {
      method: 'POST',
      body: { access_token: accessToken, duration_actual: durationActual },
    });
  }

  async reportViolation<T = unknown>(sessionId: string, accessToken: string, type: string, detail: string) {
    return this.request<T>(`/interviews/${sessionId}/violation`, {
      method: 'POST',
      body: { access_token: accessToken, violation_type: type, detail },
    });
  }

  // ── Reports ───────────────────────────────
  async getReport<T = unknown>(sessionId: string) {
    return this.request<T>(`/reports/${sessionId}`);
  }

  async downloadPDF(sessionId: string): Promise<Blob> {
    const currentToken = this.getToken();
    let resp: Response;
    try {
      resp = await fetch(`${API_URL}/reports/${sessionId}/pdf`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
    } catch {
      throw new Error(
        'Unable to reach the PrepVista backend. Check NEXT_PUBLIC_API_URL and your backend CORS settings.'
      );
    }
    if (!resp.ok) throw new Error('PDF download failed');
    return resp.blob();
  }

  // ── Billing ───────────────────────────────
  async createCheckout<T = unknown>(plan: string) {
    return this.request<T>('/billing/checkout', {
      method: 'POST',
      body: { plan },
    });
  }

  async getBillingPortal<T = unknown>() {
    return this.request<T>('/billing/portal', { method: 'POST' });
  }
}

export const api = new ApiClient();
